// Browser integration checks against the actual compiled game + new modules.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const output=path.resolve(__dirname,'../.codex/verification');fs.mkdirSync(output,{recursive:true});
(async()=>{
  const server=spawn(process.execPath,[path.join(__dirname,'serve.mjs'),'--port','0'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
  const base=await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(new Error('Local server did not start')),10000);
    server.stdout.on('data',data=>{const match=String(data).match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timeout);resolve(match[0]);}});
    server.on('error',reject);server.on('exit',code=>{if(code)reject(new Error(`Local server exited: ${code}`))});
  });
  let browser;
  try {
    browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
    const page=await browser.newPage({viewport:{width:1280,height:800}});
    const errors=[];page.on('pageerror',e=>errors.push(e.stack));
    page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('net::ERR'))errors.push(m.text())});
    page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))errors.push(`${r.status()} ${r.url()}`)});
    await page.goto(base+'/?pista=cidreira&debug&auto&voltas=1',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.vermes,{timeout:60000});
    await page.evaluate(()=>window.vermes.pronto());
    assert.ok(await page.evaluate(()=>{let n=0;vermes.cena.traverse(o=>{if(o.name==='caranguejo')n++;});return n>=6;}),'Beach actually contains animal sprites');
    await page.screenshot({path:path.join(output,'cidreira-menu.png')});
    assert.match(await page.locator('#trocar-pista').textContent(),/Cidreira/);
    assert.equal(await page.locator('#criar').isDisabled(),false,'Cidreira also runs online');
    const content=await page.evaluate(()=>{
      const t=vermes.pista,names=[];vermes.cena.traverse(o=>{if(o.name)names.push(o.name)});
      return {actors:t.traffic.actors.map(a=>a.kind),names,stations:t.itemStations.length,
        crates:vermes.itens.caixas.map(c=>{const p=t.sample(c.x,c.y);return {drive:p.drive,sector:p.sector,distance:p.distance,
          jump:Math.min(...t.jumps.map(j=>Math.abs(j.point.s-p.s))),
          traffic:Math.min(...t.traffic.actors.map(a=>Math.abs(a.anchor.s-p.s)))};})};
    });
    assert.equal(content.stations,8);assert.equal(content.crates.length,16);
    assert.ok(content.crates.every(c=>c.drive&&c.distance<50&&!['voo','rampa'].includes(c.sector)&&c.jump>200&&c.traffic>150),'Eight item pairs lie on safe road, away from jumps and crossings');
    for(const kind of ['policial','camarao','caranguejo'])assert.ok(content.names.includes('travessia-'+kind));

    await page.evaluate(()=>window.vermes.iniciar());
    await page.waitForTimeout(500);
    await page.screenshot({path:path.join(output,'cidreira-largada.png')});
    await page.waitForFunction(()=>vermes.estado().fase==='corrida',{timeout:10000});
    console.log('LOAD',JSON.stringify(await page.evaluate(()=>({track:vermes.pista.id,N:vermes.pista.N,length:vermes.pista.length,cars:vermes.karts().length,draw:vermes.renderer.info.render}))));
    const first=await page.evaluate(()=>vermes.simular(115));
    fs.writeFileSync(path.join(output,'first-lap.json'),JSON.stringify(first,null,2));
    console.log('SIMULATION',JSON.stringify(first.map(k=>({nome:k.nome,voltas:k.voltas,gate:k.gate,jumps:k.jumps,resets:k.resets,x:Math.round(k.x),y:Math.round(k.y)}))));
    const times=await page.evaluate(()=>vermes.karts().map(k=>({name:k.piloto.nome,finish:k.chegada})));
    console.log('FINISH_TIMES',JSON.stringify(times));
    assert.ok(first.every(k=>k.voltas>=2&&k.jumps>=3&&k.resets===0),'All eight drivers complete the ordered main circuit and its three jumps');
    assert.ok(times.every(k=>k.finish>=40&&k.finish<=70),'Lap duration is within the target with normal bots');
    await page.screenshot({path:path.join(output,'cidreira-depois-volta.png')});
    await page.waitForFunction(()=>vermes.estado().fase==='fim');
    assert.ok(await page.locator('#resultado').isVisible(),'A completed race opens the actual result screen');

    const mechanics=await page.evaluate(()=>{
      const t=vermes.pista,k=vermes.karts().find(k=>k.humano),dt=1/60;
      const launch=t.jumps[0].point;
      k.colocar(launch.x,launch.y-12,Math.PI/2,launch.index);k.vx=0;k.vy=4;k.fwd=4;
      const slow=[];
      for(let i=0;i<130;i++){
        k.atualizar(dt,{acel:false,freio:false,dir:0,drift:false},t);
        if(i%20===0)slow.push({x:k.x,y:k.y,z:k.altura});
      }
      const slowResult={launched:k._cidreira.jumps>0,landed:!k._cidreira.air,water:t.sample(k.x,k.y).water,y:k.y,resets:k._cidreira.resets,positions:slow};
      // Driving to the finish without all intermediate gates cannot award a lap.
      const finish=t.points[0];k.colocar(finish.x+2,finish.y,0,0);k.vx=30;
      k.atualizar(dt,{acel:true,freio:false,dir:0,drift:false},t);
      const before=k.voltas;
      const tip=t.gates[3];k.x=tip.x;k.y=tip.y;k.h=Math.atan2(tip.ty,tip.tx);k.vx=tip.tx*100;k.vy=tip.ty*100;
      k.atualizar(dt,{acel:true,freio:false,dir:0,drift:false},t);
      k.x=finish.x+5;k.y=finish.y;k.h=0;k.vx=30;k.vy=0;
      k.atualizar(dt,{acel:true,freio:false,dir:0,drift:false},t);
      const cutResult={before,after:k.voltas,nextGate:k._cidreira.gate};
      // Simulate a failed platform jump after its required tip checkpoint.
      k._cidreira.pierAttempted=true;k._cidreira.gate=4;k._cidreira.air=true;k._cidreira.airVX=null;
      k.altura=-30;k.vz=-80;k.x=6100;k.y=2950;k.vx=0;k.vy=0;
      k.atualizar(dt,{acel:false,freio:false,dir:0,drift:false},t);
      const recovery={x:k.x,y:k.y,z:k.altura,delay:k._cidreira.recovering,water:t.sample(k.x,k.y).water};
      return {slowResult,cutResult,recovery};
    });
    const surf=await page.evaluate(()=>{
      const k=vermes.karts()[0],t=vermes.pista,y=3400,x=5788;
      const run=phase=>{
        k.colocar(x,y,Math.PI/2,t.nearest(x,y).index);
        k.atualizar(0,{acel:false,freio:false,dir:0,drift:false},t);
        k.vx=0;k.vy=100;k.fwd=100;
        Object.defineProperty(performance,'now',{configurable:true,value:()=>((phase+y*.003)/1.1)*1000});
        try{t.afterMove(k,.05);return {vx:k.vx,vy:k.vy};}finally{delete performance.now;}
      };
      return {wet:run(Math.PI/2),dry:run(3*Math.PI/2)};
    });
    assert.ok(surf.wet.vy<surf.dry.vy&&surf.wet.vx<surf.dry.vx,'Advancing surf slows and pushes; receding surf leaves the same lane dry');
    console.log('SURF',JSON.stringify(surf));
    console.log('MECHANICS',JSON.stringify(mechanics));
    assert.ok(mechanics.slowResult.launched&&mechanics.slowResult.landed&&!mechanics.slowResult.water&&mechanics.slowResult.resets===0,'Pier jump works from a crawl without a reset');
    assert.equal(mechanics.cutResult.after,mechanics.cutResult.before,'Finish cutting must not increment lap');
    assert.equal(mechanics.cutResult.nextGate,1,'Cutting cannot skip the next ordered checkpoint');
    assert.ok(mechanics.recovery.delay>0&&!mechanics.recovery.water&&mechanics.recovery.z===0,'Fall recovers to the landing beach with a short penalty');

    const shortcuts=await page.evaluate(()=>{
      const t=vermes.pista,k=vermes.karts().find(k=>k.humano),results=[];
      for(const cut of t.shortcuts){
        const gate=cut.id==='areia'?2:6;
        const end=t.gates[gate];
        const route=cut.points.map(([x,y])=>({x,y}));
        if(cut.id==='dunas')route.push(t.jumps[2].point);
        route.push({x:end.x+end.tx*140,y:end.y+end.ty*140});
        const a=route[0],b=route[1];
        k.colocar(a.x,a.y,Math.atan2(b.y-a.y,b.x-a.x),t.nearest(a.x,a.y).index);
        k.atualizar(0,{acel:false,freio:false,dir:0,drift:false},t);k._cidreira.gate=gate;
        let target=1;
        for(let j=0;j<45*60&&target<route.length;j++){
          const p=route[target],dx=p.x-k.x,dy=p.y-k.y;
          if(Math.hypot(dx,dy)<70){target++;continue;}
          const e=Math.atan2(Math.sin(Math.atan2(dy,dx)-k.h),Math.cos(Math.atan2(dy,dx)-k.h));
          k.atualizar(1/60,{acel:k.fwd<150,freio:k.fwd>170||Math.abs(e)>.9&&k.fwd>100,dir:Math.max(-1,Math.min(1,e*2.5)),drift:false},t);
        }
        results.push({id:cut.id,completed:target===route.length,gate:k._cidreira.gate,expected:gate+1,resets:k._cidreira.resets,jumps:k._cidreira.jumps});
      }
      return results;
    });
    console.log('SHORTCUTS',JSON.stringify(shortcuts));
    assert.ok(shortcuts.every(s=>s.completed&&s.gate===s.expected&&s.resets===0),'Both player shortcuts rejoin legally without resetting or skipping the pier');

    async function pose(name,sector,back=0){
      await page.evaluate(({sector,back})=>{
        const t=vermes.pista,p=sector==='duna'?t.pointAt(t.jumps[1].point.s-back):t.points.find(p=>p.control===sector);
        vermes.karts().forEach((k,j)=>{
          const a=t.pointAt(p.s-j*55);k.colocar(a.x,a.y,Math.atan2(a.ty,a.tx),a.index);
        });
        vermes.camera._raceHeading=null;vermes.camera._raceHeight=null;
        document.getElementById('resultado').hidden=true;
      },{sector,back});
      await page.waitForTimeout(180);
      await page.screenshot({path:path.join(output,name+'.png')});
    }
    await pose('cidreira-concha',2);
    await pose('cidreira-patrulha',5);
    await pose('cidreira-plataforma',7);
    await pose('cidreira-praia',13);
    await pose('cidreira-dunas','duna',180);

    // Coarser updates exercise the actual maximum frame delta in the game loop.
    await page.evaluate(()=>vermes.iniciar());
    const coarse=await page.evaluate(()=>vermes.simular(125,.05));
    console.log('COARSE',JSON.stringify(coarse.map(k=>({name:k.nome,laps:k.voltas,resets:k.resets}))));
    assert.ok(coarse.every(k=>k.voltas>=2),'All bots also finish with 50ms physics steps');

    await page.goto(base+'/?debug&auto&voltas=1',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.vermes);
    assert.match(await page.locator('#trocar-pista').textContent(),/Gravata/);
    assert.equal(await page.locator('#criar').isDisabled(),false);
    await page.evaluate(()=>vermes.iniciar());
    const original=await page.evaluate(()=>vermes.simular(110));
    assert.ok(original.every(k=>k.voltas>=2),'Gravatai bots still finish using the original physics');
    assert.ok(original.every(k=>k.jumps===undefined),'Cidreira height state is isolated from Gravatai');
    await page.waitForTimeout(200);
    await page.screenshot({path:path.join(output,'gravatai-regression.png')});

    // Track choice survives reload and fits a small viewport with keyboard access.
    await page.goto(base+'/?debug',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.vermes);
    await page.locator('#modo-pista').click();
    await page.locator('.pista-card[data-pista=cidreira]').click();
    await page.waitForURL(/pista=cidreira/);
    await page.waitForFunction(()=>window.vermes?.pista.cidreira);
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:path.join(output,'cidreira-mobile-menu.png')});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Menu has no horizontal overflow on mobile');
    await page.setViewportSize({width:1280,height:800});
    await page.locator('#solo').click();
    await page.locator('#avancar').click();
    await page.locator('#avancar').click();
    await page.waitForFunction(()=>vermes.estado().fase==='corrida',{timeout:10000});
    const manualStart=await page.evaluate(()=>{const k=vermes.karts().find(k=>k.humano);return{x:k.x,y:k.y}});
    await page.keyboard.down('w');await page.waitForTimeout(1500);await page.keyboard.up('w');
    const manual=await page.evaluate(()=>{const k=vermes.karts().find(k=>k.humano);return{x:k.x,y:k.y,speed:k.fwd,air:k._cidreira.air}});
    assert.ok(Math.hypot(manual.x-manualStart.x,manual.y-manualStart.y)>40&&manual.speed>50,'Actual keyboard acceleration drives the human car in Cidreira');
    await page.screenshot({path:path.join(output,'cidreira-teclado.png')});
    console.log('KEYBOARD',JSON.stringify(manual));
    console.log('ERRORS',JSON.stringify(errors));
    assert.equal(errors.length,0,'Browser/runtime errors');
    await browser.close();
  } finally { if(browser?.isConnected())await browser.close();server.kill(); }
})().catch(e=>{console.error(e);process.exitCode=1});
