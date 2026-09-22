export const W = 1672, H = 941;
// Coordinates are grounded in the approved office illustration; feet determine collision.
export const WALLS = [
  [285,295,430,229], [967,295,402,229],
  [92,573,406,263], [554,579,332,194], [961,579,435,191],
  [365,100,380,169], [943,100,398,169],
  [1388,540,184,222], [1546,738,60,92],
  [190,404,45,151], [1392,365,71,168],
];
export const POINTS = {
  start:{x:380,y:550}, printer:{x:710,y:795}, seat:{x:1260,y:548},
  lift:{x:1483,y:792}, distraction:{x:522,y:665},
};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const distance=dist;
export function walkable(x,y,r=13) {
  if(y<278+r||y>828-r||x<242-(y-278)*.19+r||x>1435+(y-278)*.28-r) return false;
  return !WALLS.some(([a,b,w,h])=>x+r>a&&x-r<a+w&&y+r>b&&y-r<b+h);
}
export function clearLine(a,b) {
  const steps=Math.ceil(dist(a,b)/7);
  for(let i=1;i<steps;i++) {const t=i/steps,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
    if(WALLS.some(([xx,yy,w,h])=>x>xx&&x<xx+w&&y>yy&&y<yy+h)) return false;
  } return true;
}
export function sees(n,p) {
  if(dist(n,p)>n.range||!clearLine(n,p)) return false;
  const d=Math.atan2(p.y-n.y,p.x-n.x)-n.angle;
  return Math.abs(Math.atan2(Math.sin(d),Math.cos(d)))<n.fov/2;
}
function npc(id,x,y,route,speed,range,fov=1.12) {return {id,x,y,route,target:1,speed,range,fov,angle:Math.PI/2,pause:0};}
export const LEVELS = [
 {id:1,name:'准点开溜',time:90,liftWait:3,bossDelay:16,lureDuration:7,
  description:'主管例行巡视。利用茶水间和文件夹，找到通往电梯的路。',
  hint:'先熟悉掩体，再穿过走廊。',speed:85,range:225,bossSpeed:55},
 {id:2,name:'双重巡查',time:75,liftWait:4,bossDelay:5,lureDuration:5,
  description:'老板提前出门，主管加快巡逻。两道视线交错，留好你的文件夹。',
  hint:'老板 5 秒后出门，电梯需要等 4 秒。',speed:105,range:245,bossSpeed:70},
 {id:3,name:'最后一班电梯',time:60,liftWait:5,bossDelay:0,lureDuration:4,
  description:'主管重点检查电梯走廊，老板从开局就巡视。把握转身的空当离开。',
  hint:'出口有人巡查，提前使用文件夹保护自己。',speed:115,range:260,bossSpeed:80},
];
export function createGame(level=1,clearedTimes=[]) {
 const config=LEVELS[level-1];
 if(!config)throw new RangeError('Unknown level');
 const supervisorRoute=level===3
  ?[[1100,793],[1480,793],[923,793],[918,550],[1380,550],[918,550],[923,793],[1100,793]]
  :level===2
   ?[[900,552],[923,793],[1480,793],[923,793],[918,550],[1380,550],[918,550],[900,552]]
   :[[825,342],[900,552],[923,793],[1480,793],[923,793],[918,550],[1380,550],[850,550],[764,286],[825,342]];
 return {level,config,clearedTimes:[...clearedTimes],phase:'intro',time:config.time,elapsed:0,player:{...POINTS.start,face:1,step:0,moving:false},suspicion:0,hidden:false,
  file:false,fileTaken:false,cover:0,lift:'idle',liftTimer:0,interacted:0,
  lure:0,lureUsed:false,lureCooldown:0,shoutCooldown:8,eventAt:config.bossDelay,eventText:'',eventTimer:0,toast:'',toastTimer:0,
  message:'',caughtBy:'',moves:0,npcs:[
   npc('supervisor',...supervisorRoute[0],supervisorRoute,config.speed,config.range),
   npc('boss',780,285,[[780,285],[904,285],[900,543],[1240,552],[900,543],[780,285]],config.bossSpeed,level===1?165:195,.95),
   npc('coworker',520,556,[[520,556],[527,792],[830,797],[527,792],[520,556]],43,115,1.7)
  ]};
}
export function retryLevel(g){return createGame(g.level,g.clearedTimes);}
export function nextLevel(g){
 if(g.phase!=='won'||g.level>=LEVELS.length)return null;
 return createGame(g.level+1,[...g.clearedTimes,g.elapsed]);
}
export function totalTime(g){return g.clearedTimes.reduce((sum,t)=>sum+t,0)+g.elapsed;}
export function notify(g,text){g.toast=text;g.toastTimer=3.8;}
export function start(g){if(g.phase!=='intro')return;g.phase='playing';notify(g,`第 ${g.level} 关：${g.config.hint}`);}
export function near(g){
 if(g.hidden)return {id:'seat',label:'离开工位',key:'E'};
 if(dist(g.player,POINTS.lift)<88)return {id:'lift',label:g.lift==='open'?'进入电梯':g.lift==='calling'?`电梯到达中 ${Math.ceil(g.liftTimer)}s`:'呼叫电梯',key:'E'};
 if(dist(g.player,POINTS.seat)<76)return {id:'seat',label:'坐下伪装',key:'E'};
 if(!g.fileTaken&&dist(g.player,POINTS.printer)<85)return {id:'printer',label:'拿文件夹',key:'E'};
 if(!g.lureUsed&&dist(g.player,POINTS.distraction)<76)return {id:'coffee',label:'启动咖啡机',key:'E'};
 return null;
}
export function interact(g) {
 if(g.phase!=='playing'||captureIfSeen(g))return;
 const p=near(g); if(!p)return;
 if(p.id==='seat') {g.hidden=!g.hidden;if(g.hidden){g.player.x=POINTS.seat.x;g.player.y=POINTS.seat.y;}g.player.moving=false;notify(g,g.hidden?'假装加班中。按 E 起身，或移动离开。':'继续下班行动。');}
 if(p.id==='printer') {g.file=true;g.fileTaken=true;g.interacted++;notify(g,'已拿文件夹：进入视野前按空格，可伪装 6 秒。被发现后无法补救。');}
 if(p.id==='coffee') {g.lure=g.config.lureDuration;g.lureUsed=true;g.interacted++;notify(g,'咖啡机响了，主管转向茶水间。趁现在！');}
 if(p.id==='lift'&&g.lift==='idle') {g.lift='calling';g.liftTimer=g.config.liftWait;notify(g,'电梯正在下行，留意身后！');}
 else if(p.id==='lift'&&g.lift==='open') {g.phase='won';g.player.moving=false;g.message='电梯门关上的那一刻，世界安静了。';}
}
export function useFile(g){if(g.phase!=='playing'||captureIfSeen(g))return;if(!g.file){notify(g,'先去打印区拿文件夹。');return;}g.file=false;g.cover=6;g.suspicion=Math.max(0,g.suspicion-35);g.interacted++;notify(g,'“我去送份材料。” 6 秒内不会引起怀疑。');}
export function fail(g,reason){g.phase='lost';g.message=reason;g.player.moving=false;}
function captureIfSeen(g){
 if(g.hidden||g.cover>0)return false;
 const watcher=g.npcs.find(n=>n.id!=='coworker'&&sees(n,g.player));
 if(!watcher)return false;
 g.caughtBy=watcher.id;g.suspicion=100;
 fail(g,`${watcher.id==='boss'?'老板':'主管'}发现了你，下班行动失败。文件夹只能提前使用。`);
 return true;
}
function patrol(n,dt,g){
 if(n.id==='boss'&&g.elapsed<g.config.bossDelay) {n.angle=Math.PI/2;return;}
 if(n.id==='supervisor'&&g.lure>0){n.angle=Math.atan2(POINTS.distraction.y-n.y,POINTS.distraction.x-n.x);return;}
 if(n.pause>0){n.pause-=dt;return;}
 const q=n.route[n.target];const dx=q[0]-n.x,dy=q[1]-n.y,d=Math.hypot(dx,dy);
 if(d<n.speed*dt+1){n.x=q[0];n.y=q[1];n.target=(n.target+1)%n.route.length;n.pause=n.id==='supervisor'?.55:1.1;return;}
 n.angle=Math.atan2(dy,dx);n.x+=dx/d*n.speed*dt;n.y+=dy/d*n.speed*dt;
}
export function tick(g,dt,input={x:0,y:0}){
 if(g.phase!=='playing')return;
 dt=Math.min(dt,.05);g.time-=dt;g.elapsed+=dt;
 for(const k of ['toastTimer','cover','eventTimer','lure','shoutCooldown'])g[k]=Math.max(0,g[k]-dt);
 if(g.time<=0){g.time=0;fail(g,'下班太晚了，被拉进了“只开五分钟”的会议。');return;}
 if(captureIfSeen(g))return;
 const p=g.player,m=Math.hypot(input.x,input.y);p.moving=m>.08;
 if(p.moving){g.hidden=false;let dx=input.x/Math.max(1,m)*152*dt,dy=input.y/Math.max(1,m)*152*dt;
  if(walkable(p.x+dx,p.y))p.x+=dx;if(walkable(p.x,p.y+dy))p.y+=dy;
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
