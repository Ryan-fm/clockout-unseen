import {MAPS,MODES,WORLD_W,WORLD_H} from './maps.js';
export {MAPS,MODES};
export const W=1672,H=941;
export const WALLS=MAPS[0].walls, POINTS=MAPS[0].points;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const distance=dist;
export function walkable(x,y,r=18,map=MAPS[0]) {
 const [left,top,right,bottom]=map.bounds;
 if(x<left+r||x>right-r||y<top+r||y>bottom-r)return false;
 return !map.walls.some(([a,b,w,h])=>x+r>a&&x-r<a+w&&y+r>b&&y-r<b+h);
}
export function clearLine(a,b,map=MAPS[0]) {
 const steps=Math.ceil(dist(a,b)/8);
 for(let i=1;i<steps;i++){const t=i/steps;if(!walkable(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,0,map))return false;}return true;
}
function segmentWalkable(a,b,map){const count=Math.ceil(dist(a,b)/8);for(let i=0;i<=count;i++){const t=count?i/count:0;if(!walkable(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,18,map))return false;}return true;}
export function pathTo(map,a,b){
 const step=25,key=(x,y)=>`${x},${y}`;
 const cell=p=>{
 const candidates=[];for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
 const x=Math.round(p.x/step)+dx,y=Math.round(p.y/step)+dy;
 if(walkable(x*step,y*step,20,map)&&segmentWalkable(p,{x:x*step,y:y*step},map))candidates.push([x,y]);
 }return candidates.sort((a,b)=>dist(p,{x:a[0]*step,y:a[1]*step})-dist(p,{x:b[0]*step,y:b[1]*step}))[0]||[NaN,NaN];
 };
 const [sx,sy]=cell(a),[tx,ty]=cell(b),first=key(sx,sy),end=key(tx,ty);
 if(!Number.isFinite(sx)||!Number.isFinite(tx))return [];
 if(!walkable(tx*step,ty*step,20,map)||!walkable(sx*step,sy*step,20,map))return [];
 const queue=[[sx,sy]],prev=new Map([[first,null]]);let head=0;
 while(head<queue.length){const [x,y]=queue[head++],k=key(x,y);if(k===end)break;
 for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,nk=key(nx,ny);if(!prev.has(nk)&&walkable(nx*step,ny*step,20,map)&&segmentWalkable({x:x*step,y:y*step},{x:nx*step,y:ny*step},map)){prev.set(nk,k);queue.push([nx,ny]);}}
 }
 if(!prev.has(end))return [];const route=[];let k=end;while(k!==null){const [x,y]=k.split(',').map(Number);route.push([x*step,y*step]);k=prev.get(k);}return route.reverse();
}
function random(g){let t=g.seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}
function chooseRoute(n,g){
 for(let i=0;i<40;i++){const p={x:150+Math.floor(random(g)*54)*50,y:150+Math.floor(random(g)*34)*50};
 if(dist(n,p)<250)continue;const route=pathTo(g.map,n,p);if(route.length>1){n.route=route;n.target=0;return;}}
 n.route=[];n.target=0;
}
export function sees(n,p,map=MAPS[0]) {
  if(dist(n,p)>n.range||!clearLine(n,p,map)) return false;
  const d=Math.atan2(p.y-n.y,p.x-n.x)-n.angle;
  return Math.abs(Math.atan2(Math.sin(d),Math.cos(d)))<n.fov/2;
}
function npc(id,x,y,route,speed,range,fov=1.12) {return {id,x,y,route,target:1,speed,range,fov,angle:Math.PI/2,pause:0};}
export const LEVELS = [
 {id:1,name:'开放办公区',time:150,liftWait:3,bossDelay:12,lureDuration:8,description:'穿过工位、茶水间和打印区。走中央通道，或沿外侧绕开随机巡查。',hint:'出口在东侧中央，留意小地图。',speed:120,range:280,bossSpeed:100},
 {id:2,name:'会议中心',time:140,liftWait:4,bossDelay:5,lureDuration:7,description:'错开的会议室遮挡视线，路线更曲折。穿过两翼通道，抵达东北侧电梯。',hint:'东北侧出口，会议室两侧都能绕行。',speed:130,range:300,bossSpeed:115},
 {id:3,name:'行政楼层',time:130,liftWait:5,bossDelay:0,lureDuration:6,description:'中央前台阻断直线，两翼办公室提供掩护。随机巡视的老板守着最后一道关卡。',hint:'出口在北侧中央，从左翼或右翼绕行。',speed:140,range:320,bossSpeed:125}
];
export function createGame(level=1,clearedTimes=[],mode='normal',seed=Math.floor(Math.random()*4294967296),floor=1) {
 if(!LEVELS[level-1]||!MODES[mode])throw new RangeError('Unknown level or mode');
 const map=MAPS[(level+floor-2)%MAPS.length],difficulty=MODES[mode],base=LEVELS[level-1];
 const config={...base,time:Math.round(base.time*difficulty.time),liftWait:base.liftWait+difficulty.wait,bossDelay:mode==='normal'?base.bossDelay:0,coverDuration:difficulty.cover};
 const g={level,floor,floors:difficulty.floors,map,mode,difficulty,seed,config,clearedTimes:[...clearedTimes],phase:'intro',time:config.time,elapsed:0,player:{...map.points.start,face:1,step:0,moving:false},suspicion:0,hidden:false,
 file:false,fileTaken:false,cover:0,lift:'idle',liftTimer:0,interacted:0,lure:0,lureUsed:false,shoutCooldown:8,eventAt:config.bossDelay,eventText:'',eventTimer:0,toast:'',toastTimer:0,message:'',caughtBy:'',moves:0,npcs:[]};
 for(let i=0;i<3+difficulty.extra;i++){const id=i===0?'supervisor':i===1?'boss':i===2?'coworker':`guard${i}`;let spawn=map.spawns[i];
 if(!spawn||!walkable(spawn[0],spawn[1],24,map)||i>2&&dist({x:spawn[0],y:spawn[1]},g.player)<600){
 const candidates=[];for(let x=250;x<2800;x+=100)for(let y=350;y<1750;y+=100){const p={x,y};if(dist(p,g.player)>650&&walkable(x,y,24,map)&&g.npcs.every(n=>dist(n,p)>150))candidates.push([x,y]);}
 spawn=undefined;while(candidates.length){const candidate=candidates.splice(Math.floor(random(g)*candidates.length),1)[0];if(pathTo(map,g.player,{x:candidate[0],y:candidate[1]}).length){spawn=candidate;break;}}
 if(!spawn)throw new Error('No safe patrol spawn');
 }
 const [x,y]=spawn;g.npcs.push({...npc(id,x,y,[],(i===2?80:i===1?base.bossSpeed:base.speed)*difficulty.speed,(i===2?100:base.range)*difficulty.range,i===2?1.5:1.1),angle:0});}
 for(const n of g.npcs)chooseRoute(n,g);return g;
}
export function retryLevel(g){return createGame(g.level,g.clearedTimes,g.mode);}
export function nextLevel(g){if(g.phase!=='won'||g.level>=LEVELS.length)return null;return createGame(g.level+1,[...g.clearedTimes,g.elapsed],g.mode);}
export function totalTime(g){return g.clearedTimes.reduce((sum,t)=>sum+t,0)+g.elapsed;}
export function notify(g,text){g.toast=text;g.toastTimer=3.8;}
export function start(g){if(g.phase!=='intro')return;g.phase='playing';notify(g,`第 ${g.level} 关：${g.config.hint}`);}
export function near(g){
 if(g.hidden)return {id:'seat',label:'离开工位',key:'E'};
 if(dist(g.player,g.map.points.lift)<88&&clearLine(g.player,g.map.points.lift,g.map))return {id:'lift',label:g.lift==='open'?(g.floor<g.floors?'搭电梯去二层':'进入电梯'):g.lift==='calling'?`电梯到达中 ${Math.ceil(g.liftTimer)}s`:'呼叫电梯',key:'E'};
 if(dist(g.player,g.map.points.seat)<76&&clearLine(g.player,g.map.points.seat,g.map))return {id:'seat',label:'坐下伪装',key:'E'};
 if(!g.fileTaken&&dist(g.player,g.map.points.printer)<85&&clearLine(g.player,g.map.points.printer,g.map))return {id:'printer',label:'拿文件夹',key:'E'};
 if(!g.lureUsed&&dist(g.player,g.map.points.distraction)<76&&clearLine(g.player,g.map.points.distraction,g.map))return {id:'coffee',label:'启动咖啡机',key:'E'};
 return null;
}
export function interact(g) {
 if(g.phase!=='playing'||captureIfSeen(g))return;
 const p=near(g); if(!p)return;
 if(p.id==='seat') {g.hidden=!g.hidden;if(g.hidden){g.player.x=g.map.points.seat.x;g.player.y=g.map.points.seat.y;}g.player.moving=false;notify(g,g.hidden?'假装加班中。按 E 起身，或移动离开。':'继续下班行动。');}
 if(p.id==='printer') {g.file=true;g.fileTaken=true;g.interacted++;notify(g,`已拿文件夹：进入视野前按空格，伪装 ${g.config.coverDuration} 秒。`);}
 if(p.id==='coffee') {g.lure=g.config.lureDuration;g.lureUsed=true;g.interacted++;notify(g,'咖啡机响了，主管转向茶水间。趁现在！');}
 if(p.id==='lift'&&g.lift==='idle') {g.lift='calling';g.liftTimer=g.config.liftWait;notify(g,'电梯正在下行，留意身后！');}
 else if(p.id==='lift'&&g.lift==='open') {if(g.floor<g.floors){changeFloor(g);return;}g.phase='won';g.player.moving=false;g.message='电梯门关上的那一刻，世界安静了。';}
}
function changeFloor(g){
 const next=createGame(g.level,g.clearedTimes,g.mode,g.seed,2);
 next.time=g.time;next.elapsed=g.elapsed;next.eventAt=g.elapsed;next.config.bossDelay=0;
 next.phase='floor-intro';next.message='已抵达第二层。六名巡查重新布防，找到本层电梯才能离开。';
 Object.assign(g,next);
}
export function enterFloor(g){if(g.phase!=='floor-intro')return;g.phase='playing';notify(g,`二层 · ${g.map.name}：继续寻找绿色出口。`);}
export function useFile(g){if(g.phase!=='playing'||captureIfSeen(g))return;if(!g.file){notify(g,'先去打印区拿文件夹。');return;}g.file=false;g.cover=g.config.coverDuration;g.suspicion=Math.max(0,g.suspicion-35);g.interacted++;notify(g,`“我去送份材料。” ${g.config.coverDuration} 秒内不会引起怀疑。`);}
export function fail(g,reason){g.phase='lost';g.message=reason;g.player.moving=false;}
function captureIfSeen(g){
 if(g.hidden||g.cover>0)return false;
 const watcher=g.npcs.find(n=>n.id!=='coworker'&&!(n.id==='boss'&&g.elapsed<g.config.bossDelay)&&sees(n,g.player,g.map));
 if(!watcher)return false;
 g.caughtBy=watcher.id;g.suspicion=100;
 fail(g,`${watcher.id==='boss'?'老板':'主管'}发现了你，下班行动失败。文件夹只能提前使用。`);
 return true;
}
function patrol(n,dt,g){
 if(n.id==='boss'&&g.elapsed<g.config.bossDelay)return;
 if(n.id==='supervisor'&&g.lure>0){n.angle=Math.atan2(g.map.points.distraction.y-n.y,g.map.points.distraction.x-n.x);return;}
 if(n.pause>0){n.pause-=dt;return;}
 if(!n.route.length||n.target>=n.route.length){chooseRoute(n,g);n.pause=(.3+random(g)*1.6)*g.difficulty.pause;return;}
 const q=n.route[n.target],dx=q[0]-n.x,dy=q[1]-n.y,d=Math.hypot(dx,dy),step=n.speed*dt;
 if(d<=step+0.1){n.x=q[0];n.y=q[1];n.target++;if(n.target>=n.route.length){n.pause=(.4+random(g)*1.5)*g.difficulty.pause;}return;}
 n.angle=Math.atan2(dy,dx);const x=n.x+dx/d*step,y=n.y+dy/d*step;
 if(walkable(x,y,18,g.map)){n.x=x;n.y=y;}else {n.route=[];n.pause=.1;}
}
export function tick(g,dt,input={x:0,y:0}){
 if(g.phase!=='playing')return;
 dt=Math.min(dt,.05);g.time-=dt;g.elapsed+=dt;
 for(const k of ['toastTimer','cover','eventTimer','lure','shoutCooldown'])g[k]=Math.max(0,g[k]-dt);
 if(g.time<=0){g.time=0;fail(g,'下班太晚了，被拉进了“只开五分钟”的会议。');return;}
 if(captureIfSeen(g))return;
 const p=g.player,m=Math.hypot(input.x,input.y);p.moving=m>.08;
 if(p.moving){g.hidden=false;let dx=input.x/Math.max(1,m)*220*dt,dy=input.y/Math.max(1,m)*220*dt;
  if(walkable(p.x+dx,p.y,18,g.map))p.x+=dx;if(walkable(p.x,p.y+dy,18,g.map))p.y+=dy;
  if(Math.abs(dx)>.01)p.face=dx>0?1:-1;p.step+=dt*10;g.moves+=Math.hypot(dx,dy);
 }
 for(const n of g.npcs)patrol(n,dt,g);
 if(g.elapsed>=g.eventAt){g.eventAt=Infinity;g.eventText='老板出门了：“大家都还在吧？”';g.eventTimer=4;}
 if(captureIfSeen(g))return;
 g.suspicion=0;
 const coworker=g.npcs.find(n=>n.id==='coworker');
 if(coworker&&g.shoutCooldown<=0&&dist(coworker,p)<75&&!g.hidden&&g.cover<=0){g.shoutCooldown=16;g.eventText='同事：“你这么早就走啦？”';g.eventTimer=3.5;const n=g.npcs[0];n.angle=Math.atan2(p.y-n.y,p.x-n.x);n.pause=1.8;}
 if(captureIfSeen(g))return;
 if(g.lift==='calling'){g.liftTimer=Math.max(0,g.liftTimer-dt);if(g.liftTimer===0){g.lift='open';notify(g,'电梯到了！靠近门口，按 E 进入。');}}
}
