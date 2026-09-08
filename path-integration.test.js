'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('./engine.js');
const Economy = require('./economy.js');
const { ROUTES, simulate } = require('./scripts/path-balance-report.js');

const copy = value => JSON.parse(JSON.stringify(value));
const snapshot = value => JSON.stringify(value);

function act(s, type, payload) {
  const result = E.act(s, type, payload);
  assert.equal(result.ok, true, `${s.age} yaş / ${type} ${JSON.stringify(payload || {})}: ${result.message}`);
  return result;
}

function choose(s, predicate) {
  const event = E.eventById(s.pending?.id);
  assert.ok(event, `Unknown pending event: ${s.pending?.id}`);
  const index = event.choices.findIndex(predicate);
  assert.ok(index >= 0, `Expected choice in ${event.id}`);
  return act(s, 'choice', { index });
}

function clearDecisions(s) {
  for (let guard = 0; s.pending && guard < 40; guard++) {
    const event = E.eventById(s.pending.id);
    assert.ok(event, `Unknown pending event: ${s.pending.id}`);
    const possible = event.choices.map((choice, index) => ({ choice, index }))
      .filter(({ choice }) => !E.choiceReason(s, choice));
    const selection = possible.find(({ choice }) => !choice.cost && !choice.energy && !choice.requires) || possible[0];
    assert.ok(selection, `No affordable choice: ${event.id}`);
    act(s, 'choice', { index: selection.index });
  }
  assert.equal(s.pending, null, 'Decision chains must terminate');
  if (s.notices.length) act(s, 'ackNotice', { ids: s.notices.map(n => n.id) });
}

// Synthetic fixtures below isolate guard/ledger behavior. They are not evidence
// that a route is reachable naturally; birth-to-goal scenarios are separate.
function fixture(age = 18, seed = 9401) {
  const s = E.newLife({ name: 'Yol entegrasyonu', gender: 'female', seed });
  s.age = age; s.city = 'Ankara'; s.money = 80000; s.debt = 0;
  s.pending = null; s.encounters = []; s.notices = []; s.npcs = [];
  s.stats = { knowledge: 55, strength: 55, charisma: 55, health: 90, happiness: 85, stress: 5 };
  s.year = { energy: E.maxEnergy(s), maxEnergy: E.maxEnergy(s), used: {}, social: {}, income: 0, expenses: 0, taxableIncome: 0, debtPaid: 0 };
  return s;
}

function prepared(route, age = 18, seed = 9401) {
  const s = fixture(age, seed);
  s.inventory = ['book', 'shoes', 'guitar', 'laptop'].map(id => ({ id, condition: 100 }));
  for (const track of Object.values(s.progression.tracks)) track.xp = 330;
  act(s, 'activity', { id: `path_${route}_start` });
  clearDecisions(s);
  return s;
}

function opportunity(route, seed = 9401) {
  const s = prepared(route, 18, seed);
  act(s, 'activity', { id: `path_${route}_practice` });
  clearDecisions(s); act(s, 'age'); clearDecisions(s);
  act(s, 'activity', { id: `path_${route}_practice` });
  clearDecisions(s); act(s, 'activity', { id: `path_${route}_submit` });
  clearDecisions(s); act(s, 'age');
  assert.equal(s.pending?.id, `path_${route}_opportunity`);
  return s;
}

const naturalCache = new Map();
function natural(route) {
  if (!naturalCache.has(route)) naturalCache.set(route, simulate(route));
  return naturalCache.get(route);
}

function advanceTo(s, eventId, maximumYears = 8) {
  for (let year = 0; s.pending?.id !== eventId && year < maximumYears; year++) {
    clearDecisions(s); act(s, 'age');
  }
  assert.equal(s.pending?.id, eventId, `Expected chapter ${eventId}`);
}

