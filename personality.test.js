'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('./relationships.js');
const clone = x => JSON.parse(JSON.stringify(x));
const INITIATIVES = ['initiative_study_invitation', 'initiative_shared_plan', 'initiative_mentor_encouragement'];

function world(personality = 'Sıcakkanlı', overrides = {}, age = 20) {
  const s = { seed: 2147, rng: 7654321, age, alive: true, money: 50000, debt: 1200,
    stats: { health: 85, happiness: 70, knowledge: 40, charisma: 40 }, year: { energy: 6 },
    flags: {}, seenEvents: {}, education: { courseId: null }, npcs: [] };
  const n = { id: 'person-8', name: 'Deniz', personality, role: 'friend', age: age + 1,
    alive: true, bond: 60, trust: 55, income: 300000, traits: { intelligence: 54.2, beauty: 49.7 }, ...overrides };
  s.npcs.push(n); R.initNpc(s, n); return { s, n };
}
function invitationWorld(interest, mentor = false) {
  for (let id = 1; id < 20; id++) {
    const w = world('Duyarlı', { id: 'inviter-' + id, interest, role: mentor ? 'teacher' : 'acquaintance',
      contextRole: mentor ? 'teacher' : 'classmate', age: mentor ? 35 : 14, trust: 48, bond: 50 }, 14);
    w.n.personalityResponse.introducedAge = 10;
    const pending = R.candidate(w.s);
    if (pending && INITIATIVES.includes(pending.id)) return { ...w, pending };
  }
  throw new Error('deterministic invitation cohort did not produce a candidate');
}

test('interests and response profiles persist deterministically without consuming RNG or changing prior memories', () => {
  const { s, n } = world(); R.social(s, n, 'talk');
  delete n.interest; delete n.personalityResponse;
  const original = clone(s), a = clone(s), b = clone(s);
  R.migrateNpc(a, a.npcs[0]); R.migrateNpc(b, b.npcs[0]);
  assert.deepEqual(a, b); assert.deepEqual(a.npcs[0].memories, original.npcs[0].memories);
  assert.deepEqual(a.npcs[0].traits, original.npcs[0].traits);
  for (const key of ['rng', 'money', 'debt', 'stats', 'year']) assert.deepEqual(a[key], original[key]);
  assert.deepEqual(a.npcs[0].relationshipHistory, original.npcs[0].relationshipHistory);
  const saved = clone(a); R.migrateNpc(a, a.npcs[0]); assert.deepEqual(a, saved);
  const choices = new Set();
  for (let i = 0; i < 40; i++) choices.add(world('Duyarlı', { id: 'interest-' + i }).n.interest);
  assert.equal(choices.size, 4);
  const assigned = world('Duyarlı', { interest: 'music' }); assert.equal(assigned.n.interest, 'music');
});

test('all six personalities produce distinct responses with a modest half-point yearly preference budget', () => {
  const messages = new Set();
  const gains = {};
  for (const personality of ['Sıcakkanlı', 'İçe dönük', 'Hırslı', 'Duyarlı', 'Maceracı', 'Disiplinli']) {
    const { s, n } = world(personality), before = n.trust;
    const talk = R.social(s, n, 'talk'); messages.add(talk.message); gains[personality] = talk.trustDelta;
    const repeat = JSON.stringify(n); R.social(s, n, 'talk'); assert.equal(JSON.stringify(n), repeat);
    R.social(s, n, 'time');
    assert.equal(n.trust - before, 3.5); assert.equal(n.personalityResponse.bonusUsed, .5);
    const steady = JSON.stringify(n); R.social(s, n, 'time'); assert.equal(JSON.stringify(n), steady);
    s.age++; R.social(s, n, 'talk'); R.social(s, n, 'time'); assert.equal(n.trust - before, 7);
    assert.equal(n.personalityResponse.bonusYear, s.age);
  }
  assert.equal(messages.size, 6); assert.equal(gains['Sıcakkanlı'], 1.5); assert.equal(gains['İçe dönük'], 1); assert.equal(gains['Hırslı'], 1.25);
});

test('personality changes no gift, promise or apology guarantees and never depends on beauty or gender', () => {
  for (const personality of ['Sıcakkanlı', 'İçe dönük', 'Hırslı', 'Duyarlı', 'Maceracı', 'Disiplinli']) {
    const { s, n } = world(personality), initial = n.trust;
    R.social(s, n, 'gift'); assert.equal(n.trust, initial);
    R.social(s, n, 'argue'); assert.equal(n.trust, initial - 9);
    R.social(s, n, 'apologize'); assert.equal(n.trust, initial - 5);
    R.social(s, n, 'promise'); s.age++; R.annual(s);
    const before = n.trust; R.social(s, n, 'time'); assert.equal(n.trust, before + 5);
    assert.equal(n.promise.status, 'kept');
  }
  const a = world('İçe dönük', { gender: 'female', traits: { beauty: 1, intelligence: 1 } });
  const b = world('İçe dönük', { gender: 'male', traits: { beauty: 100, intelligence: 100 } });
  assert.deepEqual(R.social(a.s, a.n, 'time'), R.social(b.s, b.n, 'time'));
  const full = world('Sıcakkanlı', { trust: 100 }); const reply = R.social(full.s, full.n, 'talk');
  assert.equal(reply.trustDelta, 0); assert.ok(!reply.message.includes('güven +'));
});

