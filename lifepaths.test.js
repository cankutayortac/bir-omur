const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const P = require('./lifepaths.js');

function state(age = 10) {
  return { age, alive: true, stats: { knowledge: 60, strength: 60, health: 80, happiness: 70, stress: 10 },
    inventory: ['book', 'shoes', 'guitar', 'laptop'].map(id => ({ id, condition: 100 })),
    npcs: [{ id: 'peer-1', name: 'Deniz', alive: true }], lifePaths: P.create() };
}
function action(id, type) { return P.actions.find(a => a.id === `path_${id}_${type}`); }
function perform(s, id, type) {
  const a = action(id, type); assert.ok(a, `${id}/${type} action exists`);
  assert.equal(P.actionReason(s, a), '', `${id}/${type}: ${P.actionReason(s, a)}`);
  return P.applyEffects(s, a.effects);
}
function choose(s, id, stage, index) {
  const e = P.events.find(e => e.id === `path_${id}_${stage}`), c = e.choices[index];
  assert.equal(P.choiceReason(s, c), '', `${e.id}/${index}: ${P.choiceReason(s, c)}`);
  return P.applyEffects(s, c.effects);
}
function due(s, id, stage) {
  s.age = s.lifePaths.routes[id].dueAge;
  assert.equal(P.candidate(s)?.id, `path_${id}_${stage}`);
}
function enterDevelopment(s, id, branch = 0) {
  perform(s, id, 'start'); perform(s, id, 'practice');
  s.age++; perform(s, id, 'practice'); perform(s, id, 'submit');
  due(s, id, 'opportunity'); choose(s, id, 'opportunity', 1);
  due(s, id, 'specialization'); choose(s, id, 'specialization', branch);
}
function readyForFinale(s, id, { branch = 0, focused = true } = {}) {
  enterDevelopment(s, id, branch);
  perform(s, id, 'develop');
  due(s, id, 'checkpoint'); choose(s, id, 'checkpoint', focused ? 0 : 1);
  perform(s, id, 'develop');
  if (!focused) { s.age++; perform(s, id, 'develop'); }
  s.age = Math.max(s.age, 18); perform(s, id, 'launch');
  due(s, id, 'finale');
}

test('module loads without dependencies in an offline browser context', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(require.resolve('./lifepaths.js'), 'utf8'), context);
  assert.equal(context.LifePaths.actions.length, 18);
  assert.equal(context.LifePaths.events.length, 15);
});

test('new lives have three independent, unstarted paths and no inherited choices', () => {
  const a = P.create(), b = P.create();
  assert.deepEqual(Object.keys(a.routes), ['academic', 'athletics', 'music']);
  a.routes.academic.history.push({ age: 10, text: 'Bir deneme' });
  assert.equal(b.routes.academic.history.length, 0);
  assert.equal(a.pinned, null);
});

test('every event is triggered-only and includes an unconditional money/time fallback', () => {
  const ids = new Set();
  for (const e of P.events) {
    assert.ok(!ids.has(e.id)); ids.add(e.id);
    assert.equal(e.triggeredOnly, true);
    assert.ok(e.choices.some(c => !c.requires && !c.energy && !c.cost && !c.pathGuard.branch), e.id);
    for (const c of e.choices) {
      if (c.effects?.money > 0) assert.equal(c.effects.taxable, true, `${e.id} labor income must be taxable`);
      assert.ok(c.pathGuard, `${e.id} has a stale-chapter guard`);
    }
  }
});

test('route actions carry bounded XP/time and only actual enrollment is marked pathStart', () => {
  for (const a of P.actions) {
    assert.ok(a.energy >= 1 && a.energy <= 2);
    assert.equal(a.perYear, 1);
    assert.equal(Boolean(a.pathStart), a.id.endsWith('_start'));
    assert.ok(Object.values(a.skillXP || {}).reduce((sum, xp) => sum + xp, 0) <= 14);
    if (a.effects.money) { assert.equal(a.effects.taxable, true); assert.ok(a.effects.money <= 4500); }
  }
});