test('synthetic migration: pre-path v3 save keeps cash, RNG and its unresolved decision', () => {
  const old = fixture(16, 9127);
  delete old.lifePaths;
  old.money = 12345; old.debt = 6789; old.rng = 987654321;
  old.pending = { id: 'group_project' };
  old.year.energy = 2; old.year.used.library = 1;
  const saved = copy(old), before = snapshot(saved), restored = E.migrate(saved);
  assert.ok(restored);
  assert.equal(snapshot(saved), before, 'Migration must not mutate the supplied saved object');
  for (const key of ['money', 'debt', 'rng', 'age']) assert.equal(restored[key], old[key], key);
  assert.deepEqual(restored.pending, old.pending);
  assert.deepEqual(restored.stats, old.stats);
  assert.deepEqual(restored.year, old.year);
  assert.ok(restored.lifePaths, 'Legacy lives receive the new path schema');
  const reloaded = E.migrate(copy(restored));
  assert.deepEqual(reloaded.lifePaths, restored.lifePaths);
  assert.deepEqual(reloaded.pending, old.pending);
  assert.equal(reloaded.money, old.money); assert.equal(reloaded.rng, old.rng);
});

test('synthetic promotion: future seniority raises diminish while saved base salaries stay intact', () => {
  for (const [level, raise] of [[1, .14], [2, .11], [3, .08], [4, .06]]) {
    const s = fixture(35, 9430 + level);
    s.job = { id: 'cashier', salary: 987654, level, performance: 100, years: level * 3 };
    s.year.energy = s.year.maxEnergy = E.maxEnergy(s);
    const restored = E.migrate(copy(s));
    assert.equal(restored.job.salary, s.job.salary, `Reload cannot cut a level-${level} saved salary`);
    act(restored, 'age');
    assert.equal(restored.job.level, level + 1);
    assert.equal(restored.job.salary, Math.round(987654 * (1 + raise)));
  }
  const s = fixture(35);
  s.job = { id: 'cashier', salary: 987654, level: 5, performance: 100, years: 20 };
  act(s, 'age');
  assert.equal(s.job.salary, 987654, 'The fifth level remains capped without removing an earned salary');
});

test('synthetic pin: choosing a visible goal cannot spend resources, resolve a story or consume RNG', () => {
  const s = fixture(16);
  s.pending = { id: 'group_project' };
  for (const id of ['academic', 'athletics', 'music', null]) {
    const before = copy(s);
    act(s, 'pinPath', { id });
    const { lifePaths: beforePaths, ...beforeGame } = before;
    const { lifePaths: afterPaths, ...afterGame } = s;
    assert.deepEqual(afterGame, beforeGame, 'Pinning is goal selection, not a gameplay reward');
    const restored = E.migrate(copy(s));
    assert.deepEqual(restored.lifePaths, afterPaths, 'Pinned path persists through reload');
    assert.ok(beforePaths && afterPaths);
  }
  for (const id of ['missing', '__proto__', 'constructor']) {
    const before = snapshot(s);
    assert.equal(E.act(s, 'pinPath', { id }).ok, false);
    assert.equal(snapshot(s), before);
  }
});

test('synthetic overview: inspecting goals is deterministic and does not alter the life', () => {
  const s = prepared('academic');
  const before = snapshot(s);
  assert.deepEqual(E.paths(s), E.paths(s));
  assert.equal(snapshot(s), before);
  assert.ok(Array.isArray(E.actions));
  for (const route of ['academic', 'athletics', 'music']) {
    for (const step of ['start', 'practice', 'submit', 'develop', 'launch', 'work']) {
      assert.ok(E.actions.some(a => a.id === `path_${route}_${step}`), `${route}/${step} is registered in the real engine`);
    }
  }
});

test('synthetic practice: two clicks in one year cannot replace two different practice years', () => {
  for (const route of ['academic', 'athletics', 'music']) {
    const s = prepared(route);
    const firstAge = s.age;
    act(s, 'activity', { id: `path_${route}_practice` });
    clearDecisions(s);
    for (const id of [`path_${route}_practice`, `path_${route}_submit`]) {
      const before = snapshot(s);
      assert.equal(E.act(s, 'activity', { id }).ok, false, `${id} must wait for another year`);
      assert.equal(snapshot(s), before, `${id} cannot consume resources on rejection`);
    }
    act(s, 'age'); clearDecisions(s);
    assert.equal(s.age, firstAge + 1);
    act(s, 'activity', { id: `path_${route}_practice` });
    clearDecisions(s);
    act(s, 'activity', { id: `path_${route}_submit` });
    assert.notEqual(s.pending?.id, `path_${route}_opportunity`, 'The result does not arrive in the submission year');
    const saved = copy(s), reloaded = E.migrate(copy(s));
    assert.deepEqual(reloaded.lifePaths, saved.lifePaths);
    assert.equal(reloaded.money, saved.money); assert.equal(reloaded.rng, saved.rng);
    clearDecisions(reloaded); act(reloaded, 'age');
    assert.equal(reloaded.pending?.id, `path_${route}_opportunity`, 'The delayed branch survives a reload');
    const again = E.migrate(copy(reloaded));
    assert.deepEqual(again.pending, reloaded.pending);
    assert.deepEqual(again.lifePaths, reloaded.lifePaths);
  }
});