test('overview and invitation selection are read-only even before profile migration', () => {
  const { s, n } = world('Maceracı'); delete n.interest; delete n.personalityResponse;
  const before = JSON.stringify(s);
  const view = R.overview(s, n); R.candidate(s); R.socialReason(s, n, 'talk');
  assert.equal(view.personality, 'Maceracı'); assert.ok(view.interest.id); assert.ok(view.interest.name); assert.ok(view.responseHint);
  view.interest.name = 'changed';
  assert.equal(JSON.stringify(s), before);
});

test('peer initiatives depend on interests, respect age groups and do not silently create friendship', () => {
  for (const interest of ['academic', 'athletics', 'music', 'community']) {
    const { s, n, pending } = invitationWorld(interest);
    assert.equal(pending.id, interest === 'academic' ? 'initiative_study_invitation' : 'initiative_shared_plan');
    assert.equal(pending.npcId, n.id); assert.equal(n.role, 'acquaintance');
    const event = R.events.find(e => e.id === pending.id), before = { trust: n.trust, bond: n.bond, role: n.role };
    assert.equal(event.choices[0].energy, 1); assert.ok(!event.choices[0].effects.friendship); assert.ok(!event.choices[0].effects.romance);
    const declined = clone(s); R.applyEffects(declined, declined.npcs[0], event.choices[1].effects);
    assert.deepEqual({ trust: declined.npcs[0].trust, bond: declined.npcs[0].bond, role: declined.npcs[0].role }, before);
    R.applyEffects(s, n, event.choices[0].effects); assert.equal(n.role, 'acquaintance'); assert.equal(n.trust, before.trust + 2);
  }
  for (const fields of [{ age: 30 }, { age: 3 }, { role: 'sibling' }, { role: 'mother' }, { alive: false }]) {
    const { s, n } = invitationWorld('academic'); Object.assign(n, fields);
    assert.ok(!INITIATIVES.includes(R.candidate(s)?.id));
  }
});

test('teacher encouragement remains protected mentoring and requires explicit time through the real engine', () => {
  const E = require('./engine.js');
  const w = invitationWorld('academic', true); assert.equal(w.pending.id, 'initiative_mentor_encouragement');
  assert.equal(w.n.mentorProtected, true); assert.equal(R.romanticEvent(w.s, w.n), null);
  const s = E.newLife({ seed: 41 }); s.age = 14; s.npcs.push(clone(w.n)); s.pending = w.pending;
  s.year.energy = 0;
  const original = JSON.stringify(s);
  assert.equal(E.act(s, 'choice', { index: 0 }).ok, false); assert.equal(JSON.stringify(s), original);
  const trust = s.npcs.at(-1).trust;
  assert.equal(E.act(s, 'choice', { index: 1 }).ok, true); assert.equal(s.year.energy, 0); assert.equal(s.npcs.at(-1).trust, trust);
  const accepted = E.newLife({ seed: 41 }); accepted.age = 14; accepted.npcs.push(clone(w.n)); accepted.pending = w.pending;
  accepted.year.energy = 4; const xp = accepted.progression.tracks.academic.xp;
  assert.equal(E.act(accepted, 'choice', { index: 0 }).ok, true); assert.equal(accepted.year.energy, 3);
  assert.ok(accepted.progression.tracks.academic.xp > xp); assert.equal(accepted.npcs.at(-1).role, 'teacher');
});

test('all initiative types share a cooldown and a declined invitation cannot become yearly pressure', () => {
  const { s, n, pending } = invitationWorld('academic');
  const other = clone(n); other.id = 'other-inviter'; other.interest = 'music'; s.npcs.push(other);
  const event = R.events.find(e => e.id === pending.id); R.applyEffects(s, n, event.choices[1].effects);
  const trust = n.trust, startAge = s.age;
  for (let age = startAge; age < startAge + 3; age++) {
    s.age = age; n.age = age; other.age = age;
    assert.ok(!INITIATIVES.includes(R.candidate(s)?.id));
    R.annual(s); assert.equal(n.trust, trust);
  }
  const saved = clone(s); R.migrateNpc(saved, saved.npcs[0]);
  assert.deepEqual(saved.npcs[0].relationshipHistory.eventSeen, n.relationshipHistory.eventSeen);
  let returned = false;
  for (let age = startAge + 4; age <= startAge + 9; age++) {
    s.age = age; n.age = age; other.age = age;
    if (INITIATIVES.includes(R.candidate(s)?.id)) returned = true;
  }
  assert.equal(returned, true, 'cooldown is bounded rather than permanent exclusion');
});

test('urgent promises still outrank encouragement and invitations', () => {
  const { s, n } = invitationWorld('academic');
  n.promise = { id: 'promise', madeAge: s.age - 1, dueAge: s.age, status: 'active' };
  assert.equal(R.candidate(s).id, 'memory_promise_due');
});
