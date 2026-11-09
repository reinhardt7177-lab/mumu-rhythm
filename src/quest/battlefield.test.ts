import{afterEach,expect,it,vi}from'vitest';
import{Battlefield}from'./battlefield';import{Combat}from'./combat';
import{WORLDS}from'./worlds';
afterEach(()=>vi.unstubAllGlobals());
it('retains a lethal old-target effect when combat advances to the next encounter',()=>{
 vi.stubGlobal('Image',class{src='';naturalWidth=0;decode(){return Promise.resolve()}});
 vi.stubGlobal('matchMedia',()=>({matches:true}));vi.stubGlobal('fetch',async()=>({ok:false}));
 const ctx={fillRect:vi.fn(),save:vi.fn(),restore:vi.fn(),fillText:vi.fn(),strokeText:vi.fn()};
 const canvas={width:480,height:320,getContext:()=>ctx}as unknown as HTMLCanvasElement;
 const battle=new Battlefield(canvas),draw=vi.fn();
 (battle as unknown as {fx:{draw:typeof draw}}).fx={draw};
 const combat=new Combat();combat.hp=12;combat.launch(false,1,0);
 const impacts=combat.advance(.32,.3);expect(combat.stage).toBe(1);expect(impacts[0].defeated).toBe(true);
 battle.impact(impacts);battle.draw(.45,combat);
 expect(draw.mock.calls.some(call=>call[1]==='boss')).toBe(true);
 draw.mockClear();battle.draw(3,combat);expect(draw).not.toHaveBeenCalled();
});
it('celebrates an earned64 combo during an empty encounter without applying damage',()=>{
 vi.stubGlobal('Image',class{src='';naturalWidth=0;decode(){return Promise.resolve()}});vi.stubGlobal('matchMedia',()=>({matches:true}));vi.stubGlobal('fetch',async()=>({ok:false}));
 const ctx={fillRect:vi.fn(),save:vi.fn(),restore:vi.fn(),fillText:vi.fn(),strokeText:vi.fn()},battle=new Battlefield({getContext:()=>ctx}as unknown as HTMLCanvasElement);battle.setWorld(WORLDS[0]);
 const combat=new Combat();combat.hp=0;combat.kills=1;expect(combat.launch(true,64,1)).toBeNull();
 battle.celebrate(64,1);battle.draw(1.12,combat);
 expect(ctx.strokeText.mock.calls.some(c=>String(c[0]).includes('64 COMBO'))).toBe(true);expect(combat.hp).toBe(0);expect(combat.kills).toBe(1);expect(combat.won).toBe(false);
 battle.reset();ctx.strokeText.mockClear();battle.draw(1.2,combat);expect(ctx.strokeText).not.toHaveBeenCalled();
});
