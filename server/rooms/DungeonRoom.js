const { v4: uuidv4 } = require('uuid');
const DungeonGenerator = require('../utils/DungeonGenerator');
const Player = require('../models/Player');
const Enemy = require('../models/Enemy');
const Loot = require('../models/Loot');

class DungeonRoom {
  constructor(roomId, io) {
    this.roomId = roomId;
    this.io = io;
    this.players = {}; // { playerId: Player }
    this.enemies = {}; // { enemyId: Enemy }
    this.loot = {}; // { lootId: Loot }
    this.dungeon = null;
    this.maxPlayers = 4;
    this.gameState = 'lobby'; // 'lobby', 'playing', 'gameOver'
    this.generateDungeon();
  }

  generateDungeon() {
    this.dungeon = DungeonGenerator.generate(20, 20);
    this.spawnEnemies();
    this.spawnLoot();
  }

  spawnEnemies() {
    const enemyTypes = ['slime', 'skeleton', 'goblin'];
    const enemyCount = Math.floor(Math.random() * 5) + 3; // 3-7 enemies
    
    for (let i = 0; i < enemyCount; i++) {
      const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      const position = this.getRandomValidPosition();
      const enemy = new Enemy(uuidv4(), type, position.x, position.y);
      this.enemies[enemy.id] = enemy;
    }
  }

  spawnLoot() {
    const lootTypes = ['health_potion', 'mana_potion', 'gold', 'sword', 'shield'];
    const lootCount = Math.floor(Math.random() * 5) + 2; // 2-6 loot items
    
    for (let i = 0; i < lootCount; i++) {
      const type = lootTypes[Math.floor(Math.random() * lootTypes.length)];
      const position = this.getRandomValidPosition();
      const loot = new Loot(uuidv4(), type, position.x, position.y);
      this.loot[loot.id] = loot;
    }
  }

  getRandomValidPosition() {
    let x, y;
    do {
      x = Math.floor(Math.random() * this.dungeon.width);
      y = Math.floor(Math.random() * this.dungeon.height);
    } while (this.dungeon.grid[y][x] === 1); // 1 = wall
    
    return { x: x * 32, y: y * 32 }; // Convert grid to pixel coordinates
  }

  addPlayer(playerId, socket, playerClass = 'warrior') {
    if (this.isFull()) {
      return false;
    }

    const spawnPosition = this.getRandomValidPosition();
    const player = new Player(
      playerId,
      playerClass,
      spawnPosition.x,
      spawnPosition.y
    );
    this.players[playerId] = player;
    player.socket = socket;

    // Send initial game state to the new player
    socket.emit('gameState', {
      roomId: this.roomId,
      playerId: playerId,
      players: this.getPlayersData(),
      enemies: this.getEnemiesData(),
      loot: this.getLootData(),
      dungeon: this.dungeon
    });

    // Broadcast new player to others in the room
    socket.to(this.roomId).emit('newPlayer', {
      playerId: playerId,
      player: player.getData()
    });

    // Join the room
    socket.join(this.roomId);

    // Start the game if enough players
    if (this.gameState === 'lobby' && Object.keys(this.players).length >= 2) {
      this.startGame();
    }

    return true;
  }

  removePlayer(playerId) {
    if (this.players[playerId]) {
      const socket = this.players[playerId].socket;
      delete this.players[playerId];
      
      // Broadcast player left
      this.io.to(this.roomId).emit('playerLeft', { playerId });
      
      // Leave the room
      if (socket) {
        socket.leave(this.roomId);
      }

      // End game if no players left
      if (this.isEmpty()) {
        this.gameState = 'gameOver';
      }
    }
  }

  isFull() {
    return Object.keys(this.players).length >= this.maxPlayers;
  }

  isEmpty() {
    return Object.keys(this.players).length === 0;
  }

  startGame() {
    this.gameState = 'playing';
    this.io.to(this.roomId).emit('gameStarted');
  }

  handlePlayerMovement(playerId, data) {
    const player = this.players[playerId];
    if (!player) return;

    // Update player position
    player.x = data.x;
    player.y = data.y;
    player.direction = data.direction;

    // Check for collisions with loot
    for (const lootId in this.loot) {
      const loot = this.loot[lootId];
      if (this.checkCollision(player, loot)) {
        this.io.to(this.roomId).emit('playerPickupLoot', {
          playerId,
          lootId
        });
        break;
      }
    }

    // Broadcast movement to others
    this.io.to(this.roomId).emit('playerMoved', {
      playerId,
      x: player.x,
      y: player.y,
      direction: player.direction
    });
  }

  handlePlayerAttack(playerId, data) {
    const { targetId, ability } = data;
    const player = this.players[playerId];
    if (!player) return;

    // Check if target is an enemy
    const enemy = this.enemies[targetId];
    if (enemy) {
      const damage = player.getAttackDamage(ability);
      enemy.takeDamage(damage);

      // Broadcast attack
      this.io.to(this.roomId).emit('enemyDamaged', {
        enemyId: enemy.id,
        damage,
        newHealth: enemy.health
      });

      // Check if enemy is dead
      if (enemy.health <= 0) {
        this.handleEnemyDeath(enemy.id);
      }
    }
  }

  handleEnemyDeath(enemyId) {
    const enemy = this.enemies[enemyId];
    if (!enemy) return;

    // Spawn loot on enemy death
    const lootType = Math.random() < 0.5 ? 'health_potion' : 'gold';
    const loot = new Loot(uuidv4(), lootType, enemy.x, enemy.y);
    this.loot[loot.id] = loot;

    // Broadcast enemy death and new loot
    this.io.to(this.roomId).emit('enemyDied', {
      enemyId,
      loot: loot.getData()
    });

    // Remove the enemy
    delete this.enemies[enemyId];
  }

  handlePlayerUseItem(playerId, data) {
    const { itemId } = data;
    const player = this.players[playerId];
    if (!player) return;

    // Find the item in the player's inventory
    const itemIndex = player.inventory.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return;

    const item = player.inventory[itemIndex];
    player.useItem(item);

    // Remove the item if it's consumable
    if (item.consumable) {
      player.inventory.splice(itemIndex, 1);
    }

    // Broadcast item usage
    this.io.to(this.roomId).emit('playerUsedItem', {
      playerId,
      itemId,
      itemType: item.type
    });
  }

  handlePlayerPickupLoot(playerId, data) {
    const { lootId } = data;
    const player = this.players[playerId];
    const loot = this.loot[lootId];

    if (!player || !loot) return;

    // Add loot to player's inventory
    player.addToInventory(loot);

    // Remove loot from the world
    delete this.loot[lootId];

    // Broadcast loot pickup
    this.io.to(this.roomId).emit('lootPickedUp', {
      playerId,
      lootId
    });
  }

  checkCollision(entity1, entity2) {
    const distance = Math.sqrt(
      Math.pow(entity1.x - entity2.x, 2) + 
      Math.pow(entity1.y - entity2.y, 2)
    );
    return distance < 32; // Simple circle collision (32 = tile size)
  }

  getPlayersData() {
    const data = {};
    for (const playerId in this.players) {
      data[playerId] = this.players[playerId].getData();
    }
    return data;
  }

  getEnemiesData() {
    const data = {};
    for (const enemyId in this.enemies) {
      data[enemyId] = this.enemies[enemyId].getData();
    }
    return data;
  }

  getLootData() {
    const data = {};
    for (const lootId in this.loot) {
      data[lootId] = this.loot[lootId].getData();
    }
    return data;
  }
}

module.exports = DungeonRoom;
