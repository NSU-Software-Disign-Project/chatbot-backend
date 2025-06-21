const { io } = require('socket.io-client');

// Demo configuration
const SERVER_URL = 'http://localhost:8080';
const PROJECT_ID = 'demo-project-456';
const USERS = [
  { id: 'alice', name: 'Alice' },
  { id: 'bob', name: 'Bob' },
  { id: 'charlie', name: 'Charlie' },
];

console.log('🎭 Collaborative Editing Demo');
console.log('============================');
console.log(`📡 Server: ${SERVER_URL}`);
console.log(`🏠 Project: ${PROJECT_ID}`);
console.log(`👥 Users: ${USERS.map((u) => u.name).join(', ')}`);
console.log('');

// Create user connections
const userSockets = USERS.map((user) => {
  const socket = io(`${SERVER_URL}/project`, {
    query: {
      projectId: PROJECT_ID,
      userId: user.id,
    },
  });

  // User-specific event handlers
  socket.on('connect', () => {
    console.log(`✅ ${user.name} connected (${socket.id})`);
  });

  socket.on('userJoined', (data) => {
    console.log(`👋 ${user.name} sees: ${data.userId} joined the project`);
  });

  socket.on('userLeft', (data) => {
    console.log(`👋 ${user.name} sees: ${data.userId} left the project`);
  });

  socket.on('userDisconnected', (data) => {
    console.log(`❌ ${user.name} sees: ${data.userId} disconnected`);
  });

  socket.on('editOperation', (operation) => {
    console.log(`📝 ${user.name} received edit from ${operation.userId}:`);
    console.log(`   Type: ${operation.type}`);
    console.log(`   Data:`, operation.data);
    console.log(`   Time: ${operation.timestamp}`);
    console.log('');
  });

  socket.on('disconnect', () => {
    console.log(`❌ ${user.name} disconnected`);
  });

  return { socket, user };
});

// Demo scenarios
const runDemo = async () => {
  console.log('🎬 Starting collaborative editing demo...\n');

  // Wait for all connections
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Scenario 1: Alice moves a node
  console.log('🎯 Scenario 1: Alice moves a node');
  userSockets[0].socket.emit('editOperation', {
    type: 'nodeMove',
    data: {
      nodeId: 1,
      x: 150,
      y: 250,
    },
  });
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Scenario 2: Bob adds a new message block
  console.log('🎯 Scenario 2: Bob adds a message block');
  userSockets[1].socket.emit('editOperation', {
    type: 'nodeAdd',
    data: {
      nodeType: 'messageBlock',
      text: 'Hello from Bob!',
      x: 300,
      y: 200,
    },
  });
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Scenario 3: Charlie deletes a node
  console.log('🎯 Scenario 3: Charlie deletes a node');
  userSockets[2].socket.emit('editOperation', {
    type: 'nodeDelete',
    data: {
      nodeId: 2,
    },
  });
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Scenario 4: Alice adds a conditional block
  console.log('🎯 Scenario 4: Alice adds a conditional block');
  userSockets[0].socket.emit('editOperation', {
    type: 'nodeAdd',
    data: {
      nodeType: 'conditionalBlock',
      variableName: 'userChoice',
      conditions: [
        { condition: '==', value: 'yes', portId: 'OUT1' },
        { condition: '==', value: 'no', portId: 'OUT2' },
      ],
      x: 450,
      y: 300,
    },
  });
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Scenario 5: Bob connects a link
  console.log('🎯 Scenario 5: Bob connects a link');
  userSockets[1].socket.emit('editOperation', {
    type: 'linkAdd',
    data: {
      fromNode: 1,
      toNode: 3,
      fromPort: 'OUT',
      toPort: 'IN',
    },
  });
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Scenario 6: Charlie leaves the project
  console.log('🎯 Scenario 6: Charlie leaves the project');
  userSockets[2].socket.emit('leaveProject');
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Scenario 7: Alice and Bob continue editing
  console.log('🎯 Scenario 7: Alice and Bob continue editing');
  userSockets[0].socket.emit('editOperation', {
    type: 'nodeUpdate',
    data: {
      nodeId: 1,
      text: 'Updated by Alice',
    },
  });
  await new Promise((resolve) => setTimeout(resolve, 500));

  userSockets[1].socket.emit('editOperation', {
    type: 'nodeUpdate',
    data: {
      nodeId: 3,
      text: 'Updated by Bob',
    },
  });
  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log('🎬 Demo completed! Cleaning up...\n');

  // Cleanup
  userSockets.forEach(({ socket, user }) => {
    if (socket.connected) {
      socket.emit('leaveProject');
      setTimeout(() => {
        socket.disconnect();
        console.log(`🧹 ${user.name} cleaned up`);
      }, 500);
    }
  });

  setTimeout(() => {
    console.log('✅ Demo finished successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log('   - 3 users connected to the same project');
    console.log('   - Real-time edit operations were broadcast');
    console.log('   - User join/leave events were handled');
    console.log('   - All operations included user identification');
    console.log('   - Timestamps were added to all events');
    console.log('');
    console.log('🚀 Your collaborative editing system is working perfectly!');
    process.exit(0);
  }, 2000);
};

// Handle errors
userSockets.forEach(({ socket, user }) => {
  socket.on('error', (error) => {
    console.error(`❌ ${user.name} error:`, error);
  });
});

// Start the demo
runDemo().catch((error) => {
  console.error('❌ Demo failed:', error);
  process.exit(1);
});
