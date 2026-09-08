'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('./engine.js');
const D = require('./content.js');
const P = require('./progression.js');
const clone = value => JSON.parse(JSON.stringify(value));
const mean = list => list.reduce((sum, value) => sum + value, 0) / list.length;
function fresh(age = 25, seed = 421) {
  const s = E.newLife({ name: 'Deniz', gender: 'female', seed });
  s.age = age; s.money = 500000; s.stats.health = 95; s.stats.stress = 5;
  s.year.energy = 8; s.year.maxEnergy = 8;
  return s;
}
function clear(s) {
  for (let i = 0; s.pending && i < 30; i++) {
    const choices = E.eventById(s.pending.id).choices;
    const index = choices.findIndex(c => !E.choiceReason(s, c));
    assert.ok(index >= 0); assert.equal(E.act(s, 'choice', { index }).ok, true);
  }
  assert.equal(s.pending, null);
  if (s.notices.length) E.act(s, 'ackNotice', { ids: s.notices.map(n => n.id) });
}
function partner(s, intelligence, beauty) {
  s.npcs.push({ id: 'test-partner', name: 'Eren', gender: 'male', age: 28, role: 'spouse', bond: 90, trust: 90, health: 95, income: 300000, alive: true, traits: { intelligence, beauty } });
  return s.npcs.at(-1);
}

test('newborn intelligence and beauty directly inherit two seeded parental profiles without maxing at birth', () => {
  for (let seed = 1; seed <= 150; seed++) {
    const s = E.newLife({ seed });
    assert.deepEqual(s, E.newLife({ seed }));
    assert.equal(s.stats.knowledge, s.genetics.inherited.intelligence);
    assert.equal(s.stats.charisma, s.genetics.inherited.beauty);
    assert.deepEqual(s.genetics.parentIds, s.npcs.map(n => n.id));
    for (const [trait, stat] of [['intelligence', 'knowledge'], ['beauty', 'charisma']]) {
      assert.ok(s.stats[stat] >= 15 && s.stats[stat] <= 75);
      const parental = s.npcs.map(n => n.traits[trait]);
      assert.ok(s.stats[stat] >= Math.min(...parental) - 14 || s.stats[stat] === 15);
      assert.ok(s.stats[stat] <= Math.max(...parental) + 14 || s.stats[stat] === 75);
    }
  }
});

test('parental differences shift the population while both children and traits retain variation', () => {
  const births = Array.from({ length: 500 }, (_, i) => E.newLife({ seed: 'family-' + i }));
  for (const [trait, stat] of [['intelligence', 'knowledge'], ['beauty', 'charisma']]) {
    const ordered = births.slice().sort((a, b) => mean(a.npcs.map(n => n.traits[trait])) - mean(b.npcs.map(n => n.traits[trait])));
    assert.ok(mean(ordered.slice(-100).map(s => s.stats[stat])) - mean(ordered.slice(0, 100).map(s => s.stats[stat])) > 17);
    assert.ok(new Set(births.map(s => s.stats[stat])).size > 150);
    assert.ok(births.some(s => s.genetics.inherited.intelligence !== s.genetics.inherited.beauty));
  }
});

test('player children inherit each actual parent, not trained or cosmetically edited player values', () => {
  const low = fresh(), high = fresh();
  low.genetics.inherited = { intelligence: 20, beauty: 20 };
  high.genetics.inherited = { intelligence: 80, beauty: 80 };
  partner(low, 20, 20); partner(high, 80, 80);
  low.stats.knowledge = 100; low.stats.charisma = 100;
  high.stats.knowledge = 1; high.stats.charisma = 1;
  for (const s of [low, high]) assert.equal(E.act(s, 'social', { id: 'test-partner', interaction: 'child' }).ok, true);
  const a = low.npcs.find(n => n.role === 'child'), b = high.npcs.find(n => n.role === 'child');
  for (const trait of ['intelligence', 'beauty']) assert.ok(b.traits[trait] - a.traits[trait] >= 40);
  assert.deepEqual(a.parentIds, ['player', 'test-partner']);
  assert.deepEqual(a.genetics.inherited, a.traits);
  assert.deepEqual(E.migrate(clone(high)).npcs.find(n => n.id === b.id).genetics, b.genetics);
});

test('siblings share the same two parental sources but are not copies of the first child', () => {
  let found = null;
  for (let seed = 1; seed <= 60 && !found; seed++) {
    const s = fresh(0, seed); s.npcs[0].age = 21; s.npcs[1].age = 23;
    for (let age = 1; age <= 16 && !found; age++) {
      clear(s); s.stats.health = 95;
      assert.equal(E.act(s, 'age').ok, true);
      if (s.npcs.some(n => n.role === 'sibling')) found = s;
    }
  }
  assert.ok(found, 'deterministic cohort has a sibling birth');
  const sibling = found.npcs.find(n => n.role === 'sibling');
  assert.deepEqual(sibling.parentIds, found.genetics.parentIds);
  assert.notDeepEqual(sibling.traits, found.genetics.inherited);
  assert.deepEqual(E.migrate(clone(found)).npcs.find(n => n.id === sibling.id).traits, sibling.traits);
});

