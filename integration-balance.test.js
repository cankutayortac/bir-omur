'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('./engine.js');
const D = require('./content.js');
const Economy = require('./economy.js');

function fresh(age = 24) {
  const s = E.newLife({ name: 'Denge testi', gender: 'male', seed: 71 });
  s.age = age; s.city = 'Ankara'; s.money = 30000; s.debt = 0;
  s.npcs = []; s.pending = null; s.encounters = []; s.notices = [];
  s.stats = { knowledge: 55, strength: 55, charisma: 55, happiness: 85, health: 95, stress: 5 };
  s.lifestyle = { housing: 'shared', diet: 'balanced', pace: 'balanced' };
  s.year = { energy: E.maxEnergy(s), maxEnergy: E.maxEnergy(s), used: {}, social: {}, income: 0, expenses: 0, taxableIncome: 0, debtPaid: 0 };
  return s;
}
function setJob(s, id = 'cashier') {
  const career = D.careers.find(c => c.id === id);
  s.job = { id, salary: career.salary, level: 1, performance: 55, years: 0 };
  s.year.energy = s.year.maxEnergy = E.maxEnergy(s);
}
function indexed(s) { s.economy.priceIndex = 2; s.economy.wageIndex = 1.92; }
function parent(s, id, role, income) {
  const n = { id, name: role === 'mother' ? 'Anne' : 'Baba', gender: role === 'mother' ? 'female' : 'male', role, alive: true, age: 40, bond: 88, health: 95, job: 'Mühendis', income, personality: 'Sıcakkanlı' };
  s.npcs.push(n); return n;
}
function success(s, type, payload) {
  const r = E.act(s, type, payload);
  assert.equal(r.ok, true, `${type}: ${r.message}`); return r;
}

test('real labor action pays the wage-indexed amount now and taxes it only at settlement', () => {
  const s = fresh(); indexed(s); setJob(s);
  const before = E.budget(s), initialCash = s.money;
  const preview = E.activityPreview(s, 'part_time');
  const basePay = D.actions.find(a => a.id === 'part_time').effects.money;
  assert.equal(preview.effects.money, Economy.salary(s, basePay));
  s.rng = 4000; success(s, 'activity', { id: 'part_time' });
  assert.equal(s.money - initialCash, preview.effects.money);
  assert.equal(s.year.income, preview.effects.money);
  assert.equal(s.year.taxableIncome, preview.effects.money);
  assert.equal(s.pending, null, 'fixture avoids an unrelated encounter');
  const b = E.budget(s);
  assert.equal(b.income, before.income, 'side payment must not enter annual recurring income');
  assert.equal(b.tax, Economy.tax(s, b.salary + preview.effects.money));
  assert.ok(b.tax > before.tax);
  success(s, 'age');
  assert.equal(s.lastBudget.endingCash, b.projectedCash);
  assert.equal(s.lastBudget.endingDebt, b.projectedDebt);
  assert.equal(s.lastBudget.income, b.income + preview.effects.money);
  assert.equal(s.lastBudget.tax, b.tax);
  assert.equal(s.year.taxableIncome, 0);
  assert.equal(E.budget(s).sideIncomeTax, 0, 'next year has no second tax on the same payment');
});

test('taxable labor from an event follows wages rather than consumer-price inflation', () => {
  const s = fresh(); indexed(s); s.debt = 30000;
  const event = E.eventById('debt_pressure');
  const index = event.choices.findIndex(c => c.effects?.money > 0 && c.effects?.taxable);
  assert.ok(index >= 0);
  const expected = Economy.salary(s, event.choices[index].effects.money);
  const startingCash = s.money;
  s.pending = { id: event.id };
  success(s, 'choice', { index });
  assert.equal(s.money - startingCash, expected);
  assert.equal(s.year.taxableIncome, expected);
  assert.equal(E.budget(s).tax, Economy.tax(s, expected));
});