test('birth cannot start a path, adults can start all three without a school enrollment', () => {
  const child = state(0), adult = state(47); adult.education = { degree: null };
  for (const id of ['academic', 'athletics', 'music']) {
    assert.match(P.actionReason(child, action(id, 'start')), /yaşında/);
    assert.equal(P.actionReason(adult, action(id, 'start')), '');
  }
});

test('first submission needs practice in two different years, and repeated clicks do not count', () => {
  const s = state(); perform(s, 'academic', 'start'); perform(s, 'academic', 'practice');
  assert.match(P.actionReason(s, action('academic', 'practice')), /Bu yıl/);
  assert.match(P.actionReason(s, action('academic', 'submit')), /1\/2/);
  P.applyEffects(s, action('academic', 'practice').effects);
  assert.deepEqual(s.lifePaths.routes.academic.practiceYears, [10]);
  s.age++; perform(s, 'academic', 'practice'); perform(s, 'academic', 'submit');
  assert.equal(P.candidate(s), null);
  const earlyChoice = P.events.find(e => e.id === 'path_academic_opportunity').choices[1];
  assert.match(P.choiceReason(s, earlyChoice), /12 yaşında/);
  assert.deepEqual(P.applyEffects(s, earlyChoice.effects), []);
  due(s, 'academic', 'opportunity');
});

test('setbacks preserve old effort, require a new practice year for retry and cannot skip chapters', () => {
  const s = state(); perform(s, 'academic', 'start'); perform(s, 'academic', 'practice');
  s.age++; perform(s, 'academic', 'practice'); perform(s, 'academic', 'submit');
  due(s, 'academic', 'opportunity');
  const e = P.events.find(e => e.id === 'path_academic_opportunity');
  P.applyEffects(s, e.choices[0].chance.failure.effects);
  assert.equal(s.lifePaths.routes.academic.stage, 'setback');
  due(s, 'academic', 'setback'); choose(s, 'academic', 'setback', 0);
  assert.match(P.actionReason(s, action('academic', 'submit')), /son başvurundan/);
  perform(s, 'academic', 'practice'); perform(s, 'academic', 'submit');
  assert.equal(s.lifePaths.routes.academic.attempts, 2);
  assert.equal(s.lifePaths.routes.academic.practiceYears.length, 3);
});

test('a setback also has a no-retry alternative leading to a genuine branch choice', () => {
  const s = state(16); perform(s, 'music', 'start'); perform(s, 'music', 'practice');
  s.age++; perform(s, 'music', 'practice'); perform(s, 'music', 'submit');
  due(s, 'music', 'opportunity');
  P.applyEffects(s, P.events.find(e => e.id === 'path_music_opportunity').choices[0].chance.failure.effects);
  due(s, 'music', 'setback'); choose(s, 'music', 'setback', 1);
  due(s, 'music', 'specialization'); choose(s, 'music', 'specialization', 1);
  assert.equal(s.lifePaths.routes.music.branch, 'writing');
});

test('success and community alternatives have different persisted histories', () => {
  const success = state(), alternative = state();
  for (const s of [success, alternative]) {
    perform(s, 'academic', 'start'); perform(s, 'academic', 'practice');
    s.age++; perform(s, 'academic', 'practice'); perform(s, 'academic', 'submit'); due(s, 'academic', 'opportunity');
  }
  P.applyEffects(success, P.events.find(e => e.id === 'path_academic_opportunity').choices[0].chance.success.effects);
  choose(alternative, 'academic', 'opportunity', 1);
  assert.equal(success.lifePaths.routes.academic.firstResult, 'success');
  assert.equal(alternative.lifePaths.routes.academic.firstResult, 'alternative');
  assert.notDeepEqual(success.lifePaths.routes.academic.history, alternative.lifePaths.routes.academic.history);
});

