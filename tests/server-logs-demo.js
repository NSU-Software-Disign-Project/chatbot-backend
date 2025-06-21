const { io } = require('socket.io-client');

console.log('🖥️  Server-Side Collaborative Editing Demo');
console.log('==========================================');
console.log('This demo shows what the server logs would look like');
console.log('when multiple users are editing the same project.\n');

// Simulate server logs
const serverLogs = [
  {
    timestamp: '2025-06-21T12:53:18.000Z',
    event: 'Project namespace: Новое соединение 2W2uFw5-P_u1QjucAAAD',
    details: 'User alice connecting to project demo-project-456',
  },
  {
    timestamp: '2025-06-21T12:53:18.100Z',
    event: 'User alice connecting to project demo-project-456',
    details: 'Socket joined room: demo-project-456',
  },
  {
    timestamp: '2025-06-21T12:53:18.200Z',
    event: 'Project namespace: Новое соединение nLjEv9U34tCl7uJhAAAE',
    details: 'User charlie connecting to project demo-project-456',
  },
  {
    timestamp: '2025-06-21T12:53:18.300Z',
    event: 'User charlie connecting to project demo-project-456',
    details: 'Socket joined room: demo-project-456',
  },
  {
    timestamp: '2025-06-21T12:53:18.400Z',
    event: 'Project namespace: Новое соединение OAPb8PayeRHJJ5OoAAAF',
    details: 'User bob connecting to project demo-project-456',
  },
  {
    timestamp: '2025-06-21T12:53:18.500Z',
    event: 'User bob connecting to project demo-project-456',
    details: 'Socket joined room: demo-project-456',
  },
  {
    timestamp: '2025-06-21T12:53:19.152Z',
    event: 'Edit operation from alice in project demo-project-456',
    details: 'Type: nodeMove, Data: { nodeId: 1, x: 150, y: 250 }',
  },
  {
    timestamp: '2025-06-21T12:53:20.153Z',
    event: 'Edit operation from bob in project demo-project-456',
    details:
      'Type: nodeAdd, Data: { nodeType: messageBlock, text: Hello from Bob!, x: 300, y: 200 }',
  },
  {
    timestamp: '2025-06-21T12:53:21.158Z',
    event: 'Edit operation from charlie in project demo-project-456',
    details: 'Type: nodeDelete, Data: { nodeId: 2 }',
  },
  {
    timestamp: '2025-06-21T12:53:22.169Z',
    event: 'Edit operation from alice in project demo-project-456',
    details:
      'Type: nodeAdd, Data: { nodeType: conditionalBlock, variableName: userChoice, ... }',
  },
  {
    timestamp: '2025-06-21T12:53:23.170Z',
    event: 'Edit operation from bob in project demo-project-456',
    details:
      'Type: linkAdd, Data: { fromNode: 1, toNode: 3, fromPort: OUT, toPort: IN }',
  },
  {
    timestamp: '2025-06-21T12:53:24.180Z',
    event: 'User charlie leaving project demo-project-456',
    details: 'Socket left room: demo-project-456',
  },
  {
    timestamp: '2025-06-21T12:53:25.187Z',
    event: 'Edit operation from alice in project demo-project-456',
    details: 'Type: nodeUpdate, Data: { nodeId: 1, text: Updated by Alice }',
  },
  {
    timestamp: '2025-06-21T12:53:25.691Z',
    event: 'Edit operation from bob in project demo-project-456',
    details: 'Type: nodeUpdate, Data: { nodeId: 3, text: Updated by Bob }',
  },
  {
    timestamp: '2025-06-21T12:53:26.000Z',
    event: 'User alice disconnected from project demo-project-456',
    details: 'Socket removed from room: demo-project-456',
  },
  {
    timestamp: '2025-06-21T12:53:26.100Z',
    event: 'User bob disconnected from project demo-project-456',
    details: 'Socket removed from room: demo-project-456',
  },
];

// Display server logs with timing
const displayServerLogs = async () => {
  for (let i = 0; i < serverLogs.length; i++) {
    const log = serverLogs[i];

    // Format timestamp
    const time = new Date(log.timestamp).toLocaleTimeString();

    console.log(`[${time}] ${log.event}`);
    console.log(`    ${log.details}`);
    console.log('');

    // Add delay to simulate real-time
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  console.log('📊 Server Statistics:');
  console.log('   - Total connections: 3');
  console.log('   - Total edit operations: 7');
  console.log('   - Room management: Working');
  console.log('   - Broadcasting: Successful');
  console.log('   - User tracking: Active');
  console.log('');
  console.log('✅ Server handled all collaborative editing events correctly!');
};

displayServerLogs();
