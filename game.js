// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

// Game state
let gameState = 'start'; // start, playing, win, gameOver
let currentLevel = 1;
let score = 0;
let gameTime = 0;
let lastGlitchTime = 0;
let glitchDuration = 0;
let currentGlitch = null;
let glitchEndTime = 0;

// Dice system
let diceRollsRemaining = 2;
let activeSkill = null;
let skillEndTime = 0;

// Player
const player = {
    x: 50,
    y: 400,
    width: 30,
    height: 30,
    velX: 0,
    velY: 0,
    speed: 5,
    jumpForce: 12,
    onGround: false,
    color: '#0f0',
    shield: false,
    canPhase: false,
    originalSpeed: 5,
    originalJump: 12
};

// Controls state
const keys = {
    left: false,
    right: false,
    up: false
};

// Physics
let gravity = 0.5;
let originalGravity = 0.5;
let gravityDirection = 1;

// Obstacles array
let obstacles = [];

// Platforms array
let platforms = [];
let goalZone = { x: 750, y: 500, width: 40, height: 80 };

// Glitch definitions
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

// Level definitions
const levels = [
    {
        // Level 1: Learning Maze
        platforms: [
            { x: 0, y: 550, width: 800, height: 50 }, // ground
            { x: 250, y: 450, width: 200, height: 20 }, // mid platform
            { x: 500, y: 350, width: 200, height: 20 }  // upper platform
        ],
        obstacles: [
            { x: 300, y: 520, width: 40, height: 30, speed: 1, dir: 1, limitLeft: 250, limitRight: 450 }
        ]
    },
    {
        // Level 2: Split Path Maze
        platforms: [
            { x: 0, y: 550, width: 300, height: 50 }, // left ground
            { x: 400, y: 550, width: 400, height: 50 }, // right ground
            { x: 150, y: 450, width: 100, height: 20 }, // left mid
            { x: 550, y: 450, width: 100, height: 20 }, // right mid
            { x: 300, y: 350, width: 200, height: 20 }, // center bridge
            { x: 0, y: 350, width: 100, height: 20 }   // left upper
        ],
        obstacles: [
            { x: 200, y: 520, width: 40, height: 30, speed: 2, dir: 1, limitLeft: 50, limitRight: 300 },
            { x: 500, y: 520, width: 40, height: 30, speed: 2, dir: -1, limitLeft: 400, limitRight: 750 },
            { x: 350, y: 320, width: 40, height: 30, speed: 2, dir: 1, limitLeft: 300, limitRight: 500 }
        ]
    },
    {
        // Level 3: Chaos Maze
        platforms: [
            { x: 0, y: 550, width: 150, height: 50 }, // left ground
            { x: 650, y: 550, width: 150, height: 50 }, // right ground
            { x: 200, y: 480, width: 80, height: 20 }, // platform 1
            { x: 350, y: 420, width: 80, height: 20 }, // platform 2
            { x: 500, y: 360, width: 80, height: 20 }, // platform 3
            { x: 350, y: 280, width: 80, height: 20 }, // platform 4
            { x: 200, y: 200, width: 80, height: 20 }, // top platform
            { x: 0, y: 280, width: 80, height: 20 }    // far left platform
        ],
        obstacles: [
            { x: 700, y: 520, width: 40, height: 30, speed: 3, dir: -1, limitLeft: 650, limitRight: 750 },
            { x: 0, y: 520, width: 40, height: 30, speed: 3, dir: 1, limitLeft: 50, limitRight: 150 },
            { x: 250, y: 450, width: 40, height: 30, speed: 3, dir: -1, limitLeft: 200, limitRight: 330 },
            { x: 400, y: 390, width: 40, height: 30, speed: 3, dir: 1, limitLeft: 350, limitRight: 480 }
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

// Initialize level
function loadLevel(levelNum) {
    const level = levels[levelNum - 1];
    platforms = level.platforms.map(p => ({...p}));
    obstacles = level.obstacles.map(o => ({
        x: o.x,
        y: getPlatformY(o.x, o.y),
        width: o.width,
        height: o.height,
        speed: o.speed,
        dir: o.dir,
        limitLeft: o.limitLeft,
        limitRight: o.limitRight,
        originalSpeed: o.speed
    }));
    goalZone = { x: 750, y: getPlatformY(750, 500), width: 40, height: 80 };
    diceRollsRemaining = 2;
    updateUI();
}

function getPlatformY(x, defaultY) {
    for (let p of platforms) {
        if (x >= p.x && x <= p.x + p.width) {
            return p.y - 80; // Place obstacle on top of platform
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

// Reset player to start position
function resetPlayer() {
    player.x = 50;
    player.y = 400;
    player.velX = 0;
    player.velY = 0;
    player.speed = player.originalSpeed;
    player.jumpForce = player.originalJump;
    player.shield = false;
    player.canPhase = false;
    diceRollsRemaining = 2;
    activeSkill = null;
    currentGlitch = null;
    gravity = originalGravity;
    gravityDirection = 1;
}

// Roll dice
function rollDice() {
    if (gameState !== 'playing' || diceRollsRemaining <= 0) return;
    diceRollsRemaining--;
    const skill = skills[Math.floor(Math.random() * skills.length)];
    activateSkill(skill);
    updateUI();
}

// Activate skill
function activateSkill(skill) {
    activeSkill = skill;
    skillEndTime = Date.now() + skill.duration;

    if (skill.name === 'SHIELD') {
        player.shield = true;
    } else if (skill.name === 'SUPER SPEED') {
        player.speed *= 2;
    } else if (skill.name === 'HIGH JUMP') {
        player.jumpForce = 18;
    } else if (skill.name === 'SLOW TIME') {
        obstacles.forEach(o => o.speed = o.originalSpeed * 0.3);
    } else if (skill.name === 'PHASE MODE') {
        player.canPhase = true;
    }
}

// Deactivate skill
function deactivateSkill() {
    if (!activeSkill) return;
    if (activeSkill.name === 'SHIELD') {
        player.shield = false;
    } else if (activeSkill.name === 'SUPER SPEED') {
        player.speed = player.originalSpeed;
    } else if (activeSkill.name === 'HIGH JUMP') {
        player.jumpForce = player.originalJump;
    } else if (activeSkill.name === 'SLOW TIME') {
        obstacles.forEach(o => o.speed = o.originalSpeed);
    } else if (activeSkill.name === 'PHASE MODE') {
        player.canPhase = false;
    }
    activeSkill = null;
}

// Trigger random glitch
function triggerGlitch() {
    const glitch = glitches[Math.floor(Math.random() * glitches.length)];
    currentGlitch = glitch;
    glitchEndTime = Date.now() + glitch.duration;
    glitchDuration = glitch.duration;

    applyGlitch(glitch.effect);
    updateUI();
}

// Apply glitch effect
function applyGlitch(effect) {
    switch(effect) {
        case 'lowGravity':
            gravity = 0.2;
            break;
        case 'highGravity':
            gravity = 1.0;
            break;
        case 'reverseGravity':
            gravityDirection = -1;
            break;
        case 'speedBoost':
            player.speed = 8;
            break;
        case 'slowMode':
            player.speed = 2;
            break;
        case 'obstacleSpeedUp':
            obstacles.forEach(o => o.speed = o.originalSpeed * 2.5);
            break;
        case 'chaosMode':
            // Apply two random minor effects
            const minorEffects = ['speedBoost', 'slowMode', 'lowGravity', 'obstacleSpeedUp'];
            for (let i = 0; i < 2; i++) {
                const effect = minorEffects[Math.floor(Math.random() * minorEffects.length)];
                applyGlitch(effect);
            }
            break;
        // screenFlicker handled in draw, platformShift handled in update
    }
}

// Clear glitch effects
function clearGlitchEffects() {
    gravity = originalGravity;
    gravityDirection = 1;
    player.speed = player.originalSpeed;
    obstacles.forEach(o => o.speed = o.originalSpeed);
    currentGlitch = null;
    updateUI();
}

// Update UI
function updateUI() {
    document.getElementById('score').textContent = Math.floor(score);
    document.getElementById('level').textContent = currentLevel;
    document.getElementById('glitch').textContent = currentGlitch ? currentGlitch.name : 'None';
    document.getElementById('skill').textContent = activeSkill ? activeSkill.name : 'None';
    document.getElementById('dice-rolls').textContent = diceRollsRemaining;

    // Update skill timer
    if (activeSkill) {
        const remaining = Math.max(0, Math.floor((skillEndTime - Date.now()) / 1000));
        document.getElementById('skill').textContent = `${activeSkill.name} (${remaining}s)`;
    }
}

// Check collision between two rectangles
function checkCollision(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

// Update game
function update(deltaTime) {
    if (gameState !== 'playing') return;

    gameTime += deltaTime;
    score += deltaTime / 1000;

    // Handle glitch timing
    if (currentGlitch && Date.now() > glitchEndTime) {
        clearGlitchEffects();
    }

    // Random glitch trigger every 8-12 seconds
    if (!currentGlitch && Date.now() - lastGlitchTime > 8000 + Math.random() * 4000) {
        triggerGlitch();
        lastGlitchTime = Date.now();
    }

    // Skill timeout
    if (activeSkill && Date.now() > skillEndTime) {
        deactivateSkill();
    }

    // Movement (with possible inverted controls)
    let moveDir = 0;
    if (keys.left) moveDir += (currentGlitch && currentGlitch.effect === 'invertedControls') ? 1 : -1;
    if (keys.right) moveDir += (currentGlitch && currentGlitch.effect === 'invertedControls') ? -1 : 1;

    player.velX = moveDir * player.speed;

    // Apply gravity
    player.velY += gravity * gravityDirection;
    if (player.velY > 15) player.velY = 15;

    // Update position
    player.x += player.velX;
    player.y += player.velY;

    // Screen flicker effect
    let screenFlicker = currentGlitch && currentGlitch.effect === 'screenFlicker' && Math.floor(Date.now() / 100) % 2;

    // Platform collision
    player.onGround = false;
    for (let p of platforms) {
        // Check if player is colliding with platform from above
        if (player.x + player.width > p.x && player.x < p.x + p.width) {
            // Landing on top
            if (player.y + player.height >= p.y && player.y + player.height <= p.y + 20 && player.velY >= 0) {
                player.y = p.y - player.height;
                player.velY = 0;
                player.onGround = true;
            }
            // Hitting from below
            else if (player.y <= p.y + p.height && player.y >= p.y + p.height - 20 && player.velY < 0) {
                player.y = p.y + p.height;
                player.velY = 0;
            }
        }
    }

    // Screen boundaries
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    if (player.y > canvas.height) {
        // Fell off screen - game over or respawn
        if (player.onGround === false && gravityDirection > 0) {
            gameOver();
        }
    }

    // Platform Shift glitch
    if (currentGlitch && currentGlitch.effect === 'platformShift') {
        const shift = Math.sin(Date.now() / 500) * 3;
        platforms.forEach(p => {
            p.y += shift * 0.1;
        });
    }

    // Update obstacles
    for (let obs of obstacles) {
        obs.x += obs.speed * obs.dir;
        if (obs.x <= obs.limitLeft || obs.x + obs.width >= obs.limitRight) {
            obs.dir *= -1;
        }
    }

    // Check obstacle collisions
    for (let obs of obstacles) {
        if (player.canPhase) continue; // Phase mode ignores obstacles
        if (checkCollision(player, obs)) {
            if (player.shield) {
                player.shield = false;
                // Remove obstacle or reset its position
                obs.x = obs.x < canvas.width / 2 ? 0 : canvas.width - obs.width;
            } else {
                gameOver();
            }
        }
    }

    // Check goal
    if (checkCollision(player, goalZone)) {
        currentLevel++;
        if (currentLevel > 3) {
            winGame();
        } else {
            resetPlayer();
            loadLevel(currentLevel);
        }
    }

    // Reset if falling too far
    if (player.y > canvas.height + 100) {
        if (gravityDirection > 0) {
            gameOver();
        } else {
            player.y = 0;
            player.velY = 0;
        }
    }

    updateUI();
}

// Draw functions
function draw() {
    // Clear background
    if (currentGlitch && currentGlitch.effect === 'screenFlicker' && Math.floor(Date.now() / 100) % 2) {
        ctx.fillStyle = '#111';
    } else {
        ctx.fillStyle = '#050505';
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw platforms
    ctx.fillStyle = '#fff';
    for (let p of platforms) {
        ctx.fillRect(p.x, p.y, p.width, p.height);
        // Pixel border
        ctx.strokeStyle = '#888';
        ctx.strokeRect(p.x, p.y, p.width, p.height);
    }

    // Draw goal
    ctx.fillStyle = '#0f0';
    ctx.fillRect(goalZone.x, goalZone.y, goalZone.width, goalZone.height);
    ctx.strokeStyle = '#0f0';
    ctx.strokeRect(goalZone.x, goalZone.y, goalZone.width, goalZone.height);

    // Draw obstacles
    ctx.fillStyle = '#f00';
    for (let obs of obstacles) {
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        // Pixel border
        ctx.strokeStyle = '#800';
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
    }

    // Draw player
    if (gameState === 'playing') {
        ctx.fillStyle = player.shield ? '#0ff' : player.canPhase ? '#f0f' : '#0f0';
        ctx.fillRect(player.x, player.y, player.width, player.height);
        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(player.x, player.y, player.width, player.height);
        ctx.lineWidth = 1;

        // Glitch effect on player
        if (currentGlitch) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.fillRect(player.x, player.y, player.width, player.height);
        }
    }

    // Draw grid lines (retro effect)
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }
}

// Game loop
let lastTime = 0;
function gameLoop(timestamp = 0) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    update(deltaTime);
    draw();

    if (gameState === 'playing') {
        requestAnimationFrame(gameLoop);
    }
}

// Game over
function gameOver() {
    gameState = 'gameOver';
    document.getElementById('game-over-score').textContent = Math.floor(score);
    document.getElementById('game-over-screen').classList.remove('hidden');
}

// Win game
function winGame() {
    gameState = 'win';
    document.getElementById('final-score').textContent = Math.floor(score);
    document.getElementById('win-screen').classList.remove('hidden');
}

// Initialize
ctx.fillStyle = '#050505';
ctx.fillRect(0, 0, canvas.width, canvas.height);
