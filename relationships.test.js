'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('./relationships.js');

function world(age = 20, fields = {}) {
  const s = { age, alive: true, money: 50000, year: { energy: 6 }, stats: { happiness: 60 }, flags: {}, seenEvents: {}, npcs: [] };
  const n = { id: 'person-7', name: 'Deniz', role: 'friend', age: age + 1, alive: true, income: 350000, bond: 60, trust: 55, ...fields };
  s.npcs.push(n); R.initNpc(s, n);
  return { s, n };
}

test('Trust is distinct from closeness, with conservative legacy defaults', () => {
  const { s, n } = world(20, { role: 'acquaintance', bond: 99, trust: undefined });
  assert.ok(n.trust < 50);
  assert.notEqual(n.bond, n.trust);
  const legacy = { id: 'mom', role: 'mother', bond: 95, alive: true };
  R.migrateNpc(s, legacy); assert.equal(legacy.trust, 54);
});

test('Promises cost no implicit resources, become due next year, and cannot be fulfilled early', () => {
  const { s, n } = world();
  const money = s.money, energy = s.year.energy, stats = JSON.stringify(s.stats);
  assert.equal(R.socialReason(s, n, 'promise'), '');
  R.social(s, n, 'promise');
  assert.equal(n.promise.dueAge, 21); assert.equal(n.promise.status, 'active');
  assert.match(R.socialReason(s, n, 'promise'), /zaten/);
  R.social(s, n, 'time'); assert.equal(n.promise.status, 'active');
  assert.equal(s.money, money); assert.equal(s.year.energy, energy); assert.equal(JSON.stringify(s.stats), stats);
  s.age = 21;
  assert.equal(R.annual(s).length, 1); assert.equal(n.promise.status, 'active');
  assert.equal(R.annual(s).length, 0);
  const trust = n.trust;
  R.social(s, n, 'time'); assert.equal(n.promise.status, 'kept'); assert.equal(n.trust, trust + 5);
  R.social(s, n, 'time'); assert.equal(n.trust, trust + 5);
  s.age = 22; assert.equal(R.annual(s).length, 0); assert.equal(n.promise.status, 'kept');
});

test('A promise is missed only after the entire due year has passed, and fails once', () => {
  const { s, n } = world(); R.social(s, n, 'promise');
  s.age = 21; R.annual(s); assert.equal(n.promise.status, 'active');
  const trust = n.trust;
  s.age = 22; const notices = R.annual(s);
  assert.equal(n.promise.status, 'broken'); assert.equal(n.trust, trust - 10);
  assert.equal(notices.length, 1); assert.equal(notices[0].npcId, n.id);
  assert.equal(R.annual(s).length, 0); assert.equal(n.trust, trust - 10);
  R.social(s, n, 'time'); assert.equal(n.promise.status, 'broken');
});

test('Dead NPCs cancel promises without blame and never receive new interactions or events', () => {
  const { s, n } = world(); R.social(s, n, 'promise');
  n.alive = false; s.age = 22; const trust = n.trust;
  assert.deepEqual(R.annual(s), []); assert.equal(n.promise.status, 'cancelled'); assert.equal(n.trust, trust);
  const snapshot = JSON.stringify(n);
  R.social(s, n, 'time'); R.applyEffects(s, n, { memory: { kind: 'support', trust: 5 }, promise: 'fulfill', friendship: true, romance: 'accept' });
  assert.equal(JSON.stringify(n), snapshot); assert.equal(R.candidate(s), null);
  assert.equal(R.introduction(s, n), null); assert.equal(R.romanticEvent(s, n), null);
});

test('Absence alone never drains trust; promises remain optional', () => {
  const { s, n } = world(); const trust = n.trust;
  for (let age = 21; age < 90; age++) { s.age = age; assert.deepEqual(R.annual(s), []); }
  assert.equal(n.trust, trust); assert.equal(n.memories.length, 0);
});

test('Apology only repairs a real wound once, cannot be farmed, and does not erase history', () => {
  const { s, n } = world(); const initial = n.trust;
  const untouched = JSON.stringify(n);
  assert.ok(R.socialReason(s, n, 'apologize')); R.social(s, n, 'apologize'); assert.equal(JSON.stringify(n), untouched);
  R.social(s, n, 'argue'); assert.equal(n.trust, initial - 9);
  assert.equal(R.socialReason(s, n, 'apologize'), '');
  R.social(s, n, 'apologize'); assert.equal(n.trust, initial - 5);
  assert.ok(n.memories.some(m => m.kind === 'argument' && m.resolved));
  assert.ok(R.socialReason(s, n, 'apologize'));
  s.age++;
  const repaired = n.trust; R.social(s, n, 'apologize'); assert.equal(n.trust, repaired);
  R.social(s, n, 'argue'); R.social(s, n, 'apologize'); assert.ok(n.trust < repaired);
});

