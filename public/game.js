// Game configuration
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 700,
  parent: 'game',
  scene: {
    preload: preload,
    create: create,
    update: update
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  }
};

// Game variables
let game;
try {
  game = new Phaser.Game(config);
} catch (e) {
  // Show error on screen if Phaser fails to initialize
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '50%';
  errorDiv.style.left = '50%';
  errorDiv.style.transform = 'translate(-50%, -50%)';
  errorDiv.style.color = 'red';
  errorDiv.style.backgroundColor = 'white';
  errorDiv.style.padding = '20px';
  errorDiv.style.zIndex = '9999';
  errorDiv.style.fontSize = '20px';
  errorDiv.style.textAlign = 'center';
  errorDiv.innerHTML = '<strong>Phaser Error:</strong><br>' + e.message;
  document.body.appendChild(errorDiv);
  throw e;
}
let socket;
let currentRoomId = window.currentRoomId || null;
let player;
let otherPlayers = {};
let enemies = {};
let loot = {};
let dungeonMap;
let dungeonLayer;
let cursors;
let currentRoomId = null;
let playerClass = 'warrior';
let playerData = {};
let abilityButtons = [];

// UI elements
let healthBar;
let manaBar;
let inventoryItems = [];

// Connect to Socket.io server (auto-connects to the same domain)
function connectToServer() {
  socket = io();
  
  // If we have a roomId from index.html, join that room
  if (currentRoomId) {
    socket.emit('joinRoom', { roomId: currentRoomId, playerClass: 'warrior' });
  }
  
  // Room events
  socket.on('roomCreated', (data) => {
    currentRoomId = data.roomId;
  });

  socket.on('roomJoined', (data) => {
    currentRoomId = data.roomId;
  });

  socket.on('error', (data) => {
    document.getElementById('status').textContent = 'Error: ' + data.message;
    document.getElementById('status').className = 'error';
    document.getElementById('status').style.display = 'block';
    setTimeout(() => {
      document.getElementById('status').style.display = 'none';
    }, 5000);
  });

  // Game state
  socket.on('gameState', (data) => {
    playerData = data.players[data.playerId];
    initializeGame(data);
  });

  socket.on('newPlayer', (data) => {
    addOtherPlayer(data.playerId, data.player);
    document.getElementById('status').textContent = 'Player joined: ' + data.playerId.substring(0, 8);
    document.getElementById('status').style.display = 'block';
    setTimeout(() => {
      document.getElementById('status').style.display = 'none';
    }, 2000);
  });

  socket.on('playerLeft', (data) => {
    removeOtherPlayer(data.playerId);
    document.getElementById('status').textContent = 'Player left: ' + data.playerId.substring(0, 8);
    document.getElementById('status').style.display = 'block';
    setTimeout(() => {
      document.getElementById('status').style.display = 'none';
    }, 2000);
  });

  socket.on('playerMoved', (data) => {
    if (otherPlayers[data.playerId]) {
      otherPlayers[data.playerId].x = data.x;
      otherPlayers[data.playerId].y = data.y;
      otherPlayers[data.playerId].direction = data.direction;
      otherPlayers[data.playerId].sprite.setPosition(data.x, data.y);
      otherPlayers[data.playerId].sprite.anims.play(`player_${data.direction}`, true);
    }
  });

  socket.on('enemyDamaged', (data) => {
    if (enemies[data.enemyId]) {
      enemies[data.enemyId].health = data.newHealth;
      updateEnemyHealthBar(data.enemyId);
    }
  });

  socket.on('enemyDied', (data) => {
    if (enemies[data.enemyId]) {
      enemies[data.enemyId].sprite.destroy();
      enemies[data.enemyId].healthBar.destroy();
      delete enemies[data.enemyId];
      addLoot(data.loot);
    }
  });

  socket.on('playerUsedItem', (data) => {
    if (data.playerId === socket.id) {
      const index = playerData.inventory.findIndex(item => item.id === data.itemId);
      if (index !== -1 && playerData.inventory[index].consumable) {
        playerData.inventory.splice(index, 1);
        updateInventory();
      }
    }
  });

  socket.on('lootPickedUp', (data) => {
    if (data.playerId === socket.id) {
      // Already handled by server
    } else {
      if (loot[data.lootId]) {
        loot[data.lootId].sprite.destroy();
        delete loot[data.lootId];
      }
    }
  });

  socket.on('gameStarted', () => {
    console.log('Game started!');
  });

  // Chat
  socket.on('chatMessage', (data) => {
    addChatMessage(data.playerId, data.message);
  });
}

