/* Bir Ömür — presentation and local saves. Simulation rules live in engine.js. */
(() => {
  'use strict';
  const E = globalThis.LifeEngine, D = globalThis.LifeData, A = globalThis.LifeAvatar;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = n => new Intl.NumberFormat('tr-TR', {style:'currency',currency:'TRY',maximumFractionDigits:0}).format(Number.isFinite(n) ? n : 0);
  const num = n => Math.round(Number.isFinite(n) ? n : 0).toLocaleString('tr-TR');
  const point = n => (Number.isFinite(n)?n:0).toLocaleString('tr-TR',{maximumFractionDigits:1});
  const price = n => E.price(state,n), wage = n => E.salary(state,n);
  const statNames = {knowledge:'Zekâ',strength:'Kuvvet',charisma:'Güzellik',happiness:'Mutluluk',health:'Sağlık',stress:'Stres',grade:'Okul başarısı',performance:'İş performansı',reputation:'İtibar'};
  const roleNames = {mother:'Anne',father:'Baba',sibling:'Kardeş',acquaintance:'Tanıdık',friend:'Arkadaş',classmate:'Okul arkadaşı',colleague:'İş arkadaşı',mentor:'Mentor',partner:'Partner',spouse:'Eş',child:'Çocuk',ex:'Eski partner'};
  const schoolNames = {none:'Henüz okula başlamadı',primary:'İlkokul',middle:'Ortaokul',high:'Lise',graduate:'Lise mezunu',university:'Üniversite',vocational:'Mesleki eğitim'};
  const tabs = [{id:'life',name:'Hayat',icon:'sprout'},{id:'activities',name:'Aktiviteler',icon:'compass'},{id:'people',name:'İlişkiler',icon:'people'},{id:'future',name:'Gelecek',icon:'briefcase'},{id:'assets',name:'Varlıklar',icon:'wallet'},{id:'health',name:'Sağlık',icon:'heart'}];
  const categories = {all:'Tümü',learning:'Öğrenme',social:'Sosyal',health:'İyi oluş',work:'İş & gelir',creative:'Yaratıcılık',outdoors:'Hareket'};
  const paths = {
    sprout:'M12 21V10M12 16C3 16 3 6 3 6s9 0 9 10Zm0-4C12 3 21 3 21 3s0 9-9 9Z',
    compass:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM16 8l-2.5 5.5L8 16l2.5-5.5L16 8Z',
    people:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8m6 10v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    briefcase:'M8 6V4h8v2M3 7h18v14H3V7ZM3 11l9 4 9-4m-11 2v4h4v-4',
    wallet:'M20 7V4H4a2 2 0 0 0 0 4h17v13H4a2 2 0 0 1-2-2V6m19 7h-6v5h6m-4-2.5h.01',
    heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
    arrow:'M4 12h16m-6-6 6 6-6 6',chevron:'m9 5 7 7-7 7',close:'m6 6 12 12M6 18 18 6',energy:'m13 2-9 12h7l-1 8 10-12h-7l1-8Z',
    settings:'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',
    edit:'m15 4 5 5M3 21l5-1L21 7l-5-5L3 15v6Z',book:'M12 6c-3-2-6-2-10-1v15c4-1 7-1 10 1m0-15c3-2 6-2 10-1v15c-4-1-7-1-10 1V6Z',
    lock:'M6 10V7a6 6 0 0 1 12 0v3M4 10h16v12H4V10Zm8 4v4',check:'m5 12 4 4L20 5',clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 6v6l4 2',pin:'M19 9c0 5-7 12-7 12S5 14 5 9a7 7 0 0 1 14 0Zm-7-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',star:'m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z',download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
    repeat:'M3 9a9 9 0 0 1 15-5l3 3M21 2v5h-5M21 15a9 9 0 0 1-15 5l-3-3m0 5v-5h5',info:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 11v6m0-11v1',search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z'
  };
  const icon = (id) => '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(paths[id]||paths.star)+'"/></svg>';
  let state = null, tab = 'life', category = 'all', assetTab = 'budget', peopleFilter = 'all', journalLimit = 12, result = '', toastTimer, storageOK = true;
  let lastStatChanges = {}, seenEventKey = '', seenNoticeKey='',activityView='actions',dialogReturnFocus = null, skipDialogFocus = false;
  const dockObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(updateDockSize) : null;
  const KEY = 'birOmur.v3';
  const UI_KEY='birOmur.ui.v1';
  let activityQuery='',activityFilter='age',showFuture=false,journalFilter='all',futureView='overview';
  let activeActivity='',scrollPositions={};
  const preferences=readPreferences();
  let notice = '';
  function readPreferences() {
    try {const p=JSON.parse(localStorage.getItem(UI_KEY)||'{}');return {favorites:Array.isArray(p?.favorites)?[...new Set(p.favorites.filter(id=>D.actions.some(a=>a.id===id)))].slice(0,64):[],confirmAge:p?.confirmAge===true};}
    catch {return {favorites:[],confirmAge:false};}
  }
  function savePreferences() {try{localStorage.setItem(UI_KEY,JSON.stringify(preferences));}catch{toast('Tercihin bu oturumda geçerli; tarayıcıya kaydedilemedi.');}}
  function load() {
    try {
      const modern = localStorage.getItem(KEY), legacy = localStorage.getItem('birOmurSave');
      if (modern || legacy) {
        const raw = JSON.parse(modern || legacy);
        if (!modern && legacy && !localStorage.getItem('birOmur.backup-v2')) localStorage.setItem('birOmur.backup-v2', legacy);
        state = E.migrate(raw);
        if (!modern) notice = 'Hayatın yeni sisteme taşındı. Önceki kaydının yedeği bu tarayıcıda saklanıyor.';
      }
    } catch (error) { notice = 'Kayıt okunamadı. Yeni hayat başlatabilir veya ayarlardan sağlam bir kayıt yükleyebilirsin.'; console.warn('Save load:', error); }
  }
  function save() {
    if (!state) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); storageOK = true; }
    catch { storageOK = false; toast('Tarayıcı kaydı dolu veya kapalı. Ayarlardan hayatını dosyaya kaydet.'); }
  }
  function toast(text) {
    clearTimeout(toastTimer); const el = $('#toast'); el.textContent = text; el.classList.add('visible');
    if ($('#dialog').open && $('#dialogFeedback')) $('#dialogFeedback').textContent = text;
    toastTimer = setTimeout(() => el.classList.remove('visible'), 4300);
  }
  function dispatch(type, payload = {}) {
    try {
      const before = {...state.stats};
      const response = E.act(state, type, payload);
      if (!response.ok) { toast(response.message || 'Bu işlem şu an yapılamıyor.'); return response; }
      if(type!=='ackNotice')lastStatChanges = Object.fromEntries(Object.keys(state.stats).map(k => [k, Math.round((state.stats[k]-before[k])*10)/10]).filter(([,v]) => v));
      if (type === 'choice' || type === 'activity' || type === 'social') result = response.message || '';
      if(type==='activity')activeActivity=payload.id;
      if (type === 'age') { tab = 'life'; result = '';activeActivity=''; }
      if (type === 'choice' || type==='ackNotice' || (type==='activity'&&$('#dialog').dataset.kind==='activity')) closeDialog(false);
      save(); render();
      $('#statFeedback').textContent = Object.entries(lastStatChanges).map(([k,v]) => statNames[k]+' '+point(Math.abs(v))+(v>0?' arttı':' azaldı')+', şimdi '+point(state.stats[k])).join('. ');
      if (response.message && !(type === 'age' && state.pending)) toast(response.message);
      return response;
    } catch (error) { console.error(error); toast('İşlem tamamlanamadı; kaydın korunuyor.'); return {ok:false}; }
  }
  function stageName() { return state.age<4?'Bebeklik':state.age<12?'Çocukluk':state.age<18?'Gençlik':state.age<40?'Yetişkinlik':state.age<65?'Orta yaş':'İleri yaş'; }
  function occupation() { try { return E.occupation(state); } catch { return state.job?.id || schoolNames[state.education?.level] || 'Kendi yolunda'; } }
  function avatar(person, options={}) { return A.render(person, options); }
  function moneyPill(n) { return '<span class="'+(n<0?'negative':'positive')+'">'+(n>0?'+':'')+money(n)+'</span>'; }
  function header() {
    return '<header class="topbar"><div class="brand"><span class="brand-mark">'+icon('sprout')+'</span><span class="brand-name">bir ömür<span>.</span></span><span class="brand-sub">SENİN HAYATIN. SENİN HİKÂYEN.</span></div><div class="row">'+(state?'<button class="icon-button" data-tab="health" aria-label="Sağlık ve yaşam düzeni">'+icon('heart')+'</button>':'')+'<span class="save-indicator"><i></i>'+(state?(storageOK?'Kaydedildi':'Kayıt uyarısı'):'Bir hayat. Bin ihtimal.')+'</span><button class="icon-button" data-do="install" aria-label="Telefona ekle">'+icon('download')+'</button><button class="icon-button" data-do="settings" aria-label="Ayarlar">'+icon('settings')+'</button></div></header>';
  }
  function welcome() {
    const person={name:'Deniz',age:24,gender:'neutral',appearance:{hair:'wave',beard:'none',color:'#443128',skin:'#dba77b'},stats:{happiness:80,health:90,stress:10,strength:30}};
    return header()+'<main class="welcome"><div class="welcome-copy"><span class="eyebrow">YAŞAM SİMÜLATÖRÜ · BİR ÖMÜR</span><h1>Küçük kararlar.<br><em>Koca bir hayat.</em></h1><p class="lead">Nereye doğacağını seçemezsin. Ama kim olacağına giden yolda her yıl yeni bir sayfa açabilirsin.</p><div class="welcome-points"><span>'+icon('people')+'Gerçek bağlar</span><span>'+icon('compass')+'Farklı yollar</span><span>'+icon('book')+'Kalıcı izler</span></div><form id="newLifeForm" class="welcome-form"><div class="form-grid"><div><label class="input-label" for="nameInput">Hikâyenin kahramanı</label><input id="nameInput" name="name" placeholder="Adın" maxlength="24" value="Deniz" required autocomplete="off"></div><div><label class="input-label" for="genderInput">Karakter</label><select id="genderInput" name="gender"><option value="random">Rastgele görünüm</option><option value="female">Kadın</option><option value="male">Erkek</option></select></div></div><button class="button primary" type="submit">İlk sayfayı aç '+icon('arrow')+'</button><small>Ailen, imkânların ve doğuştan gelen özelliklerin rastgele belirlenir. Her hayat doğumla başlar.</small></form>'+(notice?'<div class="onboard-summary">'+esc(notice)+'</div>':'')+'</div><div class="welcome-art" aria-hidden="true"><div class="art-orbit"></div><div class="art-disc"></div><span class="art-spark">✳</span><div class="art-avatar">'+avatar(person)+'</div><div class="floating-note note-a"><b>İlk arkadaşınla tanıştın.</b><small>6 yaş · Birlikte büyümek güzel.</small></div><div class="floating-note note-b"><b>Hayalin için bir adım daha.</b><small>18 yaş · Yeni başlangıçlar.</small></div><div class="floating-note note-c"><b>♡ Mutluluk +8</b><small>Bazen tek bir an yeter.</small></div></div></main>';
  }
  function energyPanel() {
    const energy=state.year.energy,max=state.year.maxEnergy;
    return '<footer class="play-dock"><div class="advance-row"><div class="time-budget"><span>'+icon('energy')+'<b>'+energy+'</b> / '+max+' zaman</span><div class="time-pips" aria-hidden="true">'+Array.from({length:max},(_,i)=>'<span class="'+(i<energy?'filled':'')+'"></span>').join('')+'</div><small>'+(state.pending?'Kararın bekliyor':energy?'Kalan zamanı kullanmak sana bağlı':'Bu yılın zamanı tamamlandı')+'</small></div><button class="age-button" data-do="'+(state.pending?'showEvent':'age')+'" '+(!state.alive?'disabled':'')+'><span class="age-plus" aria-hidden="true">'+(state.pending?'?':'+')+'</span><span>'+(state.pending?'Olayı aç':'Bir yıl ilerle')+'<small>'+(state.pending?'Hikâyeyi sen seç':state.age+' → '+(state.age+1)+' yaş')+'</small></span>'+icon('chevron')+'</button></div>'+navigation(true)+'</footer>';
  }
  function profile() {
    return '<div class="player-strip"><button class="player-avatar" data-do="appearance" aria-label="Görünümünü düzenle">'+avatar(state)+'<span>'+icon('edit')+'</span></button><div class="player-copy"><h2><button class="player-name" data-do="genetics" aria-label="Karakter ve genetik özelliklerin">'+esc(state.name)+'</button> <span>'+state.age+' yaş</span></h2><p>'+esc(occupation())+' · '+esc(state.city)+'</p></div><button class="cash-chip" data-tab="assets" data-assets-tab="budget" aria-label="Birikim ve bütçe: '+money(state.money)+'"><span>BİRİKİMİN</span><strong>'+money(state.money)+'</strong></button></div>';
  }
  function navigation(mobile=false) {
    const items=mobile?tabs.filter(t=>t.id!=='health'):tabs;
    return '<nav class="'+(mobile?'mobile-nav':'side-nav')+'" aria-label="Oyun bölümleri">'+items.map(t=>'<button class="'+(!mobile?'nav-button ':'')+(tab===t.id?'active':'')+'" data-tab="'+t.id+'" '+(tab===t.id?'aria-current="page"':'')+'>'+icon(t.icon)+'<span>'+t.name+'</span>'+(t.id==='people'&&state.npcs.some(n=>n.alive&&n.promise?.status==='active'&&n.promise.dueAge===state.age)?'<i class="nav-dot" aria-label="Bu yıl için bir sözün var"></i>':'')+'</button>').join('')+'</nav>';
  }
  function annualBudget() { try { return E.budget(state); } catch { return {income:0,expenses:0,tax:0,net:0,breakdown:[]}; } }

  function nextGoal() {
    if (!state.alive) return {title:'Yeni bir ihtimal',text:'Başka bir ailede, bambaşka bir hayat seni bekliyor.'};
    if (state.stats.health<40) return {title:'Kendini ihmal etme',text:'Sağlık ekranında muayene ve dinlenme seçeneklerine bak.'};
    if (state.age<6) return {title:'Dünyayı keşfet',text:'Oyunlar, aileyle geçirilen zaman ve ilk arkadaşlıklar seni şekillendirir.'};
    if (state.age<18) return {title:'Kendi yolunu bul',text:'Dersler, hobiler ve okul arkadaşların geleceğine kapı açar.'};
    if (state.education.courseId) return {title:'Diplomaya doğru',text:state.education.yearsLeft+' eğitim yılı kaldı. Notlarını ve bütçeni birlikte takip et.'};
    if (!state.job && state.age<65) return {title:'Bir sonraki adım',text:'Gelecek ekranında eğitim ve iş fırsatlarını incele.'};
    return {title:'Hayat işten büyük',text:'Bir hobi edin, dostuna zaman ayır veya birikimini bir hayale dönüştür.'};
  }
  function heading(title,description,kicker='HAYAT DEFTERİN') {return '<header class="page-heading"><div><p class="eyebrow">'+kicker+'</p><h1>'+title+'</h1><p>'+description+'</p></div><span class="pill"><i class="dot"></i>'+state.age+'. YIL</span></header>';}
  function section(title,sub='',right='') {return '<div class="section-title"><div><h2>'+title+'</h2>'+(sub?'<p>'+sub+'</p>':'')+'</div>'+right+'</div>';}
  function stats() {
    return '<section class="stats-grid compact-stats" aria-label="Karakter özellikleri">'+['health','happiness','knowledge','strength','charisma','stress'].map(k=>{
      const value=Math.max(0,Math.min(100,Math.round(state.stats[k]*10)/10)), change=lastStatChanges[k]||0;
      const good=k==='stress'?change<0:change>0;
      return '<div class="stat" data-stat="'+k+'" title="'+statNames[k]+': '+point(value)+' / 100'+(k==='stress'?'. Düşük stres daha iyidir.':'')+'"><div class="stat-header"><span>'+statNames[k]+'</span><span class="stat-value"><b>'+point(value)+'</b>'+(change?'<small class="stat-delta '+(good?'positive':'negative')+'" aria-label="Son eylem: '+point(Math.abs(change))+(change>0?' artış':' azalış')+'">'+(change>0?'+':'')+point(change)+'</small>':'')+'</span></div><div class="meter" role="progressbar" aria-label="'+statNames[k]+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+value+'"><i style="width:'+value+'%"></i></div></div>';
    }).join('')+'</section>';
  }
  function statusContext() {return '<div class="status-context"><span>GÜNCEL DURUMUN'+(Object.keys(lastStatChanges).length?' <small>· Son eylem ±</small>':'')+'</span><span>'+state.age+' yaş <b>'+money(state.money)+'</b></span></div>';}
  function statusDock() {return '<aside class="status-dock" aria-label="Güncel durumun"><div class="status-inner">'+profile()+stats()+'</div></aside>';}
  function updateDockSize() {
    const dock=$('.status-dock');
    if(dock)document.documentElement.style.setProperty('--status-height',Math.ceil(dock.getBoundingClientRect().height)+'px');
  }
  function effectsText(e={}) {
    const entries=Object.entries(e.stats||{}).concat(Object.entries(e).filter(([k,v])=>statNames[k]&&typeof v==='number'));
    const parts=entries.filter(([,v])=>v).map(([k,v])=>(v>0?'+':'')+point(v)+' '+statNames[k]);
    if(e.money)parts.push((e.money>0?'+':'')+money(e.money));
    if(e.bond)parts.push((e.bond>0?'+':'')+e.bond+' ilişki');
    for(const [id,v] of Object.entries(e.skillXP||{}))if(v)parts.push((v>0?'+':'')+point(v)+' '+(E.progression(state).find(t=>t.id===id)?.name||id)+' XP');
    return [...new Set(parts)].join(' · ');
  }
  function pendingEvent() {
    if (!state.pending) return '';
    const ev=E.eventById(state.pending.id) || state.pending;
    const npc=state.npcs.find(n=>n.id===state.pending.npcId);
    const eventKey=encodeURIComponent(state.age+':'+state.pending.id+':'+(state.pending.npcId||''));
    const fill = text => esc(String(text||'').replaceAll('{name}',state.name).replaceAll('{npc}',npc?.name||'Bir tanıdığın').replaceAll('{age}',state.age));
    return '<section class="event-card" aria-labelledby="eventTitle"><div class="event-top"><span class="event-icon">'+esc(ev.icon||'✦')+'</span><div><span class="eyebrow">HAYATINDAN BİR AN · KARAR SENİN</span><h2 id="eventTitle">'+fill(ev.title)+'</h2></div></div><div class="event-body"><p>'+fill(ev.description||ev.text)+'</p><div class="choice-list">'+(ev.choices||[]).map((c,i)=>{
      const reason=E.choiceReason(state,c);
      const chanceText=c.chance?.skill?'Sonuç '+(E.progression(state).find(t=>t.id===c.chance.skill)?.name||'beceri')+' deneyimine ve şansa bağlı.':'Sonuç özelliklerine ve şansa bağlı.';
      return '<button class="event-choice" data-do="choice" data-index="'+i+'" data-event-key="'+esc(eventKey)+'" '+(reason?'disabled':'')+'><span class="choice-letter">'+String.fromCharCode(65+i)+'</span><span class="grow"><b>'+fill(c.label||c.text)+'</b><small>'+esc(reason||(c.energy?c.energy+' zaman · ':'')+(c.cost?money(E.costOf(state,c))+' · ':'')+(c.chance?chanceText:effectsText(E.effectPreview(state,c.effects||{}))||'Bu karar hikâyende bir iz bırakacak.'))+'</small></span>'+icon(reason?'lock':'chevron')+'</button>';
    }).join('')+'</div><p class="event-note">'+icon('clock')+'Bazı kararların etkisi sonraki yıllarda ortaya çıkar.</p></div></section>';
  }
  function activityCard(a) {
    const why=E.actionReason(state,a),cost=E.costOf(state,a),preview=E.activityPreview(state,a),favorite=preferences.favorites.includes(a.id);
    const xp=Object.entries(preview.xp).filter(([,v])=>v>0).map(([id,v])=>'+'+point(v)+' '+(E.progression(state).find(t=>t.id===id)?.name||id)+' XP').join(' · ');
    return '<div class="activity-row '+(activeActivity===a.id?'just-completed':'')+'"><button class="activity-card '+(why?'is-locked':'')+'" data-do="inspectActivity" data-id="'+a.id+'"><span class="activity-symbol" aria-hidden="true">'+esc(a.icon||'✦')+'</span><span class="activity-copy"><h3>'+esc(a.name)+'</h3><p>'+esc(why||effectsText(preview.effects)||a.description)+'</p>'+(!why&&xp?'<span class="xp-gain">'+esc(xp)+'</span>':'')+(preview.repeat?'<small class="practice-note">Bu yıl tekrar: daha düşük kazanım</small>':'')+'</span><span class="activity-meta"><small>'+icon('energy')+(a.energy||1)+(cost?'<br>'+money(cost):'')+'</small>'+icon(why?'lock':'chevron')+'</span></button><button class="favorite-button '+(favorite?'is-favorite':'')+'" data-do="toggleFavorite" data-id="'+a.id+'" aria-label="'+esc(a.name)+': '+(favorite?'favorilerden çıkar':'favorilere ekle')+'" aria-pressed="'+favorite+'">'+icon('star')+'</button></div>';
  }
  function inspectActivity(id) {
    const a=D.actions.find(a=>a.id===id);if(!a)return;
    const why=E.actionReason(state,a),preview=E.activityPreview(state,a),cost=E.costOf(state,a);
    const effectChips=Object.entries(preview.effects).filter(([k,v])=>(statNames[k]||k==='bond')&&typeof v==='number'&&v).map(([k,v])=>'<span class="effect-chip '+((k==='stress'?v<0:v>0)?'positive':'negative')+'">'+(v>0?'+':'')+point(v)+' '+(statNames[k]||'ilişki')+'</span>').join('');
    const xp=Object.entries(preview.xp).filter(([,v])=>v>0).map(([id,v])=>'<span class="effect-chip xp-gain">+'+point(v)+' '+esc(E.progression(state).find(t=>t.id===id)?.name||id)+' XP</span>').join('');
    dialog(a.name,'<div class="activity-detail-hero"><span class="activity-symbol">'+esc(a.icon||'✦')+'</span><p>'+esc(a.description)+'</p></div><div class="activity-cost-row"><span>'+icon('energy')+(a.energy||1)+' zaman</span><span>'+icon('wallet')+(cost?money(cost):'Ücretsiz')+'</span></div><h3>Şu anki kazanımın</h3><div class="effect-chips">'+effectChips+xp+(preview.effects.money?'<span class="effect-chip '+(preview.effects.money>0?'positive':'negative')+'">'+moneyPill(preview.effects.money)+'</span>':'')+'</div>'+(preview.repeat?'<p class="helper-text">Aynı etkinliği bu yıl tekrarlıyorsun. Kazanım, tekrar ve mevcut durumun hesaba katılarak gösterilir.</p>':'')+'<p class="helper-text">Yukarıdaki değerler mevcut özelliklerine göre hesaplandı. Olası karşılaşmalar ve özel sonuçlar ayrıca etkileyebilir.</p>'+(why?'<div class="activity-help">'+icon('lock')+'<span>'+esc(why)+'</span></div>':'')+'<button class="button primary action-confirm" data-do="activity" data-id="'+a.id+'" '+(why?'disabled':'')+'>Bunu yap · '+(a.energy||1)+' zaman '+icon('arrow')+'</button>',{kind:'activity',activityId:id});
  }
  function journal() {
    const source=journalFilter==='milestones'?state.log.filter(e=>e.kind==='milestone'):state.log;
    const ages=[...new Set(source.map(e=>e.age))].sort((a,b)=>b-a);
    const group=age=>'<section class="timeline-group '+(age===state.age?'is-current':'')+'" data-age="'+age+'"><div class="timeline-label"><span class="timeline-dot"></span><h3>'+age+' yaş</h3><span>'+(age===state.age?'ŞİMDİ':'BİR SAYFA DAHA')+'</span></div><div class="journal">'+source.filter(e=>e.age===age).map(e=>{
      const symbol={education:'book',career:'briefcase',finance:'wallet',year:'clock',relationship:'people',decision:'compass',health:'heart',milestone:'star',loss:'heart',inventory:'wallet'}[e.kind]||'sprout';
      const body='<h4>'+esc(e.title||'Hayatından bir an')+'</h4><p>'+esc(e.text)+'</p>';
      return '<article class="journal-entry" data-kind="'+esc(e.kind||'life')+'"><span class="entry-icon">'+icon(symbol)+'</span><div class="entry-body">'+(['year','finance'].includes(e.kind)?'<details><summary>'+esc(e.title||'Yılın hesabı')+'</summary><p>'+esc(e.text)+'</p></details>':body)+'</div></article>';
    }).join('')+'</div></section>';
    if(!ages.length)return '<div class="empty-actions"><h3>Henüz bir dönüm noktası yok.</h3><p>Hikâyen ilerledikçe bu sayfa dolacak.</p></div>';
    const current=ages.includes(state.age)?group(state.age):'',older=ages.filter(age=>age!==state.age),shown=older.slice(0,journalLimit);
    return current+(older.length?'<details class="timeline-older" '+(!current?'open':'')+'><summary>'+icon('book')+'Önceki yıllar <span>'+older.length+' yıl '+icon('chevron')+'</span></summary>'+shown.map(group).join('')+(older.length>shown.length?'<button class="text-link" data-do="moreJournal">Daha eski anıları oku</button>':'')+'</details>':'');
  }
  function life() {
    const b=annualBudget(),next=nextGoal(),close=state.npcs.filter(n=>n.alive&&n.bond>=60).length;
    const due=state.npcs.find(n=>n.alive&&n.promise?.status==='active'&&n.promise.dueAge===state.age);
    let route=state.stats.health<40?'health':state.age>=18&&!state.job&&!state.education.courseId?'future':'activities';
    const hint=due?{title:due.name+' ile bir planın var',text:'Bu yıl birlikte zaman geçirmeye söz verdin.'}:next;
    return '<div class="life-heading"><div><p class="eyebrow">HAYAT DEFTERİN</p><h1>Senin hikâyen.</h1></div><span class="pill">'+esc(stageName())+'</span></div>'+
      (notice?'<div class="warning">'+esc(notice)+'</div>':'')+(!state.alive?deathSummary():
      '<div class="life-summary"><button '+(state.age<18?'data-tab="future"':'data-tab="assets" data-assets-tab="budget"')+'><span>'+icon('briefcase')+(state.age<18?'Okul başarısı':'Yıllık bütçe')+'</span><b>'+(state.age<18?(state.age<6?'Yakında':num(state.education.grade)+'/100'):money(b.netAfterDebt))+'</b></button><button data-tab="people"><span>'+icon('people')+'Güçlü bağ</span><b>'+close+' kişi</b></button><button data-activity-view="progress"><span>'+icon('star')+'Dönüm noktası</span><b>'+state.milestones.length+'</b></button></div><button class="next-step" '+(due?'data-do="person" data-id="'+esc(due.id)+'"':'data-tab="'+route+'"')+'><span class="next-step-icon">'+icon(due?'people':'compass')+'</span><span><b>'+esc(hint.title)+'</b><small>'+esc(hint.text)+'</small></span>'+icon('chevron')+'</button>')+
      (result?'<div class="life-result" role="status"><span>'+icon('check')+'</span><div><b>Kararının ardından</b><p>'+esc(result)+'</p></div></div>':'')+
      '<div class="journal-toolbar"><h2>'+state.age+' yaşında</h2><div class="filter-buttons" aria-label="Günlük görünümü">'+[['all','Tüm anlar'],['milestones','Dönüm noktaları']].map(([k,v])=>'<button data-journal-filter="'+k+'" aria-pressed="'+(journalFilter===k)+'" class="'+(journalFilter===k?'active':'')+'">'+v+'</button>').join('')+'</div></div>'+journal()+
      '<div class="life-shortcuts"><button data-tab="activities">'+icon('compass')+'Bir şey yap</button><button data-activity-view="progress">'+icon('star')+'Gelişimini gör</button><button data-tab="health">'+icon('heart')+'Kendine bak</button></div>';
  }
  function activities() {
    return heading('Bugün ne yapalım?','Küçük bir adım seç. Gerisi hikâye.','AKTİVİTELER')+
      '<div class="tabs" aria-label="Aktivite görünümü">'+[['actions','Aktiviteler'],['progress','Gelişim & projeler']].map(([k,v])=>'<button class="tab '+(activityView===k?'active':'')+'" aria-pressed="'+(activityView===k)+'" data-activity-view="'+k+'">'+v+'</button>').join('')+'</div>'+(activityView==='progress'?progressPanel():
      '<div class="activity-toolbar"><label class="search-field">'+icon('search')+'<input type="search" id="activitySearch" aria-label="Aktivite ara" placeholder="Aklında ne var? Aktivite ara…" value="'+esc(activityQuery)+'" autocomplete="off"><button class="icon-button" data-do="clearSearch" aria-label="Aramayı temizle">'+icon('close')+'</button></label><div class="filter-buttons" aria-label="Aktivite durumu">'+[['age','Bu yaşta'],['ready','Yapılabilir'],['favorites','Favoriler']].map(([k,v])=>'<button class="'+(activityFilter===k?'active':'')+'" aria-pressed="'+(activityFilter===k)+'" data-activity-filter="'+k+'">'+v+'</button>').join('')+'</div></div><div class="tabs category-tabs" role="group" aria-label="Aktivite kategorisi">'+Object.entries(categories).map(([k,v])=>'<button class="tab '+(category===k?'active':'')+'" aria-pressed="'+(category===k)+'" data-category="'+k+'">'+v+'</button>').join('')+'</div><div id="activityResults">'+activityResults()+'</div>');
  }
  function activityResults() {
    const query=activityQuery.toLocaleLowerCase('tr-TR').trim();
    const pool=D.actions.filter(a=>(category==='all'||a.category===category)&&(!query||(a.name+' '+a.description).toLocaleLowerCase('tr-TR').includes(query)));
    const appropriate=a=>state.age>=(a.minAge||0)&&state.age<=(a.maxAge??120);
    const visible=pool.filter(a=>activityFilter==='favorites'?preferences.favorites.includes(a.id):activityFilter==='ready'?!E.actionReason(state,a):query||appropriate(a));
    const upcoming=activityFilter==='age'&&!query?pool.filter(a=>state.age<(a.minAge||0)):[];
    const empty=activityFilter==='favorites'?'Yıldız koyduğun aktiviteler burada.':activityFilter==='ready'?'Şu an bu filtrede yapılabilir bir aktivite yok.':'Bu aramada bir aktivite bulamadık.';
    return '<p class="result-count" role="status" aria-live="polite">'+visible.length+' aktivite'+(query?' · “'+esc(activityQuery)+'”':'')+'</p><div class="activity-grid">'+visible.map(activityCard).join('')+'</div>'+(!visible.length?'<div class="empty-actions">'+icon(activityFilter==='favorites'?'star':'compass')+'<h3>'+empty+'</h3><p>'+(activityFilter==='favorites'?'Bir aktivitenin yanındaki yıldıza dokun. Bu liste yalnızca sana ait.':'Kategoriyi değiştir, aramayı temizle veya “Bu yaşta” görünümünden koşulları incele.')+'</p><button class="button" data-do="resetActivityFilters">Tüm seçenekleri göster</button></div>':'')+(upcoming.length?'<button class="future-toggle" data-do="toggleFuture" aria-expanded="'+showFuture+'">'+icon('lock')+'İleride açılacaklar <span>'+upcoming.length+' '+icon('chevron')+'</span></button>'+(showFuture?'<div class="activity-grid upcoming-actions">'+upcoming.map(activityCard).join('')+'</div>':''):'');
  }
  function progressPanel() {
    const tracks=E.progression(state),projects=D.actions.filter(a=>a.project);
    return '<section class="card pad"><p class="eyebrow">EMEĞİN KALICI İZİ</p><h2 style="margin-top:8px">Bir puandan daha fazlası.</h2><p class="helper-text">Özelliklerin yükseldikçe gelişmek zorlaşır. Deneyim ise birikir: uzmanlık basamakları yeni projeleri ve meslekleri açar. Aynı etkinliğin bu yılki tekrarları daha az kazandırır.</p><div class="budget-row"><span>Sağlık ve stres kaynaklı çalışma verimi</span><b>%'+num(E.trainingEfficiency(state)*100)+'</b></div></section><div class="skill-grid">'+tracks.map(t=>'<article class="card pad skill-card"><div class="row between"><h3>'+esc(t.name)+'</h3><span class="pill">'+t.tierName+'</span></div><div class="skill-level">'+point(t.xp)+' <small>/ '+(t.nextXP||1200)+' XP</small></div><div class="meter" role="progressbar" aria-label="'+esc(t.name)+' uzmanlık ilerlemesi" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+t.progress+'"><i style="width:'+t.progress+'%"></i></div><p class="helper-text">'+esc(t.goal)+'</p><p class="skill-unlock">'+icon('lock')+esc(t.unlocks[0]?'Sıradaki kapı: '+t.unlocks[0].name+' · '+t.unlocks[0].minAge+' yaş ve '+t.unlocks[0].tier+'. basamak':'Yeni bir proje tamamla veya uzmanlığını kariyerine taşı.')+'</p></article>').join('')+'</div>'+section('İmzanı bıraktığın işler.','Projeler tekrarlanabilir; ilk tamamlaman kalıcı bir dönüm noktasıdır.','<span class="badge-count">'+projects.filter(a=>state.flags[a.project.flag]).length+' / '+projects.length+'</span>')+'<div class="activity-grid">'+projects.map(a=>'<div class="project-slot">'+(state.flags[a.project.flag]?'<span class="project-done">'+icon('check')+'İlk tamamlanış defterinde</span>':'')+activityCard(a)+'</div>').join('')+'</div>';
  }
  function people() {
    const familyRoles=['mother','father','sibling','child','spouse'];
    const list=state.npcs.filter(p=>peopleFilter==='all'||(peopleFilter==='family'?familyRoles.includes(p.role):peopleFilter==='alive'?p.alive:!p.alive));
    return heading('Hayatındaki insanlar.','Bir sohbetle başlar. Zamanla hikâyeye dönüşür.','İLİŞKİLER')+
      '<div class="tabs">'+[['all','Herkes'],['family','Aile'],['alive','Hayatındakiler'],['memories','Hatıralar']].map(([k,v])=>'<button class="tab '+(peopleFilter===k?'active':'')+'" aria-pressed="'+(peopleFilter===k)+'" data-people-filter="'+k+'">'+v+'</button>').join('')+'</div><div class="npc-grid">'+list.map(p=>{const m=E.relationship(state,p),due=p.alive&&m.promise?.status==='active'&&m.promise.dueAge===state.age;return '<button class="card npc-card '+(!p.alive?'deceased':'')+'" data-do="person" data-id="'+esc(p.id)+'"><div class="row"><span class="npc-avatar">'+avatar(p)+'</span><span class="grow"><h3>'+esc(p.name)+'</h3><p>'+esc(roleNames[p.role]||p.role)+' · '+p.age+' yaş</p><span class="npc-tags"><span>Güven '+num(m.trust)+'</span>'+(due?'<span class="promise-tag">Bu yıl bir sözün var</span>':m.openHurts?'<span class="hurt-tag">Konuşulmayı bekleyenler var</span>':'')+'</span></span>'+icon('chevron')+'</div><div class="npc-bond"><span>Yakınlık</span><div class="meter"><i style="width:'+p.bond+'%"></i></div><b>'+num(p.bond)+'</b></div></button>';}).join('')+'</div>'+
      (!list.length?'<div class="card empty">'+icon('people')+'<h3>Henüz kimse yok.</h3><p>Aktiviteler yeni tanışıklıklara kapı açar. Yakınlaşıp yakınlaşmamak sana kalır.</p></div>':'');
  }
  function future() {
    const edu=state.education,course=D.courses.find(c=>c.id===edu.courseId),job=D.careers.find(c=>c.id===state.job?.id);
    const program=c=>{const reason=E.courseReason(state,c);return '<article class="card list-card"><span class="list-icon">'+esc(c.icon||'🎓')+'</span><div class="grow"><h3>'+esc(c.name)+'</h3><p>'+esc(c.description||'')+'</p><p>'+c.duration+' yıl · '+money(price(c.annualCost))+'/yıl (burs öncesi)</p>'+coursePreview(c)+(reason?'<div class="requirement">'+esc(reason)+'</div>':'')+'</div><button class="button small" data-do="enroll" data-id="'+c.id+'" '+(reason?'disabled':'')+'>Kayıt ol</button></article>';};
    const career=c=>{const reason=E.careerReason(state,c);return '<article class="card list-card"><span class="list-icon">'+esc(c.icon||'💼')+'</span><div class="grow"><h3>'+esc(c.name)+'</h3><p>'+esc(c.description||'')+'</p><p>'+money(wage(c.salary))+'/yıl brüt</p>'+(reason?'<div class="requirement">'+esc(reason)+'</div>':'')+'</div><button class="button small" data-do="apply" data-id="'+c.id+'" '+(reason?'disabled':'')+'>Başvur</button></article>';};
    const referral=state.flags.careerReferral,hasReferral=referral&&!referral.consumed&&referral.expiresAge>=state.age;
    let body='';
    if(futureView==='education')body='<div class="guide-tip">'+icon('book')+'<span>Eğitim yılda 2 zaman ayırır; kayıt ayrıca 1 zaman ister. Programları not, uzmanlık ve burs sonrası bütçenle birlikte değerlendir.</span></div><div class="detail-list">'+D.courses.map(program).join('')+'</div>';
    else if(futureView==='jobs')body='<div class="guide-tip">'+icon('briefcase')+'<span>Bu yıl '+(state.year.used.jobApplications||0)+'/2 başvuru yaptın. İş, yılda 3 zaman ayırır; başvuru ayrıca 1 zaman ister. Maaş yıl tamamlandığında ödenir.</span></div>'+(hasReferral?'<div class="warning">Bir tanıdığının referansı var. '+referral.expiresAge+' yaşına kadar ilk uygun başvurunda şansın artacak.</div>':'')+'<div class="detail-list">'+D.careers.map(career).join('')+'</div>';
    else {
      body='<section class="card pad"><div class="row between"><div><span class="eyebrow">EĞİTİMİN</span><h2>'+esc(course?.name||schoolNames[edu.level]||'Öğrenme yolculuğun')+'</h2></div><span class="list-icon">🎓</span></div><p class="helper-text">'+(edu.degree?'Diploma: '+esc(D.courses.find(c=>c.degree===edu.degree)?.name||edu.degree):state.age<6?'Okul 6 yaşında başlayacak. O zamana kadar oyunlar ve merakla dünyayı keşfet.':'Dersler ve seçimler okul başarını şekillendirir.')+'</p>'+(state.age>=6?'<div class="budget-row"><span>Okul başarısı</span><b>'+num(edu.grade)+' / 100</b></div><div class="meter course-progress"><i style="width:'+Math.max(0,Math.min(100,edu.grade||0))+'%"></i></div>':'')+(course?'<p class="helper-text">Mezuniyete '+edu.yearsLeft+' yıl · '+money(price(course.annualCost*(1-(edu.scholarship||0))))+'/yıl</p>':'')+'</section>';
      if(state.job)body+=section('İş hayatın')+'<section class="card pad"><div class="row between"><div><span class="eyebrow">KIDEM '+state.job.level+'</span><h2>'+esc(job?.name||state.job.id)+'</h2></div><span class="list-icon">'+esc(job?.icon||'💼')+'</span></div><div class="budget-row"><span>Yıllık brüt maaş</span><b>'+money(wage(state.job.salary))+'</b></div><div class="budget-row"><span>İş performansı</span><b>'+num(state.job.performance)+' / 100</b></div><div class="meter"><i style="width:'+state.job.performance+'%"></i></div><p class="helper-text">Terfi için performans, kıdem ve uzmanlık birlikte gerekir. Bütçen kadar dinlenmeni de planla.</p><div class="row wrap"><button class="button small" data-do="confirmQuit">İşten ayrıl</button>'+(state.age>=60?'<button class="button small" data-do="retire">Emekli ol</button>':'')+'</div></section>';
      body+='<div class="route-grid"><button class="next-step" data-future-view="education"><span class="next-step-icon">'+icon('book')+'</span><span><b>Eğitim yollarını keşfet</b><small>'+D.courses.length+' program · Diploma ve burslar</small></span>'+icon('chevron')+'</button><button class="next-step" data-future-view="jobs"><span class="next-step-icon">'+icon('briefcase')+'</span><span><b>İş ilanlarını incele</b><small>'+D.careers.length+' meslek · Koşullar ve maaşlar</small></span>'+icon('chevron')+'</button></div><button class="text-link" data-activity-view="progress">Uzmanlıklarını ve kariyer kapılarını incele →</button>';
    }
    return heading('Yolunu sen çiz.','Bir diploma, bir meslek veya yepyeni bir başlangıç.','GELECEK')+'<div class="tabs" aria-label="Gelecek görünümü">'+[['overview','Şu an'],['education','Eğitimler'],['jobs','İş ilanları']].map(([k,v])=>'<button class="tab '+(futureView===k?'active':'')+'" aria-pressed="'+(futureView===k)+'" data-future-view="'+k+'">'+v+'</button>').join('')+'</div>'+body;
  }
  function assets() {
    const b=annualBudget();
    let body='';
    if(assetTab==='budget') body='<section class="card pad"><h3>Gelecek yılın tahmini</h3><p class="helper-text">Tüm tutarlar bir tam yıla aittir. Beklenmedik olaylar ayrıca etkiler.</p>'+((b.breakdown||[]).map(r=>'<div class="budget-row"><span>'+esc(r.label)+'</span><b>'+money(r.amount)+'</b></div>').join(''))+'<div class="budget-row total"><span>Borç ödemesi sonrası fark</span>'+moneyPill(b.netAfterDebt)+'</div><div class="budget-row"><span>Tahmini birikim</span><b>'+money(b.projectedCash)+'</b></div><div class="budget-row"><span>Tahmini borç</span><b>'+money(b.projectedDebt)+'</b></div></section>'+
      (state.lastBudget?'<section class="card pad" style="margin-top:15px"><h3>Geçen yılın hesabı</h3><div class="budget-row"><span>Gelir</span><b>'+money(state.lastBudget.income)+'</b></div><div class="budget-row"><span>Gider + vergi</span><b>'+money(state.lastBudget.expenses)+'</b></div><div class="budget-row total"><span>Anapara ödemesi sonrası nakit farkı</span>'+moneyPill(state.lastBudget.cashFlow??state.lastBudget.net)+'</div></section>':'');
    if(assetTab==='shop') body='<div class="detail-list">'+D.items.map(i=>{const has=state.inventory.some(x=>x.id===i.id),reason=E.buyReason(state,i),locked=!!reason;return '<article class="card list-card"><span class="list-icon">'+esc(i.icon||'📦')+'</span><div class="grow"><h3>'+esc(i.name)+'</h3><p>'+esc(i.description||i.note||'')+'</p>'+(i.maintenance?'<p>Yıllık bakım: '+money(price(i.maintenance))+'</p>':'')+(reason?'<div class="requirement">'+esc(reason)+'</div>':'')+'</div><div class="list-actions"><span class="price">'+money(price(i.price))+'</span><button class="button small" data-do="buy" data-id="'+i.id+'" '+(locked?'disabled':'')+'>'+(!i.consumable&&has?'Sende var':'Satın al')+'</button></div></article>';}).join('')+'</div>';
    if(assetTab==='inventory') body=state.inventory.length?'<div class="detail-list">'+state.inventory.map(x=>{const i=D.items.find(i=>i.id===x.id);if(!i)return '';const value=E.itemValue?E.itemValue(state,x):Math.round(i.price*.5);return '<article class="card list-card"><span class="list-icon">'+esc(i.icon||'📦')+'</span><div class="grow"><h3>'+esc(i.name)+'</h3><p>'+esc(i.description||'')+'</p><p>Kondisyon %'+num(x.condition??100)+'</p></div><div class="list-actions">'+(i.consumable?'<button class="button small" data-do="use" data-id="'+i.id+'">Kullan</button>':'')+'<button class="button small" data-do="sell" data-id="'+i.id+'" '+(value<=0?'disabled':'')+'>'+money(value)+' · Sat</button></div></article>';}).join('')+'</div>':'<div class="card empty">'+icon('wallet')+'<h3>Şimdilik hafif bir çanta.</h3><p>Bazı eşyalar yeni aktivitelerin anahtarıdır. İlk kitabınla başlayabilirsin.</p></div>';
    if(assetTab==='budget')body=economyPanel(b)+body+housingPanel();
    return heading('İmkânların ve seçimlerin.','İhtiyaçlarını karşıla. Bir hayal için yer aç.','BÜTÇE & VARLIKLAR')+'<div class="metrics"><div class="metric"><span class="label">Birikim</span><strong>'+money(state.money)+'</strong></div><div class="metric"><span class="label">Borç</span><strong class="'+(state.debt?'negative':'')+'">'+money(state.debt)+'</strong></div><div class="metric"><span class="label">Borç sonrası yıllık fark</span><strong class="'+(b.netAfterDebt<0?'negative':'positive')+'">'+money(b.netAfterDebt)+'</strong></div></div>'+
      (state.debt>0?'<div class="warning row between" style="margin-top:14px"><span>Borç, yıllık faiz ve stres oluşturur.</span><button class="button small" data-do="repay" '+(state.money<=0?'disabled':'')+'>Borç öde</button></div>':'')+
      '<div class="tabs" style="margin-top:23px">'+[['shop','Mağaza'],['inventory','Eşyalarım'],['budget','Yıllık bütçe']].map(([k,v])=>'<button class="tab '+(assetTab===k?'active':'')+'" data-assets-tab="'+k+'">'+v+'</button>').join('')+'</div>'+body;
  }
  function coursePreview(c) {
    if(state.age<18||state.education.courseId||state.job)return '';
    const scholarship=Math.max(state.education.scholarship||0,state.education.grade>=85&&state.stats.knowledge>=60?.8:state.education.grade>=75?.4:0);
    const b=E.budget({...state,education:{...state.education,courseId:c.id,scholarship}});
    return '<p>Bursla yıllık ücret: '+money(price(c.annualCost*(1-scholarship)))+' · %'+num(scholarship*100)+' burs</p><p class="'+(b.net<0?'negative':'positive')+'">Mevcut yaşam düzeninle yıllık fark: '+money(b.net)+'</p><p class="helper-text">'+(b.net<0?'Birikimin yetmezse açık faizli borca eklenir. ':'')+'İlerleyen yılların fiyatları ve olayları bu tahmini değiştirebilir.</p>';
  }
  function economyPanel(b) {
    const e=E.economy(state),support=b.familySupport;
    return '<section class="card pad economy-card"><p class="eyebrow">'+esc(e.city)+' · '+esc(e.cycleLabel)+'</p><h2 style="margin-top:8px">Paranın da bir hikâyesi var.</h2><p class="helper-text">Fiyatlar ve ücretler ayrı değişir. Şehir, ev düzeni, eğitim, çocuklar ve borç birlikte hesaplanır. Aşağıdaki plan şu anki kararlarınla tamamlayacağın yıl içindir.</p><div class="economy-indices"><span>Fiyat değişimi <b>%'+point(e.inflation*100)+'</b></span><span>Ücret değişimi <b>%'+point(e.wageGrowth*100)+'</b></span><span>Borç faizi <b>%'+point(e.interestRate*100)+'</b></span></div>'+(e.warning?'<div class="warning">'+esc(e.warning)+'</div>':'')+'<div class="budget-row"><span>Nakit tamponun</span><b>'+point(e.monthsCovered)+' aylık temel gider</b></div><div class="budget-row"><span>Bu yıl eline geçen ek gelir</span><b>'+money(b.discretionaryIncome)+'</b></div><div class="budget-row"><span>Ek gelirin yıl sonunda ödenecek vergisi</span><b>'+money(b.sideIncomeTax)+'</b></div><p class="helper-text">Ek gelir zaten cüzdanında; yıl sonu gelirine ikinci kez eklenmez. Hediye, aile desteği ve eşya satışı emek geliri sayılmaz.</p><div class="budget-row"><span>Otomatik anapara ödemesi</span><b>'+money(b.debtPrincipal)+'</b></div><div class="budget-row total"><span>Anapara sonrası yıllık nakit farkı</span>'+moneyPill(b.netAfterDebt)+'</div><p class="helper-text">Anapara ödemesi gider değildir: hem nakdini hem borcunu azaltır. Nakit tamponu yoksa yeni borç alıp ödeme yapılmaz.</p>'+(state.age<26?'<details class="family-budget"><summary>Ailenin destek kapasitesi</summary><div class="budget-row"><span>Vergi ve hane ihtiyaçları sonrası</span><b>'+money(support.disposable)+'</b></div><div class="budget-row"><span>Bu yıl ortak destek havuzu</span><b>'+money(support.pool)+'</b></div><div class="budget-row"><span>Ek yardımlardan sonra kalan</span><b>'+money(support.remaining)+'</b></div><p class="helper-text">Anne ve baban aynı bütçeyi paylaşır. Kardeşlerin ve ailenin kendi ihtiyaçları da hesaba katılır; sevgi limitsiz, bütçe değil.</p></details>':'')+'</section>';
  }
  function housingPanel() {
    if(state.age<18)return '';
    return section('Taşınmadan önce hesabını yap.','Tahminler bugünkü fiyatlarla, yeni düzenin tam bir yılı için.')+'<div class="housing-grid">'+E.housingForecast(state).map(h=>'<article class="card pad"><div class="row between"><h3>'+esc(h.label)+'</h3>'+(state.lifestyle.housing===h.id?'<span class="pill">Şu an</span>':'')+'</div><div class="budget-row"><span>Yıllık gider + vergi</span><b>'+money(h.annualExpenses)+'</b></div><div class="budget-row"><span>Borç ödemesi sonrası fark</span>'+moneyPill(h.afterDebt)+'</div><div class="budget-row"><span>Tek seferlik taşınma</span><b>'+money(h.moveCost)+'</b></div><p class="helper-text">'+(!h.owned?'Kendi evine geçmek için önce bir ev almalısın.':!h.available?'Aile evinde kalma imkânın artık yok.':h.moveCost>state.money?'Taşınma masrafına henüz yeterli nakdin yok.':'Yaşam düzenini Sağlık menüsünden değiştirebilirsin.')+'</p></article>').join('')+'</div>';
  }
  function lifestyleSelect(key,name,desc,options) {return '<div class="setting-row"><div><h3>'+name+'</h3><p>'+desc+'</p></div><select aria-label="'+name+'" data-lifestyle="'+key+'" '+(!state.alive||state.pending?'disabled':'')+'>'+options.map(([k,v])=>'<option value="'+k+'" '+(state.lifestyle[key]===k?'selected':'')+'>'+v+'</option>').join('')+'</select></div>';}
  function health() {
    const healthActions=D.actions.filter(a=>a.category==='health'&&state.age<=(a.maxAge??120));
    return heading('Önce kendine iyi bak.','Sağlık bir sayıdan fazlası. Alışkanlıkların her yıl birikir.','BEDEN & ZİHİN')+
      '<section class="card pad health-hero"><div class="row between"><div><p class="eyebrow">GENEL SAĞLIK</p><p class="health-number" style="margin-top:14px">'+num(state.stats.health)+' <span>/ 100</span></p></div><div><span class="pill '+(state.stats.health<40?'bad':'')+'">'+(state.stats.health>=75?'İyi hissediyorsun':state.stats.health>=40?'Kendine dikkat et':'Desteğe ihtiyacın var')+'</span><p class="helper-text">Stres: '+num(state.stats.stress)+' / 100</p></div></div></section>'+
      section('Sağlık dosyan.')+(state.conditions.length?state.conditions.map(c=>'<article class="condition"><div class="row between"><h3>'+esc(c.name||c.id)+'</h3><span class="pill bad">'+(c.chronic?'Kronik':'Geçici')+'</span></div><p>Şiddet: '+num(c.severity)+' · Tedavi ve yaşam alışkanlıkları gidişatı etkiler.</p></article>').join(''):'<section class="card pad"><div class="row">'+icon('check')+'<div><h3>Bilinen bir rahatsızlığın yok.</h3><p class="helper-text" style="margin-top:4px">Dinlenme, dengeli beslenme ve hareket bu durumu korumana yardımcı olur.</p></div></div></section>')+
      section('Günlük hayatının ritmi.','Seçimlerin yıllık sağlık, stres ve bütçeni etkiler.')+'<section class="card pad">'+
      lifestyleSelect('diet','Beslenme','Kalite arttıkça yıllık gider de yükselir.',[['frugal','Ekonomik'],['balanced','Dengeli'],['quality','Özenli']])+
      lifestyleSelect('pace','Hayat temposu','Çaba ve dinlenme arasındaki denge.',[['relaxed','Sakin'],['balanced','Dengeli'],['ambitious','Yoğun']])+
      lifestyleSelect('housing','Yaşam alanı','Barınma bütçenin önemli bir parçası.',[['family','Aile yanı'],['shared','Paylaşımlı ev'],['rent','Kiralık ev'],['own','Kendi evin']])+'</section>'+
      section('Biraz nefes al.')+'<div class="activity-grid">'+healthActions.map(activityCard).join('')+'</div>';
  }
  function deathSummary() {
    return '<section class="card death-card">'+avatar(state)+'<p class="eyebrow" style="margin-top:17px">BİR HAYATIN ARDINDAN</p><h2>'+esc(state.name)+' · '+state.age+' yıl</h2><p>'+esc(state.deathCause||'Bir ömür hatıralara dönüştü.')+'</p><div class="metrics"><div class="metric"><span class="label">Hatıra</span><strong>'+state.log.length+'</strong></div><div class="metric"><span class="label">Tanışılan kişi</span><strong>'+state.npcs.length+'</strong></div><div class="metric"><span class="label">Dönüm noktası</span><strong>'+state.milestones.length+'</strong></div></div><button class="button primary" data-do="newLife">Yeni bir hikâyeye başla '+icon('arrow')+'</button><button class="text-link" data-do="export">Bu hayatı sakla</button></section>';
  }
  function render() {
    dockObserver?.disconnect();
    const focused=document.activeElement?.dataset,focusKeys=['do','id','tab','activityFilter','category','journalFilter','activityView','assetsTab','peopleFilter'];
    const focusMatch=focused&&focusKeys.some(k=>focused[k])?Object.fromEntries(focusKeys.filter(k=>focused[k]).map(k=>[k,focused[k]])):null;
    if (!state) {seenEventKey='';seenNoticeKey='';lastStatChanges={};$('#app').innerHTML=welcome();return;}
    const content={life,activities,people,future,assets,health}[tab];
    document.body.dataset.page=tab;
    $('#app').innerHTML=header()+statusDock()+'<div class="workspace"><aside class="left-column">'+navigation()+'<p class="side-caption">Bir hayat. Bin ihtimal.<br><span>Hiçbir seçim seni tek başına tanımlamaz.</span></p></aside><main id="mainContent" class="main-column" tabindex="-1">'+(state.pending?'<div class="pending-banner">'+icon('info')+'Bir karar seni bekliyor.<button class="button small" data-do="showEvent">Olaya dön</button></div>':'')+content()+'</main></div>'+energyPanel();
    updateDockSize();
    if($('.status-dock'))dockObserver?.observe($('.status-dock'));
    const eventKey=state.alive&&state.pending?state.age+':'+state.pending.id+':'+(state.pending.npcId||''):'';
    const noticeKey=state.notices?.[0]?.id||'';
    if(noticeKey&&noticeKey!==seenNoticeKey){seenNoticeKey=noticeKey;showNotice();}
    else if(!noticeKey&&eventKey&&eventKey!==seenEventKey){seenEventKey=eventKey;showEvent();}
    if(!noticeKey)seenNoticeKey='';
    if(!eventKey)seenEventKey='';
    if(!$('#dialog').open&&focusMatch){const replacement=[...document.querySelectorAll('button')].find(b=>Object.entries(focusMatch).every(([k,v])=>b.dataset[k]===v));replacement?.focus({preventScroll:true});}
  }
  function navigate(next,assetView) {
    scrollPositions[tab]=window.scrollY||0;tab=next;if(assetView)assetTab=assetView;render();
    window.scrollTo({top:assetView?0:scrollPositions[tab]||0,behavior:'instant'});
  }
  function dialog(title,body,options={}) {
    const el=$('#dialog'), active=document.activeElement, same=el.open&&el.dataset.title===title;
    const previousScroll=same?($('.dialog-body')?.scrollTop||0):0;
    if(!el.open)dialogReturnFocus=active;
    el.dataset.kind=options.kind||'general';el.dataset.title=title;el.dataset.activityId=options.activityId||'';
    $('#dialogContent').innerHTML='<header class="dialog-header"><div class="dialog-heading"><h2 id="dialogTitle" tabindex="-1">'+esc(title)+'</h2><button class="icon-button" data-do="closeDialog" aria-label="Kapat">'+icon('close')+'</button></div>'+(state?'<div class="dialog-stats">'+statusContext()+stats()+'</div>':'')+'</header><p id="dialogFeedback" class="dialog-feedback" role="status" aria-live="polite">'+esc(options.feedback||'')+'</p><div class="dialog-body">'+body+'</div>';
    document.body.classList.add('dialog-open');
    if(!el.open)el.showModal();
    const focusKey=active?.dataset?.social?'social':active?.dataset?.appearance?'appearance':null;
    const replacement=same&&focusKey?[...el.querySelectorAll('button')].find(b=>b.dataset[focusKey]===active.dataset[focusKey]&&b.dataset.id===active.dataset.id&&b.dataset.value===active.dataset.value&&!b.disabled):null;
    (replacement||$('#dialogTitle')).focus({preventScroll:true});
    $('.dialog-body').scrollTop=previousScroll;
  }
  function restoreDialogFocus() {
    if($('#dialog').open)return;
    document.body.classList.remove('dialog-open');
    const target=dialogReturnFocus?.isConnected?dialogReturnFocus:$('#mainContent');
    if(!skipDialogFocus)target?.focus({preventScroll:true});
    dialogReturnFocus=null;skipDialogFocus=false;
  }
  function closeDialog(restoreFocus=true) {
    skipDialogFocus=!restoreFocus;
    $('#dialog').close();
    document.body.classList.remove('dialog-open');
  }
  $('#dialog').addEventListener('close',restoreDialogFocus);
  $('#dialog').addEventListener('cancel',e=>{if($('#dialog').dataset.kind==='notice'){e.preventDefault();ackNotices();}});
  function showNotice() {
    const notes=state?.notices?.slice(0,3)||[];if(!notes.length)return;
    dialog(state.age+' yaş · Yeni bir sayfa',notes.map(n=>'<article class="story-note"><p class="eyebrow">HAYATINDA BİR ŞEY DEĞİŞTİ</p><h2>'+esc(n.title)+'</h2><p>'+esc(n.text)+'</p>'+(n.tip?'<div class="guide-tip">'+icon('compass')+'<span>'+esc(n.tip)+'</span></div>':'')+'</article>').join('')+'<button class="button primary notice-continue" data-do="ackNotice">'+(state.notices.length>3?'Diğer gelişmeler':state.pending?'Karar anına geç':'Anladım, hikâyeye devam')+' '+icon('arrow')+'</button>',{kind:'notice'});
  }
  function ackNotices() {if(!state?.notices?.length||$('#dialog').dataset.kind!=='notice')return;return dispatch('ackNotice',{ids:(state.notices||[]).slice(0,3).map(n=>n.id)});}
  function showEvent() {
    if(state?.notices?.length)return showNotice();
    if(!state?.alive||!state.pending)return;
    dialog(state.age+' yaş · Bir karar anı',pendingEvent()+'<p class="helper-text event-reminder">Pencereyi kapatıp durumunu inceleyebilirsin. Kararın, “Olayı aç” düğmesinde seni bekler; seçim yapmadan yeni bir yıla geçilmez.</p>',{kind:'event'});
  }
  function requestAge() {
    if(state.pending||state.notices.length)return showEvent();
    if(preferences.confirmAge&&state.alive&&state.year.energy>0){
      dialog('Yeni yıla geçelim mi?','<div class="activity-detail-hero"><span class="activity-symbol">⏳</span><p>Bu yıl kullanabileceğin <b>'+state.year.energy+' zaman</b> kaldı. Hepsini kullanmak zorunda değilsin; yaş ilerlediğinde yeni yılın zamanı başlayacak.</p></div><button class="button primary action-confirm" data-do="confirmAge">Yine de bir yıl ilerle '+icon('arrow')+'</button><button class="text-link" data-do="closeDialog">Bu yılda kal</button><p class="helper-text">Bu hatırlatmayı Ayarlar’dan kapatabilirsin.</p>',{kind:'age-confirm'});return;
    }
    advanceAge();
  }
  function advanceAge() {const response=dispatch('age');if(response.ok&&!$('#dialog').open)$('#mainContent')?.scrollIntoView({block:'start',behavior:'smooth'});}
  function settings() {
    const archive=readArchive(), pwa=globalThis.LifePWA?.status()||{};
    dialog('Hayat defterin','<button class="event-choice" data-do="install">'+icon('download')+'<span><b>Telefonuna uygulama olarak ekle</b><small>'+(pwa.offlineReady?'Çevrimdışı oynamaya hazır.':'İlk açılışta internet bağlantısı gerekir.')+'</small></span></button>'+(pwa.updateReady?'<button class="button primary" data-do="updateApp" style="margin-top:12px">Yeni sürümü yükle</button>':'')+'<div class="divider"></div><p>Bu hayat yalnızca bu tarayıcıda saklanır. Başka bir cihaza geçerken kayıt dosyanı yanına al.</p><div class="detail-list">'+
      (state?'<button class="event-choice" data-do="export">'+icon('download')+'<span><b>Hayatını dosyaya kaydet</b><small>Tüm kararlar, ilişkiler ve bekleyen olaylar dahil.</small></span></button>':'')+
      '<button class="event-choice" data-do="import">'+icon('book')+'<span><b>Kayıt dosyası yükle</b><small>Önceki hayatın yedeklenir.</small></span></button>'+
      (state?'<button class="event-choice" data-do="newLife">'+icon('sprout')+'<span><b>Yeni bir hayata başla</b><small>Bu hayat arşivine eklenir.</small></span></button>':'')+'</div><div class="divider"></div><h3>Hayat arşivi</h3>'+(archive.length?'<div class="detail-list">'+archive.slice(-5).reverse().map((s,i)=>'<button class="event-choice" data-do="restore" data-index="'+(archive.length-1-i)+'"><span><b>'+esc(s.name)+' · '+s.age+' yaş</b><small>'+s.log?.length+' hatıra · Devam etmek için aç</small></span>'+icon('arrow')+'</button>').join('')+'</div>':'<p class="helper-text">Yeni bir hayat başlattığında önceki hikâyen burada kalır.</p>')+
      '<div class="divider"></div><h3>Senin oyun ritmin</h3><button class="event-choice preference-toggle" data-do="toggleAgeConfirm" role="switch" aria-checked="'+preferences.confirmAge+'"><span class="grow"><b>Kalan zamanı hatırlat</b><small>Yaş atlarken kullanmadığın zaman için onay sor. Varsayılan olarak kapalı.</small></span><span class="toggle-state">'+(preferences.confirmAge?'Açık':'Kapalı')+'</span></button><p class="helper-text">Favorilerin bu tarayıcıda saklanır. Bildirim, günlük giriş zorunluluğu veya gerçek zamanlı bekleme yok.</p><div class="divider"></div><p class="helper-text">BİR ÖMÜR / Hayat Elinde · 3.3<br>Ekonomi, sağlık ve genetik oyun için tasarlanmış kurmaca kurallardır.</p>');
  }
  function readArchive() { try { const lives=JSON.parse(localStorage.getItem('birOmur.archive')||'[]');return Array.isArray(lives)?lives.filter(s=>s&&typeof s.name==='string'):[]; } catch { return []; } }
  function installInfo() {
    const pwa=globalThis.LifePWA?.status()||{};
    dialog('Bir Ömür, cebinde.','<p>Oyunu ana ekranına ekle; tarayıcı çerçevesi olmadan, bir uygulama gibi aç.</p><div class="card pad"><h3>iPhone / iPad</h3><p class="helper-text">Safari’de bu sayfayı aç. Paylaş düğmesine dokun → Ana Ekrana Ekle → Ekle. Menüde çıkmazsa menüyü aşağı kaydır.</p></div><div class="card pad" style="margin-top:12px"><h3>Android</h3><p class="helper-text">Chrome’da menüyü aç → Uygulamayı yükle veya Ana ekrana ekle.</p>'+(pwa.installable?'<button class="button primary" data-do="installPrompt" style="margin-top:12px">Uygulamayı yükle</button>':'')+'</div><p class="helper-text">'+(pwa.installed?'Uygulama olarak açılmış. ':pwa.offlineReady?'Çevrimdışı dosyalar hazır. ':'İlk açılışta dosyalar hazırlanır. ')+'Kayıtların bu cihazda saklanır. Cihaz değiştirirken Ayarlar → Hayatını dosyaya kaydet kullan.</p>'+(pwa.updateReady?'<button class="button primary" data-do="updateApp">Yeni sürümü yükle</button>':''));
  }
  function archiveCurrent() {
    if(!state)return;
    try {const lives=JSON.parse(localStorage.getItem('birOmur.archive')||'[]');lives.push(state);localStorage.setItem('birOmur.archive',JSON.stringify(lives.slice(-8)));}
    catch { throw new Error('Arşiv için yer yok. Önce hayatını dosyaya kaydet.');}
  }
  function newLifePrompt() {
    dialog('Başka bir hayat mümkün.','<p>'+esc(state.name)+' ile yaşadığın '+state.age+' yıl arşivine eklenecek. Dilediğinde bu hikâyeye dönebilirsin.</p><button class="button primary" data-do="confirmNew">Yeni hayatı oluştur '+icon('arrow')+'</button>');
  }
  function appearance() {
    const a=state.appearance;
    dialog('Kendin gibi görün.','<div class="avatar-editor">'+avatar(state)+'</div><label class="input-label">Saç modeli</label><div class="option-row">'+[['short','Kısa'],['wave','Dalgalı'],['long','Uzun'],['buzz','Üç numara'],['bald','Saçsız']].map(([k,v])=>'<button class="option-button '+(a.hair===k?'selected':'')+'" data-appearance="hair" data-value="'+k+'">'+v+'</button>').join('')+'</div><label class="input-label">Saç rengi</label><div class="option-row">'+['#302722','#62452e','#ba8a47','#aa593d','#817970'].map(v=>'<button class="swatch '+(a.color===v?'selected':'')+'" style="background:'+v+'" data-appearance="color" data-value="'+v+'" aria-label="'+v+' saç rengi"></button>').join('')+'</div><label class="input-label">Sakal</label><div class="option-row">'+[['none','Sakalsız'],['stubble','Kirli sakal'],['full','Tam sakal']].map(([k,v])=>'<button class="option-button '+(a.beard===k?'selected':'')+'" data-appearance="beard" data-value="'+k+'" '+(state.age<16&&k!=='none'?'disabled':'')+'>'+v+'</button>').join('')+'</div>'+(state.age<16?'<p class="helper-text">Sakal seçenekleri 16 yaşında açılır.</p>':''));
  }
  function person(id,feedback='') {
    const p=state.npcs.find(p=>p.id===id);if(!p)return;
    const memory=E.relationship(state,p);
    const interactions=[['talk','Sohbet et','Birbirini daha iyi tanı.'],['time','Birlikte vakit geçir','Ortak bir hatıra biriktir.'],['promise','Gelecek yıl için söz ver','Gelecek yaşında birlikte vakit geçirirsen güven kazanırsın.'],['gift','Hediye ver','Düşünceli bir jest; güven satın alınmaz.'],['ask','Ailenden destek iste','Ailenin kalan yıllık destek bütçesi ve güveniniz sonucu etkiler.'],['flirt','Bir buluşma teklif et','İlgi karşılıklıysa ilişkinin adını bir sonraki kararda sen koyarsın.'],['marry','Evlenme teklif et','Hayatlarınızı birleştirin.'],['child','Aileyi büyüt','Bir çocuğun sorumluluğunu birlikte üstlenin.'],['apologize','Gönlünü al','Kırgınlıkları konuşmak için bir adım at.'],['argue','Rahatsızlığını dile getir','Anlaşmazlık ilişkinizi zorlayabilir.'],['breakup','İlişkiyi bitir','Bu karar ikinizi de etkiler.']];
    const family=['mother','father','sibling','child','mentor'].includes(p.role)||p.mentorProtected||p.contextRole==='mentor';
    const suitable=interactions.filter(([k])=>k!=='ask'||['mother','father'].includes(p.role)).filter(([k])=>!family||!['flirt','marry','child','breakup'].includes(k)).filter(([k])=>!['flirt','marry','child','breakup'].includes(k)||(p.age>=18&&state.age>=18)).filter(([k])=>k!=='marry'||p.role==='partner').filter(([k])=>k!=='child'||p.role==='spouse').filter(([k])=>k!=='breakup'||['partner','spouse'].includes(p.role)).filter(([k])=>k!=='flirt'||!['partner','spouse'].includes(p.role));
    dialog(p.name,'<div class="dialog-preview"><span class="npc-avatar">'+avatar(p)+'</span><div><h3>'+esc(roleNames[p.role]||p.role)+'</h3><p>'+p.age+' yaş · '+esc(p.personality||'')+'<br>'+esc(p.job||'')+'</p><div class="row wrap" style="margin-top:8px"><span class="pill">Yakınlık '+num(p.bond)+'</span><span class="pill">Güven '+num(memory.trust)+'</span></div></div></div>'+(p.traits?'<p class="helper-text">Zekâ '+point(p.traits.intelligence)+' · Güzellik '+point(p.traits.beauty)+'</p>':'')+'<p class="helper-text">'+esc(memory.label)+' · '+esc(memory.explanation)+'</p>'+(memory.promiseText?'<div class="guide-tip">'+icon('clock')+'<span>'+esc(memory.promiseText)+'</span></div>':'')+
      (memory.memories.length?'<details class="memory-list"><summary>Aranızda kalan izler · '+memory.memories.length+'</summary>'+memory.memories.slice(0,6).map(m=>'<p><small>'+m.age+' yaş</small> '+esc(m.text||m.title||m.kind)+'</p>').join('')+'</details>':'')+
      (!p.alive?'<div class="divider"></div><p class="helper-text">Birlikte yaşadıklarınız hayat günlüğünde yaşamaya devam ediyor.</p>':'<p class="helper-text">Her etkileşim 1 zaman. Aynı etkileşim yılda sınırlı sayıda kullanılabilir.</p><div class="detail-list">'+suitable.map(([k,name,desc])=>{const why=E.socialReason(state,p,k),cost={gift:state.age<18?250:1500,flirt:1800,marry:48000,child:18000,breakup:p.role==='spouse'?12000:0}[k]||0;return '<button class="event-choice" data-social="'+k+'" data-id="'+esc(p.id)+'" '+(why?'disabled':'')+'><span class="grow"><b>'+name+'</b><small>'+esc(why||((cost?money(price(cost))+' · ':'')+desc))+'</small></span>'+icon(why?'lock':'chevron')+'</button>';}).join('')+'</div>'),{feedback});
  }
  function geneticsInfo() {
    const g=E.genetics?.(state);if(!g)return;
    const row=(label,z,b)=>'<div class="genetic-row"><span>'+esc(label)+'</span><b>'+point(z)+'</b><b>'+point(b)+'</b></div>';
    dialog('Senden önce başlayan hikâye','<div class="genetics-hero">'+avatar(state)+'<div><p class="eyebrow">'+esc(state.family.standard)+' BİR AİLE</p><h3>'+esc(state.name)+'</h3><p>'+esc(state.city)+' · '+state.age+' yaş</p></div></div><p class="helper-text">Zekâ ve güzellik başlangıcın aile özelliklerinden ve rastgele farklılıklardan etkilenir. Bunlar ulaşabileceğin en yüksek değerler değildir.</p><section class="genetic-table" aria-label="Aile özellikleri karşılaştırması"><div class="genetic-row genetic-head"><span>Kim?</span><b>Zekâ</b><b>Güzellik</b></div>'+g.parents.map(p=>row(p.name+' · '+(roleNames[p.role]||'Ebeveyn'),p.intelligence,p.beauty)).join('')+(g.birth?row('Sen · doğuştan',g.birth.knowledge,g.birth.charisma):'<div class="genetic-row"><span>Sen · doğuştan</span><span class="unknown-birth">Eski kayıtta bilinmiyor</span></div>')+row('Sen · şimdi',g.current.intelligence,g.current.beauty)+'</section><div class="guide-tip">'+icon('sprout')+'<span>'+esc(g.explanation)+'</span></div><div class="genetic-routes"><h3>Bundan sonrası senin</h3><p>Öğrenme ve araştırma zekânı; bakım ve sağlık alışkanlıkları güzelliğini geliştirebilir. İletişim ise ayrı bir uzmanlıktır.</p><p>Bu puanlar insan değerini, kişiliği veya bir ilişkinin başarısını ölçmez. Genetik, burada gerçek biyolojiyi temsil etmeyen bir oyun kuralıdır.</p></div>',{kind:'genetics'});
  }
  function exportSave() {
    const file=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download='bir-omur-'+state.name.replace(/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ-]/g,'_')+'-'+state.age+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Hayat defterin dosyaya kaydedildi.');
  }
  $('#importFile').addEventListener('change',async e=>{
    const file=e.target.files[0];if(!file)return;
    try{
      if(file.size>5_000_000)throw new Error('Dosya 5 MB sınırını aşıyor.');
      const raw=JSON.parse(await file.text());
      if(!raw||typeof raw!=='object'||Array.isArray(raw)||typeof raw.name!=='string'||!Number.isFinite(raw.age))throw new Error('Bu dosya geçerli bir hayat kaydı değil.');
      const imported=E.migrate(raw);archiveCurrent();state=imported;result='';lastStatChanges={};seenEventKey='';seenNoticeKey='';notice='Kayıt dosyan yüklendi.';tab='life';save();closeDialog();render();toast('Hayatın kaldığı yerden devam ediyor.');
    }catch(error){toast(error.message||'Kayıt dosyası okunamadı.');}finally{e.target.value='';}
  });
  document.addEventListener('submit',e=>{
    if(e.target.id!=='newLifeForm')return;e.preventDefault();
    const form=new FormData(e.target);state=E.newLife({name:String(form.get('name')||'Deniz').trim().slice(0,24)||'Deniz',gender:form.get('gender')});notice='';result='';tab='life';save();render();window.scrollTo({top:0,behavior:'instant'});
  });
  document.addEventListener('change',e=>{
    if(e.target.dataset.lifestyle){const response=dispatch('lifestyle',{key:e.target.dataset.lifestyle,value:e.target.value});if(!response.ok)render();}
  });
  document.addEventListener('input',e=>{
    if(e.target.id==='activitySearch'){activityQuery=String(e.target.value||'').slice(0,80);const results=$('#activityResults');if(results)results.innerHTML=activityResults();}
  });
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b||b.disabled)return;
    if(b.dataset.tab){navigate(b.dataset.tab,b.dataset.assetsTab);return;}
    if(b.dataset.category){category=b.dataset.category;render();return;}
    if(b.dataset.activityView){activityView=b.dataset.activityView;if(tab!=='activities'){scrollPositions.activities=0;navigate('activities');}else render();return;}
    if(b.dataset.activityFilter){activityFilter=b.dataset.activityFilter;render();return;}
    if(b.dataset.journalFilter){journalFilter=b.dataset.journalFilter;render();return;}
    if(b.dataset.futureView){futureView=b.dataset.futureView;if(tab!=='future'){scrollPositions.future=0;navigate('future');}else render();return;}
    if(b.dataset.peopleFilter){peopleFilter=b.dataset.peopleFilter;render();return;}
    if(b.dataset.assetsTab){assetTab=b.dataset.assetsTab;render();return;}
    if(b.dataset.appearance){if(dispatch('appearance',{key:b.dataset.appearance,value:b.dataset.value}).ok)appearance();return;}
    if(b.dataset.social){const response=dispatch('social',{id:b.dataset.id,interaction:b.dataset.social});if(response.ok&&!state.pending&&!state.notices.length)person(b.dataset.id,response.message);return;}
    const action=b.dataset.do,id=b.dataset.id;
    if(action==='closeDialog')return $('#dialog').dataset.kind==='notice'?ackNotices():closeDialog();
    if(action==='ackNotice')return ackNotices();
    if(action==='showEvent')return showEvent();
    if(action==='settings')return settings();
    if(action==='toggleAgeConfirm'){preferences.confirmAge=!preferences.confirmAge;savePreferences();settings();return;}
    if(action==='toggleFavorite'){if(!D.actions.some(a=>a.id===id))return;preferences.favorites=preferences.favorites.includes(id)?preferences.favorites.filter(x=>x!==id):[...preferences.favorites,id];savePreferences();render();return;}
    if(action==='inspectActivity')return inspectActivity(id);
    if(action==='toggleFuture'){showFuture=!showFuture;render();return;}
    if(action==='clearSearch'){activityQuery='';render();$('#activitySearch')?.focus({preventScroll:true});return;}
    if(action==='resetActivityFilters'){activityQuery='';category='all';activityFilter='age';render();return;}
    if(action==='install')return installInfo();
    if(action==='installPrompt'){globalThis.LifePWA?.install().then(ok=>{if(!ok)installInfo();});return;}
    if(action==='updateApp'){save();globalThis.LifePWA?.update();return;}
    if(action==='appearance')return appearance();
    if(action==='genetics')return geneticsInfo();
    if(action==='person')return person(id);
    if(action==='export')return exportSave();
    if(action==='import')return $('#importFile').click();
    if(action==='newLife')return newLifePrompt();
    if(action==='confirmNew'){try{archiveCurrent();localStorage.removeItem(KEY);state=null;notice='Önceki hayatın arşive eklendi.';closeDialog();render();}catch(error){toast(error.message);}return;}
    if(action==='restore'){try{const lives=JSON.parse(localStorage.getItem('birOmur.archive')||'[]'),restored=E.migrate(lives[Number(b.dataset.index)]);archiveCurrent();state=restored;result='';lastStatChanges={};seenEventKey='';seenNoticeKey='';notice='Arşivdeki hayatına döndün.';tab='life';save();closeDialog();render();}catch{toast('Arşiv okunamadı.');}return;}
    if(action==='moreJournal'){journalLimit+=20;render();return;}
    if(action==='confirmQuit')return dialog('İşinden ayrılmak','<p>Düzenli gelirin sona erecek. Yıllık giderlerin devam ederken birikimine ihtiyaç duyabilirsin.</p><button class="button danger" data-do="quit">İşten ayrıl</button>');
    if(action==='repay')return dialog('Borcunu azalt','<p>Borcun '+money(state.debt)+'. Kullanılabilir birikimin '+money(state.money)+'.</p><div class="row wrap">'+[1000,10000,Math.min(state.money,state.debt)].filter((x,i,a)=>x>0&&x<=state.money&&x<=state.debt&&a.indexOf(x)===i).map(x=>'<button class="button" data-do="payDebt" data-amount="'+x+'">'+money(x)+' öde</button>').join('')+'</div>');
    if(action==='payDebt'){if(dispatch('repay',{amount:Number(b.dataset.amount)}).ok)closeDialog();return;}
    if(action==='choice'){
      if(!state.pending||!$('#dialog').open||$('#dialog').dataset.kind!=='event'||b.dataset.eventKey!==encodeURIComponent(state.age+':'+state.pending.id+':'+(state.pending.npcId||'')))return;
      b.disabled=true;const response=dispatch('choice',{index:Number(b.dataset.index)});if(!response.ok)b.disabled=false;
      if(response.ok&&!$('#dialog').open){$('#mainContent')?.focus({preventScroll:true});$('#mainContent')?.scrollIntoView({block:'start',behavior:'smooth'});}return;
    }
    if(action==='age')return requestAge();
    if(action==='confirmAge'){if(!$('#dialog').open||$('#dialog').dataset.kind!=='age-confirm')return;closeDialog(false);advanceAge();return;}
    if(action==='activity'&&(!$('#dialog').open||$('#dialog').dataset.kind!=='activity'||$('#dialog').dataset.activityId!==id))return;
    if(['activity','buy','sell','use','enroll','apply','quit','retire'].includes(action)){b.disabled=true;const response=dispatch(action,{id});if(!response.ok)b.disabled=false;if(response.ok&&['quit','retire'].includes(action)&&!state.notices.length&&!state.pending)closeDialog();}
  });
  if(!E||!D||!A){$('#app').innerHTML='<main class="welcome"><h1>Hayat defteri yüklenemedi.</h1><p>Sayfayı yenileyip tekrar dene.</p></main>';return;}
  window.addEventListener('pwa-status', e=>{if(e.detail.updateReady)toast('Yeni sürüm hazır. Ayarlardan kaydını koruyarak güncelleyebilirsin.');});
  load();render();
})();
