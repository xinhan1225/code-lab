import test from 'node:test';
import assert from 'node:assert/strict';
import { LabRenderer, robotMotion } from '../dist/renderer.mjs';
import { getLevelInfo } from '../dist/core.mjs';
import { LEVELS } from '../dist/levels.mjs';

test('isometric tiles cover every map and share complete edges with both neighbours', () => {
  const renderer=Object.create(LabRenderer.prototype);
  Object.assign(renderer,{ox:240,oy:60,tw:64,th:32});
  renderer.polygon=points=>{renderer.points=points;};
  function tile(x,y,z=0,inset=0){
    renderer.diamond(x,y,z,inset);
    return renderer.points;
  }
  assert.deepEqual(tile(0,0),[{x:240,y:44},{x:272,y:60},{x:240,y:76},{x:208,y:60}]);
  assert.deepEqual(tile(2,3,4,.1),[renderer.project(1.6,2.6,4),renderer.project(2.4,2.6,4),renderer.project(2.4,3.4,4),renderer.project(1.6,3.4,4)]);
  for(const level of LEVELS){
    const {width,height}=getLevelInfo(level);
    let area=0;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const points=tile(x,y);
      area+=Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%4];return sum+p.x*q.y-q.x*p.y;},0))/2;
      if(x+1<width){const next=tile(x+1,y);assert.deepEqual([points[1],points[2]],[next[0],next[3]]);}
      if(y+1<height){const next=tile(x,y+1);assert.deepEqual([points[2],points[3]],[next[1],next[0]]);}
    }
    assert.equal(area,width*height*renderer.tw*renderer.th/2);
  }
});

test('reduced-motion celebration keeps rings stationary across frames', () => {
  function ringsAt(time) {
    const rings=[];
    const context={save(){},restore(){},beginPath(){},stroke(){},fillText(){},ellipse(...values){rings.push(values);}};
    LabRenderer.prototype.drawCelebration.call({ctx:context,reduced:true,celebrationStarted:0,pose:{x:0,y:0},particles:[],project:()=>({x:100,y:100}),glow(){}},time);
    return rings;
  }
  assert.deepEqual(ringsAt(100),ringsAt(900));
});

test('environment motion leaves the default robot still and floats only the robot', () => {
  assert.deepEqual(robotMotion(false,false,350,false),{x:0,y:0,tilt:0,wave:0});
  const start=robotMotion(true,false,0,false),later=robotMotion(true,false,800,false);
  assert.ok(start.y<0&&later.y<0);
  assert.notEqual(start.y,later.y);
  assert.equal(later.x,0);
  assert.equal(later.tilt,0);
});

test('dance bobs, tilts and waves; reduced motion keeps a static happy pose', () => {
  const start=robotMotion(false,true,0,false),later=robotMotion(false,true,220,false);
  assert.ok(later.y<0);
  assert.notEqual(start.tilt,later.tilt);
  assert.notEqual(start.wave,later.wave);
  for(const floating of [false,true]){
    assert.deepEqual(robotMotion(floating,true,0,true),robotMotion(floating,true,900,true));
    assert.equal(robotMotion(floating,true,900,true).tilt,0);
  }
});
