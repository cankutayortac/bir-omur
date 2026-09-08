'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('./engine.js');

function fresh(age = 0, seed = 42) {
  const s = E.newLife({ name: 'Hikâye Testi', gender: 'female', seed });
  s.age = age;
  s.money = 100000;
  s.year.energy = E.maxEnergy(s);
  s.year.maxEnergy = s.year.energy;
  return s;
}

function resolveAll(s) {
  let remaining = 30;
  while (s.pending && remaining-- > 0) {
    const e = E.eventById(s.pending.id);
    assert.ok(e, `Event ${s.pending.id} must be retained by the engine`);
    const available = e.choices.map((choice, index) => ({ choice, index })).filter(x => !E.choiceReason(s, x.choice));
    const fallback = available.find(x => !x.choice.cost && !x.choice.energy && !x.choice.requires) || available[0];
    assert.ok(fallback, `Event ${e.id} needs an available choice`);
    assert.equal(E.act(s, 'choice', { index: fallback.index }).ok, true);
  }
  assert.ok(remaining > 0, 'Encounter chains must finish');
}

function encounterFixture(age, action = 'socialize', startSeed = 1) {
  for (let seed = startSeed; seed < startSeed + 200; seed++) {
    const s = fresh(age, seed), originalIds = new Set(s.npcs.map(n => n.id));
    const beforeTime = s.year.energy;
    assert.equal(E.act(s, 'activity', { id: action }).ok, true);
    const n = s.npcs.find(person => !originalIds.has(person.id));
    if (!n) continue;
    assert.equal(n.role, 'acquaintance');
    assert.equal(s.pending?.npcId, n.id);
    assert.ok(E.eventById(s.pending.id));
    assert.equal(s.year.energy, beforeTime - 1);
    return { s, n, seed };
  }
  assert.fail(`No seeded ${action} encounter found`);
}

function choose(s, predicate) {
  const e = E.eventById(s.pending.id), index = e.choices.findIndex(predicate);
  assert.ok(index >= 0, `Expected choice in ${e.id}`);
  const reason = E.choiceReason(s, e.choices[index]);
  assert.equal(reason, '', reason);
  const result = E.act(s, 'choice', { index });
  assert.equal(result.ok, true, result.message);
  return result;
}

function romanceFixture() {
  for (let seed = 1; seed < 100; seed++) {
    const { s, n } = encounterFixture(25, 'socialize', seed);
    choose(s, c => c.effects.friendship);
    n.bond = 85; n.trust = 80;
    const priorRole = n.role;
    assert.equal(E.socialReason(s, n, 'date'), '');
    assert.equal(E.act(s, 'social', { id: n.id, interaction: 'date' }).ok, true);
    assert.equal(n.role, priorRole, 'A successful invitation must not assign partner status');
    if (s.pending?.id === 'relationship_romantic_invitation') return { s, n };
  }
  assert.fail('No successful seeded mutual invitation found');
}

test('School transitions at ages 6, 11, 14 and 18 create saved guidance notices that require acknowledgment', () => {
  for (const [age, topic, level] of [[6, 'school', 'primary'], [11, 'middle', 'middle'], [14, 'high', 'high'], [18, 'graduate', 'graduate']]) {
    const s = fresh(age - 1, 810 + age);
    assert.equal(E.act(s, 'age').ok, true); assert.equal(s.age, age); assert.equal(s.education.level, level);
    const note = s.notices.find(n => n.id === `${topic}:${age}`);
    assert.ok(note, `School guidance at age ${age}`); assert.ok(note.text); assert.ok(note.tip);
    let restored = E.migrate(JSON.parse(JSON.stringify(s)));
    assert.deepEqual(restored.notices.find(n => n.id === note.id), note);
    const pending = JSON.stringify(restored.pending), otherNotes = restored.notices.filter(n => n.id !== note.id);
    assert.equal(E.act(restored, 'ackNotice', { ids: [note.id] }).ok, true);
    assert.deepEqual(restored.notices, otherNotes);
    assert.equal(JSON.stringify(restored.pending), pending, 'Reading guidance does not consume the annual decision');
    restored = E.migrate(JSON.parse(JSON.stringify(restored)));
    assert.ok(!restored.notices.some(n => n.id === note.id), 'Acknowledged notice must stay dismissed');
    assert.ok(restored.milestones.some(m => m.id === topic), 'Acknowledgment does not erase the milestone');
    if (age === 18) assert.ok(restored.notices.some(n => n.id === 'adult:18'), 'Education and adult budget guidance are separate notices');
  }
});