// Initialize game with server data
function initializeGame(data) {
  try {
    // Clear existing game objects
  if (dungeonLayer) {
    dungeonLayer.destroy();
  }
  for (const id in otherPlayers) {
    otherPlayers[id].sprite.destroy();
  }
  for (const id in enemies) {
    enemies[id].sprite.destroy();
    enemies[id].healthBar.destroy();
  }
  for (const id in loot) {
    loot[id].sprite.destroy();
  }
  
  otherPlayers = {};
  enemies = {};
  loot = {};

  // Create dungeon map
  createDungeonMap(data.dungeon);

  // Create player
  createPlayer(data.players[data.playerId]);

  // Create other players
  for (const playerId in data.players) {
    if (playerId !== data.playerId) {
      addOtherPlayer(playerId, data.players[playerId]);
    }
  }

  // Create enemies
  for (const enemyId in data.enemies) {
    addEnemy(enemyId, data.enemies[enemyId]);
  }

  // Create loot
  for (const lootId in data.loot) {
    addLoot(data.loot[lootId]);
  }

  // Update UI
  updateHealthBar();
  updateManaBar();
  updateInventory();
  createAbilityButtons();
  } catch (e) {
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '50%';
    errorDiv.style.left = '50%';
    errorDiv.style.transform = 'translate(-50%, -50%)';
    errorDiv.style.color = 'red';
    errorDiv.style.backgroundColor = 'white';
    errorDiv.style.padding = '20px';
    errorDiv.style.zIndex = '9999';
    errorDiv.style.fontSize = '20px';
    errorDiv.style.textAlign = 'center';
    errorDiv.innerHTML = '<strong>Init Error:</strong><br>' + e.message + '<br>' + e.stack;
    document.body.appendChild(errorDiv);
  }

// Create dungeon map from server data
function createDungeonMap(dungeon) {
  const mapData = [];
  for (let y = 0; y < dungeon.grid.length; y++) {
    const row = [];
    for (let x = 0; x < dungeon.grid[y].length; x++) {
      const tile = dungeon.grid[y][x];
      row.push(tile === 1 ? 1 : 0); // 1 = wall, 0 = floor
    }
    mapData.push(row);
  }

  dungeonMap = game.scene.scenes[0].make.tilemap({
    tileWidth: 32,
    tileHeight: 32,
    width: dungeon.grid[0].length,
    height: dungeon.grid.length
  });

  const tiles = dungeonMap.addTilesetImage('tiles', 'tiles', 32, 32);
  dungeonLayer = dungeonMap.createBlankLayer('dungeon', tiles, 0, 0, dungeon.grid[0].length, dungeon.grid.length);

  // Fill the layer with floor tiles (0) first
  for (let y = 0; y < dungeon.grid.length; y++) {
    for (let x = 0; x < dungeon.grid[y].length; x++) {
      dungeonLayer.putTileAt(0, x, y); // Floor
    }
  }

  // Set tiles
  for (let y = 0; y < dungeon.grid.length; y++) {
    for (let x = 0; x < dungeon.grid[y].length; x++) {
      const tile = dungeon.grid[y][x];
      if (tile === 1) {
        dungeonLayer.putTileAt(1, x, y); // Wall
      } else if (tile === 2) {
        dungeonLayer.putTileAt(2, x, y); // Stairs down
      } else if (tile === 3) {
        dungeonLayer.putTileAt(3, x, y); // Stairs up
      }
    }
  }

  // Enable collision for walls
  dungeonLayer.setCollision(1, true);
}

// Create player sprite
function createPlayer(playerData) {
  player = game.scene.scenes[0].physics.add.sprite(playerData.x, playerData.y, 'player');
  player.setCollideWorldBounds(true);
  player.direction = playerData.direction || 'down';
  player.playerId = socket.id;
  
  // Set up camera to follow player
  game.scene.scenes[0].cameras.main.startFollow(player);
  game.scene.scenes[0].cameras.main.setBounds(0, 0, dungeon.grid[0].length * 32, dungeon.grid.length * 32);
  player.class = playerData.class;
  
  // Set player sprite based on class
  switch (playerData.class) {
    case 'warrior':
      player.setTint(0xff0000);
      break;
    case 'mage':
      player.setTint(0x0000ff);
      break;
    case 'rogue':
      player.setTint(0x00ff00);
      break;
  }

  // Create animations
  ['up', 'down', 'left', 'right'].forEach(direction => {
    game.scene.scenes[0].anims.create({
      key: `player_${direction}`,
      frames: [{ key: 'player', frame: getFrameForDirection(direction) }],
      frameRate: 10
    });
  });

  player.anims.play(`player_${player.direction}`, true);

  // Enable collision with dungeon
  game.scene.scenes[0].physics.add.collider(player, dungeonLayer);

  // Update player data
  playerData = playerData;
}

// Add other player
function addOtherPlayer(playerId, playerData) {
  const sprite = game.scene.scenes[0].physics.add.sprite(playerData.x, playerData.y, 'player');
  sprite.setCollideWorldBounds(true);
  
  // Set color based on class
  switch (playerData.class) {
    case 'warrior':
      sprite.setTint(0xff0000);
      break;
    case 'mage':
      sprite.setTint(0x0000ff);
      break;
    case 'rogue':
      sprite.setTint(0x00ff00);
      break;
  }

  otherPlayers[playerId] = {
    id: playerId,
    sprite: sprite,
    x: playerData.x,
    y: playerData.y,
    direction: playerData.direction || 'down',
    class: playerData.class
  };

  sprite.anims.play(`player_${otherPlayers[playerId].direction}`, true);
}

// Remove other player
function removeOtherPlayer(playerId) {
  if (otherPlayers[playerId]) {
    otherPlayers[playerId].sprite.destroy();
    delete otherPlayers[playerId];
  }
}

// Add enemy
function addEnemy(enemyId, enemyData) {
  const sprite = game.scene.scenes[0].physics.add.sprite(enemyData.x, enemyData.y, 'enemy');
  sprite.setCollideWorldBounds(true);
  
  // Set sprite based on enemy type
  switch (enemyData.type) {
    case 'slime':
      sprite.setTint(0x00ff00);
      break;
    case 'skeleton':
      sprite.setTint(0xffffff);
      break;
    case 'goblin':
      sprite.setTint(0xffaa00);
      break;
    case 'dragon':
      sprite.setTint(0xff0000);
      sprite.setScale(1.5);
      break;
  }

  // Create health bar
  const healthBar = game.scene.scenes[0].add.graphics();
  healthBar.fillStyle(0xff0000, 1);
  healthBar.fillRect(enemyData.x - 15, enemyData.y - 20, 30, 5);
  healthBar.fillStyle(0x00ff00, 1);
  healthBar.fillRect(enemyData.x - 15, enemyData.y - 20, 
                    30 * (enemyData.health / enemyData.maxHealth), 5);

  enemies[enemyId] = {
    id: enemyId,
    sprite: sprite,
    healthBar: healthBar,
    x: enemyData.x,
    y: enemyData.y,
    health: enemyData.health,
    maxHealth: enemyData.maxHealth,
    type: enemyData.type
  };

  // Enable collision with dungeon
  game.scene.scenes[0].physics.add.collider(sprite, dungeonLayer);
}

// Update enemy health bar
function updateEnemyHealthBar(enemyId) {
  if (enemies[enemyId]) {
    const enemy = enemies[enemyId];
    enemy.healthBar.clear();
    enemy.healthBar.fillStyle(0xff0000, 1);
    enemy.healthBar.fillRect(enemy.x - 15, enemy.y - 20, 30, 5);
    enemy.healthBar.fillStyle(0x00ff00, 1);
    enemy.healthBar.fillRect(enemy.x - 15, enemy.y - 20, 
                             30 * (enemy.health / enemy.maxHealth), 5);
  }
}

// Add loot
function addLoot(lootData) {
  const sprite = game.scene.scenes[0].physics.add.sprite(lootData.x, lootData.y, 'loot');
  
  // Set color based on loot type
  switch (lootData.type) {
    case 'health_potion':
      sprite.setTint(0xff0000);
      break;
    case 'mana_potion':
      sprite.setTint(0x0000ff);
      break;
    case 'gold':
      sprite.setTint(0xffd700);
      break;
    case 'sword':
    case 'staff':
    case 'bow':
      sprite.setTint(0xaaaaaa);
      break;
    case 'shield':
      sprite.setTint(0x888888);
      break;
  }

  loot[lootData.id] = {
    id: lootData.id,
    sprite: sprite,
    x: lootData.x,
    y: lootData.y,
    type: lootData.type,
    name: lootData.name
  };

  // Enable collision with player
  game.scene.scenes[0].physics.add.overlap(player, sprite, () => {
    socket.emit('playerPickupLoot', { roomId: currentRoomId, lootId: lootData.id });
  });
}

// Helper function for animations
function getFrameForDirection(direction) {
  switch (direction) {
    case 'up': return 0;
    case 'down': return 1;
    case 'left': return 2;
    case 'right': return 3;
    default: return 1;
  }
}

// Update health bar
function updateHealthBar() {
  if (!playerData) return;
  const healthPercent = (playerData.health / playerData.maxHealth) * 100;
  document.getElementById('health-fill').style.width = `${healthPercent}%`;
}

// Update mana bar
function updateManaBar() {
  if (!playerData || !playerData.maxMana) {
    document.getElementById('mana-bar').style.display = 'none';
    return;
  }
  document.getElementById('mana-bar').style.display = 'block';
  const manaPercent = (playerData.mana / playerData.maxMana) * 100;
  document.getElementById('mana-fill').style.width = `${manaPercent}%`;
}

// Update inventory
function updateInventory() {
  const inventoryDiv = document.getElementById('inventory');
  inventoryDiv.innerHTML = '<h3>Inventory</h3>';
  
  if (!playerData || !playerData.inventory) return;

  playerData.inventory.forEach(item => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'inventory-item';
    itemDiv.style.backgroundColor = item.color || '#666';
    itemDiv.innerHTML = `<span class="tooltip">${item.name}</span>`;
    itemDiv.onclick = () => {
      socket.emit('playerUseItem', { roomId: currentRoomId, itemId: item.id });
    };
    inventoryDiv.appendChild(itemDiv);
  });
}

