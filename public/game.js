// Minimal test to verify Socket.io and server work
const socket = io('http://localhost:3002');

socket.on('connect', () => {
  console.log('✅ Connected to Socket.io server!');
  document.body.innerHTML += '<p style="color: green;">Socket.io connected!</p>';
});

socket.on('connect_error', (e) => {
  console.error('❌ Socket.io connection error:', e);
  document.body.innerHTML += '<p style="color: red;">Socket.io error: ' + e.message + '</p>';
});

// Test room creation
function createRoom() {
  socket.emit('createRoom');
  console.log('Creating room...');
}

// Test room joining
function joinRoom() {
  const roomId = prompt('Enter Room ID:');
  if (roomId) socket.emit('joinRoom', { roomId, playerClass: 'warrior' });
}
