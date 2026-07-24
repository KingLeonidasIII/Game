const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Configure Socket.io
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

// Test route
app.get('/test', (req, res) => {
  res.send('Server is running! Open http://localhost:3002 to play.');
});

// Store all active rooms
const rooms = {};

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Create a new room
  socket.on('createRoom', () => {
    const roomId = uuidv4();
    rooms[roomId] = {
      id: roomId,
      players: [socket.id]
    };
    socket.join(roomId);
    socket.emit('roomCreated', { roomId });
    console.log(`Room created: ${roomId}`);
  });
  
  // Join an existing room
  socket.on('joinRoom', (data) => {
    const { roomId, playerClass } = data;
    const room = rooms[roomId];
    
    if (!room) {
      socket.emit('error', { message: 'Room not found. Create a new room first.' });
      return;
    }
    
    if (room.players.length >= 4) {
      socket.emit('error', { message: 'Room is full (max 4 players).' });
      return;
    }
    
    room.players.push(socket.id);
    socket.join(roomId);
    socket.emit('roomJoined', { roomId, playerId: socket.id });
    
    // Notify other players in the room
    io.to(roomId).emit('playerJoined', {
      playerId: socket.id,
      playerClass: playerClass
    });
    
    console.log(`User ${socket.id} joined room ${roomId}`);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    // Remove player from all rooms
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const index = room.players.indexOf(socket.id);
      if (index !== -1) {
        room.players.splice(index, 1);
        io.to(roomId).emit('playerLeft', { playerId: socket.id });
        
        // Delete room if empty
        if (room.players.length === 0) {
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
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Open your browser and navigate to http://localhost:${PORT}`);
});
