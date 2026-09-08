'use strict';
// Reproducible design probes, not a model of real-world Turkish finances.
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
let E = require('../engine.js'), D = require('../content.js');
if (process.argv.includes('--baseline')) {
  const contents = execFileSync('git', ['show', '09647ff:content.js'], {encoding:'utf8'});
  const contentContext = {module:{exports:{}}};
  vm.runInNewContext(contents, contentContext);D = contentContext.module.exports;
  const engineContext = {module:{exports:{}}, require:() => D};
  vm.runInNewContext(execFileSync('git', ['show','09647ff:engine.js'], {encoding:'utf8'}),engineContext);
  E = engineContext.module.exports;
}
const core=['knowledge','strength','charisma'];
function resolve(s,focus) {
  for(let count=0;s.pending&&count<30;count++) {
    const event=E.eventById?E.eventById(s.pending.id):D.events.find(e=>e.id===s.pending.id);
    if(!event)throw new Error('Unknown event '+s.pending.id);
    const choices=event.choices.map((choice,index)=>({choice,index})).filter(x=>!E.choiceReason(s,x.choice));
    if(!choices.length)throw new Error('No possible choice '+event.id);
    choices.sort((a,b)=>Number(b.choice.effects?.[focus]||0)-Number(a.choice.effects?.[focus]||0));
    if(!E.act(s,'choice',{index:choices[0].index}).ok)throw new Error('Choice failed');
  }
}
function simulate(seed,focus) {
  const s=E.newLife({name:'Denge deneyi',gender:'male',seed}), snapshots={},first80={};
  for(let age=0;age<=50&&s.alive;age++) {
    resolve(s,focus);
    if(s.notices?.length)E.act(s,'ackNotice',{ids:s.notices.map(n=>n.id)});
    for(const id of ['book','shoes','guitar','laptop'])if(s.money>3000&&!E.buyReason(s,id))E.act(s,'buy',{id});
    if(s.age>=18&&!s.job&&!s.education.courseId&&!E.careerReason(s,'cashier'))E.act(s,'apply',{id:'cashier'});
    for(let action=0;s.year.energy>0&&action<12;action++) {
      resolve(s,focus);
      let pool=D.actions.filter(a=>!E.actionReason(s,a));
      const emergency=s.stats.health<60?['public_clinic','doctor','rest']:s.stats.stress>55?['meditate','rest','walk']:[];
      const healthAction=emergency.map(id=>pool.find(a=>a.id===id)).find(Boolean);
      const score=a=>{
        const effects=E.activityPreview?E.activityPreview(s,a).effects:a.effects||{};
        return core.reduce((sum,key)=>sum+(effects[key]||0)*(focus===key?3:focus==='balanced'?(110-s.stats[key])/40:.05),0)/(a.energy||1);
      };
      pool.sort((a,b)=>score(b)-score(a));
      const selected=healthAction||pool.find(a=>score(a)>0)||pool.find(a=>a.id==='rest');
      if(!selected)break;
      E.act(s,'activity',{id:selected.id});
    }
    resolve(s,focus);
    for(const key of core)if(s.stats[key]>=80&&!first80[key])first80[key]=s.age;
    if([18,30,50].includes(s.age))snapshots[s.age]={stats:Object.fromEntries(core.map(k=>[k,Math.round(s.stats[k]*10)/10])),cash:s.money,debt:s.debt};
    if(s.age===50)break;
    E.act(s,'age');
  }
  return {snapshots,first80,age:s.age};
}
const strategies={};
for(const focus of [...core,'balanced']) {
  const runs=Array.from({length:12},(_,i)=>simulate(i+1,focus));
  const ages={};
  for(const age of [18,30,50]) {
    const alive=runs.map(r=>r.snapshots[age]).filter(Boolean);
    ages[age]={survivors:alive.length};
    for(const key of core)ages[age][key]=Math.round(alive.reduce((sum,r)=>sum+r.stats[key],0)/Math.max(1,alive.length)*10)/10;
  }
  strategies[focus]=ages;
}
const budgets=[];
for(const city of ['Ankara','İstanbul'])for(const housing of ['family','shared','rent']){
  const s=E.newLife({seed:42});s.age=25;s.city=city;s.job={id:'cashier',salary:240000,level:1,years:0,performance:55};s.lifestyle.housing=housing;s.money=10000;
  const b=E.budget(s);budgets.push({city,housing,income:b.income,expenses:b.expenses,net:b.net});
}
console.log(JSON.stringify({version:process.argv.includes('--baseline')?'3.1 baseline':'current',strategies,budgets},null,2));
