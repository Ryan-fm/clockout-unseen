import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WALLS,POINTS,walkable,clearLine,sees,createGame,retryLevel,nextLevel,totalTime,start,tick,interact,useFile} from '../src/engine.js';
function advance(g,seconds,input){for(let i=0;i<seconds*60;i++)tick(g,1/60,input);}
test('furniture prevents movement and blocks supervisor sight',()=>{
 const g=createGame();start(g);g.npcs=[];advance(g,2,{x:0,y:-1});assert.ok(g.player.y>=537);assert.ok(!clearLine({x:380,y:550},{x:380,y:280}));assert.ok(!walkable(400,440));
});
test('patrol paths stay on walkable floor over a full cycle',()=>{
 const g=createGame();start(g);g.time=1000;g.cover=1000;
 for(let i=0;i<60*70;i++){tick(g,1/60);for(const n of g.npcs)assert.ok(walkable(n.x,n.y,2),`${n.id} at ${n.x},${n.y}`);}
});
function exposedGame(){
 const g=createGame();start(g);g.player={x:850,y:480,moving:false};g.npcs=[{id:'supervisor',x:850,y:350,range:220,fov:1.2,angle:Math.PI/2,pause:100,route:[],target:0}];return g;
}
test('the first unprotected visible frame immediately loses the run',()=>{
 const g=exposedGame();assert.ok(sees(g.npcs[0],g.player));tick(g,1/60);assert.equal(g.phase,'lost');assert.equal(g.suspicion,100);assert.equal(g.caughtBy,'supervisor');
});
test('captured run freezes movement and cannot use a file or enter the elevator',()=>{
 const g=exposedGame();g.file=true;g.lift='calling';g.liftTimer=2;tick(g,1/60);
 const position={...g.player},time=g.time,liftTimer=g.liftTimer;
 advance(g,3,{x:1,y:1});useFile(g);interact(g);
 assert.equal(g.phase,'lost');assert.deepEqual(g.player,position);assert.equal(g.time,time);assert.equal(g.liftTimer,liftTimer);assert.equal(g.file,true);
});
test('disguise protects only while active; expiration in view loses immediately',()=>{
 const g=exposedGame();g.hidden=true;advance(g,1);assert.equal(g.phase,'playing');g.hidden=false;g.cover=.1;tick(g,.05);assert.equal(g.phase,'playing');tick(g,.05);assert.equal(g.phase,'lost');
});
test('a file cannot be activated after exposure but can be used beforehand',()=>{
 const late=exposedGame();late.file=true;useFile(late);assert.equal(late.phase,'lost');assert.equal(late.file,true);
 const early=exposedGame();early.npcs[0].angle=0;early.file=true;useFile(early);assert.equal(early.cover,6);assert.equal(early.file,false);early.npcs[0].angle=Math.PI/2;advance(early,1);assert.equal(early.phase,'playing');
});
test('furniture occlusion prevents false immediate capture',()=>{
 const g=exposedGame();g.player={x:380,y:550};g.npcs[0].x=380;g.npcs[0].y=285;g.npcs[0].range=400;assert.equal(sees(g.npcs[0],g.player),false);tick(g,1/60);assert.equal(g.phase,'playing');
});
test('complete legal escape route, pickup, elevator wait and enter',()=>{
 const g=createGame();start(g);g.npcs=[];
 // Movement follows the actual narrow lower corridor, never teleporting through walls.
 function moveTo(x,y){for(let i=0;i<1000;i++){const dx=x-g.player.x,dy=y-g.player.y;if(Math.hypot(dx,dy)<3)return;tick(g,1/60,{x:dx/Math.max(Math.abs(dx),Math.abs(dy),1),y:dy/Math.max(Math.abs(dx),Math.abs(dy),1)});}assert.fail('route blocked');}
 moveTo(525,550);moveTo(525,795);moveTo(710,795);interact(g);assert.equal(g.file,true);useFile(g);assert.equal(g.cover,6);moveTo(1483,795);interact(g);assert.equal(g.lift,'calling');interact(g);assert.equal(g.phase,'playing');advance(g,3.1);assert.equal(g.lift,'open');interact(g);assert.equal(g.phase,'won');
});
test('pause freezes time and timeout ends the run',()=>{
 const g=createGame();start(g);g.phase='paused';advance(g,2);assert.equal(g.time,90);g.phase='playing';g.time=.05;advance(g,.1);assert.equal(g.phase,'lost');
});

test('all three patrol layouts remain on the floor',()=>{
 for(const level of [2,3]){
  const g=createGame(level);start(g);g.time=1000;g.cover=1000;
  for(let i=0;i<60*80;i++){tick(g,1/60);for(const n of g.npcs)assert.ok(walkable(n.x,n.y,2),`level ${level}: ${n.id}`);}
 }
});

test('three consecutive levels are winnable with real patrols and legal movement',()=>{
 let g=createGame();const times=[];
 function moveTo(x,y,useAt=Infinity){for(let i=0;i<1000;i++){
  assert.equal(g.phase,'playing',`level ${g.level}: ${g.message}`);
  const dx=x-g.player.x,dy=y-g.player.y;if(Math.hypot(dx,dy)<3)return;
  if(g.file&&g.player.x>=useAt)useFile(g);
  tick(g,1/60,{x:dx/Math.max(Math.abs(dx),Math.abs(dy),1),y:dy/Math.max(Math.abs(dx),Math.abs(dy),1)});
 }assert.fail('route blocked');}
 for(let level=1;level<=3;level++){
  assert.equal(g.level,level);assert.equal(g.phase,'intro');assert.deepEqual(g.clearedTimes,times);start(g);
  moveTo(525,550);moveTo(525,665);interact(g);assert.equal(g.lureUsed,true);
  moveTo(525,795);moveTo(710,795);interact(g);assert.equal(g.file,true);
  moveTo(1483,795,level===1?Infinity:level===2?1350:1150);interact(g);
  assert.equal(g.liftTimer,g.config.liftWait);advance(g,g.config.liftWait-.1);interact(g);assert.equal(g.phase,'playing');
  advance(g,.2);interact(g);assert.equal(g.phase,'won');times.push(g.elapsed);
  assert.ok(Math.abs(totalTime(g)-times.reduce((a,b)=>a+b,0))<.001);
  if(level<3)g=nextLevel(g);else assert.equal(nextLevel(g),null);
 }
});

test('failure retries the current level, resets items, and preserves prior clears',()=>{
 const g=createGame(2,[12]);start(g);g.fileTaken=true;g.lureUsed=true;g.cover=2;g.time=.01;tick(g,.05);assert.equal(g.phase,'lost');
 const retry=retryLevel(g);assert.equal(retry.level,2);assert.equal(retry.time,75);assert.equal(retry.phase,'intro');assert.deepEqual(retry.clearedTimes,[12]);assert.equal(retry.fileTaken,false);assert.equal(retry.lureUsed,false);assert.equal(retry.cover,0);assert.equal(retry.elapsed,0);
 retry.clearedTimes.push(99);assert.deepEqual(g.clearedTimes,[12]);
});

test('unfinished levels cannot advance or be revived through start',()=>{
 for(const phase of ['intro','playing','paused','lost']){const g=createGame(2,[12]);g.phase=phase;assert.equal(nextLevel(g),null);if(phase!=='intro'){start(g);assert.equal(g.phase,phase);}}
 const g=createGame(3,[12,15]);g.phase='won';assert.equal(nextLevel(g),null);start(g);assert.equal(g.phase,'won');
 assert.throws(()=>createGame(4),RangeError);
});