test('public assistance and second-hand asset proceeds stay outside the labor tax ledger', () => {
  const s = fresh(); indexed(s); s.money = 1000;
  success(s, 'activity', { id: 'public_aid' });
  const aid = s.year.income;
  assert.ok(aid > 0); assert.equal(s.year.taxableIncome, 0); assert.equal(E.budget(s).tax, 0);
  assert.equal(E.act(s, 'activity', { id: 'public_aid' }).ok, false, 'assistance cannot be farmed twice in a year');
  s.inventory.push({ id: 'car', condition: 70 });
  const value = E.itemValue(s, s.inventory[0]);
  const startingCash = s.money;
  success(s, 'sell', { id: 'car' });
  assert.equal(s.money, startingCash + value);
  assert.equal(s.year.income, aid + value);
  assert.equal(s.year.taxableIncome, 0); assert.equal(E.budget(s).tax, 0);
});

test('manual and automatic principal payments conserve wealth and match projected settlement', () => {
  const s = fresh(); setJob(s, 'technician'); s.money = 80000; s.debt = 150000;
  const startingCash = s.money, startingDebt = s.debt;
  success(s, 'repay', { amount: 25000 });
  assert.equal(s.money, startingCash - 25000); assert.equal(s.debt, startingDebt - 25000);
  assert.equal(s.year.debtPaid, 25000); assert.equal(s.year.expenses, 0, 'principal is not an operating expense');
  assert.equal(s.money - s.debt, startingCash - startingDebt);
  const b = E.budget(s); assert.ok(b.debtPrincipal > 0);
  success(s, 'age');
  assert.equal(s.lastBudget.debtPaid, 25000 + b.debtPrincipal);
  assert.equal(s.lastBudget.endingCash, b.projectedCash);
  assert.equal(s.lastBudget.endingDebt, b.projectedDebt);
  assert.equal(s.lastBudget.endingCash - startingCash, s.lastBudget.cashFlow);
  assert.equal(s.lastBudget.endingCash - s.lastBudget.endingDebt, startingCash - startingDebt + b.net);
  assert.equal(s.lastBudget.expenses, b.expenses, 'manual debt transfer must not get charged again at year end');
});

test('automatic principal never creates additional borrowing in an unemployed deficit year', () => {
  const s = fresh(); s.money = 3000; s.debt = 80000;
  const b = E.budget(s);
  assert.equal(b.debtPrincipal, 0);
  success(s, 'age');
  assert.equal(s.lastBudget.endingCash, 0); assert.equal(s.lastBudget.endingDebt, b.projectedDebt);
  assert.equal(s.lastBudget.debtPaid, 0);
  assert.equal(s.lastBudget.endingDebt, 80000 + b.expenses - b.income - 3000);
});

test('parent gifts and recurring allowance share one finite untaxed household support pool', () => {
  const s = fresh(16); s.money = 0; s.lifestyle.housing = 'family'; s.family.generosity = 70;
  const mother = parent(s, 'mother-test', 'mother', 680000), father = parent(s, 'father-test', 'father', 480000);
  const pool = Economy.familySupport(s).pool; assert.ok(pool > 0);
  success(s, 'social', { id: mother.id, interaction: 'ask' });
  success(s, 'social', { id: father.id, interaction: 'ask' });
  const gifts = s.money; assert.ok(gifts > 0);
  assert.equal(s.economy.familySupportUsed, gifts);
  assert.equal(s.year.taxableIncome, 0);
  const stable = JSON.stringify(s);
  assert.equal(E.act(s, 'social', { id: mother.id, interaction: 'ask' }).ok, false);
  assert.equal(JSON.stringify(s), stable, 'repeating a denied request does not alter money or pool');
  const b = E.budget(s), allowance = b.familySupport.automatic;
  assert.ok(gifts + allowance <= pool);
  success(s, 'age');
  assert.equal(s.lastBudget.income, gifts + allowance);
  assert.equal(s.lastBudget.tax, 0);
  assert.equal(s.lastBudget.endingCash, gifts + allowance);
  assert.equal(s.economy.familySupportUsed, 0, 'only advancing the annual settlement resets the pool');
});

