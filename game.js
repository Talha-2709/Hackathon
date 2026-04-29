// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 500;

// Parallax background layers
const bgLayers = [
    { color: '#0a0a0a', speed: 0.2, stars: generateStars(50) },
    { color: '#0f0f0f', speed: 0.5, stars: generateStars(30) }
];

function generateStars(count) {
    const stars = [];
    for (let i = 0; i < count; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 1,
            brightness: Math.random()
        });
    }
    return stars;
}

let bgOffset = 0;

// Particle system
const particles = [];

function createParticle(x, y, type) {
    const particle = {
        x, y,
        type,
        life: 1.0,
        maxLife: 1.0,
        velX: 0,
        velY: 0,
        size: 4,
        color: '#fff'
    };

    switch(type) {
        case 'jump':
            particle.velY = -Math.random() * 2;
            particle.velX = (Math.random() - 0.5) * 2;
            particle.color = '#88f';
            particle.size = 3;
            particle.life = 0.5;
            particle.maxLife = 0.5;
            break;
        case 'land':
            particle.velY = -Math.random() * 1.5;
            particle.velX = (Math.random() - 0.5) * 3;
            particle.color = '#888';
            particle.size = 2 + Math.random() * 2;
            particle.life = 0.3;
            particle.maxLife = 0.3;
            break;
        case 'glitch':
            particle.velY = Math.random() * 4 - 2;
            particle.velX = Math.random() * 4 - 2;
            particle.color = Math.random() > 0.5 ? '#f00' : '#0ff';
            particle.size = 2 + Math.random() * 3;
            particle.life = 0.2 + Math.random() * 0.3;
            particle.maxLife = particle.life;
            break;
        case 'shield':
            particle.angle = Math.random() * Math.PI * 2;
            particle.dist = 20 + Math.random() * 10;
            particle.color = '#0ff';
            particle.size = 2;
            particle.life = 0.8;
            particle.maxLife = 0.8;
            break;
        case 'speed':
            particle.velX = -3 - Math.random() * 2;
            particle.color = '#ff0';
            particle.size = 1 + Math.random() * 2;
            particle.life = 0.3 + Math.random() * 0.2;
            particle.maxLife = particle.life;
            break;
        case 'phase':
            particle.color = '#f0f';
            particle.size = 3 + Math.random() * 2;
            particle.life = 0.5 + Math.random() * 0.3;
            particle.maxLife = particle.life;
            particle.velX = (Math.random() - 0.5) * 2;
            particle.velY = (Math.random() - 0.5) * 2;
            break;
        case 'explosion':
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            particle.velX = Math.cos(angle) * speed;
            particle.velY = Math.sin(angle) * speed;
            particle.color = ['#f00', '#ff0', '#f80'][Math.floor(Math.random() * 3)];
            particle.size = 3 + Math.random() * 4;
            particle.life = 0.8 + Math.random() * 0.5;
            particle.maxLife = particle.life;
            break;
    }

    particles.push(particle);
}

function updateParticles(deltaTime) {
    const dt = deltaTime / 16.6; // Normalize to ~1 per frame

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= deltaTime / 1000;

        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }

        // Update position
        if (p.type === 'shield') {
            p.angle += 0.1;
            p.x = player.x + player.width/2 + Math.cos(p.angle) * p.dist;
            p.y = player.y + player.height/2 + Math.sin(p.angle) * p.dist;
        } else {
            p.x += p.velX * dt;
            p.y += p.velY * dt;
        }

        // Gravity for some types
        if (['jump', 'land', 'explosion', 'phase'].includes(p.type)) {
            p.velY += 0.2 * dt;
        }
    }
}