test('specializations lock the other professional conclusion, not the fallback choices', () => {
  const s = state(30); readyForFinale(s, 'academic', { branch: 1 });
  const choices = P.events.find(e => e.id === 'path_academic_finale').choices;
  assert.match(P.choiceReason(s, choices[0]), /Araştırma dalına/);
  for (const index of [1, 2, 3]) assert.equal(P.choiceReason(s, choices[index]), '');
  assert.equal(P.overview(s)[0].branchLabel, 'Bilim anlatıcılığı');
});

test('a focused commitment uses two years while the no-cost balanced plan needs three', () => {
  for (const focused of [false, true]) {
    const s = state(24); enterDevelopment(s, 'athletics');
    perform(s, 'athletics', 'develop');
    assert.match(P.actionReason(s, action('athletics', 'develop')), /ara değerlendirmeyi/);
    due(s, 'athletics', 'checkpoint'); choose(s, 'athletics', 'checkpoint', focused ? 0 : 1);
    perform(s, 'athletics', 'develop');
    if (focused) assert.equal(P.actionReason(s, action('athletics', 'launch')), '');
    else {
      assert.match(P.actionReason(s, action('athletics', 'launch')), /3 farklı.*2\/3/);
      assert.match(P.actionReason(s, action('athletics', 'develop')), /Bu yıl/);
      s.age++; perform(s, 'athletics', 'develop');
      assert.equal(P.actionReason(s, action('athletics', 'launch')), '');
    }
  }
});

test('early training cannot jump directly to paid childhood work', () => {
  const s = state(8); enterDevelopment(s, 'athletics');
  perform(s, 'athletics', 'develop'); due(s, 'athletics', 'checkpoint');
  choose(s, 'athletics', 'checkpoint', 0); perform(s, 'athletics', 'develop');
  assert.ok(s.age < 18);
  assert.match(P.actionReason(s, action('athletics', 'launch')), /18 yaşında/);
  assert.equal(P.overview(s).find(p => p.id === 'athletics').nextAge, 18);
  assert.match(P.actionReason(s, action('athletics', 'work')), /Önce/);
});

test('all three late-start paths reach a paid conclusion only after multiple years', () => {
  for (const id of ['academic', 'athletics', 'music']) {
    const s = state(45); readyForFinale(s, id, { branch: 1 });
    assert.ok(s.age >= 50);
    choose(s, id, 'finale', 1);
    assert.equal(s.lifePaths.routes[id].stage, 'completed');
    assert.equal(s.lifePaths.routes[id].outcome, 'professional');
    const view = P.overview(s).find(p => p.id === id);
    assert.equal(view.completed, true); assert.equal(view.actionId, `path_${id}_work`);
    assert.equal(view.outcomeLabel, 'İlk ücretli iş');
    assert.ok(view.history.length >= 8);
  }
});

test('paid follow-up work remains time-limited and equipment-sensitive after completion', () => {
  const s = state(30); readyForFinale(s, 'music'); choose(s, 'music', 'finale', 0);
  s.inventory.find(i => i.id === 'guitar').condition = 0;
  assert.match(P.actionReason(s, action('music', 'work')), /kullanılabilir gitar/);
  s.inventory.find(i => i.id === 'guitar').condition = 100;
  perform(s, 'music', 'work');
  assert.match(P.actionReason(s, action('music', 'work')), /Bu yıl/);
  s.age++; assert.equal(P.actionReason(s, action('music', 'work')), '');
});

test('community conclusion is valid with no equipment and does not quietly grant a paid career', () => {
  const s = state(18); readyForFinale(s, 'academic', { branch: 1 }); s.inventory = [];
  choose(s, 'academic', 'finale', 3);
  assert.equal(s.lifePaths.routes.academic.outcome, 'community');
  assert.deepEqual(P.overview(s)[0].actionIds, []);
  assert.match(P.actionReason(s, action('academic', 'work')), /ücretli/);
  assert.equal(s.job, undefined); assert.equal(s.education, undefined);
});

