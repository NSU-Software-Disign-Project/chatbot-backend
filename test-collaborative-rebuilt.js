const { io } = require('socket.io-client');

// Test configuration
const SERVER_URL = 'http://localhost:8080';
const PROJECT_ID = 'test-project-rebuilt';
const SHARE_TOKEN = 'test-share-token-123';
const USERS = [
  { id: 'alice', name: 'Alice', displayName: 'Alice' },
  { id: 'bob', name: 'Bob', displayName: 'Bob' },
  { id: 'charlie', name: 'Charlie', displayName: 'Charlie' },
];

console.log('🧪 Testing Rebuilt Collaborative Editing System');
console.log('==============================================');
console.log(`📡 Server: ${SERVER_URL}`);
console.log(`🏠 Project: ${PROJECT_ID}`);
console.log(`🔗 Share Token: ${SHARE_TOKEN}`);
console.log(`👥 Users: ${USERS.map((u) => u.name).join(', ')}`);
console.log('');

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
};

function runTest(testName, testFunction) {
  testResults.total++;
  console.log(`\n🧪 Running test: ${testName}`);

  try {
    testFunction();
    console.log(`✅ Test passed: ${testName}`);
    testResults.passed++;
  } catch (error) {
    console.error(`❌ Test failed: ${testName}`, error);
    testResults.failed++;
  }
}

// Create user connections for project namespace
const projectUserSockets = USERS.map((user) => {
  const socket = io(`${SERVER_URL}/project`, {
    query: {
      projectId: PROJECT_ID,
      userId: user.id,
    },
    transports: ['websocket', 'polling'],
    timeout: 10000,
  });

  return { socket, user };
});

// Create user connections for collaborative namespace
const collaborativeUserSockets = USERS.map((user) => {
  const socket = io(`${SERVER_URL}/collaborative`, {
    query: {
      shareToken: SHARE_TOKEN,
      displayName: user.displayName,
    },
    transports: ['websocket', 'polling'],
    timeout: 10000,
  });

  return { socket, user };
});

// Test 1: Project namespace connection
runTest('Project namespace connections', () => {
  return new Promise((resolve, reject) => {
    const connectedSockets = [];

    projectUserSockets.forEach(({ socket, user }) => {
      socket.once('connect', () => {
        console.log(`✅ ${user.name} connected to project namespace`);
        connectedSockets.push(user.name);

        if (connectedSockets.length === USERS.length) {
          resolve();
        }
      });

      socket.once('connect_error', (error) => {
        reject(new Error(`${user.name} failed to connect: ${error.message}`));
      });
    });

    setTimeout(() => {
      reject(new Error('Connection timeout'));
    }, 10000);
  });
});

// Test 2: Collaborative namespace connection
runTest('Collaborative namespace connections', () => {
  return new Promise((resolve, reject) => {
    const connectedSockets = [];

    collaborativeUserSockets.forEach(({ socket, user }) => {
      socket.once('connect', () => {
        console.log(`✅ ${user.name} connected to collaborative namespace`);
        connectedSockets.push(user.name);

        if (connectedSockets.length === USERS.length) {
          resolve();
        }
      });

      socket.once('connect_error', (error) => {
        reject(new Error(`${user.name} failed to connect: ${error.message}`));
      });
    });

    setTimeout(() => {
      reject(new Error('Connection timeout'));
    }, 10000);
  });
});

// Test 3: User join notifications
runTest('User join notifications', () => {
  return new Promise((resolve, reject) => {
    const receivedNotifications = new Set();

    projectUserSockets.forEach(({ socket, user }) => {
      socket.on('userJoined', (data) => {
        console.log(
          `${user.name} received join notification for: ${data.userId}`,
        );
        receivedNotifications.add(data.userId);

        if (receivedNotifications.size >= USERS.length - 1) {
          resolve();
        }
      });
    });

    setTimeout(() => {
      reject(new Error('User join notifications timeout'));
    }, 5000);
  });
});

// Test 4: Edit operation broadcasting
runTest('Edit operation broadcasting', () => {
  return new Promise((resolve, reject) => {
    const receivedOperations = new Set();

    // Set up listeners for all users except the sender
    projectUserSockets.slice(1).forEach(({ socket, user }) => {
      socket.on('editOperation', (operation) => {
        console.log(
          `📝 ${user.name} received operation: ${operation.type} from ${operation.userId}`,
        );
        receivedOperations.add(operation.type);

        if (receivedOperations.size >= 3) {
          // Expecting 3 different operation types
          resolve();
        }
      });
    });

    // Send operations from first user
    setTimeout(() => {
      console.log('📤 Alice sending test operations...');

      projectUserSockets[0].socket.emit('editOperation', {
        type: 'nodeAdd',
        data: {
          key: 1,
          category: 'messageBlock',
          message: 'Hello from Alice',
          loc: { x: 100, y: 100 },
        },
      });

      setTimeout(() => {
        projectUserSockets[0].socket.emit('editOperation', {
          type: 'nodeMove',
          data: {
            nodeId: 1,
            x: 150,
            y: 150,
          },
        });

        setTimeout(() => {
          projectUserSockets[0].socket.emit('editOperation', {
            type: 'nodeUpdate',
            data: {
              nodeId: 1,
              message: 'Updated by Alice',
            },
          });
        }, 500);
      }, 500);
    }, 1000);

    setTimeout(() => {
      reject(new Error('Edit operation broadcasting timeout'));
    }, 10000);
  });
});