function drawParticles() {
    for (const p of particles) {
        const alpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
}

// Game state
let gameState = 'start';
let currentLevel = 1;
let score = 0;
let gameTime = 0;
let lastGlitchTime = 0;
let currentGlitch = null;
let glitchEndTime = 0;

// Dice system
let diceRollsRemaining = 2;
let activeSkill = null;
let skillEndTime = 0;

// Player
const player = {
    x: 50,
    y: 300,
    width: 30,
    height: 30,
    velX: 0,
    velY: 0,
    speed: 5,
    jumpForce: 12,
    onGround: false,
    shield: false,
    canPhase: false,
    originalSpeed: 5,
    originalJump: 12,
    facingRight: true,
    animTimer: 0
};

// Keys state
const keys = { left: false, right: false, up: false };

// Physics
let gravity = 0.5;
let originalGravity = 0.5;
let gravityDirection = 1;

// Arrays
let obstacles = [];
let platforms = [];
let spikes = [];
let goalZone = { x: 750, y: 370, width: 40, height: 80 };

// Glitches
const glitches = [
    { name: 'LOW GRAVITY', effect: 'lowGravity', duration: 10000 },
    { name: 'HIGH GRAVITY', effect: 'highGravity', duration: 10000 },
    { name: 'REVERSE GRAVITY', effect: 'reverseGravity', duration: 8000 },
    { name: 'INVERTED CONTROLS', effect: 'invertedControls', duration: 10000 },
    { name: 'SPEED BOOST', effect: 'speedBoost', duration: 10000 },
    { name: 'SLOW MODE', effect: 'slowMode', duration: 10000 },
    { name: 'OBSTACLE SPEED UP', effect: 'obstacleSpeedUp', duration: 10000 },
    { name: 'SCREEN FLICKER', effect: 'screenFlicker', duration: 8000 },
    { name: 'PLATFORM SHIFT', effect: 'platformShift', duration: 10000 },
    { name: 'CHAOS MODE', effect: 'chaosMode', duration: 12000 }
];

// Skills
const skills = [
    { name: 'SHIELD', duration: 9000 },
    { name: 'SUPER SPEED', duration: 9000 },
    { name: 'HIGH JUMP', duration: 9000 },
    { name: 'SLOW TIME', duration: 9000 },
    { name: 'PHASE MODE', duration: 9000 }
];

// Levels
const levels = [
    {
        platforms: [
            { x: 0, y: 450, width: 800, height: 50 },
            { x: 250, y: 350, width: 200, height: 20 },
            { x: 500, y: 250, width: 200, height: 20 },
            { x: 100, y: 250, width: 100, height: 20 }
        ],
        obstacles: [
            { x: 300, y: 420, width: 40, height: 30, speed: 1.2, dir: 1, limitLeft: 250, limitRight: 450 },
            { x: 600, y: 220, width: 40, height: 30, speed: 1, dir: -1, limitLeft: 500, limitRight: 700 }
        ],
        spikes: [
            { x: 0, y: 0, width: 100, height: 30 },
            { x: 700, y: 0, width: 100, height: 30 }
        ]
    },
    {
        platforms: [
            { x: 0, y: 450, width: 300, height: 50 },
            { x: 400, y: 450, width: 400, height: 50 },
            { x: 150, y: 350, width: 100, height: 20 },
            { x: 550, y: 350, width: 100, height: 20 },
            { x: 300, y: 250, width: 200, height: 20 },
            { x: 0, y: 250, width: 100, height: 20 }
        ],
        obstacles: [
            { x: 200, y: 420, width: 40, height: 30, speed: 2, dir: 1, limitLeft: 50, limitRight: 300 },
            { x: 500, y: 420, width: 40, height: 30, speed: 2, dir: -1, limitLeft: 400, limitRight: 750 },
            { x: 350, y: 220, width: 40, height: 30, speed: 2, dir: 1, limitLeft: 300, limitRight: 500 }
        ],
        spikes: [
            { x: 300, y: 0, width: 100, height: 30 },
            { x: 0, y: 0, width: 100, height: 30 }
        ]
    },
    {
        platforms: [
            { x: 0, y: 450, width: 150, height: 50 },
            { x: 650, y: 450, width: 150, height: 50 },
            { x: 200, y: 380, width: 80, height: 20 },
            { x: 350, y: 320, width: 80, height: 20 },
            { x: 500, y: 260, width: 80, height: 20 },
            { x: 350, y: 180, width: 80, height: 20 },
            { x: 200, y: 100, width: 80, height: 20 },
            { x: 0, y: 180, width: 80, height: 20 }
        ],
        obstacles: [
            { x: 700, y: 420, width: 40, height: 30, speed: 3, dir: -1, limitLeft: 650, limitRight: 750 },
            { x: 0, y: 420, width: 40, height: 30, speed: 3, dir: 1, limitLeft: 50, limitRight: 150 },
            { x: 250, y: 350, width: 40, height: 30, speed: 3, dir: -1, limitLeft: 200, limitRight: 330 },
            { x: 400, y: 290, width: 40, height: 30, speed: 3, dir: 1, limitLeft: 350, limitRight: 480 }
        ],
        spikes: [
            { x: 0, y: 0, width: 200, height: 30 },
            { x: 600, y: 0, width: 200, height: 30 }
        ]
    }
];

// Input handling
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') keys.left = true;
    if (e.key === 'ArrowRight') keys.right = true;
    if (e.key === 'ArrowUp' || e.key === ' ') {
        keys.up = true;
        if (player.onGround) {
            player.velY = -player.jumpForce;
            player.onGround = false;
            spawnJumpParticles();
        }
    }
    if (e.key === 'r' || e.key === 'R') rollDice();
    if (e.key === 'Enter') {
        if (gameState === 'start') startGame();
        else if (gameState === 'win' || gameState === 'gameOver') resetGame();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'ArrowRight') keys.right = false;
    if (e.key === 'ArrowUp' || e.key === ' ') keys.up = false;
});

