const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const DungeonRoom = require('./rooms/DungeonRoom');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static files from public/
app.use(express.static('public'));

// Store all active dungeon rooms
const rooms = {};

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Create or join a room
  socket.on('createRoom', () => {
    const roomId = uuidv4();
    const room = new DungeonRoom(roomId, io);
    rooms[roomId] = room;
    room.addPlayer(socket.id, socket);
    socket.emit('roomCreated', { roomId });
    console.log(`Room created: ${roomId}`);
  });

  socket.on('joinRoom', (data) => {
    const { roomId, playerClass } = data;
    const room = rooms[roomId];
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    if (room.isFull()) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }

    room.addPlayer(socket.id, socket, playerClass);
    socket.emit('roomJoined', { roomId, playerId: socket.id });
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on('leaveRoom', (data) => {
    const { roomId } = data;
    const room = rooms[roomId];
    
    if (room) {
      room.removePlayer(socket.id);
      if (room.isEmpty()) {
        delete rooms[roomId];
        console.log(`Room ${roomId} deleted (empty)`);
      }
    }
  });

  // Handle player input
  socket.on('playerMovement', (data) => {
    const { roomId, x, y, direction } = data;
    const room = rooms[roomId];
    if (room) {
      room.handlePlayerMovement(socket.id, { x, y, direction });
    }
  });

  socket.on('playerAttack', (data) => {
    const { roomId, targetId, ability } = data;
    const room = rooms[roomId];
    if (room) {
      room.handlePlayerAttack(socket.id, { targetId, ability });
    }
  });

  socket.on('playerUseItem', (data) => {
    const { roomId, itemId } = data;
    const room = rooms[roomId];
    if (room) {
      room.handlePlayerUseItem(socket.id, { itemId });
    }
  });

  socket.on('playerPickupLoot', (data) => {
    const { roomId, lootId } = data;
    const room = rooms[roomId];
    if (room) {
      room.handlePlayerPickupLoot(socket.id, { lootId });
    }
  });

  // Handle chat messages
  socket.on('chatMessage', (data) => {
    const { roomId, message } = data;
    const room = rooms[roomId];
    if (room) {
      io.to(roomId).emit('chatMessage', { playerId: socket.id, message });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    // Find and remove the player from all rooms
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.players[socket.id]) {
        room.removePlayer(socket.id);
        if (room.isEmpty()) {
          delete rooms[roomId];
          console.log(`Room ${roomId} deleted (empty)`);
        }
        break;
      }
    }
  });
});

// Start the server
const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
