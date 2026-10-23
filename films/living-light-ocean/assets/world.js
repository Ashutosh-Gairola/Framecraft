const W = 1920, H = 1080;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const fract = (x) => x - Math.floor(x);
const hash = (n) => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453123);
const mix = (a, b, u) => a + (b - a) * u;

function path(ctx, pts, close = false) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); if (close) ctx.closePath(); }
function drawFish(ctx, x, y, scale, phase, alpha) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
  const wag = Math.sin(phase) * 7;
  ctx.fillStyle = "#1b2d6b"; path(ctx, [[-35,0],[-57,-13-wag],[-55,0],[-57,13+wag]], true); ctx.fill();
  ctx.fillStyle = "#d5e2ff"; path(ctx, [[-43,0],[-20,-16], [15,-12],[36,0],[12,13],[-20,15]], true); ctx.fill();
  ctx.fillStyle = "#1b2d6b"; path(ctx, [[-4,-12],[8,-27],[13,-10]], true); ctx.fill();
  ctx.fillStyle = "#101628"; ctx.beginPath(); ctx.arc(24,-3,2.8,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#e7eefc"; ctx.globalAlpha *= .4; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-20,2);ctx.quadraticCurveTo(4,7,27,2);ctx.stroke();
  ctx.restore();
}
function drawTurtle(ctx, x, y, scale, phase, alpha = 1) {
  ctx.save(); ctx.translate(x,y); ctx.scale(scale,scale); ctx.globalAlpha=alpha;
  // Far flippers, then pale plastron and olive carapace.
  ctx.fillStyle="#344632";
  ctx.save();ctx.translate(-25,30);ctx.rotate(.34+Math.sin(phase+1)*.08);ctx.beginPath();ctx.ellipse(0,67,22,82,0,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.save();ctx.translate(95,24);ctx.rotate(-.42);ctx.beginPath();ctx.ellipse(0,38,17,54,0,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.fillStyle="#d5e2ff";ctx.beginPath();ctx.ellipse(0,24,130,42,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#526b4a";ctx.strokeStyle="#101628";ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(-8,-7,134,67,-.03,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.strokeStyle="#d5e2ff";ctx.globalAlpha*=.48;ctx.lineWidth=2;
  for(let i=-2;i<=2;i++){ctx.beginPath();ctx.ellipse(-8+i*44,-8,23,58,0,0,Math.PI*2);ctx.stroke();}
  ctx.beginPath();ctx.moveTo(-137,-2);ctx.quadraticCurveTo(-8,-31,126,-1);ctx.stroke();ctx.globalAlpha=alpha;
  // Neck and head.
  ctx.fillStyle="#526b4a";ctx.beginPath();ctx.moveTo(94,-12);ctx.quadraticCurveTo(142,-43,185,-24);ctx.quadraticCurveTo(211,-13,193,8);ctx.quadraticCurveTo(161,27,115,13);ctx.closePath();ctx.fill();
  ctx.fillStyle="#101628";ctx.beginPath();ctx.arc(180,-20,4.2,0,Math.PI*2);ctx.fill();
  // Near power flipper, with broad paddle sweep.
  const sweep=Math.sin(phase)*.34;
  ctx.save();ctx.translate(-36,18);ctx.rotate(-.38+sweep);ctx.fillStyle="#526b4a";ctx.strokeStyle="#101628";ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(-16,71,25,92,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
  ctx.save();ctx.translate(91,25);ctx.rotate(.45-Math.sin(phase+1)*.12);ctx.fillStyle="#526b4a";ctx.beginPath();ctx.ellipse(0,37,17,54,0,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.restore();
}
function drawStars(ctx,t){
  ctx.fillStyle="#d5e2ff";
  for(let i=0;i<95;i++){const x=hash(i+4)*W,y=hash(i+912)*510,r=.7+hash(i+96)*1.2;ctx.globalAlpha=(.15+.45*hash(i+114))*(.7+.3*Math.sin(t*.7+i));ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
}
function drawWorld(ctx,t,p){
  const shore=1-smooth(5.8,12.4,t);
  const surfaceY=mix(205, 75, smooth(7.8,16,t));
  const descent=smooth(7.4,13,t), deep=smooth(29,40,t);
  const bg=ctx.createLinearGradient(0,0,0,H); bg.addColorStop(0,"#101628");bg.addColorStop(.42,"#2857a4");bg.addColorStop(.78,"#1b2d6b");bg.addColorStop(1,"#101628");ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  ctx.fillStyle="#1b2d6b";ctx.globalAlpha=.76;ctx.fillRect(0,surfaceY+30,W,H-surfaceY-30);ctx.globalAlpha=1;
  const cameraScale=t<24?1+.0025*t:1.06-.006*(t-24);
  const cameraX=t<10?t*6:60+(t-10)*1.8;
  ctx.save();ctx.translate(W/2,H/2);ctx.scale(cameraScale,cameraScale);ctx.translate(-W/2-cameraX,-H/2);
  drawStars(ctx,t);
  // Broad painterly water layers and the receding surface.
  ctx.fillStyle="#1b2d6b";ctx.globalAlpha=.76;path(ctx,[[-400,surfaceY+30],[0,surfaceY+25],[280,surfaceY+24],[610,surfaceY+40],[980,surfaceY+22],[1320,surfaceY+36],[1630,surfaceY+18],[1920,surfaceY+32],[2320,surfaceY+28],[2320,H],[-400,H]],true);ctx.fill();ctx.globalAlpha=1;
  for(let band=0;band<4;band++){
    ctx.strokeStyle=band%2?"#d5e2ff":"#42dff5";ctx.globalAlpha=(.12-band*.022)*(1-descent*.72);ctx.lineWidth=2+band;
    ctx.beginPath();for(let x=0;x<=W;x+=24){const y=surfaceY+18+band*15+Math.sin(x*.012+t*1.7+band)*5+Math.sin(x*.004-t+band)*7;x?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();
  }ctx.globalAlpha=1;
  // Shore foreground melts away under the camera as it passes through the wave.
  if(shore>.005){
    const sandY=mix(745,1120,descent);ctx.fillStyle="#101628";path(ctx,[[0,sandY+85],[180,sandY+35],[390,sandY+66],[680,sandY+18],[940,sandY+54],[1270,sandY+25],[1540,sandY+62],[1920,sandY+18],[1920,H],[0,H]],true);ctx.fill();
    ctx.strokeStyle="#42dff5";ctx.lineWidth=13;ctx.globalAlpha=.9*shore;ctx.beginPath();for(let x=0;x<=W;x+=18){const y=sandY+14+Math.sin(x*.018+t*2.2)*8+Math.sin(x*.006-t)*9;x?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();ctx.globalAlpha=1;
    ctx.strokeStyle="#d5e2ff";ctx.lineWidth=3;ctx.globalAlpha=.35*shore;ctx.beginPath();for(let x=0;x<=W;x+=25){const y=sandY+26+Math.sin(x*.019+t*2.2+1)*7;x?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();ctx.globalAlpha=1;
  }
  // Surface light shafts fade naturally with depth.
  ctx.save();ctx.globalAlpha=.028*(1-descent);ctx.fillStyle="#d5e2ff";for(let i=0;i<5;i++){const x=220+i*360+t*9;path(ctx,[[x,surfaceY+20],[x+55,surfaceY+20],[x+250,H],[x+55,H]],true);ctx.fill();}ctx.restore();
  // Seeded plankton field. Disturbance pulses are short, isolated, and time based.
  const count=Math.round(mix(110,540,smooth(7,13,t))*(1-.08*smooth(33,40,t)));
  for(let i=0;i<count;i++){
    const z=hash(i+141), speed=.25+hash(i+220)*.9;
    const x=fract(hash(i+18)+t*(.006+speed*.004)+.03*Math.sin(t*.5+i))*W;
    const y=fract(hash(i+411)+t*(.003+speed*.006)+.02*Math.sin(t*.33+i*2))*H;
    const size=.8+hash(i+627)*2.2, pulse=Math.pow(Math.max(0,Math.sin(t*2.8+i*1.71)),12);
    const nearFish=(t>14&&t<24)?Math.exp(-Math.pow((x-(980+(t-18)*72))/175,2)-Math.pow((y-440)/150,2)):0;
    const nearTurtle=(t>22&&t<34)?Math.exp(-Math.pow((x-(890+(t-27)*48))/220,2)-Math.pow((y-620)/185,2)):0;
    const a=(.18+.22*z+pulse*.62+nearFish*.37+nearTurtle*.26)*(1-.28*descent);
    ctx.fillStyle=`rgba(66,223,245,${clamp(a,0,.9)})`;ctx.beginPath();ctx.arc(x,y,size*(1+pulse*1.8),0,Math.PI*2);ctx.fill();
    if((nearFish>.5||nearTurtle>.55)&&pulse>.76){ctx.strokeStyle=`rgba(66,223,245,${.4*pulse})`;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x-size*4,y+2);ctx.quadraticCurveTo(x,y-4,x+size*3,y);ctx.stroke();}
  }
  // Fish school passes left to right and banks together.
  if(t>13&&t<25){const u=clamp((t-13)/12), fx=-250+u*2400, fy=410+Math.sin(u*Math.PI*2)*80;for(let i=0;i<17;i++){const row=(i%5)-2,col=Math.floor(i/5);drawFish(ctx,fx-col*84+row*10,fy+row*42+col*18,1.05+hash(i+55)*.34,t*3+i*.48,(.82-.18*col)*smooth(13,15,t)*(1-smooth(22,25,t)));}}
  // Turtle enters after the school, then recedes for the final reveal.
  if(t>22&&t<41){const enter=smooth(22.4,25,t), retreat=smooth(31.7,39.8,t);const x=mix(-430,1080,enter)+t*12;const y=610+Math.sin(t*.7)*18;const scale=mix(1.3,.14,retreat);drawTurtle(ctx,x,y,scale,t*Math.PI/1,1-smooth(39.5,40.5,t));}
  // Tiny distant silhouettes reinforce scale in the last wide.
  if(t>30){for(let i=0;i<8;i++){const x=fract(hash(i+811)+t*.0015)*W,y=330+hash(i+991)*440;drawFish(ctx,x,y,.25+hash(i+122)*.32,t+i,.18*(1-deep*.35));}}
  // Delicate bubbles during entry, consistently seeded and rising.
  if(t>7&&t<17){ctx.strokeStyle="#d5e2ff";for(let i=0;i<25;i++){const x=hash(i+3001)*W+Math.sin(t+i)*17,y=fract(hash(i+4001)-t*(.055+hash(i+5001)*.025))*H,r=2+hash(i+6001)*5;ctx.globalAlpha=.18+.35*hash(i+7001);ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();}ctx.globalAlpha=1;}
  // Final dark vignette from the ink paint, leaving the center readable.
  const v=ctx.createRadialGradient(W*.5,H*.5,260,W*.5,H*.5,1050);v.addColorStop(0,"rgba(16,22,40,0)");v.addColorStop(1,`rgba(16,22,40,${.38+deep*.25})`);ctx.fillStyle=v;ctx.fillRect(0,0,W,H);
  ctx.restore();
}
export function createWorld(canvas){const ctx=canvas.getContext("2d",{alpha:false});return {render:(t)=>drawWorld(ctx,Math.max(0,Math.min(40,t)))}}
