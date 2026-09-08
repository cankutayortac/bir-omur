'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('./engine.js');
const Data = require('./content.js');

const ROUTES = [
  { path: 'academic', branch: 'research', skill: 'academic', career: 'project_assistant', action: 'research_commission', event: 'career_research_method' },
  { path: 'athletics', branch: 'competition', skill: 'athletics', career: 'club_athlete', action: 'club_preparation', event: 'career_club_selection' },
  { path: 'music', branch: 'stage', skill: 'creative', career: 'session_musician', action: 'studio_session', event: 'career_studio_brief' }
];
const copy = value => JSON.parse(JSON.stringify(value));

// These fixtures isolate career gates and accounting. Natural birth-to-route
// reachability is tested separately by path-integration.test.js.
function fixture(route, employed = false) {
  const s = E.newLife({ seed: 9204, name: 'Meslek yolu' });
  s.age = 25; s.money = 20000; s.debt = 0; s.city = 'Ankara';
  s.pending = null; s.encounters = []; s.notices = []; s.npcs = [];
  s.education.level = 'graduate'; s.education.courseId = null;
  s.stats = { knowledge: 55, strength: 55, charisma: 40, health: 85, happiness: 65, stress: 20 };
  s.inventory = [{ id: 'guitar', condition: 100 }];
  s.progression.tracks[route.skill].xp = 140;
  Object.assign(s.lifePaths.routes[route.path], { stage: 'completed', outcome: 'professional', branch: route.branch, startedAge: 10, completedAge: 24 });
  if (employed) {
    const career = Data.careers.find(c => c.id === route.career);
    s.job = { id: career.id, salary: career.salary, level: 1, performance: 55, years: 1 };
  }
  s.year = { energy: E.maxEnergy(s), maxEnergy: E.maxEnergy(s), used: {}, social: {}, income: 0, expenses: 0, taxableIncome: 0, debtPaid: 0 };
  return s;
}

function succeed(s, type, payload) {
  const result = E.act(s, type, payload);
  assert.equal(result.ok, true, `${type}: ${result.message}`);
  return result;
}

test('three professional paths have distinct, bounded careers and guaranteed job-specific decisions', () => {
  for (const route of ROUTES) {
    const career = Data.careers.find(c => c.id === route.career);
    const action = Data.actions.find(a => a.id === route.action);
    const event = E.eventById(route.event);
    assert.deepEqual(career.requires.path, { id: route.path, stage: 'completed', outcome: 'professional' });
    assert.ok(career.salary >= 300000 && career.salary <= 420000);
    assert.equal(career.minAge, 18); assert.equal(career.requires.skills[route.skill], 2);
    assert.equal(action.requires.job, career.id); assert.equal(action.careerEvent, event.id);
    assert.equal(action.energy, 2); assert.equal(action.perYear, 1); assert.equal(action.minAge, 18);
    assert.equal(action.effects.money, undefined, 'routine work does not also pay the annual salary');
    assert.equal(event.triggeredOnly, true); assert.equal(event.requires.job, career.id); assert.equal(event.minAge, 18);
    assert.ok(event.choices.some(c => !c.cost && !c.energy && !c.requires && !c.chance));
  }
  assert.ok(Data.actions.some(a => a.id === 'school_circle'));
  assert.ok(Data.actions.some(a => a.id === 'work_circle'));
  for (const kind of ['actions', 'careers', 'events']) assert.equal(new Set(Data[kind].map(entry => entry.id)).size, Data[kind].length);
});

test('community or unfinished paths and insufficient expertise cannot unlock professional careers', () => {
  for (const route of ROUTES) {
    const s = fixture(route), record = s.lifePaths.routes[route.path];
    assert.equal(E.careerReason(s, route.career), '');
    const stable = JSON.stringify(s);
    for (let i = 0; i < 4; i++) { E.careerReason(s, route.career); E.requirements(s, Data.careers.find(c => c.id === route.career).requires); }
    assert.equal(JSON.stringify(s), stable, 'looking at gates cannot change RNG or resources');
    record.outcome = 'community'; assert.match(E.careerReason(s, route.career), /mesleki aşamasını/);
    record.outcome = 'professional'; record.stage = 'finale'; assert.match(E.careerReason(s, route.career), /mesleki aşamasını/);
    record.stage = 'completed'; s.progression.tracks[route.skill].xp = 139;
    assert.match(E.careerReason(s, route.career), /2\. uzmanlık basamağı/);
    s.progression.tracks[route.skill].xp = 140; s.age = 17;
    assert.match(E.careerReason(s, route.career), /18 yaşında/);
  }
});

test('real applications keep salary annual and retain career, route and wages on save migration', () => {
  for (const route of ROUTES) {
    const s = fixture(route), money = s.money, income = s.year.income;
    s.rng = 0; succeed(s, 'apply', { id: route.career });
    assert.equal(s.job.id, route.career); assert.equal(s.money, money); assert.equal(s.year.income, income);
    const restored = E.migrate(copy(s));
    assert.deepEqual(restored.job, s.job);
    assert.equal(restored.lifePaths.routes[route.path].outcome, 'professional');
    assert.equal(restored.lifePaths.routes[route.path].stage, 'completed');
    assert.equal(restored.money, money); assert.equal(restored.rng, s.rng);
    assert.ok(E.budget(restored).income > 0);
  }
});

