// Server URL
var serverUrl = 'http://gameoflife.test/server.php';

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Game variables
let playerId;
let players = {};
let food = [];

// Ajax function
function ajaxRequest(method, url, data) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onload = () => {
            try {
                resolve(JSON.parse(xhr.responseText));
            } catch (e) {
                reject('Invalid JSON response');
            }
        };
        xhr.onerror = () => reject(xhr.statusText);
        xhr.send(data ? JSON.stringify(data) : null);
    });
}

// Join game
ajaxRequest('POST', serverUrl, { type: 'join' })
    .then(data => {
        playerId = data.id;
        updateGameState(data.game_state);
        gameLoop();
    })
    .catch(error => console.error('Error joining game:', error));

// Update game state
function updateGameState(newState) {
    players = newState.players || {};
    food = Array.isArray(newState.food) ? newState.food : [];
}

// Game loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function update() {
    if (players[playerId]) {
        const player = players[playerId];
        const mouseX = mouse.x - canvas.width / 2 + player.x;
        const mouseY = mouse.y - canvas.height / 2 + player.y;

        const dx = mouseX - player.x;
        const dy = mouseY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            player.x += (dx / distance) * 3;
            player.y += (dy / distance) * 3;

            // Check for collisions with food
            food = food.filter(f => {
                const foodDx = f.x - player.x;
                const foodDy = f.y - player.y;
                const foodDistance = Math.sqrt(foodDx * foodDx + foodDy * foodDy);
                if (foodDistance < player.radius) {
                    player.radius += 0.1;  // Increase player size
                    return false;  // Remove eaten food
                }
                return true;
            });

            // Check for collisions with other players
            for (let id in players) {
                if (id !== playerId) {
                    const otherPlayer = players[id];
                    const playerDx = otherPlayer.x - player.x;
                    const playerDy = otherPlayer.y - player.y;
                    const playerDistance = Math.sqrt(playerDx * playerDx + playerDy * playerDy);
                    if (playerDistance < player.radius && player.radius > otherPlayer.radius * 1.2) {
                        player.radius += otherPlayer.radius / 2;  // Absorb other player
                        delete players[id];  // Remove eaten player
                    }
                }
            }

            ajaxRequest('POST', serverUrl, {
                type: 'update',
                id: playerId,
                x: player.x,
                y: player.y,
                radius: player.radius
            }).catch(error => console.error('Error updating player:', error));
        }
    }

    // Poll for updates
    ajaxRequest('GET', serverUrl)
        .then(data => {
            updateGameState(data.game_state);
        })
        .catch(error => console.error('Error getting game state:', error));
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (players[playerId]) {
        const player = players[playerId];
        ctx.save();
        ctx.translate(canvas.width / 2 - player.x, canvas.height / 2 - player.y);

        // Draw food
        ctx.fillStyle = '#AAAAAA';
        for (let f of food) {
            ctx.beginPath();
            ctx.arc(f.x, f.y, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw players
        for (let id in players) {
            const p = players[id];
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();

            // Draw player name or ID
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(id === playerId ? 'You' : id, p.x, p.y);
        }

        ctx.restore();
    }
}

// Mouse tracking
const mouse = { x: 0, y: 0 };
canvas.addEventListener('mousemove', (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
});