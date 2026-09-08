'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('./engine.js');

// Synthetic fixtures isolate social-circle rules; natural lives are tested separately.
function school(age=6){const s=E.newLife({seed:411});s.age=age;s.year.energy=s.year.maxEnergy=E.maxEnergy(s);s.notices=[];return s;}
function resolve(s){let count=0;while(s.pending&&count++<30){const e=E.eventById(s.pending.id);const index=e.choices.findIndex(c=>!c.cost&&!c.energy&&!E.choiceReason(s,c));assert.ok(index>=0);assert.equal(E.act(s,'choice',{index}).ok,true);}assert.ok(count<30);}
test('Birth still starts with parents only; school contacts are opt-in activities',()=>{
  const s=E.newLife({seed:13});assert.equal(s.npcs.length,2);
  assert.match(E.actionReason(s,'school_circle'),/6 yaş/);
  const young=school();const money=young.money,time=young.year.energy;
  assert.equal(E.act(young,'activity',{id:'school_circle'}).ok,true);
  const npc=young.npcs.at(-1);assert.equal(npc.role,'acquaintance');assert.equal(npc.circleId,'school:primary');
  assert.equal(young.pending.npcId,npc.id);assert.equal(young.year.energy,time-1);assert.equal(young.money,money);
});
test('A school circle grows to two recurring peers and one permanently protected teacher',()=>{
  const s=school();
  for(let i=0;i<4;i++){
    assert.equal(E.act(s,'activity',{id:'school_circle'}).ok,true);resolve(s);
    if(i<3){assert.equal(E.act(s,'age').ok,true);resolve(s);}
  }
  const group=E.circle(s);assert.equal(group.members.length,3);
  const mentor=s.npcs.find(n=>n.circleId==='school:primary'&&n.mentorProtected);assert.ok(mentor);
  assert.equal(mentor.job,'Öğretmen');assert.equal(mentor.contextRole,'mentor');
  const restored=E.migrate(JSON.parse(JSON.stringify(s)));assert.deepEqual(E.circle(restored),group);
  restored.age=25;mentor.age=45;
  const restoredMentor=restored.npcs.find(n=>n.id===mentor.id);restoredMentor.bond=99;restoredMentor.trust=99;
  assert.match(E.socialReason(restored,restoredMentor,'date'),/rehber|romantik|aile/i);
});
test('New schools change the current circle but preserve earlier relationships and memories',()=>{
  const s=school(10);E.act(s,'activity',{id:'school_circle'});resolve(s);
  const old=s.npcs.at(-1).id;
  E.act(s,'age');resolve(s);assert.equal(s.age,11);assert.equal(E.circle(s).members.length,0);
  E.act(s,'activity',{id:'school_circle'});resolve(s);
  assert.equal(E.circle(s).members[0].id,s.npcs.at(-1).id);assert.notEqual(s.npcs.at(-1).id,old);
  assert.ok(s.npcs.some(n=>n.id===old));
});
test('Circle reads are immutable and lack of time never creates a new NPC',()=>{
  const s=school();s.year.energy=0;const before=JSON.stringify(s);
  E.circle(s);assert.equal(E.act(s,'activity',{id:'school_circle'}).ok,false);
  assert.equal(JSON.stringify(s),before);
});
test('Work circle requires an actual job and retains people across years',()=>{
  const s=school(25);assert.match(E.actionReason(s,'work_circle'),/işe/);
  s.job={id:'cashier',level:1,performance:60,years:1,salary:240000};
  s.year.energy=s.year.maxEnergy=E.maxEnergy(s);
  assert.equal(E.act(s,'activity',{id:'work_circle'}).ok,true);resolve(s);
  const n=s.npcs.at(-1);assert.equal(n.circleId,'work:cashier');assert.equal(n.contextRole,'colleague');
  const before=JSON.stringify(s);E.circle(s);assert.equal(JSON.stringify(s),before);
});