// Create ability buttons
function createAbilityButtons() {
  const abilitiesDiv = document.getElementById('ability-buttons');
  abilitiesDiv.innerHTML = '<h3>Abilities</h3>';
  
  if (!playerData || !playerData.abilities) return;

  playerData.abilities.forEach(ability => {
    const button = document.createElement('button');
    button.className = 'ability-button';
    button.textContent = ability.replace('_', ' ');
    button.onclick = () => {
      // Find the closest enemy to attack
      let closestEnemy = null;
      let closestDistance = Infinity;
      
      for (const enemyId in enemies) {
        const enemy = enemies[enemyId];
        const distance = Phaser.Math.Distance.Between(
          player.x, player.y, enemy.x, enemy.y
        );
        if (distance < closestDistance) {
          closestDistance = distance;
          closestEnemy = enemy;
        }
      }
      
      if (closestEnemy && closestDistance < 100) {
        socket.emit('playerAttack', {
          roomId: currentRoomId,
          targetId: closestEnemy.id,
          ability: ability
        });
      } else {
        document.getElementById('status').textContent = 'No enemy in range!';
        document.getElementById('status').style.display = 'block';
        setTimeout(() => {
          document.getElementById('status').style.display = 'none';
        }, 2000);
      }
    };
    abilitiesDiv.appendChild(button);
  });
}

