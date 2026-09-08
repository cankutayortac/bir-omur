'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const vm = require('node:vm');
const E = require('./engine.js');
const D = require('./content.js');
const A = require('./avatar.js');

const source = readFileSync(join(__dirname, 'game.js'), 'utf8');
const KEY = 'birOmur.v3';
const statKeys = ['knowledge', 'strength', 'charisma', 'happiness', 'health', 'stress'];

// This intentionally small DOM adapter exercises the real UI event handlers and
// rendered markup. Browser tests cover layout, native focus trapping and scrolling.
function app(saved, previousStorage) {
  const storage = previousStorage || new Map();
  if (saved) storage.set(KEY, JSON.stringify(saved));
  const errors = [];
  const nodes = new Map();
  const listeners = new Map();
  let document;

  function element(id = '') {
    const handlers = new Map(), classes = new Set(), attributes = new Map();
    const el = {
      id, dataset: {}, innerHTML: '', textContent: '', open: false, disabled: false,
      isConnected: true, scrollTop: 0, value: '', files: [], style: {setProperty() {}, removeProperty() {}},
      classList: {
        add(...names) {names.forEach(n => classes.add(n));},
        remove(...names) {names.forEach(n => classes.delete(n));},
        contains(name) {return classes.has(name);},
        toggle(name, force) {
          const add = force === undefined ? !classes.has(name) : force;
          if (add) classes.add(name); else classes.delete(name);
          return add;
        }
      },
      setAttribute(name, value) {attributes.set(name, String(value));},
      getAttribute(name) {return attributes.get(name) ?? null;},
      removeAttribute(name) {attributes.delete(name);},
      addEventListener(name, handler) {
        if (!handlers.has(name)) handlers.set(name, []);
        handlers.get(name).push(handler);
      },
      async emit(name, event = {}) {
        for (const handler of handlers.get(name) || []) await handler({target: el, preventDefault() {}, ...event});
      },
      showModal() {assert.equal(el.open, false, 'showModal is not repeated for an already-open dialog');el.open = true;},
      close() {el.open = false;for (const handler of handlers.get('close') || []) handler({target: el});},
      focus() {document.activeElement = el;},
      scrollIntoView() {},
      closest(selector) {return selector === 'button' ? el : null;},
      contains(other) {return other === el;},
      querySelector(selector) {return query(selector);},
      querySelectorAll() {return [];},
      getBoundingClientRect() {return {top: 0, left: 0, width: 390, height: 100, bottom: 100, right: 390};}
    };
    return el;
  }

  for (const id of ['app', 'dialog', 'dialogContent', 'toast', 'importFile', 'dialogTitle', 'dialogFeedback', 'statFeedback', 'mainContent']) nodes.set('#' + id, element(id));
  const dialogBody = element('dialogBody');
  function query(selector) {
    if (nodes.has(selector)) return nodes.get(selector);
    if (selector === '.dialog-body' || selector === '#dialog .dialog-body') return dialogBody;
    return null;
  }
  document = {
    body: element('body'), documentElement: element('html'), activeElement: null,
    querySelector: query, querySelectorAll() {return [];},
    getElementById(id) {return query('#' + id);},
    addEventListener(name, handler) {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(handler);
    }
  };
  document.activeElement = document.body;
  const context = {
    LifeEngine: E, LifeData: D, LifeAvatar: A, document,
    localStorage: {
      getItem(key) {return storage.get(key) ?? null;},
      setItem(key, value) {storage.set(key, String(value));},
      removeItem(key) {storage.delete(key);}
    },
    console: {error(...args) {errors.push(args);}, warn(...args) {errors.push(args);}, log() {}},
    window: {scrollTo() {}, addEventListener() {}, matchMedia() {return {matches: false};}},
    setTimeout() {return 1;}, clearTimeout() {},
    requestAnimationFrame(callback) {callback();return 1;},
    cancelAnimationFrame() {},
    Intl, FormData, Blob, URL
  };
  context.window.requestAnimationFrame = context.requestAnimationFrame;
  vm.runInNewContext(source, context, {filename: 'game.js', timeout: 2000});
  assert.deepEqual(errors, [], 'initial render produces no caught errors');

  return {
    storage, nodes,
    html() {return nodes.get('#app').innerHTML;},
    dialogHtml() {return nodes.get('#dialogContent').innerHTML;},
    dialog() {return nodes.get('#dialog');},
    dialogBody() {return dialogBody;},
    saved() {return JSON.parse(storage.get(KEY));},
    click(dataset) {
      const button = element();button.dataset = dataset;
      for (const handler of listeners.get('click') || []) handler({target: button});
      assert.deepEqual(errors, [], 'click handler produces no caught errors');
    },
    async importSave(state) {
      const input = nodes.get('#importFile'), serialized = JSON.stringify(state);
      input.files = [{size: Buffer.byteLength(serialized), async text() {return serialized;}}];
      await input.emit('change');
      assert.deepEqual(errors, [], 'import handler produces no caught errors');
    }
  };
}