test('an unaffordable finale can be deferred without losing development or re-paying enrollment', () => {
  const s = state(30); readyForFinale(s, 'music', { branch: 1 });
  const before = structuredClone(s.lifePaths.routes.music.developmentYears), oldAge = s.age;
  choose(s, 'music', 'finale', 2);
  assert.equal(s.lifePaths.routes.music.stage, 'finale');
  assert.equal(s.lifePaths.routes.music.dueAge, oldAge + 1);
  assert.equal(P.candidate(s), null);
  assert.deepEqual(s.lifePaths.routes.music.developmentYears, before);
  s.age++; choose(s, 'music', 'finale', 1);
});

test('read APIs are pure and deterministically prioritize oldest due chapters, then pinned ties', () => {
  const s = state(30);
  for (const id of ['academic', 'athletics', 'music']) {
    perform(s, id, 'start'); perform(s, id, 'practice');
  }
  s.age++;
  for (const id of ['academic', 'athletics', 'music']) { perform(s, id, 'practice'); perform(s, id, 'submit'); }
  s.age++; P.pin(s, 'music');
  const before = JSON.stringify(s);
  for (let i = 0; i < 5; i++) { assert.equal(P.candidate(s).id, 'path_music_opportunity'); P.overview(s); }
  assert.equal(JSON.stringify(s), before);
  s.lifePaths.routes.academic.dueAge--;
  assert.equal(P.candidate(s).id, 'path_academic_opportunity');
});

test('overview points to submission or launch when ready while keeping practice controls visible', () => {
  const s = state(22); perform(s, 'academic', 'start'); perform(s, 'academic', 'practice');
  s.age++; perform(s, 'academic', 'practice');
  let view = P.overview(s)[0];
  assert.equal(view.actionId, 'path_academic_submit');
  assert.deepEqual(view.actionIds, ['path_academic_practice', 'path_academic_submit']);
  const another = state(22); readyForFinale(another, 'academic');
  another.lifePaths.routes.academic.stage = 'development'; another.lifePaths.routes.academic.dueAge = null;
  view = P.overview(another)[0];
  assert.equal(view.actionId, 'path_academic_launch');
  view.history[0].text = 'outside mutation';
  assert.notEqual(another.lifePaths.routes.academic.history[0].text, 'outside mutation');
});

test('bound recurring NPC survives reload, death does not block the chapter', () => {
  const s = state(20); perform(s, 'academic', 'start');
  assert.equal(P.bindNpc(s, 'academic', 'missing'), false);
  assert.equal(P.bindNpc(s, 'academic', 'peer-1'), true);
  perform(s, 'academic', 'practice'); s.age++; perform(s, 'academic', 'practice'); perform(s, 'academic', 'submit');
  due(s, 'academic', 'opportunity');
  s.lifePaths = P.migrate(s, structuredClone(s.lifePaths));
  assert.equal(P.candidate(s).npcId, 'peer-1');
  s.npcs[0].alive = false;
  assert.deepEqual(P.candidate(s), { id: 'path_academic_opportunity' });
  assert.equal(s.lifePaths.routes.academic.npcId, 'peer-1');
});

test('migration sanitizes corrupt data without RNG, old stat loss or arbitrary route rewards', () => {
  const s = state(40), initialStats = structuredClone(s.stats);
  const old = P.create(); old.pinned = 'not-a-route';
  old.routes.academic = { stage: 'finale', startedAge: 20, branch: '__proto__', dueAge: 'bad',
    practiceYears: [21, 21, 23, -5, 999, 'broken'], developmentYears: null, history: [{ age: 22, text: 'Korunan anı' }, null], choices: [{ age: 22, id: 'branch:research' }] };
  const snapshot = JSON.stringify(old), result = P.migrate(s, old);
  assert.equal(JSON.stringify(old), snapshot);
  assert.deepEqual(s.stats, initialStats);
  assert.equal(result.pinned, null); assert.equal(result.routes.academic.stage, 'specialization');
  assert.equal(result.routes.academic.dueAge, 40);
  assert.deepEqual(result.routes.academic.practiceYears, [21, 23]);
  assert.equal(result.routes.academic.history[0].text, 'Korunan anı');
  assert.equal(result.routes.music.stage, 'idle');
  assert.deepEqual(P.migrate(s, undefined), P.create());
});

