import { useEffect, useRef, useState } from 'react';
import {W,H,WALLS,POINTS,LEVELS,createGame,retryLevel,nextLevel,totalTime,tick,start,near,interact,useFile,fail,clearLine,walkable} from './engine.js';
const ASSETS=['office','player','supervisor','boss','coworker','player-seated'];
const assetUrl=n=>`${import.meta.env.BASE_URL}assets/${n}.png`;
const labels={supervisor:'主管',boss:'老板',coworker:'同事'};
let audio;
function tone(hz=520){try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),a=audio.createGain();o.connect(a);a.connect(audio.destination);o.type='sine';o.frequency.value=hz;a.gain.setValueAtTime(.055,audio.currentTime);a.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.18);o.start();o.stop(audio.currentTime+.2);}catch{}}
function round(ctx,x,y,w,h,r=9){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function tag(ctx,x,y,text,bg='#192b34',color='#fff4dc',size=17){ctx.save();ctx.font=`600 ${size}px "PingFang SC", sans-serif`;const w=ctx.measureText(text).width+25;ctx.fillStyle=bg;round(ctx,x-w/2,y-28,w,34,9);ctx.fill();ctx.fillStyle=color;ctx.textAlign='center';ctx.fillText(text,x,y-5);ctx.restore();}
function draw(ctx,g,imgs,clock){
 ctx.clearRect(0,0,W,H);ctx.drawImage(imgs.office,0,0,W,H);
 const threat=g.suspicion>60;
 for(const n of g.npcs){
  if(n.id==='coworker')continue;
  const points=[];
  for(let i=0;i<=46;i++){const a=n.angle-n.fov/2+n.fov*i/46;let r=0;for(r=7;r<n.range;r+=7){const p={x:n.x+Math.cos(a)*r,y:n.y+Math.sin(a)*r};if(!walkable(p.x,p.y,0))break;}points.push([n.x+Math.cos(a)*r,n.y+Math.sin(a)*r]);}
  ctx.beginPath();ctx.moveTo(n.x,n.y);points.forEach(p=>ctx.lineTo(...p));ctx.closePath();ctx.fillStyle=threat?'rgba(226,88,65,.27)':'rgba(252,185,58,.23)';ctx.fill();ctx.strokeStyle=threat?'rgba(241,99,80,.7)':'rgba(240,170,48,.5)';ctx.lineWidth=2;ctx.stroke();
 }
 const marks=[{...POINTS.printer,text:g.fileTaken?'已取文件':'文件夹',show:!g.fileTaken},{...POINTS.seat,text:g.hidden?'伪装中':'空工位',show:true},{...POINTS.distraction,text:'咖啡机',show:!g.lureUsed},{...POINTS.lift,text:g.lift==='open'?'电梯已到':g.lift==='calling'?`${Math.ceil(g.liftTimer)} 秒`:'电梯出口',show:true}];
 marks.forEach(m=>{if(!m.show)return;ctx.beginPath();ctx.ellipse(m.x,m.y,23,9,0,0,Math.PI*2);ctx.strokeStyle='#63d5c3';ctx.lineWidth=2;ctx.stroke();tag(ctx,m.x,m.y+35,m.text,'#213c40','#ceeee4',15);});
 if(g.lift==='open'){ctx.fillStyle='rgba(63,243,211,.13)';ctx.fillRect(1436,630,100,125);}
 const entities=[...g.npcs,{...g.player,id:'player'}].sort((a,b)=>a.y-b.y);
 for(const n of entities){const player=n.id==='player';const moving=player?g.player.moving:g.phase==='playing';const bob=moving?Math.sin(player?g.player.step:clock*5+n.x)*1.5:0;ctx.save();ctx.translate(n.x,n.y);ctx.fillStyle='rgba(26,35,41,.19)';ctx.beginPath();ctx.ellipse(0,0,17,6,0,0,Math.PI*2);ctx.fill();
 if(player){ctx.strokeStyle=g.cover>0?'#8ef0e1':g.hidden?'#85cb9e':'#ffda84';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,22,8,0,0,Math.PI*2);ctx.stroke();}
 const seated=player&&g.hidden;const flip=seated?1:player?n.face:(Math.cos(n.angle)>=0?1:-1);ctx.scale(flip,1);
 const size=seated?105:player?111:112;ctx.drawImage(imgs[seated?'player-seated':n.id],-size/2,-size+(seated?-12:8)+bob,size,size);ctx.restore();
 if(player){tag(ctx,n.x,n.y-112,g.hidden?'正在假装工作':g.cover>0?`送材料 ${Math.ceil(g.cover)}s`:'你','#f4d28b','#27343a',15);}
 else if(n.id==='supervisor'||n.id==='boss'){tag(ctx,n.x,n.y-110,labels[n.id],n.id==='supervisor'?'#a14f42':'#35444e','#fff3df',14);}
 }
 const p=near(g);if(p&&g.phase==='playing'){tag(ctx,g.player.x,g.player.y+66,`E  ${p.label}`,'#fff0d4','#253841',18);}
 if(g.hidden){ctx.font='20px monospace';ctx.fillStyle='#73dfbc';ctx.fillText('…',g.player.x+25,g.player.y-65);}
}
export function App(){
 const game=useRef(createGame()),canvas=useRef(null),stage=useRef(null),keys=useRef(new Set()),stick=useRef({x:0,y:0}),imgs=useRef({}),lastPhase=useRef('intro'),muted=useRef(false);
 const [ui,setUi]=useState({...game.current}),[loaded,setLoaded]=useState(false),[error,setError]=useState(false),[sound,setSound]=useState(false),[help,setHelp]=useState(false),[joy,setJoy]=useState({x:0,y:0});
 const [best,setBest]=useState(()=>{try{return Number(localStorage.getItem('clockout-three-level-best'))||0;}catch{return 0;}});
 function update(){setUi({...game.current,player:{...game.current.player}});}
 function doAction(fn){fn(game.current);if(!muted.current)tone();update();}
 function loadGame(g,begin=false){if(!g)return;game.current=g;if(begin)start(g);lastPhase.current=g.phase;keys.current.clear();stick.current={x:0,y:0};setJoy({x:0,y:0});setHelp(false);if(!muted.current)tone(620);update();}
 function restart(){loadGame(retryLevel(game.current),true);}
 function advanceLevel(){loadGame(nextLevel(game.current));}
 function pause(){const g=game.current;if(g.phase==='playing')g.phase='paused';else if(g.phase==='paused')g.phase='playing';keys.current.clear();stick.current={x:0,y:0};setJoy({x:0,y:0});update();}
 useEffect(()=>{let active=true;Promise.all(ASSETS.map(n=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{imgs.current[n]=im;resolve();};im.onerror=reject;im.src=assetUrl(n);}))).then(()=>active&&setLoaded(true)).catch(()=>active&&setError(true));return()=>{active=false;};},[]);
 useEffect(()=>{muted.current=!sound;},[sound]);
 useEffect(()=>{
  function down(e){if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Escape','w','a','s','d','e','W','A','S','D','E'].includes(e.key)){e.preventDefault();}
   if(e.repeat)return;const k=e.key.toLowerCase();keys.current.add(k);
   if(k==='e')doAction(interact);if(k===' ')doAction(useFile);if(k==='escape')pause();
  }
  function up(e){keys.current.delete(e.key.toLowerCase());}
  function blur(){keys.current.clear();stick.current={x:0,y:0};setJoy({x:0,y:0});if(game.current.phase==='playing'){game.current.phase='paused';update();}}
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',blur);
  return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',blur);};
 },[]);
 useEffect(()=>{
  if(!loaded)return;let raf,prev=performance.now(),lastUi=0;const ctx=canvas.current.getContext('2d');
  function frame(now){const dt=(now-prev)/1000;prev=now;const k=keys.current;const dx=(k.has('d')||k.has('arrowright')?1:0)-(k.has('a')||k.has('arrowleft')?1:0)+stick.current.x,dy=(k.has('s')||k.has('arrowdown')?1:0)-(k.has('w')||k.has('arrowup')?1:0)+stick.current.y;
   const g=game.current;tick(g,dt,{x:dx,y:dy});draw(ctx,g,imgs.current,now/1000);
   if(stage.current){const el=stage.current,c=canvas.current;const ratio=el.clientWidth/el.clientHeight;const width=ratio<W/H?el.clientHeight*W/H:el.clientWidth;const offset=Math.max(el.clientWidth-width,Math.min(0,el.clientWidth/2-g.player.x/W*width));c.style.width=`${width}px`;c.style.height=`${width*H/W}px`;c.style.transform=`translateX(${offset}px)`;}
   if(lastPhase.current!==g.phase){if(g.phase==='won'){const t=Number(totalTime(g).toFixed(1));if(g.level===LEVELS.length)setBest(old=>{const b=old===0||t<old?t:old;try{localStorage.setItem('clockout-three-level-best',String(b));}catch{}return b;});if(!muted.current)tone(880);}else if(g.phase==='lost'&&!muted.current)tone(220);lastPhase.current=g.phase;}
   if(now-lastUi>70){lastUi=now;update();}raf=requestAnimationFrame(frame);
  }raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf);
 },[loaded]);
 function joystick(e){const el=e.currentTarget,box=el.getBoundingClientRect();const x=e.clientX-box.left-box.width/2,y=e.clientY-box.top-box.height/2,r=box.width*.31,d=Math.hypot(x,y),s=Math.min(1,r/(d||1));stick.current={x:x*s/r,y:y*s/r};setJoy({x:x*s,y:y*s});}
 function release(){stick.current={x:0,y:0};setJoy({x:0,y:0});}
 const context=near(ui),playing=ui.phase==='playing',danger=ui.suspicion>60,finalLevel=ui.level===LEVELS.length;
 return <main className="app">
  <header className="topbar"><div className="brand"><span className="edition">下班行动 / 第 {ui.level} 关 · {ui.config.name}</span><h1>准点下班，<em>别被发现</em></h1></div><div className="toolbar"><div className="time-label"><span>FRIDAY</span><b>周五 18:00</b></div><button className="quiet" onClick={()=>setSound(v=>!v)} aria-label={sound?'关闭音效':'开启音效'}>{sound?'音效 开':'音效 关'}</button><button className="quiet" onClick={()=>{if(playing)pause();setHelp(true);}}>玩法</button></div></header>
  <section className={`game-shell ${danger?'danger':''}`} aria-label="办公室潜行游戏">
   <div className="statusbar"><div className="objective"><span className="status-dot"/><div><b>{ui.lift==='open'?'电梯到了，快进去！':ui.lift==='calling'?'等待电梯，留意身后':`第 ${ui.level} / 3 关：${ui.config.name}`}</b><small>{ui.lift==='idle'?`从右下角电梯离开 · 等待 ${ui.config.liftWait} 秒`:'靠近电梯门，按 E 进入'}</small></div></div><div className="suspicion"><div><span>{ui.hidden?'伪装中':ui.cover>0?'送材料中':danger?'已被发现':'巡逻视线'}</span><b>{danger?'暴露':ui.hidden||ui.cover>0?'伪装':'安全'}</b></div><div className="meter"><i style={{width:`${danger||ui.hidden?100:ui.cover>0?ui.cover/6*100:0}%`,background:danger?'#ed7964':'#80d6ba'}}/></div></div><div className="countdown"><span>剩余</span><b>{Math.ceil(ui.time).toString().padStart(2,'0')}<small>s</small></b><button onClick={pause} disabled={!['playing','paused'].includes(ui.phase)} aria-label={ui.phase==='paused'?'继续游戏':'暂停游戏'}>{ui.phase==='paused'?'继续':'暂停'}</button></div></div>
   <div className="stage" ref={stage}><canvas width={W} height={H} ref={canvas} aria-label="用 WASD 移动，E 互动，空格使用文件夹" />
    {!loaded&&<div className="loading"><b>{error?'场景加载失败':'正在准备下班…'}</b><p>{error?'请刷新页面重试':'办公室就绪后就出发'}</p>{error&&<button onClick={()=>location.reload()}>重新加载</button>}</div>}
    {loaded&&ui.eventTimer>0&&playing&&<div className="event-banner">{ui.eventText}</div>}
    {loaded&&ui.toastTimer>0&&playing&&<div className="toast" role="status">{ui.toast}</div>}
    {loaded&&(ui.phase!=='playing'||help)&&<div className="overlay"><section className={`dialog ${ui.phase==='won'?'success':''}`} aria-label="游戏提示">
     <div className="level-progress" aria-label={`三关进度：当前第 ${ui.level} 关`}>{LEVELS.map(l=><span key={l.id} className={l.id<ui.level?'complete':l.id===ui.level?'current':''}><i>{l.id<ui.level?'✓':l.id}</i>{l.name}</span>)}</div>
     {help?<><span className="eyebrow">下班小抄</span><h2>走得巧，准点跑。</h2><ol className="instructions"><li><b>绕开黄色视野</b><span>桌子和隔板能挡视线。没有伪装保护时，被看见就立即失败。</span></li><li><b>用好工位和文件夹</b><span>右侧空工位按 E 伪装；文件夹须在进入视野前按空格使用。</span></li><li><b>电梯到了才算下班</b><span>右下角按 E 呼叫电梯，本关等 {ui.config.liftWait} 秒，再按 E 进入。</span></li></ol><button className="primary" onClick={()=>{setHelp(false);if(game.current.phase==='paused')game.current.phase='playing';update();}}>明白了</button></>:
     ui.phase==='intro'?<><span className="eyebrow">第 {ui.level} 关 / 共 3 关</span><h2>{ui.config.name}</h2><p>{ui.config.description}</p><div className="brief"><span><b>{ui.config.time} 秒</b>限时离开</span><span><b>{ui.config.liftWait} 秒</b>电梯等待</span></div><button className="primary" onClick={()=>doAction(start)}>开始第 {ui.level} 关 <span>→</span></button><small className="dialog-hint">被发现立即失败 · WASD 移动 · E 互动 · 空格伪装</small></>:
     ui.phase==='paused'?<><span className="eyebrow">深呼吸，先观察一下。</span><h2>行动暂停</h2><p>老板也暂时按下了暂停键。</p><button className="primary" onClick={pause}>继续下班</button><button className="text-button" onClick={restart}>重试第 {ui.level} 关</button></>:
     ui.phase==='won'?<><span className="eyebrow">{finalLevel?'三关全通 · 下班成功':`第 ${ui.level} 关完成 · ${ui.config.name}`}</span><h2>{finalLevel?<>终于，<em>自由了。</em></>:'这一关，顺利脱身。'}</h2><p>{finalLevel?'连续突破三道巡查，周末属于你。':`接下来：${LEVELS[ui.level].name}。${LEVELS[ui.level].hint}`}</p><div className="score"><b>{(finalLevel?totalTime(ui):ui.elapsed).toFixed(1)}<small>秒</small></b><span>{finalLevel?'三关通关总用时':'本关通关用时'}</span></div>{finalLevel&&<p className="record">三关最快 {best.toFixed(1)} 秒</p>}<button className="primary" onClick={finalLevel?()=>loadGame(createGame()):advanceLevel}>{finalLevel?'从第一关再挑战':`进入第 ${ui.level+1} 关 →`}</button></>:
     <><span className="eyebrow">第 {ui.level} 关 · 下班任务失败</span><h2>{ui.caughtBy?'被发现了，下班失败。':'这会，真不止五分钟。'}</h2><p>{ui.message}</p><button className="primary" onClick={restart}>重试第 {ui.level} 关</button></>}
    </section></div>}
   </div>
   <footer className="controls"><div className="keyboard-guide"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 移动</span><span><kbd>E</kbd> 互动</span><span><kbd>空格</kbd> 使用文件</span></div><div className="mobile-stick" aria-label="移动摇杆" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);joystick(e);}} onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))joystick(e);}} onPointerUp={release} onPointerCancel={release}><span style={{transform:`translate(${joy.x}px,${joy.y}px)`}}/></div><div className="action-buttons"><button className={`item ${ui.file?'has-item':''}`} disabled={!playing||!ui.file} onClick={()=>doAction(useFile)}><span>{ui.file?'文件夹 × 1':'空手'}</span><small>{ui.file?'使用 · 空格':'打印区可拾取'}</small></button><button className="interact" disabled={!playing||!context||ui.lift==='calling'&&context.id==='lift'} onClick={()=>doAction(interact)}><kbd>E</kbd>{context?.label||'靠近物体互动'}</button></div></footer>
  </section>
  <div className="bottom-note"><span>工作已完成，下班理直气壮。</span><span className="desktop-only">躲开视线 · 临场应变 · 准点回家</span><span className="mobile-only">横屏视野更开阔</span></div>
 </main>;
}