test('work requires the correct job and usable equipment before spending time or money', () => {
  for (const route of ROUTES) {
    const s = fixture(route);
    assert.match(E.actionReason(s, route.action), /meslek/);
    const before = JSON.stringify(s);
    assert.equal(E.act(s, 'activity', { id: route.action }).ok, false);
    assert.equal(JSON.stringify(s), before);
    s.job = { id: 'cashier', salary: 240000, performance: 55, level: 1, years: 1 };
    assert.match(E.actionReason(s, route.action), /meslek/);
  }
  const musician = fixture(ROUTES[2], true); musician.inventory[0].condition = 0;
  assert.match(E.actionReason(musician, 'studio_session'), /gitar gerekli/);
  const athlete = fixture(ROUTES[1], true); athlete.stats.health = 34;
  assert.match(E.actionReason(athlete, 'club_preparation'), /Sağlık: en az 35/);
});

test('each work activity opens its decision once, preserves it on reload, and has an affordable zero-time exit', () => {
  for (const route of ROUTES) {
    const s = fixture(route, true); s.money = 0; s.year.energy = 2;
    const before = JSON.stringify(s), preview = E.activityPreview(s, route.action);
    assert.equal(JSON.stringify(s), before);
    succeed(s, 'activity', { id: route.action });
    assert.equal(s.pending.id, route.event); assert.equal(s.year.energy, 0);
    assert.equal(s.job.performance, 55 + preview.effects.performance);
    assert.equal(s.money, 0); assert.equal(s.year.income, 0); assert.equal(s.year.taxableIncome, 0);
    const stable = JSON.stringify(s);
    assert.equal(E.act(s, 'age').ok, false); assert.equal(E.act(s, 'activity', { id: route.action }).ok, false);
    assert.equal(JSON.stringify(s), stable, 'pending decision blocks duplicate work without mutation');
    const restored = E.migrate(copy(s));
    assert.deepEqual(restored.pending, s.pending);
    const choices = E.eventById(route.event).choices;
    assert.match(E.choiceReason(restored, choices[0]), /zaman puanı/);
    assert.match(E.choiceReason(restored, choices[1]), /gerekiyor/);
    assert.equal(E.choiceReason(restored, choices[2]), '');
    assert.ok(choices[2].effects.performance <= 2, 'the free safe exit gives only modest work progress');
    succeed(restored, 'choice', { index: 2 });
    assert.equal(restored.pending, null); assert.equal(restored.year.energy, 0); assert.equal(restored.money, 0);
    restored.year.energy = 2;
    assert.match(E.actionReason(restored, route.action), /yıllık sınıra/);
    const settled = JSON.stringify(restored);
    assert.equal(E.act(restored, 'choice', { index: 2 }).ok, false);
    assert.equal(JSON.stringify(restored), settled);
  }
});

test('career decision support costs follow the price index and charge exactly once', () => {
  for (const route of ROUTES) {
    const s = fixture(route, true); s.economy.priceIndex = 1.5;
    succeed(s, 'activity', { id: route.action });
    const choice = E.eventById(route.event).choices[1], price = E.costOf(s, choice);
    s.money = price - 1;
    const blocked = JSON.stringify(s);
    assert.equal(E.act(s, 'choice', { index: 1 }).ok, false);
    assert.equal(JSON.stringify(s), blocked);
    s.money = price;
    const performance = s.job.performance, energy = s.year.energy;
    const before = JSON.stringify(s), preview = E.effectPreview(s, choice.effects);
    assert.equal(JSON.stringify(s), before);
    succeed(s, 'choice', { index: 1 });
    assert.equal(s.money, 0); assert.equal(s.debt, 0); assert.equal(s.year.expenses, price);
    assert.equal(s.year.energy, energy); assert.equal(s.job.performance - performance, preview.performance);
  }
});

test('the studio side fee is small, taxable, wage-indexed and cannot be farmed repeatedly', () => {
  const s = fixture(ROUTES[2], true); s.economy.wageIndex = 1.2; s.economy.priceIndex = 1.5;
  succeed(s, 'activity', { id: 'studio_session' });
  const beforeMoney = s.money, beforeEnergy = s.year.energy, beforeHealth = s.stats.health, beforeStress = s.stats.stress;
  const choice = E.eventById(s.pending.id).choices[3];
  assert.equal(choice.effects.taxable, true);
  assert.equal(E.effectPreview(s, choice.effects).money, 3000);
  succeed(s, 'choice', { index: 3 });
  assert.equal(s.money - beforeMoney, 3000); assert.equal(s.year.income, 3000); assert.equal(s.year.taxableIncome, 3000);
  assert.equal(s.year.energy, beforeEnergy); assert.ok(s.stats.health < beforeHealth); assert.ok(s.stats.stress > beforeStress);
  assert.equal(s.job.salary, 360000, 'side fee does not alter the annual salary');
  assert.equal(E.act(s, 'choice', { index: 3 }).ok, false);
  assert.match(E.actionReason(s, 'studio_session'), /yıllık sınıra/);
});

test('overexertion has a genuine injury branch and falsified research can create disclosed debt', () => {
  for (const [rng, injured] of [[0, false], [1000, true]]) {
    const s = fixture(ROUTES[1], true);
    succeed(s, 'activity', { id: 'club_preparation' }); s.rng = rng;
    const performance = s.job.performance;
    const result = succeed(s, 'choice', { index: 3 });
    assert.equal(s.conditions.some(c => c.id === 'injury'), injured);
    assert.equal(s.job.performance - performance, injured ? -10 : 10);
    if (injured) assert.match(result.message, /sakatlık/);
  }
  const research = fixture(ROUTES[0], true); research.money = 0; research.economy.priceIndex = 1.5;
  succeed(research, 'activity', { id: 'research_commission' }); research.rng = 1000;
  const result = succeed(research, 'choice', { index: 3 });
  assert.equal(research.money, 0); assert.equal(research.debt, 3000); assert.equal(research.year.expenses, 3000);
  assert.match(result.message, /borca eklenir/);
});