function fresh(seed = 42) {return E.newLife({name: 'Arayüz Testi', gender: 'male', seed});}
function withPending(seed = 42) {
  const state = fresh(seed);
  assert.equal(E.act(state, 'age').ok, true);
  assert.ok(state.pending);
  return state;
}
function possibleChoice(state) {
  const event = D.events.find(e => e.id === state.pending.id);
  const index = event.choices.findIndex(c => !E.choiceReason(state, c));
  assert.ok(index >= 0);
  return index;
}
function assertStats(markup, state) {
  for (const key of statKeys) {
    const marker = 'data-stat="' + key + '"', index = markup.indexOf(marker);
    assert.ok(index >= 0, 'stat is rendered: ' + key);
    const start = markup.lastIndexOf('<', index), next = markup.indexOf('data-stat="', index + marker.length);
    const region = markup.slice(start, next < 0 ? undefined : markup.lastIndexOf('<', next));
    assert.ok(/role="progressbar"/.test(region), key + ' has progress semantics');
    assert.ok(new RegExp('aria-valuenow="' + Math.round(state.stats[key]) + '"').test(region), key + ' shows current value');
  }
}
function assertEvent(ui, state) {
  assert.equal(ui.dialog().open, true);
  assert.equal(ui.dialog().dataset.kind, 'event');
  assert.ok(/id="dialogTitle"/.test(ui.dialogHtml()), 'popup has an accessible title');
  assert.ok(/data-do="choice"/.test(ui.dialogHtml()), 'popup renders choice buttons');
  const header = ui.dialogHtml().match(/<header\b[^>]*class="[^"]*dialog-header[^"]*"[^>]*>([\s\S]*?)<\/header>/);
  assert.ok(header, 'event has its own fixed header');
  assertStats(header[1], state);
}

test('Saved pending event opens automatically with all current stats in its popup', () => {
  const state = withPending(), ui = app(state);
  assertEvent(ui, state);
  assert.ok(/class="[^"]*status-dock/.test(ui.html()), 'persistent status dock is rendered');
  assertStats(ui.html(), state);
});

test('Dismissing a popup preserves its decision and allows explicit reopening', () => {
  const state = withPending(), ui = app(state);
  ui.click({do: 'closeDialog'});
  assert.equal(ui.dialog().open, false);
  assert.deepEqual(ui.saved().pending, state.pending);
  ui.click({tab: 'activities'});
  assert.equal(ui.dialog().open, false, 'ordinary renders do not undo dismissal');
  assert.ok(/data-do="showEvent"/.test(ui.html()), 'pending decision can be reopened');
  assertStats(ui.html(), state);
  ui.click({do: 'showEvent'});
  assertEvent(ui, state);
});

test('Choosing updates the visible stats, closes the popup and cannot apply twice', () => {
  const state = withPending(), ui = app(state), index = possibleChoice(state);
  const expected = E.migrate(JSON.parse(JSON.stringify(state)));
  assert.equal(E.act(expected, 'choice', {index}).ok, true);
  ui.click({do: 'choice', index: String(index)});
  assert.equal(ui.dialog().open, false);
  assert.equal(ui.saved().pending, null);
  assert.deepEqual(ui.saved().stats, expected.stats);
  assertStats(ui.html(), expected);
  const afterFirst = ui.storage.get(KEY);
  ui.click({do: 'choice', index: String(index)});
  assert.equal(ui.storage.get(KEY), afterFirst, 'stale double click does not grant the effects again');
});

test('Persistent stats remain present across every main tab and stateful dialogs', () => {
  const state = fresh(), ui = app(state);
  for (const tab of ['activities', 'people', 'future', 'assets', 'health', 'life']) {
    ui.click({tab});
    assert.ok(/class="[^"]*status-dock/.test(ui.html()), 'persistent status dock is rendered on ' + tab);
    assertStats(ui.html(), state);
  }
  ui.click({do: 'person', id: state.npcs[0].id});
  assert.equal(ui.dialog().open, true);
  assertStats(ui.dialogHtml(), state);
  ui.click({do: 'closeDialog'});
  ui.click({do: 'settings'});
  assertStats(ui.dialogHtml(), state);
});

test('Reloading a dismissed pending decision opens it again without altering the save', () => {
  const state = withPending(), ui = app(state);
  ui.click({do: 'closeDialog'});
  const before = ui.storage.get(KEY);
  const reloaded = app(null, ui.storage);
  assertEvent(reloaded, state);
  assert.equal(reloaded.storage.get(KEY), before);
});

test('Age button creates, saves and opens the new annual event', () => {
  const state = fresh(), ui = app(state);
  assert.equal(ui.dialog().open, false);
  ui.click({do: 'age'});
  const advanced = ui.saved();
  assert.equal(advanced.age, state.age + 1);
  assert.ok(advanced.pending);
  assertEvent(ui, advanced);
  const before = ui.storage.get(KEY);
  ui.click({do: 'age'});
  assert.equal(ui.storage.get(KEY), before, 'another age cannot skip the pending decision');
});

test('Importing a pending life replaces the old popup state and restores the decision', async () => {
  const imported = withPending(81), ui = app(imported);
  ui.click({do: 'closeDialog'});
  ui.click({do: 'settings'});
  // Even the same age/event/NPC key must reopen after an explicit import.
  await ui.importSave(imported);
  assert.deepEqual(ui.saved().pending, imported.pending);
  assert.equal(ui.saved().name, imported.name);
  assertEvent(ui, imported);
});

test('NPC actions refresh the popup stats without resetting its long-menu scroll', () => {
  const state = fresh();state.age = 12;
  const ui = app(state), id = state.npcs[0].id;
  ui.click({do: 'person', id});
  ui.dialogBody().scrollTop = 240;
  const expected = E.migrate(JSON.parse(JSON.stringify(state)));
  const response = E.act(expected, 'social', {id, interaction: 'talk'});
  assert.equal(response.ok, true);
  ui.click({social: 'talk', id});
  assert.equal(ui.dialog().open, true);
  assert.equal(ui.dialogBody().scrollTop, 240, 'same NPC interaction preserves content position');
  assert.deepEqual(ui.saved().stats, expected.stats);
  assertStats(ui.html(), expected);
  assertStats(ui.dialogHtml(), expected);
  assert.ok(ui.dialogHtml().includes('id="dialogFeedback"'), 'popup includes its own feedback region');
});
