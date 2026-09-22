import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MAPS,MODES,LEVELS,walkable,clearLine,sees,pathTo,createGame,retryLevel,nextLevel,totalTime,start,enterFloor,tick,interact,useFile} from '../src/engine.js';
const advance=(g,seconds,input)=>{for(let i=0;i<seconds*30;i++)tick(g,1/30,input);};
function exposed(){const g=createGame(1,[],'normal',42);start(g);g.player={x:1500,y:1100,moving:false};g.npcs=[{id:'supervisor',x:1500,y:950,range:300,fov:1.2,angle:Math.PI/2,pause:100,route:[],target:0}];return g;}
test('three distinct enlarged maps have reachable interaction points and exit',()=>{
 assert.equal(new Set(MAPS.map(m=>JSON.stringify(m.walls))).size,3);
 for(let l=1;l<=3;l++){const g=createGame(l);for(const [id,p] of Object.entries(g.map.points)){assert.ok(walkable(p.x,p.y,18,g.map),`${l} ${id}`);assert.ok(pathTo(g.map,g.player,p).length,`${l} reachable ${id}`);}}
});
test('furniture blocks walking and sight on every map',()=>{for(const map of MAPS){for(const [x,y,w,h] of map.walls){assert.equal(walkable(x+w/2,y+h/2,18,map),false);assert.equal(clearLine({x:x-40,y:y+h/2},{x:x+w+40,y:y+h/2},map),false);}}});
test('seeded patrol is reproducible and different seeds change destinations',()=>{const a=createGame(1,[],'hell',11),b=createGame(1,[],'hell',11),c=createGame(1,[],'hell',12);assert.deepEqual(a.npcs,b.npcs);assert.notDeepEqual(a.npcs.map(n=>n.route),c.npcs.map(n=>n.route));});
test('random patrol never crosses furniture or bounds across maps and modes',()=>{
 for(let l=1;l<=3;l++)for(const mode of Object.keys(MODES))for(let seed=1;seed<=3;seed++){
 const g=createGame(l,[],mode,seed);start(g);g.time=1000;g.cover=1000;const origins=g.npcs.map(n=>({x:n.x,y:n.y}));
 for(let i=0;i<1800;i++){tick(g,.05);for(const n of g.npcs)assert.ok(walkable(n.x,n.y,18,g.map),`${l} ${mode} ${n.id} ${n.x},${n.y}`);}
 g.npcs.forEach((n,i)=>assert.ok(Math.hypot(n.x-origins[i].x,n.y-origins[i].y)>20,`${l} ${mode} ${n.id} stuck`));
 }
});
test('spawn is safe in every map and mode',()=>{for(let l=1;l<=3;l++)for(const mode of Object.keys(MODES)){const g=createGame(l,[],mode,1);start(g);tick(g,.05);assert.equal(g.phase,'playing');}});
test('first visible unprotected frame loses immediately; captured run is frozen',()=>{
 const g=exposed();assert.ok(sees(g.npcs[0],g.player,g.map));g.file=true;tick(g,.03);assert.equal(g.phase,'lost');assert.equal(g.suspicion,100);const snap=JSON.stringify(g);advance(g,2,{x:1,y:0});useFile(g);interact(g);assert.equal(JSON.stringify(g),snap);
});
test('file must be used before detection; protection expires immediately',()=>{
 const late=exposed();late.file=true;useFile(late);assert.equal(late.phase,'lost');assert.equal(late.file,true);
 const early=exposed();early.npcs[0].angle=0;early.file=true;useFile(early);assert.equal(early.cover,6);early.npcs[0].angle=Math.PI/2;advance(early,1);assert.equal(early.phase,'playing');early.cover=.01;tick(early,.03);assert.equal(early.phase,'lost');
});
test('hard modes increase pressure and retain mode after retry and advance',()=>{
 const [n,e,h]=Object.keys(MODES).map(mode=>createGame(2,[12],mode));assert.ok(n.time>e.time&&e.time>h.time/h.floors);assert.ok(n.npcs.length<e.npcs.length&&e.npcs.length<h.npcs.length);assert.ok(n.config.coverDuration>e.config.coverDuration&&e.config.coverDuration>h.config.coverDuration);assert.ok(n.config.liftWait<e.config.liftWait&&e.config.liftWait<h.config.liftWait);
 for(const g of [n,e,h]){const retry=retryLevel(g);assert.equal(retry.mode,g.mode);assert.deepEqual(retry.clearedTimes,[12]);assert.equal(retry.level,2);assert.notEqual(retry.seed,g.seed);g.phase='won';g.elapsed=15;const next=nextLevel(g);assert.equal(next.mode,g.mode);assert.equal(next.level,3);assert.deepEqual(next.clearedTimes,[12,15]);}
});
function moveRoute(g,p){const route=pathTo(g.map,g.player,p);assert.ok(route.length);for(const [x,y] of [...route,[p.x,p.y]]){let arrived=false;for(let i=0;i<200;i++){const dx=x-g.player.x,dy=y-g.player.y,d=Math.hypot(dx,dy);if(d<4){arrived=true;break;}tick(g,1/60,{x:dx/d,y:dy/d});assert.equal(g.phase,'playing',g.message);}assert.ok(arrived,'blocked movement');}}
test('every map and floor permits movement, pickup and elevator escape in all modes',()=>{
 for(const mode of Object.keys(MODES)){let g=createGame(1,[],mode,10);for(let l=1;l<=3;l++){
 start(g);
 for(let floor=1;floor<=g.floors;floor++){
 assert.equal(g.floor,floor);g.npcs=[];moveRoute(g,g.map.points.printer);interact(g);assert.ok(g.file);useFile(g);assert.equal(g.cover,g.config.coverDuration);moveRoute(g,g.map.points.lift);interact(g);assert.equal(g.lift,'calling');advance(g,g.config.liftWait+.1);
 const oldMap=g.map.id,elapsed=g.elapsed,time=g.time;interact(g);
 if(floor<g.floors){assert.equal(g.phase,'floor-intro');assert.notEqual(g.map.id,oldMap);assert.equal(g.elapsed,elapsed);assert.equal(g.time,time);assert.equal(g.npcs.filter(n=>n.id!=='coworker').length,6);advance(g,3);assert.equal(g.time,time);assert.equal(nextLevel(g),null);enterFloor(g);}
 else assert.equal(g.phase,'won');
 }
 assert.ok(totalTime(g)>0);if(l<3)g=nextLevel(g);else assert.equal(nextLevel(g),null);
 }}
});
test('hell starts with six patrols per floor and second-floor failure restarts the stage',()=>{
 const g=createGame(2,[12],'hell',7,2);assert.equal(g.npcs.filter(n=>n.id!=='coworker').length,6);g.phase='lost';const retry=retryLevel(g);assert.equal(retry.floor,1);assert.equal(retry.level,2);assert.equal(retry.mode,'hell');assert.deepEqual(retry.clearedTimes,[12]);
});
test('pause, timeout and premature level advancement remain safe',()=>{const g=createGame();start(g);g.phase='paused';const t=g.time;advance(g,2);assert.equal(g.time,t);assert.equal(nextLevel(g),null);g.phase='playing';g.time=.01;tick(g,.05);assert.equal(g.phase,'lost');start(g);assert.equal(g.phase,'lost');assert.throws(()=>createGame(4),RangeError);});
