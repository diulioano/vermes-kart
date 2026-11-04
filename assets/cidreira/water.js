import { shoreline, waveEdge, WORLD_SIZE } from './track.js';

export function buildWater(T, group) {
  const tile=document.createElement('canvas');tile.width=tile.height=128;
  const ctx=tile.getContext('2d');ctx.fillStyle='#177fae';ctx.fillRect(0,0,128,128);
  for(let j=0;j<65;j++){
    ctx.fillStyle=j%3?'#208bb7':'#2b97be';
    ctx.fillRect((j*37)%128,(j*53)%128,4+j%9,1+j%2);
  }
  const texture=new T.CanvasTexture(tile);texture.colorSpace=T.SRGBColorSpace;
  texture.magFilter=T.NearestFilter;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(140,140);
  const sea=new T.Mesh(new T.PlaneGeometry(40000,40000),new T.MeshBasicMaterial({map:texture}));
  sea.name='mar';sea.rotation.x=-Math.PI/2;sea.position.set(WORLD_SIZE/2,-6,WORLD_SIZE/2);group.add(sea);
  const detail=document.createElement('canvas');detail.width=detail.height=128;
  const paint=detail.getContext('2d');paint.fillStyle='#eaf4f3';paint.fillRect(0,0,128,128);
  for(let j=0;j<30;j++){
    paint.fillStyle=j%2?'#ffffff':'#d7eae8';paint.fillRect(j*43%128,j*71%128,8+j%13,1);
  }
  const shimmer=new T.CanvasTexture(detail);shimmer.colorSpace=T.SRGBColorSpace;
  shimmer.magFilter=T.NearestFilter;shimmer.wrapS=shimmer.wrapT=T.RepeatWrapping;
  const rows=Math.ceil(WORLD_SIZE/16), bands=[];
  for(const color of ['#299ebc','#51b7c7','#8ed2d3','#edf5df']){
    const geometry=new T.BufferGeometry(),positions=new Float32Array((rows+1)*6),indices=[];
    geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    geometry.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array((rows+1)*4),2));
    for(let j=1;j<=rows;j++){const a=j*2;indices.push(a-2,a-1,a,a-1,a+1,a);}
    geometry.setIndex(indices);
    const m=new T.Mesh(geometry,new T.MeshBasicMaterial({color,map:bands.length<3?shimmer:null,side:T.DoubleSide}));
    m.frustumCulled=false;group.add(m);bands.push(m);
  }
  function update(time){
    texture.offset.set(time*.008,time*.003);
    shimmer.offset.set(time*.03,time*.009);
    for(let j=0;j<=rows;j++){
      const y=j*16,coast=shoreline(y),beach=y>=3240&&y<=3750;
      const edge=beach?waveEdge(y,time):coast+10+Math.sin(time*1.1-y*.003)*14;
      const foam=4+2*Math.sin(y*.13+time*2),level=beach?1.15:-3;
      const boundaries=[coast+380,coast+160,edge+32,edge+foam,edge];
      for(let b=0;b<bands.length;b++){
        const attr=bands[b].geometry.attributes.position;
        attr.setXYZ(j*2,boundaries[b],level+b*.025,y);
        attr.setXYZ(j*2+1,boundaries[b+1],level+b*.025,y);
        const uv=bands[b].geometry.attributes.uv;
        uv.setXY(j*2,boundaries[b]/180,y/180);
        uv.setXY(j*2+1,boundaries[b+1]/180,y/180);
      }
    }
    for(const band of bands){band.geometry.attributes.position.needsUpdate=true;band.geometry.attributes.uv.needsUpdate=true;}
  }
  sea.onBeforeRender=()=>update(performance.now()/1000);
  update(0);return {sea,update};
}
