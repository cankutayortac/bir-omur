/* Bir Ömür — presentation and local saves. Simulation rules live in engine.js. */
(() => {
  'use strict';
  const E = globalThis.LifeEngine, D = globalThis.LifeData, A = globalThis.LifeAvatar;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = n => new Intl.NumberFormat('tr-TR', {style:'currency',currency:'TRY',maximumFractionDigits:0}).format(Number.isFinite(n) ? n : 0);
  const num = n => Math.round(Number.isFinite(n) ? n : 0).toLocaleString('tr-TR');
  const statNames = {knowledge:'Bilgi',strength:'Kuvvet',charisma:'Karizma',happiness:'Mutluluk',health:'Sağlık',stress:'Stres',grade:'Okul başarısı',performance:'İş performansı',reputation:'İtibar'};
  const roleNames = {mother:'Anne',father:'Baba',friend:'Arkadaş',classmate:'Okul arkadaşı',colleague:'İş arkadaşı',mentor:'Mentor',partner:'Partner',spouse:'Eş',child:'Çocuk'};
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
    repeat:'M3 9a9 9 0 0 1 15-5l3 3M21 2v5h-5M21 15a9 9 0 0 1-15 5l-3-3m0 5v-5h5',info:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 11v6m0-11v1'
  };
  const icon = (id) => '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(paths[id]||paths.star)+'"/></svg>';
  let state = null, tab = 'life', category = 'all', assetTab = 'shop', peopleFilter = 'all', journalLimit = 12, result = '', toastTimer, storageOK = true;
  const KEY = 'birOmur.v3';
  let notice = '';
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
    toastTimer = setTimeout(() => el.classList.remove('visible'), 4300);
  }
  function dispatch(type, payload = {}) {
    try {
      const response = E.act(state, type, payload);
      if (!response.ok) { toast(response.message || 'Bu işlem şu an yapılamıyor.'); return response; }
      if (type === 'choice' || type === 'activity' || type === 'social') result = response.message || '';
      if (type === 'age') { tab = 'life'; result = ''; }
      save(); render();
      if (response.message) toast(response.message);
      return response;
    } catch (error) { console.error(error); toast('İşlem tamamlanamadı; kaydın korunuyor.'); return {ok:false}; }
  }
  function stageName() { return state.age<4?'Bebeklik':state.age<12?'Çocukluk':state.age<18?'Gençlik':state.age<40?'Yetişkinlik':state.age<65?'Orta yaş':'İleri yaş'; }
  function occupation() { try { return E.occupation(state); } catch { return state.job?.id || schoolNames[state.education?.level] || 'Kendi yolunda'; } }
  function avatar(person, options={}) { return A.render(person, options); }
  function moneyPill(n) { return '<span class="'+(n<0?'negative':'positive')+'">'+(n>0?'+':'')+money(n)+'</span>'; }
  function header() {
    return '<header class="topbar"><div class="brand"><span class="brand-mark">'+icon('sprout')+'</span><span class="brand-name">bir ömür.</span><span class="brand-sub">HER HAYAT BAŞKA BİR HİKÂYE</span></div><div class="row"><span class="save-indicator"><i></i>'+(state?(storageOK?'Hayatın kaydedildi':'Kayıt kullanılamıyor'):'Senin hikâyen, senin seçimlerin')+'</span><span class="version">YENİ BÖLÜM</span><button class="icon-button" data-do="install" aria-label="Telefona ekle">'+icon('download')+'</button><button class="icon-button" data-do="settings" aria-label="Ayarlar">'+icon('settings')+'</button></div></header>';
  }
  function welcome() {
    const person={name:'Deniz',age:24,gender:'neutral',appearance:{hair:'wave',beard:'none',color:'#443128',skin:'#dba77b'},stats:{happiness:80,health:90,stress:10,strength:30}};
    return header()+'<main class="welcome"><div class="welcome-copy"><span class="eyebrow">YAŞAM SİMÜLATÖRÜ · BİR ÖMÜR</span><h1>Küçük kararlar.<br><em>Koca bir hayat.</em></h1><p class="lead">Nereye doğacağını seçemezsin. Ama kim olacağına giden yolda her yıl yeni bir sayfa açabilirsin.</p><div class="welcome-points"><span>'+icon('people')+'Gerçek bağlar</span><span>'+icon('compass')+'Farklı yollar</span><span>'+icon('book')+'Kalıcı izler</span></div><form id="newLifeForm" class="welcome-form"><div class="form-grid"><div><label class="input-label" for="nameInput">Hikâyenin kahramanı</label><input id="nameInput" name="name" placeholder="Adın" maxlength="24" value="Deniz" required autocomplete="off"></div><div><label class="input-label" for="genderInput">Karakter</label><select id="genderInput" name="gender"><option value="random">Rastgele görünüm</option><option value="female">Kadın</option><option value="male">Erkek</option></select></div></div><button class="button primary" type="submit">İlk sayfayı aç '+icon('arrow')+'</button><small>Ailen, imkânların ve doğuştan gelen özelliklerin rastgele belirlenir. Her hayat doğumla başlar.</small></form>'+(notice?'<div class="onboard-summary">'+esc(notice)+'</div>':'')+'</div><div class="welcome-art" aria-hidden="true"><div class="art-orbit"></div><div class="art-disc"></div><span class="art-spark">✳</span><div class="art-avatar">'+avatar(person)+'</div><div class="floating-note note-a"><b>İlk arkadaşınla tanıştın.</b><small>6 yaş · Birlikte büyümek güzel.</small></div><div class="floating-note note-b"><b>Hayalin için bir adım daha.</b><small>18 yaş · Yeni başlangıçlar.</small></div><div class="floating-note note-c"><b>♡ Mutluluk +8</b><small>Bazen tek bir an yeter.</small></div></div></main>';
  }
  function energyPanel() {
    const energy=state.year.energy, max=state.year.maxEnergy, disabled=!state.alive||!!state.pending;
    return '<div class="energy-panel"><div class="row between"><h3>Bu yıl sana ait.</h3><span style="font-size:11px">'+energy+' / '+max+'</span></div><div class="energy-pips">'+Array.from({length:max},(_,i)=>'<i class="'+(i<energy?'filled':'')+'"></i>').join('')+'</div><p>'+(state.alive?(state.pending?'Önce hayatındaki olaya bir karşılık ver.':'Zamanını öğrenmeye, ilişkilerine veya kendine ayır.'):'Hikâyenin son sayfasına geldin.')+'</p><button class="age-button" data-do="age" '+(disabled?'disabled':'')+'><span>Bir yıl ilerle</span>'+icon('arrow')+'</button></div>';
  }
  function profile() {
    return '<section class="card profile-card"><div class="portrait-scene"><span class="pill stage-tag">'+esc(stageName())+'</span>'+avatar(state)+'<button class="edit-avatar" data-do="appearance" aria-label="Görünümünü düzenle">'+icon('edit')+'</button></div><div class="identity"><h2>'+esc(state.name)+'</h2><p class="location">'+esc(state.city||'Türkiye')+' · '+esc(state.family.standard||'Bir aile hikâyesi')+'</p><p class="age-line"><strong>'+state.age+' yaşında</strong> <span class="muted">/ '+esc(occupation())+'</span></p><div class="wallet-line"><span class="label">Birikimin</span><strong>'+money(state.money)+'</strong></div></div></section>';
  }
  function navigation(mobile=false) {
    return '<nav class="'+(mobile?'mobile-nav':'side-nav')+'" aria-label="Oyun bölümleri">'+tabs.map(t=>'<button class="'+(mobile?'':'nav-button ')+(tab===t.id?'active':'')+'" data-tab="'+t.id+'" '+(tab===t.id?'aria-current="page"':'')+'>'+icon(t.icon)+'<span>'+t.name+'</span>'+(!mobile&&t.id==='people'?'<span class="count">'+state.npcs.filter(p=>p.alive).length+'</span>':'')+'</button>').join('')+'</nav>';
  }
  function annualBudget() { try { return E.budget(state); } catch { return {income:0,expenses:0,tax:0,net:0,breakdown:[]}; } }
  function sidebar() {
    const b=annualBudget(), next=nextGoal();
    return '<aside class="right-column">'+energyPanel()+'<section class="card"><div class="row between"><h3>Yılın hesabı</h3>'+icon('wallet')+'</div><p class="helper-text">Gelecek yaşında uygulanacak bütçe</p><div class="budget-row"><span>Yıllık gelir</span><b>'+money(b.income)+'</b></div><div class="budget-row"><span>Gider + vergi</span><b>'+money(b.expenses)+'</b></div><div class="budget-row total"><span>Yıl sonu farkı</span>'+moneyPill(b.net)+'</div>'+(state.debt>0?'<div class="budget-row"><span>Mevcut borç</span><b class="negative">'+money(state.debt)+'</b></div>':'')+'<button class="text-link" data-tab="assets">Bütçenin detayları</button></section><section class="card"><div class="row between"><h3>Ufukta ne var?</h3>'+icon('compass')+'</div><div class="goal-row"><span class="goal-symbol">'+icon('star')+'</span><div><b>'+esc(next.title)+'</b><p>'+esc(next.text)+'</p></div></div><div class="goal-row"><span class="goal-symbol">'+icon('people')+'</span><div><b>Bağlarını canlı tut</b><p>'+esc(state.npcs.filter(n=>n.alive&&n.bond>=60).length)+' kişiyle güçlü bir bağın var.</p></div></div></section><div class="quote">“Hayat, başka planlar yaparken biriktirdiğin küçük anlardır.”<small>BİR ÖMÜR · HAYAT DEFTERİ</small></div></aside>';
  }
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
  function stats() {return '<section class="stats-grid" aria-label="Karakter özellikleri">'+Object.keys(state.stats).filter(k=>statNames[k]).map(k=>'<div class="stat" data-stat="'+k+'"><div class="stat-header"><span>'+statNames[k]+'</span><b>'+num(state.stats[k])+'</b></div><div class="meter"><i style="width:'+Math.max(0,Math.min(100,state.stats[k]))+'%"></i></div></div>').join('')+'</section>';}
  function effectsText(e={}) {
    const entries=Object.entries(e.stats||{}).concat(Object.entries(e).filter(([k,v])=>statNames[k]&&typeof v==='number'));
    const parts=entries.map(([k,v])=>(v>0?'+':'')+v+' '+statNames[k]);
    if(e.money)parts.push((e.money>0?'+':'')+money(e.money));
    if(e.bond)parts.push((e.bond>0?'+':'')+e.bond+' ilişki');
    return [...new Set(parts)].slice(0,4).join(' · ');
  }
  function pendingEvent() {
    if (!state.pending) return '';
    const ev=D.events.find(e=>e.id===state.pending.id) || state.pending;
    const npc=state.npcs.find(n=>n.id===state.pending.npcId);
    const fill = text => esc(String(text||'').replaceAll('{name}',state.name).replaceAll('{npc}',npc?.name||'Bir tanıdığın').replaceAll('{age}',state.age));
    return '<section class="event-card" aria-labelledby="eventTitle"><div class="event-top"><span class="event-icon">'+esc(ev.icon||'✦')+'</span><div><span class="eyebrow">HAYATINDAN BİR AN · KARAR SENİN</span><h2 id="eventTitle">'+fill(ev.title)+'</h2></div></div><div class="event-body"><p>'+fill(ev.description||ev.text)+'</p><div class="choice-list">'+(ev.choices||[]).map((c,i)=>{
      const reason=E.choiceReason(state,c);
      return '<button class="event-choice" data-do="choice" data-index="'+i+'" '+(reason?'disabled':'')+'><span class="choice-letter">'+String.fromCharCode(65+i)+'</span><span class="grow"><b>'+fill(c.label||c.text)+'</b><small>'+esc(reason||(c.cost?money(c.cost)+' · ':'')+(c.chance?'Sonuç özelliklerine ve şansa bağlı.':effectsText(c.effects)||'Bu karar hikâyende bir iz bırakacak.'))+'</small></span>'+icon(reason?'lock':'chevron')+'</button>';
    }).join('')+'</div><p class="event-note">'+icon('clock')+'Bazı kararların etkisi sonraki yıllarda ortaya çıkar.</p></div></section>';
  }
  function activityCard(a) {
    const why=E.actionReason(state,a), cost=E.costOf(state,a);
    return '<button class="activity-card" data-do="activity" data-id="'+a.id+'" '+(why?'disabled':'')+'><span class="activity-top"><span class="activity-icon">'+esc(a.icon||'✦')+'</span><span class="energy-cost">'+icon('energy')+(a.energy||1)+(cost?' · '+money(cost):'')+'</span></span><h3>'+esc(a.name)+'</h3><p>'+esc(a.description)+'</p><span class="activity-footer '+(why?'locked':'')+'">'+esc(why||effectsText(a.effects)||'Kendine ve hayatına zaman ayır.')+'</span></button>';
  }
  function journal() {
    const entries=state.log.slice().reverse().slice(0,journalLimit);
    return '<section class="card journal">'+entries.map(e=>'<article class="journal-entry"><div class="journal-year">'+e.age+'<span>YAŞINDA</span></div><div><h4>'+esc(e.title||'Hayatından bir an')+'</h4><p>'+esc(e.text)+'</p></div></article>').join('')+'</section>'+(state.log.length>journalLimit?'<div class="row" style="justify-content:center;margin-top:13px"><button class="text-link" data-do="moreJournal">Daha eski anıları oku</button></div>':'');
  }
  function life() {
    let title=state.age<6?'Her şey yeni.':state.age<18?'Kendi yolunu buluyorsun.':state.age<40?'Hayat, seçimlerinle büyüyor.':state.age<65?'Biriktirdiğin bir hayat var.':'Her hatıranın bir yeri var.';
    return heading('Hikâyen devam ediyor.','Bugün seçtiklerin, yarının hatıraları.')+(notice?'<div class="warning" style="margin-bottom:16px">'+esc(notice)+'</div>':'')+(!state.alive?deathSummary():'<section class="year-card"><div class="year-number">'+state.age+'<small>YAŞINDASIN</small></div><div><h2>'+title+'</h2><p>'+esc(nextGoal().text)+'</p></div><span class="spark" aria-hidden="true">✳</span></section>')+stats()+
      (result?'<div class="result-box" style="margin-top:18px"><p class="eyebrow">KARARININ ARDINDAN</p>'+esc(result)+'</div>':'')+
      (state.pending?section('Hayatın kapını çalıyor.','Dur, düşün, bir yol seç.')+pendingEvent():'')+
      (state.alive&&!state.pending?section('Kendine bir şey kat.','Bu yıl küçük bir adım at.', '<button class="text-link" data-tab="activities">Tüm aktiviteler →</button>')+'<div class="activity-grid">'+D.actions.filter(a=>state.age>=(a.minAge||0)&&state.age<=(a.maxAge??120)).sort((a,b)=>Number(!!E.actionReason(state,a))-Number(!!E.actionReason(state,b))).slice(0,4).map(activityCard).join('')+'</div>':'')+
      section('Sayfa sayfa, sen.','Büyük dönüm noktaları ve küçük hatıralar.','<span class="badge-count">'+state.log.length+' AN</span>')+journal();
  }
  function activities() {
    const relevant=D.actions.filter(a=>state.age<=(a.maxAge??120)&&(category==='all'||a.category===category));
    return heading('Zamanını neye ayıracaksın?','İmkânların değişir. Merakın, emeğin ve bağların seninle kalır.','AKTİVİTELER')+
      '<div class="tabs" role="group" aria-label="Aktivite kategorisi">'+Object.entries(categories).map(([k,v])=>'<button class="tab '+(category===k?'active':'')+'" data-category="'+k+'">'+v+'</button>').join('')+'</div>'+
      '<div class="activity-grid">'+relevant.map(activityCard).join('')+'</div>';
  }
  function people() {
    const list=state.npcs.filter(p=>peopleFilter==='all'||(peopleFilter==='family'?['mother','father','child','spouse'].includes(p.role):peopleFilter==='alive'?p.alive:!p.alive));
    return heading('Hayatını paylaştıkların.','Bazıları yanından geçer. Bazıları hikâyenin parçası olur.','İLİŞKİLER')+
      '<div class="tabs">'+[['all','Herkes'],['family','Aile'],['alive','Hayatındakiler'],['memories','Hatıralar']].map(([k,v])=>'<button class="tab '+(peopleFilter===k?'active':'')+'" data-people-filter="'+k+'">'+v+'</button>').join('')+'</div><div class="npc-grid">'+list.map(p=>'<button class="card npc-card '+(!p.alive?'deceased':'')+'" data-do="person" data-id="'+esc(p.id)+'"><div class="row"><span class="npc-avatar">'+avatar(p)+'</span><span class="grow"><h3>'+esc(p.name)+'</h3><p>'+esc(roleNames[p.role]||p.role)+' · '+p.age+' yaş<br>'+esc(p.alive?(p.job||p.personality||'Kendi hikâyesini yaşıyor'):'Anısına')+'</p></span></div><div class="meter"><i style="width:'+p.bond+'%"></i></div><div class="bond-label"><span>'+esc(p.personality||'İlişkiniz')+'</span><b>'+p.bond+' / 100</b></div></button>').join('')+'</div>'+
      (!list.length?'<div class="card empty">'+icon('people')+'<h3>Bu sayfa henüz boş.</h3><p>Aktivitelerde ve olaylarda yeni insanlarla tanışabilirsin.</p></div>':'');
  }
  function future() {
    const edu=state.education,course=D.courses.find(c=>c.id===edu.courseId),job=D.careers.find(c=>c.id===state.job?.id);
    let summary='<section class="card pad"><div class="row between"><div><span class="eyebrow">EĞİTİMİN</span><h2 style="margin-top:7px">'+esc(course?.name||schoolNames[edu.level]||'Öğrenme yolculuğun')+'</h2></div><span class="activity-icon">🎓</span></div><p class="helper-text">'+(edu.degree?'Diploma: '+esc(D.courses.find(c=>c.degree===edu.degree)?.name||edu.degree):state.age<6?'6 yaşında okul hayatın başlayacak.':'Dersler ve seçimler okul başarını şekillendirir.')+'</p><div class="row between" style="margin-top:17px"><span class="label">Başarı</span><b>'+num(edu.grade)+' / 100</b></div><div class="meter course-progress"><i style="width:'+Math.max(0,Math.min(100,edu.grade||0))+'%"></i></div>'+(course?'<p class="helper-text">Mezuniyete '+edu.yearsLeft+' yıl · '+money(course.annualCost)+'/yıl</p>':'')+'</section>';
    if(state.job) summary+=section('İş hayatın')+'<section class="card pad"><div class="row between"><div><span class="eyebrow">SEVİYE '+state.job.level+'</span><h2 style="margin-top:6px">'+esc(job?.name||state.job.id)+'</h2></div><span class="activity-icon">'+esc(job?.icon||'💼')+'</span></div><div class="budget-row" style="margin-top:12px"><span>Yıllık brüt maaş</span><b>'+money(state.job.salary)+'</b></div><div class="budget-row"><span>İş performansı</span><b>'+num(state.job.performance)+' / 100</b></div><p class="helper-text">Düzenli çalışma ve düşük stres terfi ihtimalini artırır.</p><div class="row wrap" style="margin-top:14px"><button class="button small" data-do="confirmQuit">İşten ayrıl</button>'+(state.age>=60?'<button class="button small" data-do="retire">Emekli ol</button>':'')+'</div></section>';
    return heading('Yarın için bir adım.','Öğren, deneyim kazan, kendi yolunu çiz.','EĞİTİM & KARİYER')+summary+
      section('Yeni bir şey öğren.','Bölüm ve mesleki eğitim seçenekleri.')+'<div class="detail-list">'+D.courses.map(c=>{const reason=E.courseReason(state,c);return '<article class="card list-card"><span class="list-icon">'+esc(c.icon||'🎓')+'</span><div class="grow"><h3>'+esc(c.name)+'</h3><p>'+esc(c.description||'')+'</p><p>'+c.duration+' yıl · '+money(c.annualCost)+'/yıl</p>'+(reason?'<div class="requirement">'+esc(reason)+'</div>':'')+'</div><button class="button small" data-do="enroll" data-id="'+c.id+'" '+(reason?'disabled':'')+'>Kayıt ol</button></article>';}).join('')+'</div>'+
      section('İş fırsatları.','Maaşlar yıllık brüt tutardır; giderler bütçe ekranında.')+'<div class="detail-list">'+D.careers.map(c=>{const reason=E.careerReason(state,c);return '<article class="card list-card"><span class="list-icon">'+esc(c.icon||'💼')+'</span><div class="grow"><h3>'+esc(c.name)+'</h3><p>'+esc(c.description||'')+'</p><p>'+money(c.salary)+'/yıl</p>'+(reason?'<div class="requirement">'+esc(reason)+'</div>':'')+'</div><button class="button small" data-do="apply" data-id="'+c.id+'" '+(reason?'disabled':'')+'>Başvur</button></article>';}).join('')+'</div>';
  }
  function assets() {
    const b=annualBudget();
    let body='';
    if(assetTab==='budget') body='<section class="card pad"><h3>Gelecek yılın tahmini</h3><p class="helper-text">Tüm tutarlar bir tam yıla aittir. Beklenmedik olaylar ayrıca etkiler.</p>'+((b.breakdown||[]).map(r=>'<div class="budget-row"><span>'+esc(r.label)+'</span><b>'+money(r.amount)+'</b></div>').join(''))+'<div class="budget-row total"><span>Yıl sonu farkı</span>'+moneyPill(b.net)+'</div><div class="budget-row"><span>Tahmini birikim</span><b>'+money(b.projectedCash)+'</b></div><div class="budget-row"><span>Tahmini borç</span><b>'+money(b.projectedDebt)+'</b></div></section>'+
      (state.lastBudget?'<section class="card pad" style="margin-top:15px"><h3>Geçen yılın hesabı</h3><div class="budget-row"><span>Gelir</span><b>'+money(state.lastBudget.income)+'</b></div><div class="budget-row"><span>Gider + vergi</span><b>'+money(state.lastBudget.expenses)+'</b></div><div class="budget-row total"><span>Gerçekleşen fark</span>'+moneyPill(state.lastBudget.net)+'</div></section>':'');
    if(assetTab==='shop') body='<div class="detail-list">'+D.items.map(i=>{const has=state.inventory.some(x=>x.id===i.id),reason=E.buyReason(state,i),locked=!!reason;return '<article class="card list-card"><span class="list-icon">'+esc(i.icon||'📦')+'</span><div class="grow"><h3>'+esc(i.name)+'</h3><p>'+esc(i.description||i.note||'')+'</p>'+(i.maintenance?'<p>Yıllık bakım: '+money(i.maintenance)+'</p>':'')+(reason?'<div class="requirement">'+esc(reason)+'</div>':'')+'</div><div class="list-actions"><span class="price">'+money(i.price)+'</span><button class="button small" data-do="buy" data-id="'+i.id+'" '+(locked?'disabled':'')+'>'+(!i.consumable&&has?'Sende var':'Satın al')+'</button></div></article>';}).join('')+'</div>';
    if(assetTab==='inventory') body=state.inventory.length?'<div class="detail-list">'+state.inventory.map(x=>{const i=D.items.find(i=>i.id===x.id);if(!i)return '';const value=E.itemValue?E.itemValue(state,x):Math.round(i.price*.5);return '<article class="card list-card"><span class="list-icon">'+esc(i.icon||'📦')+'</span><div class="grow"><h3>'+esc(i.name)+'</h3><p>'+esc(i.description||'')+'</p><p>Kondisyon %'+num(x.condition??100)+'</p></div><div class="list-actions">'+(i.consumable?'<button class="button small" data-do="use" data-id="'+i.id+'">Kullan</button>':'')+'<button class="button small" data-do="sell" data-id="'+i.id+'" '+(value<=0?'disabled':'')+'>'+money(value)+' · Sat</button></div></article>';}).join('')+'</div>':'<div class="card empty">'+icon('wallet')+'<h3>Şimdilik hafif bir çanta.</h3><p>Bazı eşyalar yeni aktivitelerin anahtarıdır. İlk kitabınla başlayabilirsin.</p></div>';
    return heading('İmkânların ve seçimlerin.','İhtiyaçlarını karşıla. Bir hayal için yer aç.','BÜTÇE & VARLIKLAR')+'<div class="metrics"><div class="metric"><span class="label">Birikim</span><strong>'+money(state.money)+'</strong></div><div class="metric"><span class="label">Borç</span><strong class="'+(state.debt?'negative':'')+'">'+money(state.debt)+'</strong></div><div class="metric"><span class="label">Yıllık fark</span><strong class="'+(b.net<0?'negative':'positive')+'">'+money(b.net)+'</strong></div></div>'+
      (state.debt>0?'<div class="warning row between" style="margin-top:14px"><span>Borç, yıllık faiz ve stres oluşturur.</span><button class="button small" data-do="repay" '+(state.money<=0?'disabled':'')+'>Borç öde</button></div>':'')+
      '<div class="tabs" style="margin-top:23px">'+[['shop','Mağaza'],['inventory','Eşyalarım'],['budget','Yıllık bütçe']].map(([k,v])=>'<button class="tab '+(assetTab===k?'active':'')+'" data-assets-tab="'+k+'">'+v+'</button>').join('')+'</div>'+body;
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
    if (!state) {$('#app').innerHTML=welcome();return;}
    const content={life,activities,people,future,assets,health}[tab];
    $('#app').innerHTML=header()+'<div class="workspace"><aside class="left-column">'+profile()+navigation()+'<div class="left-energy">'+energyPanel()+'</div><p class="side-caption">Geleceğin henüz yazılmadı.<br>Bir sonraki satır sana ait.</p></aside><main id="mainContent" class="main-column">'+(state.pending&&tab!=='life'?'<div class="pending-banner">'+icon('info')+'Bir karar seni bekliyor.<button class="button small" data-tab="life">Olaya dön</button></div>':'')+content()+'</main>'+sidebar()+'</div>'+navigation(true)+'<div class="mobile-advance"><span class="energy-mini">'+icon('energy')+'<b>'+state.year.energy+'/'+state.year.maxEnergy+'</b> zaman</span><button class="age-button" data-do="age" '+(!state.alive||state.pending?'disabled':'')+'><span>'+(state.pending?'Kararını ver':'Bir yıl ilerle')+'</span>'+icon('arrow')+'</button></div>';
  }
  function dialog(title,body) {
    $('#dialogContent').innerHTML='<header class="dialog-header"><h2 id="dialogTitle">'+esc(title)+'</h2><button class="icon-button" data-do="closeDialog" aria-label="Kapat">'+icon('close')+'</button></header><div class="dialog-body">'+body+'</div>';
    if(!$('#dialog').open)$('#dialog').showModal();
  }
  function closeDialog() { $('#dialog').close(); }
  function settings() {
    const archive=readArchive(), pwa=globalThis.LifePWA?.status()||{};
    dialog('Hayat defterin','<button class="event-choice" data-do="install">'+icon('download')+'<span><b>Telefonuna uygulama olarak ekle</b><small>'+(pwa.offlineReady?'Çevrimdışı oynamaya hazır.':'İlk açılışta internet bağlantısı gerekir.')+'</small></span></button>'+(pwa.updateReady?'<button class="button primary" data-do="updateApp" style="margin-top:12px">Yeni sürümü yükle</button>':'')+'<div class="divider"></div><p>Bu hayat yalnızca bu tarayıcıda saklanır. Başka bir cihaza geçerken kayıt dosyanı yanına al.</p><div class="detail-list">'+
      (state?'<button class="event-choice" data-do="export">'+icon('download')+'<span><b>Hayatını dosyaya kaydet</b><small>Tüm kararlar, ilişkiler ve bekleyen olaylar dahil.</small></span></button>':'')+
      '<button class="event-choice" data-do="import">'+icon('book')+'<span><b>Kayıt dosyası yükle</b><small>Önceki hayatın yedeklenir.</small></span></button>'+
      (state?'<button class="event-choice" data-do="newLife">'+icon('sprout')+'<span><b>Yeni bir hayata başla</b><small>Bu hayat arşivine eklenir.</small></span></button>':'')+'</div><div class="divider"></div><h3>Hayat arşivi</h3>'+(archive.length?'<div class="detail-list">'+archive.slice(-5).reverse().map((s,i)=>'<button class="event-choice" data-do="restore" data-index="'+(archive.length-1-i)+'"><span><b>'+esc(s.name)+' · '+s.age+' yaş</b><small>'+s.log?.length+' hatıra · Devam etmek için aç</small></span>'+icon('arrow')+'</button>').join('')+'</div>':'<p class="helper-text">Yeni bir hayat başlattığında önceki hikâyen burada kalır.</p>')+
      '<div class="divider"></div><p class="helper-text">BİR ÖMÜR / Yeni Bölüm<br>Ekonomi ve sağlık mekanikleri oyun için tasarlanmış kurmaca kurallardır.</p>');
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
  function person(id) {
    const p=state.npcs.find(p=>p.id===id);if(!p)return;
    const interactions=[['ask','Ailenden destek iste','Ailenin imkânı ve aranızdaki bağ sonucu etkiler.'],['apologize','Gönlünü al','Kırgınlıkları konuşmak için bir adım at.'],['argue','Rahatsızlığını dile getir','Anlaşmazlık ilişkinizi zorlayabilir.'],['talk','Sohbet et','Birbirini daha iyi tanı.'],['time','Birlikte vakit geçir','Ortak bir hatıra biriktir.'],['gift','Hediye ver','Düşünceli bir jest.'],['flirt','Bir buluşma teklif et','Karşılıklı ilgi ve bağ önemlidir.'],['marry','Evlenme teklif et','Hayatlarınızı birleştirin.'],['child','Aileyi büyüt','Bir çocuğun sorumluluğunu birlikte üstlenin.'],['breakup','İlişkiyi bitir','Bu karar ikinizi de etkiler.']];
    const family=['mother','father','child'].includes(p.role);
    const suitable=interactions.filter(([k])=>k!=='ask'||['mother','father'].includes(p.role)).filter(([k])=>!family||!['flirt','marry','child','breakup'].includes(k)).filter(([k])=>!['flirt','marry','child','breakup'].includes(k)||(p.age>=18&&state.age>=18)).filter(([k])=>k!=='marry'||p.role==='partner').filter(([k])=>k!=='child'||p.role==='spouse').filter(([k])=>k!=='breakup'||['partner','spouse'].includes(p.role)).filter(([k])=>k!=='flirt'||!['partner','spouse'].includes(p.role));
    dialog(p.name,'<div class="dialog-preview"><span class="npc-avatar">'+avatar(p)+'</span><div><h3>'+esc(roleNames[p.role]||p.role)+'</h3><p>'+p.age+' yaş · '+esc(p.personality||'')+'<br>'+esc(p.job||'')+'</p><span class="pill" style="margin-top:8px">Bağınız '+p.bond+' / 100</span></div></div>'+
      (!p.alive?'<div class="divider"></div><p class="helper-text">Birlikte yaşadıklarınız hayat günlüğünde yaşamaya devam ediyor.</p>':'<p class="helper-text">İlişkilere de zaman gerekir. Aynı etkileşim yılda sınırlı sayıda kullanılabilir.</p><div class="detail-list">'+suitable.map(([k,name,desc])=>{const why=E.socialReason(state,p,k);return '<button class="event-choice" data-social="'+k+'" data-id="'+esc(p.id)+'" '+(why?'disabled':'')+'><span class="grow"><b>'+name+'</b><small>'+esc(why||desc)+'</small></span>'+icon(why?'lock':'chevron')+'</button>';}).join('')+'</div>'));
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
      const imported=E.migrate(raw);archiveCurrent();state=imported;result='';notice='Kayıt dosyan yüklendi.';tab='life';save();closeDialog();render();toast('Hayatın kaldığı yerden devam ediyor.');
    }catch(error){toast(error.message||'Kayıt dosyası okunamadı.');}finally{e.target.value='';}
  });
  document.addEventListener('submit',e=>{
    if(e.target.id!=='newLifeForm')return;e.preventDefault();
    const form=new FormData(e.target);state=E.newLife({name:String(form.get('name')||'Deniz').trim().slice(0,24)||'Deniz',gender:form.get('gender')});notice='';result='';tab='life';save();render();window.scrollTo({top:0,behavior:'instant'});
  });
  document.addEventListener('change',e=>{
    if(e.target.dataset.lifestyle){const response=dispatch('lifestyle',{key:e.target.dataset.lifestyle,value:e.target.value});if(!response.ok)render();}
  });
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b||b.disabled)return;
    if(b.dataset.tab){tab=b.dataset.tab;render();window.scrollTo({top:0,behavior:'instant'});return;}
    if(b.dataset.category){category=b.dataset.category;render();return;}
    if(b.dataset.peopleFilter){peopleFilter=b.dataset.peopleFilter;render();return;}
    if(b.dataset.assetsTab){assetTab=b.dataset.assetsTab;render();return;}
    if(b.dataset.appearance){if(dispatch('appearance',{key:b.dataset.appearance,value:b.dataset.value}).ok)appearance();return;}
    if(b.dataset.social){const response=dispatch('social',{id:b.dataset.id,interaction:b.dataset.social});if(response.ok)person(b.dataset.id);return;}
    const action=b.dataset.do,id=b.dataset.id;
    if(action==='closeDialog')return closeDialog();
    if(action==='settings')return settings();
    if(action==='install')return installInfo();
    if(action==='installPrompt'){globalThis.LifePWA?.install().then(ok=>{if(!ok)installInfo();});return;}
    if(action==='updateApp'){save();globalThis.LifePWA?.update();return;}
    if(action==='appearance')return appearance();
    if(action==='person')return person(id);
    if(action==='export')return exportSave();
    if(action==='import')return $('#importFile').click();
    if(action==='newLife')return newLifePrompt();
    if(action==='confirmNew'){try{archiveCurrent();localStorage.removeItem(KEY);state=null;notice='Önceki hayatın arşive eklendi.';closeDialog();render();}catch(error){toast(error.message);}return;}
    if(action==='restore'){try{const lives=JSON.parse(localStorage.getItem('birOmur.archive')||'[]'),restored=E.migrate(lives[Number(b.dataset.index)]);archiveCurrent();state=restored;result='';notice='Arşivdeki hayatına döndün.';tab='life';save();closeDialog();render();}catch{toast('Arşiv okunamadı.');}return;}
    if(action==='moreJournal'){journalLimit+=20;render();return;}
    if(action==='confirmQuit')return dialog('İşinden ayrılmak','<p>Düzenli gelirin sona erecek. Yıllık giderlerin devam ederken birikimine ihtiyaç duyabilirsin.</p><button class="button danger" data-do="quit">İşten ayrıl</button>');
    if(action==='repay')return dialog('Borcunu azalt','<p>Borcun '+money(state.debt)+'. Kullanılabilir birikimin '+money(state.money)+'.</p><div class="row wrap">'+[1000,10000,Math.min(state.money,state.debt)].filter((x,i,a)=>x>0&&x<=state.money&&x<=state.debt&&a.indexOf(x)===i).map(x=>'<button class="button" data-do="payDebt" data-amount="'+x+'">'+money(x)+' öde</button>').join('')+'</div>');
    if(action==='payDebt'){if(dispatch('repay',{amount:Number(b.dataset.amount)}).ok)closeDialog();return;}
    if(action==='choice'){const response=dispatch('choice',{index:Number(b.dataset.index)});if(response.ok)$('#mainContent')?.scrollIntoView({block:'start',behavior:'smooth'});return;}
    if(action==='age'){const response=dispatch('age');if(response.ok)$('#mainContent')?.scrollIntoView({block:'start',behavior:'smooth'});return;}
    if(['activity','buy','sell','use','enroll','apply','quit','retire'].includes(action)){const response=dispatch(action,{id});if(response.ok&&['quit','retire'].includes(action))closeDialog();}
  });
  if(!E||!D||!A){$('#app').innerHTML='<main class="welcome"><h1>Hayat defteri yüklenemedi.</h1><p>Sayfayı yenileyip tekrar dene.</p></main>';return;}
  window.addEventListener('pwa-status', e=>{if(e.detail.updateReady)toast('Yeni sürüm hazır. Ayarlardan kaydını koruyarak güncelleyebilirsin.');});
  load();render();
})();
