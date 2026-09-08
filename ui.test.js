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
const UI_KEY = 'birOmur.ui.v1';
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

  for (const id of ['app', 'dialog', 'dialogContent', 'toast', 'importFile', 'dialogTitle', 'dialogFeedback', 'statFeedback', 'mainContent', 'activitySearch', 'activityResults', 'activityCategory']) nodes.set('#' + id, element(id));
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

  function renderedActionKey(id, action = 'activity') {
    const surfaces = action === 'confirmActivity' ? [nodes.get('#dialogContent').innerHTML] : [nodes.get('#app').innerHTML, nodes.get('#activityResults').innerHTML];
    const keys = surfaces.flatMap(markup => [...markup.matchAll(/<button\b[^>]*>/g)].filter(([tag]) => tag.includes('data-do="' + action + '"') && tag.includes('data-id="' + id + '"')).map(([tag]) => tag.match(/data-action-key="([^"]*)"/)?.[1])).filter(key => key !== undefined);
    // Partial search redraws retain the full-render revision. A later full render
    // replaces that search DOM; prefer its newer actually rendered key.
    return keys.sort((a, b) => Number(b) - Number(a))[0];
  }

  return {
    storage, nodes,
    html() {return nodes.get('#app').innerHTML;},
    dialogHtml() {return nodes.get('#dialogContent').innerHTML;},
    dialog() {return nodes.get('#dialog');},
    dialogBody() {return dialogBody;},
    saved() {return JSON.parse(storage.get(KEY));},
    preferences() {return JSON.parse(storage.get(UI_KEY) || '{}');},
    searchHtml() {return nodes.get('#activityResults').innerHTML;},
    eventKey() {return nodes.get('#dialogContent').innerHTML.match(/data-event-key="([^"]*)"/)?.[1];},
    actionKey: renderedActionKey,
    click(dataset) {
      const button = element();button.dataset = {...dataset};
      // Real DOM buttons carry their rendered event identity. Supply that identity
      // for ordinary test clicks, but never replace an explicitly stale key.
      if (dataset.do === 'choice' && dataset.eventKey === undefined) button.dataset.eventKey = nodes.get('#dialogContent').innerHTML.match(/data-event-key="([^"]*)"/)?.[1];
      if (['activity', 'confirmActivity'].includes(dataset.do) && dataset.actionKey === undefined) button.dataset.actionKey = renderedActionKey(dataset.id, dataset.do);
      for (const handler of listeners.get('click') || []) handler({target: button});
      assert.deepEqual(errors, [], 'click handler produces no caught errors');
    },
    input(value, id = 'activitySearch') {
      const input = nodes.get('#' + id);
      assert.ok(input, 'input fixture exists: ' + id);
      input.value = value;
      for (const handler of listeners.get('input') || []) handler({target: input});
      assert.deepEqual(errors, [], 'input handler produces no caught errors');
    },
    select(value, id = 'activityCategory') {
      const select = nodes.get('#' + id);
      assert.ok(select, 'select fixture exists: ' + id);
      select.value = value;
      for (const handler of listeners.get('change') || []) handler({target: select});
      assert.deepEqual(errors, [], 'select change handler produces no caught errors');
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
  const event = E.eventById(state.pending.id);
  assert.ok(event, 'engine resolves annual and NPC-specific event definitions');
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
    const displayed = Math.max(0, Math.min(100, Math.round(state.stats[key] * 10) / 10));
    assert.ok(region.includes('aria-valuenow="' + displayed + '"'), key + ' shows current value, including fractional progress');
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
function assertNotice(ui, state) {
  assert.equal(ui.dialog().open, true);
  assert.equal(ui.dialog().dataset.kind, 'notice');
  assert.ok(/id="dialogTitle"/.test(ui.dialogHtml()), 'notice has an accessible title');
  assert.ok(/data-do="ackNotice"/.test(ui.dialogHtml()), 'notice has a distinct acknowledgement action');
  assert.ok(!/data-do="choice"/.test(ui.dialogHtml()), 'informational notice does not impersonate the pending decision');
  const header = ui.dialogHtml().match(/<header\b[^>]*class="[^"]*dialog-header[^"]*"[^>]*>([\s\S]*?)<\/header>/);
  assert.ok(header, 'notice keeps the status bars in its fixed header');
  assertStats(header[1], state);
}
function withNotices() {
  const state = withPending();
  state.notices = [
    {id: 'ui-notice-a', age: state.age, title: 'Bir beceride ilk adım', text: 'Emeklerinin sonucunu görüyorsun.', tip: 'Gelişim ekranını incele.'},
    {id: 'ui-notice-b', age: state.age, title: 'Ailende yeni bir sayfa', text: 'Bir yakınından haber var.', tip: 'İlişkiler ekranını incele.'}
  ];
  return state;
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

test('Fractional training progress stays visible in the dock and every popup stat bar', () => {
  const state = withPending();
  state.stats = {knowledge: 21.37, strength: 40.05, charisma: 35.64, health: 88.3, happiness: 74.8, stress: 16.26};
  const ui = app(state);
  assertStats(ui.html(), state);
  assertEvent(ui, state);
  assert.ok(ui.dialogHtml().includes('aria-valuenow="21.4"'));
  assert.ok(ui.dialogHtml().includes('aria-valuenow="35.6"'));
  ui.click({do: 'closeDialog'});
  ui.click({do: 'settings'});
  assertStats(ui.dialogHtml(), state);
});

test('Notice queue opens before an annual event and acknowledgement preserves the decision and stats', () => {
  const state = withNotices(), ui = app(state);
  assertNotice(ui, state);
  assert.deepEqual(ui.saved().pending, state.pending);
  for (let turn = 0; ui.saved().notices.length && turn < state.notices.length; turn++) {
    const previousCount = ui.saved().notices.length;
    assertNotice(ui, state);
    ui.click({do: 'ackNotice'});
    const updated = ui.saved();
    assert.ok(updated.notices.length < previousCount, 'acknowledgement removes only displayed information from the queue');
    assert.deepEqual(updated.pending, state.pending, 'acknowledging a milestone does not choose an event response');
    assert.deepEqual(updated.stats, state.stats);
    assert.equal(updated.money, state.money); assert.equal(updated.age, state.age); assert.equal(updated.rng, state.rng);
  }
  assert.equal(ui.saved().notices.length, 0);
  assertEvent(ui, state);
  const beforeDuplicate = ui.storage.get(KEY);
  ui.click({do: 'ackNotice'});
  assert.deepEqual(ui.saved().pending, state.pending, 'a stale notice click cannot dismiss the actual decision');
  assert.deepEqual(ui.saved().stats, state.stats);
  assert.equal(ui.storage.get(KEY), beforeDuplicate);
  assertEvent(ui, state);
});

test('A genuinely unread notice survives reload and still precedes its pending event', () => {
  const state = withNotices(), ui = app(state);
  assertNotice(ui, state);
  // Reload without clicking X, Escape or Continue: all three acknowledge a notice.
  assert.deepEqual(ui.saved().notices, state.notices);
  const before = ui.storage.get(KEY);
  const reloaded = app(null, ui.storage);
  assertNotice(reloaded, state);
  assert.deepEqual(reloaded.saved().pending, state.pending);
  assert.equal(reloaded.storage.get(KEY), before);
});

test('Importing the same notice queue clears seen state and shows its information again', async () => {
  const imported = withNotices(), ui = app(imported);
  assertNotice(ui, imported);
  ui.click({do: 'closeDialog'}); ui.click({do: 'settings'});
  await ui.importSave(imported);
  assertNotice(ui, imported);
  assert.deepEqual(ui.saved().pending, imported.pending);
  assert.deepEqual(ui.saved().notices, imported.notices);
});

test('X and Escape acknowledge up to three notice cards before returning to the pending decision', async () => {
  const state = withNotices();
  state.notices.push(...[3, 4, 5].map(i => ({id: 'ui-notice-' + i, age: state.age, title: 'Gelişme ' + i, text: 'Yeni bir bilgi.', tip: ''})));
  const ui = app(state);
  assertNotice(ui, state);
  assert.equal((ui.dialogHtml().match(/class="story-note"/g) || []).length, 3);
  ui.click({do: 'closeDialog'});
  assert.equal(ui.saved().notices.length, 2);
  assertNotice(ui, state);
  assert.equal((ui.dialogHtml().match(/class="story-note"/g) || []).length, 2);
  let prevented = false;
  await ui.dialog().emit('cancel', {preventDefault() {prevented = true;}});
  assert.equal(prevented, true, 'native Escape cancellation is handled as acknowledgement');
  assert.equal(ui.saved().notices.length, 0);
  assert.deepEqual(ui.saved().pending, state.pending);
  assert.deepEqual(ui.saved().stats, state.stats);
  assertEvent(ui, state);
});

test('NPC encounter definitions outside LifeData events render and resolve through the engine registry', () => {
  const state = fresh(); state.age = 12; state.year.energy = state.year.maxEnergy = E.maxEnergy(state);
  const npc = {id: 'ui-acquaintance', name: 'Ada & Ece', role: 'acquaintance', contextRole: 'classmate', gender: 'female', age: 12, alive: true, health: 95, bond: 42, income: 0, job: 'Öğrenci', personality: 'Sıcakkanlı'};
  state.npcs.push(npc); state.flags.npcCounter++;
  state.pending = {id: 'relationship_meet_child', npcId: npc.id};
  assert.equal(D.events.some(event => event.id === state.pending.id), false, 'fixture exercises the separate NPC event registry');
  assert.ok(E.eventById(state.pending.id));
  const ui = app(state);
  assertEvent(ui, state);
  assert.ok(ui.dialogHtml().includes('Ada &amp; Ece'), 'NPC context is substituted and escaped');
  const index = possibleChoice(E.migrate(JSON.parse(JSON.stringify(state))));
  const expected = E.migrate(JSON.parse(JSON.stringify(state)));
  assert.equal(E.act(expected, 'choice', {index}).ok, true);
  ui.click({do: 'choice', index: String(index)});
  assert.equal(ui.saved().pending, expected.pending);
  assert.deepEqual(ui.saved().stats, expected.stats);
  assert.equal(ui.saved().npcs.find(n => n.id === npc.id).role, expected.npcs.find(n => n.id === npc.id).role);
  assertStats(ui.html(), expected);
});

function adultWithContact(role = 'friend') {
  const state = fresh(); state.age = 24; state.money = 120000; state.notices = []; state.pending = null;
  state.stats.charisma = 75; state.year.energy = state.year.maxEnergy = E.maxEnergy(state); state.rng = 0;
  const contact = {id: 'ui-adult-contact', name: 'Ada', gender: 'female', age: 25, role, alive: true, health: 95, bond: 88, trust: 80, income: 360000, job: 'Tasarımcı', personality: 'Sıcakkanlı', partnerSince: 20};
  state.npcs.push(contact); state.flags.npcCounter++;
  return {state, contact};
}

test('A social action cannot replace its newly opened romantic encounter with the NPC menu', () => {
  const {state, contact} = adultWithContact(), ui = app(state);
  ui.click({do: 'person', id: contact.id});
  assert.equal(ui.dialog().dataset.kind, 'general');
  ui.click({social: 'flirt', id: contact.id});
  const updated = ui.saved();
  assert.equal(updated.pending?.id, 'relationship_romantic_invitation');
  assertEvent(ui, updated);
  assert.ok(ui.dialogHtml().includes('Kahvenin bahanesi kalmadı'));
});

test('A marriage milestone stays visible instead of being overwritten by the NPC menu', () => {
  const {state, contact} = adultWithContact('partner'), ui = app(state);
  ui.click({do: 'person', id: contact.id});
  ui.click({social: 'marry', id: contact.id});
  const updated = ui.saved();
  assert.equal(updated.npcs.find(n => n.id === contact.id).role, 'spouse');
  assert.ok(updated.notices.length > 0);
  assertNotice(ui, updated);
  assert.ok(ui.dialogHtml().includes('bütçe de şahit'));
});

test('Progress and project UI renders four specialist tracks with accessible XP and next unlocks', () => {
  const {state} = adultWithContact(); state.progression.tracks.academic.xp = 95.5;
  const ui = app(state);
  ui.click({tab: 'activities'}); ui.click({activityView: 'progress'});
  const markup = ui.html();
  assert.ok(markup.includes('Bir puandan daha fazlası.'));
  const tracks = E.progression(state);
  assert.equal((markup.match(/class="card pad skill-card"/g) || []).length, tracks.length);
  for (const track of tracks) {
    assert.ok(markup.includes('aria-label="' + track.name + ' uzmanlık ilerlemesi"'));
    assert.ok(markup.includes(track.tierName));
  }
  for (const project of D.actions.filter(a => a.project)) assert.ok(markup.includes('data-id="' + project.id + '"'), project.name + ' is discoverable');
  assert.ok(markup.includes('95,5'), 'fractional specialist XP is visible');
  assert.ok(!/NaN|undefined/.test(markup));
  assertStats(markup, state);
});

test('Budget UI exposes the economy, family pool, side-income tax and debt principal separately', () => {
  const {state} = adultWithContact();
  state.money = 50000; state.debt = 80000; state.city = 'İstanbul';
  state.job = {id: 'technician', salary: 384000, level: 1, years: 0, performance: 55};
  state.year.income = state.year.taxableIncome = 9000;
  const ui = app(state);
  ui.click({tab: 'assets'}); ui.click({assetsTab: 'budget'});
  const markup = ui.html();
  for (const text of ['Paranın da bir hikâyesi var.', 'Fiyat değişimi', 'Ücret değişimi', 'Ek gelirin yıl sonunda ödenecek vergisi', 'Otomatik anapara ödemesi', 'Ailenin destek kapasitesi', 'Taşınmadan önce hesabını yap.']) assert.ok(markup.includes(text), text);
  assert.ok(markup.includes('class="family-budget"')); assert.ok(markup.includes('class="housing-grid"'));
  for (const forecast of E.housingForecast(state)) assert.ok(markup.includes(forecast.label));
  assert.ok(!/NaN|undefined/.test(markup));
  assertStats(markup, state);
});

const inspectedIds = markup => [...markup.matchAll(/data-do="inspectActivity" data-id="([^"]+)"/g)].map(match => match[1]);
function atAge(age) {
  const state = fresh(); state.age = age; state.notices = []; state.pending = null;
  state.year.energy = state.year.maxEnergy = E.maxEnergy(state);
  return state;
}
function preferencesStorage(preferences) {return new Map([[UI_KEY, JSON.stringify(preferences)]]);}

test('Life timeline groups years newest-first while keeping same-year entries chronological and older years collapsed', () => {
  const state = atAge(5);
  state.log = [
    {age: 0, kind: 'milestone', title: 'TIMELINE_BIRTH', text: 'İlk sayfa.'},
    {age: 3, kind: 'life', title: 'TIMELINE_3A', text: 'Eski bir an.'},
    {age: 4, kind: 'activity', title: 'TIMELINE_4A', text: 'Önce bu oldu.'},
    {age: 4, kind: 'decision', title: 'TIMELINE_4B', text: 'Sonra bu oldu.'},
    {age: 5, kind: 'year', title: 'TIMELINE_5A', text: 'Yıl başladı.'},
    {age: 5, kind: 'activity', title: 'TIMELINE_5B', text: 'Bir etkinlik yaptın.'},
    {age: 5, kind: 'milestone', title: 'TIMELINE_5C', text: 'Bir hedef tamamlandı.'}
  ];
  const ui = app(state), before = ui.storage.get(KEY), markup = ui.html();
  assert.deepEqual([...markup.matchAll(/class="timeline-group[^"]*" data-age="(\d+)"/g)].map(m => Number(m[1])), [5, 4, 3, 0]);
  const older = markup.match(/<details\b[^>]*class="timeline-older"[^>]*>/);
  assert.ok(older); assert.ok(!/\bopen(?:\s|>|=)/.test(older[0]), 'previous years start in a closed native disclosure');
  for (const age of [4, 5]) {
    const group = markup.match(new RegExp('<section class="timeline-group[^"\\n]*" data-age="' + age + '">([\\s\\S]*?)<\\/section>'));
    assert.ok(group); assert.ok(group[1].indexOf('TIMELINE_' + age + 'A') < group[1].indexOf('TIMELINE_' + age + 'B'));
  }
  ui.click({journalFilter: 'milestones'});
  assert.ok(ui.html().includes('TIMELINE_5C')); assert.ok(ui.html().includes('TIMELINE_BIRTH'));
  assert.ok(!ui.html().includes('TIMELINE_5B'));
  assert.equal(ui.storage.get(KEY), before, 'changing the timeline view does not alter the life');
});

test('Default activity view contains age-appropriate actions, locked reasons and an explicit future-actions toggle', () => {
  const state = atAge(12), ui = app(state);
  ui.click({tab: 'activities'});
  const before = ui.storage.get(KEY);
  const expected = D.actions.filter(a => state.age >= (a.minAge || 0) && state.age <= (a.maxAge ?? 120)).map(a => a.id);
  assert.deepEqual(inspectedIds(ui.html()), expected);
  assert.ok(ui.html().includes(E.actionReason(state, 'read')), 'gear requirement is discoverable without attempting the action');
  assert.ok(ui.html().includes('data-do="toggleFuture" aria-expanded="false"'));
  ui.click({do: 'toggleFuture'});
  for (const action of D.actions.filter(a => state.age < (a.minAge || 0))) assert.ok(inspectedIds(ui.html()).includes(action.id), 'future unlock can be inspected: ' + action.id);
  assert.ok(ui.html().includes('data-do="toggleFuture" aria-expanded="true"'));
  ui.click({do: 'toggleFuture'});
  assert.deepEqual(inspectedIds(ui.html()), expected);
  assert.equal(ui.storage.get(KEY), before);
});

test('Ready filter and local activity search spend no game resources or change the save', () => {
  const state = atAge(12), ui = app(state);
  ui.click({tab: 'activities'});
  const before = ui.storage.get(KEY);
  ui.click({activityFilter: 'ready'});
  const ready = D.actions.filter(a => !E.actionReason(state, a)).map(a => a.id);
  assert.ok(ready.length > 0); assert.deepEqual(inspectedIds(ui.html()), ready);
  ui.click({activityFilter: 'age'});
  const query = 'kütüphane';
  ui.input(query);
  const expected = D.actions.filter(a => (a.name + ' ' + a.description).toLocaleLowerCase('tr-TR').includes(query)).map(a => a.id);
  assert.ok(expected.length > 0); assert.deepEqual(inspectedIds(ui.searchHtml()), expected);
  assert.ok(ui.searchHtml().includes('role="status" aria-live="polite"'));
  ui.input('zzzzzzzz-olmayan-aktivite');
  assert.deepEqual(inspectedIds(ui.searchHtml()), []); assert.ok(ui.searchHtml().includes('Bu aramada bir aktivite bulamadık.'));
  ui.input('<img src=x onerror=alert(1)>');
  assert.ok(!ui.searchHtml().includes('<img src=x')); assert.ok(ui.searchHtml().includes('&lt;img'));
  assert.equal(ui.storage.get(KEY), before, 'search/filter does not spend money, energy, RNG or stat progress');
});

test('Favorite activities persist only in UI preferences and can be removed without mutating the life', () => {
  const state = atAge(12), ui = app(state), before = ui.storage.get(KEY);
  ui.click({tab: 'activities'}); ui.click({do: 'toggleFavorite', id: 'read'}); ui.click({do: 'toggleFavorite', id: 'rest'});
  assert.deepEqual(ui.preferences(), {favorites: ['read', 'rest'], confirmAge: false});
  assert.equal(ui.storage.get(KEY), before);
  ui.click({activityFilter: 'favorites'});
  assert.deepEqual(new Set(inspectedIds(ui.html())), new Set(['read', 'rest']));
  assert.ok(ui.html().includes('aria-pressed="true"'));
  const reloaded = app(null, ui.storage);
  reloaded.click({tab: 'activities'}); reloaded.click({activityFilter: 'favorites'});
  assert.deepEqual(new Set(inspectedIds(reloaded.html())), new Set(['read', 'rest']));
  reloaded.click({do: 'toggleFavorite', id: 'read'});
  assert.deepEqual(reloaded.preferences().favorites, ['rest']); assert.deepEqual(inspectedIds(reloaded.html()), ['rest']);
  const preferencesBeforeInvalid = reloaded.storage.get(UI_KEY);
  reloaded.click({do: 'toggleFavorite', id: 'missing-action'});
  assert.equal(reloaded.storage.get(UI_KEY), preferencesBeforeInvalid);
  assert.equal(reloaded.storage.get(KEY), before);
});

test('Optional activity information is read-only and does not contain an execution button', () => {
  const state = atAge(12), ui = app(state), before = ui.storage.get(KEY);
  ui.click({tab: 'activities'}); ui.click({do: 'inspectActivity', id: 'rest'});
  assert.equal(ui.dialog().dataset.kind, 'activity-info'); assertStats(ui.dialogHtml(), state);
  assert.ok(!ui.dialogHtml().includes('data-do="activity"'));
  assert.ok(!ui.dialogHtml().includes('data-do="confirmActivity"'));
  assert.ok(ui.dialogHtml().includes('Kazanım önizlemesi'));
  assert.equal(ui.storage.get(KEY), before);
  ui.click({do: 'activity', id: 'rest'});
  assert.equal(ui.storage.get(KEY), before, 'background activity command is blocked while information is open');
  ui.click({do: 'closeDialog'});
  ui.click({do: 'inspectActivity', id: 'read'});
  assert.equal(ui.dialog().dataset.kind, 'activity-info');
  assert.ok(ui.dialogHtml().includes(E.actionReason(state, 'read')));
  ui.click({do: 'activity', id: 'read'});
  assert.equal(ui.storage.get(KEY), before);
});

test('Optional unused-time confirmation exposes current stats, stays in this year on cancel and advances once on confirm', () => {
  const state = fresh(), ui = app(state, preferencesStorage({favorites: [], confirmAge: true}));
  const before = ui.storage.get(KEY);
  ui.click({do: 'age'});
  assert.equal(ui.dialog().dataset.kind, 'age-confirm'); assert.equal(ui.dialog().open, true);
  assertStats(ui.dialogHtml(), state); assert.ok(ui.dialogHtml().includes('data-do="confirmAge"'));
  assert.ok(ui.dialogHtml().includes(state.year.energy + ' zaman'));
  assert.equal(ui.storage.get(KEY), before);
  ui.click({do: 'closeDialog'}); assert.equal(ui.dialog().open, false); assert.equal(ui.storage.get(KEY), before);
  ui.click({do: 'age'}); ui.click({do: 'confirmAge'});
  assert.equal(ui.saved().age, state.age + 1);
  const advanced = ui.storage.get(KEY);
  ui.click({do: 'confirmAge'});
  assert.equal(ui.storage.get(KEY), advanced, 'stale double confirm cannot skip another year');
});

test('Unused-time reminder is off by default and settings persist its toggle outside the game save', () => {
  const state = fresh(), ui = app(state), before = ui.storage.get(KEY);
  ui.click({do: 'settings'});
  assert.ok(/data-do="toggleAgeConfirm" role="switch" aria-checked="false"/.test(ui.dialogHtml()));
  ui.click({do: 'toggleAgeConfirm'});
  assert.equal(ui.preferences().confirmAge, true);
  assert.ok(/data-do="toggleAgeConfirm" role="switch" aria-checked="true"/.test(ui.dialogHtml()));
  assert.equal(ui.storage.get(KEY), before);
  const reloaded = app(null, ui.storage);
  reloaded.click({do: 'age'}); assert.equal(reloaded.dialog().dataset.kind, 'age-confirm');
  reloaded.click({do: 'closeDialog'}); reloaded.click({do: 'settings'}); reloaded.click({do: 'toggleAgeConfirm'});
  assert.equal(reloaded.preferences().confirmAge, false); assert.equal(reloaded.storage.get(KEY), before);
  reloaded.click({do: 'closeDialog'}); reloaded.click({do: 'age'});
  assert.equal(reloaded.saved().age, state.age + 1);
  assert.notEqual(reloaded.dialog().dataset.kind, 'age-confirm');
});

test('An enabled unused-time reminder does not add a confirmation when no time remains', () => {
  const state = fresh(); state.year.energy = 0;
  const ui = app(state, preferencesStorage({favorites: [], confirmAge: true}));
  ui.click({do: 'age'});
  assert.equal(ui.saved().age, state.age + 1);
  assert.notEqual(ui.dialog().dataset.kind, 'age-confirm');
});

test('The new mobile shell has five destinations, one primary age control and a reachable health screen', () => {
  const state = fresh(), ui = app(state), markup = ui.html();
  const mobile = markup.match(/<nav class="mobile-nav"[^>]*>([\s\S]*?)<\/nav>/);
  assert.ok(mobile);
  assert.deepEqual([...mobile[1].matchAll(/data-tab="([^"]+)"/g)].map(m => m[1]), ['life', 'activities', 'people', 'future', 'assets']);
  assert.equal((markup.match(/class="age-button"/g) || []).length, 1);
  assert.ok(markup.includes('data-tab="health" aria-label="Sağlık ve yaşam düzeni"'));
  assert.ok(markup.includes('data-do="genetics"'));
  assert.ok(markup.includes('aria-label="Zekâ"')); assert.ok(markup.includes('aria-label="Güzellik"'));
  ui.click({tab: 'health'});
  assert.ok(ui.html().includes('<h1>Sağlık</h1>')); assertStats(ui.html(), state);
});

test('Future overview, education and jobs are separate segments without changing the game', () => {
  const state = atAge(24), ui = app(state), before = ui.storage.get(KEY);
  ui.click({tab: 'future'});
  assert.ok(ui.html().includes('Eğitim yollarını keşfet'));
  assert.ok(!ui.html().includes('data-do="enroll"')); assert.ok(!ui.html().includes('data-do="apply"'));
  ui.click({futureView: 'education'});
  assert.equal((ui.html().match(/data-do="enroll"/g) || []).length, D.courses.length);
  assert.ok(!ui.html().includes('data-do="apply"')); assertStats(ui.html(), state);
  ui.click({futureView: 'jobs'});
  assert.equal((ui.html().match(/data-do="apply"/g) || []).length, D.careers.length);
  assert.ok(!ui.html().includes('data-do="enroll"')); assertStats(ui.html(), state);
  ui.click({futureView: 'overview'});
  assert.equal(ui.storage.get(KEY), before);
});

test('Existing life data survives the new shell, navigation, search and favorite preferences intact', () => {
  const state = atAge(30);
  state.name = 'Kayıtlı hayat'; state.money = 45678; state.debt = 12345;
  state.inventory = [{id: 'book', condition: 100}, {id: 'laptop', condition: 73}];
  state.education.degree = 'software'; state.education.degrees = ['software'];
  state.job = {id: 'developer', salary: 600000, performance: 61, years: 4, level: 2};
  state.year.energy = state.year.maxEnergy = E.maxEnergy(state);
  const ui = app(state), before = ui.storage.get(KEY);
  for (const tab of ['people', 'future', 'assets', 'health', 'activities', 'life']) ui.click({tab});
  ui.click({tab: 'activities'}); ui.input('kitap'); ui.click({do: 'toggleFavorite', id: 'read'});
  assert.equal(ui.storage.get(KEY), before);
  const reloaded = app(null, ui.storage);
  assert.equal(reloaded.storage.get(KEY), before); assert.deepEqual(reloaded.saved(), state);
  assertStats(reloaded.html(), state);
});

test('Character name opens the non-mutating family trait comparison with current stat bars', () => {
  const state = fresh(), ui = app(state), before = ui.storage.get(KEY);
  assert.equal(typeof E.genetics, 'function');
  ui.click({do: 'genetics'});
  assert.equal(ui.dialog().dataset.kind, 'genetics'); assert.equal(ui.dialog().open, true);
  assert.ok(ui.dialogHtml().includes('aria-label="Aile özellikleri karşılaştırması"'));
  assert.ok(ui.dialogHtml().includes('Sen · doğuştan')); assert.ok(ui.dialogHtml().includes('Sen · şimdi'));
  assert.ok(ui.dialogHtml().includes('Zekâ')); assert.ok(ui.dialogHtml().includes('Güzellik'));
  assert.ok(!/NaN|undefined/.test(ui.dialogHtml())); assertStats(ui.dialogHtml(), state);
  assert.equal(ui.storage.get(KEY), before);
});

test('An obsolete activity revision cannot spend another time unit but a fresh deliberate tap can', () => {
  const state = atAge(12), ui = app(state);
  ui.click({tab: 'activities'});
  const originalKey = ui.actionKey('rest'); assert.ok(originalKey);
  ui.click({do: 'activity', id: 'rest', actionKey: originalKey});
  assert.equal(ui.saved().year.used.rest, 1);
  assert.equal(ui.saved().year.energy, state.year.energy - 1);
  assert.equal(ui.dialog().open, false, 'a normal activity completes without an extra confirmation');
  assert.notEqual(ui.actionKey('rest'), originalKey);
  const afterFirst = ui.storage.get(KEY);
  ui.click({do: 'activity', id: 'rest', actionKey: originalKey});
  assert.equal(ui.storage.get(KEY), afterFirst, 'detached old card is not a new decision to repeat the action');
  ui.click({do: 'inspectActivity', id: 'read'});
  ui.click({do: 'activity', id: 'rest'});
  assert.equal(ui.storage.get(KEY), afterFirst, 'an open information dialog blocks background actions');
  ui.click({do: 'closeDialog'}); ui.click({do: 'activity', id: 'rest'});
  assert.equal(ui.saved().year.used.rest, 2, 'an intentional fresh tap repeats an allowed action');
});

test('An old choice key cannot choose the same index in a newly queued NPC encounter', () => {
  const state = atAge(12);
  const npc = {id: 'ui-queued-acquaintance', name: 'Ece', role: 'acquaintance', contextRole: 'classmate', gender: 'female', age: 12, alive: true, health: 95, bond: 42, income: 0, job: 'Öğrenci', personality: 'Sıcakkanlı'};
  state.npcs.push(npc); state.flags.npcCounter++;
  state.pending = {id: 'group_project'};
  state.encounters = [{id: 'relationship_meet_child', npcId: npc.id}];
  const ui = app(state), firstKey = ui.eventKey();
  assert.equal(firstKey, encodeURIComponent(state.age + ':group_project:'));
  ui.click({do: 'choice', index: '0', eventKey: firstKey});
  const afterFirst = ui.saved(), secondKey = ui.eventKey();
  assert.equal(afterFirst.pending.id, 'relationship_meet_child');
  assert.equal(afterFirst.npcs.find(n => n.id === npc.id).role, 'acquaintance');
  assert.equal(secondKey, encodeURIComponent(state.age + ':relationship_meet_child:' + npc.id));
  assert.notEqual(secondKey, firstKey); assertEvent(ui, afterFirst);
  const untouched = ui.storage.get(KEY);
  ui.click({do: 'choice', index: '0', eventKey: firstKey});
  assert.equal(ui.storage.get(KEY), untouched, 'old event identity cannot apply to the new pending encounter');
  assert.equal(ui.saved().npcs.find(n => n.id === npc.id).role, 'acquaintance');
  assert.deepEqual(ui.saved().pending, afterFirst.pending); assertEvent(ui, afterFirst);
  ui.click({do: 'closeDialog'});
  ui.click({do: 'choice', index: '0', eventKey: secondKey});
  assert.equal(ui.storage.get(KEY), untouched, 'even a matching key is not actionable while its popup is closed');
  ui.click({do: 'showEvent'}); ui.click({do: 'choice', index: '0', eventKey: secondKey});
  assert.equal(ui.saved().pending, null);
  assert.equal(ui.saved().npcs.find(n => n.id === npc.id).role, 'friend', 'the actual encounter choice remains available');
});

test('Normal activities run in one tap from activities, favorites and health without an extra dialog', () => {
  for (const surface of ['activities', 'favorites', 'health']) {
    const state = atAge(12), storage = surface === 'favorites' ? preferencesStorage({favorites: ['rest'], confirmAge: false}) : undefined;
    const ui = app(state, storage);
    ui.click({tab: surface === 'health' ? 'health' : 'activities'});
    if (surface === 'favorites') ui.click({activityFilter: 'favorites'});
    assert.ok(ui.actionKey('rest'), 'normal action is present on ' + surface);
    assert.ok(ui.html().includes('class="activity-tools"'));
    assert.ok(ui.html().includes('class="activity-info"'));
    const expected = E.migrate(JSON.parse(JSON.stringify(state)));
    assert.equal(E.act(expected, 'activity', {id: 'rest'}).ok, true);
    ui.click({do: 'activity', id: 'rest'});
    assert.equal(ui.saved().year.used.rest, 1, surface);
    assert.equal(ui.saved().year.energy, expected.year.energy, surface);
    assert.deepEqual(ui.saved().stats, expected.stats, surface);
    assert.equal(ui.dialog().open, false, surface + ' avoids an execution confirmation');
    assertStats(ui.html(), expected);
  }
});

test('A free project from progress executes directly but still shows its meaningful milestone notice', () => {
  const state = atAge(12); state.stats.knowledge = 60;
  state.inventory = [{id: 'book', condition: 100}]; state.progression.tracks.academic.xp = 60;
  const ui = app(state); ui.click({tab: 'activities'}); ui.click({activityView: 'progress'});
  assert.equal(E.actionReason(state, 'research_notebook'), ''); assert.ok(ui.actionKey('research_notebook'));
  const expected = E.migrate(JSON.parse(JSON.stringify(state)));
  assert.equal(E.act(expected, 'activity', {id: 'research_notebook'}).ok, true);
  ui.click({do: 'activity', id: 'research_notebook'});
  assert.equal(ui.saved().year.used.research_notebook, 1);
  assert.deepEqual(ui.saved().stats, expected.stats); assert.equal(ui.saved().money, state.money);
  assert.ok(ui.saved().notices.length > 0);
  assertNotice(ui, expected);
});

test('Small activity costs skip confirmation including a sub-threshold cost that is a large share of cash', () => {
  for (const fixture of [{id: 'swim', cash: 400}, {id: 'personal_style', cash: 10000}]) {
    const state = atAge(18); state.money = fixture.cash; state.rng = 4000;
    const ui = app(state); ui.click({tab: 'health'});
    const expected = E.migrate(JSON.parse(JSON.stringify(state)));
    const cost = E.costOf(state, D.actions.find(a => a.id === fixture.id));
    assert.equal(E.act(expected, 'activity', {id: fixture.id}).ok, true);
    ui.click({do: 'activity', id: fixture.id});
    assert.equal(ui.saved().money, fixture.cash - cost);
    assert.equal(ui.saved().year.used[fixture.id], 1);
    assert.deepEqual(ui.saved().stats, expected.stats);
    assert.equal(ui.dialog().open, false, fixture.id + ' is not a significant-expense confirmation');
  }
});

test('An expensive driving course asks once and rejects wrong-id, wrong-key and cancelled confirmations', () => {
  const state = atAge(18); state.money = 20000;
  const ui = app(state); ui.click({tab: 'activities'});
  const before = ui.storage.get(KEY);
  ui.click({do: 'activity', id: 'driving_school'});
  assert.equal(ui.dialog().dataset.kind, 'activity-confirm'); assert.equal(ui.dialog().dataset.activityId, 'driving_school');
  assertStats(ui.dialogHtml(), state); assert.equal(ui.storage.get(KEY), before);
  const key = ui.actionKey('driving_school', 'confirmActivity'); assert.ok(key);
  ui.click({do: 'confirmActivity', id: 'rest', actionKey: key});
  assert.equal(ui.storage.get(KEY), before);
  ui.click({do: 'confirmActivity', id: 'driving_school', actionKey: String(Number(key) - 1)});
  assert.equal(ui.storage.get(KEY), before);
  assert.equal(ui.dialog().open, true);
  ui.click({do: 'closeDialog'});
  assert.equal(ui.storage.get(KEY), before);
  ui.click({do: 'confirmActivity', id: 'driving_school', actionKey: key});
  assert.equal(ui.storage.get(KEY), before, 'cancelled confirmation cannot execute after the popup closes');
  ui.click({do: 'activity', id: 'driving_school'});
  assert.equal(ui.dialog().dataset.kind, 'activity-confirm'); assert.equal(ui.dialog().open, true);
  const currentKey = ui.actionKey('driving_school', 'confirmActivity');
  ui.click({do: 'confirmActivity', id: 'driving_school'});
  assert.equal(ui.saved().money, 8000); assert.equal(ui.saved().year.used.driving_school, 1);
  assert.equal(ui.saved().year.energy, state.year.energy - 2); assert.equal(ui.saved().flags.driver_license, true);
  const after = ui.storage.get(KEY);
  ui.click({do: 'confirmActivity', id: 'driving_school', actionKey: currentKey});
  assert.equal(ui.storage.get(KEY), after, 'old confirmation never pays or grants progress twice');
});

test('A smaller expense still requires confirmation when it materially affects personal cash', () => {
  const state = atAge(18); state.money = 4000;
  const ui = app(state); ui.click({tab: 'health'});
  const before = ui.storage.get(KEY);
  ui.click({do: 'activity', id: 'personal_style'});
  assert.equal(ui.dialog().dataset.kind, 'activity-confirm'); assert.equal(ui.dialog().dataset.activityId, 'personal_style');
  assertStats(ui.dialogHtml(), state); assert.equal(ui.storage.get(KEY), before);
  ui.click({do: 'confirmActivity', id: 'personal_style'});
  assert.equal(ui.saved().money, 2800); assert.equal(ui.saved().year.used.personal_style, 1);
  assert.equal(ui.saved().year.energy, state.year.energy - 1);
});

test('A parent-paid child medical visit uses its actual zero price and needs no expense confirmation', () => {
  const state = atAge(8); state.money = 0; state.stats.health = 60;
  const ui = app(state); ui.click({tab: 'health'});
  assert.equal(E.costOf(state, D.actions.find(a => a.id === 'doctor')), 0);
  ui.click({do: 'activity', id: 'doctor'});
  assert.equal(ui.saved().money, 0); assert.equal(ui.saved().year.used.doctor, 1);
  assert.equal(ui.saved().year.energy, state.year.energy - 1);
  assert.ok(ui.saved().stats.health > state.stats.health); assert.equal(ui.dialog().open, false);
});

test('Insufficient funds are handled before expense confirmation without changing resources', () => {
  const state = atAge(18); state.money = 11000;
  const ui = app(state); ui.click({tab: 'activities'});
  const before = ui.storage.get(KEY);
  ui.click({do: 'activity', id: 'driving_school'});
  assert.equal(ui.storage.get(KEY), before); assert.equal(ui.dialog().open, false);
  assert.ok(ui.nodes.get('#toast').textContent.length > 0, 'the locking reason is explained');
});

test('A partial local search keeps the current action revision and its visible result remains one-tap actionable', () => {
  const state = atAge(12), ui = app(state); ui.click({tab: 'activities'});
  const key = ui.actionKey('rest');
  ui.input('kendine zaman');
  assert.ok(ui.searchHtml().includes('data-do="activity" data-id="rest"'));
  assert.equal(ui.actionKey('rest'), key, 'search redraw does not invalidate current cards');
  ui.click({do: 'activity', id: 'rest'});
  assert.equal(ui.saved().year.used.rest, 1); assert.equal(ui.dialog().open, false);
});

test('Native activity categories combine with search, ready and favorites without changing the saved life', () => {
  const state = atAge(12), ui = app(state, preferencesStorage({favorites: ['library', 'rest'], confirmAge: false}));
  ui.click({tab: 'activities'});
  const before = ui.storage.get(KEY), beforePreferences = ui.storage.get(UI_KEY);
  const select = ui.html().match(/<select\b[^>]*id="activityCategory"[^>]*>([\s\S]*?)<\/select>/);
  assert.ok(select, 'categories use a native compact select');
  assert.ok(select[0].includes('aria-label="Aktivite kategorisi"'));
  assert.deepEqual([...select[1].matchAll(/<option\b[^>]*value="([^"]+)"/g)].map(m => m[1]), ['all', 'learning', 'social', 'health', 'work', 'creative', 'outdoors']);
  ui.click({activityFilter: 'ready'}); ui.input('kütüphane'); ui.select('learning');
  assert.deepEqual(inspectedIds(ui.html()), ['library']);
  assert.ok(/aria-pressed="true" data-activity-filter="ready"/.test(ui.html()), 'category change preserves the ready filter');
  assert.ok(ui.html().includes('value="kütüphane"'), 'category change preserves the search query');
  ui.click({activityFilter: 'favorites'});
  assert.deepEqual(inspectedIds(ui.html()), ['library']);
  ui.select('health');
  assert.deepEqual(inspectedIds(ui.html()), [], 'all three active constraints apply together');
  ui.input('');
  assert.deepEqual(inspectedIds(ui.searchHtml()), ['rest'], 'clearing search preserves category and favorites');
  ui.select('all');
  assert.deepEqual(new Set(inspectedIds(ui.html())), new Set(['library', 'rest']));
  const priorMarkup = ui.html();
  for (const invalid of ['missing-category', '__proto__', 'constructor']) {
    ui.select(invalid);
    assert.equal(ui.html(), priorMarkup, 'invalid category is harmless: ' + invalid);
  }
  assert.equal(ui.storage.get(KEY), before, 'category changes never spend time, money or RNG');
  assert.equal(ui.storage.get(UI_KEY), beforePreferences, 'filter changes do not rewrite favorites or other preferences');
});