test('Gifts cannot buy trust; aid, marriage and parenthood require reliability', () => {
  const { s, n } = world(25, { trust: 30 }); const initial = n.trust;
  R.social(s, n, 'gift'); assert.equal(n.trust, initial);
  assert.match(R.socialReason(s, n, 'ask'), /50 güven/);
  assert.match(R.socialReason(s, n, 'date'), /40 güven/);
  assert.match(R.socialReason(s, n, 'marry'), /65 güven/);
  assert.match(R.socialReason(s, n, 'child'), /60 güven/);
  n.trust = 70;
  assert.equal(R.socialReason(s, n, 'ask'), ''); assert.equal(R.socialReason(s, n, 'marry'), '');
});

test('Read-only reason, overview and event selection APIs do not mutate saves', () => {
  const { s, n } = world(); R.social(s, n, 'promise'); s.age++;
  const before = JSON.stringify(s);
  R.socialReason(s, n, 'ask'); R.overview(s, n); R.candidate(s); R.introduction(s, n); R.romanticEvent(s, n);
  assert.equal(JSON.stringify(s), before);
});

test('Memory ids stay stable across saves, remain unique, and bounded memory survives long lives', () => {
  const { s, n } = world();
  for (let age = 20; age < 95; age++) { s.age = age; R.social(s, n, 'talk'); R.social(s, n, 'time'); R.social(s, n, 'gift'); }
  assert.equal(n.memories.length, 12); assert.equal(new Set(n.memories.map(m => m.id)).size, 12);
  const saved = JSON.parse(JSON.stringify(s));
  R.migrateNpc(saved, saved.npcs[0]); assert.deepEqual(saved, s);
  saved.age++; R.social(saved, saved.npcs[0], 'talk');
  assert.equal(new Set(saved.npcs[0].memories.map(m => m.id)).size, 12);
  assert.ok(n.trust >= 0 && n.trust <= 100);
});

test('Malformed relationship saves are sanitized without dropping a legitimate pending NPC event', () => {
  const { s, n } = world();
  n.trust = Infinity; n.memories = [null, { id: 'same', age: NaN, kind: 'argument', trustDelta: -999, hurt: 999 }, { id: 'same', text: 'duplicate' }];
  n.promise = { id: 'prom', madeAge: 20, dueAge: -55, status: 'active' };
  n.relationshipHistory = { memorySerial: Infinity, socialUsed: ['hacked', 'time', 'time'], eventSeen: { memory_promise_due: 19, invented: 10 } };
  s.pending = { id: 'memory_promise_due', npcId: n.id };
  R.migrateNpc(s, n);
  assert.ok(Number.isFinite(n.trust)); assert.equal(n.memories.length, 1); assert.equal(n.memories[0].hurt, 20);
  assert.equal(n.promise.dueAge, 21); assert.deepEqual(n.relationshipHistory.socialUsed, ['time']);
  assert.equal(n.relationshipHistory.eventSeen.invented, undefined);
  assert.ok(R.events.some(e => e.id === s.pending.id)); assert.equal(s.pending.npcId, n.id);
});

test('Contextual candidates bind the exact NPC, persist before resolution, and honor cooldown after choices', () => {
  const { s, n } = world();
  const other = { ...n, id: 'person-8', memories: [], relationshipHistory: undefined, promise: null }; R.initNpc(s, other); s.npcs.push(other);
  R.social(s, other, 'promise'); s.age++; R.annual(s);
  const pending = R.candidate(s);
  assert.deepEqual(pending, { id: 'memory_promise_due', npcId: other.id });
  assert.deepEqual(R.candidate(s), pending);
  const event = R.events.find(e => e.id === pending.id);
  R.applyEffects(s, other, event.choices[1].effects);
  assert.equal(R.candidate(s), null);
  assert.equal(other.promise.status, 'active');
  assert.equal(n.memories.length, 0);
});

test('References are contextual, bounded in time and give no money or stat gains', () => {
  const { s, n } = world(25, { trust: 74, bond: 75 });
  R.social(s, n, 'time'); s.age++; R.social(s, n, 'time'); s.age += 3;
  const pending = R.candidate(s); assert.equal(pending.id, 'memory_career_referral');
  const c = R.events.find(e => e.id === pending.id).choices[0];
  assert.equal(c.energy, 1); const money = s.money, stats = JSON.stringify(s.stats);
  R.applyEffects(s, n, c.effects);
  assert.deepEqual(s.flags.careerReferral, { npcId: n.id, age: s.age, expiresAge: s.age + 3, consumed: false });
  assert.equal(s.money, money); assert.equal(JSON.stringify(s.stats), stats);
  s.age += 4; R.annual(s); assert.equal(s.flags.careerReferral, undefined);
});

test('Every contextual event has a free fallback; positive consequential options declare time or money', () => {
  assert.equal(R.events.length, 13);
  assert.equal(new Set(R.events.map(e => e.id)).size, R.events.length);
  for (const e of R.events) {
    assert.equal(e.triggeredOnly, true, e.id);
    assert.ok(e.choices.some(c => !c.cost && !c.energy && !c.requires), e.id);
    for (const c of e.choices) {
      assert.equal(c.effects.relationshipEvent, e.id);
      if (c.effects.memory?.trust > 0 || c.effects.memory?.repair || c.effects.referral || c.effects.promise === 'fulfill') assert.ok(c.energy || c.cost, e.id + ' declares investment');
    }
  }
});

