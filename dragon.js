import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// --- Configuration ---
const WORLD_SIZE = 40; // Render distance/world size (blocks)
const BLOCK_SIZE = 50;
const GRAVITY = 30.0;
const JUMP_FORCE = 350; // Increased jump to feel punchy
const SPEED = 600;

// --- Globals ---
let camera, scene, renderer, controls;
let raycaster;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let canJump = false;
let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

// World Data: Map "x,y,z" -> BlockData
const worldMap = new Map();
const objects = []; // For raycasting interaction only

let currentBlockType = 'stone'; // Default

init();
animate();

function init() {
    // 1. Scene & Atmosphere
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 200, 1000);

    // 2. Advanced Lighting (Shadows & Realism)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(100, 200, 100);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 500;
    scene.add(dirLight);

    // 3. Camera & Controls
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.y = 150; // Start higher

    controls = new PointerLockControls(camera, document.body);

    // UI Listeners
    const instructions = document.getElementById('instructions');
    const blocker = document.getElementById('blocker');

    instructions.addEventListener('click', () => controls.lock());
    controls.addEventListener('lock', () => {
        instructions.style.display = 'none';
        blocker.style.display = 'none';
    });
    controls.addEventListener('unlock', () => {
        blocker.style.display = 'block';
        instructions.style.display = '';
    });
    scene.add(controls.getObject());

    // 4. Input Handling
    const onKeyDown = (e) => {
        switch (e.code) {
            case 'KeyW': moveForward = true; break;
            case 'KeyA': moveLeft = true; break;
            case 'KeyS': moveBackward = true; break;
            case 'KeyD': moveRight = true; break;
            case 'Space': if (canJump) { velocity.y += 18; canJump = false; } break; // Impulse physics
        }
    };
    const onKeyUp = (e) => {
        switch (e.code) {
            case 'KeyW': moveForward = false; break;
            case 'KeyA': moveLeft = false; break;
            case 'KeyS': moveBackward = false; break;
            case 'KeyD': moveRight = false; break;
        }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // 5. Materials (Procedural Textures)
    const textureLoader = new THREE.TextureLoader();
    const materials = {
        grass: new THREE.MeshStandardMaterial({
            map: generateTexture('#579e49', '#468b38'),
            roughness: 0.8
        }),
        dirt: new THREE.MeshStandardMaterial({
            map: generateTexture('#70543e', '#5c4533'),
            roughness: 1.0
        }),
        stone: new THREE.MeshStandardMaterial({
            map: generateTexture('#7d7d7d', '#666666'),
            roughness: 0.5
        }),
        wood: new THREE.MeshStandardMaterial({
            map: generateTexture('#855e42', '#6b4b35'),
            roughness: 0.7
        })
    };

    // 6. World Generation
    const geometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);

    // Generate Ground
    for (let x = -10; x < 10; x++) {
        for (let z = -10; z < 10; z++) {
            // Generate bedrock/floor
            createBlock(x, 0, z, 'grass', geometry, materials.grass);

            // Random hills
            if (Math.random() > 0.8) {
                createBlock(x, 1, z, 'stone', geometry, materials.stone);
                if (Math.random() > 0.5) {
                    createBlock(x, 2, z, 'wood', geometry, materials.wood);
                }
            }
        }
    }

    // 7. Interaction and Rendering
    raycaster = new THREE.Raycaster();
    document.addEventListener('mousedown', (e) => onMouseDown(e, geometry, materials));

    // Hotbar
    document.querySelectorAll('.slot').forEach(slot => {
        slot.addEventListener('click', () => {
            document.querySelector('.slot.active').classList.remove('active');
            slot.classList.add('active');
            currentBlockType = slot.dataset.type;
        });
    });

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true; // Enable shadows
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    window.addEventListener('resize', onWindowResize);
}

// --- Helper Functions ---

function createBlock(x, y, z, type, geometry, material) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x * BLOCK_SIZE, y * BLOCK_SIZE, z * BLOCK_SIZE);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // Store in Physics World
    const key = `${x},${y},${z}`;
    worldMap.set(key, { type, mesh });
    objects.push(mesh); // For raycasting
}

function removeBlock(mesh) {
    // Find coords
    const x = Math.round(mesh.position.x / BLOCK_SIZE);
    const y = Math.round(mesh.position.y / BLOCK_SIZE);
    const z = Math.round(mesh.position.z / BLOCK_SIZE);
    const key = `${x},${y},${z}`;

    if (worldMap.has(key)) {
        const block = worldMap.get(key);
        scene.remove(block.mesh);
        worldMap.delete(key);

        // Remove from objects array efficiently
        const index = objects.indexOf(block.mesh);
        if (index > -1) objects.splice(index, 1);
    }
}