test('Seeded walking and socializing introduce a visible acquaintance before friendship is player-chosen', () => {
  for (const [age, action, eventId] of [[5, 'walk', 'relationship_meet_child'], [15, 'socialize', 'relationship_meet_teen'], [25, 'socialize', 'relationship_meet_adult']]) {
    const { s, n } = encounterFixture(age, action);
    assert.equal(s.pending.id, eventId);
    assert.ok(!s.milestones.some(m => m.id === 'first-friend'));
    const noChoice = JSON.stringify(s);
    assert.equal(E.act(s, 'age').ok, false); assert.equal(JSON.stringify(s), noChoice);
    const restored = E.migrate(JSON.parse(JSON.stringify(s)));
    assert.deepEqual(restored.pending, s.pending);
    const person = restored.npcs.find(p => p.id === n.id), time = restored.year.energy;
    choose(restored, c => c.effects.friendship === true);
    assert.equal(person.role, 'friend'); assert.equal(person.contactStatus, 'accepted');
    assert.equal(restored.year.energy, time, 'The introducing activity already paid the time cost');
    assert.ok(restored.milestones.some(m => m.id === 'first-friend'));
    assert.equal(restored.pending, null);
  }
});

test('Declining a new friendship keeps a neutral acquaintance without silently increasing trust or spending again', () => {
  const { s, n } = encounterFixture(25);
  const bond = n.bond, trust = n.trust, money = s.money, time = s.year.energy;
  choose(s, c => c.effects.declineContact === true);
  assert.equal(n.role, 'acquaintance'); assert.equal(n.contactStatus, 'acquaintance');
  assert.equal(n.bond, bond); assert.equal(n.trust, trust); assert.equal(s.money, money); assert.equal(s.year.energy, time);
  assert.ok(!s.milestones.some(m => m.id === 'first-friend'));
});

test('Dating is an adult two-phase decision; acceptance survives reload and establishes a single anniversary', () => {
  const { s, n } = romanceFixture();
  assert.equal(n.role, 'friend'); assert.ok(n.age >= 18); assert.ok(s.age >= 18);
  const restored = E.migrate(JSON.parse(JSON.stringify(s))), person = restored.npcs.find(p => p.id === n.id);
  assert.deepEqual(restored.pending, s.pending); assert.equal(person.role, 'friend');
  choose(restored, c => c.effects.romance === 'accept');
  assert.equal(person.role, 'partner'); assert.equal(person.partnerSince, restored.age);
  assert.ok(restored.milestones.some(m => m.id === 'love'));
  const unchanged = JSON.stringify(restored);
  assert.equal(E.act(restored, 'social', { id: person.id, interaction: 'date' }).ok, false);
  assert.equal(JSON.stringify(restored), unchanged);
});

test('Mutual attraction does not force romance, and underage/family/mentor approaches are rejected without mutation', () => {
  const { s, n } = romanceFixture();
  const trust = n.trust;
  choose(s, c => c.effects.romance === 'decline');
  assert.equal(n.role, 'friend'); assert.equal(n.trust, trust); assert.ok(!s.milestones.some(m => m.id === 'love'));
  const { s: teen, n: youngFriend } = encounterFixture(17);
  choose(teen, c => c.effects.friendship); youngFriend.bond = 90; youngFriend.trust = 90;
  const teenageSnapshot = JSON.stringify(teen);
  assert.equal(E.act(teen, 'social', { id: youngFriend.id, interaction: 'date' }).ok, false);
  assert.equal(JSON.stringify(teen), teenageSnapshot);
  for (const role of ['mother', 'father', 'child', 'sibling', 'brother', 'sister', 'mentor']) {
    const state = fresh(25), npc = state.npcs[0]; npc.role = role; npc.age = 30; npc.bond = 95; npc.trust = 95;
    const before = JSON.stringify(state);
    assert.equal(E.act(state, 'social', { id: npc.id, interaction: 'date' }).ok, false, role);
    assert.equal(JSON.stringify(state), before, role);
  }
});

