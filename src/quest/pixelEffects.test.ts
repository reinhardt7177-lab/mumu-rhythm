import{afterEach,describe,it,expect,vi}from'vitest';
afterEach(()=>vi.unstubAllGlobals());
describe('shared effect preload recovery',()=>{
 it.each(['http','decode']as const)('retries a failed %s load after reselect instead of caching absence',async failure=>{
  vi.resetModules();let requests=0,decodes=0;
  vi.stubGlobal('Image',class{src='';decode(){if(this.src.includes('/present/')&&failure==='decode'&&++decodes===1)return Promise.reject(new Error('temporary decode'));return Promise.resolve()}});
  const data={frames:[{frame:{x:0,y:0,w:1,h:1}}],meta:{pixelfx:{fps:30,loop:false,pivot:[0,0]}}};
  vi.stubGlobal('fetch',async(url:string)=>{const selected=url.includes('/present/');if(selected)requests++;return{ok:!(selected&&failure==='http'&&requests===1),json:async()=>data}});
  const{PixelEffects}=await import('./pixelEffects'),fx=new PixelEffects();await fx.ready;await fx.preload(['present-perfect']);expect(requests).toBe(1);
  await fx.preload(['present-perfect']);expect(requests).toBe(2);
  const context={save:vi.fn(),restore:vi.fn(),drawImage:vi.fn(),globalAlpha:1}as unknown as CanvasRenderingContext2D;
  expect(fx.draw(context,'present-perfect',0,10,10)).toBe(true);
 });
 it('deduplicates simultaneous requests and reuses successfully decoded sheets',async()=>{
  vi.resetModules();let requests=0;vi.stubGlobal('Image',class{src='';decode(){return Promise.resolve()}});
  vi.stubGlobal('fetch',async(url:string)=>{if(url.includes('/future/'))requests++;return{ok:true,json:async()=>({frames:[{frame:{x:0,y:0,w:1,h:1}}],meta:{pixelfx:{fps:30,loop:false,pivot:[0,0]}}})}});
  const{PixelEffects}=await import('./pixelEffects'),a=new PixelEffects(),b=new PixelEffects();await Promise.all([a.preload(['future-perfect']),b.preload(['future-perfect'])]);await a.preload(['future-perfect']);expect(requests).toBe(1);
 });
});
