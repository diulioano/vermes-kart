export { WORLD_SIZE, createCidreiraTrack } from './track.js';
export { attachCidreiraPhysics } from './physics.js';
export { buildCidreiraScene } from './scene.js';

export const isCidreira = new URLSearchParams(location.search).get('pista') === 'cidreira';

export function setupTrackPicker() {
  for (const select of document.querySelectorAll('[data-track-picker]')) {
    select.value = isCidreira ? 'cidreira' : 'gravatai';
    select.addEventListener('change', () => {
      const url = new URL(location.href);
      if (select.value === 'cidreira') url.searchParams.set('pista', 'cidreira');
      else url.searchParams.delete('pista');
      location.assign(url.href);
    });
  }
  // Cidreira now runs online too; the room follows the host's track.
  document.getElementById('cidreira-mode-note').hidden = true;
  if (isCidreira) document.title = 'Cidreira · Vermes Kart';
}

export function updateCidreiraCamera(camera, kart, dt, rear, track) {
  // Smoothing follows the kart's turns only; looking back flips at once, no spin.
  if (camera._raceHeading == null) camera._raceHeading = kart.h;
  const difference = Math.atan2(Math.sin(kart.h-camera._raceHeading),Math.cos(kart.h-camera._raceHeading));
  camera._raceHeading += difference * Math.min(1,dt*5);
  if (camera._raceRear !== rear) camera._raceHeight = null;
  camera._raceRear = rear;
  const h=camera._raceHeading+(rear?Math.PI:0), distance=76+(kart.boost>0?10:0);
  const x=kart.x-Math.cos(h)*distance, y=kart.y-Math.sin(h)*distance;
  const floor=track.sample(x,y).height;
  const targetHeight=Math.max((kart.altura||0)+32,floor+24);
  camera._raceHeight=camera._raceHeight==null?targetHeight:camera._raceHeight+(targetHeight-camera._raceHeight)*Math.min(1,dt*8);
  camera.position.set(x,camera._raceHeight,y);
  camera.lookAt(kart.x+Math.cos(h)*60,(kart.altura||0)+12,kart.y+Math.sin(h)*60);
}

export function adaptCidreiraItems(items, track) {
  // Eight pairs, separated by distance along the route rather than sample index.
  const stations = [[1,40],[4,70],[7,110],[13,430],[15,80],[18,20],[22,60],[26,150]];
  track.itemStations = stations.map(([control,advance])=>{
    const anchor=track.points.find(p=>p.control===control);
    return track.pointAt(anchor.s+advance);
  });
  items.caixas.forEach((crate,j)=>{
    const p=track.itemStations[Math.floor(j/2)],side=j%2?30:-30;
    crate.x=p.x-p.ty*side;crate.y=p.y+p.tx*side;
    crate.s.position.set(crate.x,p.h+4,crate.y);
  });
  const restart=items.reiniciar.bind(items);
  items.reiniciar=()=>{restart();track.traffic.reset();};
  const update=items.atualizar.bind(items);
  items.atualizar=(...args)=>{
    update(...args);
    for(const crate of items.caixas)crate.s.position.y=4+Math.sin(items.t*3+crate.x)*2+Math.max(0,track.sample(crate.x,crate.y).height);
    for(const fish of items.tainhas)fish.s.position.y+=Math.max(0,track.sample(fish.x,fish.y).height);
    for(const bump of items.lombas)bump.s.position.y=Math.max(0,track.sample(bump.x,bump.y).height);
    for(const siren of items.sirenes)siren.s.position.y=34+(siren.alvo.altura||0);
  };
}

export function adaptCidreiraParticles(particles) {
  const emit=particles.emitirKart.bind(particles),spawn=particles.soltar.bind(particles);
  particles._floor=0;
  particles.soltar=(x,h,...rest)=>spawn(x,h+particles._floor,...rest);
  particles.emitirKart=(kart,...rest)=>{
    particles._floor=kart.altura||0;emit(kart,...rest);particles._floor=0;
  };
}

export function updateCidreiraHUD(kart, track) {
  const output=document.getElementById('pista-setor');
  if(!isCidreira){output.hidden=true;return;}
  output.hidden=false;
  const labels={centro:'CENTRO',concha:'CONCHA ACÚSTICA',orla:'ORLA',plataforma:'PLATAFORMA',
    rampa:'SALTO DA PLATAFORMA',voo:'SALTO DA PLATAFORMA',praia:'PRAIA',lencois:'LENÇÓIS',retorno:'RETORNO AO CENTRO'};
  output.textContent=kart._cidreira?.recovering>0?'VOLTANDO À PISTA':`CIDREIRA · ${labels[track.nearest(kart.x,kart.y).sector]}`;
}