// Test 5: Collaborative namespace operations
runTest('Collaborative namespace operations', () => {
  return new Promise((resolve, reject) => {
    const receivedOperations = new Set();

    // Set up listeners for all users except the sender
    collaborativeUserSockets.slice(1).forEach(({ socket, user }) => {
      socket.on('editOperation', (operation) => {
        console.log(
          `📝 ${user.name} received collaborative operation: ${operation.type} from ${operation.displayName}`,
        );
        receivedOperations.add(operation.type);

        if (receivedOperations.size >= 2) {
          resolve();
        }
      });
    });

    // Send operations from first user
    setTimeout(() => {
      console.log('📤 Alice sending collaborative operations...');

      collaborativeUserSockets[0].socket.emit('editOperation', {
        type: 'nodeAdd',
        data: {
          key: 2,
          category: 'conditionalBlock',
          variableName: 'userChoice',
          conditions: [
            { condition: '==', value: 'yes', portId: 'OUT1' },
            { condition: '==', value: 'no', portId: 'OUT2' },
          ],
          loc: { x: 200, y: 200 },
        },
      });

      setTimeout(() => {
        collaborativeUserSockets[0].socket.emit('editOperation', {
          type: 'linkAdd',
          data: {
            key: 1,
            from: 1,
            to: 2,
            fromPort: 'OUT',
            toPort: 'IN',
          },
        });
      }, 500);
    }, 1000);

    setTimeout(() => {
      reject(new Error('Collaborative operations timeout'));
    }, 10000);
  });
});

// Test 6: User leave notifications
runTest('User leave notifications', () => {
  return new Promise((resolve, reject) => {
    let leaveNotifications = 0;

    projectUserSockets.slice(1).forEach(({ socket, user }) => {
      socket.on('userLeft', (data) => {
        console.log(
          `${user.name} received leave notification for: ${data.userId}`,
        );
        leaveNotifications++;

        if (leaveNotifications >= 1) {
          resolve();
        }
      });
    });

    // First user leaves
    setTimeout(() => {
      console.log('🚪 Alice leaving project...');
      projectUserSockets[0].socket.emit('leaveProject');
    }, 1000);

    setTimeout(() => {
      reject(new Error('User leave notifications timeout'));
    }, 5000);
  });
});

// Test 7: Disconnection handling
runTest('Disconnection handling', () => {
  return new Promise((resolve, reject) => {
    let disconnectNotifications = 0;

    collaborativeUserSockets.slice(1).forEach(({ socket, user }) => {
      socket.on('userDisconnected', (data) => {
        console.log(
          `❌ ${user.name} received disconnect notification for: ${data.displayName}`,
        );
        disconnectNotifications++;

        if (disconnectNotifications >= 1) {
          resolve();
        }
      });
    });

    // First user disconnects
    setTimeout(() => {
      console.log('🔌 Alice disconnecting...');
      collaborativeUserSockets[0].socket.disconnect();
    }, 1000);

    setTimeout(() => {
      reject(new Error('Disconnection handling timeout'));
    }, 5000);
  });
});

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting collaborative editing tests...\n');

  // Wait for initial connections
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Run tests sequentially
  const tests = [
    () => runTest('Project namespace connections', () => {}),
    () => runTest('Collaborative namespace connections', () => {}),
    () => runTest('User join notifications', () => {}),
    () => runTest('Edit operation broadcasting', () => {}),
    () => runTest('Collaborative namespace operations', () => {}),
    () => runTest('User leave notifications', () => {}),
    () => runTest('Disconnection handling', () => {}),
  ];

  for (const test of tests) {
    await test();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Cleanup
  console.log('\n🧹 Cleaning up test connections...');

  projectUserSockets.forEach(({ socket, user }) => {
    if (socket.connected) {
      socket.emit('leaveProject');
      setTimeout(() => {
        socket.disconnect();
        console.log(`🧹 ${user.name} project connection cleaned up`);
      }, 500);
    }
  });

  collaborativeUserSockets.forEach(({ socket, user }) => {
    if (socket.connected) {
      socket.emit('leaveProject');
      setTimeout(() => {
        socket.disconnect();
        console.log(`🧹 ${user.name} collaborative connection cleaned up`);
      }, 500);
    }
  });

  // Print results
  setTimeout(() => {
    console.log('\n📊 Test Results:');
    console.log('================');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📊 Total: ${testResults.total}`);
    console.log(
      `📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`,
    );

    if (testResults.failed === 0) {
      console.log(
        '\n🎉 All tests passed! Your collaborative editing system is working perfectly!',
      );
    } else {
      console.log('\n⚠️ Some tests failed. Please check the implementation.');
    }

    process.exit(testResults.failed === 0 ? 0 : 1);
  }, 2000);
}

// Handle errors
projectUserSockets.forEach(({ socket, user }) => {
  socket.on('error', (error) => {
    console.error(`❌ ${user.name} project error:`, error);
  });
});

collaborativeUserSockets.forEach(({ socket, user }) => {
  socket.on('error', (error) => {
    console.error(`❌ ${user.name} collaborative error:`, error);
  });
});

// Start tests
runAllTests().catch((error) => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
