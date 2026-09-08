(function (root, factory) {
  const common = typeof module === 'object' && module.exports;
  const api = factory(common ? require('./content.js') : root.LifeData, common ? require('./progression.js') : root.LifeProgression, common ? require('./economy.js') : root.LifeEconomy, common ? require('./relationships.js') : root.LifeRelationships);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LifeEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Data, Progression, Economy, Relationships) {
  'use strict';

  const STAT_NAMES = { knowledge: 'Bilgi', strength: 'Kuvvet', charisma: 'Karizma', happiness: 'Mutluluk', health: 'Sağlık', stress: 'Stres' };
  const NAMES = { female: ['Defne', 'Elif', 'Ece', 'Selin', 'Duru', 'Zeynep', 'İpek', 'Ada', 'Aslı', 'Deniz', 'Lara', 'Mina'], male: ['Emre', 'Arda', 'Mert', 'Can', 'Bora', 'Eren', 'Kerem', 'Ozan', 'Ali', 'Deniz', 'Atlas', 'Yiğit'] };
  const PERSONALITIES = ['Sıcakkanlı', 'İçe dönük', 'Hırslı', 'Duyarlı', 'Maceracı', 'Disiplinli'];
  const PARENT_JOBS = [
    { name: 'İş arıyor', income: 0, weight: 1 }, { name: 'Kasiyer', income: 240000, weight: 3 },
    { name: 'Kurye', income: 285000, weight: 3 }, { name: 'Aşçı', income: 340000, weight: 3 },
    { name: 'Öğretmen', income: 480000, weight: 3 }, { name: 'Hemşire', income: 510000, weight: 2 },
    { name: 'Teknisyen', income: 410000, weight: 3 }, { name: 'Mühendis', income: 680000, weight: 2 },
    { name: 'Doktor', income: 960000, weight: 1 }, { name: 'İşletme sahibi', income: 1260000, weight: 1 }
  ];
  const CONDITION_DEFS = {
    flu: { name: 'Grip', severity: 2, chronic: false }, injury: { name: 'Yaralanma', severity: 3, chronic: false },
    anxiety: { name: 'Kaygı bozukluğu', severity: 2, chronic: true }, hypertension: { name: 'Yüksek tansiyon', severity: 2, chronic: true },
    exhaustion: { name: 'Tükenmişlik', severity: 2, chronic: false }
  };
  const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, Number.isFinite(Number(n)) ? Number(n) : min));
  const number = (n, fallback = 0) => Number.isFinite(Number(n)) ? Number(n) : fallback;
  const cash = n => Math.round(clamp(n, 0, 100000000000));
  const fmt = n => Math.round(n).toLocaleString('tr-TR') + ' ₺';
  const allEvents = [...Data.events, ...Relationships.events];
  const dataList = key => key === 'events' ? allEvents : Array.isArray(Data && Data[key]) ? Data[key] : [];
  const get = (key, id) => dataList(key).find(x => x.id === id);
  const isParent = n => n.role === 'mother' || n.role === 'father';
  const isSchool = s => !!s.education.courseId || (s.age >= 6 && s.age < 18);
  const hasItem = (s, id) => s.inventory.some(i => i.id === id && i.condition > 0);
  const hasRole = (n, role) => n.alive && (n.role === role || (role === 'parent' && isParent(n)) || (role === 'friend' && ['classmate', 'colleague'].includes(n.role)) || (role === 'partner' && n.role === 'spouse'));
  const livingPartner = s => s.npcs.find(n => n.alive && ['partner', 'spouse'].includes(n.role));
  const livingParents = s => s.npcs.filter(n => n.alive && isParent(n));

  function random(s) {
    s.rng = (Math.imul(s.rng >>> 0, 1664525) + 1013904223) >>> 0;
    return s.rng / 4294967296;
  }
  function int(s, min, max) { return Math.floor(random(s) * (max - min + 1)) + min; }
  function pick(s, list) { return list[int(s, 0, list.length - 1)]; }
  function weighted(s, list) {
    if (!list.length) return null;
    let target = random(s) * list.reduce((sum, e) => sum + (e.weight || 1), 0);
    return list.find(e => (target -= e.weight || 1) < 0) || list[list.length - 1];
  }
  function seedNumber(value) {
    if (Number.isFinite(Number(value)) && value !== undefined && value !== '') return Number(value) >>> 0;
    if (value) return Array.from(String(value)).reduce((n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0, 2166136261);
    return (Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0;
  }
  function log(s, title, text, kind = 'life') {
    s.log.push({ age: s.age, title, text, kind });
    if (s.log.length > 800) s.log.splice(0, s.log.length - 800);
  }
  function milestone(s, id, title, text) {
    if (s.milestones.some(m => m.id === id)) return;
    s.milestones.push({ id, age: s.age, title, text });
    log(s, title, text, 'milestone');
    const tips = {school:'Gelecek menüsünde okul başarını takip et. Aktiviteler → Öğrenme ile ders çalışabilir ve okul çevreni tanıyabilirsin.',middle:'Yeni okul, yeni çevre. Derslerle arkadaşlıklara ayırdığın zamanı dengele.',high:'Mezuniyet notun bölüm ve burs seçeneklerini belirler. Gelecek ekranındaki koşullara şimdiden göz at.',graduate:'Okul bitti; faturalar henüz yeni başlıyor. Gelecek menüsünden bir işe veya eğitime başvur; yıllık bütçeni de kontrol et.',adult:'18 yaşından sonraki tam yılın yaşam giderleri sana ait. Aile yanı, paylaşımlı ev ve tek başına yaşama aynı bütçeyi gerektirmez.','first-job':'Maaş bir tam yıl sonunda ödenir. Tam zamanlı iş serbest zamanını azaltır; bütçe, dinlenme ve gelişim arasında denge kur.',parent:'Çocuğun büyüdükçe ihtiyaçları ve ilişkiniz değişir. Bakım giderleri yıllık bütçeye eklendi.'};
    if(tips[id] || /^(degree:|promotion:|skill-|project:)/.test(id)) queueNotice(s,id,title,text,tips[id]||'Yeni imkânlarını Aktiviteler → Gelişim ve Gelecek ekranlarından inceleyebilirsin.');
  }
  function queueNotice(s,topic,title,text,tip='') {
    const id=topic+':'+s.age;
    if(!s.notices.some(n=>n.id===id))s.notices.push({id,age:s.age,title,text,tip});
    if(s.notices.length>30)s.notices.splice(0,s.notices.length-30);
  }
  function activateEncounter(s) {
    if(s.pending||!s.alive)return;
    while(s.encounters.length){
      const encounter=s.encounters.shift(), npc=s.npcs.find(n=>n.id===encounter.npcId&&n.alive);
      if(npc&&get('events',encounter.id)){s.pending=encounter;return;}
    }
  }
  function stage(age) {
    return age < 4 ? 'Bebeklik' : age < 6 ? 'İlk keşifler' : age < 13 ? 'Çocukluk' : age < 18 ? 'Gençlik' : age < 40 ? 'Yetişkinlik' : age < 65 ? 'Olgunluk' : 'İleri yaş';
  }
  function occupation(s) {
    if (!s.alive) return 'Tamamlanan bir hayat';
    if (s.job) return (get('careers', s.job.id) || {}).name || s.job.name || 'Çalışan';
    if (s.flags.retired) return 'Emekli';
    if (s.education.courseId) return ((get('courses', s.education.courseId) || {}).name || 'Yükseköğrenim') + ' öğrencisi';
    if (s.age < 4) return 'Dünyayı keşfediyor';
    if (s.age < 6) return 'Okul öncesi';
    if (s.age < 11) return 'İlkokul öğrencisi';
    if (s.age < 14) return 'Ortaokul öğrencisi';
    if (s.age < 18) return 'Lise öğrencisi';
    return s.education.degree ? 'Diplomalı · İş arıyor' : 'İş arıyor';
  }
  function maxEnergy(s) {
    const base = s.age < 4 ? 3 : s.age < 13 ? 5 : s.age < 18 ? 6 : 8-(s.job?3:0)-(s.education.courseId?2:0);
    return Math.max(2, base + (s.lifestyle.pace === 'ambitious' ? 1 : s.lifestyle.pace === 'relaxed' ? -1 : 0) - (s.stats.health < 30 ? 1 : 0));
  }
  function updateTimeBudget(s) {const max=maxEnergy(s);s.year.energy=Math.max(0,s.year.energy+max-s.year.maxEnergy);s.year.maxEnergy=max;}
  function resetYear(s) {
    s.year = { energy: maxEnergy(s), maxEnergy: maxEnergy(s), used: {}, social: {}, income: 0, expenses: 0, taxableIncome:0, debtPaid:0 };
  }
  function familyUpdate(s) {
    s.family.income = livingParents(s).reduce((sum, n) => sum + Economy.salary(s,n.income || 0), 0);
    s.family.standard = s.family.income < Economy.price(s,420000) ? 'Dar gelirli' : s.family.income < Economy.price(s,800000) ? 'Mütevazı' : s.family.income < Economy.price(s,1300000) ? 'Orta halli' : 'Varlıklı';
  }
  function makeNpc(s, role, opts = {}) {
    const gender = opts.gender || (random(s) < .5 ? 'female' : 'male');
    const age = opts.age !== undefined ? opts.age : Math.max(1, s.age + int(s, -2, 3));
    const profession = age >= 18 ? weighted(s, PARENT_JOBS) : { name: age < 6 ? 'Çocuk' : 'Öğrenci', income: 0 };
    const n = { id: 'person-' + (++s.flags.npcCounter), name: opts.name || pick(s, NAMES[gender] || NAMES.female), gender, age, role,
      personality: pick(s, PERSONALITIES), bond: int(s, 35, 58), alive: true, health: int(s, 70, 99),
      job: profession.name, income: profession.income, sick: false, ...opts };
    s.npcs.push(n);
    Relationships.initNpc(s,n);
    return n;
  }
  function meet(s, context, role) {
    if (s.npcs.filter(n => n.alive && !isParent(n)).length >= 24) return null;
    const kind = role && role !== true ? role : s.age < 6 ? 'friend' : s.age < 18 ? 'classmate' : s.job && /iş|çalış|mesai/i.test(context) ? 'colleague' : 'friend';
    const opts = kind === 'mentor' ? { age: Math.max(25, s.age + int(s, 8, 20)) } : {};
    const npc = makeNpc(s, 'acquaintance', {...opts,contextRole:kind,mentorProtected:kind==='mentor'});
    log(s, 'Yeni bir yüz', `${context} sırasında ${npc.name} ile yolların kesişti. Tanışıklığın nasıl ilerleyeceğine sen karar vereceksin.`, 'relationship');
    const encounter=Relationships.introduction(s,npc);if(encounter)s.encounters.push(encounter);
    return npc;
  }
  function newLife(options = {}) {
    const seed = seedNumber(options.seed);
    const s = { version: 3, seed, rng: seed, name: String(options.name || 'Deniz').trim().slice(0, 40) || 'Deniz', gender: ['male', 'female', 'other'].includes(options.gender) ? options.gender : 'female',
      age: 0, alive: true, deathCause: '', stats: {}, money: 0, debt: 0, family: { standard: '', income: 0, home: 'Aile evi', generosity: 0 },
      npcs: [], education: { level: 'none', grade: 50, degree: null, degrees: [], courseId: null, yearsLeft: 0, scholarship: 0 },
      job: null, inventory: [], conditions: [], flags: { npcCounter: 0, careerYears: 0, lifetimeIncome: 0 }, scheduled: [], seenEvents: {}, pending: null, notices:[],encounters:[],balanceVersion:2,
      year: null, lastBudget: null, log: [], milestones: [], appearance: { hair: 'short', beard: 'none', color: '#322c35', skin: '#e8b28f' },
      lifestyle: { diet: 'balanced', pace: 'balanced', housing: 'family' } };
    if (options.gender === 'random') s.gender = random(s) < .5 ? 'female' : 'male';
    s.city = pick(s, ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Eskişehir', 'Antalya', 'Samsun']);
    s.appearance.hair = s.gender === 'female' ? 'wave' : 'short';
    s.stats = { knowledge: int(s, 7, 18), strength: int(s, 7, 18), charisma: int(s, 8, 20), happiness: int(s, 66, 88), health: int(s, 80, 97), stress: int(s, 0, 8) };
    s.progression=Progression.create(s);Economy.create(s);
    makeNpc(s, 'mother', { gender: 'female', age: int(s, 21, 38), bond: int(s, 65, 95) });
    makeNpc(s, 'father', { gender: 'male', age: int(s, 23, 43), bond: int(s, 55, 92) });
    familyUpdate(s);
    s.family.generosity = int(s, 35, 90);
    s.family.birthStandard = s.family.standard;
    s.money = Math.round(s.family.income * .0015);
    s.flags.birthIncome = s.family.income;
    resetYear(s);
    milestone(s, 'birth', 'Hikâyen başlıyor', `${s.family.standard} bir ailede dünyaya geldin. Annen ${s.npcs[0].name}, ${s.npcs[0].job.toLowerCase()}; baban ${s.npcs[1].name}, ${s.npcs[1].job.toLowerCase()}. Ailenin yıllık geliri ${fmt(s.family.income)}.`);
    return s;
  }

  function charge(s, amount, allowDebt = false, recurring = false) {
    const cost = cash(amount);
    if (!allowDebt && s.money < cost) return false;
    const paid = Math.min(cost, s.money);
    s.money -= paid;
    s.debt = cash(s.debt + cost - paid);
    if (!recurring) s.year.expenses += cost;
    return true;
  }
  function earn(s, amount, recurring = false, taxable = false) {
    const income = cash(amount);
    s.money = cash(s.money + income);
    s.flags.lifetimeIncome = cash((s.flags.lifetimeIncome || 0) + income);
    if (!recurring) s.year.income += income;
    if(taxable)s.year.taxableIncome=(s.year.taxableIncome||0)+income;
  }
  function budget(s) {return Economy.budget(s,Data);}
  function effectPreview(s,effects={},context={source:'event'}) {
    const preview={...effects};delete preview.stats;
    for(const key of Object.keys(STAT_NAMES)) {
      const delta=number(effects[key])+number(effects.stats?.[key]);
      if(delta)preview[key]=Math.round((clamp(s.stats[key]+(context.adjusted?delta:Progression.adjust(s,key,delta,context)))-s.stats[key])*10)/10;
    }
    if(effects.money&&!context.adjustedMoney)preview.money=effects.money>0?(effects.taxable?Economy.salary(s,effects.money):Economy.price(s,effects.money)):-Economy.price(s,-effects.money);
    return preview;
  }
  function activityPreview(s,action) {
    const a=typeof action==='string'?get('actions',action):action;
    if(!a)return {effects:{},xp:{},repeat:0,efficiency:0};
    const preview=Progression.preview(s,a);
    if(preview.effects.money)preview.effects.money=preview.effects.money>0?(a.id==='public_aid'?Economy.price(s,preview.effects.money):Economy.salary(s,preview.effects.money)):-Economy.price(s,-preview.effects.money);
    preview.effects=effectPreview(s,preview.effects,{adjusted:true,adjustedMoney:true});
    return preview;
  }

  function requirementReason(s, r = {}) {
    if (r.minAge !== undefined && s.age < r.minAge) return `${r.minAge} yaşından itibaren açılır.`;
    if (r.maxAge !== undefined && s.age > r.maxAge) return `En fazla ${r.maxAge} yaşında olmalısın.`;
    const reqStats = r.stats || r.req || {};
    for (const [key, value] of Object.entries(reqStats)) if ((s.stats[key] || 0) < value) return `${STAT_NAMES[key] || key}: en az ${value} gerekli.`;
    for(const [key,tier] of Object.entries(r.skills||{}))if(Progression.tierFor(s,key)<tier)return `${Progression.tracks.find(t=>t.id===key)?.name||key}: en az ${tier}. uzmanlık basamağı gerekli.`;
    for (const id of [].concat(r.items || r.item || [])) if (!hasItem(s, id)) return `${(get('items', id) || {}).name || id} gerekli.`;
    for (const id of [].concat(r.flags || [])) if (!s.flags[id]) return 'Bu seçenek için önceki bir gelişme gerekiyor.';
    for (const id of [].concat(r.notFlags || [])) if (s.flags[id]) return 'Önceki kararların bu seçeneği kapattı.';
    if (r.job === true && !s.job) return 'Önce bir işe girmelisin.';
    if (r.job === false && s.job) return 'Yalnızca çalışmıyorken kullanılabilir.';
    if (typeof r.job === 'string' && s.job?.id !== r.job) return 'Uygun bir meslek gerekiyor.';
    if (r.school === true && !isSchool(s)) return 'Öğrenci olmalısın.';
    if (r.school === false && isSchool(s)) return 'Öğrenciyken yapılamaz.';
    const degrees = [s.education.degree, ...(s.education.degrees || [])];
    if (r.degree && ![].concat(r.degree).some(id => degrees.includes(id))) return `Gerekli diploma: ${[].concat(r.degree).map(id => dataList('courses').find(c => c.degree === id)?.name || id).join(' / ')}.`;
    if (r.grade !== undefined && s.education.grade < r.grade) return `Okul başarısı en az ${r.grade} olmalı.`;
    if (r.npcRole && !s.npcs.some(n => hasRole(n, r.npcRole))) return 'Bu hikâye için uygun bir ilişkin olmalı.';
    if (r.healthBelow !== undefined && s.stats.health >= r.healthBelow) return 'Sağlığın bu yardım için yeterince iyi.';
    if (r.healthAbove !== undefined && s.stats.health < r.healthAbove) return `En az ${r.healthAbove} sağlık gerekiyor.`;
    if (r.stressAbove !== undefined && s.stats.stress < r.stressAbove) return 'Şu an böyle bir stres yaşamıyorsun.';
    if (r.cashBelow !== undefined && s.money >= r.cashBelow) return 'Bu destek düşük birikimi olanlara açık.';
    if (r.debtAbove !== undefined && s.debt <= r.debtAbove) return 'Bu seçenek mevcut borcuna uygun değil.';
    if (r.condition && !s.conditions.some(c => c.id === r.condition)) return 'İlgili sağlık durumu mevcut değil.';
    if (r.housing && s.lifestyle.housing !== r.housing) return 'Yaşam düzenin bu seçeneğe uygun değil.';
    return '';
  }
  function availability(s, allowPending = false) {
    if (!s || !s.alive) return 'Bu hayat tamamlandı. Yeni bir hayata başlayabilirsin.';
    if (s.pending && !allowPending) return 'Önce karşındaki olayda bir karar vermelisin.';
    return '';
  }
  function costOf(s, record) {
    return (record.id === 'doctor' || record.id === 'public_clinic') && s.age < 18 ? 0 : Economy.price(s,record.cost || 0);
  }
  function actionReason(s, action) {
    const a = typeof action === 'string' ? get('actions', action) : action;
    let reason = availability(s);
    if (reason) return reason;
    if (!a) return 'Bu etkinlik bulunamadı.';
    reason = requirementReason(s, { minAge: a.minAge || 0, maxAge: a.maxAge, ...(a.requires || {}) });
    if (reason) return reason;
    if (s.year.energy < (a.energy || 1)) return 'Bu yıl yeterli zamanın kalmadı.';
    if ((s.year.used[a.id] || 0) >= (a.perYear || a.limit || 2)) return 'Bu etkinlik için yıllık sınıra ulaştın.';
    if (s.money < costOf(s, a)) return `${fmt(costOf(s, a))} gerekiyor.`;
    if (a.id === 'public_aid' && s.money >= 15000) return 'Bu destek düşük birikimi olanlara açık.';
    return '';
  }
  function choiceReason(s, choice) {
    const reason = availability(s, true);
    if (reason) return reason;
    if (!choice) return 'Bu karar bulunamadı.';
    const req = requirementReason(s, { minAge: choice.minAge, maxAge: choice.maxAge, ...(choice.requires || {}) });
    if (req) return req;
    if (s.money < costOf(s,choice)) return `${fmt(costOf(s,choice))} gerekiyor.`;
    if(s.year.energy<(choice.energy||0))return `Bu seçim için ${choice.energy} zaman puanı gerekiyor.`;
    return '';
  }
  function careerReason(s, career) {
    const c = typeof career === 'string' ? get('careers', career) : career;
    const reason = availability(s);
    if (reason) return reason;
    if (!c) return 'İş ilanı bulunamadı.';
    if (s.age < (c.minAge || 18)) return `${c.minAge || 18} yaşında açılır.`;
    if (s.flags.retired) return 'Emeklilikten sonra yarı zamanlı etkinliklerle gelir kazanabilirsin.';
    if (s.education.courseId) return 'Tam zamanlı öğrenimin bitince başvurabilirsin.';
    if (s.job?.id === c.id) return 'Zaten bu işte çalışıyorsun.';
    const timeNeeded=1+Math.max(0,s.year.maxEnergy-maxEnergy({...s,job:{id:c.id}}));
    if (s.year.energy < timeNeeded) return `Başvuru ve işe ayıracağın yıl için ${timeNeeded} zaman puanı gerekiyor.`;
    if (s.year.used['apply:' + c.id]) return 'Bu yıl bu ilana zaten başvurdun.';
    if((s.year.used.jobApplications||0)>=2)return 'Bu yıl iki ciddi iş başvurusu yaptın. Yeni ilanlar gelecek yıl değerlendirilebilir.';
    return requirementReason(s, { degree: c.degree, ...(c.requires || {}) });
  }
  function courseReason(s, course) {
    const c = typeof course === 'string' ? get('courses', course) : course;
    const reason = availability(s);
    if (reason) return reason;
    if (!c) return 'Program bulunamadı.';
    if (s.age < (c.minAge || 18)) return `${c.minAge || 18} yaşında açılır.`;
    if (s.education.courseId) return 'Zaten bir programa devam ediyorsun.';
    if (s.job) return 'Tam zamanlı eğitim için önce işinden ayrılmalısın.';
    if ((s.education.degrees || []).includes(c.degree || c.id)) return 'Bu programın diplomasını zaten aldın.';
    const timeNeeded=1+Math.max(0,s.year.maxEnergy-maxEnergy({...s,education:{...s.education,courseId:c.id}}));
    if (s.year.energy < timeNeeded) return `Kayıt ve eğitime ayıracağın yıl için ${timeNeeded} zaman puanı gerekiyor.`;
    return requirementReason(s, { grade: c.minGrade, ...(c.requires || {}) });
  }
  function addCondition(s, id) {
    const known = CONDITION_DEFS[id] || { name: id, severity: 2, chronic: false };
    const existing = s.conditions.find(c => c.id === id);
    if (existing) { existing.severity = Math.min(5, existing.severity + 1); return; }
    s.conditions.push({ id, ...known, since: s.age, managedUntil: -1 });
    log(s, 'Sağlığında bir değişiklik', `${known.name} belirtileri başladı. Dinlenme ve sağlık hizmetleriyle durumunu takip edebilirsin.`, 'health');
    queueNotice(s,'condition:'+id,'Sağlık dosyana bir not',`${known.name} belirtileri başladı.`, 'Sağlık menüsünde muayene ve tedavi seçeneklerini incele. Dinlenme faydalı; kronik rahatsızlıklar düzenli takip ister.');
  }
  function treat(s, publicCare) {
    let chronic = false;
    s.conditions = s.conditions.filter(c => {
      if (c.chronic) { c.severity = Math.max(1, c.severity - 1); c.managedUntil = s.age + (publicCare ? 1 : 2); chronic = true; return true; }
      if (publicCare && c.severity > 3) { c.severity -= 2; return true; }
      return false;
    });
    s.flags.lastCheckup = s.age;
    if (chronic) log(s, 'Tedavi planı', 'Kronik rahatsızlığın kontrol altına alındı. Düzenli takip ve tedavi yine gerekli.', 'health');
  }
  function applyEffects(s, effects = {}, npcId, context = {}) {
    const changes=Object.fromEntries(Object.keys(STAT_NAMES).map(key=>{
      const delta=number(effects[key])+number(effects.stats?.[key]);
      return [key,context.adjusted?delta:Progression.adjust(s,key,delta,context)];
    }));
    for(const [key,delta] of Object.entries(changes))s.stats[key]=Math.round(clamp(s.stats[key]+delta)*10)/10;
    if (effects.money > 0) earn(s, context.adjustedMoney?effects.money:(effects.taxable?Economy.salary(s,effects.money):Economy.price(s,effects.money)),false,(context.source==='activity'&&context.taxable!==false)||effects.taxable===true);
    if (effects.money < 0) charge(s, context.adjustedMoney?-effects.money:Economy.price(s,-effects.money), true);
    if (effects.debt) s.debt = cash(s.debt + Math.sign(effects.debt)*Economy.price(s,Math.abs(effects.debt)));
    if (effects.grade || effects.school) s.education.grade = clamp(s.education.grade + (effects.grade || effects.school));
    if (effects.performance && s.job) s.job.performance = clamp(s.job.performance + effects.performance);
    for (const flag of [].concat(effects.flag || effects.flags || [])) s.flags[flag] = true;
    for (const flag of [].concat(effects.clearFlag || [])) delete s.flags[flag];
    for (const id of [].concat(effects.condition || effects.conditions || [])) addCondition(s, id);
    if (effects.cure) treat(s, false);
    for (const id of [].concat(effects.items || [])) if (get('items', id) && (!hasItem(s, id) || get('items', id).consumable)) s.inventory.push({ id, condition: 100 });
    for (const id of [].concat(effects.consume || [])) { const at = s.inventory.findIndex(i => i.id === id); if (at >= 0) s.inventory.splice(at, 1); }
    if (effects.bond) {
      const n = s.npcs.find(npc => npc.id === npcId && npc.alive);
      const targets = n ? [n] : livingParents(s);
      targets.forEach(npc => { npc.bond = clamp(npc.bond + effects.bond); });
    }
    if (effects.meet) meet(s, 'Bu olay', effects.meet);
    const memoryNpc=s.npcs.find(n=>n.id===npcId);
    if(memoryNpc){
      Relationships.applyEffects(s,memoryNpc,effects);
      if(effects.friendship&&memoryNpc.role==='friend')milestone(s,'first-friend','Dünyan büyüyor',`${memoryNpc.name} ile tanışıklığını bir arkadaşlığa dönüştürdün.`);
      if(effects.romance==='accept'&&memoryNpc.role==='partner')milestone(s,'love','Kalbinin yeni bir hikâyesi var',`${memoryNpc.name} ile karşılıklı bir ilişkiye başladın.`);
    }
    if (effects.scholarship) s.education.scholarship = Math.max(s.education.scholarship || 0, clamp(effects.scholarship, 0, 1));
    if (effects.jobLoss && s.job) { log(s, 'İşini kaybettin', 'Bu olayın ardından iş sözleşmen sona erdi.', 'career'); s.job = null; }
  }
  function die(s, cause) {
    s.alive = false; s.deathCause = cause; s.pending = null; s.stats.health = 0;
    milestone(s, 'death', 'Bir ömür tamamlandı', `${s.age} yıllık hayatın ${cause.toLowerCase()} nedeniyle sona erdi. Geride ${s.npcs.filter(n => n.alive && n.bond >= 60).length} güçlü bağ ve ${s.milestones.length} dönüm noktası bıraktın.`);
  }
  function checkDeath(s) { if (s.stats.health <= 0 && s.alive) die(s, s.conditions.length ? s.conditions[0].name + ' ve sağlık komplikasyonları' : 'Sağlık sorunları'); }

  function itemValue(s, item) {
    const inv = typeof item === 'string' ? s.inventory.find(i => i.id === item) : item;
    if (!inv) return 0;
    const def = get('items', inv.id);
    if (!def || def.consumable) return 0;
    return Math.round(Economy.price(s,def.price) * (def.category === 'property' || inv.id === 'apartment' ? .9 : .55) * (inv.condition / 100));
  }
  function buyReason(s, item) {
    const i = typeof item === 'string' ? get('items', item) : item;
    const reason = availability(s);
    if (reason) return reason;
    if (!i) return 'Eşya bulunamadı.';
    const requirement = requirementReason(s, { minAge: i.minAge || 0, ...(i.requires || {}) });
    if (requirement) return requirement;
    if (!i.consumable && hasItem(s, i.id)) return 'Bu eşyaya zaten sahipsin.';
    if (i.consumable && s.inventory.filter(inv => inv.id === i.id).length >= 5) return 'En fazla 5 adet taşıyabilirsin.';
    if (s.money < Economy.price(s,i.price)) return `${fmt(Economy.price(s,i.price))} gerekiyor.`;
    return '';
  }

  function socialReason(s, npc, interaction) {
    if (interaction === 'flirt') interaction = 'date';
    const n = typeof npc === 'string' ? s.npcs.find(x => x.id === npc) : npc;
    const reason = availability(s);
    if (reason) return reason;
    if (!n || !n.alive) return 'Bu kişi artık hayatta değil.';
    if (s.age < 3) return 'İlişkilerle bilinçli etkileşim 3 yaşında açılır.';
    if (!['talk', 'time', 'gift', 'ask', 'apologize', 'date', 'marry', 'child', 'breakup', 'argue','promise'].includes(interaction)) return 'Etkileşim bulunamadı.';
    const memoryReason=Relationships.socialReason(s,n,interaction);if(memoryReason)return memoryReason;
    if (s.year.energy < 1) return 'Birlikte zaman geçirmek için 1 zaman puanı gerekli.';
    if ((s.year.social[n.id] || 0) >= 2) return 'Bu kişiyle bu yıl yeterince zaman geçirdin.';
    if (s.year.used['social:' + n.id + ':' + interaction]) return 'Bu etkileşimi bu yıl zaten denedin.';
    const costs = { gift: s.age < 18 ? 250 : 1500, date: 1800, marry: 48000, child: 18000 };
    if (costs[interaction] && s.money < Economy.price(s,costs[interaction])) return `${fmt(Economy.price(s,costs[interaction]))} gerekiyor.`;
    if (['date', 'marry', 'child', 'breakup'].includes(interaction) && (s.age < 18 || n.age < 18)) return 'Romantik ilişkiler yalnızca yetişkinler arasında açılır.';
    if (['date', 'marry', 'child', 'breakup'].includes(interaction) && (isParent(n) || ['child','sibling','mentor'].includes(n.role) || n.mentorProtected || n.contextRole==='mentor')) return 'Bu kişiyle bu tür bir ilişki kurulamaz.';
    if (interaction === 'date') {
      if (livingPartner(s) && livingPartner(s).id !== n.id) return 'Önce mevcut ilişkin hakkında karar vermelisin.';
      if (n.role === 'spouse') return 'Eşinle birlikte zaman geçirebilirsin.';
      if (n.bond < 45) return 'Önce ilişkinizi 45 düzeyine getirmelisin.';
    }
    if (interaction === 'marry' && (n.role !== 'partner' || n.bond < 75 || s.age - (n.partnerSince || s.age) < 1)) return 'En az 1 yıllık birliktelik ve 75 ilişki gerekiyor.';
    if (interaction === 'child') {
      if (!['partner', 'spouse'].includes(n.role) || n.bond < 65) return 'En az 65 ilişki düzeyinde bir partner gerekiyor.';
      if (s.age < 21 || n.age < 21) return 'Ebeveynlik 21 yaşından itibaren açılır.';
      if (s.stats.health < 45 || n.health < 40) return 'Aileyi büyütmek için sağlık durumunuz uygun değil.';
      if (s.npcs.filter(x => x.role === 'child' && x.alive).length >= 4) return 'Ailen en fazla 4 çocukla büyüyebilir.';
      if (s.flags.lastChild === s.age) return 'Ailen bu yıl zaten büyüdü.';
    }
    if (interaction === 'breakup' && !['partner', 'spouse'].includes(n.role)) return 'Bu kişiyle romantik bir ilişkin yok.';
    if (interaction === 'ask' && (!isParent(n) || s.age >= 26)) return 'Aile yardımı 26 yaşına kadar anne veya babadan istenebilir.';
    return '';
  }

  function doSocial(s, id, interaction) {
    if (interaction === 'flirt') interaction = 'date';
    const n = s.npcs.find(x => x.id === id), reason = socialReason(s, n, interaction);
    if (reason) return { ok: false, message: reason };
    s.year.energy--; s.year.social[n.id] = (s.year.social[n.id] || 0) + 1; s.year.used['social:' + n.id + ':' + interaction] = 1;
    let message = '', title = 'Bir ilişkiye zaman ayırdın',aidPaid=0;
    if (interaction === 'talk') { const gain = int(s, 3, 8) + Math.floor(s.stats.charisma / 25); n.bond = clamp(n.bond + gain); applyEffects(s, { charisma: 1, happiness: 2, stress: -2 }); message = `${n.name} ile içten bir sohbet ettin. İlişkiniz ${gain} puan güçlendi.`; }
    if (interaction === 'time') { n.bond = clamp(n.bond + int(s, 7, 12)); applyEffects(s, { happiness: 5, stress: -5 }); message = `${n.name} ile birlikte güzel bir gün geçirdin.`; }
    if (interaction === 'gift') { charge(s, Economy.price(s,s.age < 18 ? 250 : 1500)); n.bond = clamp(n.bond + int(s, 8, 13)); message = `${n.name} hediyeni görünce mutlu oldu.`; }
    if (interaction === 'apologize') { applyEffects(s, { stress: -3 }); message = `${n.name} ile arandaki kırgınlığı konuşup özür diledin.`; }
    if (interaction === 'argue') { n.bond = clamp(n.bond - int(s, 10, 20)); applyEffects(s, { happiness: -5, stress: 7 }); message = `${n.name} ile sert bir tartışma yaşadın.`; }
    if (interaction === 'ask') {
      const aid=Economy.familyAid(s,n);
      if (!aid) { message = `${n.name} bütçesine baktı: “Sevgi limitsiz, banka hesabı maalesef değil.” Bu yıl ek destek sağlayamadı.`; }
      else { earn(s, aid);aidPaid=aid;s.economy.familySupportUsed+=aid; n.bond = clamp(n.bond - 3); message = `${n.name}, ortak aile yardım bütçesinden ${fmt(aid)} destek oldu. Bu tutar yıl sonu harçlık/öğrenim desteği için kalan havuzu da azaltır.`; }
    }
    if (interaction === 'date') {
      charge(s, Economy.price(s,1800));
      if (random(s) < Math.min(.90, .20 + n.bond / 220 + (n.trust||0)/500 + s.stats.charisma / 600)) {
        const encounter=Relationships.romanticEvent(s,n);if(encounter)s.encounters.push(encounter);
        message = `${n.name} de senden hoşlanıyor. Kalp hızlandı; ilişkinin adını ise bir sonraki seçimde sen koyacaksın.`;
      } else { n.bond = clamp(n.bond - 5); applyEffects(s, { happiness: -4 }); message = `${n.name} seni tanımaktan memnun ama şu an aynı duyguları paylaşmıyor.`; }
    }
    if (interaction === 'marry') { charge(s, Economy.price(s,48000)); n.role = 'spouse'; n.marriedSince = s.age; n.bond = clamp(n.bond + 8); applyEffects(s, { happiness: 12, stress: 3 }); message = `${n.name} ile evlendin. Artık hane gelirini ve çocuk giderlerini birlikte planlayacaksınız.`; milestone(s, 'married', 'İki hayat, bir yuva', message);queueNotice(s,'marriage','Evet dediniz; bütçe de şahit',message,'Varlıklar menüsünde ortak hane katkısını ve yeni yaşam planını incele.'); }
    if (interaction === 'child') { charge(s, Economy.price(s,18000)); const child = makeNpc(s, 'child', { age: 0, bond: 95, health: 92, job: 'Bebek', income: 0, parentId: n.id }); s.flags.lastChild = s.age; applyEffects(s, { happiness: 12, stress: 8 }); message = `${child.name} aileye katıldı. Çocuğunun ihtiyaçları yıllık bütçene eklendi.`; milestone(s, 'parent', 'Yeni bir hayatın sorumluluğu', message);queueNotice(s,'child:'+child.id,'Evin yeni minik patronu',message,'İlişkilerde çocuğunu görebilir, Varlıklarda bakım giderlerini takip edebilirsin.'); }
    if (interaction === 'breakup') { const married = n.role === 'spouse'; n.role = 'ex'; n.bond = clamp(n.bond - 35); if (married) charge(s, Economy.price(s,12000), true); applyEffects(s, { happiness: -10, stress: 9 }); message = `${n.name} ile ${married ? 'evliliğin' : 'ilişkin'} sona erdi.${married ? ' Ayrılık masrafları bütçene işlendi.' : ''}`; }
    const memory=Relationships.social(s,n,interaction,{message,aid:aidPaid});
    if(memory?.message)message+=(message?' ':'')+memory.message;
    log(s, title, message, 'relationship');activateEncounter(s);return { ok: true, message };
  }

  function annualNpc(s) {
    for (const n of s.npcs) {
      if (!n.alive) continue;
      n.age++;
      n.bond = clamp(n.bond - int(s, 0, ['partner', 'spouse'].includes(n.role) ? 6 : 3));
      if (n.age === 6) { n.job = 'Öğrenci'; log(s, 'Okulun ilk günü', `${n.name} okula başladı.`, 'relationship');if(['child','sibling'].includes(n.role))queueNotice(s,'npc-school:'+n.id,'Evde bir okul çantası daha',`${n.name} okula başladı.`, 'Büyüdükçe ihtiyaçları ve sohbetleri değişecek. İlişkilerden birlikte zaman geçirebilirsin.'); }
      if (n.age === 18 && !isParent(n)) { const job = weighted(s, PARENT_JOBS); n.job = job.name; n.income = job.income; log(s, 'Bir hayat daha değişiyor', `${n.name} yetişkinliğe adım attı. ${n.job === 'İş arıyor' ? 'İş aramaya başladı.' : n.job + ' olarak yeni bir yol çiziyor.'}`, 'relationship'); }
      if (n.age >= 22 && n.age < 64 && random(s) < .04) {
        const job = weighted(s, PARENT_JOBS); n.job = job.name; n.income = job.income;
        log(s, 'Yeni iş haberi', `${n.name}: ${job.name}. Bu değişim ${isParent(n) ? 'ailenin maddi durumunu' : n.role === 'spouse' ? 'hane gelirini' : 'onun hayatını'} etkiliyor.`, 'relationship');
        if(isParent(n)||n.role==='spouse')queueNotice(s,'npc-work:'+n.id,'Evde bir iş haberi',`${n.name} için yeni durum: ${job.name}.`, 'Ailenin destek kapasitesi veya eşinin hane katkısı değişebilir. Güncel hesabı Varlıklar → Yıllık bütçede incele.');
      }
      if (n.age === 65) { n.income = Math.round(n.income * .48); n.job = 'Emekli'; log(s, 'Bir emeklilik haberi', `${n.name} emekli oldu.`, 'relationship');if(isParent(n)||n.role==='spouse')queueNotice(s,'npc-retired:'+n.id,'Mesaiye veda',`${n.name} emekli oldu. Geliri artık emekli gelirine göre hesaplanıyor.`, 'Aile desteği ve hane bütçeni yeniden incele. Birlikte geçirecek yeni zamanlarınız var.'); }
      if (n.age > 40 && !n.sick && random(s) < .025) { n.sick = true; n.health = clamp(n.health - 12); log(s, 'Yakınından sağlık haberi', `${n.name} bir sağlık sorunu yaşıyor. Onunla zaman geçirmek bağınızı güçlendirebilir.`, 'health'); }
      if (n.sick && random(s) < .24) { n.sick = false; n.health = clamp(n.health + 10); }
      n.health = clamp(n.health - (n.age > 70 ? int(s, 1, 4) : n.age > 50 ? int(s, 0, 2) : int(s, -1, 1)) - (n.sick ? 3 : 0));
      if (n.health <= 0 || n.age >= 105 || (n.age >= 72 && random(s) < .006 + Math.max(0, n.age - 78) * .004)) {
        n.alive = false; n.health = 0; n.income = 0;
        applyEffects(s, { happiness: -Math.round(n.bond / 8), stress: 8 });
        log(s, 'Bir veda', `${n.name}, ${n.age} yaşında hayatını kaybetti. Anılarınız yaşam günlüğünde kalacak.`, 'loss');
        if(isParent(n)||['sibling','child','partner','spouse'].includes(n.role)||n.bond>=60)queueNotice(s,'loss:'+n.id,'Bir veda',`${n.name}, ${n.age} yaşında hayatını kaybetti.`, 'Onunla paylaştığın anılar İlişkiler → Hatıralar ve hayat günlüğünde kalır. Bu yıl kendine zaman ayırabilirsin.');
        if (isParent(n) && n.bond >= 45) {
          const inheritance = Math.round((s.flags.birthIncome || 0) * .14 * (n.bond / 100));
          earn(s, inheritance); log(s, 'Ailenden kalan miras', `${n.name} sana ${fmt(inheritance)} bıraktı.`, 'finance');
        }
      }
    }
    const mother=s.npcs.find(n=>n.role==='mother'&&n.alive),father=s.npcs.find(n=>n.role==='father'&&n.alive);
    if(s.age>=1&&s.age<=16&&mother&&father&&mother.age<=43&&s.npcs.filter(n=>n.role==='sibling').length<2&&s.age-(s.flags.lastSiblingAge??-5)>=3&&random(s)<.045){
      const sibling=makeNpc(s,'sibling',{age:0,bond:60,health:93,job:'Bebek',income:0,parentId:mother.id});s.flags.lastSiblingAge=s.age;
      log(s,'Aileye yeni biri katıldı',`${sibling.name} doğdu. Artık bir kardeşin var.`, 'relationship');
      queueNotice(s,'sibling:'+sibling.id,'Tek kişilik saltanatına küçük bir ortak',`${sibling.name} aileye katıldı. Minik eller, kocaman bir ses kapasitesi.`, 'Kardeşin İlişkiler menüsünde. Aile bütçesi artık onun ihtiyaçlarını da karşılıyor; büyürken aranızdaki bağı sen şekillendireceksin.');
    }
    familyUpdate(s);
    if (s.age >= 18 && s.lifestyle.housing === 'family' && livingParents(s).length === 0) {
      s.lifestyle.housing = hasItem(s, 'apartment') ? 'own' : 'shared';
      log(s, 'Yeni bir yaşam düzeni', 'Aile evindeki destek sona erdi. Yeni barınma giderlerin gelecek yılın bütçesinde görünüyor.', 'finance');
    }
    const partner = livingPartner(s);
    if (partner && partner.bond < 18) { partner.role = 'ex'; applyEffects(s, { happiness: -9, stress: 7 }); log(s, 'Aranızdaki bağ koptu', `${partner.name}, uzun süredir uzaklaştığınızı söyleyerek ilişkini bitirdi.`, 'relationship'); }
  }
  function annualHealth(s) {
    const stressChange = (s.job ? 5 : s.age >= 18 && !s.flags.retired ? 5 : 1) + (isSchool(s) ? 3 : 0) + (s.lifestyle.pace === 'ambitious' ? 9 : s.lifestyle.pace === 'relaxed' ? -7 : -2) + (s.debt > 0 ? 5 : 0);
    s.stats.stress = clamp(s.stats.stress + stressChange);
    const ageLoss = s.age < 35 ? 1 : s.age < 55 ? 2 : s.age < 70 ? 3 : 5;
    const diet = s.lifestyle.diet === 'quality' ? 2 : s.lifestyle.diet === 'frugal' && s.age >= 18 ? -2 : 0;
    const pace = s.lifestyle.pace === 'relaxed' ? 2 : s.lifestyle.pace === 'ambitious' ? -2 : 0;
    let illnessLoss = 0;
    for (const c of s.conditions) {
      illnessLoss += c.managedUntil >= s.age ? 1 : c.severity * (c.chronic ? 2 : 3);
      if (!c.chronic && ((s.year.used.rest || 0) + (s.year.used.sleep || 0) > 0 || c.since < s.age - 1)) c.severity--;
      else if (c.managedUntil < s.age && random(s) < .22) c.severity = Math.min(5, c.severity + 1);
    }
    s.conditions = s.conditions.filter(c => c.severity > 0);
    s.stats.health = clamp(s.stats.health - ageLoss + diet + pace - illnessLoss - (s.stats.stress >= 75 ? 4 : 0));
    s.stats.happiness = clamp(s.stats.happiness + (s.stats.stress > 70 ? -5 : -1) + (livingPartner(s)?.bond > 65 ? 2 : 0));
    if (s.age >= 15 && s.stats.stress > 85 && random(s) < .35) addCondition(s, 'anxiety');
    if (s.age >= 45 && random(s) < .025 + (s.lifestyle.diet === 'frugal' ? .015 : 0)) addCondition(s, 'hypertension');
    if (s.age >= 6 && random(s) < .035) addCondition(s, 'flu');
    if (s.age >= 65) s.stats.strength = clamp(s.stats.strength - 2);
    if (s.stats.health <= 0) checkDeath(s);
    else if (s.age >= 110 || (s.age >= 80 && random(s) < .008 + Math.max(0, s.age - 85) * .006)) die(s, 'İleri yaş');
  }
  function annualEducation(s) {
    if (s.age === 6) { s.education.level = 'primary'; milestone(s, 'school', 'İlk okul çantan', 'İlkokula başladın. Notların, düzenli çalışman ve stresin gelecekteki eğitim kapılarını belirleyecek.'); }
    if (s.age === 11) { s.education.level = 'middle'; milestone(s, 'middle', 'Yeni bir okul dönemi', 'Ortaokula başladın. Arkadaşlıkların ve ilgi alanların değişiyor.'); }
    if (s.age === 14) { s.education.level = 'high'; milestone(s, 'high', 'Lise yılları', 'Liseye başladın. Üniversite başvurularında okul başarın ve bilgi düzeyin birlikte değerlendirilecek.'); }
    if (s.age >= 6 && s.age <= 18) {
      s.education.grade = clamp(s.education.grade + Math.round((s.stats.knowledge - 40) / 15) + int(s, -2, 2) - (s.stats.stress > 70 ? 3 : 0));
      applyEffects(s,{knowledge:2},undefined,{source:'education'});
    }
    if (s.age === 18) { s.education.level = 'graduate'; s.education.highSchoolGrade = s.education.grade; milestone(s, 'graduate', 'Bir diploma, birçok yol', `Liseden ${Math.round(s.education.grade)} ortalamayla mezun oldun. İşe girebilir veya diploma programlarına başvurabilirsin.`); }
    if (s.education.courseId) {
      const c = get('courses', s.education.courseId);
      if (!c) { s.education.courseId = null; s.education.yearsLeft = 0; return; }
      s.education.grade = clamp(s.education.grade + Math.round((s.stats.knowledge - 45) / 15) - (s.stats.stress > 75 ? 4 : 0));
      applyEffects(s,{knowledge:c.knowledgePerYear || 4},undefined,{source:'education'});
      if (s.education.grade < 35) { log(s, 'Zor bir akademik yıl', 'Başarın 35 altında kaldı; sınıfı tekrar etmen gerekiyor. Çalışmaya ve dinlenmeye zaman ayır.', 'education'); s.education.grade = clamp(s.education.grade + 4); }
      else s.education.yearsLeft--;
      if (s.education.yearsLeft <= 0) {
        s.education.degree = c.degree || c.id; s.education.degrees.push(s.education.degree); s.education.courseId = null; s.education.level = 'graduate';
        applyEffects(s, c.effects || { knowledge: 5, charisma: 3 });
        milestone(s, 'degree:' + c.id, 'Emeklerinin karşılığı', `${c.name} programını tamamladın. Yeni meslekler için diploman hazır.`);
      }
    }
  }
  function annualJob(s) {
    if (!s.job) return;
    const job = s.job, c = get('careers', job.id);
    job.years++; s.flags.careerYears++;
    job.performance = clamp(job.performance + int(s, -4, 4) + (s.lifestyle.pace === 'ambitious' ? 7 : s.lifestyle.pace === 'relaxed' ? -4 : 1) - (s.stats.health < 35 ? 8 : 0) - (s.stats.stress > 80 ? 7 : 0));
    if (job.performance < 22) { log(s, 'İş sözleşmen sona erdi', 'Düşen performansın nedeniyle işini kaybettin. Yılın çalıştığın gelirini aldın; gelecek yıl için yeni bir iş aramalısın.', 'career'); s.job = null; applyEffects(s, { happiness: -8, stress: 10 }); return; }
    const trainingReady=Object.entries(c?.requires?.skills||{}).every(([id,tier])=>Progression.tierFor(s,id)>=Math.min(4,tier+Math.floor(job.level/2)));
    if (job.performance >= 80 && job.years >= job.level * 3 && job.level < 5 && trainingReady) {
      job.level++; job.salary = Math.round(job.salary * 1.18); job.performance = Math.max(55, job.performance - 13);
      milestone(s, 'promotion:' + job.id + ':' + job.level, 'Bir basamak yukarı', `${c?.name || 'Mesleğin'} alanında ${job.level}. kıdeme yükseldin. Yeni yıllık brüt maaşın ${fmt(Economy.salary(s,job.salary))}.`);
    }
    if (s.age === 65) log(s, 'Emekliliğe bir bakış', 'Emeklilik seçeneğini değerlendirebilirsin. Emekli gelirin çalışma sürene ve son maaşına bağlı.', 'career');
  }
  function selectEvent(s) {
    const matchingNpcs = e => s.npcs.filter(n => hasRole(n, e.npcRole || e.requires?.npcRole) && (e.npcMinAge === undefined || n.age >= e.npcMinAge) && (e.npcMaxAge === undefined || n.age <= e.npcMaxAge));
    const ready = s.scheduled.filter(e => e.age <= s.age);
    for (const scheduled of ready) {
      const e = get('events', scheduled.id);
      if (!e) { s.scheduled = s.scheduled.filter(x => x !== scheduled); continue; }
      if (!requirementReason(s, { minAge: e.minAge, maxAge: e.maxAge, npcRole: e.npcRole, ...(e.requires || {}) }) && e.choices?.some(c => !choiceReason(s, c)) && (!(e.npcRole || e.requires?.npcRole) || matchingNpcs(e).length)) {
        s.scheduled = s.scheduled.filter(x => x !== scheduled);
        const npc = scheduled.npcId && s.npcs.find(n => n.id === scheduled.npcId && n.alive);
        return { id: e.id, ...(npc ? { npcId: npc.id } : {}) };
      }
      if (s.age - scheduled.age > 5) s.scheduled = s.scheduled.filter(x => x !== scheduled);
    }
    const candidates = dataList('events').filter(e => {
      if (e.triggeredOnly || (e.once && s.seenEvents[e.id] !== undefined)) return false;
      if (requirementReason(s, { minAge: e.minAge, maxAge: e.maxAge, npcRole: e.npcRole, ...(e.requires || {}) })) return false;
      if ((e.npcRole || e.requires?.npcRole) && !matchingNpcs(e).length) return false;
      if (s.seenEvents[e.id] !== undefined && s.age - s.seenEvents[e.id] < (e.cooldown || 4)) return false;
      return e.choices?.some(c => !choiceReason(s, c));
    });
    const selected = weighted(s, candidates);
    if (!selected) return null;
    const role = selected.npcRole || selected.requires?.npcRole;
    const npc = role ? pick(s, matchingNpcs(selected)) : null;
    return { id: selected.id, ...(npc ? { npcId: npc.id } : {}) };
  }

  function ageUp(s) {
    const b = budget(s), discretionaryIncome = s.year.income, discretionaryExpenses = s.year.expenses,paidEarlier=s.year.debtPaid||0;
    earn(s, b.income, true); charge(s, b.expenses, true, true);
    const principal=Math.min(b.debtPrincipal,s.money,s.debt);s.money-=principal;s.debt-=principal;
    s.lastBudget = { ...b, age: s.age, income: b.income + discretionaryIncome, expenses: b.expenses + discretionaryExpenses, net: b.net + discretionaryIncome - discretionaryExpenses, debtPaid:principal+paidEarlier, cashFlow:b.net+discretionaryIncome-discretionaryExpenses-principal-paidEarlier, endingCash: s.money, endingDebt: s.debt };
    s.age++;
    log(s, 'Yeni yaş, yeni sayfa', `${s.age} yaşındasın. Geçen yılın toplam geliri ${fmt(s.lastBudget.income)}, gideri ${fmt(s.lastBudget.expenses)}.${s.debt ? ` Borcun ${fmt(s.debt)}.` : ''}`, 'year');
    for(const entry of Economy.annual(s,random))log(s,entry.title,entry.text,entry.kind);
    annualHealth(s); annualNpc(s);
    for(const entry of Relationships.annual(s)){log(s,entry.title,entry.text,entry.kind);queueNotice(s,'relationship:'+entry.npcId,entry.title,entry.text,'İlişkiler menüsündeki söz ve anı kartlarını takip edebilirsin.');}
    if (!s.alive) return { ok: true, message: 'Bir ömür tamamlandı. Hayatının özetini inceleyebilirsin.' };
    for(const entry of Progression.annual(s))milestone(s,entry.id,entry.title,entry.text);
    annualEducation(s); annualJob(s);
    for (const inv of s.inventory) {
      const item = get('items', inv.id);
      if (!item || item.consumable) continue;
      inv.condition = Math.max(0, inv.condition - (item.conditionLoss ?? (item.category === 'property' ? 1 : 5)));
      if (inv.condition === 0) log(s, 'Bir eşyan ömrünü tamamladı', `${item.name} artık kullanılamıyor. İlgili etkinlikler için yenisini edinmelisin.`, 'inventory');
    }
    s.inventory = s.inventory.filter(i => i.condition > 0);
    if (s.lifestyle.housing === 'own' && !hasItem(s, 'apartment')) s.lifestyle.housing = 'shared';
    if (s.age === 18) milestone(s, 'adult', 'Kendi kararların, kendi bütçen', 'Yetişkin oldun. Gelecek yılın giderleri artık sana ait. İş, eğitim ve barınma seçeneklerini planla.');
    resetYear(s);
    activateEncounter(s);
    const memoryEvent=Relationships.candidate(s);
    if(!s.pending)s.pending=memoryEvent&&(/^memory_.*promise|memory_promise/.test(memoryEvent.id)||random(s)<.4)?memoryEvent:selectEvent(s);
    return { ok: true, message: s.pending ? 'Yeni yaşında bir karar seni bekliyor.' : `${s.age} yaşındasın. Yeni bir yıl seni bekliyor.` };
  }
  function resolveChoice(s, index) {
    if (!s.pending) return { ok: false, message: 'Şu anda bekleyen bir olay yok.' };
    const event = get('events', s.pending.id), choice = event?.choices?.[index];
    const reason = choiceReason(s, choice);
    if (reason) return { ok: false, message: reason };
    const pending = s.pending;
    const npcName = s.npcs.find(n => n.id === pending.npcId)?.name || 'Yakının';
    charge(s, costOf(s,choice));s.year.energy-=choice.energy||0;
    applyEffects(s, choice.effects || choice.effect, pending.npcId,{source:'event'});
    let outcome = choice.outcome || 'Kararının etkileri hayatına işlendi.';
    if (choice.chance) {
      const ch = choice.chance;
      const success = ch.stat ? s.stats[ch.stat] + int(s, -20, 20) >= (ch.target ?? 45) : random(s) < (ch.probability ?? .5);
      const result = success ? ch.success || choice.success : ch.failure || choice.failure;
      if (result) { applyEffects(s, result.effects || result, pending.npcId,{source:'event'}); if (result.text || result.outcome) outcome = result.text || result.outcome; }
    }
    const schedules = [].concat(choice.schedule || []);
    for (const e of schedules) if (e && get('events', e.id) && !s.scheduled.some(x => x.id === e.id)) s.scheduled.push({ id: e.id, age: s.age + Math.max(1, e.after || 1), npcId: pending.npcId });
    s.seenEvents[event.id] = s.age;
    s.pending = null;
    outcome = outcome.replaceAll('{npc}', npcName).replaceAll('{name}', s.name);
    log(s, event.title.replaceAll('{npc}', npcName), `${choice.label || choice.text}: ${outcome}`, 'decision');
    checkDeath(s);
    activateEncounter(s);
    return { ok: true, message: outcome };
  }
  function lifestyleReason(s, key, value) {
    const reason = availability(s);
    if (reason) return reason;
    const allowed = { diet: ['frugal', 'balanced', 'quality'], pace: ['relaxed', 'balanced', 'ambitious'], housing: ['family', 'shared', 'rent', 'own'] };
    if (!allowed[key]?.includes(value)) return 'Bu yaşam düzeni bulunamadı.';
    if (s.age < 18 && key !== 'pace') return 'Beslenme ve barınma kararları 18 yaşında açılır.';
    if (key === 'housing' && value === 'family' && !livingParents(s).length) return 'Aile evinde kalma imkânın yok.';
    if (key === 'housing' && value === 'own' && !hasItem(s, 'apartment')) return 'Önce bir daire satın almalısın.';
    if (key === 'housing' && s.lifestyle.housing !== value && s.money < Economy.moveCost(s,value)) return `Taşınma ve yerleşme için ${fmt(Economy.moveCost(s,value))} gerekiyor.`;
    if (s.year.used['lifestyle:' + key] && s.lifestyle[key] !== value) return 'Bu yaşam düzenini yılda bir kez değiştirebilirsin.';
    return '';
  }

  function act(s, type, payload = {}) {
    if(type==='ackNotice'){
      if(!s||!Array.isArray(payload.ids))return {ok:false,message:'Bildirim bulunamadı.'};
      s.notices=s.notices.filter(n=>!payload.ids.includes(n.id));return {ok:true,message:''};
    }
    const reason = availability(s, type === 'choice');
    if (reason) return { ok: false, message: reason };
    if (type === 'age') return ageUp(s);
    if (type === 'choice') return resolveChoice(s, payload.index);
    if (type === 'activity') {
      const a = get('actions', payload.id), why = actionReason(s, a);
      if (why) return { ok: false, message: why };
      const preview=activityPreview(s,a),projectComplete=a.project&&s.flags[a.project.flag];
      charge(s, costOf(s, a)); s.year.energy -= a.energy || 1; s.year.used[a.id] = (s.year.used[a.id] || 0) + 1;
      const activityEffects = {...preview.effects};
      if (['doctor', 'public_clinic'].includes(a.id)) delete activityEffects.cure;
      applyEffects(s, activityEffects,undefined,{source:'activity',adjusted:true,adjustedMoney:true,taxable:a.id!=='public_aid'});
      for(const entry of Progression.activity(s,a,{repeat:preview.repeat,preview}))milestone(s,entry.id,entry.title,entry.text);
      if(a.project&&!projectComplete){s.flags[a.project.flag]=true;milestone(s,'project:'+a.id,a.project.title,a.project.text);}
      if (a.special === 'treatment' || ['doctor', 'public_clinic'].includes(a.id)) treat(s, a.id === 'public_clinic');
      if ((a.meetChance || a.meet) && random(s) < (a.meetChance || a.meet)) meet(s, a.name, a.meetRole);
      const message = a.outcome || `${a.name} için zaman ayırdın.`;
      log(s, a.name, message, a.category === 'health' ? 'health' : 'activity'); checkDeath(s);
      activateEncounter(s);return { ok: true, message };
    }
    if (type === 'buy') {
      const item = get('items', payload.id), why = buyReason(s, item);
      if (why) return { ok: false, message: why };
      charge(s, Economy.price(s,item.price)); s.inventory.push({ id: item.id, condition: 100 });
      if (!item.consumable && !s.flags['purchased:' + item.id]) { applyEffects(s, item.bonus || {},undefined,{source:'item'}); s.flags['purchased:' + item.id] = true; }
      if (item.id === 'apartment') milestone(s, 'homeowner', 'Anahtarlar elinde', 'İlk evini satın aldın. Yaşam düzeninden kendi evine taşınabilirsin.');
      log(s, 'Yeni bir eşya', `${item.name} aldın. ${fmt(Economy.price(s,item.price))} harcadın.`, 'inventory'); return { ok: true, message: `${item.name} envanterine eklendi.` };
    }
    if (type === 'sell') {
      const index = s.inventory.findIndex(i => i.id === payload.id);
      if (index < 0) return { ok: false, message: 'Bu eşyaya sahip değilsin.' };
      const inv = s.inventory[index], item = get('items', inv.id), value = itemValue(s, inv);
      if (!value) return { ok: false, message: 'Bu eşya satılamaz.' };
      if (inv.id === 'apartment' && s.lifestyle.housing === 'own') return { ok: false, message: 'Evini satmadan önce başka bir yere taşınmalısın.' };
      s.inventory.splice(index, 1); earn(s, value); log(s, 'Bir eşyaya veda', `${item.name} sattın; ${fmt(value)} elde ettin.`, 'inventory'); return { ok: true, message: `${fmt(value)} hesabına eklendi.` };
    }
    if (type === 'use') {
      const index = s.inventory.findIndex(i => i.id === payload.id), item = get('items', payload.id);
      if (index < 0 || !item?.consumable) return { ok: false, message: 'Kullanılabilir bir tüketim eşyası seçmelisin.' };
      if ((s.year.used['use:' + item.id] || 0) >= 2) return { ok: false, message: 'Bu ürünü bu yıl daha fazla kullanamazsın.' };
      s.inventory.splice(index, 1); s.year.used['use:' + item.id] = (s.year.used['use:' + item.id] || 0) + 1;
      applyEffects(s, item.effects || item.bonus || {});
      if (item.id === 'medicine' || item.special === 'medicine') s.conditions.forEach(c => { c.severity = Math.max(1, c.severity - 1); if (c.chronic) c.managedUntil = s.age + 1; });
      log(s, 'Kendine bakım', `${item.name} kullandın.`, 'health'); checkDeath(s); return { ok: true, message: `${item.name} kullanıldı.` };
    }
    if (type === 'social') return doSocial(s, payload.id, payload.interaction);
    if (type === 'enroll') {
      const c = get('courses', payload.id), why = courseReason(s, c);
      if (why) return { ok: false, message: why };
      s.year.energy--; s.education.courseId = c.id; s.education.yearsLeft = c.duration || 4; s.education.level = c.type === 'vocational' ? 'vocational' : 'university';
      updateTimeBudget(s);
      s.education.scholarship = Math.max(s.education.scholarship || 0, s.education.grade >= 85 && s.stats.knowledge >= 60 ? .8 : s.education.grade >= 75 ? .4 : 0);
      const message = `${c.name} programına kaydoldun. Süre: ${c.duration || 4} yıl.${s.education.scholarship ? ` %${Math.round(s.education.scholarship * 100)} burs kazandın.` : ''} Öğrenim ücreti her yıl bütçene yansıyacak.`;
      log(s, 'Yeni bir eğitim yolu', message, 'education');queueNotice(s,'enrolled:'+c.id,'Yeni bir eğitim yolu',message,'Ders çalışarak ve alanındaki projelerle ilerle. Eğitim yılda 2 serbest zaman puanı ayırır; burs sonrası yıllık ücretini Gelecek ekranında görebilirsin.'); return { ok: true, message };
    }
    if (type === 'apply') {
      const c = get('careers', payload.id), why = careerReason(s, c);
      if (why) return { ok: false, message: why };
      s.year.energy--; s.year.used['apply:' + c.id] = 1;s.year.used.jobApplications=(s.year.used.jobApplications||0)+1;
      const referral=s.flags.careerReferral,hasReferral=referral&&!referral.consumed&&referral.expiresAge>=s.age&&s.npcs.some(n=>n.id===referral.npcId&&n.alive);
      const chance=c.guaranteed?1:Math.min(.95,Economy.jobChance(s,c)+(hasReferral ? .15 : 0));
      if(hasReferral)referral.consumed=true;
      if (random(s) > chance) { log(s, 'Bir başvurunun sonucu', `${c.name} başvurun bu yıl kabul edilmedi. Diğer ilanları deneyebilirsin.`, 'career'); return { ok: true, message: 'Mülakat olumlu sonuçlanmadı. Gelecek yıl yeniden deneyebilirsin.' }; }
      s.job = { id: c.id, level: 1, performance: 55, years: 0, salary: c.salary };
      updateTimeBudget(s);
      milestone(s, 'first-job', 'İlk maaşına doğru', 'İlk tam zamanlı işine kabul edildin. Maaşın yılı ilerlettiğinde, yıllık giderlerle birlikte hesaplanacak.');
      log(s, 'İşe kabul edildin', `${c.name} olarak çalışmaya başladın. Güncel yıllık brüt maaşın ${fmt(Economy.salary(s,c.salary))}. İş, yıl içindeki serbest zamanını da azaltır.`, 'career'); return { ok: true, message: `${c.name} olarak işe başladın.` };
    }
    if (type === 'quit') {
      if (!s.job) return { ok: false, message: 'Ayrılabileceğin bir işin yok.' };
      s.job = null;updateTimeBudget(s);applyEffects(s, { stress: -6 }); log(s, 'Yeni bir başlangıç arayışı', 'İşinden ayrıldın. Yıllık maaş gelirin durdu.', 'career'); return { ok: true, message: 'İşinden ayrıldın.' };
    }
    if (type === 'retire') {
      if (s.age < 60 || !s.job || s.flags.careerYears < 10) return { ok: false, message: 'Emeklilik için 60 yaş, bir iş ve en az 10 çalışma yılı gerekiyor.' };
      s.flags.pension = Math.round(s.job.salary * Math.min(.65, .30 + s.flags.careerYears * .007)); s.flags.retired = true; s.job = null;
      updateTimeBudget(s);
      applyEffects(s, { stress: -20, happiness: 7 }); milestone(s, 'retirement', 'Kendine ayıracak zaman', `${fmt(Economy.salary(s,s.flags.pension))} yıllık emekli geliriyle yeni bir döneme başladın.`);queueNotice(s,'retirement','Mesai saati artık senin', 'Emekliliğe adım attın. Maaşın yerini çalışma sürene bağlı emekli geliri aldı.', 'Varlıklar menüsünde yeni bütçeni incele. Açılan zamanı projelere, sağlığına ve sevdiklerine ayırabilirsin.'); return { ok: true, message: 'Emekli oldun. Yeni dönemin bütçesi hazır.' };
    }
    if (type === 'lifestyle') {
      const why = lifestyleReason(s, payload.key, payload.value);
      if (why) return { ok: false, message: why };
      if (s.lifestyle[payload.key] === payload.value) return { ok: false, message: 'Bu düzen zaten seçili.' };
      if (payload.key === 'housing') charge(s, Economy.moveCost(s,payload.value));
      s.lifestyle[payload.key] = payload.value; s.year.used['lifestyle:' + payload.key] = 1;
      if (payload.key === 'pace') { const before = s.year.maxEnergy, after = maxEnergy(s); s.year.maxEnergy = after; s.year.energy = Math.max(0, s.year.energy + after - before); }
      log(s, 'Yaşam düzenin değişti', 'Yeni seçimlerinin yıllık sağlık, zaman ve bütçe etkileri planına işlendi.', 'life'); return { ok: true, message: 'Yaşam düzenin güncellendi.' };
    }
    if (type === 'appearance') {
      const allowed = { hair: ['none', 'short', 'buzz', 'curl', 'wave', 'long', 'bob', 'bald'], beard: ['none', 'stubble', 'full'] };
      const validColor = ['skin', 'color'].includes(payload.key) && /^#[0-9a-f]{6}$/i.test(payload.value);
      if (!validColor && !allowed[payload.key]?.includes(payload.value)) return { ok: false, message: 'Bu görünüm seçeneği bulunamadı.' };
      if (payload.key === 'beard' && payload.value !== 'none' && s.age < 16) return { ok: false, message: 'Sakal seçenekleri 16 yaşında açılır.' };
      s.appearance[payload.key] = payload.value; return { ok: true, message: 'Görünümün güncellendi.' };
    }
    if (type === 'repay') {
      const amount = Math.min(cash(payload.amount), s.debt, s.money);
      if (!amount) return { ok: false, message: 'Ödemek için hem borcun hem de nakdin olmalı.' };
      s.money-=amount;s.debt -= amount;s.year.debtPaid=(s.year.debtPaid||0)+amount; log(s, 'Borçlarını hafiflettin', `${fmt(amount)} anapara ödedin. Kalan borç: ${fmt(s.debt)}.`, 'finance'); return { ok: true, message: `${fmt(amount)} borç ödendi.` };
    }
    return { ok: false, message: 'Bu işlem bulunamadı.' };
  }

  function migrate(old) {
    if (!old || typeof old !== 'object' || Array.isArray(old)) return null;
    const s = newLife({ name: old.name, gender: old.gender, seed: old.seed ?? 20260908 });
    if (old.version === 3) {
      for (const key of ['age', 'alive', 'deathCause', 'money', 'debt', 'rng', 'pending', 'lastBudget', 'city']) if (old[key] !== undefined) s[key] = old[key];
      for (const key of ['stats', 'family', 'education', 'flags', 'appearance', 'lifestyle']) if (old[key] && typeof old[key] === 'object') Object.assign(s[key], old[key]);
      for (const key of ['npcs', 'inventory', 'conditions', 'scheduled', 'log', 'milestones']) if (Array.isArray(old[key])) s[key] = old[key];
      s.notices=Array.isArray(old.notices)?old.notices:[];s.encounters=Array.isArray(old.encounters)?old.encounters:[];
      s.seenEvents = old.seenEvents && typeof old.seenEvents === 'object' ? old.seenEvents : {};
      s.job = old.job && get('careers', old.job.id) ? { id: old.job.id, level: clamp(old.job.level, 1, 5), performance: clamp(old.job.performance), years: cash(old.job.years), salary: cash(old.job.salary) } : null;
      s.year = old.year && typeof old.year === 'object' ? { ...s.year, ...old.year, used: { ...(old.year.used || {}) }, social: { ...(old.year.social || {}) } } : s.year;
    } else {
      s.age = old.age || 0; s.money = Math.max(0, number(old.money)); s.debt = Math.max(0, -number(old.money));
      for (const key of Object.keys(STAT_NAMES)) s.stats[key] = key === 'stress' ? 15 : clamp(old[key] ?? s.stats[key]);
      s.inventory = (old.owned || []).filter(id => get('items', id)).map(id => ({ id, condition: 100 }));
      s.inventory.forEach(i => { s.flags['purchased:' + i.id] = true; });
      s.education.grade = clamp(old.school || 50); s.education.level = s.age < 6 ? 'none' : s.age < 11 ? 'primary' : s.age < 14 ? 'middle' : s.age < 18 ? 'high' : 'graduate';
      s.appearance.hair = old.hair === 'buzz' ? 'buzz' : old.hair === 'long' ? 'long' : old.hair === 'curl' ? 'curl' : 'short'; s.appearance.beard = ['none', 'full', 'stubble'].includes(old.beard) ? old.beard : 'none';
      if (Array.isArray(old.relations) && old.relations.length) s.npcs = old.relations.map((n, i) => ({ id: n.id || 'legacy-' + i, name: String(n.name || 'Tanıdık'), gender: n.role === 'Anne' ? 'female' : 'male', age: number(n.age, s.age), role: n.role === 'Anne' ? 'mother' : n.role === 'Baba' ? 'father' : 'friend', personality: n.personality || 'Sıcakkanlı', bond: clamp(n.bond), health: 80, alive: true, job: n.job || 'İş arıyor', income: cash(n.income) }));
      s.flags.npcCounter = s.npcs.length;
      const career = dataList('careers').find(c => c.name === old.occupation);
      if (career && s.age >= 18) s.job = { id: career.id, level: 1, performance: 55, years: 0, salary: career.salary };
      s.log = (old.events || []).map(e => ({ age: number(e.age), title: 'Eski hayatından bir anı', text: String(e.text || ''), kind: 'life' }));
      (old.illnesses || []).forEach((name, i) => s.conditions.push({ id: /grip/i.test(name) ? 'flu' : 'legacy-' + i, name: String(name), severity: 2, chronic: false, since: s.age, managedUntil: -1 }));
      (old.tags || []).forEach(t => { s.flags[t] = true; });
      resetYear(s); s.year.energy = Math.max(0, s.year.energy - cash(old.actionsUsed));
      log(s, 'Hayatın yeni bir döneme geçiyor', 'Önceki kaydın aktarıldı. Sağlık, ilişkiler ve yıllık bütçe artık yeni kurallarla ilerliyor.', 'milestone');
    }
    s.version = 3; s.age = Math.round(clamp(s.age, 0, 120)); s.alive = s.alive !== false; s.money = cash(s.money); s.debt = cash(s.debt); s.rng = seedNumber(s.rng);
    for (const key of Object.keys(STAT_NAMES)) s.stats[key] = clamp(s.stats[key]);
    s.education.grade = clamp(s.education.grade); s.education.degrees = Array.isArray(s.education.degrees) ? s.education.degrees : [];
    s.education.yearsLeft = Math.round(clamp(s.education.yearsLeft, 0, 10)); s.education.scholarship = clamp(s.education.scholarship, 0, 1);
    if (!get('courses', s.education.courseId)) s.education.courseId = null;
    s.family.generosity = clamp(s.family.generosity, 0, 100);
    s.npcs = s.npcs.filter(n => n && typeof n === 'object').map((n, i) => ({ ...n, id: String(n.id || 'restored-' + i), name: String(n.name || 'Tanıdık').slice(0, 40), age: Math.round(clamp(n.age, 0, 125)), bond: clamp(n.bond), health: clamp(n.health), income: cash(n.income), alive: n.alive !== false }));
    for(const npc of s.npcs)Relationships.migrateNpc(s,npc);
    s.progression=Progression.migrate(s,old.progression);Economy.migrate(s,old.economy);
    s.inventory = s.inventory.filter(i => i && get('items', i.id)).map(i => ({ id: i.id, condition: clamp(i.condition) })).filter(i => i.condition > 0);
    s.conditions = s.conditions.filter(c => c && c.id).map(c => ({ ...c, severity: clamp(c.severity, 1, 5), since: number(c.since, s.age), managedUntil: number(c.managedUntil, -1) }));
    s.scheduled = s.scheduled.filter(e => e && get('events', e.id)).map(e => ({ ...e, age: Math.round(clamp(e.age, 0, 125)) }));
    if (!s.pending || !get('events', s.pending.id) || !s.alive) s.pending = null;
    s.flags.npcCounter = Math.max(cash(s.flags.npcCounter), s.npcs.length); s.flags.careerYears = cash(s.flags.careerYears);
    s.year.maxEnergy = Math.round(clamp(s.year.maxEnergy, 2, 9)); s.year.energy = Math.round(clamp(s.year.energy, 0, s.year.maxEnergy)); s.year.income = cash(s.year.income); s.year.expenses = cash(s.year.expenses);s.year.taxableIncome=cash(s.year.taxableIncome);s.year.debtPaid=cash(s.year.debtPaid);
    if(old.balanceVersion!==2){updateTimeBudget(s);queueNotice(s,'new-balance','Hayatın yeni dengesi','Eski puanların, paran ve ilişkilerin korundu. Yeni kazanımlar artık kademeli; uzmanlık, aile bütçesi ve şehir giderleri etkili.','Yeni dengeyi doğumdan deneyimlemek için önce hayatını dosyaya kaydedip yeni bir hayat başlatabilirsin. Devam etmek de mümkün.');}
    s.balanceVersion=2;
    s.notices=s.notices.filter(n=>n&&typeof n.id==='string'&&typeof n.title==='string').slice(-30).map(n=>({id:n.id.slice(0,120),age:number(n.age,s.age),title:n.title.slice(0,160),text:String(n.text||'').slice(0,1500),tip:String(n.tip||'').slice(0,700)}));
    s.encounters=s.encounters.filter(n=>n&&get('events',n.id)&&s.npcs.some(p=>p.id===n.npcId&&p.alive)).slice(0,12).map(n=>({id:n.id,npcId:n.npcId}));
    if(s.pending?.npcId&&!s.npcs.some(n=>n.id===s.pending.npcId&&n.alive))s.pending=null;
    activateEncounter(s);
    s.log = s.log.filter(e => e && typeof e === 'object').slice(-800); s.milestones = s.milestones.filter(m => m && typeof m === 'object');
    familyUpdate(s);
    return s;
  }

  return { newLife, migrate, act, actionReason, choiceReason, careerReason, courseReason, socialReason, buyReason, lifestyleReason, budget, stage, occupation, itemValue, costOf, requirements: requirementReason, maxEnergy,activityPreview,effectPreview,eventById:id=>get('events',id),price:Economy.price,salary:Economy.salary,progression:Progression.overview,relationship:Relationships.overview,economy:s=>Economy.summary(s,Data),housingForecast:s=>Economy.forecasts(s,Data),trainingEfficiency:Progression.efficiency };
});