test('synthetic activity rejection: zero remaining time is atomic, including path state and RNG', () => {
  for (const route of ['academic', 'athletics', 'music']) {
    const s = prepared(route);
    s.year.energy = 0;
    const before = snapshot(s);
    assert.equal(E.act(s, 'activity', { id: `path_${route}_practice` }).ok, false);
    assert.equal(snapshot(s), before);
  }
});

test('synthetic route alternative: no cash, equipment or time never blocks the free route branch', () => {
  for (const route of ['academic', 'athletics', 'music']) {
    const s = opportunity(route), before = copy(s);
    s.money = 0; s.inventory = []; s.year.energy = 0;
    const poor = snapshot(s);
    assert.equal(E.act(s, 'choice', { index: 0 }).ok, false, 'The equipment-dependent first offer is unavailable');
    assert.equal(snapshot(s), poor, 'Rejected offer cannot spend or progress');
    choose(s, c => c.effects?.pathCommand?.result === 'alternative');
    assert.equal(s.lifePaths.routes[route].firstResult, 'alternative');
    assert.equal(s.money, 0); assert.equal(s.year.energy, 0);
    assert.equal(s.lifePaths.routes[route].dueAge, before.age + 1);
    assert.equal(s.lifePaths.routes[route].stage, 'specialization');
    const loaded = E.migrate(copy(s));
    advanceTo(loaded, `path_${route}_specialization`);
    choose(loaded, c => ['teaching', 'coaching', 'writing'].includes(c.effects?.pathCommand?.branch));
    assert.equal(loaded.lifePaths.routes[route].stage, 'development');
  }
});

test('synthetic route time cost: focused checkpoint rejection is atomic and its free slower plan remains available', () => {
  const s = opportunity('academic');
  choose(s, c => c.effects?.pathCommand?.result === 'alternative');
  advanceTo(s, 'path_academic_specialization');
  choose(s, c => c.effects?.pathCommand?.branch === 'teaching');
  act(s, 'activity', { id: 'path_academic_develop' });
  advanceTo(s, 'path_academic_checkpoint');
  s.year.energy = 1;
  const before = snapshot(s);
  assert.equal(E.act(s, 'choice', { index: 0 }).ok, false);
  assert.equal(snapshot(s), before);
  choose(s, c => c.effects?.pathCommand?.tempo === 'balanced');
  assert.equal(s.year.energy, 1);
  assert.equal(s.lifePaths.routes.academic.tempo, 'balanced');
  assert.equal(s.lifePaths.routes.academic.developmentYears.length, 1);
  assert.notEqual(E.actionReason(s, 'path_academic_launch'), '');
});

test('synthetic insufficient funds: required-equipment purchase cannot alter the pending route or its resources', () => {
  const s = copy(natural('academic').state);
  const route = s.lifePaths.routes.academic;
  route.stage = 'finale'; route.dueAge = s.age; route.outcome = null; route.completedAge = null;
  s.inventory = s.inventory.filter(item => item.id !== 'laptop');
  s.pending = { id: 'path_academic_finale', npcId: route.npcId };
  s.money = 0;
  const before = snapshot(s);
  assert.equal(E.act(s, 'choice', { index: 0 }).ok, false, 'A research job still needs the required laptop');
  assert.equal(snapshot(s), before);
  // Defer through the actual event before shopping. Buying is intentionally
  // unavailable while any event is pending, so it cannot bypass the decision.
  choose(s, c => c.effects?.pathCommand?.type === 'defer');
  const shopping = snapshot(s);
  assert.match(E.buyReason(s, 'laptop'), /₺/);
  assert.equal(E.act(s, 'buy', { id: 'laptop' }).ok, false);
  assert.equal(snapshot(s), shopping, 'Insufficient cash cannot consume cash, RNG, time or the deferred chapter');
  const loaded = E.migrate(copy(s));
  advanceTo(loaded, 'path_academic_finale');
  choose(loaded, c => c.effects?.pathCommand?.outcome === 'community');
  assert.equal(loaded.lifePaths.routes.academic.stage, 'completed');
  assert.equal(loaded.lifePaths.routes.academic.outcome, 'community');
});