test('valid in-flight and completed saves round-trip exactly through migration', () => {
  for (const id of ['academic', 'athletics', 'music']) {
    const s = state(35); readyForFinale(s, id, { branch: 1, focused: false });
    const before = JSON.stringify(s.lifePaths);
    assert.equal(JSON.stringify(P.migrate(s, s.lifePaths)), before);
    choose(s, id, 'finale', 1);
    assert.deepEqual(P.migrate(s, s.lifePaths), s.lifePaths);
  }
});

test('migration cannot preserve impossible childhood enrollment or a paid childhood conclusion', () => {
  const s = state(15), corrupt = P.create();
  corrupt.routes.academic = { ...corrupt.routes.academic, stage: 'preparation', startedAge: 0, practiceYears: [0, 6, 10, 11] };
  corrupt.routes.music = { ...corrupt.routes.music, stage: 'completed', startedAge: 0, branch: 'writing', outcome: 'professional', completedAge: 14 };
  corrupt.routes.athletics = { ...corrupt.routes.athletics, stage: 'finale', startedAge: 8, branch: 'coaching', dueAge: 12 };
  const migrated = P.migrate(s, corrupt);
  assert.equal(migrated.routes.academic.startedAge, 10);
  assert.deepEqual(migrated.routes.academic.practiceYears, [10, 11]);
  assert.equal(migrated.routes.music.stage, 'development');
  assert.equal(migrated.routes.music.outcome, null);
  assert.equal(migrated.routes.athletics.dueAge, 18);
  assert.equal(P.migrate(state(2), corrupt).routes.academic.stage, 'idle');
});

test('malformed choice guards are rejected without throwing or changing state', () => {
  const s = state(25), before = JSON.stringify(s);
  for (const pathGuard of [{}, { id: 'missing', stage: 'idle' }, { id: 'music', stage: 'wrong' }, 'bad']) {
    assert.ok(P.choiceReason(s, { pathGuard }));
  }
  assert.equal(JSON.stringify(s), before);
  assert.equal(P.choiceReason(s, {}), '');
});

test('stale choices, malformed commands and invalid pins cannot rewind a route', () => {
  const s = state(25); enterDevelopment(s, 'music', 1);
  const before = JSON.stringify(s.lifePaths);
  assert.match(P.choiceReason(s, P.events.find(e => e.id === 'path_music_specialization').choices[0]), /artık/);
  for (const c of [{ id: 'music', type: 'branch', branch: 'stage' }, { id: 'unknown', type: 'start' }, { id: 'music', type: 'teleport' }]) assert.deepEqual(P.applyEffects(s, { pathCommand: c }), []);
  assert.equal(P.pin(s, 'unknown'), false);
  assert.equal(JSON.stringify(s.lifePaths), before);
  assert.equal(P.pin(s, null), true);
  assert.equal(s.lifePaths.pinned, null);
});

test('only meaningful chapter changes return milestones; practice and duplicate starts do not spam', () => {
  const s = state(22);
  assert.equal(perform(s, 'academic', 'start').length, 1);
  assert.deepEqual(P.applyEffects(s, action('academic', 'start').effects), []);
  assert.deepEqual(perform(s, 'academic', 'practice'), []);
  s.age++; perform(s, 'academic', 'practice'); perform(s, 'academic', 'submit');
  due(s, 'academic', 'opportunity');
  assert.equal(choose(s, 'academic', 'opportunity', 1).length, 1);
  const record = s.lifePaths.routes.academic;
  record.history = Array.from({ length: 45 }, (_, i) => ({ age: i, text: 'Anı ' + i }));
  due(s, 'academic', 'specialization'); choose(s, 'academic', 'specialization', 1);
  assert.equal(record.history.length, 40);
});
