import{describe,it,expect}from'vitest';
import{theaterAttack,theaterPose,flightPoint}from'./theaterAttack';
import{Combat,FLIGHT_SECONDS}from'./combat';
describe('theater combo choreography',()=>{
 it.each([[0,0,1],[7,0,1],[8,1,2],[23,1,2],[24,2,3],[47,2,3],[48,3,5],[64,3,7]])('combo %i has tier %i and %i visible voices',(combo,tier,voices)=>{
  expect(theaterAttack(combo)).toMatchObject({tier,voices});
 });
 it('alternates ordinary casts and reserves finale for 64-hit arrivals',()=>{
  expect(theaterPose(.12,theaterAttack(1),false)).not.toBe(theaterPose(.12,theaterAttack(2),false));
  expect(theaterAttack(63).finale).toBe(false);expect(theaterAttack(64).finale).toBe(true);
  expect(theaterAttack(65).finale).toBe(false);expect(theaterPose(.12,theaterAttack(64),false)).toBe(7);
  expect(theaterPose(10,theaterAttack(1),true)).toBe(6);
  expect(theaterPose(10,theaterAttack(1),false)).toBe(0);
  expect(theaterPose(.12,theaterAttack(64),true)).toBe(7);
 });
 it('converges every visible voice on one target at the unchanged arrival time',()=>{
  const profile=theaterAttack(64),from={x:120,y:180},to={x:340,y:160};
  for(let voice=0;voice<profile.voices;voice++){
   expect(flightPoint(0,voice,profile,from,to)).toEqual(from);
   expect(flightPoint(1,voice,profile,from,to)).toEqual(to);
  }
  const c=new Combat(),a=c.launch(true,64,1)!;expect(a.at).toBe(1+FLIGHT_SECONDS);expect(a.damage).toBe(48);
  c.advance(a.at,0);expect(c.hp).toBe(132);
 });
 it('retains hold identity even when completion lands on a combo accent',()=>{
  const c=new Combat(),attack=c.launch(true,24,0,true)!;
  expect(attack.kind).toBe('combo');expect(attack.hold).toBe(true);
 });
 it('changes musical phrases within the same combo tier without moving the target',()=>{
  const from={x:150,y:180},to={x:350,y:170};
  const profiles=[24,32,40].map(theaterAttack);
  expect(profiles.map(p=>p.phrase)).toEqual([0,1,2]);
  expect(profiles.map(p=>p.cadence)).toEqual([false,true,false]);
  expect(new Set(profiles.map(p=>JSON.stringify(flightPoint(.4,0,p,from,to)))).size).toBe(3);
  for(const p of profiles)expect(flightPoint(1,0,p,from,to)).toEqual(to);
 });
 it('gives a released-hold finale priority over the ordinary strong release pose',()=>{
  expect(theaterPose(.12,theaterAttack(64),false,true)).toBe(7);
  expect(theaterPose(.12,theaterAttack(1),false,true)).toBe(5);
  expect(theaterPose(.04,theaterAttack(1),false,true)).toBe(4);
 });
});