for (const route of Object.keys(ROUTES)) {
  test(`natural progression: ${route} reaches a distinct adult outcome from birth without injected resources`, () => {
    const result = natural(route), s = result.state, record = s.lifePaths.routes[route];
    assert.equal(result.initial.age, 0); assert.equal(result.initial.year.used[`path_${route}_start`], undefined);
    assert.equal(result.trace.filter(t => t.type === 'age').length, s.age, 'Every age must be advanced by an actual engine action');
    assert.equal(s.alive, true); assert.equal(record.stage, 'completed'); assert.equal(record.outcome, 'professional');
    assert.ok(record.completedAge >= 19 && record.completedAge <= 32);
    assert.ok(record.practiceYears.length >= 2);
    assert.equal(new Set(record.practiceYears).size, record.practiceYears.length);
    assert.ok(record.developmentYears.length >= 2);
    assert.equal(new Set(record.developmentYears).size, record.developmentYears.length);
    const practices = result.trace.filter(t => t.id === `path_${route}_practice`);
    assert.deepEqual(practices.map(t => t.age), record.practiceYears);
    assert.ok(result.trace.some(t => t.type === 'apply' && t.id === 'cashier'), 'Adult bills are supported by a real job application');
    assert.equal(s.job?.id, ROUTES[route].career, 'The earned route turns into its own job, not only a badge');
    assert.ok(result.trace.some(t => t.type === 'apply' && t.id === ROUTES[route].career));
    assert.ok(result.trace.some(t => t.type === 'activity' && t.id === ROUTES[route].careerAction));
    assert.ok(result.trace.some(t => t.type === 'choice' && t.pending?.startsWith('career_')), 'The career has its own playable decisions');
    assert.ok(result.trace.some(t => t.type === 'buy'), 'Useful equipment comes from paid shopping');
    for (const decision of result.trace.filter(t => t.pending === `path_${route}_opportunity` && t.type === 'choice')) {
      const submission = result.trace.filter(t => t.id === `path_${route}_submit` && t.age < decision.age).at(-1);
      assert.ok(submission && decision.age >= submission.age + 1, 'Opportunity results are delayed across a real year boundary');
    }
    for (const other of Object.keys(ROUTES).filter(id => id !== route)) assert.equal(s.lifePaths.routes[other].stage, 'idle');
    for (const year of result.years) {
      assert.ok(Number.isFinite(year.cash) && Number.isFinite(year.debt) && year.cash >= 0 && year.debt >= 0);
      assert.ok(year.health > 0);
    }
    const restored = E.migrate(copy(s));
    assert.deepEqual(restored.lifePaths, s.lifePaths);
    assert.equal(restored.money, s.money); assert.equal(restored.rng, s.rng);
  });
}

test('natural histories: music setbacks require new preparation while research and sport tell different lives', () => {
  const results = Object.keys(ROUTES).map(natural);
  assert.equal(new Set(results.map(r => r.seed)).size, 3);
  assert.equal(new Set(results.map(r => r.state.lifePaths.routes[r.route].branch)).size, 3);
  assert.equal(new Set(results.map(r => r.state.job.id)).size, 3);
  assert.equal(new Set(results.map(r => snapshot(r.state.lifePaths.routes[r.route].history))).size, 3);
  const music = natural('music').state.lifePaths.routes.music;
  assert.ok(music.choices.some(c => c.id === 'first:setback'));
  assert.ok(music.choices.some(c => c.id === 'retry'));
  assert.ok(music.attempts >= 2);
  const attempts = natural('music').trace.filter(t => t.id === 'path_music_submit');
  for (let i = 1; i < attempts.length; i++) {
    assert.ok(music.practiceYears.some(age => age > attempts[i - 1].age && age <= attempts[i].age), 'Every retry needs a new real preparation year');
  }
});

test('natural lower-resource alternative: shared workshops complete the music route without buying equipment', () => {
  const result = simulate('music', 84, 28, { sharedResources: true }), route = result.state.lifePaths.routes.music;
  assert.equal(result.trace.some(t => t.type === 'buy'), false);
  assert.equal(route.stage, 'completed'); assert.equal(route.branch, 'writing');
  assert.equal(route.firstResult, 'alternative'); assert.equal(route.tempo, 'balanced');
  assert.ok(route.developmentYears.length >= 3);
  assert.ok(route.completedAge >= 19 && route.completedAge <= 28);
});

