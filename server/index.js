const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const DungeonRoom = require('./rooms/DungeonRoom');

const app = express();
const server = http.createServer(app);

// Configure Socket.io for Render
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static files from public/
app.use(express.static(path.join(__dirname, '../public')));

// Handle root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Store all active dungeon rooms
const rooms = {};

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Create a new room
  socket.on('createRoom', () => {
    console.log(`Creating room for ${socket.id}`);
    const roomId = uuidv4();
    const room = new DungeonRoom(roomId, io);
    rooms[roomId] = room;
    room.addPlayer(socket.id, socket);
    socket.emit('roomCreated', { roomId });
    console.log(`Room created: ${roomId}`);
  });

  // Join an existing room
  socket.on('joinRoom', (data) => {
    console.log(`Joining room: ${data.roomId} for ${socket.id}`);
    const { roomId, playerClass } = data;
    const room = rooms[roomId];
    
    if (!room) {
      console.log(`Room ${roomId} not found`);
      socket.emit('error', { message: 'Room not found. Create a new room first.' });
      return;
    }

    if (room.isFull()) {
      socket.emit('error', { message: 'Room is full (max 4 players).' });
      return;
    }

    room.addPlayer(socket.id, socket, playerClass);
    socket.emit('roomJoined', { roomId, playerId: socket.id });
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  // Leave a room
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

// Start the server on Render's dynamic port
const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
