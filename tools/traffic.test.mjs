import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCidreiraTrack} from '../assets/cidreira/track.js';
import {createTraffic} from '../assets/cidreira/traffic.js';

test('each kind traverses both lanes, waits on shoulders and turns around',()=>{
  const traffic=createTraffic(createCidreiraTrack());
  const spans=traffic.actors.map(()=>({min:Infinity,max:-Infinity,waiting:false}));
  for(let i=0;i<2400;i++){
    traffic.update(.025,[]);
    traffic.actors.forEach((a,j)=>{
      const s=spans[j];s.min=Math.min(s.min,a.offset);s.max=Math.max(s.max,a.offset);
      if(!a.walking&&Math.abs(a.offset)>83)s.waiting=true;
    });
  }
  assert.ok(spans.every(s=>s.min < -100&&s.max>100&&s.waiting));
});

for(const kind of ['policial','caranguejo','camarao'])test(`${kind}: ground collision, cooldown and airborne clearance`,()=>{
  const traffic=createTraffic(createCidreiraTrack());
  const a=traffic.actors.find(a=>a.kind===kind);
  for(let i=0;i<1000&&!(a.walking&&Math.abs(a.offset)<15);i++)traffic.update(.025,[]);
  assert.ok(a.walking&&Math.abs(a.offset)<15);
  const hits=[];
  const k={x:a.x,y:a.y,altura:a.height+100,girando:0,rodar(...args){hits.push(args);}};
  traffic.update(.01,[k]);assert.equal(hits.length,0);
  k.altura=a.height;traffic.update(.01,[k]);assert.equal(hits.length,1);
  traffic.update(.01,[k]);assert.equal(hits.length,1);
  assert.ok(hits[0][0]>0&&hits[0][0]<1);
  traffic.reset();assert.equal(a.pause,a.initialPause);assert.equal(a.walkTime,0);
});