test('each co-parent independently influences offspring rather than copying one side', () => {
  for (const changedParent of ['player', 'partner']) {
    const low = fresh(), high = fresh();
    for (const s of [low, high]) s.genetics.inherited = { intelligence: 50, beauty: 50 };
    const a = partner(low, 50, 50), b = partner(high, 50, 50);
    if (changedParent === 'player') { low.genetics.inherited = { intelligence: 20, beauty: 20 }; high.genetics.inherited = { intelligence: 80, beauty: 80 }; }
    else { a.traits = { intelligence: 20, beauty: 20 }; b.traits = { intelligence: 80, beauty: 80 }; }
    for (const s of [low, high]) assert.equal(E.act(s, 'social', { id: 'test-partner', interaction: 'child' }).ok, true);
    for (const trait of ['intelligence', 'beauty']) assert.ok(high.npcs.at(-1).traits[trait] - low.npcs.at(-1).traits[trait] >= 23, changedParent + ':' + trait);
  }
});

test('legacy migrations add deterministic family traits without rerolling life RNG, progress or money', () => {
  const old = fresh(); delete old.genetics;
  old.stats.knowledge = 87.4; old.stats.charisma = 76.8; old.rng = 1234567;
  for (const npc of old.npcs) delete npc.traits;
  const a = E.migrate(clone(old)), b = E.migrate(clone(old));
  assert.deepEqual(a, b); assert.deepEqual(a.stats, old.stats);
  assert.equal(a.rng, old.rng); assert.equal(a.money, old.money); assert.equal(a.debt, old.debt);
  assert.equal(a.genetics.source, 'legacy'); assert.equal(a.genetics.birth, null);
  assert.deepEqual(E.migrate(clone(a)), a);
  const stable = JSON.stringify(a); const view = E.genetics(a); view.inherited.beauty = 0;
  assert.equal(JSON.stringify(a), stable, 'overview is read-only and detached');
});

test('old communication careers retain demonstrated experience without taking away beauty', () => {
  const old = fresh(); delete old.genetics; old.job = { id: 'barista', salary: 264000, level: 1, performance: 55, years: 2 };
  old.progression.tracks.social.xp = 0;
  const restored = E.migrate(clone(old));
  assert.equal(restored.job.id, 'barista'); assert.equal(restored.stats.charisma, old.stats.charisma);
  assert.ok(P.tierFor(restored, 'social') >= 1);
});

test('conversation, social activity, creative work and hair editing cannot farm beauty', () => {
  const s = fresh(); const beauty = s.stats.charisma;
  for (const hair of ['long', 'short', 'wave', 'buzz', 'curl']) assert.equal(E.act(s, 'appearance', { key: 'hair', value: hair }).ok, true);
  assert.equal(s.stats.charisma, beauty);
  const xp = s.progression.tracks.social.xp;
  assert.equal(E.act(s, 'social', { id: s.npcs[0].id, interaction: 'talk' }).ok, true);
  assert.equal(E.act(s, 'social', { id: s.npcs[0].id, interaction: 'time' }).ok, true);
  assert.equal(s.stats.charisma, beauty); assert.ok(s.progression.tracks.social.xp > xp);
  assert.equal(E.act(s, 'activity', { id: 'socialize' }).ok, true); clear(s);
  assert.equal(s.stats.charisma, beauty);
  const care = new Set(['personal_care', 'skin_care', 'personal_style']);
  for (const action of D.actions) if (!care.has(action.id)) assert.ok(!action.effects.charisma, action.id);
  for (const job of D.careers) if (job.id !== 'model') assert.ok(!job.requires?.stats?.charisma, job.id);
  for (const event of D.events) for (const choice of event.choices) {
    assert.ok(!choice.effects?.charisma, event.id); assert.notEqual(choice.chance?.stat, 'charisma', event.id);
  }
});

test('care and study remain trainable beyond inherited values but obey diminishing rewards and exact previews', () => {
  const s = fresh(); s.stats.charisma = 70; s.stats.knowledge = 70; s.genetics.inherited.beauty = 20; s.genetics.inherited.intelligence = 20;
  const before = s.stats.charisma; const first = E.activityPreview(s, 'personal_care').effects.charisma;
  assert.ok(first > 0 && first < 1);
  assert.equal(E.act(s, 'activity', { id: 'personal_care' }).ok, true);
  assert.equal(Math.round((s.stats.charisma - before) * 10) / 10, first);
  const second = E.activityPreview(s, 'personal_care').effects.charisma;
  assert.ok(second < first);
  assert.equal(E.act(s, 'activity', { id: 'personal_care' }).ok, true);
  assert.equal(E.act(s, 'activity', { id: 'personal_care' }).ok, false);
  assert.equal(E.act(s, 'buy', { id: 'book' }).ok, true);
  const knowledge = s.stats.knowledge;
  assert.equal(E.act(s, 'activity', { id: 'read' }).ok, true);
  assert.ok(s.stats.knowledge > knowledge && s.stats.knowledge > s.genetics.inherited.intelligence);
});

test('communication event previews match actual independent skill XP and cannot beautify the player', () => {
  const s = fresh(13); s.pending = { id: 'group_project' };
  const event = E.eventById(s.pending.id);
  assert.ok(event);
  const index = event.choices.findIndex(c => c.effects?.skillXP?.social);
  assert.ok(index >= 0);
  const preview = E.effectPreview(s, event.choices[index].effects);
  const before = s.progression.tracks.social.xp, beauty = s.stats.charisma;
  assert.equal(E.act(s, 'choice', { index }).ok, true);
  assert.equal(Math.round((s.progression.tracks.social.xp - before) * 10) / 10, preview.skillXP.social);
  assert.equal(s.stats.charisma, beauty);
  s.progression.tracks.social.xp = 330; assert.equal(E.skillScore(s, 'social'), 52.4);
});
