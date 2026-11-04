import { scenerySprites } from './sprites.js';
import { buildWater } from './water.js';
import { ROAD_WIDTH, WORLD_SIZE, GROUND_GRID, GROUND_STEP, shoreline } from './track.js';

// Three.js constructors are supplied by the existing bundle: no duplicate engine.
export function buildCidreiraScene(T, scene, track) {
  const group = new T.Group();
  group.name = 'Cidreira'; scene.add(group);
  const colors = new Map();
  const rgb = color => {
    if (!colors.has(color)) { const c = new T.Color(color); colors.set(color, [c.r, c.g, c.b]); }
    return colors.get(color);
  };
  function mesh(vertices, indices, color, vertexColors = null) {
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    if (vertexColors) geometry.setAttribute('color', new T.Float32BufferAttribute(vertexColors, 3));
    if (indices) geometry.setIndex(indices);
    const material = new T.MeshBasicMaterial({ color: vertexColors ? '#ffffff' : color,
      vertexColors: !!vertexColors, side: T.DoubleSide });
    const result = new T.Mesh(geometry, material); group.add(result); return result;
  }
  const boxes = new Map();
  function box(x, y, z, w, h, d, color, rotation = 0) {
    if (!boxes.has(color)) boxes.set(color, []);
    const a = boxes.get(color), cs = Math.cos(rotation), sn = Math.sin(rotation);
    const corners = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]
      .map(([px,py,pz]) => [x + px*w/2*cs - pz*d/2*sn, y + py*h/2, z + px*w/2*sn + pz*d/2*cs]);
    for (const i of [0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,3,7,6,3,6,2,0,4,7,0,7,3,1,2,6,1,6,5]) a.push(...corners[i]);
  }

  // One low-poly terrain mesh. The route cuts the terrain to the exact same
  // elevation that physics samples, keeping wheel contact and landing consistent.
  const resolution = GROUND_GRID, step = GROUND_STEP, heights = track.groundGrid();
  const vertices = [], indices = [], terrainColors = [];
  const terrainHeight = track.ground;
  for (let z = 0; z <= resolution; z++) for (let x = 0; x <= resolution; x++) {
    const px = x * step, py = z * step, height = heights[z * (resolution + 1) + x];
    vertices.push(px, height, py);
    const variation = ((x * 17 + z * 29) % 7) / 7;
    const coast = shoreline(py) - px;
    const base = coast < 0 ? '#36afcf' : coast < 36 ? '#fff0c6' : height > 35 ? '#efd09a' : variation > .5 ? '#e7c48a' : '#edcf9b';
    terrainColors.push(...rgb(base));
    if (x < resolution && z < resolution) {
      const a = z * (resolution + 1) + x;
      indices.push(a, a + resolution + 1, a + 1, a + 1, a + resolution + 1, a + resolution + 2);
    }
  }
  mesh(vertices, indices, null, terrainColors);
  buildWater(T, group);

  // Small repeatable textures are authored in code, like the original track.
  const roadTexture = document.createElement('canvas'); roadTexture.width = roadTexture.height = 128;
  const paint = roadTexture.getContext('2d'); paint.fillStyle = '#dfc38c'; paint.fillRect(0, 0, 128, 128);
  for (let j = 0; j < 180; j++) {
    paint.fillStyle = j % 2 ? '#e7ce9a' : '#d4b87e';
    paint.fillRect((j * 43) % 128, (j * 71) % 128, 2, 2);
  }
  const texture = new T.CanvasTexture(roadTexture); texture.colorSpace = T.SRGBColorSpace;
  texture.magFilter = T.NearestFilter; texture.wrapS = texture.wrapT = T.RepeatWrapping;

  function ribbon(path, width, color, textured = false) {
    const v = [], uv = [], idx = [];
    for (let j = 0; j < path.length; j++) {
      const p = path[j], next = path[Math.min(j + 1, path.length - 1)], prev = path[Math.max(0, j - 1)];
      const dx = next.x - prev.x, dy = next.y - prev.y, len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len * width / 2, ny = dx / len * width / 2;
      v.push(p.x + nx, p.h + .65, p.y + ny, p.x - nx, p.h + .65, p.y - ny);
      uv.push(0, j * .13, 1, j * .13);
      if (j) { const a = j * 2; idx.push(a-2,a-1,a,a-1,a+1,a); }
    }
    const m = mesh(v, idx, color);
    if (textured) { m.geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); m.material.map = texture; m.material.color.set('#ffffff'); }
    return m;
  }

  let run = [], type = null;
  for (let j = 0; j <= track.points.length; j++) {
    const p = track.points[j % track.points.length];
    const nextType = ['centro', 'concha', 'retorno'].includes(p.sector) ? 'asfalto' : p.sector==='rampa' ? 'rampa' : p.sector==='plataforma' ? 'concreto' : p.sector === 'voo' ? 'voo' : 'areia';
    if (nextType !== type || j === track.points.length) {
      if (run.length && type !== 'voo') ribbon([...run, p], ROAD_WIDTH, type === 'asfalto' ? '#555568' : type==='rampa' ? '#aaa99a' : '#bcb8ac', type === 'areia');
      run = []; type = nextType;
    }
    run.push(p);
  }
  for (const route of track.shortcuts) {
    const path = [];
    for (let n = 0; n < route.points.length - 1; n++) {
      const a = route.points[n], b = route.points[n+1];
      for (let j = 0; j < 24; j++) {
        const t = j / 24, u = t*t*(3-2*t);
        path.push({ x: a[0]+(b[0]-a[0])*t, y: a[1]+(b[1]-a[1])*t, h: a[2]+(b[2]-a[2])*u });
      }
    }
    const p = route.points.at(-1); path.push({ x:p[0], y:p[1], h:p[2] });
    // Same height physics uses, including the blend into the main road.
    for (const q of path) q.h = track.shortcutAt(q.x, q.y)?.h ?? q.h;
    ribbon(path, route.width, route.id === 'areia' ? '#ead7a9' : '#dac08c');
  }

  for (let j = 0; j < track.points.length; j++) {
    const p = track.points[j], deck = ['plataforma','rampa'].includes(p.sector);
    if (p.sector === 'voo') continue;
    const rotation = Math.atan2(p.ty, p.tx);

    if (deck && j % 9 === 0) {
      box(p.x,p.h-20,p.y,115,14,ROAD_WIDTH+8,'#969b9c',rotation);
      if (j % 18 === 0) for (const side of [-1,1]) {
        box(p.x-p.ty*side*58,(p.h-10)/2-6,p.y+p.tx*side*58,14,p.h+2,14,'#858d88');
      }
    }
    if (j % 3 === 0 && (deck || ['centro','concha'].includes(p.sector))) {
      for (const side of [-1,1]) {
        const x = p.x-p.ty*(ROAD_WIDTH/2+4)*side, y = p.y+p.tx*(ROAD_WIDTH/2+4)*side;
        if (deck) {
          box(x,p.h+4,y,42,8,9,'#8e938a',rotation);
          box(x,p.h+20,y,42,5,10,'#d5d1ba',rotation);
          for(const along of [-15,0,15]) box(x+p.tx*along,p.h+12,y+p.ty*along,5,17,9,'#b8bbab',rotation);
        } else box(x,p.h+4,y,32,8,9,j%6 ? '#e8dfca':'#c94038',rotation);
      }
    } else if (j % 9 === 0 && p.sector !== 'voo') {
      for (const side of [-1,1]) {
        box(p.x-p.ty*side*99,p.h+10,p.y+p.tx*side*99,5,20,5,'#856348');
      }
    }
  }


  // Only the checkered start line is painted on the road.
  const start = track.points[0];
  for (let x = -1; x <= 0; x++) for (let z = -4; z < 4; z++)
    box(start.x+x*10,start.h+1,start.y+z*20+10,10,1,20,(x+z)%2 ? '#fff1d3':'#29273a');
  // Side platform supports the photographed low pier building.
  box(5470,42,2430,280,16,180,'#aaa99d');
  for (const x of [5360,5470,5580]) box(x,16,2430,14,64,14,'#7d8986');

  // Simple dune plants keep the cut terrain readable without a new art dependency.
  for (let j = 0; j < 140; j++) {
    const x = 420 + (j*739)%4050, y = 3850 + (j*251)%1850;
    const p = track.nearest(x,y);
    if (p.distance < 145) continue;
    const h = terrainHeight(x,y);
    box(x,h+6,y,16,10,13,'#8b9951');
    box(x+7,h+9,y+3,7,17,6,'#a6ab60');
  }

  for(let j=0;j<16;j++){
    const p=track.points.filter(p=>p.sector==='praia')[j*4];
    if(!p)continue;
    const x=p.x-155-(j%2)*80,y=p.y;
    if(track.nearest(x,y).distance<105)continue;
    const h=terrainHeight(x,y);
    box(x,h+19,y,2,38,2,'#786145');
    const umbrella= j%2?'#c95b45':'#3a9ba5';
    box(x,h+37,y,44,4,36,umbrella);
    box(x,h+40,y,28,4,22,umbrella);
    box(x-28,h+1,y+10,15,1,30,'#efe5be');
  }
  for (const [color, v] of boxes) mesh(v,null,color);

  const storefront = scenerySprites(T, group, track);
  const billboard=m=>{m.onBeforeRender=(renderer,scene,camera)=>{m.rotation.y=Math.atan2(camera.position.x-m.position.x,camera.position.z-m.position.z);};return m;};
  const files=['moda-praia-v1','sorveteria-v1','lanchonete-v1','supermercado-asun-v1','lembrancas-v1','farmacia-v1'];
  const loads=[];
  // Repeat the six facades with varied widths to form an actual commercial row.
  // The row follows the start straight, from the last corner up to the concha.
  for(let j=0;j<6;j++) {
    const side=j%2?1:-1, p=track.pointAt(Math.floor(j/2)*190);
    loads.push(storefront(`cenario/cidreira/comercios/${files[j]}.png`,p.x-p.ty*side*175,p.y+p.tx*side*175,100,side<0?-Math.PI/4:-3*Math.PI/4));
  }
  loads.push(storefront('cenario/cidreira/plataforma-predio-v2.png',5470,2420,112,-Math.PI/4).then(m=>{m.position.y=50;}));
  // Reuse Gravatai's scenery density and pixel-art props along the approach.
  for(let j=0;j<track.points.length;j+=12){
    const p=track.points[j];
    if(!['centro','concha','retorno'].includes(p.sector)) continue;
    for(const side of [-1,1]){
      const x=p.x-p.ty*side*150,y=p.y+p.tx*side*150;
      if((x>4050&&x<4530&&y<1450)||(x>4000&&x<4350&&y>1450&&y<1750))continue;
      loads.push(storefront(j%24?'cenario/poste.png':'cenario/cidreira/palmeira-v1.png',x,y,j%24?70:110,-Math.PI/4).then(m=>j%24?m:billboard(m)));
    }
  }
  const beachPoints=track.points.filter(p=>p.sector==='praia');
  for(let j=0;j<beachPoints.length;j+=12){
    const p=beachPoints[j],dist=105+(j%3)*14;
    const x=p.x-p.ty*dist,y=p.y+p.tx*dist;
    loads.push(storefront('cenario/cidreira/caranguejo-v1.png',x,y,7).then(m=>{
      m.name='caranguejo';
      m.onBeforeRender=(renderer,scene,camera)=>{
        m.position.x=x+Math.sin(performance.now()/650+j)*4;
        m.rotation.y=Math.atan2(camera.position.x-m.position.x,camera.position.z-m.position.z);
      };
    }));
  }
  for(let j=0;j<track.points.length;j+=16){
    const p=track.points[j];
    if(!['lencois','retorno'].includes(p.sector))continue;
    const side=j%32?1:-1,dist=120+(j%3)*22;
    loads.push(storefront('cenario/moita.png',p.x-p.ty*side*dist,p.y+p.tx*side*dist,26,-Math.PI/4));
  }
  loads.push(storefront('cenario/cidreira/concha-frente-v1.png',4350,1220,150,-Math.PI/4));
  loads.push(storefront('cenario/cidreira/camarao-frente-v1.png',4180,1590,66,-3*Math.PI/4));
  loads.push(storefront('cenario/cidreira/camarao-34-v1.png',4550,2760,62,-3*Math.PI/4));
  for(let j=0;j<beachPoints.length;j+=12){
    const p=beachPoints[j],dist=190+(j%3)*18;
    loads.push(storefront('cenario/cidreira/palmeira-v1.png',p.x-p.ty*dist,p.y+p.tx*dist,100+(j%3)*8).then(billboard));
  }
  const trafficMeshes=new Map();
  for(const a of track.traffic.actors){
    const file=a.kind==='policial'?'policial-cavalo-v1':a.kind==='camarao'?'camarao-animal-v1':'caranguejo-v1';
    loads.push(storefront(`cenario/cidreira/${file}.png`,a.x,a.y,a.kind==='policial'?46:10,0,a.kind==='policial'?2:1).then(m=>{
      m.name='travessia-'+a.kind;trafficMeshes.set(a.id,m);
    }));
  }
  function update(dt,karts,camera,onHit){
    track.traffic.update(dt,karts,onHit);
    for(const a of track.traffic.actors){
      const m=trafficMeshes.get(a.id);if(!m)continue;
      m.position.set(a.x,a.height+(a.walking?Math.abs(Math.sin(a.walkTime*10))*.5:0),a.y);
      const facing=Math.atan2(camera.position.x-a.x,camera.position.z-a.y);
      m.rotation.y=facing;
      const horizontal=(-a.anchor.ty*a.direction)*Math.cos(facing)-(a.anchor.tx*a.direction)*Math.sin(facing);
      m.scale.x=horizontal>=0?1:-1;
      const frame=a.walking?Math.floor(a.walkTime*5)%m.userData.frames.length:0;
      m.material.map=m.userData.frames[frame];
    }
  }
  const ready=Promise.allSettled(loads).then(results=>{
    const errors=results.filter(r=>r.status==='rejected');
    if(errors.length) throw new Error(`Falha ao carregar ${errors.length} artes de Cidreira: ${errors[0].reason}`);
    return results.length;
  });

  const map=document.createElement('canvas');map.width=map.height=160;
  const g=map.getContext('2d');g.fillStyle='#153f55';g.fillRect(0,0,160,160);
  const scale=160/WORLD_SIZE;
  g.lineJoin=g.lineCap='round';
  function mapLine(path,color,width,dashed=false){
    g.beginPath();path.forEach((p,j)=>j?g.lineTo(p.x*scale,p.y*scale):g.moveTo(p.x*scale,p.y*scale));
    g.strokeStyle=color;g.lineWidth=width;g.setLineDash(dashed?[2,2]:[]);g.stroke();g.setLineDash([]);
  }
  mapLine([...track.points,track.points[0]],'#f4d69c',4);
  mapLine(track.points.filter(p=>p.sector==='voo'),'#71c9e7',3,true);
  for(const route of track.shortcuts)mapLine(route.points.map(([x,y])=>({x,y})),'#f4a93b',2,true);
  g.fillStyle='#ffffff';g.fillRect(start.x*scale-2,start.y*scale-2,4,4);
  track.mapa=map; track.textura=roadTexture;
  return {group,ready,update};
}
