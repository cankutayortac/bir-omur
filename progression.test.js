const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('./progression.js');
const D = require('./content.js');

function state(overrides = {}) {
  return { age: 24, alive: true, stats: { knowledge: 35, strength: 35, charisma: 35, health: 100, stress: 0 }, year: { used: {} }, education: {}, flags: {}, ...overrides, progression: P.create() };
}

test('all positive core-stat sources share a bounded diminishing curve', () => {
  const s = state();
  const gains = [20, 45, 65, 85, 96].map(value => { s.stats.knowledge = value; return P.adjust(s, 'knowledge', 8); });
  assert.deepEqual(gains.map(n => Math.round(n * 10) / 10), [4, 2.4, 1, .3, .1]);
  for (let i = 1; i < gains.length; i++) assert.ok(gains[i] < gains[i - 1]);
  s.stats.knowledge = 79.9;
  assert.ok(P.adjust(s, 'knowledge', 100, { source: 'item' }) < 5);
  s.stats.knowledge = 99.9;
  assert.ok(P.adjust(s, 'knowledge', 10000) <= .101);
  s.stats.knowledge = 100;
  assert.equal(P.adjust(s, 'knowledge', 10000), 0);
  for (const source of ['activity', 'event', 'education', 'item', 'social']) {
    assert.equal(P.adjust(s, 'knowledge', -7, { source }), -7);
    assert.equal(P.adjust(s, 'health', 8, { source }), 8);
    assert.equal(P.adjust(s, 'stress', -12, { source }), -12);
  }
});

test('childhood has gradual soft ceilings without resetting existing high stats', () => {
  const child = state({ age: 5 });
  const adult = state({ age: 24 });
  child.stats.knowledge = adult.stats.knowledge = 30;
  assert.ok(P.adjust(child, 'knowledge', 10) < P.adjust(adult, 'knowledge', 10) / 3);
  child.stats.knowledge = 92;
  const snapshot = structuredClone(child.stats);
  P.adjust(child, 'knowledge', 20);
  P.migrate(child, undefined);
  assert.deepEqual(child.stats, snapshot);
});

test('same-year repeats reduce training and XP while poor health and stress lower efficiency', () => {
  const action = D.actions.find(action => action.id === 'read');
  const s = state();
  const first = P.preview(s, action);
  s.year.used.read = 1;
  const repeated = P.preview(s, action);
  assert.ok(repeated.effects.knowledge < first.effects.knowledge);
  assert.ok(repeated.xp.academic < first.xp.academic);
  s.year.used.read = 0;
  s.stats.health = 30; s.stats.stress = 85;
  const exhausted = P.preview(s, action);
  assert.ok(exhausted.effects.knowledge < first.effects.knowledge);
  assert.ok(exhausted.xp.academic < first.xp.academic);
  assert.equal(exhausted.effects.stress, action.effects.stress);
});

test('preview is pure and its captured XP matches application despite changed health and counters', () => {
  const s = state();
  s.stats.knowledge = 84.9; s.stats.health = 50; s.stats.stress = 70; s.year.used.read = 1;
  const action = D.actions.find(action => action.id === 'read');
  const before = structuredClone(s);
  const preview = P.preview(s, action);
  assert.deepEqual(s, before);
  assert.equal(preview.effects.knowledge, P.adjust(s, 'knowledge', action.effects.knowledge, { source: 'activity', actionId: action.id, repeat: 1 }));
  s.stats.health = 100; s.stats.stress = 0; s.year.used.read++;
  P.activity(s, action, { repeat: 1, preview });
  assert.equal(s.progression.tracks.academic.xp, preview.xp.academic);
  assert.deepEqual(s.progression.practice.read, { count: 1, lastAge: 24 });
});

test('skill tiers announce once, show exact next goal, and unlock existing content', () => {
  const s = state();
  const action = D.actions.find(action => action.id === 'read');
  const notices = P.activity(s, action, { preview: { xp: { academic: 145 } } });
  assert.equal(P.tierFor(s, 'academic'), 2);
  assert.equal(notices.length, 2);
  assert.equal(P.activity(s, action, { preview: { xp: { academic: 1 } } }).length, 0);
  const track = P.overview(s).find(track => track.id === 'academic');
  assert.equal(track.nextXP, 330);
  assert.equal(track.xp, 146);
  assert.match(track.goal, /184 XP/);
  assert.ok(track.unlocks.some(unlock => unlock.id === 'publish_project' && unlock.tier === 3));
  P.activity(s, action, { preview: { xp: { academic: 100000 } } });
  assert.equal(P.overview(s)[0].nextXP, null);
  assert.equal(P.overview(s)[0].progress, 100);
  assert.equal(s.progression.tracks.academic.xp, 1200);
});

