import { getLevelInfo } from './core.mjs';

const ENVIRONMENTS = ['starfield','blueprint','hologram','zero-gravity','dance-mode','scan-mode','mirror-world','night-shift','party-mode'];

export function robotMotion(floating, dancing, time, reduced) {
  const beat = reduced ? 0 : Math.sin(time / 180);
  return {
    x: dancing ? beat * 2.5 : 0,
    y: (floating ? -15 + (reduced ? 0 : Math.sin(time / 650) * 6) : 0) - (dancing ? Math.abs(beat) * 6 : 0),
    tilt: dancing ? beat * .1 : 0,
    wave: dancing ? .7 + beat * .35 : 0
  };
}

export class LabRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.level = null;
    this.state = null;
    this.pose = null;
    this.from = null;
    this.started = 0;
    this.duration = 240;
    this.celebrationStarted = null;
    this.particles = [];
    const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
    this.reduced = motionPreference.matches;
    motionPreference.addEventListener('change', event => {
      this.reduced = event.matches;
      if (this.reduced) { this.particles = []; this.duration = 1; }
    });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
    const frame = time => {
      if (this.level && !document.hidden) this.draw(time);
      this.frame = requestAnimationFrame(frame);
    };
    this.frame = requestAnimationFrame(frame);
  }
  resize() {
    const box = this.canvas.getBoundingClientRect();
    this.width = box.width;
    this.height = box.height;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(box.width * dpr);
    this.canvas.height = Math.round(box.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  celebrate() {
    this.celebrationStarted = performance.now();
    this.canvas.dataset.celebrating = 'true';
    this.particles = this.reduced ? [] : Array.from({length:60},(_,i)=>({vx:(Math.random()-.5)*150,vy:-70-Math.random()*100,delay:Math.random()*.25,color:['#7e9c70','#cfb367','#a1b3b1','#c9a58b'][i%4],size:2+Math.random()*3,rotation:Math.random()*6}));
  }
  clearCelebration() {
    this.celebrationStarted = null;
    this.particles = [];
    this.canvas.dataset.celebrating = 'false';
  }
  setScene(level, state, duration = 240) {
    const changed = this.level !== level;
    this.from = changed || !this.pose ? { x: state.x, y: state.y } : { ...this.pose };
    this.level = level;
    this.state = state;
    this.started = performance.now();
    this.duration = this.reduced ? 1 : duration;
  }
  project(x, y, z = 0) { return { x: this.ox + (x - y) * this.tw / 2, y: this.oy + (x + y) * this.th / 2 - z }; }
  polygon(points, fill, stroke, lineWidth = 1) {
    const c = this.ctx;
    c.beginPath();
    points.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y));
    c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lineWidth; c.stroke(); }
  }
  diamond(x, y, z, inset, fill, stroke, lineWidth) {
    const k = .5 - inset;
    this.polygon([this.project(x-k, y-k, z), this.project(x+k, y-k, z), this.project(x+k, y+k, z), this.project(x-k, y+k, z)], fill, stroke, lineWidth);
  }
  box(x, y, z, size, height, colors, stroke = '#455b60') {
    const a = this.project(x-size, y-size, z), b = this.project(x+size, y-size, z), d = this.project(x-size, y+size, z), e = this.project(x+size, y+size, z);
    const top = p => ({ x:p.x, y:p.y-height });
    this.polygon([d,e,top(e),top(d)], colors[1], stroke, .65);
    this.polygon([b,e,top(e),top(b)], colors[2], stroke, .65);
    this.polygon([top(a),top(b),top(e),top(d)], colors[0], stroke, .65);
  }
  glow(x, y, radius, color) {
    const c = this.ctx, g = c.createRadialGradient(x,y,0,x,y,radius);
    g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-radius,y-radius,radius*2,radius*2);
  }
  draw(time) {
    const c = this.ctx, {width,height} = this, level = this.level, state = this.state, info = getLevelInfo(level);
    const classes = document.body.classList;
    this.darkScene = classes.contains('mode-web') && ['starfield','blueprint','night-shift','party-mode'].some(name => classes.contains(name));
    const palette = this.darkScene
      ? {board:'#2d3539',edge:'#171f24',side:'#222b30',line:'#596367',tile:'#3c4649',alternate:'#394246',wall:['#788487','#59666b','#647277'],exit:'#346950',ink:'#bfc8c3',exitInk:'#d9f2df'}
      : {board:'#dbdad1',edge:'#b8b9b1',side:'#c9cac1',line:'#c8cbc5',tile:'#f5f3e9',alternate:'#eeeee5',wall:['#c7cfcd','#9ca9a7','#b0bcb8'],exit:'#356b50',ink:'#68776f',exitInk:'#e3f0dc'};
    this.canvas.dataset.environment = classes.contains('mode-web') ? ENVIRONMENTS.filter(name=>classes.contains(name)).join(' ') : '';
    if (!width || !height) return;
    if(this.celebrationStarted!==null&&time-this.celebrationStarted>3200)this.clearCelebration();
    c.clearRect(0,0,width,height);
    const span = info.width + info.height;
    this.tw = Math.min((width-48)*2/span,(height-98)*3.4/span,74);
    this.th = this.tw*.5;
    this.ox = width/2-(info.width-info.height)*this.tw/4;
    this.oy = (height-span*this.th/2)/2+31;
    const eased = Math.min(1,(time-this.started)/this.duration);
    const t = eased*eased*(3-2*eased);
    this.pose = {x:this.from.x+(state.x-this.from.x)*t,y:this.from.y+(state.y-this.from.y)*t};
    const pulse = this.reduced ? .5 : (Math.sin(time/850)+1)/2;

    // The board is a single native canvas scene, so the robot can move between tiles.
    const corners = [this.project(-.65,-.65,-2),this.project(info.width-.35,-.65,-2),this.project(info.width-.35,info.height-.35,-2),this.project(-.65,info.height-.35,-2)];
    const bottom = p => ({x:p.x,y:p.y+13});
    c.save();c.shadowColor=this.darkScene?'#0004':'#33432a1c';c.shadowBlur=14;c.shadowOffsetY=10;
    this.polygon(corners,palette.board,palette.line);c.restore();
    this.polygon([corners[1],corners[2],bottom(corners[2]),bottom(corners[1])],palette.edge,palette.line);
    this.polygon([corners[2],corners[3],bottom(corners[3]),bottom(corners[2])],palette.side,palette.line);
    for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
      const shade=(x+y)%2===0?palette.tile:palette.alternate;
      this.diamond(x,y,0,.008,shade,palette.line,.7);
    }
    const exit = this.project(info.exit.x,info.exit.y);
    this.diamond(info.exit.x,info.exit.y,1,.018,palette.exit,palette.exit,1);
    this.diamond(info.exit.x,info.exit.y,1.5,.095,null,palette.exitInk,1.2);
    c.fillStyle=palette.exitInk;c.font=`bold ${Math.max(7,this.tw*.14)}px Consolas`;c.textAlign='center';c.fillText(state.won?'CLEAR':'EXIT',exit.x,exit.y+this.th*.13);
    const trail = this.project(info.start.x,info.start.y,1);
    c.fillStyle=palette.ink;c.font=`${Math.max(6,this.tw*.13)}px Consolas`;c.textAlign='center';c.fillText('START',trail.x,trail.y+this.th*.24);
    c.save();c.fillStyle=palette.ink;c.globalAlpha=.7;c.font=`${Math.max(7,this.tw*.12)}px Consolas`;
    for(let x=0;x<info.width;x++){const p=this.project(x,-.83);c.fillText(String(x+1).padStart(2,'0'),p.x,p.y);}
    for(let y=0;y<info.height;y++){const p=this.project(-.83,y);c.fillText(String.fromCharCode(65+y),p.x,p.y);}
    c.restore();
    const objects=[];
    for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
      if(level.rows[y][x]==='#')objects.push({x,y,type:'wall',depth:x+y});
      if(level.rows[y][x]==='B'&&!state.collected.includes(`${x},${y}`))objects.push({x,y,type:'battery',depth:x+y});
    }
    objects.push({x:this.pose.x,y:this.pose.y,type:'robot',depth:this.pose.x+this.pose.y+.15});
    objects.sort((a,b)=>a.depth-b.depth || a.x-b.x);
    for(const o of objects){
      const p=this.project(o.x,o.y);
      if(o.type==='wall'){
        this.diamond(o.x+.06,o.y+.08,.5,.055,this.darkScene?'#0003':'#59645a1c');
        this.box(o.x,o.y,1,.42,this.tw*.18,palette.wall,palette.line);
      } else if(o.type==='battery'){
        const bob=this.reduced?0:Math.sin(time/550+o.x+o.y)*2.4;
        this.diamond(o.x,o.y,1,.23,'#ba963c28');
        const z=this.tw*.12+bob;
        this.box(o.x,o.y,z,.17,this.tw*.26,['#f0ce7c','#bb8b32','#d3a447'],'#b28b40');
        const b=this.project(o.x,o.y,z+this.tw*.07);
        c.save();c.fillStyle='#fff4c3';c.font=`bold ${Math.max(10,this.tw*.22)}px Consolas`;c.textAlign='center';c.fillText('ϟ',b.x,b.y-1);c.restore();
      } else this.robot(p.x,p.y,this.tw,time,pulse);
    }
    if(this.celebrationStarted!==null)this.drawCelebration(time);

  }
  robot(x,y,tw,time,pulse){
    const c=this.ctx,s=tw/64,state=this.state;
    const classes=document.body.classList,web=classes.contains('mode-web');
    const floating=web&&classes.contains('zero-gravity'),dancing=web&&classes.contains('dance-mode');
    const motion=robotMotion(floating,dancing,time,this.reduced);
    c.save();c.translate(x,y);c.scale(s,s);
    const celebration=this.celebrationStarted===null?0:Math.max(0,1-(time-this.celebrationStarted)/2400);
    c.fillStyle=this.darkScene?'#0004':'#3b4f3133';c.beginPath();c.ellipse(2,2,17,7,0,0,Math.PI*2);c.fill();
    if(floating){c.strokeStyle='#b6a4ff';c.lineWidth=1.3;c.beginPath();c.ellipse(0,2,22,9,0,0,Math.PI*2);c.stroke();this.glow(0,-5,27,'#a991ff25');}
    c.translate(motion.x,motion.y);c.rotate(motion.tilt);
    if(celebration&&!this.reduced)c.translate(0,-Math.abs(Math.sin((time-this.celebrationStarted)/150))*13*celebration);
    c.strokeStyle=state.status==='error'?'#bc7360':this.darkScene?'#9dbb94':'#78936c';c.lineWidth=1;c.beginPath();c.ellipse(0,2,18,8,0,0,Math.PI*2);c.stroke();
    const vectors=[[.7,-.4],[.7,.4],[-.7,.4],[-.7,-.4]],v=vectors[state.dir];
    c.save();c.translate(v[0]*29,v[1]*29);c.rotate(Math.atan2(v[1],v[0]));c.fillStyle=this.darkScene?'#bdd3ad':'#4d7146';c.beginPath();c.moveTo(6,0);c.lineTo(-4,-4);c.lineTo(-1,0);c.lineTo(-4,4);c.closePath();c.fill();c.restore();
    c.fillStyle='#647d7b';c.beginPath();c.roundRect(-12,-9,8,13,3);c.roundRect(6,-7,8,13,3);c.fill();
    c.fillStyle='#8aa39d';c.beginPath();c.roundRect(-11,-22,23,24,6);c.fill();
    c.fillStyle='#d9e1ce';c.beginPath();c.roundRect(-13,-27,24,25,7);c.fill();
    c.fillStyle='#acbeb3';c.fillRect(-6,-13,12,6);c.fillStyle='#4d6f66';c.fillRect(-2,-11,4,2);
    c.fillStyle='#6e8d88';
    if(celebration&&!this.reduced){c.save();c.translate(-14,-23);c.rotate(.7+Math.sin(time/110)*.3);c.fillRect(-3,-14,5,16);c.restore();c.save();c.translate(13,-22);c.rotate(-.7-Math.sin(time/110)*.3);c.fillRect(-2,-14,5,16);c.restore();}
    else if(dancing){c.save();c.translate(-14,-23);c.rotate(motion.wave);c.fillRect(-3,-14,5,16);c.restore();c.save();c.translate(13,-22);c.rotate(-motion.wave);c.fillRect(-2,-14,5,16);c.restore();}
    else{c.fillRect(-17,-25,5,16);c.fillRect(11,-23,5,15);}
    c.save();c.rotate(-.07);c.fillStyle='#a7bab0';c.beginPath();c.roundRect(-17,-47,35,25,8);c.fill();
    c.fillStyle='#e1e6d6';c.beginPath();c.roundRect(-18,-48,32,23,7);c.fill();
    c.fillStyle='#153b36';c.beginPath();c.roundRect(-13,-43,23,13,4);c.fill();
    c.fillStyle=state.status==='error'?'#eead8b':'#a8f7d5';
    if((dancing||celebration)&&state.status!=='error'){c.strokeStyle='#a8f7d5';c.lineWidth=2;c.beginPath();c.arc(-6,-36,2.5,Math.PI,Math.PI*2);c.moveTo(6,-36);c.arc(3.5,-36,2.5,Math.PI,Math.PI*2);c.moveTo(-4,-33);c.quadraticCurveTo(-1,-30,3,-33);c.stroke();}
    else{c.beginPath();c.roundRect(-8,-40,4,7,2);c.roundRect(2,-40,4,7,2);c.fill();}c.shadowBlur=0;
    c.strokeStyle='#839a78';c.lineWidth=2;c.beginPath();c.moveTo(-2,-48);c.lineTo(-2,-55);c.stroke();c.fillStyle=state.status==='error'?'#bc7360':'#709064';c.beginPath();c.arc(-2,-58,2.7+.25*pulse,0,Math.PI*2);c.fill();c.restore();
    c.restore();
  }
  drawCelebration(time){
    const c=this.ctx,elapsed=(time-this.celebrationStarted)/1000,origin=this.project(this.pose.x,this.pose.y),fade=Math.max(0,1-elapsed/3.2);
    c.save();c.globalAlpha=fade;
    c.strokeStyle=this.darkScene?'#aecf9c':'#587f4b';c.lineWidth=1.5;
    for(let i=0;i<3;i++){const phase=((this.reduced ? 0.2 : elapsed*.7)+i/3)%1;c.globalAlpha=fade*(1-phase)*.65;c.beginPath();c.ellipse(origin.x,origin.y,20+phase*72,8+phase*30,0,0,Math.PI*2);c.stroke();}
    for(const p of this.particles){const t=elapsed-p.delay;if(t<0)continue;c.save();c.globalAlpha=fade;c.translate(origin.x+p.vx*t,origin.y-35+p.vy*t+45*t*t);c.rotate(p.rotation+t*4);c.fillStyle=p.color;c.fillRect(-p.size/2,-p.size/2,p.size,p.size*.6);c.restore();}
    c.globalAlpha=fade;c.fillStyle=this.darkScene?'#cce2bb':'#4d7042';c.font='bold 10px Consolas';c.textAlign='center';c.fillText('EXPERIMENT COMPLETE',origin.x,origin.y-85-(this.reduced?0:elapsed*5));c.restore();
  }
}
