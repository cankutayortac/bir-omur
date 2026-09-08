(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LifePaths = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Life paths track commitments, not a second currency or a replacement diploma.
  // The engine owns prices, stat curves, time, chance rolls and NPC creation.
  const definitions = [
    { id: 'academic', name: 'Meraktan mesleğe', icon: '🔬', minAge: 10, category: 'learning', skill: 'academic',
      description: 'Bir soruyu araştır; eleştirilerden geçip araştırma ya da bilim anlatıcılığına yönel.',
      branches: { research: 'Araştırma', teaching: 'Bilim anlatıcılığı' },
      start: ['Araştırma grubuna katıl', 'Kütüphanedeki açık gruba katıl. Diploma, bilgisayar ve parlak bir özgeçmiş gerekmiyor; bir soru yeter.'],
      practice: ['Saha notları tut', 'Ücretsiz kaynaklarla küçük bir soruyu incele. İlk sunum için iki farklı yılda çalışma gerekir.'],
      submit: ['İlk araştırmanı sunuma gönder', 'Notlarını bir dosyada birleştir. Değerlendirme gelecek yıl; tek seferde bilim insanı olunmuyor.'],
      develop: ['Araştırma yoluna zaman ayır', 'Kaynak kontrolü, veri toplama ve anlatım provası yap. Bu yıl bir gelişim adımı sayılır.'],
      launch: ['Araştırma dosyanı işe dönüştür', 'Yetişkinlikte, yıllara yayılan dosyan için ücretli proje ya da topluma katkı seçeneklerini değerlendir.'],
      work: ['Küçük araştırma işi al', 'Tamamladığın yolun deneyimiyle sınırlı bir proje üstlen. Düzenli maaş ya da akademik unvan sağlamaz.'],
      practiceEffects: { knowledge: 3, grade: 1, stress: 2 }, developEffects: { knowledge: 4, stress: 3 }, wage: 4500,
      professional: { research: { items: ['laptop'], stats: { knowledge: 42 }, skills: { academic: 1 } }, teaching: { stats: { knowledge: 28 }, skills: { academic: 1 } } }
    },
    { id: 'athletics', name: 'Parktan kürsüye', icon: '🏅', minAge: 8, category: 'outdoors', skill: 'athletics',
      description: 'Düzenli antrenmandan ilk seçmeye; yarışmacılık veya topluluk sporu arasında kendi temponu bul.',
      branches: { competition: 'Yarışmacılık', coaching: 'Topluluk sporu' },
      start: ['Mahalle spor grubuna katıl', 'Parktaki ücretsiz başlangıç grubuna katıl. İlk günün hedefi rekor değil, ertesi yıl da gelebilmek.'],
      practice: ['Temel kondisyon çalış', 'Yürüyüş, denge ve hafif kuvvet çalış. İlk seçme için iki farklı yılda antrenman gerekir.'],
      submit: ['İlk spor seçmesine başvur', 'Antrenman geçmişinle yerel seçmeye başvur. Sonuç gelecek yıl belli olur.'],
      develop: ['Sezon planını uygula', 'Teknik, toparlanma ve takım çalışmasına zaman ayır. Bir yılda bir hazırlık adımı sayılır.'],
      launch: ['Spor deneyimini sahaya taşı', 'Yetişkinlikte yarış desteği veya topluluk etkinliği işi için hazırlığını sun. Sağlığını ve ekipmanını kontrol et.'],
      work: ['Yerel spor etkinliğinde çalış', 'Organizasyon ve saha desteğiyle ek gelir kazan. Bu iş, spor eğitmenliği diplomasının yerine geçmez.'],
      practiceEffects: { strength: 3, health: 2, stress: -2 }, developEffects: { strength: 4, health: 1, stress: 2 }, wage: 4000,
      professional: { competition: { items: ['shoes'], stats: { strength: 42, health: 55 }, skills: { athletics: 1 } }, coaching: { stats: { strength: 25, health: 40 }, skills: { athletics: 1 } } }
    },
    { id: 'music', name: 'İlk notadan sahneye', icon: '🎵', minAge: 8, category: 'creative', skill: 'creative',
      description: 'Ortak prova odasından ilk dinleyiciye; sahne veya bestecilik arasında yıllara yayılan bir müzik yolu.',
      branches: { stage: 'Canlı sahne', writing: 'Beste ve ses işleri' },
      start: ['Açık müzik atölyesine katıl', 'Belediyenin atölyesinde ritim ve ses çalış. Kendi gitarın yoksa ortak araçlarla başlayabilirsin.'],
      practice: ['Ortak atölyede prova yap', 'Ritim, ses ve ödünç enstrümanlarla çalış. İlk dinleti için iki farklı yılda prova gerekir.'],
      submit: ['İlk dinletiye başvur', 'Kısa bir prova kaydıyla yerel dinletiye başvur. Sahne sırası gelecek yıl geliyor.'],
      develop: ['Repertuvarını geliştir', 'Atölyede yorumunu, bestenin yapısını ve birlikte çalmayı çalış. Bu yıl bir gelişim adımı sayılır.'],
      launch: ['Müzik dosyanı işe sun', 'Yetişkinlikte kısa sahne işi veya ortak stüdyoda beste siparişi almayı dene. Şöhret garantisi yok.'],
      work: ['Küçük müzik işi al', 'Bir etkinliğe ya da kısa ses işine emek ver. Gelir yıllık bir maaş değil, sınırlı bir işin ücretidir.'],
      practiceEffects: { happiness: 3, stress: -2 }, developEffects: { happiness: 3, stress: 3 }, wage: 4500,
      professional: { stage: { items: ['guitar'], skills: { creative: 1 } }, writing: { stats: { knowledge: 20 }, skills: { creative: 1 } } }
    }
  ];
  const IDS = definitions.map(d => d.id);
  const STAGES = ['idle', 'preparation', 'opportunity', 'setback', 'specialization', 'development', 'checkpoint', 'finale', 'completed'];
  const STAGE_NAMES = { idle: 'Henüz başlamadın', preparation: 'Temel hazırlık', opportunity: 'İlk fırsat', setback: 'Yeniden yön bulma', specialization: 'Yol ayrımı', development: 'Alanında gelişim', checkpoint: 'Zaman ve öncelikler', finale: 'Yetişkinlik fırsatı', completed: 'Tamamlanan yol' };
  const def = id => definitions.find(d => d.id === id);
  const ageOf = s => Math.max(0, Math.min(130, Math.floor(Number(s?.age) || 0)));
  const safeText = (value, max = 400) => typeof value === 'string' ? value.slice(0, max) : '';
  const numericAge = value => value !== null && value !== '' && Number.isFinite(Number(value)) ? Math.max(0, Math.min(150, Math.floor(Number(value)))) : null;
  const command = (id, type, extra = {}) => ({ pathCommand: { id, type, ...extra } });
  const actionId = (id, type) => `path_${id}_${type}`;
  const eventId = (id, stage) => `path_${id}_${stage}`;
  const yearsNeeded = record => record.tempo === 'focused' ? 2 : 3;
  function freshRoute() {
    return { stage: 'idle', startedAge: null, practiceYears: [], developmentYears: [], submittedAge: null, specializedAge: null,
      dueAge: null, branch: null, firstResult: null, outcome: null, completedAge: null, npcId: null,
      checkpointDone: false, tempo: 'balanced', attempts: 0, lastWorkAge: null, choices: [], history: [] };
  }
  function create() { return { version: 1, pinned: null, routes: Object.fromEntries(IDS.map(id => [id, freshRoute()])) }; }
  function recordFor(s, id) { return s?.lifePaths?.routes?.[id] || freshRoute(); }

  function migrate(s, old) {
    const clean = create(), age = ageOf(s);
    if (!old || typeof old !== 'object') return clean;
    clean.pinned = IDS.includes(old.pinned) ? old.pinned : null;
    for (const d of definitions) {
      const input = old.routes?.[d.id];
      if (!input || typeof input !== 'object' || !STAGES.includes(input.stage) || input.stage === 'idle' || age < d.minAge) continue;
      const r = freshRoute();
      r.stage = input.stage;
      r.startedAge = Math.max(d.minAge, Math.min(age, numericAge(input.startedAge) ?? age));
      const years = values => [...new Set((Array.isArray(values) ? values : []).map(numericAge).filter(y => y !== null && y >= r.startedAge && y <= age))].sort((a, b) => a - b).slice(-130);
      r.practiceYears = years(input.practiceYears);
      r.developmentYears = years(input.developmentYears);
      for (const key of ['submittedAge', 'specializedAge', 'completedAge', 'lastWorkAge']) {
        const value = numericAge(input[key]); r[key] = value === null ? null : Math.max(r.startedAge, Math.min(age, value));
      }
      r.dueAge = numericAge(input.dueAge);
      r.branch = Object.hasOwn(d.branches, input.branch) ? input.branch : null;
      r.firstResult = ['success', 'setback', 'alternative'].includes(input.firstResult) ? input.firstResult : null;
      r.outcome = ['professional', 'community'].includes(input.outcome) ? input.outcome : null;
      r.npcId = safeText(input.npcId, 100) || null;
      r.checkpointDone = input.checkpointDone === true;
      r.tempo = input.tempo === 'focused' ? 'focused' : 'balanced';
      r.attempts = Math.max(0, Math.min(100, Math.floor(Number(input.attempts) || 0)));
      r.choices = (Array.isArray(input.choices) ? input.choices : []).filter(c => c && typeof c.id === 'string').slice(-40).map(c => ({ age: Math.min(age, numericAge(c.age) ?? age), id: safeText(c.id, 80) }));
      r.history = (Array.isArray(input.history) ? input.history : []).filter(h => h && typeof h.text === 'string').slice(-40).map(h => ({ age: Math.min(age, numericAge(h.age) ?? age), text: safeText(h.text) }));
      // A partial save must always recover to a chapter that can be completed.
      if (['development', 'checkpoint', 'finale', 'completed'].includes(r.stage) && !r.branch) r.stage = 'specialization';
      if (r.stage === 'completed' && age < 18) { r.stage = 'development'; r.outcome = null; r.completedAge = null; }
      if (r.stage === 'completed' && !r.outcome) r.outcome = 'community';
      if (['opportunity', 'setback', 'specialization', 'checkpoint', 'finale'].includes(r.stage)) r.dueAge ??= age;
      else r.dueAge = null;
      if (r.stage === 'finale') r.dueAge = Math.max(18, r.dueAge);
      clean.routes[d.id] = r;
    }
    return clean;
  }

  const actions = definitions.flatMap(d => {
    const make = (type, energy, effects, extra = {}) => ({ id: actionId(d.id, type), name: d[type][0], description: d[type][1],
      icon: d.icon, category: d.category, minAge: d.minAge, energy, cost: 0, perYear: 1,
      effects: { ...effects, ...command(d.id, type) }, pathId: d.id, ...extra });
    return [
      make('start', 1, { happiness: 2 }, { pathStart: d.id }),
      make('practice', 1, d.practiceEffects, { skillXP: { [d.skill]: 8 } }),
      make('submit', 1, { stress: 2 }),
      make('develop', 2, d.developEffects, { skillXP: { [d.skill]: 12, social: 2 } }),
      make('launch', 1, { stress: 2 }, { minAge: 18 }),
      make('work', 2, { money: d.wage, taxable: true, stress: 5 }, { minAge: 18, category: 'work', skillXP: { [d.skill]: 5 }, requires: { skills: { [d.skill]: 1 } } })
    ];
  });

  function choice(id, stage, label, outcome, effects, extra = {}) {
    return { label, outcome, effects, pathGuard: { id, stage }, ...extra };
  }
  function event(id, stage, title, text, choices) {
    return { id: eventId(id, stage), title, text, icon: def(id).icon, minAge: stage === 'finale' ? 18 : def(id).minAge,
      maxAge: 130, triggeredOnly: true, choices };
  }
  const events = [
    event('academic', 'opportunity', 'Jüri ve biraz soğuk çay', 'İki yıla yayılan notların ilk kez başkalarının önünde. {npc}, son slayttaki dev soru işaretini görünce gülümsüyor. Jüri sonuç kadar yöntemini de soracak.', [
      choice('academic', 'opportunity', 'Bulgularını savun', 'Soruları yanıtladın.', {}, { energy: 1, requires: { items: ['book'] }, chance: { stat: 'knowledge', target: 40,
        success: { text: 'Jüri yöntemini beğendi. Küçük bir başarı belgesi kazandın; asıl kazanç, ciddiye alınan sorundu.', effects: { happiness: 5, grade: 3, skillXP: { academic: 8 }, ...command('academic', 'result', { result: 'success' }) } },
        failure: { text: 'Jüri verinin yetersiz olduğunu söyledi. Dosyan reddedildi, sen değil. Gelecek yıl geri bildirimle yönünü seçebilirsin.', effects: { happiness: -3, knowledge: 2, ...command('academic', 'result', { result: 'setback' }) } } } }),
      choice('academic', 'opportunity', 'Ödülsüz açık oturumda paylaş', 'Yarışmaya girmeden bulgularını paylaştın. Sorular, araştırmayı anlaşılır anlatmaktan hoşlandığını fark ettirdi.', { happiness: 2, skillXP: { social: 4 }, ...command('academic', 'result', { result: 'alternative' }) })
    ]),
    event('academic', 'setback', 'Kırmızı kalem dünyanın sonu değil', 'Dosyanın kenarı yorumlarla dolu. {npc}, “En azından biri sonuna kadar okumuş” diyor. Aynı yarışmaya yeniden hazırlanabilir ya da sorunu insanlara anlatmayı seçebilirsin.', [
      choice('academic', 'setback', 'Bir yeni çalışma yılıyla yeniden dene', 'Dosyanı yeniden hazırlığa aldın. Tekrar göndermeden önce yeni bir yılda saha notu tutman gerekiyor.', { stress: -2, ...command('academic', 'retry') }),
      choice('academic', 'setback', 'Açık bilim grubuna yönel', 'Yarışma yerine paylaşımı seçtin. Gelecek yıl araştırma ve bilim anlatıcılığı yollarını değerlendireceksin.', { happiness: 2, ...command('academic', 'alternative') })
    ]),
    event('academic', 'specialization', 'Bir soru, iki farklı mesai', 'Araştırma masası yeni veriler istiyor; açık bilim grubu ise “Bunu anlaşılır anlatacak biri var mı?” diye soruyor. İkisi de emek istiyor, ama aynı hayatı vaat etmiyor.', [
      choice('academic', 'specialization', 'Araştırma dosyası geliştir', 'Araştırmayı seçtin. İleride ücretli veri işi için bilgisayar ve daha güçlü zekâ gerekecek; şimdilik kütüphane yeterli.', command('academic', 'branch', { branch: 'research' })),
      choice('academic', 'specialization', 'Bilimi gündelik dile çevir', 'Bilim anlatıcılığını seçtin. Ortak kaynaklarla atölye hazırlayabilirsin; bu yol öğretmenlik diploması vermiyor.', command('academic', 'branch', { branch: 'teaching' }))
    ]),
    event('academic', 'checkpoint', 'Takvimde boşluk icat edilemiyor', 'Notların büyüyor, boş zamanın küçülüyor. {npc}, iş bölümü öneriyor. Daha yoğun bir dönemle hızlanabilir ya da ek bir yıla yayıp kaynakları paylaşabilirsin.', [
      choice('academic', 'checkpoint', 'Bu yıl odaklı çalışma dönemi ayır', 'İki zaman puanını kaynak kontrolüne verdin. Toplam iki ayrı gelişim yılıyla dosyanı yetişkinlik fırsatına taşıyabileceksin.', { stress: 5, knowledge: 2, ...command('academic', 'checkpoint', { tempo: 'focused' }) }, { energy: 2 }),
      choice('academic', 'checkpoint', 'Ortak kaynaklarla daha yavaş ilerle', 'Ek para ve zaman harcamadın. Daha dengeli planda toplam üç ayrı gelişim yılı gerekiyor; araştırma aceleye gelmeyecek.', { stress: -2, ...command('academic', 'checkpoint', { tempo: 'balanced' }) })
    ]),
    event('academic', 'finale', 'Dosyan artık bir iş öneriyor', 'Yıllara yayılan çalışma masanda duruyor. Bir kuruluş veri özeti, yerel kütüphane ise anlaşılır bir atölye istiyor. Ünvan dağıtılmıyor; teslim tarihi veriliyor.', [
      choice('academic', 'finale', 'Ücretli araştırma raporunu teslim et', 'İlk ücretli araştırma raporunu teslim ettin. Akademik ünvan almadın; gerçek bir iş örneği ve emek ücreti kazandın.', { money: 9000, taxable: true, happiness: 5, flag: 'path_research_portfolio', ...command('academic', 'finish', { outcome: 'professional' }) }, { energy: 2, requires: def('academic').professional.research, pathGuard: { id: 'academic', stage: 'finale', branch: 'research' } }),
      choice('academic', 'finale', 'Kütüphanede ücretli bilim atölyesi ver', 'Katılımcılar konuyu kendi örnekleriyle anlattı. İlk atölye ücretini aldın; öğretmenlik için hâlâ ilgili eğitim gerekiyor.', { money: 4500, taxable: true, happiness: 5, skillXP: { social: 5 }, flag: 'path_science_workshop', ...command('academic', 'finish', { outcome: 'professional' }) }, { energy: 2, requires: def('academic').professional.teaching, pathGuard: { id: 'academic', stage: 'finale', branch: 'teaching' } }),
      choice('academic', 'finale', 'Koşulları tamamlayıp gelecek yıl görüş', 'Dosyan yerinde duruyor. Ekipman, beceri veya zamanını toparlayıp gelecek yıl yeniden görüşeceksin.', command('academic', 'defer')),
      choice('academic', 'finale', 'Ücretsiz paylaş ve bu yolu kalıcı tamamla', 'Ücretli iş yerine topluma katkıyı seçtin. Sorun, notların ve sonuçların başka birinin başlangıcı oldu. Bu yol kalıcı olarak tamamlandı; ücretli finaline geri dönülmez.', { happiness: 4, flag: 'path_open_science', ...command('academic', 'finish', { outcome: 'community' }) })
    ]),
    event('athletics', 'opportunity', 'Kronometre iltifat etmiyor', 'İlk seçme günündesin. {npc}, ısınırken seninle aynı heyecanı yaşıyor. Hızlı grup dereceye bakıyor; açık parkur ise herkesin kendi temposuna yer veriyor.', [
      choice('athletics', 'opportunity', 'Derece seçmesine katıl', 'Parkuru tamamladın.', {}, { energy: 1, requires: { items: ['shoes'], stats: { health: 45 } }, chance: { stat: 'strength', target: 40,
        success: { text: 'Derecen gelişim grubuna yetti. Kürsüye değil, daha ciddi bir antrenman planına çıktın.', effects: { happiness: 5, skillXP: { athletics: 8 }, ...command('athletics', 'result', { result: 'success' }) } },
        failure: { text: 'Seçme çizgisinin gerisinde kaldın. Antrenör dinlenme ve teknik notları verdi; hızlanmanın tek yolu daha çok zorlanmak değil.', effects: { happiness: -3, stress: 2, ...command('athletics', 'result', { result: 'setback' }) } } } }),
      choice('athletics', 'opportunity', 'Derecesiz topluluk parkurunu seç', 'Kendi temponda bitirdin, geride kalana eşlik ettin. Rekor tablosuna girmedin ama sporda başka bir rol gördün.', { happiness: 3, skillXP: { social: 4 }, ...command('athletics', 'result', { result: 'alternative' }) })
    ]),
    event('athletics', 'setback', 'Dinlenme günü de programa dahil', 'Seçme sonuçları asılı. Adın üst grupta değil. {npc}, tek bir dereceye bütün kimliğini bağlamamanı hatırlatıyor. Yeniden denemek de başka rol seçmek de mümkün.', [
      choice('athletics', 'setback', 'Yeni bir sezon hazırlan', 'Bir yeni yılda temel kondisyon çalıştıktan sonra yeniden seçmeye başvurabileceksin.', { stress: -2, ...command('athletics', 'retry') }),
      choice('athletics', 'setback', 'Topluluk ekibinde devam et', 'Yarışma sonucunu geride bıraktın. Gelecek yıl yarışmacılık veya etkinlik desteği arasında yönünü seçeceksin.', { happiness: 2, ...command('athletics', 'alternative') })
    ]),
    event('athletics', 'specialization', 'Kendi derecen mi, birlikte bitirmek mi?', 'Takvim iki seçenek sunuyor: dereceli yarışlara hazırlanmak veya yeni başlayanların etkinliklerini düzenlemek. Herkesten hızlı olmakla herkese yetişmek aynı beceri değil.', [
      choice('athletics', 'specialization', 'Yarışmacı olarak hazırlan', 'Yarışmacılığı seçtin. Yetişkin ücretli etkinlikte iyi sağlık, kuvvet ve kullanılabilir spor ayakkabısı gerekecek.', command('athletics', 'branch', { branch: 'competition' })),
      choice('athletics', 'specialization', 'Topluluk sporunu örgütle', 'Yeni başlayanların yanında olmayı seçtin. İlk ücretli rolün etkinlik desteği olabilir; lisanslı antrenörlük için ayrıca eğitim almalısın.', command('athletics', 'branch', { branch: 'coaching' }))
    ]),
    event('athletics', 'checkpoint', 'Fazla antrenman, eksik hafta sonu', 'Programın başka planlarla çakışıyor. {npc}, “Kronometreyi durdurabiliyoruz ama yılı değil” diyor. Bir yoğun dönem veya fazladan bir sezon seçebilirsin.', [
      choice('athletics', 'checkpoint', 'Kontrollü yoğun hazırlık dönemi yap', 'İki zaman puanını teknik ve toparlanmaya ayırdın. Toplam iki farklı gelişim yılı yeterli olacak; bedeninin sınırlarını yine gözetmelisin.', { stress: 4, strength: 2, ...command('athletics', 'checkpoint', { tempo: 'focused' }) }, { energy: 2, requires: { stats: { health: 50 } } }),
      choice('athletics', 'checkpoint', 'Bir sezona daha yay', 'Ek bir harcama yapmadan programı uzattın. Toplam üç farklı gelişim yılı gerekiyor; acele etmemen gerilemek değil.', { stress: -3, ...command('athletics', 'checkpoint', { tempo: 'balanced' }) })
    ]),
    event('athletics', 'finale', 'Forma artık sadece hatıra değil', 'Yerel organizasyonun yetişkin katılımcı ve saha desteği aradığı haberi geldi. Yıllardır tuttuğun planlar şimdi işe yarayabilir; sağlık ve güvenlik şartları hâlâ geçerli.', [
      choice('athletics', 'finale', 'Yarış etkinliğinde destekli sporcu ol', 'Küçük bir etkinlik sözleşmesini tamamladın ve emek ücreti aldın. Bu, milli takım değil; yarışmacılık yolunda gerçek bir başlangıç.', { money: 7000, taxable: true, happiness: 5, flag: 'path_race_contract', ...command('athletics', 'finish', { outcome: 'professional' }) }, { energy: 2, requires: def('athletics').professional.competition, pathGuard: { id: 'athletics', stage: 'finale', branch: 'competition' } }),
      choice('athletics', 'finale', 'Başlangıç etkinliğinde ücretli saha desteği ver', 'Başlangıç grubunun güvenli bir günü tamamlamasına yardım ettin. Etkinlik ücretini aldın; spor eğitmenliği diploması otomatik verilmedi.', { money: 4000, taxable: true, happiness: 5, skillXP: { social: 5 }, flag: 'path_sport_organizer', ...command('athletics', 'finish', { outcome: 'professional' }) }, { energy: 2, requires: def('athletics').professional.coaching, pathGuard: { id: 'athletics', stage: 'finale', branch: 'coaching' } }),
      choice('athletics', 'finale', 'Sağlığını ve hazırlığını toparlayıp gelecek yıl dön', 'Teklif baskısıyla bedenini zorlamadın. Gelecek yıl aynı yolun yetişkinlik fırsatını yeniden değerlendirebilirsin.', command('athletics', 'defer')),
      choice('athletics', 'finale', 'Park grubuna katkıyla bu yolu kalıcı tamamla', 'Sporu gelir yerine hayatında kalıcı bir yerle ödüllendirdin. Park grubuna hazırlık notlarını bıraktın. Bu yol kalıcı olarak tamamlandı; ücretli finaline geri dönülmez.', { happiness: 4, flag: 'path_community_sport', ...command('athletics', 'finish', { outcome: 'community' }) })
    ]),
    event('music', 'opportunity', 'Mikrofon açık, dizler hafif titrek', 'İlk dinleti günündesin. {npc}, kabloları kontrol ederken “En azından elektrik bizden heyecanlı değil” diyor. Seçmeli sahne veya açık ortak prova arasında karar verebilirsin.', [
      choice('music', 'opportunity', 'Kendi gitarınla sahne seçmesine gir', 'Parçanı çaldın.', {}, { energy: 1, requires: { items: ['guitar'] }, chance: { skill: 'creative', target: 26,
        success: { text: 'Kısa bir sessizliğin ardından alkış geldi. Küçük dinleti grubuna alındın; şimdilik kulis hâlâ bir sandalye.', effects: { happiness: 5, skillXP: { creative: 8 }, ...command('music', 'result', { result: 'success' }) } },
        failure: { text: 'Bir giriş kaçtı, sonra tempo dağıldı. Seçilemedin ama kayıt, nerede çalışman gerektiğini açıkça gösterdi.', effects: { happiness: -3, skillXP: { creative: 3 }, ...command('music', 'result', { result: 'setback' }) } } } }),
      choice('music', 'opportunity', 'Ortak prova sahnesinde ses ve ritimle katıl', 'Kendi ekipmanın olmadan ortak provaya katıldın. Ödül kazanmadın; bir parçanın birlikte nasıl kurulduğunu öğrendin.', { happiness: 3, skillXP: { creative: 4 }, ...command('music', 'result', { result: 'alternative' }) })
    ]),
    event('music', 'setback', 'Yanlış nota, doğru not defteri', 'Kaydı yeniden dinlemek ilk başta zor geliyor. {npc}, iyi geçen kısmın zamanını işaretlemiş. Tekrar seçmeye hazırlanabilir veya ortak üretime ağırlık verebilirsin.', [
      choice('music', 'setback', 'Yeni bir prova yılıyla tekrar dene', 'Yeni bir yılda atölye provası yaptıktan sonra yeniden başvurabileceksin. Bu kez çalışacağın yerler belli.', { stress: -2, ...command('music', 'retry') }),
      choice('music', 'setback', 'Ortak üretim grubuna geç', 'Tek seçmenin sonucunu bütün müzik hayatın yapmadın. Gelecek yıl sahne veya beste yolunu seçeceksin.', { happiness: 2, ...command('music', 'alternative') })
    ]),
    event('music', 'specialization', 'Alkış mı, son bir düzenleme mi?', 'Bir yanda dinleyicilerin karşısına çıkmak, diğer yanda bir parçayı tekrar tekrar işleyip başkasının sesine bırakmak var. İkisinde de “bir kez daha” cümlesi sık kullanılıyor.', [
      choice('music', 'specialization', 'Canlı sahne repertuvarı kur', 'Canlı sahneyi seçtin. İleride ücretli iş için kullanılabilir kendi gitarın gerekecek; gelişim provaları ortak atölyede sürebilir.', command('music', 'branch', { branch: 'stage' })),
      choice('music', 'specialization', 'Beste ve kısa ses işlerine yönel', 'Besteciliği seçtin. Ortak stüdyoyu kullanarak küçük bir siparişe hazırlanabilirsin; kendi bilgisayarın zorunlu değil.', command('music', 'branch', { branch: 'writing' }))
    ]),
    event('music', 'checkpoint', 'Bir şarkı daha, bir hafta sonu daha', 'Grup prova gününü sıklaştırmak istiyor. Diğer planların da takvimde yer bekliyor. {npc}, ortak stüdyo saatlerini daha uzun bir döneme yaymayı öneriyor.', [
      choice('music', 'checkpoint', 'Yoğun prova dönemi ayır', 'İki zaman puanını kayıt ve tekrar için kullandın. Toplam iki ayrı gelişim yılı yeterli olacak; diğer planlarına daha az yer kaldı.', { stress: 5, skillXP: { creative: 4 }, ...command('music', 'checkpoint', { tempo: 'focused' }) }, { energy: 2 }),
      choice('music', 'checkpoint', 'Üç yıla yayılan ortak prova planını seç', 'Ek harcama yapmadın; toplam üç farklı gelişim yılı ayıracaksın. Grup da kendi hayatına zaman buldu.', { stress: -2, ...command('music', 'checkpoint', { tempo: 'balanced' }) })
    ]),
    event('music', 'finale', 'İlk sözleşme, küçük puntolar', 'Dosyana iki tür talep gelebiliyor: kısa bir canlı sahne işi veya ortak stüdyoda küçük bir ses siparişi. Çalıştığın dalın ilk ücretli işi önünde. Bu kez alkışın yanında teslim tarihi de var.', [
      choice('music', 'finale', 'Kısa canlı sahne sözleşmesini tamamla', 'Repertuvarını zamanında hazırlayıp sahneye çıktın. İlk sözleşmenin ücretini aldın; yarın herkes seni tanımayacak ama artık gösterecek bir işin var.', { money: 8000, taxable: true, happiness: 5, flag: 'path_live_musician', ...command('music', 'finish', { outcome: 'professional' }) }, { energy: 2, requires: def('music').professional.stage, pathGuard: { id: 'music', stage: 'finale', branch: 'stage' } }),
      choice('music', 'finale', 'Ortak stüdyoda kısa beste siparişini teslim et', 'İstenen kısa ses işini teslim ettin, son düzeltmeyi de yaptın. Ücretin hesabına geçti; artık ortak stüdyodan başlayan bir portföyün var.', { money: 4500, taxable: true, happiness: 5, flag: 'path_music_commission', ...command('music', 'finish', { outcome: 'professional' }) }, { energy: 2, requires: def('music').professional.writing, pathGuard: { id: 'music', stage: 'finale', branch: 'writing' } }),
      choice('music', 'finale', 'Koşulları tamamlayıp gelecek yıl görüş', 'Hazır olmadığın işi almadın. Gelecek yıl ekipman, beceri ve zamanını yeniden değerlendireceksin.', command('music', 'defer')),
      choice('music', 'finale', 'Eseri ücretsiz paylaş ve bu yolu kalıcı tamamla', 'Müziği işe çevirmek yerine paylaşmayı seçtin. Eserin, provaların ve o ilk heyecan hayatının bir parçası olarak kaldı. Bu yol kalıcı olarak tamamlandı; ücretli finaline geri dönülmez.', { happiness: 4, flag: 'path_shared_music', ...command('music', 'finish', { outcome: 'community' }) })
    ])
  ];

  function commandReason(s, c) {
    if (!c || !def(c.id)) return c ? 'Bu hayat yolu bulunamadı.' : '';
    const r = recordFor(s, c.id), age = ageOf(s), d = def(c.id);
    if (c.type === 'start') return r.stage !== 'idle' ? 'Bu yola zaten başladın; sıradaki adımına bak.' : age < d.minAge ? `Bu yol ${d.minAge} yaşında açılır.` : '';
    if (r.stage === 'idle') return 'Önce bu yolun başlangıç grubuna katılmalısın.';
    if (c.type === 'practice') return r.stage !== 'preparation' ? 'Temel hazırlık bu bölümde aktif değil; yol kartındaki sıradaki adıma bak.' : r.practiceYears.includes(age) ? 'Bu yılın hazırlığını yaptın. İkinci bir çalışma yılı, yeni yaşında sayılır.' : '';
    if (c.type === 'submit') {
      if (r.stage !== 'preparation') return 'Başvurun veya sonraki bölümün zaten ilerliyor.';
      if (r.practiceYears.length < 2) return `İlk başvuru için iki farklı yılda hazırlık gerekli (${r.practiceYears.length}/2). Yeni yaşında bu yolun temel çalışmasını yap.`;
      if (r.submittedAge !== null && !r.practiceYears.some(y => y > r.submittedAge)) return 'Yeniden başvurmadan önce, son başvurundan daha sonraki bir yılda temel çalışma yapmalısın.';
      return '';
    }
    if (c.type === 'develop') return r.stage !== 'development' ? 'Önce bekleyen yol ayrımını veya ara değerlendirmeyi tamamlamalısın.' : r.developmentYears.includes(age) ? 'Bu yılın gelişim adımını tamamladın. Yeni bir yılın deneyimi gerekiyor.' : '';
    if (c.type === 'launch') {
      if (r.stage !== 'development') return 'Önce uzmanlaşma ve ara değerlendirme bölümünü tamamlamalısın.';
      if (age < 18) return 'Ücretli yetişkinlik bölümü 18 yaşında açılır. Hazırlığın korunuyor.';
      if (!r.checkpointDone) return 'İlk gelişim yılından sonraki takvim kararını vermelisin.';
      if (r.developmentYears.length < yearsNeeded(r)) return `${r.tempo === 'focused' ? 'Odaklı' : 'Dengeli'} planın ${yearsNeeded(r)} farklı gelişim yılı istiyor (${r.developmentYears.length}/${yearsNeeded(r)}).`;
      return '';
    }
    if (c.type === 'work') {
      if (r.stage !== 'completed' || r.outcome !== 'professional') return 'Önce bu yolun yetişkinlik bölümünde ücretli ilk işini tamamlamalısın.';
      if (r.lastWorkAge === age) return 'Bu yıl bu yoldan bir ek iş aldın; yeni fırsat gelecek yıl.';
      const requirement = d.professional[r.branch];
      for (const [stat, value] of Object.entries(requirement?.stats || {})) if (Number(s.stats?.[stat] || 0) < value) return `Bu iş için ${stat === 'knowledge' ? 'zekâ' : stat === 'strength' ? 'kuvvet' : 'sağlık'} en az ${value} olmalı.`;
      for (const item of requirement?.items || []) if (!s.inventory?.some(i => i.id === item && Number(i.condition) > 0)) return `Bu iş için kullanılabilir ${item === 'laptop' ? 'dizüstü bilgisayar' : item === 'shoes' ? 'spor ayakkabısı' : 'gitar'} gerekiyor.`;
      return '';
    }
    const expected = { result: 'opportunity', retry: 'setback', alternative: 'setback', branch: 'specialization', checkpoint: 'checkpoint', finish: 'finale', defer: 'finale' }[c.type];
    if (!expected || r.stage !== expected) return 'Bu karar artık hayat yolunun bulunduğu bölüme ait değil.';
    if (r.dueAge !== null && age < r.dueAge) return `Bu bölüm ${r.dueAge} yaşında açılacak; hazırlığın korunuyor.`;
    if (c.type === 'result' && !['success', 'setback', 'alternative'].includes(c.result)) return 'Bu yol sonucu bulunamadı.';
    if (c.type === 'branch' && !Object.hasOwn(d.branches, c.branch)) return 'Bu uzmanlaşma yolu bulunamadı.';
    if (c.type === 'checkpoint' && !['focused', 'balanced'].includes(c.tempo)) return 'Bu gelişim planı bulunamadı.';
    if (c.type === 'finish' && (age < 18 || !['professional', 'community'].includes(c.outcome))) return 'Yetişkinlik bölümü henüz tamamlanamaz.';
    return '';
  }
  function actionReason(s, action) { return commandReason(s, action?.effects?.pathCommand); }
  function choiceReason(s, c) {
    const guard = c?.pathGuard;
    if (guard) {
      const r = recordFor(s, guard.id);
      if (!def(guard.id) || r.stage !== guard.stage) return 'Bu karar artık hayat yolunun bulunduğu bölüme ait değil.';
      if (guard.branch && r.branch !== guard.branch) return `Bu seçenek ${def(guard.id).branches[guard.branch]} dalına ait. Seçtiğin dal: ${def(guard.id).branches[r.branch] || 'henüz yok'}.`;
    }
    return commandReason(s, c?.effects?.pathCommand);
  }
  function remember(r, age, text) { r.history.push({ age, text }); r.history = r.history.slice(-40); }
  function noteChoice(r, age, id) { r.choices.push({ age, id }); r.choices = r.choices.slice(-40); }
  function applyEffects(s, effects, npcId) {
    const c = effects?.pathCommand;
    if (!c || commandReason(s, c)) return [];
    if (!s.lifePaths) s.lifePaths = create();
    const r = s.lifePaths.routes[c.id], d = def(c.id), age = ageOf(s);
    let title = '', text = '', noticeKey = '';
    const next = (stage, delay = 0) => { r.stage = stage; r.dueAge = delay ? age + delay : null; };
    if (c.type === 'start') {
      r.startedAge = age; next('preparation');
      if (!s.lifePaths.pinned) s.lifePaths.pinned = c.id;
      title = 'Yeni bir hayat yolu'; text = `${d.name} yoluna başladın. İlk fırsattan önce iki farklı yılda temel hazırlık yapmalısın.`; noticeKey = 'start';
    } else if (c.type === 'practice') {
      r.practiceYears.push(age); remember(r, age, `Temel hazırlık yaptın; ${r.practiceYears.length} farklı yıldan deneyimin var.`);
    } else if (c.type === 'submit') {
      r.submittedAge = age; r.attempts++; next('opportunity', 1); remember(r, age, `İlk fırsata başvurdun. Değerlendirme ${r.dueAge} yaşında.`);
    } else if (c.type === 'result') {
      r.firstResult = c.result; noteChoice(r, age, `first:${c.result}`); next(c.result === 'setback' ? 'setback' : 'specialization', 1);
      title = c.result === 'success' ? 'Hazırlığın karşılık buldu' : c.result === 'setback' ? 'Yol burada bitmiyor' : 'Başka bir kapı açıldı';
      text = c.result === 'success' ? `${d.name}: ilk fırsatını başarıyla değerlendirdin. Gelecek yıl hangi dala yöneleceğini seçeceksin.` : c.result === 'setback' ? `${d.name}: bu deneme istediğin gibi gitmedi. Gelecek yıl yeniden hazırlık veya alternatif yol arasında karar verebilirsin.` : `${d.name}: yarışma yerine topluluk deneyimini seçtin. Gelecek yıl kendi dalını belirleyebilirsin.`;
      noticeKey = `first-${c.result}`;
    } else if (c.type === 'retry') {
      next('preparation'); noteChoice(r, age, 'retry'); remember(r, age, 'Yeni bir çalışma yılıyla yeniden başvurmaya karar verdin.');
    } else if (c.type === 'alternative') {
      r.firstResult = 'alternative'; next('specialization', 1); noteChoice(r, age, 'alternative'); remember(r, age, 'Sonuç yerine yönünü değiştirdin; topluluk içinden devam ediyorsun.');
    } else if (c.type === 'branch') {
      r.branch = c.branch; r.specializedAge = age; r.developmentYears = []; next('development'); noteChoice(r, age, `branch:${c.branch}`);
      title = 'Yolun sana benzemeye başladı'; text = `${d.name}: ${d.branches[c.branch]} dalını seçtin. İlk gelişim yılından sonra takvim ve öncelik kararın gelecek.`; noticeKey = `branch-${c.branch}`;
    } else if (c.type === 'develop') {
      r.developmentYears.push(age); remember(r, age, `${d.branches[r.branch]} için ${r.developmentYears.length}. gelişim yılını tamamladın.`);
      if (!r.checkpointDone) next('checkpoint', 1);
    } else if (c.type === 'checkpoint') {
      r.checkpointDone = true; r.tempo = c.tempo; next('development'); noteChoice(r, age, `tempo:${c.tempo}`);
      title = 'Takvimine bir karar yazdın'; text = `${d.name}: ${c.tempo === 'focused' ? 'odaklı planı' : 'dengeli planı'} seçtin. Yetişkinlik fırsatı için toplam ${yearsNeeded(r)} ayrı gelişim yılı gerekiyor.`; noticeKey = `tempo-${c.tempo}`;
    } else if (c.type === 'launch') {
      next('finale', 1); remember(r, age, `Yıllara yayılan dosyanı yetişkinlik fırsatına sundun. Görüşme ${r.dueAge} yaşında.`);
    } else if (c.type === 'finish') {
      r.outcome = c.outcome; r.completedAge = age; next('completed'); noteChoice(r, age, `outcome:${c.outcome}`);
      title = 'Bir ilgi, hayatının bir parçası oldu'; text = `${d.name} · ${d.branches[r.branch]}: ${c.outcome === 'professional' ? 'ilk ücretli işini tamamladın. Bu yoldan yılda bir küçük ek iş alabilirsin; diploma ve tam zamanlı kariyer şartları ayrıca geçerli.' : 'ücretsiz topluma katkıyla yolunu tamamladın. Her ilginin bir işe dönüşmesi gerekmiyor.'}`; noticeKey = `completed-${c.outcome}`;
    } else if (c.type === 'defer') {
      r.dueAge = age + 1; remember(r, age, `Yetişkinlik görüşmesini ${r.dueAge} yaşına erteledin; hazırlığın korunuyor.`);
    } else if (c.type === 'work') {
      r.lastWorkAge = age; remember(r, age, `${d.branches[r.branch]} deneyiminle küçük bir ücretli iş tamamladın.`);
    }
    if (!r.npcId && npcId && s.npcs?.some(n => n.id === npcId && n.alive)) r.npcId = npcId;
    if (!text) return [];
    remember(r, age, text);
    return [{ id: `${c.id}-${noticeKey}`, title, text }];
  }

  function candidate(s) {
    if (s?.alive === false) return null;
    const due = definitions.map(d => ({ id: d.id, r: recordFor(s, d.id) })).filter(({ r }) => ['opportunity', 'setback', 'specialization', 'checkpoint', 'finale'].includes(r.stage) && r.dueAge !== null && r.dueAge <= ageOf(s));
    due.sort((a, b) => a.r.dueAge - b.r.dueAge || Number(b.id === s.lifePaths?.pinned) - Number(a.id === s.lifePaths?.pinned) || IDS.indexOf(a.id) - IDS.indexOf(b.id));
    if (!due.length) return null;
    const { id, r } = due[0], npc = s.npcs?.find(n => n.id === r.npcId && n.alive);
    return { id: eventId(id, r.stage), ...(npc ? { npcId: npc.id } : {}) };
  }
  function overview(s) {
    return definitions.map(d => {
      const r = recordFor(s, d.id), age = ageOf(s);
      let types = [], goal = '', nextAge = r.dueAge;
      if (r.stage === 'idle') { types = ['start']; goal = age < d.minAge ? `${d.minAge} yaşında ücretsiz başlangıç grubuna katılabilirsin.` : 'Ücretsiz başlangıç grubuna katıl; sonra iki farklı yılda temel hazırlık yap.'; nextAge = age < d.minAge ? d.minAge : null; }
      else if (r.stage === 'preparation') {
        types = ['practice', 'submit']; goal = r.practiceYears.length < 2 ? `İki farklı yılda temel hazırlık: ${r.practiceYears.length}/2. Sonra ilk fırsata başvur.` : r.submittedAge !== null && !r.practiceYears.some(y => y > r.submittedAge) ? 'Yeniden başvuru için son başvurundan sonraki bir yılda temel çalışma yap.' : 'Hazırlığın yeterli. İlk fırsata başvur; sonuç gelecek yıl.';
        if (r.practiceYears.includes(age) && r.practiceYears.length < 2) nextAge = age + 1;
      } else if (r.stage === 'development') {
        types = ['develop', 'launch']; const needed = yearsNeeded(r);
        goal = !r.checkpointDone ? 'Bir gelişim yılı tamamla; ardından zaman ve öncelik kararın gelecek.' : r.developmentYears.length < needed ? `${d.branches[r.branch]} gelişimi: ${r.developmentYears.length}/${needed} farklı yıl. Her adım iki zaman puanı ister.` : age < 18 ? 'Gelişim planın tamam. Ücretli yetişkinlik bölümü 18 yaşında açılır; deneyimin korunuyor.' : 'Gelişim planın tamam. Dosyanı yetişkinlik fırsatına sunabilirsin.';
        if (r.checkpointDone && r.developmentYears.length >= needed && age < 18) nextAge = 18;
        else if (r.developmentYears.includes(age) && r.developmentYears.length < needed) nextAge = age + 1;
      } else if (r.stage === 'completed') {
        types = r.outcome === 'professional' ? ['work'] : []; goal = r.outcome === 'professional' ? 'İlk ücretli iş tamamlandı. Ek iş alabilir veya Gelecek → İş ilanları içindeki yeni meslek koşullarını inceleyebilirsin.' : 'Bu yol ücretsiz topluma katkıyla kalıcı tamamlandı; ücretli finaline geri dönülmez. Başka bir ilgin için yeni yol seçebilirsin.';
      } else goal = `${STAGE_NAMES[r.stage]} kararı ${r.dueAge} yaşında gelecek. Bu arada diğer etkinliklere zaman ayırabilirsin.`;
      const actionIds = types.map(type => actionId(d.id, type));
      const preferred = [...actionIds].reverse().find(id => !actionReason(s, actions.find(a => a.id === id))) || actionIds[0] || null;
      return { id: d.id, name: d.name, icon: d.icon, description: d.description, stage: r.stage, stageLabel: STAGE_NAMES[r.stage], goal,
        actionId: preferred, actionIds, nextAge, completed: r.stage === 'completed', started: r.stage !== 'idle', pinned: s.lifePaths?.pinned === d.id,
        branch: r.branch, branchLabel: d.branches[r.branch] || null, outcome: r.outcome,
        outcomeLabel: r.outcome === 'professional' ? 'İlk ücretli iş' : r.outcome === 'community' ? 'Topluma katkı' : null,
        practiceYears: r.practiceYears.length, developmentYears: r.developmentYears.length, requiredDevelopmentYears: yearsNeeded(r),
        npcId: r.npcId, history: r.history.map(h => ({ ...h })) };
    });
  }
  function pin(s, id) {
    if (id !== null && !IDS.includes(id)) return false;
    if (!s.lifePaths) s.lifePaths = create();
    s.lifePaths.pinned = id; return true;
  }
  function bindNpc(s, id, npcId) {
    if (!def(id) || !s.npcs?.some(n => n.id === npcId && n.alive)) return false;
    if (!s.lifePaths) s.lifePaths = create();
    s.lifePaths.routes[id].npcId = npcId; return true;
  }
  return { actions, events, create, migrate, actionReason, choiceReason, applyEffects, candidate, overview, pin, bindNpc };
});
