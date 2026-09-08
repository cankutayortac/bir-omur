'use strict';
// Reproducible birth-to-goal playthroughs. The only state-changing operation in
// this runner is LifeEngine.act: no injected age, cash, equipment, XP or time.
const assert = require('node:assert/strict');
const E = require('../engine.js');
const D = require('../content.js');

const ROUTES = {
  academic: { seed: 11, items: ['book', 'laptop'], career: 'project_assistant', careerAction: 'research_commission', routine: ['library', 'study', 'read', 'language'] },
  athletics: { seed: 29, items: ['shoes'], career: 'club_athlete', careerAction: 'club_preparation', routine: ['run', 'walk', 'swim'] },
  music: { seed: 73, items: ['guitar'], career: 'session_musician', careerAction: 'studio_session', routine: ['music', 'family_story', 'socialize'] }
};

function simulate(route, seed = ROUTES[route]?.seed, throughAge = 32, options = {}) {
  const strategy = ROUTES[route];
  assert.ok(strategy, `Unknown route: ${route}`);
  const s = E.newLife({ name: 'Doğal yol deneyi', gender: 'female', seed });
  const trace = [], years = [], initial = JSON.parse(JSON.stringify(s));
  function apply(type, payload) {
    const before = { age: s.age, cash: s.money, time: s.year.energy, pending: s.pending?.id || null };
    const result = E.act(s, type, payload);
    assert.equal(result.ok, true, `${route}/${seed}/${s.age}: ${type} ${JSON.stringify(payload)}: ${result.message}`);
    trace.push({ ...before, type, ...payload, cashAfter: s.money, timeAfter: s.year.energy });
    return result;
  }
  function resolve() {
    for (let count = 0; s.pending && count < 40; count++) {
      const event = E.eventById(s.pending.id);
      assert.ok(event, `Unregistered event: ${s.pending.id}`);
      const available = event.choices.map((choice, index) => ({ choice, index }))
        .filter(({ choice }) => !E.choiceReason(s, choice));
      assert.ok(available.length, `No affordable outcome: ${event.id}`);
      // Following a path uses the first affordable offered branch. For unrelated
      // stories, preserve money/time for the chosen goal where a free reply exists.
      let selection;
      if (event.id.startsWith(`path_${route}_`) && options.sharedResources) {
        selection = available.find(({ choice }) => {
          const cmd = choice.effects?.pathCommand;
          return cmd?.result === 'alternative' || cmd?.type === 'alternative'
            || (cmd?.type === 'branch' && ['teaching', 'coaching', 'writing'].includes(cmd.branch))
            || cmd?.tempo === 'balanced' || (cmd?.type === 'finish' && cmd.outcome === 'professional');
        }) || available.find(({ choice }) => choice.effects?.pathCommand?.type === 'finish');
      }
      selection ||= event.id.startsWith(`path_${route}_`) ? available[0]
        : available.find(({ choice }) => !choice.cost && !choice.energy && !choice.requires) || available[0];
      apply('choice', { index: selection.index });
    }
    assert.equal(s.pending, null, 'A decision chain must terminate');
    if (s.notices.length) apply('ackNotice', { ids: s.notices.map(n => n.id) });
  }
  const can = id => !E.actionReason(s, id);
  for (; s.alive && s.age <= throughAge;) {
    resolve();
    // A regular entry job covers recurring adult bills; its application and
    // employment opportunity costs are charged by the real engine.
    if (s.age >= 18 && !s.job && !s.education.courseId && !E.careerReason(s, 'cashier')) apply('apply', { id: 'cashier' });
    for (const id of options.sharedResources ? [] : strategy.items) {
      const item = D.items.find(record => record.id === id);
      if (item && !E.buyReason(s, id) && (s.age < 18 || s.money >= E.price(s, item.price + 12000))) apply('buy', { id });
    }
    if (s.age >= 18 && !E.careerReason(s, strategy.career)) apply('apply', { id: strategy.career });
    for (let step = 0; s.alive && s.year.energy > 0 && step < 15; step++) {
      resolve();
      const urgent = s.stats.health < 60 ? ['doctor', 'public_clinic', 'rest'] : s.stats.stress > 65 ? ['rest', 'meditate', 'walk'] : [];
      const path = ['launch', 'develop', 'submit', 'practice', 'start'].map(part => `path_${route}_${part}`);
      const priorities = [...urgent, ...path, strategy.careerAction, ...strategy.routine, 'walk', 'family_story', 'play', 'rest'];
      const selected = priorities.find(can);
      if (!selected) break;
      apply('activity', { id: selected });
    }
    resolve();
    years.push({ age: s.age, cash: s.money, debt: s.debt, health: s.stats.health, stress: s.stats.stress,
      annualNet: E.budget(s).net,
      stats: { ...s.stats }, paths: JSON.parse(JSON.stringify(s.lifePaths || {})) });
    if (s.age >= throughAge || !s.alive) break;
    apply('age', {});
  }
  return { route, seed, initial, state: s, trace, years };
}

function report(result) {
  return { route: result.route, seed: result.seed, age: result.state.age, alive: result.state.alive,
    cash: result.state.money, debt: result.state.debt, health: result.state.stats.health,
    career: result.state.job?.id || null,
    housing: result.state.lifestyle.housing, priceIndex: result.state.economy.priceIndex,
    apartmentPrice: E.price(result.state, D.items.find(item => item.id === 'apartment').price),
    paths: result.state.lifePaths,
    checkpoints: result.years.filter(year => [18, 24, 32].includes(year.age))
      .map(({ age, cash, debt, health, stress, annualNet }) => ({ age, cash, debt, health, stress, annualNet })),
    actions: result.trace.filter(t => t.type === 'activity' && t.id.startsWith('path_')).map(t => ({ age: t.age, id: t.id })),
    decisions: result.trace.filter(t => t.type === 'choice' && t.pending.startsWith('path_')).map(t => ({ age: t.age, id: t.pending, index: t.index })),
    careerDecisions: result.trace.filter(t => t.type === 'choice' && t.pending.startsWith('career_')).map(t => ({ age: t.age, id: t.pending, index: t.index })) };
}

if (require.main === module) console.log(JSON.stringify(Object.keys(ROUTES).map(route => report(simulate(route))), null, 2));
module.exports = { ROUTES, simulate, report };
