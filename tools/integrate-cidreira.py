"""Exact, audited adapter patches for the only available (bundled) game source.

Run once against the original bundle. New gameplay code lives in assets/cidreira.
Each replacement must match exactly once; failures never partially write a file.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
source = (ROOT / 'assets/jogo.js').read_text(encoding='utf-8')
html = (ROOT / 'index.html').read_text(encoding='utf-8')

def replace(old, new):
    global source
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f'Expected exactly one integration anchor, found {count}: {old[:110]}')
    source = source.replace(old, new, 1)

imports = '''import { isCidreira as CIDREIRA, WORLD_SIZE as CIDREIRA_SIZE, createCidreiraTrack, attachCidreiraPhysics, buildCidreiraScene, setupTrackPicker, updateCidreiraCamera, adaptCidreiraItems, adaptCidreiraParticles, updateCidreiraHUD } from "./cidreira/index.js";
'''
replace('ht=2048,ft=130', 'ht=CIDREIRA?CIDREIRA_SIZE:2048,ft=130')
replace('const At=g0();{const i=', '''const At=CIDREIRA?attachCidreiraPhysics(createCidreiraTrack()):g0();
let cidreiraVisual=null;
if(CIDREIRA){
  cidreiraVisual=buildCidreiraScene({Group:wr,Color:qe,BufferGeometry:_n,Float32BufferAttribute:$t,Mesh:Ht,MeshBasicMaterial:xi,PlaneGeometry:Si,CanvasTexture:ac,SRGBColorSpace:Ct,NearestFilter:yt,RepeatWrapping:js,DoubleSide:hn},Ut,At);
}else{const i=''')
replace('qn.position.y=250;Ut.add(qn);', 'qn.position.y=250;qn.visible=!CIDREIRA;Ut.add(qn);if(CIDREIRA){Ut.background.set("#73c6f7");Ut.fog.color.set("#b6dcdf");Ut.fog.near=600;Ut.fog.far=1900;}')
replace('atualizar(e,t,n){this.girando>0?', 'atualizar(e,t,n){if(n.cidreira)t=n.beforeStep(this,e,t);this.girando>0?')
replace('this.pulo>0&&(this.vz-=260*e,this.pulo=Math.max(0,this.pulo+this.vz*e));', '!n.cidreira&&this.pulo>0&&(this.vz-=260*e,this.pulo=Math.max(0,this.pulo+this.vz*e));')
replace('this.fwd=c,vkBarrar(this,e),', 'this.fwd=c,n.cidreira?n.afterMove(this,e):vkBarrar(this,e),')
replace('this.idx=_0(n,this.x,this.y,this.idx);const d=n.N;m>d*.8&&this.idx<d*.2&&this.voltas++,m<d*.2&&this.idx>d*.8&&this.voltas--,this.prog=this.voltas*d+this.idx',
        'if(n.cidreira)n.updateProgress(this);else{this.idx=_0(n,this.x,this.y,this.idx);const d=n.N;m>d*.8&&this.idx<d*.2&&this.voltas++,m<d*.2&&this.idx>d*.8&&this.voltas--,this.prog=this.voltas*d+this.idx}')
replace('pulo:0,vz:0,eventos:[]})}estado()', 'pulo:0,vz:0,eventos:[],_cidreira:null,altura:0,baseAltura:0})}estado()')
replace('this.sprite.position.set(this.x,this.pulo,this.y),this.sombra.position.set(this.x,.3,this.y)',
        'this.sprite.position.set(this.x,CIDREIRA?(this.altura||0):this.pulo,this.y),this.sombra.position.set(this.x,(CIDREIRA?(this.baseAltura||0):0)+.3,this.y)')
replace('this.placa.position.set(this.x,this.pulo+25,this.y)', 'this.placa.position.set(this.x,(CIDREIRA?(this.altura||0):this.pulo)+25,this.y)')
replace('function A0(i,e){const t=', 'function A0(i,e){if(CIDREIRA&&Math.abs((i.altura||0)-(e.altura||0))>22)return 0;const t=')
replace('function R0(i,e,t){const{centro:', 'function R0(i,e,t){if(e.cidreira)return e.botInput(i,t);const{centro:')
replace('function Xu(i){const e=Lt;', 'function Xu(i){if(CIDREIRA){vkTras=vkOlhaTras();updateCidreiraCamera(nt,Lt,i,vkTras,At);return}const e=Lt;')
replace('async function yc(i){if(ot===', 'async function yc(i){if(CIDREIRA)await cidreiraVisual.ready;if(ot===')
replace('function qu(){ot===', 'function qu(){updateCidreiraHUD(Lt,At);ot===')
replace('const qr=new B0(Ut,At);qr.montar().catch(i=>console.error("cenário",i));',
        'const qr=new B0(Ut,At);if(!CIDREIRA)qr.montar().catch(i=>console.error("cenário",i));')
replace('let gi=0;function $r', 'if(CIDREIRA)adaptCidreiraItems(Ki,At);let gi=0;function $r')
replace('let Lr=58,Vu=0;', 'if(CIDREIRA)adaptCidreiraParticles(Jl);let Lr=58,Vu=0;')
replace('if(!((a.x-s.x)**2+(a.y-s.y)**2>256))', 'if(!((a.x-s.x)**2+(a.y-s.y)**2>256||this.pista.cidreira&&Math.abs((a.altura||0)-this.pista.sample(s.x,s.y).height)>25))')
replace('function Wr(i,e=""){for(const t of["solo","criar","entrar"])te(t).disabled=i;',
        'function Wr(i,e=""){for(const t of["solo","criar","entrar"])te(t).disabled=i||CIDREIRA&&t!=="solo";')
replace('addEventListener("keydown",i=>{if(!te("modo").hidden', 'addEventListener("keydown",i=>{if(i.target instanceof HTMLSelectElement)return;if(!te("modo").hidden')
replace('dr();Nu();requestAnimationFrame(Wu);', 'setupTrackPicker();dr();Nu();requestAnimationFrame(Wu);')
replace('Pu&&(window.vermes={karts:()=>Ve,pista:At,cena:Ut,camera:nt,renderer:es,rede:()=>({modo:Nt,host:pt,cliente:on,donos:Ln})});',
'''(Pu||wu.has("debug"))&&(window.vermes={karts:()=>Ve,pista:At,cena:Ut,camera:nt,renderer:es,rede:()=>({modo:Nt,host:pt,cliente:on,donos:Ln}),iniciar:()=>{vkModo="solo";Nt="solo";Ei="eu";te("modo").hidden=true;return yc(ku([{id:"eu",piloto:mn,carro:gn}]))},pronto:()=>cidreiraVisual?.ready??Promise.resolve(),estado:()=>({fase:ot,tempo:tr}),simular:(seconds,dt=1/60)=>{for(let step=0;step<seconds/dt;step++){for(const k of Ve){k.atualizar(dt,R0(k,At,0),At);if(k.voltas>di&&k.chegada===null)k.chegada=step*dt;}for(let a=0;a<Ve.length;a++)for(let b=a+1;b<Ve.length;b++)A0(Ve[a],Ve[b]);}return Ve.map(k=>({nome:k.piloto.nome,voltas:k.voltas,x:k.x,y:k.y,altura:k.altura,gate:k._cidreira?.gate,jumps:k._cidreira?.jumps,resets:k._cidreira?.resets,visited:k._cidreira?.visited}));}});''')

replace('qu(),mi+=e,Nt===', 'if(CIDREIRA)cidreiraVisual.update(t?e:0,Ve,nt,(k,a)=>{if(k.humano){Me.rodar();$r(a.kind==="policial"?"OLHA A PATRULHA!":"OLHA OS BICHINHOS!")}});qu(),mi+=e,Nt===')
replace('for(let a=0;a<Ve.length;a++)for(let b=a+1;b<Ve.length;b++)A0(Ve[a],Ve[b]);', 'for(let a=0;a<Ve.length;a++)for(let b=a+1;b<Ve.length;b++)A0(Ve[a],Ve[b]);if(CIDREIRA)At.traffic.update(dt,Ve);')
replace('karts:()=>Ve,pista:At,', 'karts:()=>Ve,itens:Ki,pista:At,')

source = imports + source
html = html.replace('</head>', '  <link rel="stylesheet" href="./assets/cidreira/picker.css">\n</head>', 1)
html = html.replace('    <div class="escolha">', '''    <div class="pista-escolha">
      <label for="pista-menu">PISTA</label>
      <select id="pista-menu" data-track-picker><option value="gravatai">Gravataí</option><option value="cidreira">Cidreira · praia e dunas</option></select>
    </div>
    <div class="escolha">''', 1)
html = html.replace('    <button class="grande" id="solo">', '''    <div class="pista-escolha">
      <label for="pista-modo">PISTA</label>
      <select id="pista-modo" data-track-picker><option value="gravatai">Gravataí</option><option value="cidreira">Cidreira · praia e dunas</option></select>
    </div>
    <p id="cidreira-mode-note" hidden>Cidreira está disponível no solo com bots. Para correr online, selecione Gravataí.</p>
    <button class="grande" id="solo">''', 1)
html = html.replace('  <div id="drift"></div>', '  <div id="pista-setor" role="status" hidden></div>\n  <div id="drift"></div>', 1)
(ROOT / 'assets/jogo.js').write_text(source, encoding='utf-8')
(ROOT / 'index.html').write_text(html, encoding='utf-8')
print('Cidreira integration installed. Original game library code preserved.')