// Procedural Simple Noise Texture
function generateTexture(color1, color2) {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 400; i++) {
        ctx.fillStyle = color2;
        const x = Math.floor(Math.random() * size);
        const y = Math.floor(Math.random() * size);
        ctx.fillRect(x, y, 2, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter; // Sharp pixels
    return texture;
}

function onMouseDown(event, geometry, materials) {
    if (!controls.isLocked) return;

    raycaster.setFromCamera(new THREE.Vector2(), camera);
    const intersects = raycaster.intersectObjects(objects, false);

    if (intersects.length > 0) {
        const hit = intersects[0];
        const obj = hit.object;

        if (event.button === 0) { // Left Click - Destroy
            removeBlock(obj);
        } else if (event.button === 2) { // Right Click - Place
            // Calculate new position based on face normal
            const pos = hit.point.clone().add(hit.face.normal.clone().multiplyScalar(BLOCK_SIZE / 2));
            const x = Math.round(pos.x / BLOCK_SIZE);
            const y = Math.round(pos.y / BLOCK_SIZE);
            const z = Math.round(pos.z / BLOCK_SIZE);

            // Check if player is inside this block position (Prevent getting stuck)
            const playerPos = controls.getObject().position;
            // Simple distance check (Player is 2 blocks high roughly)
            const dx = Math.abs((x * BLOCK_SIZE) - playerPos.x);
            const dy = Math.abs((y * BLOCK_SIZE) - (playerPos.y - BLOCK_SIZE)); // Feet check
            const dz = Math.abs((z * BLOCK_SIZE) - playerPos.z);

            if (dx < BLOCK_SIZE / 1.5 && dy < BLOCK_SIZE * 2 && dz < BLOCK_SIZE / 1.5) {
                return; // Too close to place
            }

            let mat;
            switch (currentBlockType) {
                case 'grass': mat = materials.grass; break;
                case 'dirt': mat = materials.dirt; break;
                case 'stone': mat = materials.stone; break;
                case 'wood': mat = materials.wood; break;
                default: mat = materials.stone;
            }
            createBlock(x, y, z, currentBlockType, geometry, mat);
        }
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- Physics Engine ---

// Player Bounding Box (Radius for X/Z, Height for Y)
const PLAYER_RADIUS = 15;
const PLAYER_HEIGHT = 1.6 * 50; // Camera height roughly

function checkCollision(pos) {
    // Convert player float position to grid coordinates to check surrounding blocks
    // This is a simplified discrete collision check.

    // Check Feet
    const minX = Math.floor((pos.x - PLAYER_RADIUS) / BLOCK_SIZE);
    const maxX = Math.floor((pos.x + PLAYER_RADIUS) / BLOCK_SIZE);
    const minY = Math.floor((pos.y - BLOCK_SIZE) / BLOCK_SIZE); // Block below feet
    const maxY = Math.floor((pos.y + 10) / BLOCK_SIZE); // Head level is slightly different
    const minZ = Math.floor((pos.z - PLAYER_RADIUS) / BLOCK_SIZE);
    const maxZ = Math.floor((pos.z + PLAYER_RADIUS) / BLOCK_SIZE);

    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            for (let z = minZ; z <= maxZ; z++) {
                if (worldMap.has(`${x},${y},${z}`)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function animate() {
    requestAnimationFrame(animate);

    const time = performance.now();
    const delta = (time - prevTime) / 1000;
    prevTime = time;

    if (controls.isLocked) {
        // Friction
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        // Gravity
        velocity.y -= GRAVITY * 10.0 * delta; // More realistic fall

        // Input
        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize(); // Consistent speed diagonally

        if (moveForward || moveBackward) velocity.z -= direction.z * SPEED * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * SPEED * delta;

        // Apply X/Z Movement separately to allow sliding along walls
        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);

        // --- Collision X/Z ---
        // Warning: PointerLockControls moves the camera directly. 
        // A true AABB engine would detach positions. 
        // For this task, we will do a simple ground check raycast for "Physics" feel
        // Implementing full swept-AABB is complex for this snippet, so we rely on checks.

        // Vertical Physics
        controls.getObject().position.y += (velocity.y * delta);

        // Ground Check
        if (controls.getObject().position.y < BLOCK_SIZE) {
            // Hard floor for infinite void safety
            velocity.y = Math.max(0, velocity.y);
            controls.getObject().position.y = BLOCK_SIZE;
            canJump = true;
        } else {
            // Check blocks below
            const pPos = controls.getObject().position;
            // Check center point below feet
            const gridY = Math.floor((pPos.y - BLOCK_SIZE * 0.5) / BLOCK_SIZE); // Feet are ~1.5 blocks down from cam
            const gridX = Math.round(pPos.x / BLOCK_SIZE);
            const gridZ = Math.round(pPos.z / BLOCK_SIZE);

            // Very simple "am I standing on a block?" check
            // Check block at feet
            if (worldMap.has(`${gridX},${gridY},${gridZ}`)) {
                const blockTopY = (gridY * BLOCK_SIZE) + (BLOCK_SIZE / 2) + (BLOCK_SIZE); // Top of block
                // Snap
                // Simplified: Just check if we fell INTO a block
                if (velocity.y < 0) {
                    velocity.y = 0;
                    // pPos.y = (gridY + 1) * BLOCK_SIZE + (BLOCK_SIZE); // + Camera Height
                    // Because collision is hard, we use a simpler 'floor' method logic
                    // Just keep jumping enabled if "near" ground
                    canJump = true;
                }
            }
        }
    }

    renderer.render(scene, camera);
}
