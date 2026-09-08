'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('./engine.js');
const D = require('./content.js');
const A = require('./avatar.js');
const fresh = (age=0,seed=42) => {const s=E.newLife({name:'Test',gender:'male',seed});s.age=age;s.year.maxEnergy=8;s.year.energy=8;return s;};
function resolve(s) { if(!s.pending)return; const event=D.events.find(e=>e.id===s.pending.id);const i=event.choices.findIndex(c=>!E.choiceReason(s,c));assert.ok(i>=0,'Every event has a possible choice');assert.equal(E.act(s,'choice',{index:i}).ok,true); }
test('Life generation and choices are deterministic with a saved seed',()=>{
  const a=E.newLife({name:'Deniz',gender:'random',seed:183}),b=E.newLife({name:'Deniz',gender:'random',seed:183});assert.deepEqual(a,b);
  E.act(a,'age');E.act(b,'age');assert.deepEqual(a,b);resolve(a);resolve(b);assert.deepEqual(a,b);
  assert.deepEqual(E.migrate(JSON.parse(JSON.stringify(a))),a);
});
test('Content ids and references are valid, all events provide an unconditional fallback',()=>{
  for(const key of ['actions','items','events','careers','courses'])assert.equal(new Set(D[key].map(e=>e.id)).size,D[key].length);
  for(const event of D.events){
    assert.ok(event.choices.length>=2,event.id);
    assert.ok(event.choices.some(c=>!c.cost&&!c.requires),event.id+' fallback');
    for(const c of event.choices)for(const e of [].concat(c.schedule||[]))assert.ok(D.events.some(x=>x.id===e.id));
  }
  for(const a of D.actions)for(const id of a.requires?.items||[])assert.ok(D.items.some(i=>i.id===id),id);
});
test('Pending choices survive saving and block unrelated mutations',()=>{
  const s=fresh();E.act(s,'age');assert.ok(s.pending);
  const restored=E.migrate(JSON.parse(JSON.stringify(s)));assert.deepEqual(restored.pending,s.pending);
  for(const action of ['age','activity','buy','lifestyle'])assert.equal(E.act(restored,action,{id:'rest',key:'pace',value:'ambitious'}).ok,false);
  resolve(restored);assert.equal(restored.pending,null);
});
test('Gear gates, purchases, wear, sale/rebuy and consumables cannot duplicate stat bonuses',()=>{
  const s=fresh(18);s.money=100000;
  assert.ok(E.actionReason(s,D.actions.find(a=>a.id==='read')));
  assert.ok(E.act(s,'buy',{id:'book'}).ok);assert.equal(E.actionReason(s,D.actions.find(a=>a.id==='read')),'');
  const knowledge=s.stats.knowledge;assert.equal(E.act(s,'buy',{id:'book'}).ok,false);
  E.act(s,'sell',{id:'book'});E.act(s,'buy',{id:'book'});assert.equal(s.stats.knowledge,knowledge);
  s.stats.health=50;E.act(s,'buy',{id:'medicine'});assert.equal(s.stats.health,50);E.act(s,'use',{id:'medicine'});assert.equal(s.stats.health,58);assert.equal(E.act(s,'use',{id:'medicine'}).ok,false);
});
test('One age increment pays a complete annual salary, with annual tax and bills',()=>{
  const s=fresh(30);s.money=10000;s.job={id:'cashier',salary:240000,level:1,years:0,performance:55};
  const b=E.budget(s);assert.equal(b.salary,240000);assert.equal(b.tax,28800);const cash=s.money+b.net;
  E.act(s,'age');assert.equal(s.lastBudget.income,240000);assert.equal(s.lastBudget.expenses,b.expenses);assert.equal(s.lastBudget.endingCash,Math.max(0,cash));
  assert.equal(s.age,31);
});
test('Time and per-year limits prevent repeated free gains',()=>{
  const s=fresh(10);const a=D.actions.find(x=>x.id==='library');assert.ok(E.act(s,'activity',{id:a.id}).ok);assert.ok(E.act(s,'activity',{id:a.id}).ok);
  const before=JSON.stringify(s);assert.equal(E.act(s,'activity',{id:a.id}).ok,false);assert.equal(JSON.stringify(s),before);
  s.year.energy=0;assert.equal(E.act(s,'activity',{id:'rest'}).ok,false);
});
test('Relationships consume time and adult family restrictions hold',()=>{
  const s=fresh(25);s.money=100000;const parent=s.npcs[0];parent.age=50;
  assert.equal(E.act(s,'social',{id:parent.id,interaction:'flirt'}).ok,false);
  assert.equal(E.act(s,'social',{id:parent.id,interaction:'talk'}).ok,true);
  assert.equal(E.act(s,'social',{id:parent.id,interaction:'talk'}).ok,false);
  assert.equal(s.year.energy,7);
});
test('Delayed story really returns next year',()=>{
  const event=D.events.find(e=>e.choices.some(c=>c.schedule&&!c.requires&&!c.cost));assert.ok(event);
  const s=fresh(Math.max(event.minAge,8));s.pending={id:event.id};
  const choice=event.choices.findIndex(c=>c.schedule&&!c.requires&&!c.cost),follow=[].concat(event.choices[choice].schedule)[0].id;
  assert.ok(E.act(s,'choice',{index:choice}).ok);assert.ok(s.scheduled.some(x=>x.id===follow));
  E.act(s,'age');assert.equal(s.pending.id,follow);
});
test('Degree requirements, graduation and eligible career application',()=>{
  const s=fresh(18);s.money=1000000;s.stats.knowledge=90;s.stats.charisma=90;s.stats.health=95;s.education.grade=90;s.education.level='graduate';
  const c=D.courses.find(c=>c.id==='software');assert.equal(E.act(s,'enroll',{id:c.id}).ok,true);
  for(let y=0;y<c.duration;y++){resolve(s);E.act(s,'age');}
  resolve(s);assert.ok(s.education.degrees.includes(c.degree));assert.equal(s.education.courseId,null);
  const career=D.careers.find(c=>[].concat(c.requires?.degree||c.degree||[]).includes('software'));assert.ok(career);
  assert.equal(E.careerReason(s,career),'');
});
test('Chronic conditions need management; low health and old age end life',()=>{
  const s=fresh(50);s.money=10000;s.conditions=[{id:'hypertension',name:'Yüksek tansiyon',chronic:true,severity:4,since:49,managedUntil:-1}];
  E.act(s,'activity',{id:'doctor'});assert.equal(s.conditions.length,1);assert.equal(s.conditions[0].severity,3);
  s.stats.health=1;s.stats.stress=100;s.lifestyle.diet='frugal';E.act(s,'age');assert.equal(s.alive,false);
  const before=JSON.stringify(s);assert.equal(E.act(s,'activity',{id:'rest'}).ok,false);assert.equal(JSON.stringify(s),before);
  const old=fresh(109);old.stats.health=100;E.act(old,'age');assert.equal(old.alive,false);
});
test('Legacy negative money migrates to debt and imported bad numbers become finite',()=>{
  const s=E.migrate({name:'Eski',age:18,money:-5000,health:55,knowledge:20,events:[],owned:['book'],relations:[]});assert.equal(s.debt,5000);assert.equal(s.money,0);assert.equal(s.stats.health,55);
  const broken=E.migrate({...fresh(),stats:{health:NaN,knowledge:-100},money:Infinity,inventory:[null],npcs:[null]});assert.ok(Number.isFinite(broken.money));assert.equal(broken.stats.health,0);assert.equal(broken.inventory.length,0);
});
test('24 autonomous complete lives have valid events, bounded stats and finite budgets',()=>{
  for(let seed=1;seed<=24;seed++){
    const s=E.newLife({name:'Simülasyon',seed});
    for(let year=0;year<115&&s.alive;year++){
      resolve(s);
      if(s.age>=18&&!s.job&&!s.education.courseId&&!s.flags.retired){const c=D.careers.find(c=>!E.careerReason(s,c));if(c)E.act(s,'apply',{id:c.id});}
      while(s.year.energy>0){
        const pool=D.actions.filter(a=>!E.actionReason(s,a));if(!pool.length)break;
        const priorities=s.stats.health<60?['doctor','public_clinic','rest','walk']:s.stats.stress>40?['rest','meditate','walk']:s.age<18?['study','library','socialize','walk']:['overtime','walk','socialize','rest'];
        const activity=priorities.map(id=>pool.find(a=>a.id===id)).find(Boolean)||pool[0];E.act(s,'activity',{id:activity.id});
      }
      E.act(s,'age');
      for(const [key,value]of Object.entries(s.stats))assert.ok(Number.isFinite(value)&&value>=0&&value<=100,key);
      assert.ok(Number.isFinite(s.money)&&s.money>=0);assert.ok(Number.isFinite(s.debt)&&s.debt>=0);assert.ok(s.year.energy>=0);
    }
    assert.equal(s.alive,false,'Life finishes within age 110');assert.ok(s.milestones.some(m=>m.id==='death'));
  }
});
test('Avatar renders age and appearance variants without injectable attributes',()=>{
  for(const age of [0,5,14,25,55,80])for(const hair of ['short','wave','long','buzz','bald'])assert.match(A.render({age,appearance:{hair}}),/^<svg/);
  assert.ok(!A.render({name:'<script>x</script>',appearance:{color:'"><script>x</script>'}}).includes('<script>'));
});
