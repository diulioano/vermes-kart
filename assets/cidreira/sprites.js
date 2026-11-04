// Decode and trim each source once. Animation frames share a baseline and bounds.
export function scenerySprites(T, group, track) {
  const cache = new Map();
  async function load(file, frames) {
    const image = new Image(); image.src = './' + file; await image.decode();
    const source = document.createElement('canvas');
    source.width = image.width; source.height = image.height;
    const ctx = source.getContext('2d', {willReadFrequently:true}); ctx.drawImage(image,0,0);
    const data = ctx.getImageData(0,0,image.width,image.height).data;
    const cell = Math.floor(image.width / frames);
    let x0=cell,y0=image.height,x1=0,y1=0;
    for(let y=0;y<image.height;y++) for(let x=0;x<image.width;x++) {
      if(data[(y*image.width+x)*4+3]<128)continue;
      const local=x%cell; x0=Math.min(x0,local);x1=Math.max(x1,local);
      y0=Math.min(y0,y);y1=Math.max(y1,y);
    }
    const w=x1-x0+1,h=y1-y0+1,textures=[];
    if(w<=0||h<=0)throw new Error('Sprite vazio: '+file);
    for(let frame=0;frame<frames;frame++){
      const canvas=document.createElement('canvas');canvas.height=256;canvas.width=Math.round(w/h*256);
      const g=canvas.getContext('2d');g.imageSmoothingEnabled=false;
      g.drawImage(image,frame*cell+x0,y0,w,h,0,0,canvas.width,canvas.height);
      const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
      texture.magFilter=T.NearestFilter;textures.push(texture);
    }
    return {textures,aspect:w/h};
  }
  return async (file,x,y,height,rotation=0,frames=1)=>{
    const key=file+':'+frames;
    if(!cache.has(key))cache.set(key,load(file,frames));
    const asset=await cache.get(key);
    const geometry=new T.PlaneGeometry(height*asset.aspect,height);geometry.translate(0,height/2,0);
    const m=new T.Mesh(geometry,new T.MeshBasicMaterial({map:asset.textures[0],alphaTest:.5,side:T.DoubleSide}));
    m.position.set(x,Math.max(0,track.sample(x,y).height),y);m.rotation.y=rotation;
    m.userData.frames=asset.textures;group.add(m);return m;
  };
}
