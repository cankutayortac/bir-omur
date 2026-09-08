'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('./engine.js');

function fresh(age = 14) {
  const s = E.newLife({ seed: 310, name: 'Önizleme' });
  s.age = age; s.money = 100000; s.stats.health = 95; s.stats.stress = 5;
  s.year.energy = 8; s.year.maxEnergy = 8;
  return s;
}

test('study preview reports the real remaining school gain, including zero at the ceiling', () => {
  for (const grade of [96, 99, 100]) {
    const s = fresh(); s.education.grade = grade;
    const stable = JSON.stringify(s), preview = E.activityPreview(s, 'study');
    assert.equal(JSON.stringify(s), stable, 'preview does not mutate the save or RNG');
    assert.equal(preview.effects.grade, Math.min(5, 100 - grade));
    assert.equal(E.act(s, 'activity', { id: 'study' }).ok, true);
    assert.equal(s.education.grade - grade, preview.effects.grade);
  }
});

test('working activity preview clamps job performance at its actual ceiling', () => {
  for (const performance of [90, 98, 100]) {
    const s = fresh(30);
    s.job = { id: 'cashier', salary: 240000, performance, level: 1, years: 2 };
    const stable = JSON.stringify(s), preview = E.activityPreview(s, 'overtime');
    assert.equal(JSON.stringify(s), stable);
    assert.equal(preview.effects.performance, Math.min(14, 100 - performance));
    assert.equal(E.act(s, 'activity', { id: 'overtime' }).ok, true);
    assert.equal(s.job.performance - performance, preview.effects.performance);
  }
});

test('an unemployed project has no fictional job-performance reward', () => {
  const s = fresh(25); s.stats.knowledge = 80;
  s.progression.tracks.academic.xp = 400;
  s.inventory = [{ id: 'laptop', condition: 100 }]; s.flags.portfolio = true;
  assert.equal(E.actionReason(s, 'publish_project'), '');
  const stable = JSON.stringify(s), preview = E.activityPreview(s, 'publish_project');
  assert.equal(JSON.stringify(s), stable);
  assert.equal(preview.effects.performance, 0);
  assert.equal(E.act(s, 'activity', { id: 'publish_project' }).ok, true);
  assert.equal(s.job, null);
});

test('event performance losses stop at zero and exact previews do not mutate content', () => {
  const s = fresh(30);
  s.job = { id: 'cashier', salary: 240000, performance: 2, level: 1, years: 2 };
  s.pending = { id: 'work_credit' };
  const choice = E.eventById('work_credit').choices[1], original = JSON.stringify(choice);
  const stable = JSON.stringify(s), preview = E.effectPreview(s, choice.effects);
  assert.equal(JSON.stringify(s), stable); assert.equal(JSON.stringify(choice), original);
  assert.equal(preview.performance, -2);
  assert.equal(E.act(s, 'choice', { index: 1 }).ok, true);
  assert.equal(s.job.performance, 0);
  assert.equal(JSON.stringify(choice), original);
});

test('school aliases mirror the real grade precedence without double counting', () => {
  const s = fresh(); s.education.grade = 98;
  const effects = { grade: 4, school: 8, performance: 6, skillXP: { social: 5 } };
  const stable = JSON.stringify(s), original = JSON.stringify(effects);
  const preview = E.effectPreview(s, effects);
  assert.equal(preview.grade, 2); assert.equal(preview.school, undefined);
  assert.equal(preview.performance, 0);
  assert.equal(E.effectPreview(s, { grade: 0, school: 1 }).grade, 1);
  assert.equal(E.effectPreview(s, { school: -150 }).grade, -98);
  assert.equal(JSON.stringify(s), stable); assert.equal(JSON.stringify(effects), original);
});