// Level loading
function loadLevel(levelNum) {
    const level = levels[levelNum - 1];
    platforms = level.platforms.map(p => ({...p}));
    obstacles = level.obstacles.map(o => ({
        x: o.x,
        y: getPlatformY(o.x),
        width: o.width,
        height: o.height,
        speed: o.speed,
        dir: o.dir,
        limitLeft: o.limitLeft,
        limitRight: o.limitRight,
        originalSpeed: o.speed
    }));
    spikes = level.spikes ? level.spikes.map(s => ({...s})) : [];
    goalZone = { x: 750, y: getPlatformY(750, 370), width: 40, height: 80 };
    diceRollsRemaining = 2;
    updateUI();
}

function getPlatformY(x, defaultY = 400) {
    for (let p of platforms) {
        if (x >= p.x && x <= p.x + p.width) {
            return p.y - 80;
        }
    }
    return defaultY;
}

// Start game
function startGame() {
    gameState = 'playing';
    currentLevel = 1;
    score = 0;
    resetPlayer();
    loadLevel(currentLevel);
    document.getElementById('start-screen').classList.add('hidden');
    gameLoop();
}

// Reset game
function resetGame() {
    gameState = 'start';
    currentLevel = 1;
    score = 0;
    resetPlayer();
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('win-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
}

// Reset player
function resetPlayer() {
    player.x = 50;
    player.y = 300;
    player.velX = 0;
    player.velY = 0;
    player.speed = player.originalSpeed;
    player.jumpForce = player.originalJump;
    player.shield = false;
    player.canPhase = false;
    player.facingRight = true;
    player.animTimer = 0;
    diceRollsRemaining = 2;
    activeSkill = null;
    currentGlitch = null;
    gravity = originalGravity;
    gravityDirection = 1;
    bgOffset = 0;
}

// Dice roll
function rollDice() {
    if (gameState !== 'playing' || diceRollsRemaining <= 0) return;
    diceRollsRemaining--;
    const skill = skills[Math.floor(Math.random() * skills.length)];
    activateSkill(skill);
    updateUI();
}

function spawnJumpParticles() {
    for (let i = 0; i < 8; i++) createParticle(player.x + player.width/2, player.y + player.height, 'jump');
}

function spawnLandParticles() {
    for (let i = 0; i < 6; i++) createParticle(player.x + player.width/2 + (Math.random() - 0.5) * 20, player.y + player.height, 'land');
}

function spawnGlitchParticles() {
    for (let i = 0; i < 5; i++) createParticle(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        'glitch'
    );
}

function spawnSkillParticles(type) {
    for (let i = 0; i < 10; i++) createParticle(player.x + player.width/2, player.y + player.height/2, type);
}

function spawnExplosion(x, y) {
    for (let i = 0; i < 30; i++) createParticle(x, y, 'explosion');
}

function activateSkill(skill) {
    activeSkill = skill;
    skillEndTime = Date.now() + skill.duration;
    spawnSkillParticles(skill.name === 'SHIELD' ? 'shield' : skill.name === 'SUPER SPEED' ? 'speed' : skill.name === 'PHASE MODE' ? 'phase' : null);
    if (skill.name === 'SHIELD') player.shield = true;
    else if (skill.name === 'SUPER SPEED') player.speed *= 2;
    else if (skill.name === 'HIGH JUMP') player.jumpForce = 18;
    else if (skill.name === 'SLOW TIME') obstacles.forEach(o => o.speed = o.originalSpeed * 0.3);
    else if (skill.name === 'PHASE MODE') player.canPhase = true;
}

function deactivateSkill() {
    if (!activeSkill) return;
    if (activeSkill.name === 'SHIELD') player.shield = false;
    else if (activeSkill.name === 'SUPER SPEED') player.speed = player.originalSpeed;
    else if (activeSkill.name === 'HIGH JUMP') player.jumpForce = player.originalJump;
    else if (activeSkill.name === 'SLOW TIME') obstacles.forEach(o => o.speed = o.originalSpeed);
    else if (activeSkill.name === 'PHASE MODE') player.canPhase = false;
    activeSkill = null;
}

function triggerGlitch() {
    const glitch = glitches[Math.floor(Math.random() * glitches.length)];
    currentGlitch = glitch;
    glitchEndTime = Date.now() + glitch.duration;
    applyGlitch(glitch.effect);
    spawnGlitchParticles();
    updateUI();
}

function applyGlitch(effect) {
    switch(effect) {
        case 'lowGravity': gravity = 0.2; break;
        case 'highGravity': gravity = 1.0; break;
        case 'reverseGravity': gravityDirection = -1; break;
        case 'speedBoost': player.speed = 8; break;
        case 'slowMode': player.speed = 2; break;
        case 'obstacleSpeedUp': obstacles.forEach(o => o.speed = o.originalSpeed * 2.5); break;
        case 'chaosMode':
            const minor = ['speedBoost', 'slowMode', 'lowGravity', 'obstacleSpeedUp'];
            for (let i = 0; i < 2; i++) applyGlitch(minor[Math.floor(Math.random() * minor.length)]);
            break;
    }
}

function clearGlitchEffects() {
    gravity = originalGravity;
    gravityDirection = 1;
    player.speed = player.originalSpeed;
    obstacles.forEach(o => o.speed = o.originalSpeed);
    currentGlitch = null;
    updateUI();
}

function updateUI() {
    document.getElementById('score').textContent = Math.floor(score);
    document.getElementById('level').textContent = currentLevel;
    document.getElementById('glitch').textContent = currentGlitch ? currentGlitch.name : 'None';
    document.getElementById('dice-rolls').textContent = diceRollsRemaining;
    if (activeSkill) {
        const rem = Math.max(0, Math.floor((skillEndTime - Date.now()) / 1000));
        document.getElementById('skill').textContent = `${activeSkill.name} (${rem}s)`;
    } else {
        document.getElementById('skill').textContent = 'None';
    }
}

function checkCollision(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x &&
           a.y < b.y + b.height && a.y + a.height > b.y;
}

function drawPlayer() {
    const px = player.x, py = player.y, w = player.width, h = player.height;
    let legOffset = 0;
    if (!player.onGround) legOffset = 2;
    else if (Math.abs(player.velX) > 0) player.animTimer += 0.3, legOffset = Math.sin(player.animTimer) * 3;
    else player.animTimer = 0;

    let mainColor = '#0f0', accent = '#0a0';
    if (player.shield) mainColor = '#0ff', accent = '#088';
    else if (player.canPhase) mainColor = '#f0f', accent = '#808';

    // Body
    ctx.fillStyle = mainColor;
    ctx.fillRect(px + 4, py + 10, 22, 18);
    // Head
    ctx.fillRect(px + 6, py + 2, 18, 12);
    // Eyes
    ctx.fillStyle = '#000';
    const eyeX = player.facingRight ? px + 18 : px + 8;
    ctx.fillRect(eyeX, py + 6, 4, 4);
    // Legs
    ctx.fillStyle = accent;
    ctx.fillRect(px + 6, py + 28 + legOffset, 6, 8);
    ctx.fillRect(px + 18, py + 28 - legOffset, 6, 8);
    // Arms
    ctx.fillRect(px, py + 12, 4, 10);
    ctx.fillRect(px + 26, py + 12, 4, 10);

    // Glitch effect
    if (currentGlitch) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.25)';
        ctx.fillRect(px, py, w, h);
        for (let ly = py; ly < py + h; ly += 3) {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.moveTo(px, ly);
            ctx.lineTo(px + w, ly);
            ctx.stroke();
        }
    }

    // Shield
    if (player.shield) {
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px + w/2, py + h/2, 20, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
    }

    // Phase
    if (player.canPhase) {
        ctx.fillStyle = 'rgba(255, 0, 255, 0.15)';
        ctx.fillRect(px, py, w, h);
    }
}