test('declined serious job applications consume time and stop after two attempts', () => {
  const s = fresh();
  s.progression.tracks.social.xp = 40; // Both job applications satisfy their communication prerequisite.
  let seed = 0;
  for (; seed < 100000; seed++) {
    const first = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const second = (Math.imul(first, 1664525) + 1013904223) >>> 0;
    if (first / 4294967296 > .96 && second / 4294967296 > .96) break;
  }
  assert.ok(seed < 100000); s.rng = seed;
  const initialTime = s.year.energy;
  success(s, 'apply', { id: 'warehouse' }); success(s, 'apply', { id: 'barista' });
  assert.equal(s.job, null); assert.equal(s.year.energy, initialTime - 2); assert.equal(s.year.used.jobApplications, 2);
  assert.match(E.careerReason(s, 'cashier'), /iki ciddi iş başvurusu/);
  const stable = JSON.stringify(s);
  assert.equal(E.act(s, 'apply', { id: 'cashier' }).ok, false); assert.equal(JSON.stringify(s), stable);
});

test('accepting work costs both application time and annual free-time capacity', () => {
  const s = fresh(), initialTime = s.year.energy, initialMax = s.year.maxEnergy;
  success(s, 'apply', { id: 'cashier' });
  assert.equal(s.job.id, 'cashier'); assert.equal(s.year.maxEnergy, initialMax - 3);
  assert.equal(s.year.energy, initialTime - 4, 'one application plus three annual work time units');
  assert.equal(s.job.salary, D.careers.find(c => c.id === 'cashier').salary);
  success(s, 'quit');
  assert.equal(s.year.maxEnergy, initialMax); assert.equal(s.year.energy, initialTime - 1, 'quitting restores future availability, not application time');
});

test('late job entry cannot erase a full year of employment opportunity cost by clamping time to zero', () => {
  const s = fresh();
  s.year.energy = 1;
  const before = JSON.stringify(s);
  assert.equal(E.act(s, 'apply', { id: 'cashier' }).ok, false, 'one remaining time unit cannot cover an application plus three work units');
  assert.equal(JSON.stringify(s), before);
});

test('inflation alone does not reclassify the same purchasing-power family as wealthy', () => {
  const s = fresh(16);
  parent(s, 'mother-inflation', 'mother', 240000); parent(s, 'father-inflation', 'father', 240000);
  s.economy.priceIndex = 3; s.economy.wageIndex = 2.88;
  success(s, 'age');
  assert.equal(s.family.standard, 'Mütevazı', 'household status is measured against indexed living costs, not obsolete nominal thresholds');
});

test('legacy and current saves retain base salary instead of compounding the wage index on reload', () => {
  const legacy = fresh(); setJob(legacy, 'cashier'); legacy.job.salary = 333333;
  delete legacy.economy; delete legacy.progression; delete legacy.balanceVersion; delete legacy.year.taxableIncome;
  const restored = E.migrate(JSON.parse(JSON.stringify(legacy)));
  assert.equal(restored.job.salary, 333333); assert.equal(restored.money, legacy.money); assert.equal(restored.debt, legacy.debt);
  assert.equal(E.budget(restored).salary, 333333);
  indexed(restored);
  const current = E.migrate(JSON.parse(JSON.stringify(restored)));
  assert.equal(current.job.salary, 333333);
  assert.equal(E.budget(current).salary, Economy.salary(current, 333333));
  const secondLoad = E.migrate(JSON.parse(JSON.stringify(current)));
  assert.equal(secondLoad.job.salary, current.job.salary);
  assert.equal(E.budget(secondLoad).salary, E.budget(current).salary);
});