test('A seeded sibling birth creates saved family guidance and stays outside romantic paths when grown', () => {
  let found;
  for (let seed = 1; seed <= 300; seed++) {
    const s = fresh(0, seed); assert.equal(E.act(s, 'age').ok, true);
    const sibling = s.npcs.find(n => n.role === 'sibling');
    if (sibling) { found = { s, sibling }; break; }
  }
  assert.ok(found, 'At least one family across deterministic birth seeds has a sibling');
  const { s, sibling } = found;
  assert.equal(sibling.age, 0); assert.equal(sibling.income, 0); assert.ok(sibling.parentId);
  const note = s.notices.find(n => n.id.startsWith(`sibling:${sibling.id}:`));
  assert.ok(note); assert.ok(note.text.includes(sibling.name)); assert.ok(note.tip.includes('İlişkiler'));
  const restored = E.migrate(JSON.parse(JSON.stringify(s))), restoredSibling = restored.npcs.find(n => n.id === sibling.id);
  assert.equal(restoredSibling.role, 'sibling'); assert.deepEqual(restored.notices.find(n => n.id === note.id), note);
  resolveAll(restored); restored.age = 25; restoredSibling.age = 20; restoredSibling.trust = 90; restoredSibling.bond = 95;
  restored.year.energy = 8; restored.year.maxEnergy = 8;
  const before = JSON.stringify(restored);
  assert.equal(E.act(restored, 'social', { id: restoredSibling.id, interaction: 'date' }).ok, false);
  assert.equal(JSON.stringify(restored), before);
});

test('A promise made through real social actions remains active through the whole next year and can then be kept', () => {
  const s = fresh(10), parent = s.npcs[0], trust = parent.trust;
  assert.equal(E.act(s, 'social', { id: parent.id, interaction: 'promise' }).ok, true);
  assert.equal(parent.promise.dueAge, 11); assert.equal(parent.trust, trust);
  assert.equal(E.act(s, 'social', { id: parent.id, interaction: 'time' }).ok, true);
  assert.equal(parent.promise.status, 'active', 'Spending time in the promise-making year is not next year');
  assert.equal(E.act(s, 'age').ok, true); assert.equal(s.age, 11); assert.equal(parent.promise.status, 'active');
  assert.deepEqual(s.pending, { id: 'memory_promise_due', npcId: parent.id });
  assert.ok(s.notices.some(n => n.id === `relationship:${parent.id}:11`));
  const restored = E.migrate(JSON.parse(JSON.stringify(s))), person = restored.npcs.find(n => n.id === parent.id);
  choose(restored, c => !c.energy);
  assert.equal(person.promise.status, 'active');
  const time = restored.year.energy, reliability = person.trust;
  assert.equal(E.act(restored, 'social', { id: person.id, interaction: 'time' }).ok, true);
  assert.equal(person.promise.status, 'kept'); assert.equal(person.trust, reliability + 5); assert.equal(restored.year.energy, time - 1);
  assert.equal(E.act(restored, 'age').ok, true); assert.equal(person.promise.status, 'kept');
  assert.ok(!person.memories.some(m => m.kind === 'promise_broken'));
});