function update(deltaTime) {
    if (gameState !== 'playing') return;

    gameTime += deltaTime;
    score += deltaTime / 1000;

    bgOffset += player.velX * 0.5;
    if (Math.abs(player.velX) > 0 && player.onGround) player.animTimer += 0.2;
    else player.animTimer = 0;

    // Update particles
    updateParticles(deltaTime);

    if (currentGlitch && Date.now() > glitchEndTime) clearGlitchEffects();
    if (!currentGlitch && Date.now() - lastGlitchTime > 8000 + Math.random() * 4000) {
        triggerGlitch();
        lastGlitchTime = Date.now();
    }
    if (activeSkill && Date.now() > skillEndTime) deactivateSkill();

    // Spawn glitch particles periodically
    if (currentGlitch && Math.random() < 0.1) {
        spawnGlitchParticles();
    }

    // Continuous phase particles
    if (player.canPhase && Math.random() < 0.2) {
        createParticle(player.x + Math.random() * player.width, player.y + Math.random() * player.height, 'phase');
    }

    // Continuous shield particles
    if (player.shield && Math.random() < 0.15) {
        createParticle(player.x + player.width/2, player.y + player.height/2, 'shield');
    }

    let moveDir = 0;
    if (keys.left) moveDir += (currentGlitch && currentGlitch.effect === 'invertedControls') ? 1 : -1, player.facingRight = false;
    if (keys.right) moveDir += (currentGlitch && currentGlitch.effect === 'invertedControls') ? -1 : 1, player.facingRight = true;
    player.velX = moveDir * player.speed;

    player.velY += gravity * gravityDirection;
    if (player.velY > 15) player.velY = 15;

    player.x += player.velX;
    player.y += player.velY;

    player.onGround = false;
    for (let p of platforms) {
        if (player.x + player.width > p.x && player.x < p.x + p.width) {
            if (player.y + player.height >= p.y && player.y + player.height <= p.y + 20 && player.velY >= 0) {
                player.y = p.y - player.height;
                player.velY = 0;
                if (!player.onGround) spawnLandParticles(); // Just landed
                player.onGround = true;
            } else if (player.y <= p.y + p.height && player.y >= p.y + p.height - 20 && player.velY < 0) {
                player.y = p.y + p.height;
                player.velY = 0;
            }
        }
    }

    // Top boundary
    if (player.y < 30) {
        player.y = 30;
        player.velY = 0;
    }

    // Screen boundaries
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    if (player.y > canvas.height && player.onGround === false && gravityDirection > 0) gameOver();

    if (currentGlitch && currentGlitch.effect === 'platformShift') {
        const shift = Math.sin(Date.now() / 500) * 3;
        platforms.forEach(p => p.y += shift * 0.1);
    }

    for (let obs of obstacles) {
        obs.x += obs.speed * obs.dir;
        if (obs.x <= obs.limitLeft || obs.x + obs.width >= obs.limitRight) obs.dir *= -1;
    }

    // Spike collision
    for (let s of spikes) if (checkCollision(player, s)) { gameOver(); return; }

    // Obstacle collision
    for (let obs of obstacles) {
        if (player.canPhase) continue;
        if (checkCollision(player, obs)) {
            if (player.shield) {
                player.shield = false;
                obs.x = obs.x < canvas.width / 2 ? 0 : canvas.width - obs.width;
            } else gameOver();
        }
    }

    if (checkCollision(player, goalZone)) {
        currentLevel++;
        if (currentLevel > 3) winGame();
        else {
            resetPlayer();
            loadLevel(currentLevel);
        }
    }

    if (player.y > canvas.height + 100) {
        if (gravityDirection > 0) gameOver();
        else player.y = 0, player.velY = 0;
    }

    updateUI();
}

