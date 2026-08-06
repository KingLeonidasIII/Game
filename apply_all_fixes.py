#!/usr/bin/env python3
"""
Apply all fixes to make the game work
"""

# Fix 1: index.html - Pass roomId to game.js
with open('public/index.html', 'r') as f:
    index_content = f.read()

index_content = index_content.replace(
    """    function showGameUI() {
      document.getElementById('lobby').style.display = 'none';
      document.getElementById('game-ui').style.display = 'block';
      
      // Load Phaser game
      const script = document.createElement('script');
      script.src = '/game.js';
      document.body.appendChild(script);
    }""",
    """    function showGameUI() {
      document.getElementById('lobby').style.display = 'none';
      document.getElementById('game-ui').style.display = 'block';
      
      // Pass roomId to game.js
      window.currentRoomId = currentRoomId;
      
      // Load Phaser game
      const script = document.createElement('script');
      script.src = '/game.js';
      document.body.appendChild(script);
    }"""
)

with open('public/index.html', 'w') as f:
    f.write(index_content)

print("Fixed index.html")

# Fix 2: game.js - Get roomId and auto-join
with open('public/game.js', 'r') as f:
    game_content = f.read()

# Add currentRoomId variable
game_content = game_content.replace(
    'let socket;',
    'let socket;\nlet currentRoomId = window.currentRoomId || null;'
)

# Auto-join room in connectToServer
game_content = game_content.replace(
    """function connectToServer() {
  socket = io();
  
  // Room events""",
    """function connectToServer() {
  socket = io();
  
  // If we have a roomId from index.html, join that room
  if (currentRoomId) {
    socket.emit('joinRoom', { roomId: currentRoomId, playerClass: 'warrior' });
  }
  
  // Room events"""
)

# Remove duplicate room handlers that cause infinite loop
game_content = game_content.replace(
    """  socket.on('roomCreated', (data) => {
    currentRoomId = data.roomId;
    document.getElementById('room-id').value = data.roomId;
    showGameUI();
    document.getElementById('status').textContent = 'Room created! ID: ' + data.roomId;
    document.getElementById('status').style.display = 'block';
    setTimeout(() => {
      document.getElementById('status').style.display = 'none';
    }, 3000);
  });

  socket.on('roomJoined', (data) => {
    currentRoomId = data.roomId;
    showGameUI();
    document.getElementById('status').textContent = 'Joined room: ' + data.roomId;
    document.getElementById('status').style.display = 'block';
    setTimeout(() => {
      document.getElementById('status').style.display = 'none';
    }, 3000);
  });""",
    """  socket.on('roomCreated', (data) => {
    currentRoomId = data.roomId;
  });

  socket.on('roomJoined', (data) => {
    currentRoomId = data.roomId;
  });"""
)

# Fix tileset image key
game_content = game_content.replace(
    "dungeonMap.addTilesetImage('tiles', null, 32, 32);",
    "dungeonMap.addTilesetImage('tiles', 'tiles', 32, 32);"
)

# Fill layer with floor tiles
game_content = game_content.replace(
    """  // Create a layer for the dungeon
  dungeonLayer = dungeonMap.createBlankLayer('dungeon', tiles, 0, 0, dungeon.grid[0].length, dungeon.grid.length);

  // Set tiles based on the dungeon grid""",
    """  // Create a layer for the dungeon
  dungeonLayer = dungeonMap.createBlankLayer('dungeon', tiles, 0, 0, dungeon.grid[0].length, dungeon.grid.length);

  // Fill the layer with floor tiles (0) first
  for (let y = 0; y < dungeon.grid.length; y++) {
    for (let x = 0; x < dungeon.grid[y].length; x++) {
      dungeonLayer.putTileAt(0, x, y); // Floor
    }
  }

  // Set tiles based on the dungeon grid"""
)

# Add camera setup
game_content = game_content.replace(
    """  player.setCollideWorldBounds(true);
  player.direction = playerData.direction || 'down';
  player.playerId = socket.id;""",
    """  player.setCollideWorldBounds(true);
  player.direction = playerData.direction || 'down';
  player.playerId = socket.id;
  
  // Set up camera to follow player
  game.scene.scenes[0].cameras.main.startFollow(player);
  game.scene.scenes[0].cameras.main.setBounds(0, 0, dungeon.grid[0].length * 32, dungeon.grid.length * 32);"""
)

# Increase game height
game_content = game_content.replace(
    "height: 600,",
    "height: 700,"
)

with open('public/game.js', 'w') as f:
    f.write(game_content)

print("Fixed game.js")
