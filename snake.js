document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreElement = document.getElementById('score');
    const finalScoreElement = document.getElementById('finalScore');
    const startScreen = document.getElementById('startScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const startBtn = document.getElementById('startBtn');
    const restartBtn = document.getElementById('restartBtn');

    // Game Config
    let gridSize = 20; // Size of one square
    let tileCount = 20; // Number of tiles per row/col (400px / 20 = 20)

    // Adjust canvas resolution for clearer rendering if needed, but keeping logical size simple
    // On mobile CSS scales it down, but internal resolution remains 400x400

    let velocityX = 0;
    let velocityY = 0;
    let score = 0;

    let snake = [];
    let food = { x: 15, y: 15 };

    let gameInterval;
    let isGameRunning = false;

    // Initialize Game State
    function resetGame() {
        snake = [{ x: 10, y: 10 }]; // Start in middle
        food = spawnFood();
        velocityX = 0;
        velocityY = 0;
        score = 0;
        scoreElement.textContent = score;
        isGameRunning = true;

        if (gameInterval) clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, 1000 / 10); // 10 FPS
    }

    function spawnFood() {
        return {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
    }

    function gameLoop() {
        update();
        draw();
    }

    function update() {
        // Move Snake
        const head = { x: snake[0].x + velocityX, y: snake[0].y + velocityY };

        // Check Wall Collision
        if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
            gameOver();
            return;
        }

        // Check Self Collision
        for (let i = 0; i < snake.length; i++) {
            if (head.x === snake[i].x && head.y === snake[i].y) {
                gameOver();
                return;
            }
        }

        snake.unshift(head); // Add new head

        // Check Food Collision
        if (head.x === food.x && head.y === food.y) {
            score += 10;
            scoreElement.textContent = score;
            food = spawnFood();
            // Don't pop tail -> snake grows
        } else {
            snake.pop(); // Remove tail
        }
    }

    function draw() {
        // Clear background
        ctx.fillStyle = '#16161f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Food
        ctx.fillStyle = '#ff4d4d'; // Red food
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff4d4d';
        ctx.beginPath();
        ctx.arc(
            food.x * gridSize + gridSize / 2,
            food.y * gridSize + gridSize / 2,
            gridSize / 2 - 2,
            0,
            Math.PI * 2
        );
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw Snake
        ctx.fillStyle = '#3a86ff'; // Blue snake
        snake.forEach((part, index) => {
            if (index === 0) {
                ctx.fillStyle = '#7b2cbf'; // Purple Head
            } else {
                ctx.fillStyle = '#3a86ff'; // Body
            }
            ctx.fillRect(part.x * gridSize, part.y * gridSize, gridSize - 2, gridSize - 2);
        });
    }

    function gameOver() {
        isGameRunning = false;
        clearInterval(gameInterval);
        finalScoreElement.textContent = score;
        gameOverScreen.classList.remove('hidden');
    }

    // Input Handling
    function handleInput(key) {
        if (!isGameRunning) return;

        switch (key) {
            case 'ArrowLeft':
                if (velocityX !== 1) { velocityX = -1; velocityY = 0; }
                break;
            case 'ArrowUp':
                if (velocityY !== 1) { velocityX = 0; velocityY = -1; }
                break;
            case 'ArrowRight':
                if (velocityX !== -1) { velocityX = 1; velocityY = 0; }
                break;
            case 'ArrowDown':
                if (velocityY !== -1) { velocityX = 0; velocityY = 1; }
                break;
        }
    }

    document.addEventListener('keydown', (e) => {
        handleInput(e.key);
    });

    // Mobile Controls
    document.getElementById('leftBtn').addEventListener('click', () => handleInput('ArrowLeft'));
    document.getElementById('upBtn').addEventListener('click', () => handleInput('ArrowUp'));
    document.getElementById('rightBtn').addEventListener('click', () => handleInput('ArrowRight'));
    document.getElementById('downBtn').addEventListener('click', () => handleInput('ArrowDown'));

    // Buttons
    startBtn.addEventListener('click', () => {
        startScreen.classList.add('hidden');
        resetGame();
        // Start moving right by default
        velocityX = 1;
        velocityY = 0;
    });

    restartBtn.addEventListener('click', () => {
        gameOverScreen.classList.add('hidden');
        resetGame();
        velocityX = 1;
        velocityY = 0;
    });
});