test('Encounter friendship is an explicit player choice; declining is neutral', () => {
  const { s, n } = world(20, { role: 'acquaintance', trust: 28, bond: 35, contextRole: 'colleague' });
  const encounter = R.introduction(s, n); assert.equal(encounter.id, 'relationship_meet_adult'); assert.equal(n.role, 'acquaintance');
  const e = R.events.find(e => e.id === encounter.id);
  R.applyEffects(s, n, e.choices[1].effects); assert.equal(n.role, 'acquaintance'); assert.equal(n.bond, 35); assert.equal(n.trust, 28);
  R.applyEffects(s, n, e.choices[0].effects); assert.equal(n.role, 'friend'); assert.equal(n.trust, 29);
  assert.equal(R.introduction(s, n), null);
  const copy = JSON.stringify(n); R.applyEffects(s, n, { friendship: true }); assert.equal(JSON.stringify(n), copy);
});

test('Introductions are age-appropriate, and mentors preserve their protective role', () => {
  for (const [age, id] of [[5, 'relationship_meet_child'], [13, 'relationship_meet_teen'], [18, 'relationship_meet_adult']]) {
    const { s, n } = world(age, { role: 'acquaintance' }); assert.equal(R.introduction(s, n).id, id);
  }
  const { s, n } = world(20, { role: 'acquaintance', contextRole: 'mentor', trust: 80 });
  R.applyEffects(s, n, { friendship: true }); assert.equal(n.role, 'mentor'); assert.equal(n.mentorProtected, true);
  assert.equal(R.romanticEvent(s, n), null);
});

test('Romance is opt-in, mutual, adult-only and excludes every family or protected mentor role', () => {
  const { s, n } = world(25, { trust: 70 });
  const e = R.romanticEvent(s, n); assert.equal(e.id, 'relationship_romantic_invitation'); assert.equal(n.role, 'friend');
  R.applyEffects(s, n, { romance: 'decline' }); assert.equal(n.role, 'friend'); assert.equal(n.trust, 70);
  R.applyEffects(s, n, { romance: 'accept' }); assert.equal(n.role, 'partner'); assert.equal(n.partnerSince, 25);
  for (const role of ['mother', 'father', 'child', 'sibling', 'brother', 'sister', 'mentor']) {
    const w = world(25, { role, trust: 90 }); const prior = w.n.role;
    assert.equal(R.romanticEvent(w.s, w.n), null, role); R.applyEffects(w.s, w.n, { romance: 'accept' }); assert.equal(w.n.role, prior);
  }
  const child = world(17, { age: 19, trust: 70 }); assert.equal(R.romanticEvent(child.s, child.n), null);
  const adult = world(19, { age: 17, trust: 70 }); assert.equal(R.romanticEvent(adult.s, adult.n), null);
});

test('Romantic acceptance cannot silently replace an existing partner', () => {
  const { s, n } = world(25, { trust: 70 });
  s.npcs.push({ id: 'existing', role: 'partner', alive: true });
  R.applyEffects(s, n, { romance: 'accept' }); assert.equal(n.role, 'friend');
});

test('Existing partnerships cannot be restarted to reset their relationship anniversary', () => {
  const { s, n } = world(28, { role: 'partner', partnerSince: 24, trust: 75 });
  assert.ok(R.socialReason(s, n, 'date')); assert.equal(R.romanticEvent(s, n), null);
  R.applyEffects(s, n, { romance: 'accept' }); assert.equal(n.partnerSince, 24); assert.equal(n.role, 'partner');
});

test('Partner-date stories are contextual, consensual, adult-only and do not force spending', () => {
  const { s, n } = world(28, { role: 'partner', partnerSince: 24, trust: 75, bond: 80 });
  const p = R.candidate(s); assert.equal(p.id, 'memory_partner_date'); assert.equal(p.npcId, n.id);
  const e = R.events.find(e => e.id === p.id);
  assert.ok(e.choices.some(c => !c.cost && !c.energy && !c.requires));
  R.applyEffects(s, n, e.choices[2].effects); assert.equal(n.trust, 75); assert.equal(n.bond, 80);
  assert.notEqual(R.candidate(s)?.id, 'memory_partner_date');
  for (const fields of [{ age: 17 }, { role: 'friend' }, { contextRole: 'sibling' }, { mentorProtected: true }]) {
    const w = world(28, { role: 'partner', trust: 75, bond: 80, ...fields });
    assert.notEqual(R.candidate(w.s)?.id, 'memory_partner_date');
  }
  const teen = world(17, { role: 'partner', age: 19, trust: 75, bond: 80 });
  assert.notEqual(R.candidate(teen.s)?.id, 'memory_partner_date');
});
