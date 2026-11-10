import{afterEach,describe,it,expect,vi}from'vitest';
import{BossRenderer}from'./bossRenderer';
import{Combat,type MusicalAttack}from'./combat';

afterEach(()=>vi.unstubAllGlobals());
function scene(){
 vi.stubGlobal('Image',class{src='';naturalWidth=512;decode(){return Promise.resolve()}});
 const drawImage=vi.fn(),ctx={save(){},restore(){},fillRect(){},drawImage,strokeText(){},fillText(){}}as unknown as CanvasRenderingContext2D;
 const boss=new BossRenderer(),combat=new Combat(1000);combat.stage=3;combat.hp=1000;
 const draw=(time:number,beat:number)=>boss.draw(ctx,'past',time,beat,combat,{x:360,y:274},{x:116,y:274},false);
 const frame=()=>{const args=drawImage.mock.calls.at(-1)!;return args[1]/128+args[2]/128*4};
 return{boss,combat,draw,drawImage,frame};
}
const impact=(at:number,overrides:Partial<MusicalAttack>={}):MusicalAttack=>({time:at-.32,at,target:3,damage:18,skill:false,kind:'perfect',combo:1,...overrides});
describe('boss sprite choreography',()=>{
 it('resets a new movement to anticipation and places the sprite on the shared foot anchor',()=>{
  const s=scene();s.draw(1,0);s.draw(2,6);expect(s.frame()).toBe(3);
  s.combat.hp=600;s.draw(2,6);expect(s.frame()).toBe(0);
  s.draw(3,10.5);expect(s.frame()).toBe(3);expect(s.boss.cue).toContain('2악장');
  expect(s.drawImage.mock.calls.at(-1)!.slice(5)).toEqual([272,109,176,176]);
 });
 it('shows hurt, chord break, then defeat in priority order without a duplicate alive fallback',()=>{
  const s=scene();s.draw(1,0);s.boss.impact([impact(2)]);s.draw(2.05,6);expect(s.frame()).toBe(5);
  s.boss.impact([impact(3,{skill:true,kind:'combo',combo:8})]);s.draw(3.05,6);expect(s.frame()).toBe(6);
  s.combat.hp=0;s.boss.impact([impact(4,{skill:true,kind:'boss',defeated:true})]);expect(s.draw(4.1,7)).toBe(true);expect(s.frame()).toBe(7);
  const count=s.drawImage.mock.calls.length;expect(s.draw(4.9,8)).toBe(true);expect(s.drawImage).toHaveBeenCalledTimes(count);
 });
 it('clears cue, hit, break, defeat and phase clocks on restart',()=>{
  const s=scene();s.draw(1,0);s.combat.hp=0;s.boss.impact([impact(2,{defeated:true})]);s.draw(2.1,7);
  s.boss.reset();expect(s.boss.cue).toBe('');s.combat.hp=1000;s.draw(0,0);expect(s.frame()).toBe(0);expect(s.boss.cue).toContain('1악장');
 });
 it('ignores impacts from ordinary enemies',()=>{
  const s=scene();s.draw(1,0);s.boss.impact([impact(2,{target:2,skill:true})]);s.draw(2.05,6);expect(s.frame()).toBe(3);
 });
});
