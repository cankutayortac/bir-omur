const test = require('node:test');
const assert = require('node:assert/strict');
const Economy = require('./economy.js');

const Data = {
  items: [{ id: 'laptop', maintenance: 900 }, { id: 'car', maintenance: 24000 }, { id: 'apartment', maintenance: 12000 }],
  courses: [{ id: 'software', annualCost: 28000 }, { id: 'technical', annualCost: 12000 }]
};
function state(overrides = {}) {
  const s = {
    seed: 3, age: 24, city: 'Ankara', money: 20000, debt: 0,
    family: { generosity: 65 }, npcs: [], education: { courseId: null, scholarship: 0 },
    job: { id: 'cashier', salary: 240000 }, stats: { knowledge: 40, charisma: 35, strength: 40 },
    flags: {}, conditions: [], inventory: [], lifestyle: { housing: 'shared', diet: 'balanced' },
    year: { income: 0, expenses: 0, taxableIncome: 0 }, ...overrides
  };
  Economy.create(s);
  return s;
}
const parent = (role, income, bond = 80) => ({ id: role, role, alive: true, income, bond });
function settle(s) {
  const b = Economy.budget(s, Data);
  s.money += b.income;
  const paid = Math.min(s.money, b.expenses);
  s.money -= paid; s.debt += b.expenses - paid;
  const principal = Math.min(s.money, s.debt, b.debtPrincipal);
  s.money -= principal; s.debt -= principal;
  return b;
}

test('low-skill income supports modest choices but not effortless solo rent', () => {
  const s = state();
  const forecasts = Economy.forecasts(s, Data);
  const family = forecasts.find(f => f.id === 'family');
  const shared = forecasts.find(f => f.id === 'shared');
  const rent = forecasts.find(f => f.id === 'rent');
  assert.equal(family.annualNet, 43200);
  assert.equal(shared.annualNet, 13200);
  assert.equal(rent.annualNet, -52800);
  assert.ok(shared.annualNet < s.job.salary * .08);
  s.job.salary = 384000;
  assert.ok(Economy.budget(s, Data).net > 130000, 'vocational career opens a genuine debt-recovery path');
});

test('city costs produce different housing tradeoffs without changing base prices', () => {
  const capital = state(), expensive = state({ city: 'İstanbul' }), affordable = state({ city: 'Samsun' });
  assert.ok(Economy.budget(expensive, Data).net < 0);
  assert.ok(Economy.budget(affordable, Data).net > Economy.budget(capital, Data).net);
  assert.ok(Economy.moveCost(expensive, 'rent') > Economy.moveCost(capital, 'rent'));
  assert.equal(Economy.price(capital, 24000), Economy.price(expensive, 24000), 'national shop price is not silently city-inflated');
});

test('immediately paid side labor is taxed once, never received twice', () => {
  const base = state(), side = state();
  side.money += 18000; side.year.income += 18000; side.year.taxableIncome += 18000;
  const ordinary = Economy.budget(base, Data), mixed = Economy.budget(side, Data);
  assert.equal(mixed.income, ordinary.income);
  assert.equal(mixed.tax - ordinary.tax, 2160);
  assert.equal(mixed.sideIncomeTax, 2160);
  assert.equal(mixed.projectedCash - ordinary.projectedCash, 15840);
  settle(side);
  side.year = { income: 0, expenses: 0, taxableIncome: 0 };
  assert.equal(Economy.budget(side, Data).tax, ordinary.tax, 'paid side earnings do not get retaxed next year');
});

test('asset sale, inheritance and gifts do not become taxable labor through the cash ledger', () => {
  const s = state(), baseline = Economy.budget(s, Data);
  s.money += 100000; s.year.income = 100000;
  const withSale = Economy.budget(s, Data);
  assert.equal(withSale.tax, baseline.tax);
  assert.equal(withSale.income, baseline.income);
  assert.equal(withSale.discretionaryIncome, 100000);
});

test('family support starts after parents own expenses and reserve, with one finite annual pool', () => {
  const poor = state({ age: 16, job: null, npcs: [parent('mother', 240000), parent('father', 0)] });
  assert.equal(Economy.familySupport(poor).pool, 0);
  assert.equal(Economy.familyAid(poor, poor.npcs[0]), 0);
  const s = state({ age: 16, job: null, npcs: [parent('mother', 680000), parent('father', 960000)] });
  const initial = Economy.familySupport(s);
  assert.ok(initial.pool > 0 && initial.pool < initial.disposable);
  let paid = 0;
  for (let i = 0; i < 100; i++) {
    const aid = Economy.familyAid(s, s.npcs[i % 2]);
    paid += aid; s.economy.familySupportUsed += aid;
  }
  assert.ok(paid <= initial.pool);
  assert.equal(Economy.familyAid(s, s.npcs[0]), 0);
  assert.equal(Economy.budget(s, Data).familySupport.automatic, 0, 'automatic allowance cannot pay the used pool a second time');
  const student = state({ age: 20, job: null, npcs: s.npcs, education: { courseId: 'software', scholarship: .8 } });
  const fullStudentSupport = Economy.familySupport(student).automatic;
  student.economy.familySupportUsed = Economy.familySupport(student).pool;
  assert.ok(fullStudentSupport > 0);
  assert.equal(Economy.familySupport(student).automatic, 0);
  Economy.annual(student, () => .5);
  assert.equal(student.economy.familySupportUsed, 0);
});

