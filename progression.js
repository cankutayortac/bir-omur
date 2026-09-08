(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./content.js') : root.LifeData);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LifeProgression = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Data) {
  'use strict';

  const CORE = ['knowledge', 'strength', 'charisma'];
  const THRESHOLDS = [0, 40, 140, 330, 680, 1200];
  const TIERS = ['Keşif', 'Temel', 'Yetkin', 'Uzman', 'Usta', 'Öncü'];
  const tracks = [
    { id: 'academic', name: 'Araştırma', icon: '🔬', stat: 'knowledge', description: 'Meraktan araştırmaya: oku, öğren ve somut projeler üret.' },
    { id: 'athletics', name: 'Spor', icon: '🏅', stat: 'strength', description: 'Kondisyonunu düzenli antrenman ve dayanıklılık hedefleriyle geliştir.' },
    { id: 'creative', name: 'Yaratıcılık', icon: '🎨', stat: 'charisma', description: 'Bir eser oluştur, portföy biriktir ve çalışmalarını paylaş.' },
    { id: 'social', name: 'İletişim', icon: '🤝', stat: 'charisma', description: 'İnsanlarla bağ kur; bir ekibi dinlemeyi ve yönetmeyi öğren.' }
  ];
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, finite(value, min)));
  const round = value => Math.round((value + Number.EPSILON) * 10) / 10;
  const tierFromXP = xp => THRESHOLDS.reduce((tier, at, index) => xp >= at ? index : tier, 0);

  function create() {
    return { version: 1, tracks: Object.fromEntries(tracks.map(track => [track.id, { xp: 0 }])), milestones: [], practice: {} };
  }

  function migrate(s, old) {
    const progression = create();
    if (old && typeof old === 'object') {
      for (const track of tracks) progression.tracks[track.id].xp = round(clamp(old.tracks?.[track.id]?.xp, 0, THRESHOLDS.at(-1)));
      progression.milestones = Array.isArray(old.milestones) ? [...new Set(old.milestones.filter(id => typeof id === 'string' && /^skill-(academic|athletics|creative|social)-[1-5]$/.test(id)))].slice(0, 20) : [];
      for (const action of Data.actions) {
        const record = old.practice?.[action.id];
        if (record && typeof record === 'object') progression.practice[action.id] = { count: Math.floor(clamp(record.count, 0, 10000)), lastAge: Math.floor(clamp(record.lastAge, 0, 120)) };
      }
    } else {
      // A returning character keeps documented experience, never loses old stats.
      const setTier = (id, tier) => { progression.tracks[id].xp = Math.max(progression.tracks[id].xp, THRESHOLDS[tier]); };
      const degrees = [...(s.education?.degrees || []), s.education?.degree].filter(Boolean);
      for (const degree of degrees) setTier(degree === 'fitness' ? 'athletics' : degree === 'design' || degree === 'culinary' ? 'creative' : 'academic', 2);
      const career = Data.careers.find(job => job.id === s.job?.id);
      for (const [id, tier] of Object.entries(career?.requires?.skills || {})) if (progression.tracks[id]) setTier(id, Math.min(5, tier));
      if (s.flags?.portfolio) setTier('academic', 1);
      if (s.flags?.musician) setTier('creative', 1);
      if (s.flags?.volunteer) setTier('social', 1);
    }
    // Migration must not replay all previous tier announcements on the next click.
    for (const track of tracks) {
      for (let tier = 1; tier <= tierFromXP(progression.tracks[track.id].xp); tier++) {
        const id = `skill-${track.id}-${tier}`;
        if (!progression.milestones.includes(id)) progression.milestones.push(id);
      }
    }
    return progression;
  }

  function efficiency(s) {
    const health = clamp(s.stats?.health ?? 80, 0, 100);
    const stress = clamp(s.stats?.stress ?? 0, 0, 100);
    return (.5 + health / 200) * (1 - stress * .004);
  }
  function repeatFactor(repeat) { return Math.max(.2, Math.pow(.55, Math.max(0, finite(repeat)))); }
  function agePace(age) { return age < 6 ? .45 : age < 12 ? .7 : age < 18 ? .9 : 1; }
  function ageCeiling(age) { return age < 6 ? 28 : age < 12 ? 43 : age < 18 ? 58 : 100; }
  function statFactor(value) { return value < 40 ? .50 : value < 60 ? .30 : value < 80 ? .12 : value < 95 ? .04 : .015; }

  function adjust(s, key, delta, context = {}) {
    const amount = finite(delta);
    if (!CORE.includes(key) || amount <= 0) return amount;
    const original = clamp(s.stats?.[key], 0, 100);
    if (original >= 100) return 0;
    const age = finite(s.age);
    const ceiling = ageCeiling(age);
    const repeated = context.source === 'activity' ? repeatFactor(context.repeat ?? s.year?.used?.[context.actionId] ?? 0) : 1;
    let work = amount * agePace(age) * efficiency(s) * repeated;
    let value = original;
    // Integrate through thresholds so a large event/item cannot skip the curve.
    const edges = [...new Set([40, 60, 80, 95, 100, ceiling])].sort((a, b) => a - b);
    while (work > .0000001 && value < 100) {
      const edge = edges.find(point => point > value + .00000001) || 100;
      const factor = statFactor(value + .00000001) * (value >= ceiling ? .35 : 1);
      const consumed = Math.min(work, (edge - value) / factor);
      value = Math.min(100, value + consumed * factor);
      work -= consumed;
    }
    return round(Math.max(0, Math.min(100 - original, round(value) - round(original))));
  }

  function xpPreview(s, action, context = {}) {
    const repeat = context.repeat ?? s.year?.used?.[action.id] ?? 0;
    const factor = efficiency(s) * agePace(finite(s.age)) * repeatFactor(repeat);
    return Object.fromEntries(Object.entries(action.skillXP || {}).filter(([id]) => tracks.some(track => track.id === id)).map(([id, xp]) => [id, round(Math.min(Math.max(0, THRESHOLDS.at(-1) - finite(s.progression?.tracks?.[id]?.xp)), Math.max(0, finite(xp)) * factor))]));
  }

  function preview(s, action) {
    const repeat = Math.max(0, finite(s.year?.used?.[action.id]));
    const effects = Object.fromEntries(Object.entries(action.effects || {}).map(([key, value]) => [key, typeof value === 'number' ? adjust(s, key, value, { source: 'activity', actionId: action.id, repeat }) : value]));
    return { effects, xp: xpPreview(s, action, { repeat }), repeat, efficiency: Math.round(efficiency(s) * 100) };
  }

  function gainXP(s, awards) {
    if (!s.progression) s.progression = create(s);
    const notices = [];
    for (const track of tracks) {
      const record = s.progression.tracks[track.id];
      record.xp = round(clamp(finite(record.xp) + Math.max(0, finite(awards[track.id])), 0, THRESHOLDS.at(-1)));
      const tier = tierFromXP(record.xp);
      for (let level = 1; level <= tier; level++) {
        const id = `skill-${track.id}-${level}`;
        if (s.progression.milestones.includes(id)) continue;
        s.progression.milestones.push(id);
        const unlocks = Data.actions.filter(action => action.requires?.skills?.[track.id] === level).map(action => action.name);
        notices.push({ id, title: `${track.name}: ${TIERS[level]}`, text: unlocks.length ? `${track.name} deneyimin ${THRESHOLDS[level]} XP'ye ulaştı. Yeni hedefler: ${unlocks.join(', ')}. Yaş ve ekipman koşulları da geçerlidir.` : `${track.name} deneyimin ${THRESHOLDS[level]} XP'ye ulaştı. Düzenli çaban kalıcı bir uzmanlığa dönüştü.` });
      }
    }
    return notices;
  }

  function activity(s, action, context = {}) {
    // Capture this via preview before applying health/stress effects for exact UI parity.
    const awards = context.preview?.xp || context.xp || xpPreview(s, action, context);
    const notices = gainXP(s, awards);
    const previous = s.progression.practice[action.id];
    s.progression.practice[action.id] = { count: Math.min(10000, finite(previous?.count) + 1), lastAge: finite(s.age) };
    return notices;
  }

  function annual(s) {
    if (!s.alive) return [];
    const awards = {};
    if (s.age >= 6 && s.age < 18) awards.academic = round(4 * efficiency(s));
    if (s.education?.courseId) {
      const track = s.education.courseId === 'fitness' ? 'athletics' : ['design', 'culinary'].includes(s.education.courseId) ? 'creative' : 'academic';
      awards[track] = round(12 * efficiency(s));
    }
    if (s.job) {
      const job = Data.careers.find(career => career.id === s.job.id);
      const trained = Object.keys(job?.requires?.skills || {});
      for (const track of trained) awards[track] = (awards[track] || 0) + round(6 * efficiency(s));
    }
    return gainXP(s, awards);
  }

  function tierFor(s, id) { return tierFromXP(clamp(s.progression?.tracks?.[id]?.xp, 0, THRESHOLDS.at(-1))); }
  function overview(s) {
    return tracks.map(track => {
      const xp = round(clamp(s.progression?.tracks?.[track.id]?.xp, 0, THRESHOLDS.at(-1)));
      const tier = tierFromXP(xp);
      const nextXP = THRESHOLDS[tier + 1] ?? null;
      const unlocks = Data.actions.filter(action => action.requires?.skills?.[track.id] > tier).sort((a, b) => a.requires.skills[track.id] - b.requires.skills[track.id]).map(action => ({ id: action.id, name: action.name, tier: action.requires.skills[track.id], minAge: action.minAge, requires: action.requires }));
      return { ...track, xp, tier, tierName: TIERS[tier], nextXP, progress: nextXP === null ? 100 : Math.round((xp - THRESHOLDS[tier]) / (nextXP - THRESHOLDS[tier]) * 100), goal: nextXP === null ? 'Öncü düzeyine ulaştın. Uzmanlığını projelerle ve insanlarla paylaş.' : `${TIERS[tier + 1]} düzeyine ${round(nextXP - xp)} XP kaldı.`, unlocks };
    });
  }

  return { create, migrate, adjust, preview, activity, annual, overview, tierFor, tracks, thresholds: THRESHOLDS.slice(), tierNames: TIERS.slice(), efficiency };
});
