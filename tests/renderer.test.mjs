import test from 'node:test';
import assert from 'node:assert/strict';
import { LabRenderer } from '../dist/renderer.mjs';

test('reduced-motion celebration keeps rings stationary across frames', () => {
  function ringsAt(time) {
    const rings=[];
    const context={save(){},restore(){},beginPath(){},stroke(){},fillText(){},ellipse(...values){rings.push(values);}};
    LabRenderer.prototype.drawCelebration.call({ctx:context,reduced:true,celebrationStarted:0,pose:{x:0,y:0},particles:[],project:()=>({x:100,y:100}),glow(){}},time);
    return rings;
  }
  assert.deepEqual(ringsAt(100),ringsAt(900));
});