test('debt amortization is a transfer, respects a cash buffer and matches projection', () => {
  const s = state({ money: 30000, debt: 150000, job: { salary: 384000 } });
  const oldDebt = s.debt, b = settle(s);
  assert.ok(b.debtPrincipal > 0);
  assert.equal(s.money, b.projectedCash);
  assert.equal(s.debt, b.projectedDebt);
  assert.ok(s.debt < oldDebt);
  assert.ok(s.money >= b.emergencyReserve);
  assert.equal(b.expenses, b.expenseItems.reduce((sum, row) => sum + row.amount, 0));
  assert.equal(b.net, b.income - b.expenses);
  assert.equal(b.netAfterDebt, b.net - b.debtPrincipal);
  for (let i = 0; i < 10 && s.debt > 0; i++) settle(s);
  assert.equal(s.debt, 0, 'a skilled modest household has a finite payoff path');
});

test('minor siblings lower the shared family support pool without making it negative', () => {
  const s = state({ age: 16, job: null, npcs: [parent('mother', 680000), parent('father', 480000)] });
  const before = Economy.familySupport(s);
  s.npcs.push({ id: 'baby', role: 'sibling', alive: true, age: 0, income: 0 });
  const after = Economy.familySupport(s);
  assert.ok(after.ownExpenses > before.ownExpenses);
  assert.ok(after.disposable < before.disposable);
  assert.ok(after.pool < before.pool && after.pool >= 0);
  s.npcs[2].age = 18;
  assert.equal(Economy.familySupport(s).pool, before.pool, 'adult sibling is no longer an automatic dependent');
  s.npcs[2].age = 3; s.npcs[2].alive = false;
  assert.equal(Economy.familySupport(s).pool, before.pool, 'only living dependents count');
  s.npcs[0].income = 120000; s.npcs[1].income = 0; s.npcs[2].alive = true;
  assert.equal(Economy.familySupport(s).pool, 0);
});

test('deficit year does not borrow more money just to pay principal', () => {
  const s = state({ money: 500, debt: 60000, job: null });
  const b = settle(s);
  assert.equal(b.debtPrincipal, 0);
  assert.equal(s.money, 0);
  assert.equal(s.debt, b.projectedDebt);
  assert.equal(s.debt, 60000 + b.expenses - b.income - 500);
});

test('price-indexed tax brackets and wage-indexed salary avoid double scaling', () => {
  const s = state(), baseTax = Economy.tax(s, 600000);
  s.economy.priceIndex = 2; s.economy.wageIndex = 2;
  assert.equal(Economy.tax(s, 1200000), baseTax * 2);
  assert.equal(Economy.budget(s, Data).salary, 480000);
  assert.equal(s.job.salary, 240000, 'stored salary remains base-year contractual salary');
  assert.equal(Economy.price(s, 1000), 2000);
});

test('economic cycle is deterministic, survives JSON roundtrip, and never erodes real wages without bound', () => {
  const a = state();
  for (let i = 0; i < 5; i++) Economy.annual(a, () => .42);
  const b = JSON.parse(JSON.stringify(a));
  Economy.migrate(b, b.economy);
  assert.deepEqual(b, a);
  for (let i = 0; i < 110; i++) {
    Economy.annual(a, () => .42); Economy.annual(b, () => .42);
    assert.deepEqual(a.economy, b.economy);
    const ratio = a.economy.wageIndex / a.economy.priceIndex;
    assert.ok(ratio >= .91999 && ratio <= 1.06001);
    assert.ok(a.economy.priceIndex <= 8);
    assert.ok(a.economy.wageGrowth <= .06001 && a.economy.wageGrowth >= -.01001);
    assert.ok(Number.isFinite(Economy.budget(a, Data).net));
  }
});

test('migration preserves balances, salary and historical cash classifications', () => {
  const s = state({ money: 12345, debt: 45678 });
  delete s.economy;
  s.year.income = 1000;
  const before = JSON.parse(JSON.stringify(s));
  Economy.migrate(s);
  assert.deepEqual({ ...s, economy: undefined }, { ...before, economy: undefined });
  assert.equal(Economy.budget(s, Data).taxableSideIncome, 0, 'unknown old cash receipts are not retroactively taxed');
});

test('read helpers are immutable and defensive with damaged optional numeric fields', () => {
  const s = state({ money: NaN, debt: Infinity, job: { salary: 'bad' }, year: { taxableIncome: NaN }, conditions: [{ severity: Infinity, chronic: true }] });
  s.economy = { priceIndex: NaN, wageIndex: Infinity, cycle: 'unknown', familySupportUsed: -999 };
  Economy.migrate(s, s.economy);
  const saved = JSON.stringify(s);
  const b = Economy.budget(s, Data);
  for (const value of Object.values(b)) if (typeof value === 'number') assert.ok(Number.isFinite(value));
  Economy.forecasts(s, Data); Economy.summary(s, Data); Economy.familySupport(s); Economy.familyAid(s); Economy.jobChance(s, { requires: {} });
  assert.equal(JSON.stringify(s), saved);
  assert.equal(Economy.price(s, -100), 0);
});

test('generic hiring rewards communication experience, not appearance', () => {
  const s = state({ progression: { tracks: { social: { xp: 0 } } } });
  s.stats.charisma = 5;
  const lowBeauty = Economy.jobChance(s, { requires: {} });
  s.stats.charisma = 100;
  assert.equal(Economy.jobChance(s, { requires: {} }), lowBeauty);
  s.progression.tracks.social.xp = 330;
  const experienced = Economy.jobChance(s, { requires: {} });
  assert.ok(experienced > lowBeauty);
  assert.ok(experienced < 1, 'experience is not a hiring guarantee');
});