test('Promise-event fulfillment enforces an explicit time cost while always offering a free defer choice', () => {
  const s = fresh(10), parent = s.npcs[0];
  E.act(s, 'social', { id: parent.id, interaction: 'promise' }); E.act(s, 'age');
  assert.equal(s.pending.id, 'memory_promise_due');
  const e = E.eventById(s.pending.id), fulfill = e.choices.findIndex(c => c.effects.promise === 'fulfill');
  assert.ok(fulfill >= 0); s.year.energy = 0;
  const before = JSON.stringify(s);
  assert.ok(E.choiceReason(s, e.choices[fulfill])); assert.equal(E.act(s, 'choice', { index: fulfill }).ok, false);
  assert.equal(JSON.stringify(s), before);
  assert.ok(e.choices.some(c => !E.choiceReason(s, c)));
  s.year.energy = 1;
  choose(s, c => c.effects.promise === 'fulfill'); assert.equal(parent.promise.status, 'kept'); assert.equal(s.year.energy, 0);
});

test('An ignored optional promise fails only after leaving its due year and creates one remembered consequence', () => {
  const s = fresh(10), parent = s.npcs[0];
  E.act(s, 'social', { id: parent.id, interaction: 'promise' }); E.act(s, 'age');
  choose(s, c => !c.energy); assert.equal(parent.promise.status, 'active');
  const trust = parent.trust;
  assert.equal(E.act(s, 'age').ok, true); assert.equal(s.age, 12); assert.equal(parent.promise.status, 'broken'); assert.equal(parent.trust, trust - 10);
  assert.equal(parent.memories.filter(m => m.kind === 'promise_broken').length, 1);
  assert.equal(s.pending.id, 'memory_broken_promise'); assert.equal(s.pending.npcId, parent.id);
  choose(s, c => c.effects.memory?.repair === true);
  assert.ok(parent.memories.find(m => m.kind === 'promise_broken').resolved);
  const snapshot = JSON.stringify(s);
  assert.equal(E.act(s, 'social', { id: parent.id, interaction: 'apologize' }).ok, false);
  assert.equal(JSON.stringify(s), snapshot);
});

test('Pending and queued introductions survive migration and resolve separately for their original people', () => {
  const { s, n } = encounterFixture(25);
  const second = { ...JSON.parse(JSON.stringify(n)), id: 'person-queued', name: 'İkinci Tanıdık', memories: [] };
  s.npcs.push(second);
  s.encounters.push({ id: s.pending.id, npcId: second.id });
  const originalPending = { ...s.pending }, queue = JSON.parse(JSON.stringify(s.encounters));
  const restored = E.migrate(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(restored.pending, originalPending); assert.deepEqual(restored.encounters, queue);
  choose(restored, c => c.effects.friendship);
  assert.equal(restored.npcs.find(p => p.id === n.id).role, 'friend');
  assert.deepEqual(restored.pending, queue[0]); assert.equal(restored.encounters.length, 0);
  const laterPerson = restored.npcs.find(p => p.id === second.id); assert.equal(laterPerson.role, 'acquaintance');
  choose(restored, c => c.effects.declineContact);
  assert.equal(laterPerson.role, 'acquaintance'); assert.equal(restored.pending, null);
});

test('Migration drops dead or missing NPC encounters instead of applying their choices to living parents', () => {
  const { s, n } = encounterFixture(25);
  const survivor = { ...JSON.parse(JSON.stringify(n)), id: 'person-survivor', name: 'Yaşayan Tanıdık', memories: [] };
  s.npcs.push(survivor); n.alive = false;
  s.encounters.push({ id: s.pending.id, npcId: 'not-a-person' }, { id: s.pending.id, npcId: n.id }, { id: s.pending.id, npcId: survivor.id });
  const restored = E.migrate(JSON.parse(JSON.stringify(s)));
  assert.equal(restored.pending.npcId, survivor.id); assert.equal(restored.encounters.length, 0);
  const parentsBefore = restored.npcs.filter(p => ['mother', 'father'].includes(p.role)).map(p => ({ id: p.id, trust: p.trust, bond: p.bond }));
  choose(restored, c => c.effects.friendship);
  assert.deepEqual(restored.npcs.filter(p => ['mother', 'father'].includes(p.role)).map(p => ({ id: p.id, trust: p.trust, bond: p.bond })), parentsBefore);
});