// Add chat message
function addChatMessage(playerId, message) {
  const chatMessages = document.getElementById('chat-messages');
  const messageDiv = document.createElement('div');
  messageDiv.innerHTML = `<strong>${playerId.substring(0, 8)}:</strong> ${message}`;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show game UI and hide lobby
function showGameUI() {
  document.getElementById('lobby').style.display = 'none';
  document.getElementById('game-ui').style.display = 'block';
}

// Show lobby and hide game UI
function showLobby() {
  document.getElementById('lobby').style.display = 'block';
  document.getElementById('game-ui').style.display = 'none';
}

// Phaser preload
function preload() {
  this.load.image('tiles', 'https://labs.phaser.io/assets/tilemaps/tiles/drawtiles1.png');
  this.load.spritesheet('player', 'https://labs.phaser.io/assets/sprites/phaser-dude.png', { frameWidth: 32, frameHeight: 48 });
  this.load.image('enemy', 'https://labs.phaser.io/assets/sprites/alien.png');
  this.load.image('loot', 'https://labs.phaser.io/assets/sprites/star.png');
}

// Phaser create
function create() {
  // Set up keyboard
  cursors = this.input.keyboard.createCursorKeys();

  // Connect to server
  connectToServer();

  // Set up class selection
  document.querySelectorAll('.class-option').forEach(option => {
    option.addEventListener('click', () => {
      document.querySelectorAll('.class-option').forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
      playerClass = option.dataset.class;
    });
  });

  // Set up room buttons
  document.getElementById('create-btn').addEventListener('click', () => {
    const roomId = document.getElementById('room-id').value;
    socket.emit('createRoom');
  });

  document.getElementById('join-btn').addEventListener('click', () => {
    const roomId = document.getElementById('room-id').value;
    if (!roomId) {
      document.getElementById('status').textContent = 'Please enter a Room ID';
      document.getElementById('status').className = 'error';
      document.getElementById('status').style.display = 'block';
      setTimeout(() => {
        document.getElementById('status').style.display = 'none';
      }, 2000);
      return;
    }
    socket.emit('joinRoom', { roomId, playerClass });
  });

  // Set up chat
  document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const message = e.target.value;
      if (message.trim()) {
        socket.emit('chatMessage', { roomId: currentRoomId, message });
        addChatMessage('You', message);
        e.target.value = '';
      }
    }
  });
}

// Phaser update
function update() {
  if (!player || !cursors) return;

  // Reset velocity
  player.setVelocity(0);

  // Handle movement
  let moved = false;
  let direction = player.direction;

  if (cursors.left.isDown) {
    player.setVelocityX(-160);
    direction = 'left';
    moved = true;
  } else if (cursors.right.isDown) {
    player.setVelocityX(160);
    direction = 'right';
    moved = true;
  }

  if (cursors.up.isDown) {
    player.setVelocityY(-160);
    direction = 'up';
    moved = true;
  } else if (cursors.down.isDown) {
    player.setVelocityY(160);
    direction = 'down';
    moved = true;
  }

  if (moved) {
    player.direction = direction;
    player.anims.play(`player_${direction}`, true);
    socket.emit('playerMovement', {
      roomId: currentRoomId,
      x: player.x,
      y: player.y,
      direction: direction
    });
  } else {
    player.anims.stop();
  }
}

// Start the game when the page loads
window.onload = () => {
  // Select warrior by default
  document.querySelector('.class-option[data-class="warrior"]').classList.add('selected');
};