test('natural deterministic replay: the same birth and decisions reproduce the complete route and economy', () => {
  const first = natural('academic'), replay = simulate('academic', first.seed);
  assert.deepEqual(replay.state, first.state);
  assert.deepEqual(replay.trace, first.trace);
});

test('synthetic paid route work: wage-indexed earnings arrive once and annual tax is collected once', () => {
  for (const route of Object.keys(ROUTES)) {
    const s = copy(natural(route).state);
    s.year.energy = s.year.maxEnergy; s.year.taxableIncome = 0; s.year.income = 0;
    s.economy.priceIndex = 2; s.economy.wageIndex = 1.92;
    const id = `path_${route}_work`, a = E.actions.find(action => action.id === id);
    const before = E.budget(s), cashBefore = s.money;
    const expected = Economy.salary(s, a.effects.money);
    assert.equal(E.activityPreview(s, id).effects.money, expected);
    act(s, 'activity', { id });
    assert.equal(s.money, cashBefore + expected);
    assert.equal(s.year.income, expected); assert.equal(s.year.taxableIncome, expected);
    assert.equal(s.lifePaths.routes[route].lastWorkAge, s.age);
    const afterWork = snapshot(s);
    assert.equal(E.act(s, 'activity', { id }).ok, false);
    assert.equal(snapshot(s), afterWork, 'A second work command cannot award a second payment');
    const forecast = E.budget(s);
    assert.equal(forecast.income, before.income, 'The immediate project fee is not paid again as annual income');
    assert.equal(forecast.tax, Economy.tax(s, forecast.salary + expected));
    act(s, 'age');
    assert.equal(s.lastBudget.endingCash, forecast.projectedCash);
    assert.equal(s.lastBudget.tax, forecast.tax);
    assert.equal(s.lastBudget.income, before.income + expected);
    assert.equal(s.year.taxableIncome, 0); assert.equal(E.budget(s).sideIncomeTax, 0);
  }
});

test('synthetic indexed finale: the first paid path assignment uses the labor ledger without replaying its reward', () => {
  for (const route of Object.keys(ROUTES)) {
    // Progress is earned naturally up to age 18; only the economic indexes are
    // controlled here to distinguish wage conversion from consumer prices.
    const s = simulate(route, ROUTES[route].seed, 18).state;
    s.economy.priceIndex = 2; s.economy.wageIndex = 1.92;
    act(s, 'age');
    assert.equal(s.pending?.id, `path_${route}_finale`);
    const event = E.eventById(s.pending.id);
    const index = event.choices.findIndex(c => c.effects?.pathCommand?.outcome === 'professional' && !E.choiceReason(s, c));
    assert.ok(index >= 0, 'The naturally earned equipment and training qualify for the first paid job');
    const expected = Economy.salary(s, event.choices[index].effects.money), cashBefore = s.money;
    const forecastBefore = E.budget(s);
    act(s, 'choice', { index });
    assert.equal(s.money - cashBefore, expected);
    assert.equal(s.year.taxableIncome, expected); assert.equal(s.year.income, expected);
    assert.equal(s.lifePaths.routes[route].stage, 'completed');
    const completed = snapshot(s);
    assert.equal(E.act(s, 'choice', { index }).ok, false);
    assert.equal(snapshot(s), completed);
    const forecast = E.budget(s);
    assert.equal(forecast.income, forecastBefore.income);
    assert.equal(forecast.tax, Economy.tax(s, forecast.salary + expected));
    act(s, 'age');
    assert.equal(s.lastBudget.endingCash, forecast.projectedCash);
    assert.equal(s.lastBudget.tax, forecast.tax);
    assert.equal(s.year.taxableIncome, 0);
  }
});

