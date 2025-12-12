const canvas = document.getElementById('worldCanvas');
const ctx = canvas.getContext('2d');

// Game State
let gameState = 'MENU'; // MENU, PLAYING, DIALOGUE
let lastTime = 0;

// Resize Canvas
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- Game Objects ---

const TILE_SIZE = 48;

const PLAYER = {
    x: 0,
    y: 0,
    width: 32,
    height: 32,
    speed: 200, // Pixels per second
    color: '#3a86ff',
    hp: 100,
    maxHp: 100,
    xp: 0,
    level: 1,
    direction: 'down'
};

// Simple Camera
const CAMERA = {
    x: 0,
    y: 0
};

// World Data (Simple randomized tiles for now)
const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 2000;
const TREES = [];
const COINS = [];
const NPCS = [
    { x: 400, y: 300, name: "Elder Sage", dialog: ["Greetings, traveler!", "The Dragon has been seen north of here.", "Be careful."] }
];

// Initialize World
function initWorld() {
    PLAYER.x = WORLD_WIDTH / 2;
    PLAYER.y = WORLD_HEIGHT / 2;

    // Generate random trees
    for (let i = 0; i < 50; i++) {
        TREES.push({
            x: Math.random() * WORLD_WIDTH,
            y: Math.random() * WORLD_HEIGHT,
            width: 40,
            height: 60
        });
    }

    // Generate Coins
    for (let i = 0; i < 20; i++) {
        COINS.push({
            x: Math.random() * WORLD_WIDTH,
            y: Math.random() * WORLD_HEIGHT,
            radius: 8,
            collected: false
        });
    }
}

// Input Handling
const keys = {
    w: false, a: false, s: false, d: false,
    ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false,
    e: false // Interact
};

window.addEventListener('keydown', e => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
    if (e.key === 'e') interact();
});

window.addEventListener('keyup', e => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

// Interaction Logic
function interact() {
    if (gameState === 'DIALOGUE') {
        // Next dialogue or close
        advanceDialogue();
        return;
    }

    // Check NPC proximity
    for (let npc of NPCS) {
        let dist = Math.hypot(PLAYER.x - npc.x, PLAYER.y - npc.y);
        if (dist < 80) {
            startDialogue(npc);
            return;
        }
    }
}

// --- Dialogue System ---
let currentDialogueNode = 0;
let currentNpc = null;

function startDialogue(npc) {
    gameState = 'DIALOGUE';
    currentNpc = npc;
    currentDialogueNode = 0;

    document.getElementById('dialogue-box').classList.remove('hidden');
    document.getElementById('dialogue-speaker').textContent = npc.name;
    document.getElementById('dialogue-text').textContent = npc.dialog[0];
}

function advanceDialogue() {
    currentDialogueNode++;
    if (currentDialogueNode >= currentNpc.dialog.length) {
        // End dialogue
        gameState = 'PLAYING';
        document.getElementById('dialogue-box').classList.add('hidden');
        return;
    }
    document.getElementById('dialogue-text').textContent = currentNpc.dialog[currentDialogueNode];
}

document.getElementById('dialogue-next').addEventListener('click', advanceDialogue);


// --- Main Loop ---

function update(dt) {
    if (gameState !== 'PLAYING') return;

    // Movement
    let dx = 0;
    let dy = 0;

    if (keys.w || keys.ArrowUp) dy = -1;
    if (keys.s || keys.ArrowDown) dy = 1;
    if (keys.a || keys.ArrowLeft) dx = -1;
    if (keys.d || keys.ArrowRight) dx = 1;

    // Normalize diagonal
    if (dx !== 0 && dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy);
        dx /= length;
        dy /= length;
    }

    PLAYER.x += dx * PLAYER.speed * dt;
    PLAYER.y += dy * PLAYER.speed * dt;

    // World Bounds
    PLAYER.x = Math.max(0, Math.min(PLAYER.x, WORLD_WIDTH));
    PLAYER.y = Math.max(0, Math.min(PLAYER.y, WORLD_HEIGHT));

    // Update Camera to follow player
    CAMERA.x = PLAYER.x - canvas.width / 2;
    CAMERA.y = PLAYER.y - canvas.height / 2;

    // Clamp Camera
    CAMERA.x = Math.max(0, Math.min(CAMERA.x, WORLD_WIDTH - canvas.width));
    CAMERA.y = Math.max(0, Math.min(CAMERA.y, WORLD_HEIGHT - canvas.height));

    // Collision Checks
    checkCoinCollection();
}

function checkCoinCollection() {
    COINS.forEach(coin => {
        if (!coin.collected) {
            let dist = Math.hypot(PLAYER.x - coin.x, PLAYER.y - coin.y);
            if (dist < PLAYER.width + coin.radius) {
                coin.collected = true;
                PLAYER.xp += 10;
                updateUI();
            }
        }
    });
}

function updateUI() {
    document.getElementById('playerXp').style.width = Math.min((PLAYER.xp / 100) * 100, 100) + '%';
    if (PLAYER.xp >= 100) {
        PLAYER.level++;
        PLAYER.xp = 0;
        document.getElementById('level').textContent = PLAYER.level;
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-CAMERA.x, -CAMERA.y);

    // Draw Ground (Grass)
    ctx.fillStyle = '#2d6a4f';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Draw Grid (Optional for depth)
    ctx.strokeStyle = '#1b4332';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= WORLD_WIDTH; x += TILE_SIZE) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, WORLD_HEIGHT);
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += TILE_SIZE) {
        ctx.moveTo(0, y);
        ctx.lineTo(WORLD_WIDTH, y);
    }
    ctx.stroke();

    // Draw Trees
    ctx.fillStyle = '#081c15';
    TREES.forEach(tree => {
        // Simple Triangle Tree
        ctx.beginPath();
        ctx.moveTo(tree.x, tree.y - tree.height);
        ctx.lineTo(tree.x - tree.width / 2, tree.y);
        ctx.lineTo(tree.x + tree.width / 2, tree.y);
        ctx.fill();
    });

    // Draw Coins
    ctx.fillStyle = '#ffd700';
    COINS.forEach(coin => {
        if (!coin.collected) {
            ctx.beginPath();
            ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2);
            ctx.fill();
            // Shine
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(coin.x - 2, coin.y - 2, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffd700';
        }
    });

    // Draw NPCs
    ctx.fillStyle = '#7b2cbf';
    NPCS.forEach(npc => {
        ctx.fillRect(npc.x - 16, npc.y - 32, 32, 48);
        // Label
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("?", npc.x, npc.y - 40);
        ctx.fillStyle = '#7b2cbf';
    });

    // Draw Player
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(PLAYER.x, PLAYER.y + 10, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = PLAYER.color;
    ctx.fillRect(PLAYER.x - 16, PLAYER.y - 16, 32, 32);

    ctx.restore();
}

function gameLoop(timestamp) {
    let dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    update(dt);
    draw();

    requestAnimationFrame(gameLoop);
}

// Start Game
document.getElementById('start-btn').addEventListener('click', () => {
    document.getElementById('start-screen').classList.add('hidden');
    gameState = 'PLAYING';
    initWorld();
    requestAnimationFrame(gameLoop);
});
