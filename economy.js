/* Bir Ömür — kurgu ekonomi modeli. Tutarlar gerçek fiyat/tax verisi değildir. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LifeEconomy = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SCHEMA = 1;
  const CITIES = {
    İstanbul: { housing: 1.35, living: 1.12 }, Ankara: { housing: 1, living: 1 },
    İzmir: { housing: 1.2, living: 1.07 }, Bursa: { housing: .98, living: .98 },
    Eskişehir: { housing: .85, living: .92 }, Antalya: { housing: 1.17, living: 1.04 },
    Samsun: { housing: .8, living: .91 }, Konya: { housing: .82, living: .92 },
    Mersin: { housing: .94, living: .96 }, Trabzon: { housing: .93, living: .97 }
  };
  const CYCLES = [
    { id: 'recovery', label: 'Toparlanma', inflation: .021, wage: -.001, jobs: .02, interest: .075 },
    { id: 'growth', label: 'Canlanma', inflation: .035, wage: .006, jobs: .07, interest: .065 },
    { id: 'slowdown', label: 'Yavaşlama', inflation: .027, wage: -.007, jobs: -.035, interest: .085 },
    { id: 'recession', label: 'Daralma', inflation: .013, wage: -.009, jobs: -.09, interest: .09 }
  ];
  const HOMES = { family: { label: 'Aile evi', cost: 42000 }, shared: { label: 'Paylaşımlı ev', cost: 66000 }, rent: { label: 'Tek başına kiralık ev', cost: 132000 }, own: { label: 'Kendi evin', cost: 24000 } };
  const finite = (n, fallback = 0) => Number.isFinite(Number(n)) ? Number(n) : fallback;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, finite(n, lo)));
  const cash = n => Math.round(clamp(n, 0, 100000000000));
  const ratio = n => Math.round(n * 1000000) / 1000000;
  const list = n => Array.isArray(n) ? n : [];
  const city = s => CITIES[s.city] || CITIES.Ankara;
  const parents = s => list(s.npcs).filter(n => n && n.alive !== false && ['mother', 'father'].includes(n.role));
  const find = (data, key, id) => list(data && data[key]).find(record => record.id === id);
  const current = s => {
    const source = s.economy && typeof s.economy === 'object' ? s.economy : {};
    const cycle = CYCLES.some(c => c.id === source.cycle) ? source.cycle : CYCLES[(finite(s.seed) >>> 0) % CYCLES.length].id;
    return {
      schema: SCHEMA, priceIndex: clamp(source.priceIndex === undefined ? 1 : source.priceIndex, .8, 8),
      wageIndex: clamp(source.wageIndex === undefined ? 1 : source.wageIndex, .736, 8.48), cycle,
      cycleYear: Math.round(clamp(source.cycleYear, 0, 3)), inflation: clamp(source.inflation, -.01, .05),
      wageGrowth: clamp(source.wageGrowth, -.01, .06), familySupportUsed: cash(source.familySupportUsed),
      years: Math.round(clamp(source.years, 0, 125))
    };
  };
  const phase = s => CYCLES.find(c => c.id === current(s).cycle) || CYCLES[0];
  const fmt = n => cash(n).toLocaleString('tr-TR') + ' ₺';

  function create(s) { s.economy = current({ ...s, economy: null }); return s.economy; }
  function migrate(s, oldEconomy) { s.economy = current({ ...s, economy: oldEconomy || s.economy }); return s.economy; }
  function price(s, base) { return cash(finite(base) * current(s).priceIndex); }
  function salary(s, base) { return cash(finite(base) * current(s).wageIndex); }
  function tax(s, annualTaxable) {
    // Brackets move with prices, avoiding a hidden lifetime tax increase from inflation alone.
    const index = current(s).priceIndex;
    const amount = cash(annualTaxable) / index;
    return cash((Math.min(amount, 360000) * .12 + clamp(amount - 360000, 0, 640000) * .22
      + clamp(amount - 1000000, 0, 1000000) * .30 + Math.max(0, amount - 2000000) * .38) * index);
  }

  function familySupport(s) {
    const living = parents(s), area = city(s), e = current(s);
    const gross = living.reduce((sum, n) => sum + salary(s, n.income), 0);
    const parentTax = living.reduce((sum, n) => sum + tax(s, salary(s, n.income)), 0);
    const net = gross - parentTax;
    const dependents = (finite(s.age) < 18 ? 1 : 0) + list(s.npcs).filter(n => n && n.alive !== false && n.role === 'sibling' && finite(n.age) < 18).length;
    const ownExpenses = living.length ? price(s, 120000 * area.housing + (living.length * 78000 + 60000 + dependents * 18000) * area.living) : 0;
    // Parents keep their own emergency reserve; gross income is not free money to give away.
    const reserve = living.length ? Math.max(price(s, 24000), Math.round(net * .1)) : 0;
    const disposable = Math.max(0, net - ownExpenses - reserve);
    const generosity = clamp(s.family && s.family.generosity, 0, 100) / 100;
    const bond = living.length ? living.reduce((sum, n) => sum + clamp(n.bond, 0, 100), 0) / living.length / 100 : 0;
    const pool = cash(Math.min(disposable * .16 * generosity * (.5 + bond / 2), price(s, 72000)));
    const remaining = cash(Math.max(0, pool - e.familySupportUsed));
    const student = !!s.education?.courseId && finite(s.age) < 26;
    const cap = finite(s.age) < 6 ? 600 : finite(s.age) < 12 ? 1800 : finite(s.age) < 18 ? 4200 : student ? 36000 : 0;
    const automatic = Math.min(remaining, price(s, cap), cash(pool * (student ? .8 : .35)));
    return { gross, tax: parentTax, net, ownExpenses, reserve, disposable: cash(disposable), pool, used: e.familySupportUsed, remaining, automatic };
  }

  function familyAid(s, npc) {
    if (!npc || npc.alive === false || !['mother', 'father'].includes(npc.role) || finite(s.age) >= 26 || finite(npc.bond) < 40 || finite(npc.income) <= 0) return 0;
    const support = familySupport(s);
    const cap = finite(s.age) < 6 ? 700 : finite(s.age) < 12 ? 1800 : finite(s.age) < 18 ? 4500 : 16000;
    return cash(Math.min(support.remaining, support.pool * .3 * (clamp(npc.bond, 0, 100) / 100), price(s, cap)));
  }

  function budget(s, Data) {
    const adult = finite(s.age) >= 18, area = city(s), e = current(s);
    const incomeItems = [], expenseItems = [];
    const entry = (target, label, amount, key) => { const rounded = cash(amount); if (rounded) target.push({ label, amount: rounded, type: target === incomeItems ? 'income' : 'expense', key }); };
    const grossSalary = adult && s.job ? salary(s, s.job.salary) : 0;
    const sideIncome = cash(s.year?.taxableIncome);
    const incomeTax = tax(s, grossSalary + sideIncome);
    entry(incomeItems, 'Yıllık brüt maaş', grossSalary, 'salary');
    entry(incomeItems, 'Emekli aylığı · yıllık', adult && s.flags?.retired ? salary(s, s.flags.pension) : 0, 'pension');
    const support = familySupport(s);
    entry(incomeItems, adult ? 'Aile öğrenim desteği · kalan havuz' : 'Yıllık harçlık · kalan aile havuzu', support.automatic, 'family');
    const spouse = list(s.npcs).find(n => n && n.alive !== false && n.role === 'spouse');
    if (adult && spouse) {
      const spouseGross = salary(s, spouse.income);
      const spouseNet = Math.max(0, spouseGross - tax(s, spouseGross) - price(s, 96000 * area.living));
      entry(incomeItems, 'Eşin net hane katkısı', spouseNet * .42, 'spouse');
      // Household contribution is net of the spouse's own tax, needs and savings.
    }
    entry(expenseItems, sideIncome ? 'Gelir vergisi · maaş + ek kazanç' : 'Gelir vergisi', incomeTax, 'tax');
    if (adult) {
      const housing = HOMES[s.lifestyle?.housing] ? s.lifestyle.housing : 'family';
      const diet = { frugal: 42000, balanced: 60000, quality: 84000 }[s.lifestyle?.diet] || 60000;
      const houseLabels = { family: 'Aile evine katkı', shared: 'Paylaşımlı ev kirası', rent: 'Ev kirası', own: 'Ev aidatı ve bakımı' };
      entry(expenseItems, houseLabels[housing], price(s, HOMES[housing].cost * area.housing), 'housing');
      entry(expenseItems, 'Beslenme', price(s, diet * area.living), 'food');
      entry(expenseItems, 'Faturalar ve ulaşım', price(s, (housing === 'family' ? 36000 : 42000) * area.living), 'bills');
      entry(expenseItems, 'Sağlık güvencesi', price(s, 12000 * area.living), 'insurance');
      entry(expenseItems, 'Giyim ve temel ihtiyaçlar', price(s, 18000 * area.living), 'essentials');
      entry(expenseItems, 'Çocuk bakımı', price(s, list(s.npcs).filter(n => n?.alive !== false && n?.role === 'child' && finite(n.age) < 18).length * 60000 * area.living), 'children');
    }
    const essentialExpenses = expenseItems.filter(x => x.key !== 'tax').reduce((sum, x) => sum + x.amount, 0);
    const course = find(Data, 'courses', s.education?.courseId);
    entry(expenseItems, 'Öğrenim ücreti', course ? price(s, finite(course.annualCost) * (1 - clamp(s.education?.scholarship, 0, 1))) : 0, 'tuition');
    entry(expenseItems, 'Düzenli tedavi', adult ? price(s, list(s.conditions).reduce((sum, c) => sum + (c?.chronic ? 4800 : 1800) * clamp(c?.severity, 1, 5), 0)) : 0, 'treatment');
    entry(expenseItems, 'Eşya ve araç bakımı', price(s, list(s.inventory).filter(i => i && finite(i.condition) > 0).reduce((sum, inv) => sum + finite(find(Data, 'items', inv.id)?.maintenance), 0)), 'maintenance');
    const interestRate = phase(s).interest;
    const interest = cash(cash(s.debt) * interestRate);
    entry(expenseItems, `Borç faizi · %${Number((interestRate * 100).toFixed(1)).toLocaleString('tr-TR')}`, interest, 'interest');
    const totalIncome = incomeItems.reduce((sum, x) => sum + x.amount, 0);
    const totalExpenses = expenseItems.reduce((sum, x) => sum + x.amount, 0);
    const net = totalIncome - totalExpenses;
    const cashBeforePrincipal = Math.max(0, cash(s.money) + net);
    const deficit = Math.max(0, -(cash(s.money) + net));
    const emergencyReserve = adult ? Math.round(essentialExpenses / 12) : 0;
    const debtPrincipalDue = cash(Math.min(cash(s.debt), Math.max(price(s, 6000), cash(s.debt) * .12)));
    const debtPrincipal = cash(Math.min(cash(s.debt), Math.max(0, cashBeforePrincipal - emergencyReserve), debtPrincipalDue + Math.max(0, net) * .5));
    return {
      income: totalIncome, expenses: totalExpenses, net, tax: incomeTax, salary: grossSalary,
      taxableIncome: grossSalary + sideIncome, taxableSideIncome: sideIncome,
      sideIncomeTax: incomeTax - tax(s, grossSalary), interest, interestRate,
      essentialExpenses, emergencyReserve, debtPrincipalDue, debtPrincipal, netAfterDebt: net - debtPrincipal,
      breakdown: [...incomeItems, ...expenseItems], incomeItems, expenseItems,
      projectedCash: cash(cashBeforePrincipal - debtPrincipal), projectedDebt: cash(cash(s.debt) + deficit - debtPrincipal),
      discretionaryIncome: cash(s.year?.income), discretionaryExpenses: cash(s.year?.expenses),
      familySupport: support, priceIndex: e.priceIndex, wageIndex: e.wageIndex
    };
  }

  function moveCost(s, target) {
    if (!HOMES[target] || target === s.lifestyle?.housing) return 0;
    // Rental entry includes an unrecoverable setup/agency cost, not a fictitious refundable deposit.
    return price(s, (target === 'family' ? 6000 : target === 'shared' ? 12000 : target === 'rent' ? 24000 : 15000) * city(s).housing);
  }

  function jobChance(s, career) {
    if (!career) return 0;
    if (career.guaranteed) return 1;
    const stats = s.stats || {}, needs = career.requires?.stats || {};
    const requirements = Object.entries(needs);
    const edge = requirements.length ? requirements.reduce((sum, [key, threshold]) => sum + Math.max(0, finite(stats[key]) - finite(threshold)), 0) / requirements.length : 0;
    const communication = Math.round(1000 * Math.sqrt(clamp(s.progression?.tracks?.social?.xp, 0, 1200) / 1200)) / 10;
    return clamp(.54 + communication / 600 + finite(stats.knowledge) / 900 + Math.min(.1, edge / 300) + phase(s).jobs + (career.entryLevel ? .1 : 0), .4, .94);
  }

  function forecasts(s, Data) {
    return Object.entries(HOMES).map(([id, home]) => {
      const b = budget({ ...s, lifestyle: { ...s.lifestyle, housing: id } }, Data);
      return { id, label: home.label, annualExpenses: b.expenses, annualNet: b.net, afterDebt: b.netAfterDebt,
        moveCost: moveCost(s, id), projectedCash: b.projectedCash, projectedDebt: b.projectedDebt,
        available: id !== 'family' || !!parents(s).length,
        owned: id !== 'own' || list(s.inventory).some(i => i.id === 'apartment' && finite(i.condition) > 0) };
    });
  }

  function summary(s, Data) {
    const e = current(s), market = phase(s), b = budget(s, Data);
    return {
      city: s.city || 'Ankara', cycle: market.id, cycleLabel: market.label, priceIndex: e.priceIndex,
      wageIndex: e.wageIndex, inflation: e.inflation, wageGrowth: e.wageGrowth, interestRate: market.interest,
      familyPool: b.familySupport.pool, familyRemaining: b.familySupport.remaining,
      emergencyFund: b.essentialExpenses / 4, monthsCovered: b.essentialExpenses ? Math.round(cash(s.money) / b.essentialExpenses * 120) / 10 : 0,
      annualNet: b.net, afterDebt: b.netAfterDebt, debtPrincipal: b.debtPrincipal,
      warning: b.net < 0 ? 'Mevcut yaşam düzenin yıllık açık veriyor. Barınma, eğitim ve gelir seçeneklerini birlikte karşılaştır.' : s.debt > 0 ? 'Yıl sonunda temel ihtiyaç tamponunun üzerindeki nakitten otomatik anapara ödemesi yapılır.' : b.net < price(s, 30000) ? 'Bütçen başa başa yakın. Eşya, sağlık ve beklenmedik giderler için birikim payı bırak.' : 'Bu fazlayı birikim, eğitim veya yaşam kalitesi arasında paylaştırabilirsin.'
    };
  }

  function annual(s, random) {
    const e = current(s), logs = [];
    e.cycleYear++;
    if (e.cycleYear >= 3) {
      e.cycle = CYCLES[(CYCLES.findIndex(c => c.id === e.cycle) + 1) % CYCLES.length].id;
      e.cycleYear = 0;
      const market = CYCLES.find(c => c.id === e.cycle);
      logs.push({ title: `Ekonomide ${market.label.toLocaleLowerCase('tr-TR')}`, text: 'Piyasa dönemi değişti. Yeni yılın ücretleri, fiyatları, borç faizi ve iş görüşmeleri bütçene birlikte yansıyor.', kind: 'finance' });
    }
    const market = CYCLES.find(c => c.id === e.cycle);
    const sample = typeof random === 'function' ? clamp(random(s), 0, 1) : ((Math.imul((finite(s.seed) >>> 0) + e.years + 1, 1664525) + 1013904223) >>> 0) / 4294967296;
    const nextPrice = clamp(e.priceIndex * (1 + market.inflation + (sample - .5) * .01), .8, 8);
    const wageDelta = clamp((nextPrice / e.priceIndex - 1) + market.wage + (e.priceIndex / e.wageIndex - 1) * .2, -.005, .045);
    // A bounded lag changes purchasing power without making a century-long save unwinnable.
    const nextWage = clamp(e.wageIndex * (1 + wageDelta), nextPrice * .92, nextPrice * 1.06);
    e.inflation = ratio(nextPrice / e.priceIndex - 1); e.wageGrowth = ratio(nextWage / e.wageIndex - 1);
    e.priceIndex = ratio(nextPrice); e.wageIndex = ratio(nextWage); e.familySupportUsed = 0; e.years++;
    s.economy = e;
    if (finite(s.age) >= 18) logs.push({ title: 'Yeni yılın fiyat ve ücretleri', text: `Fiyatlar %${(e.inflation * 100).toFixed(1).replace('.', ',')}, ücret ölçeği %${(e.wageGrowth * 100).toFixed(1).replace('.', ',')} değişti. Otomatik borç ödemesi hedefinin tabanı ${fmt(price(s, 6000))}; gerçek tutar borcuna ve nakit tamponuna göre bütçende hesaplanır.`, kind: 'finance' });
    return logs;
  }

  return { create, migrate, price, salary, tax, budget, familySupport, familyAid, moveCost, jobChance, forecasts, summary, annual };
});