test('synthetic due queue: two route chapters resolve in the same year without a second salary or premature next chapter', () => {
  const s = prepared('academic');
  s.job = { id: 'cashier', salary: 240000, level: 1, performance: 55, years: 0 };
  s.year.maxEnergy = E.maxEnergy(s); s.year.energy = s.year.maxEnergy - 1;
  act(s, 'activity', { id: 'path_music_start' }); clearDecisions(s);
  for (const route of ['academic', 'music']) act(s, 'activity', { id: `path_${route}_practice` });
  clearDecisions(s); act(s, 'age'); clearDecisions(s);
  for (const route of ['academic', 'music']) {
    act(s, 'activity', { id: `path_${route}_practice` });
    act(s, 'activity', { id: `path_${route}_submit` });
  }
  clearDecisions(s); act(s, 'age');
  assert.equal(s.pending?.id, 'path_academic_opportunity');
  assert.ok(s.lastBudget.salary > 0, 'The finished year contains an actual salary payment to protect from duplication');
  const age = s.age, cash = s.money, debt = s.debt, year = copy(s.year), lastBudget = copy(s.lastBudget), rng = s.rng;
  choose(s, c => c.effects?.pathCommand?.result === 'alternative');
  assert.equal(s.pending?.id, 'path_music_opportunity', 'Another already-due route opens immediately after the first decision');
  assert.equal(s.lifePaths.routes.academic.stage, 'specialization');
  assert.equal(s.lifePaths.routes.academic.dueAge, age + 1, 'The first route schedules its next chapter for a future year');
  choose(s, c => c.effects?.pathCommand?.result === 'alternative');
  assert.equal(s.pending, null, 'Neither newly scheduled next-year chapter may open prematurely');
  assert.equal(s.lifePaths.routes.music.dueAge, age + 1);
  assert.equal(s.age, age); assert.equal(s.money, cash); assert.equal(s.debt, debt);
  assert.equal(s.rng, rng, 'Free deterministic decisions cannot roll a second annual transition');
  assert.deepEqual(s.year, year, 'Resolving both free choices does not reset time or add another salary');
  assert.deepEqual(s.lastBudget, lastBudget);
});

test('synthetic migration recovery: dead companions and repaired chapter guards reopen a valid due path without touching parent bonds', () => {
  for (const problem of ['dead-companion', 'invalid-chapter-guard']) {
    const s = opportunity('academic'), route = s.lifePaths.routes.academic;
    const companion = s.npcs.find(n => n.id === s.pending.npcId);
    assert.ok(companion?.alive, 'A real path companion anchors the starting fixture');
    const parents = E.newLife({ seed: 9713 }).npcs.filter(n => ['mother', 'father'].includes(n.role));
    s.npcs.push(...parents);
    let expectedEvent = 'path_academic_opportunity';
    if (problem === 'dead-companion') companion.alive = false;
    else {
      // A partial save says "finale" but has no chosen branch. Path migration
      // repairs it to specialization; the old finale popup must not remain stuck.
      route.stage = 'finale'; route.branch = null; route.dueAge = s.age;
      s.pending.id = 'path_academic_finale';
      expectedEvent = 'path_academic_specialization';
    }
    const before = { age: s.age, cash: s.money, debt: s.debt, rng: s.rng, year: copy(s.year), lastBudget: copy(s.lastBudget) };
    const restored = E.migrate(copy(s));
    assert.equal(restored.pending?.id, expectedEvent, problem);
    if (problem === 'dead-companion') assert.equal(restored.pending.npcId, undefined, 'A deceased companion is not replaced with a living parent');
    else assert.equal(restored.pending.npcId, companion.id);
    assert.equal(restored.age, before.age); assert.equal(restored.money, before.cash); assert.equal(restored.debt, before.debt);
    assert.equal(restored.rng, before.rng); assert.deepEqual(restored.year, before.year); assert.deepEqual(restored.lastBudget, before.lastBudget);
    const event = E.eventById(restored.pending.id);
    assert.ok(event.choices.some(c => !E.choiceReason(restored, c)), 'The recovered popup has a selectable option');
    const bonds = restored.npcs.filter(n => ['mother', 'father'].includes(n.role)).map(n => ({ id: n.id, bond: n.bond, trust: n.trust }));
    choose(restored, c => problem === 'dead-companion' ? c.effects?.pathCommand?.result === 'alternative' : c.effects?.pathCommand?.branch === 'teaching');
    assert.deepEqual(restored.npcs.filter(n => ['mother', 'father'].includes(n.role)).map(n => ({ id: n.id, bond: n.bond, trust: n.trust })), bonds);
    assert.equal(restored.money, before.cash); assert.equal(restored.age, before.age);
  }
});
