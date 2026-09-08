(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LifeRelationships = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Trust is earned through reliability, not purchased with gifts. The engine
  // owns costs, time and player stats; this module owns individual NPC history.
  const MAX_MEMORIES = 12;
  const FAMILY = ['mother', 'father', 'child', 'sibling', 'brother', 'sister'];
  const PEERS = ['friend', 'classmate', 'colleague', 'partner', 'spouse'];
  const clamp = (value, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Number.isFinite(Number(value)) ? Number(value) : lo));
  const integer = (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : fallback;
  const ageOf = s => clamp(integer(s && s.age), 0, 130);
  const clean = (value, limit = 220) => typeof value === 'string' ? value.slice(0, limit) : '';
  const LABELS = {
    talk: 'İçten bir sohbet', time: 'Birlikte geçirilen zaman', gift: 'Düşünceli bir hediye',
    promise_made: 'Gelecek yıl için bir söz', promise_kept: 'Tutulan bir söz', promise_broken: 'Tutulmayan bir söz',
    promise_cancelled: 'Yarım kalan bir plan', apology: 'Kırgınlık üzerine bir konuşma', argument: 'Sert bir tartışma',
    confidence: 'Korunan bir sır', betrayal: 'İncinen güven', support: 'Zor günde yanında olmak',
    boundary: 'Dürüstçe çizilen sınır', referral: 'Adına kefil olan biri', shared_history: 'Ortak bir anı',
    child_listened: 'Sesini duyurduğu bir gün', introduction: 'İlk tanışma', romance: 'Karşılıklı bir başlangıç',
    aid: 'Ailenden gelen destek', respect: 'Baskı görmeyen bir karar'
  };
  const alive = (s, n) => !!(s && s.alive !== false && n && n.alive);
  const isFamily = n => !!n && (FAMILY.includes(n.role) || FAMILY.includes(n.contextRole) || !!n.parentId);
  const protectedMentor = n => !!n && (n.role === 'mentor' || n.contextRole === 'mentor' || n.mentorProtected);
  const isPeer = n => !!n && PEERS.includes(n.role) && !isFamily(n) && !protectedMentor(n);
  const initialTrust = n => n.role === 'child' ? 56 : ['mother', 'father'].includes(n.role) ? 54 :
    n.role === 'spouse' ? 64 : n.role === 'partner' ? 56 : isFamily(n) ? 48 :
    Math.round(clamp(26 + (clamp(n.bond) - 35) * .25, 22, 45));

  function normalizeHistory(n) {
    const raw = n.relationshipHistory && typeof n.relationshipHistory === 'object' ? n.relationshipHistory : {};
    const eventSeen = {};
    for (const id of EVENT_IDS) if (Number.isFinite(raw.eventSeen && raw.eventSeen[id])) eventSeen[id] = clamp(integer(raw.eventSeen[id]), 0, 130);
    return {
      memorySerial: clamp(integer(raw.memorySerial), 0, 1000000),
      socialYear: clamp(integer(raw.socialYear, -1), -1, 130),
      socialUsed: Array.isArray(raw.socialUsed) ? [...new Set(raw.socialUsed.filter(x => ['talk', 'time', 'gift', 'ask', 'apologize', 'date', 'marry', 'child', 'breakup', 'argue', 'promise'].includes(x)))].slice(0, 12) : [],
      eventSeen,
      lastEventAge: clamp(integer(raw.lastEventAge, -10), -10, 130)
    };
  }
  function normalizePromise(n) {
    const p = n.promise;
    if (!p || typeof p !== 'object' || !['active', 'kept', 'broken', 'cancelled'].includes(p.status)) return null;
    const madeAge = clamp(integer(p.madeAge), 0, 129), dueAge = madeAge + 1;
    return {
      id: clean(p.id, 100) || `${clean(n.id, 60)}:promise:${madeAge}`,
      madeAge, dueAge, status: p.status,
      ...(Number.isFinite(p.remindedAge) ? { remindedAge: clamp(integer(p.remindedAge), 0, 130) } : {}),
      ...(Number.isFinite(p.resolvedAge) ? { resolvedAge: clamp(integer(p.resolvedAge), 0, 130) } : {})
    };
  }
  function migrateNpc(s, n) {
    if (!n || typeof n !== 'object') return n;
    n.trust = n.trust === undefined || n.trust === null || !Number.isFinite(Number(n.trust)) ? initialTrust(n) : clamp(n.trust);
    const seen = new Set();
    n.memories = (Array.isArray(n.memories) ? n.memories : []).filter(m => m && typeof m === 'object').map((m, index) => {
      const id = clean(m.id, 100) || `${clean(n.id, 60)}:legacy-memory:${index}`;
      return { id, age: clamp(integer(m.age), 0, 130), kind: clean(m.kind, 45) || 'shared_history',
        title: clean(m.title, 80) || LABELS[m.kind] || 'Ortak bir anı', text: clean(m.text),
        trustDelta: clamp(m.trustDelta || 0, -20, 10), hurt: clamp(m.hurt || 0, 0, 20), resolved: !!m.resolved };
    }).filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; }).slice(-MAX_MEMORIES);
    n.promise = normalizePromise(n);
    n.relationshipHistory = normalizeHistory(n);
    n.relationshipHistory.memorySerial = Math.max(n.relationshipHistory.memorySerial, n.memories.length);
    if (n.contextRole === 'mentor' || n.role === 'mentor') n.mentorProtected = true;
    return n;
  }
  const initNpc = migrateNpc;
  const trustOf = n => n && Number.isFinite(Number(n.trust)) && n.trust !== null ? clamp(n.trust) : initialTrust(n || {});
  const hurts = n => (Array.isArray(n && n.memories) ? n.memories : []).filter(m => m && m.hurt > 0 && !m.resolved);

  function remember(s, n, kind, delta = 0, text = '', options = {}) {
    const before = n.trust;
    n.trust = clamp(n.trust + delta);
    let id;
    do {
      n.relationshipHistory.memorySerial = n.relationshipHistory.memorySerial % 1000000 + 1;
      id = `${clean(n.id, 60)}:memory:${n.relationshipHistory.memorySerial}`;
    } while (n.memories.some(m => m.id === id));
    const memory = { id, age: ageOf(s), kind, title: clean(options.title, 80) || LABELS[kind] || 'Ortak bir anı',
      text: clean(text), trustDelta: n.trust - before, hurt: delta < 0 && options.hurt !== false ? Math.abs(delta) : 0, resolved: false };
    n.memories.push(memory);
    if (n.memories.length > MAX_MEMORIES) n.memories.splice(0, n.memories.length - MAX_MEMORIES);
    return memory;
  }
  function makePromise(s, n) {
    if (!alive(s, n) || ageOf(s) < 6 || n.promise?.status === 'active') return false;
    n.promise = { id: `${clean(n.id, 60)}:promise:${ageOf(s)}`, madeAge: ageOf(s), dueAge: ageOf(s) + 1, status: 'active' };
    remember(s, n, 'promise_made', 0, `${n.promise.dueAge} yaşında birlikte zaman geçireceğine söz verdin. Söz vermek tek başına güven kazandırmaz.`);
    return true;
  }
  function fulfillPromise(s, n) {
    if (!alive(s, n) || !n.promise || n.promise.status !== 'active' || n.promise.dueAge !== ageOf(s)) return false;
    n.promise.status = 'kept'; n.promise.resolvedAge = ageOf(s);
    remember(s, n, 'promise_kept', 5, 'Takviminde yer açıp geçen yıl verdiğin sözü tuttun. Artık sözüne biraz daha güveniyor.');
    return true;
  }
  function repair(s, n) {
    const wound = hurts(n).at(-1);
    if (!wound) return false;
    wound.resolved = true;
    // Even manufactured argument/apology cycles have a strictly negative return.
    const gain = Math.min(5, Math.floor(wound.hurt / 2));
    remember(s, n, 'apology', gain, `“${wound.title}” üzerine sorumluluk aldın. Özür, yaşananları silmedi; güvenin bir bölümünü onardı.`);
    return true;
  }
  function socialReason(s, n, interaction) {
    if (!alive(s, n)) return 'Bu kişiyle artık yeni bir etkileşim kuramazsın.';
    if (interaction === 'flirt') interaction = 'date';
    if (interaction === 'apologize' && !hurts(n).length) return 'Özür gerektiren açık bir kırgınlık yok. Güven, içten sohbet ve tutulan sözlerle gelişir.';
    if (interaction === 'ask' && trustOf(n) < 50) return 'Maddi destek istemek için en az 50 güven gerekiyor. Hediye almak güveni satın almaz.';
    if (interaction === 'promise') {
      if (ageOf(s) < 6) return 'Gelecek yıl için söz vermek 6 yaşında açılır.';
      if (n.promise?.status === 'active') return `${n.promise.dueAge} yaşında yerine getirmen gereken bir sözün zaten var.`;
      if (n.promise?.madeAge === ageOf(s)) return 'Bu kişiyle aynı yıl yeniden sözleşemezsin.';
    }
    if (['date', 'marry', 'child'].includes(interaction)) {
      if (isFamily(n) || protectedMentor(n)) return 'Aile üyeleri veya rehberinle romantik ilişki kurulamaz.';
      if (interaction === 'date' && ['partner', 'spouse'].includes(n.role)) return 'Zaten birliktesiniz. Birlikte zaman geçirebilir, ortak hayatınızda yeni anılar yaşayabilirsiniz.';
      const required = interaction === 'date' ? 40 : interaction === 'marry' ? 65 : 60;
      if (trustOf(n) < required) return `Bu ortak karar için en az ${required} güven gerekiyor.`;
    }
    return '';
  }
  function social(s, n, interaction, context = {}) {
    if (!alive(s, n)) return { message: '', trustDelta: 0 };
    if (interaction === 'flirt') interaction = 'date';
    if (socialReason(s, n, interaction)) return { message: '', trustDelta: 0 };
    migrateNpc(s, n);
    const before = n.trust, h = n.relationshipHistory, currentAge = ageOf(s);
    if (h.socialYear !== currentAge) { h.socialYear = currentAge; h.socialUsed = []; }
    if (h.socialUsed.includes(interaction)) return { message: '', trustDelta: 0 };
    h.socialUsed.push(interaction);
    let message = '';
    if (interaction === 'talk') remember(s, n, 'talk', n.trust >= 70 ? .5 : 1, 'Yargılamadan birbirinizi dinlediniz. Küçük ama gerçek bir yakınlık.');
    if (interaction === 'time') {
      if (fulfillPromise(s, n)) message = `Geçen yıl ${n.name} için verdiğin sözü tuttun. Güven +5.`;
      else remember(s, n, 'time', n.trust >= 70 ? 1 : 2, 'Gününü onunla paylaştın. Sözlerden çok davranışların akılda kalıyor.');
    }
    if (interaction === 'gift') remember(s, n, 'gift', 0, 'Hediyeni sevdi. Yakınlık arttı; güveni ise zaman ve tutarlılık belirleyecek.');
    if (interaction === 'argue') remember(s, n, 'argument', -9, 'Sert sözlerin aklında kaldı. Bu kırgınlık bir özürle ancak kısmen onarılabilir.');
    if (interaction === 'apologize') { repair(s, n); message = 'Açık kırgınlığı konuştunuz. Özür, güvenin yalnızca bir bölümünü geri getirdi.'; }
    if (interaction === 'promise' && makePromise(s, n)) message = `${n.name} için ${n.promise.dueAge} yaşında “Birlikte zaman geçir” eylemine 1 zaman ayıracağına söz verdin. Tutarsan güven +5; tutmazsan −10.`;
    if (interaction === 'ask' && context.aid > 0) remember(s, n, 'aid', 0, 'Sana destek oldu. Bu yardım, yıllar içinde kurduğun güvene dayanıyor.');
    if (interaction === 'marry') remember(s, n, 'romance', 2, 'Birlikte yaşam kurmayı karşılıklı olarak seçtiniz.');
    if (interaction === 'child') remember(s, n, 'shared_history', 1, 'Ailenizi büyütme sorumluluğunu birlikte aldınız.');
    if (interaction === 'breakup') remember(s, n, 'boundary', -5, 'Birlikteliğiniz sona erdi. Geçmişiniz bir anda silinmedi.', { hurt: false });
    return { message, trustDelta: n.trust - before };
  }
  function annual(s) {
    const notices = [];
    if (!s || !Array.isArray(s.npcs)) return notices;
    for (const n of s.npcs) {
      if (!n) continue;
      migrateNpc(s, n);
      const p = n.promise;
      if (!p || p.status !== 'active') continue;
      if (!n.alive || s.alive === false) {
        p.status = 'cancelled'; p.resolvedAge = ageOf(s);
        // A death cannot turn an unfulfilled plan into a moral failure.
        continue;
      }
      if (ageOf(s) > p.dueAge) {
        p.status = 'broken'; p.resolvedAge = ageOf(s);
        remember(s, n, 'promise_broken', -10, `${p.dueAge} yaşında birlikte zaman geçireceğine söz vermiştin. O yıl bu plan gerçekleşmedi.`);
        notices.push({ title: 'Takvimde kalan bir söz', text: `${n.name}, geçen yılki sözünü tutmadığını hatırlıyor. Güven −10. Özür dileyebilir, zamanla yeniden güven kazanabilirsin.`, kind: 'relationship', npcId: n.id });
      } else if (ageOf(s) === p.dueAge && p.remindedAge !== ageOf(s)) {
        p.remindedAge = ageOf(s);
        notices.push({ title: 'Bu yıl için verdiğin söz', text: `${n.name} ile bu yıl birlikte zaman geçirmeye söz verdin. Yaş ilerletmeden önce 1 zaman ayırabilirsin.`, kind: 'relationship', npcId: n.id });
      }
    }
    const referral = s.flags && s.flags.careerReferral;
    if (referral && typeof referral === 'object' && referral.expiresAge < ageOf(s)) delete s.flags.careerReferral;
    return notices;
  }

  const choice = (label, outcome, effects = {}, extra = {}) => ({ label, outcome, effects, ...extra });
  const event = (id, title, description, minAge, choices, extra = {}) => ({ id, title, description, minAge, maxAge: 110, icon: '💬', triggeredOnly: true, cooldown: 4,
    choices: choices.map(c => ({ ...c, effects: { ...c.effects, relationshipEvent: id } })), ...extra });
  const events = [
    event('memory_promise_due', 'Takvimde {npc} için bir yer', 'Geçen yıl {npc} ile bu yıl birlikte zaman geçireceğine söz vermiştin. Planını şimdi gerçekleştirebilir veya bu yılın ilerisine bırakabilirsin.', 6, [
      choice('Söz verdiğim günü ayır · 1 zaman', 'Söz havada kalmadı. {npc}, gelmeni gerçekten önemsedi.', { promise: 'fulfill', happiness: 3, stress: -2 }, { energy: 1 }),
      choice('Bu yıl içinde ilişkiler menüsünden planla', 'Sözün hâlâ geçerli. Bir sonraki yaşa geçmeden {npc} ile “Birlikte zaman geçir” eylemini kullanmalısın.', {})
    ]),
    event('memory_broken_promise', '“Geleceğim demiştin”', '{npc}, tutulmayan sözünü hatırlatıyor. Konu yoğun olman değil; ona haber vermeden planın yok olması.', 6, [
      choice('Savunmaya geçmeden özür dile · 1 zaman', '{npc} özrünü duydu. Kırgınlık konuşuldu; güvenin tamamını geri kazanmak zaman isteyecek.', { memory: { repair: true } }, { energy: 1 }),
      choice('Dürüstçe şu an konuşmaya hazır olmadığını söyle', 'Konu çözülmedi ama yeni bir söz de vermedin. İlişkiler menüsünden sonra konuşabilirsiniz.', {}),
      choice('“Alt tarafı bir gündü” de', '{npc} için mesele gün değil, verdiğin sözdü. Küçümsemen yeni bir kırgınlık bıraktı.', { memory: { kind: 'betrayal', trust: -4 }, bond: -3 })
    ]),
    event('memory_confidence', 'Sana emanet bir cümle', '{npc}, başkalarına henüz anlatmadığı kişisel bir kaygısını paylaşıyor. “Bunu aramızda tutabilir miyiz?” diye soruyor.', 12, [
      choice('Dinle, konuşma aranızda kalsın · 1 zaman', 'Merakını değil, {npc} ile arandaki güveni önemsedin. Bu konuşmayı unutmayacak.', { memory: { kind: 'confidence', trust: 3 }, happiness: 1 }, { energy: 1 }),
      choice('Şu an yeterince dikkat veremeyeceğini açıkla', 'Dinliyormuş gibi yapmadın. {npc} dürüst sınırını kabul etti.', { memory: { kind: 'boundary', trust: 0 } }),
      choice('Sohbetin ortasında başkasına da anlat', '{npc}, konuşmanın başkalarına ulaştığını öğrendi. Sana söylediği şeyin dedikodu olmasını beklemiyordu.', { memory: { kind: 'betrayal', trust: -12 }, bond: -6, stress: 3 })
    ]),
    event('memory_support_request', 'Zor gününde {npc}', '{npc} bir sağlık sorunuyla uğraşıyor. Büyük bir kahramanlık değil, yanında birinin olmasını istiyor.', 12, [
      choice('Yanına uğra ve dinle · 1 zaman', '{npc}, bu zor gününde yanında oluşunu hatırlayacak.', { memory: { kind: 'support', trust: 4 }, happiness: 2 }, { energy: 1 }),
      choice('Gündelik ihtiyaçlarını karşıla', 'Gündelik yükünün bir bölümünü aldın. Desteğin, paranın büyüklüğünden çok zamanlamasıyla anlamlıydı.', { memory: { kind: 'support', trust: 2 } }, { cost: 2500, requires: { minAge: 18 } }),
      choice('Şu an yapamayacağını dürüstçe söyle', 'Yerine getiremeyeceğin bir söz vermedin. {npc} sınırını biliyor.', { memory: { kind: 'boundary', trust: 0 } })
    ]),
    event('memory_career_referral', '“Adını önerebilirim”', '{npc}, birlikte çalıştığı çevrede birini aradıklarını söylüyor. Güvenilirliğine kefil olabilir; diploma ve mesleki koşullar yine sana ait.', 18, [
      choice('Başvuru dosyanı birlikte hazırla · 1 zaman', '{npc} adına kefil oldu. Önümüzdeki üç yaş içinde bir iş başvurusunda bu referansı kullanabilirsin; işe alınma garantisi değil.', { referral: true, memory: { kind: 'referral', trust: 0 } }, { energy: 1 }),
      choice('Teşekkür et; şu anki yolunda kal', 'Teklifi kabul etmesen de {npc} sana neden güvendiğini açıkça söyledi.', {})
    ]),
    event('memory_boundary', 'Yakınlık var, güven eksik', '{npc}, aranızdaki eski kırgınlığın hâlâ etkili olduğunu söylüyor. Yeni planlar yapmadan önce bunun konuşulmasını istiyor.', 12, [
      choice('Kırgınlığındaki payını kabul et · 1 zaman', 'Sorumluluk aldın. Bu konuşma bir başlangıç; güveni bir günde eski hâline döndürmedi.', { memory: { repair: true } }, { energy: 1 }),
      choice('Alanına saygı göster', '{npc} için alan bıraktın. Aranızdaki konu henüz kapanmadı.', { memory: { kind: 'respect', trust: 0 } }),
      choice('“Hâlâ mı bunu konuşuyoruz?” diye çıkış', '{npc}, kırgınlığını küçümsediğini görünce mesafesini korudu.', { memory: { kind: 'betrayal', trust: -5 }, bond: -4 })
    ]),
    event('memory_shared_history', '“O günü hatırlıyor musun?”', '{npc}, birlikte geçirdiğiniz bir günü hatırlatıyor. Hikâyenin ayrıntıları değişmiş; birbiriniz için orada oluşunuz değişmemiş.', 10, [
      choice('Çayı koy, hikâyeyi yeniden anlat · 1 zaman', 'Yeni bir başarı rozeti yoktu. Sadece yılların gerçekten birikmiş olduğunu hissettiniz.', { memory: { kind: 'shared_history', trust: 2 }, happiness: 4, stress: -3 }, { energy: 1 }),
      choice('Gülümseyip güzel anıyı paylaş', 'Kısa bir gülümseme bile aynı geçmişi paylaştığınızı hatırlattı.', { happiness: 1 })
    ]),
    event('memory_child_request', 'Kendi küçük planı', '{npc}, senin seçtiğin yol yerine ilgisini çeken başka bir şeyi denemek istiyor. Önce fikrinin ciddiye alınmasını bekliyor.', 25, [
      choice('Neden istediğini birlikte konuş · 1 zaman', '{npc}, kararına hemen katılmasan bile sesinin duyulduğunu hissetti.', { memory: { kind: 'child_listened', trust: 3 }, happiness: 2 }, { energy: 1 }),
      choice('Bir deneme kursunu karşıla', '{npc} kendi seçimini deneyebildi. Destek oldun; sonucunu onun adına belirlemedin.', { memory: { kind: 'support', trust: 2 }, bond: 3 }, { cost: 9000 }),
      choice('Şimdi karar vermek yerine düşünmek iste', 'Hemen söz vermedin. Konuyu konuşmaya açık bıraktın.', {}),
      choice('“Ben daha iyi bilirim” diyerek kapat', '{npc}, kendi fikrinin önemli olmadığını hissetti.', { memory: { kind: 'betrayal', trust: -6 }, bond: -3 })
    ]),
    event('relationship_meet_child', 'Yeni bir yüz: {npc}', '{npc} ile aynı etkinlikte karşılaştınız. Yanındaki yeri gösterip “Beraber yapalım mı?” diye soruyor. Henüz tanıştınız; arkadaş olup olmamaya sen karar verirsin.', 0, [
      choice('“Tamam! Ama son boya kalemi ortak.”', '{npc} güldü. Birlikte oynamayı seçtiniz ve yeni bir arkadaşlık başladı.', { friendship: true }),
      choice('Tanış, şimdilik kendi oyununa dön', '{npc} artık bir tanıdık. Arkadaşlık için acele etmen gerekmiyor.', { declineContact: true })
    ], { maxAge: 12 }),
    event('relationship_meet_teen', '“Buraya hep gelir misin?”', 'Etkinlikte {npc} ile sohbet etmeye başladınız. Ortak bir ilginiz var; grubun içinde tanıdık bir yüz edinmek iyi gelebilir.', 13, [
      choice('“Evet, uzmanlık alanım acemi görünmek.”', '{npc} esprine güldü. Bir dahaki sefere birlikte gelmeye karar verdiniz: yeni bir arkadaşın var.', { friendship: true }),
      choice('Nazikçe tanış, hemen yakınlaşma', 'Sohbet güzeldi. {npc} şimdilik tanıdık olarak kaldı; bunun için kimse kırılmadı.', { declineContact: true })
    ], { maxAge: 17 }),
    event('relationship_meet_adult', 'Etkinlikten kalan bir sohbet', '{npc} ile etkinlik çıkışında sohbete daldınız. Aynı şeylere gülüyorsunuz. Bu tanışıklığı sürdürmek isteyip istemediğine sen karar verebilirsin.', 18, [
      choice('“Kahve içeriz; CV mülakatı yapmamak şartıyla.”', '{npc} de tanışıklığı sürdürmek istedi. Bu küçük sohbet yeni bir bağın başlangıcı oldu.', { friendship: true }),
      choice('İyi dileklerle vedalaş', 'Keyifli bir tanışma olarak kaldı. {npc} bir tanıdık; herkesle yakın arkadaş olmak zorunda değilsin.', { declineContact: true })
    ]),
    event('relationship_romantic_invitation', 'Kahvenin bahanesi kalmadı', 'Aranızdaki çekim karşılıklı. {npc}, “Seni sadece kahve zevkin için çağırmadım” diyor. Bu bağı romantik bir ilişkiye dönüştürmek ikinizin de seçimi.', 18, [
      choice('“İyi, kahve zevkim zaten tartışmalı.”', 'İkiniz de bir ilişkiye başlamayı istediniz. Kahve soğudu, sohbet hiç soğumadı.', { romance: 'accept', happiness: 4 }),
      choice('“Hoşlanıyorum; ama acelemiz olmasın.”', '{npc} buna saygı duydu. Yakınlığınızı hemen bir ilişkiye çevirmeden tanışmaya devam ediyorsunuz.', { romance: 'slow' }),
      choice('Arkadaş olarak kalmak istediğini açıkla', 'Duygunu açıkça söyledin. {npc} kararına saygı duydu; romantik bir ilişki başlamadı.', { romance: 'decline' })
    ]),
    event('memory_partner_date', 'Romantizm, rezervasyon kabul etmiyor', '{npc}, baş başa bir akşam için ne düşündüğünü soruyor. Takvimleriniz sonunda uyuşmuş. “Sadece faturaları konuşmayalım” diye de ekliyor.', 18, [
      choice('Dışarı çık; telefonları masadan kaldır · 1 zaman', 'Garson sizi yeni tanışmış sandı. {npc} ile gülüşüp onu düzeltmediniz. İkinizin de istediği uzun bir öpücükle akşamı bitirdiniz.', { memory: { kind: 'shared_history', trust: 2 }, happiness: 5, stress: -3 }, { energy: 1, cost: 2200 }),
      choice('Evde makarna, mum ve biraz cesaret · 1 zaman', 'Makarna biraz fazla pişti; sohbet tam kıvamındaydı. {npc}, “Şeflik kariyerin tartışılır ama bu akşamı sevdim” dedi. Gecenin devamı ikinize kaldı.', { memory: { kind: 'shared_history', trust: 1 }, happiness: 4, stress: -2 }, { energy: 1 }),
      choice('Bu akşam dinlenmeye ihtiyacın olduğunu söyle', '{npc} bunu kişisel almadı. Yakınlık, her davete evet demek zorunda olmadan da sürüyordu.', { memory: { kind: 'respect', trust: 0 } })
    ], { npcMinAge: 18 })
  ];
  const EVENT_IDS = new Set(events.map(e => e.id));

  function applyEffects(s, n, effects = {}) {
    if (!alive(s, n)) return { message: '', trustDelta: 0 };
    migrateNpc(s, n);
    const before = n.trust;
    if (EVENT_IDS.has(effects.relationshipEvent)) {
      n.relationshipHistory.eventSeen[effects.relationshipEvent] = ageOf(s);
      n.relationshipHistory.lastEventAge = ageOf(s);
    }
    const memory = effects.memory;
    if (memory && typeof memory === 'object') {
      if (memory.repair) repair(s, n);
      else if (LABELS[memory.kind]) remember(s, n, memory.kind, clamp(memory.trust || 0, -15, 5), memory.text || LABELS[memory.kind]);
    }
    if (effects.promise === true || effects.promise === 'make') makePromise(s, n);
    if (effects.promise === 'fulfill') fulfillPromise(s, n);
    if (effects.referral && trustOf(n) >= 72 && !isFamily(n) && n.age >= 18 && ageOf(s) >= 18 && n.income > 0) {
      s.flags ||= {};
      s.flags.careerReferral = { npcId: n.id, age: ageOf(s), expiresAge: ageOf(s) + 3, consumed: false };
    }
    if (effects.friendship && n.role === 'acquaintance') {
      n.role = protectedMentor(n) ? 'mentor' : 'friend';
      n.contactStatus = 'accepted';
      n.bond = clamp((n.bond || 0) + 4);
      remember(s, n, 'introduction', 1, 'Tanışıklığı sürdürmeyi ikiniz de istediniz. Arkadaşlık bu seçimle başladı.');
    }
    if (effects.declineContact && n.role === 'acquaintance') n.contactStatus = 'acquaintance';
    if (effects.romance && canRomance(s, n)) {
      if (effects.romance === 'accept' && !s.npcs?.some(other => other.alive && ['partner', 'spouse'].includes(other.role) && other.id !== n.id)) {
        n.previousRole = n.role; n.role = 'partner'; n.partnerSince = ageOf(s);
        n.bond = clamp((n.bond || 0) + 5);
        remember(s, n, 'romance', 2, 'Birlikte olmayı karşılıklı olarak seçtiniz.');
      } else if (['decline', 'slow'].includes(effects.romance)) {
        if (n.role === 'acquaintance') { n.role = 'friend'; n.contactStatus = 'accepted'; }
        remember(s, n, 'respect', 0, 'Romantik bir ilişkiyi hemen başlatmama kararın baskı görmeden kabul edildi.');
      }
    }
    return { message: '', trustDelta: n.trust - before };
  }
  function canRomance(s, n) {
    return alive(s, n) && ageOf(s) >= 18 && n.age >= 18 && trustOf(n) >= 40 && !isFamily(n) && !protectedMentor(n) && !['ex', 'partner', 'spouse'].includes(n.role);
  }
  function introduction(s, n) {
    if (!alive(s, n) || n.role !== 'acquaintance') return null;
    const id = ageOf(s) < 13 ? 'relationship_meet_child' : ageOf(s) < 18 ? 'relationship_meet_teen' : 'relationship_meet_adult';
    return { id, npcId: n.id };
  }
  function romanticEvent(s, n) {
    return canRomance(s, n) && trustOf(n) >= 40 ? { id: 'relationship_romantic_invitation', npcId: n.id } : null;
  }
  function candidate(s) {
    if (!s || s.alive === false || ageOf(s) < 6 || !Array.isArray(s.npcs)) return null;
    const candidates = [];
    const add = (n, id, score, cooldown = 5) => {
      const h = n.relationshipHistory || {}, age = ageOf(s), last = h.eventSeen && h.eventSeen[id];
      if (Number.isFinite(last) && age - last < cooldown) return;
      const urgent = id === 'memory_promise_due' || id === 'memory_broken_promise';
      if (!urgent && Number.isFinite(h.lastEventAge) && age - h.lastEventAge < 3) return;
      if (!urgent && Number.isFinite(s.seenEvents?.[id]) && age - s.seenEvents[id] < 3) return;
      candidates.push({ id, npcId: n.id, score });
    };
    for (const n of s.npcs) {
      if (!n || !n.alive) continue;
      const trust = trustOf(n), memories = Array.isArray(n.memories) ? n.memories : [], wound = hurts(n).at(-1);
      if (n.promise?.status === 'active' && n.promise.dueAge === ageOf(s)) add(n, 'memory_promise_due', 100, 1);
      if (n.promise?.status === 'broken' && wound?.kind === 'promise_broken' && ageOf(s) - n.promise.resolvedAge <= 2) add(n, 'memory_broken_promise', 95, 3);
      if (ageOf(s) >= 12 && trust <= 32 && wound && n.role !== 'acquaintance') add(n, 'memory_boundary', 85, 5);
      if (ageOf(s) >= 12 && n.sick && trust >= 38 && n.role !== 'acquaintance') add(n, 'memory_support_request', 80, 4);
      const trustedActs = memories.filter(m => ['promise_kept', 'support', 'confidence', 'time'].includes(m.kind)).length;
      const referral = s.flags?.careerReferral;
      if (ageOf(s) >= 18 && !s.flags?.retired && n.age >= 18 && n.income > 0 && trust >= 72 && n.bond >= 60 && !isFamily(n) && n.role !== 'acquaintance' && trustedActs >= 2 && (!referral || referral.consumed || referral.expiresAge < ageOf(s))) add(n, 'memory_career_referral', 70, 8);
      if (ageOf(s) >= 25 && n.role === 'child' && n.age >= 6 && n.age < 18 && trust >= 40) add(n, 'memory_child_request', 60, 4);
      if (ageOf(s) >= 18 && n.age >= 18 && ['partner', 'spouse'].includes(n.role) && !isFamily(n) && !protectedMentor(n) && trust >= 45 && n.bond >= 40) add(n, 'memory_partner_date', 55, 5);
      if (ageOf(s) >= 12 && n.age >= 12 && isPeer(n) && trust >= 58 && n.bond >= 55) add(n, 'memory_confidence', 50, 6);
      if (ageOf(s) >= 10 && trust >= 65 && n.bond >= 65 && trustedActs >= 2 && n.role !== 'acquaintance') add(n, 'memory_shared_history', 40, 6);
    }
    candidates.sort((a, b) => b.score - a.score || String(a.npcId).localeCompare(String(b.npcId)) || a.id.localeCompare(b.id));
    return candidates.length ? { id: candidates[0].id, npcId: candidates[0].npcId } : null;
  }
  function overview(s, n) {
    if (!n) return null;
    const trust = trustOf(n), promise = normalizePromise(n), openHurts = hurts(n).length;
    return { trust, label: trust < 25 ? 'Kırılgan güven' : trust < 45 ? 'Birbirinizi tanıyorsunuz' : trust < 65 ? 'Güven oluşuyor' : trust < 80 ? 'Sözüne güveniyor' : 'Sağlam güven',
      memories: (Array.isArray(n.memories) ? n.memories : []).slice(-MAX_MEMORIES).reverse().map(m => ({ ...m })),
      promise, promiseText: !promise ? '' : promise.status === 'active' ? `${promise.dueAge} yaşında 1 zaman ayır: birlikte zaman geçir.` : promise.status === 'kept' ? 'Son sözünü tuttun.' : promise.status === 'broken' ? 'Son sözün tutulmadı; güven zamanla onarılabilir.' : 'Birlikte planladığınız gün yarım kaldı.',
      openHurts, aidAvailable: alive(s, n) && trust >= 50, referralAvailable: alive(s, n) && trust >= 72,
      explanation: 'Yakınlık birlikte iyi hissetmektir; güven tutarlı davranmakla gelişir. Hediye güven kazandırmaz. Söz vermek isteğe bağlıdır.' };
  }

  return { events, initNpc, migrateNpc, socialReason, social, annual, candidate, applyEffects, overview, introduction, romanticEvent };
});
