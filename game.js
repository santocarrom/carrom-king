const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const turnEl = document.getElementById("turn");
const statusEl = document.getElementById("status");
const resetBtn = document.getElementById("reset");

const W = canvas.width, H = canvas.height;
const board = {x:55,y:55,w:610,h:610};
const pocketR = 24, coinR = 14, strikerR = 17;
const pockets = [
  {x:board.x,y:board.y},{x:board.x+board.w,y:board.y},
  {x:board.x,y:board.y+board.h},{x:board.x+board.w,y:board.y+board.h}
];

let coins=[], striker, score=0, turn=1, moving=false, dragging=false, aim={x:0,y:0};

function resetGame(){
  coins=[]; score=0; turn=1; moving=false; dragging=false;
  const cx=W/2, cy=H/2;
  coins.push({x:cx,y:cy,r:coinR,color:"#d83b3b",type:"queen",vx:0,vy:0});
  const colors=["#171b22","#eee9df"];
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6, rr=34;
    coins.push({x:cx+Math.cos(a)*rr,y:cy+Math.sin(a)*rr,r:coinR,color:colors[i%2],type:"coin",vx:0,vy:0});
  }
  striker={x:cx,y:board.y+board.h-70,r:strikerR,vx:0,vy:0};
  updateUI(); draw();
}
function updateUI(){
  scoreEl.textContent=score; turnEl.textContent=turn;
}
function draw(){
  ctx.clearRect(0,0,W,H);
  // wood board
  ctx.fillStyle="#d8a35c"; ctx.fillRect(0,0,W,H);
  ctx.fillStyle="#f1c47d"; ctx.fillRect(board.x,board.y,board.w,board.h);
  ctx.strokeStyle="#6f3e20"; ctx.lineWidth=7; ctx.strokeRect(board.x,board.y,board.w,board.h);

  // inner lines
  ctx.strokeStyle="#8a542c"; ctx.lineWidth=2;
  const m=78;
  ctx.strokeRect(board.x+m,board.y+m,board.w-2*m,board.h-2*m);
  for(const p of pockets){ctx.beginPath();ctx.arc(p.x,p.y,pocketR,0,Math.PI*2);ctx.fillStyle="#161616";ctx.fill()}

  // baseline
  ctx.strokeStyle="#7d4826";ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(board.x+110,board.y+board.h-70);ctx.lineTo(board.x+board.w-110,board.y+board.h-70);ctx.stroke();
  ctx.beginPath();ctx.arc(W/2,board.y+board.h-70,8,0,Math.PI*2);ctx.stroke();

  for(const c of coins) drawPiece(c);
  drawPiece(striker);

  if(dragging && !moving){
    ctx.save();
    ctx.strokeStyle="#ffffff";ctx.globalAlpha=.65;ctx.lineWidth=4;
    ctx.beginPath();ctx.moveTo(striker.x,striker.y);ctx.lineTo(aim.x,aim.y);ctx.stroke();
    ctx.restore();
  }
}
function drawPiece(p){
  ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
  ctx.fillStyle=p.color||"#eee";ctx.fill();
  ctx.strokeStyle=p.type==="queen"?"#7a1111":"#7c522f";ctx.lineWidth=2;ctx.stroke();
  if(p.type==="queen"){ctx.fillStyle="#ffd45a";ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.fill()}
}
function pointerPos(e){
  const r=canvas.getBoundingClientRect();
  const clientX=e.touches?e.touches[0].clientX:e.clientX;
  const clientY=e.touches?e.touches[0].clientY:e.clientY;
  return {x:(clientX-r.left)*W/r.width,y:(clientY-r.top)*H/r.height};
}
function hitStriker(p){
  return Math.hypot(p.x-striker.x,p.y-striker.y)<striker.r+18;
}
function startAim(e){
  if(moving)return;
  const p=pointerPos(e);
  if(hitStriker(p)){dragging=true;aim=p;e.preventDefault()}
}
function moveAim(e){
  if(!dragging)return;
  aim=pointerPos(e);draw();e.preventDefault();
}
function shoot(e){
  if(!dragging)return;
  const p=pointerPos(e);dragging=false;
  let dx=striker.x-p.x,dy=striker.y-p.y;
  const len=Math.hypot(dx,dy)||1;
  const power=Math.min(len/10,16);
  striker.vx=dx/len*power; striker.vy=dy/len*power;
  moving=true; statusEl.textContent="শট চলছে…";
  e.preventDefault();
}
canvas.addEventListener("mousedown",startAim);
canvas.addEventListener("mousemove",moveAim);
canvas.addEventListener("mouseup",shoot);
canvas.addEventListener("touchstart",startAim,{passive:false});
canvas.addEventListener("touchmove",moveAim,{passive:false});
canvas.addEventListener("touchend",shoot,{passive:false});
resetBtn.onclick=resetGame;

function physics(){
  if(!moving)return;
  const pieces=[striker,...coins];
  for(const p of pieces){
    p.x+=p.vx;p.y+=p.vy;p.vx*=.985;p.vy*=.985;
    const minX=board.x+12+p.r,maxX=board.x+board.w-12-p.r;
    const minY=board.y+12+p.r,maxY=board.y+board.h-12-p.r;
    if(p.x<minX){p.x=minX;p.vx*=-.85}
    if(p.x>maxX){p.x=maxX;p.vx*=-.85}
    if(p.y<minY){p.y=minY;p.vy*=-.85}
    if(p.y>maxY){p.y=maxY;p.vy*=-.85}
  }

  // piece collisions
  for(let i=0;i<pieces.length;i++)for(let j=i+1;j<pieces.length;j++){
    const a=pieces[i],b=pieces[j],dx=b.x-a.x,dy=b.y-a.y;
    const d=Math.hypot(dx,dy),min=a.r+b.r;
    if(d>0 && d<min){
      const nx=dx/d,ny=dy/d,over=(min-d)/2;
      a.x-=nx*over;a.y-=ny*over;b.x+=nx*over;b.y+=ny*over;
      const rel=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
      if(rel>0){a.vx-=rel*nx;a.vy-=rel*ny;b.vx+=rel*nx;b.vy+=rel*ny}
    }
  }

  // pockets
  for(let i=coins.length-1;i>=0;i--){
    const c=coins[i];
    for(const p of pockets){
      if(Math.hypot(c.x-p.x,c.y-p.y)<pocketR-3){
        score += c.type==="queen"?3:1;
        coins.splice(i,1);
        break;
      }
    }
  }
  for(const p of pockets){
    if(Math.hypot(striker.x-p.x,striker.y-p.y)<pocketR-3){
      score=Math.max(0,score-1);
      striker.x=W/2;striker.y=board.y+board.h-70;striker.vx=striker.vy=0;
    }
  }

  const speed=Math.hypot(striker.vx,striker.vy)+coins.reduce((s,c)=>s+Math.hypot(c.vx,c.vy),0);
  if(speed<.18){
    for(const p of [striker,...coins])p.vx=p.vy=0;
    moving=false; turn++;
    if(coins.length===0) statusEl.textContent="🎉 আপনি ম্যাচ জিতেছেন!";
    else statusEl.textContent="পরের শট নিন";
    updateUI();
  }
  draw();
}
function loop(){physics();requestAnimationFrame(loop)}
resetGame();loop();
