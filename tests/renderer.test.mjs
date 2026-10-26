import test from 'node:test';
import assert from 'node:assert/strict';
import { LabRenderer, robotMotion } from '../dist/renderer.mjs';

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