test('migration validates progression and credits documented old careers without touching stats', () => {
  const s = state({ job: { id: 'doctor' }, education: { degrees: ['medicine'] } });
  s.stats.knowledge = 99;
  s.progression = P.migrate(s, undefined);
  assert.equal(P.tierFor(s, 'academic'), 3);
  assert.equal(s.stats.knowledge, 99);
  const migrated = P.migrate(s, { tracks: { academic: { xp: Infinity }, athletics: { xp: -100 }, social: { xp: 50000 } }, milestones: ['bad', 'skill-social-4', 'skill-social-4'], practice: { read: { count: Infinity, lastAge: -9 }, unrecognized: { count: 50 } } });
  assert.equal(migrated.tracks.academic.xp, 0);
  assert.equal(migrated.tracks.athletics.xp, 0);
  assert.equal(migrated.tracks.social.xp, 1200);
  assert.equal(migrated.practice.read.count, 0);
  assert.equal(migrated.practice.read.lastAge, 0);
  assert.equal(migrated.practice.unrecognized, undefined);
  assert.equal(migrated.milestones.filter(id => id === 'skill-social-4').length, 1);
});

test('education and work award relevant permanent experience, death awards nothing', () => {
  const s = state({ age: 17 });
  P.annual(s);
  assert.equal(s.progression.tracks.academic.xp, 4);
  s.age = 18; s.education.courseId = 'design';
  P.annual(s);
  assert.equal(s.progression.tracks.creative.xp, 12);
  s.education.courseId = null; s.job = { id: 'designer' };
  P.annual(s);
  assert.equal(s.progression.tracks.creative.xp, 18);
  s.alive = false;
  const before = structuredClone(s.progression);
  assert.deepEqual(P.annual(s), []);
  assert.deepEqual(s.progression, before);
});

test('project routes and career skill requirements refer to attainable skill tiers and real gear', () => {
  const tracks = new Set(P.tracks.map(track => track.id));
  const items = new Set(D.items.map(item => item.id));
  const projects = D.actions.filter(action => action.project);
  assert.equal(projects.length, 8);
  assert.equal(new Set(projects.map(action => action.project.flag)).size, 8);
  for (const entry of [...D.actions, ...D.careers, ...D.courses]) {
    for (const [id, xp] of Object.entries(entry.skillXP || {})) { assert.ok(tracks.has(id)); assert.ok(xp > 0 && xp <= 40); }
    for (const [id, tier] of Object.entries(entry.requires?.skills || {})) { assert.ok(tracks.has(id)); assert.ok(tier > 0 && tier <= 5); }
    for (const id of entry.requires?.items || []) assert.ok(items.has(id));
  }
  for (const course of D.courses) assert.ok(course.minGrade >= 35 && course.minGrade <= 78);
  for (const track of P.tracks) assert.equal(projects.filter(action => action.requires.skills[track.id]).length, 2);
});

test('variable economic amounts stay out of prose and labor receipts are distinct from aid and loans', () => {
  assert.doesNotMatch(JSON.stringify(D), /₺\s*\d/);
  const debtEvent = D.events.find(event => event.id === 'debt_pressure');
  assert.equal(debtEvent.choices.find(choice => choice.effects.money > 0).effects.taxable, true);
  const loanEvent = D.events.find(event => event.id === 'friend_business_result');
  assert.ok(loanEvent);
  for (const choice of loanEvent.choices) {
    assert.notEqual(choice.chance?.success?.effects?.taxable, true);
    assert.notEqual(choice.chance?.failure?.effects?.taxable, true);
  }
  const prep = D.actions.find(action => action.id === 'exam_preparation');
  assert.equal(prep.minAge, 18);
  assert.equal(prep.requires.school, false);
  assert.ok(prep.effects.grade > 0 && prep.energy >= 2);
});

test('sustained focused learning improves into adulthood instead of maxing in childhood', () => {
  const s = state({ age: 0 });
  s.stats.knowledge = 12; s.stats.health = 90; s.stats.stress = 20;
  let teenKnowledge;
  for (let age = 0; age < 50; age++) {
    s.age = age;
    for (let session = 0; session < 5; session++) s.stats.knowledge = Math.round((s.stats.knowledge + P.adjust(s, 'knowledge', 3.6)) * 10) / 10;
    if (age === 17) teenKnowledge = s.stats.knowledge;
  }
  assert.ok(teenKnowledge > 40 && teenKnowledge < 65, `age18=${teenKnowledge}`);
  assert.ok(s.stats.knowledge > 80 && s.stats.knowledge < 95, `age50=${s.stats.knowledge}`);
});
