const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 400;

// PLAYER
let player = {
  x: 50,
  y: 300,
  w: 20,
  h: 20,
  vx: 0,
  vy: 0,
  speed: 3,
  jump: -10,
  grounded: false
};

// CONTROLS
let keys = {};
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// LEVELS
let levelIndex = 0;

const levels = [
  {
    platforms: [{x:0,y:350,w:800,h:50},{x:200,y:300,w:100,h:10}],
    obstacles: [{x:400,y:330,w:20,h:20,dir:1,speed:1}]
  },
  {
    platforms: [{x:0,y:350,w:800,h:50},{x:150,y:280,w:100,h:10},{x:400,y:250,w:100,h:10}],
    obstacles: [
      {x:300,y:330,w:20,h:20,dir:1,speed:2},
      {x:500,y:230,w:20,h:20,dir:-1,speed:2}
    ]
  },
  {
    platforms: [{x:0,y:350,w:800,h:50},{x:200,y:300,w:80,h:10},{x:350,y:250,w:80,h:10},{x:550,y:200,w:80,h:10}],
    obstacles: [
      {x:300,y:330,w:20,h:20,dir:1,speed:3},
      {x:500,y:230,w:20,h:20,dir:-1,speed:3},
      {x:650,y:180,w:20,h:20,dir:1,speed:3}
    ]
  }
];

// GAME STATE
let gravity = 0.5;
let score = 0;

// GLITCH SYSTEM
let glitchTimer = 0;
let glitchText = "";
let inverted = false;

// SKILLS
let skill = null;
let skillTimer = 0;
let skillCooldown = 0;
let shield = false;

// COLLISION
function collide(a,b){
  return a.x < b.x+b.w &&
         a.x+a.w > b.x &&
         a.y < b.y+b.h &&
         a.y+a.h > b.y;
}

// INPUT
function handleInput(){
  let left = inverted ? keys["ArrowRight"] : keys["ArrowLeft"];
  let right = inverted ? keys["ArrowLeft"] : keys["ArrowRight"];

  player.vx = 0;

  if(left) player.vx = -player.speed;
  if(right) player.vx = player.speed;

  if(keys[" "] && player.grounded){
    player.vy = player.jump;
    player.grounded = false;
  }

  if(keys["r"] && skillCooldown <= 0){
    rollSkill();
  }
}

// SKILL SYSTEM
function rollSkill(){
  const skills = ["shield","speed","lowgrav","slow","phase"];
  skill = skills[Math.floor(Math.random()*skills.length)];
  skillTimer = 600;
  skillCooldown = 900;

  if(skill === "shield") shield = true;
}

function applySkill(){
  if(skillTimer > 0){
    skillTimer--;

    if(skill === "speed") player.speed = 6;
    else player.speed = 3;

    if(skill === "lowgrav") gravity = 0.2;

  } else {
    skill = null;
    player.speed = 3;
    gravity = 0.5;
    shield = false;
  }

  if(skillCooldown > 0) skillCooldown--;
}

// GLITCH SYSTEM
function applyGlitch(){
  glitchTimer--;

  if(glitchTimer <= 0){
    glitchTimer = 600;

    let g = Math.floor(Math.random()*6);

    switch(g){
      case 0: gravity = 0.2; glitchText="LOW GRAVITY"; break;
      case 1: gravity = 1; glitchText="HIGH GRAVITY"; break;
      case 2: inverted = !inverted; glitchText="INVERTED CONTROLS"; break;
      case 3: player.speed = 6; glitchText="SPEED BOOST"; break;
      case 4: player.speed = 1.5; glitchText="SLOW MODE"; break;
      case 5: glitchText="CHAOS"; gravity = Math.random(); break;
    }
  }
}

// UPDATE
function update(){
  handleInput();

  player.vy += gravity;
  player.x += player.vx;
  player.y += player.vy;

  player.grounded = false;

  let level = levels[levelIndex];

  // platforms
  for(let p of level.platforms){
    if(collide(player,p)){
      player.y = p.y - player.h;
      player.vy = 0;
      player.grounded = true;
    }
  }

  // obstacles
  for(let o of level.obstacles){
    o.x += o.speed * o.dir;

    if(o.x < 0 || o.x > canvas.width - o.w){
      o.dir *= -1;
    }

    if(collide(player,o)){
      if(shield){
        shield = false;
      } else if(skill !== "phase"){
        reset();
      }
    }
  }

  // next level
  if(player.x > 750){
    levelIndex++;
    player.x = 50;
    if(levelIndex >= levels.length){
      alert("You Win!");
      reset();
    }
  }

  applyGlitch();
  applySkill();

  score++;
}

// RESET
function reset(){
  player.x = 50;
  player.y = 300;
  levelIndex = 0;
  score = 0;
}

// DRAW
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // player
  ctx.fillStyle = "lime";
  ctx.fillRect(player.x,player.y,player.w,player.h);

  let level = levels[levelIndex];

  // platforms
  ctx.fillStyle = "white";
  for(let p of level.platforms){
    ctx.fillRect(p.x,p.y,p.w,p.h);
  }

  // obstacles
  ctx.fillStyle = "red";
  for(let o of level.obstacles){
    ctx.fillRect(o.x,o.y,o.w,o.h);
  }

  // UI
  ctx.fillStyle = "white";
  ctx.fillText("Score: " + score, 10,20);
  ctx.fillText("Level: " + (levelIndex+1), 10,40);
  ctx.fillText("Glitch: " + glitchText, 10,60);
  ctx.fillText("Skill: " + (skill || "None"), 10,80);
}

// LOOP
function loop(){
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