function draw() {
    // Background
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Parallax layers
    for (let layer of bgLayers) {
        ctx.fillStyle = layer.color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let star of layer.stars) {
            const x = (star.x + bgOffset * layer.speed) % canvas.width;
            ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + star.brightness * 0.7})`;
            ctx.fillRect(x, star.y, star.size, star.size);
        }
    }

    // Draw platforms with gradients
    for (let p of platforms) {
        const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
        grad.addColorStop(0, '#ccc'); grad.addColorStop(0.3, '#888'); grad.addColorStop(1, '#444');
        ctx.fillStyle = grad;
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.fillStyle = '#eee'; ctx.fillRect(p.x, p.y, p.width, 4);
        ctx.fillStyle = '#222'; ctx.fillRect(p.x, p.y + p.height - 4, p.width, 4);
        ctx.strokeStyle = '#666'; ctx.lineWidth = 1; ctx.strokeRect(p.x, p.y, p.width, p.height);
    }

    // Draw spikes
    ctx.fillStyle = '#f80';
    for (let s of spikes) {
        for (let i = 0; i < s.width; i += 20) {
            ctx.beginPath();
            ctx.moveTo(s.x + i, s.y + s.height);
            ctx.lineTo(s.x + i + 10, s.y);
            ctx.lineTo(s.x + i + 20, s.y + s.height);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#f00'; ctx.lineWidth = 1; ctx.stroke();
        }
    }

    // Goal (pulsing)
    const goalPulse = 0.6 + Math.sin(Date.now() / 200) * 0.4;
    ctx.shadowColor = '#0f0'; ctx.shadowBlur = 15 * goalPulse;
    ctx.fillStyle = `rgba(0, 255, 0, ${goalPulse})`;
    ctx.fillRect(goalZone.x, goalZone.y, goalZone.width, goalZone.height);
    ctx.strokeStyle = '#0f0'; ctx.lineWidth = 3; ctx.strokeRect(goalZone.x, goalZone.y, goalZone.width, goalZone.height);
    ctx.shadowBlur = 0;

    // Obstacles (glowing)
    for (let obs of obstacles) {
        const pulse = 0.7 + Math.sin(Date.now() / 150) * 0.3;
        ctx.shadowColor = '#f00'; ctx.shadowBlur = 10 * pulse;
        ctx.fillStyle = `rgba(255, 50, 50, ${pulse})`;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeStyle = '#f00'; ctx.lineWidth = 2; ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
        ctx.shadowBlur = 0;
    }

    // Player
    drawPlayer();

    // Top boundary
    ctx.strokeStyle = '#f00'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 30); ctx.lineTo(canvas.width, 30); ctx.stroke();
    ctx.fillStyle = '#f00'; ctx.font = '8px monospace';
    ctx.fillText('DEATH ZONE ABOVE', 10, 20);

    // Grid
    ctx.strokeStyle = '#111'; ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 40) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    // Draw particles (on top)
    drawParticles();
}

let lastTime = 0;
function gameLoop(timestamp = 0) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    update(deltaTime);
    draw();
    if (gameState === 'playing') requestAnimationFrame(gameLoop);
}

function gameOver() {
    spawnExplosion(player.x + player.width/2, player.y + player.height/2);
    gameState = 'gameOver';
    document.getElementById('game-over-score').textContent = Math.floor(score);
    document.getElementById('game-over-screen').classList.remove('hidden');
}

function winGame() {
    gameState = 'win';
    document.getElementById('final-score').textContent = Math.floor(score);
    document.getElementById('win-screen').classList.remove('hidden');
}

ctx.fillStyle = '#050505';
ctx.fillRect(0, 0, canvas.width, canvas.height);
