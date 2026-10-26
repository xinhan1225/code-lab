import { getLevelInfo } from './core.mjs';

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
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  setScene(level, state, duration = 240) {
    const changed = this.level !== level;
    this.from = changed || !this.pose ? { x: state.x, y: state.y } : { ...this.pose };
    this.level = level;
    this.state = state;
    this.started = performance.now();
    this.duration = this.reduced ? 1 : duration;
    this.canvas.setAttribute('aria-label', `实验 ${level.id}：${level.name}。机器人在第 ${state.x + 1} 列、第 ${state.y + 1} 行，朝${['北', '东', '南', '西'][state.dir]}。已收集 ${state.collected.length} / ${getLevelInfo(level).batteries.length} 块能量。${state.won ? '已到达出口并完成实验。' : ''}`);
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
    this.polygon([this.project(x, y-k, z), this.project(x+k, y, z), this.project(x, y+k, z), this.project(x-k, y, z)], fill, stroke, lineWidth);
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
    if (!width || !height) return;
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
    const bottom = p => ({x:p.x,y:p.y+19});
    c.save();c.shadowColor='#000b';c.shadowBlur=24;c.shadowOffsetY=17;
    this.polygon(corners,'#13272c','#31514f');c.restore();
    this.polygon([corners[1],corners[2],bottom(corners[2]),bottom(corners[1])],'#0b1a20','#2c4249');
    this.polygon([corners[2],corners[3],bottom(corners[3]),bottom(corners[2])],'#0d2025','#304b50');
    for(let i=0;i<info.width;i+=2){const p=this.project(i,info.height-.31,-10);c.fillStyle=i%4===0?'#80cfb3':'#c7a457';c.fillRect(p.x-3,p.y,7,2);}
    for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
      const shade=(x+y)%2===0?'#1c3035':'#1a2d32';
      this.diamond(x,y,0,.018,shade,'#385057',.65);
      if((x*3+y)%5===0){const p=this.project(x,y,0);c.fillStyle='#4d696848';c.fillRect(p.x-1,p.y-1,2,1);}
    }
    const exit = this.project(info.exit.x,info.exit.y);
    this.glow(exit.x,exit.y,45+10*pulse,'#84e8bf24');
    this.diamond(info.exit.x,info.exit.y,1,.06,'#234d43','#70d5b0',1.5);
    this.diamond(info.exit.x,info.exit.y,3,.13,'#2c7b60','#a3f3d2',2);
    this.diamond(info.exit.x,info.exit.y,4,.28,'#b1f5d6','#d1ffe8',1);
    const trail = this.project(info.start.x,info.start.y,1);
    c.fillStyle='#8fb9ad';c.font=`${Math.max(6,this.tw*.13)}px Consolas`;c.textAlign='center';c.fillText('START',trail.x,trail.y+this.th*.24);
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
        this.diamond(o.x+.18,o.y+.18,0,.03,'#08151a88');
        this.box(o.x,o.y,1,.43,this.tw*.43,['#405158','#20333c','#2b3e46'],'#637272');
        const mark=this.project(o.x+.45,o.y+.18,this.tw*.16);
        if((o.x+o.y)%4===0){c.fillStyle='#8eaa964f';c.fillRect(mark.x-2,mark.y,4,2);}
      } else if(o.type==='battery'){
        const bob=this.reduced?0:Math.sin(time/550+o.x+o.y)*2.4;
        this.glow(p.x,p.y-12,this.tw*.7,'#e9b74a20');
        this.diamond(o.x,o.y,1,.22,'#ba963c28');
        const z=13+bob;
        this.box(o.x,o.y,z,.17,this.tw*.24,['#ffe39a','#dfa332','#b97b23'],'#fff1ac');
        const b=this.project(o.x,o.y,z+this.tw*.08);
        c.save();c.shadowColor='#ffd464';c.shadowBlur=9;c.fillStyle='#fff4c3';c.font=`bold ${Math.max(10,this.tw*.22)}px Consolas`;c.textAlign='center';c.fillText('ϟ',b.x,b.y-1);c.restore();
      } else this.robot(p.x,p.y,this.tw,time,pulse);
    }
    const flag = this.project(info.exit.x,info.exit.y,this.tw*.68);
    c.save();c.strokeStyle='#91e7c788';c.setLineDash([2,3]);c.beginPath();c.moveTo(exit.x,exit.y-5);c.lineTo(flag.x,flag.y+8);c.stroke();c.setLineDash([]);
    c.fillStyle='#153e35';c.strokeStyle='#80cdb1';c.lineWidth=.8;c.beginPath();c.roundRect(flag.x-21,flag.y-10,42,17,3);c.fill();c.stroke();c.font='8px Consolas';c.fillStyle='#b6f6d8';c.textAlign='center';c.fillText(state.won?'CLEAR':'EXIT ↗',flag.x,flag.y+1);c.restore();
    // Small registration marks give the scene the feel of a live laboratory feed.
    c.strokeStyle='#345751';c.lineWidth=1;
    [[15,31,1,1],[width-15,31,-1,1],[15,height-40,1,-1],[width-15,height-40,-1,-1]].forEach(([x,y,dx,dy])=>{c.beginPath();c.moveTo(x+dx*8,y);c.lineTo(x,y);c.lineTo(x,y+dy*8);c.stroke();});
  }
  robot(x,y,tw,time,pulse){
    const c=this.ctx,s=tw/64,state=this.state;
    c.save();c.translate(x,y);c.scale(s,s);
    c.fillStyle='#0007';c.beginPath();c.ellipse(2,2,17,7,0,0,Math.PI*2);c.fill();
    c.strokeStyle=state.status==='error'?'#de9482':'#80cdb1';c.lineWidth=1;c.beginPath();c.ellipse(0,2,18,8,0,0,Math.PI*2);c.stroke();
    const vectors=[[.7,-.4],[.7,.4],[-.7,.4],[-.7,-.4]],v=vectors[state.dir];
    c.save();c.translate(v[0]*29,v[1]*29);c.rotate(Math.atan2(v[1],v[0]));c.fillStyle='#92d6bf';c.beginPath();c.moveTo(6,0);c.lineTo(-4,-4);c.lineTo(-1,0);c.lineTo(-4,4);c.closePath();c.fill();c.restore();
    c.fillStyle='#647d7b';c.beginPath();c.roundRect(-12,-9,8,13,3);c.roundRect(6,-7,8,13,3);c.fill();
    c.fillStyle='#8aa39d';c.beginPath();c.roundRect(-11,-22,23,24,6);c.fill();
    c.fillStyle='#d9e1ce';c.beginPath();c.roundRect(-13,-27,24,25,7);c.fill();
    c.fillStyle='#acbeb3';c.fillRect(-6,-13,12,6);c.fillStyle='#4d6f66';c.fillRect(-2,-11,4,2);
    c.fillStyle='#6e8d88';c.fillRect(-17,-25,5,16);c.fillRect(11,-23,5,15);
    c.save();c.rotate(-.07);c.fillStyle='#a7bab0';c.beginPath();c.roundRect(-17,-47,35,25,8);c.fill();
    c.fillStyle='#e1e6d6';c.beginPath();c.roundRect(-18,-48,32,23,7);c.fill();
    c.fillStyle='#153b36';c.beginPath();c.roundRect(-13,-43,23,13,4);c.fill();
    c.shadowColor=state.status==='error'?'#ff9d84':'#9affe0';c.shadowBlur=7;c.fillStyle=state.status==='error'?'#eead8b':'#a8f7d5';c.beginPath();c.roundRect(-8,-40,4,7,2);c.roundRect(2,-40,4,7,2);c.fill();c.shadowBlur=0;
    c.strokeStyle='#9abbb0';c.lineWidth=2;c.beginPath();c.moveTo(-2,-48);c.lineTo(-2,-55);c.stroke();this.glow(-2,-58,9,'#9ae6ca55');c.fillStyle=state.status==='error'?'#eeb994':'#aff5d4';c.beginPath();c.arc(-2,-58,2.7+.25*pulse,0,Math.PI*2);c.fill();c.restore();
    c.restore();
  }
}
