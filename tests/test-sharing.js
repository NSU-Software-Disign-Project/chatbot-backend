const io = require('socket.io-client');

// Test configuration
const SERVER_URL = 'http://localhost:8080';
const TEST_USER_1 = {
  email: 'test1@example.com',
  password: 'password123',
  name: 'Test User 1',
};
const TEST_USER_2 = {
  email: 'test2@example.com',
  password: 'password123',
  name: 'Test User 2',
};

let user1Token = null;
let user2Token = null;
let testProjectId = null;

console.log('🧪 Starting Project Sharing API Tests...\n');

// Helper function to make authenticated requests
async function makeRequest(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const response = await fetch(url, {
    ...options,
    headers,
  });
  const data = await response.json();
  return { response, data };
}

// Test user registration and login
async function testAuth() {
  console.log('📝 Testing user authentication...');

  try {
    // Register user 1
    const register1Response = await makeRequest(`${SERVER_URL}/auth/register`, {
      method: 'POST',
      body: JSON.stringify(TEST_USER_1),
    });

    if (register1Response.response.ok) {
      console.log('✅ User 1 registered successfully');
    } else {
      console.log(
        '⚠️ User 1 registration failed (might already exist):',
        register1Response.data.message,
      );
    }

    // Register user 2
    const register2Response = await makeRequest(`${SERVER_URL}/auth/register`, {
      method: 'POST',
      body: JSON.stringify(TEST_USER_2),
    });

    if (register2Response.response.ok) {
      console.log('✅ User 2 registered successfully');
    } else {
      console.log(
        '⚠️ User 2 registration failed (might already exist):',
        register2Response.data.message,
      );
    }

    // Login user 1
    const login1Response = await makeRequest(`${SERVER_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: TEST_USER_1.email,
        password: TEST_USER_1.password,
      }),
    });

    if (login1Response.response.ok) {
      user1Token = login1Response.data.token;
      console.log('✅ User 1 logged in successfully');
    } else {
      throw new Error('User 1 login failed: ' + login1Response.data.message);
    }

    // Login user 2
    const login2Response = await makeRequest(`${SERVER_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: TEST_USER_2.email,
        password: TEST_USER_2.password,
      }),
    });

    if (login2Response.response.ok) {
      user2Token = login2Response.data.token;
      console.log('✅ User 2 logged in successfully');
    } else {
      throw new Error('User 2 login failed: ' + login2Response.data.message);
    }
  } catch (error) {
    console.error('❌ Authentication test failed:', error.message);
    throw error;
  }
}

// Test project creation
async function testProjectCreation() {
  console.log('\n📁 Testing project creation...');

  try {
    const projectName = 'Test Shared Project';
    const projectData = {
      name: projectName,
      nodeDataArray: [
        { key: 1, category: 'messageBlock', message: 'Hello World' },
      ],
      linkDataArray: [],
    };

    const response = await makeRequest(
      `${SERVER_URL}/api/project/${encodeURIComponent(projectName)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user1Token}`,
        },
        body: JSON.stringify(projectData),
      },
    );

    if (response.response.ok) {
      testProjectId = response.data.data.projectId;
      console.log('✅ Project created successfully');
      console.log(`   Project ID: ${testProjectId}`);
      console.log(`   Project Name: ${projectName}`);
    } else {
      throw new Error('Project creation failed: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ Project creation test failed:', error.message);
    throw error;
  }
}

// Test project sharing
async function testProjectSharing() {
  console.log('\n🤝 Testing project sharing...');

  try {
    const shareData = {
      targetUserEmail: TEST_USER_2.email,
      permission: 'edit',
    };

    const response = await makeRequest(
      `${SERVER_URL}/api/project/${testProjectId}/share`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user1Token}`,
        },
        body: JSON.stringify(shareData),
      },
    );

    if (response.response.ok) {
      console.log('✅ Project shared successfully');
      console.log(`   Shared with: ${TEST_USER_2.email}`);
      console.log(`   Permission: ${shareData.permission}`);
    } else {
      throw new Error('Project sharing failed: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ Project sharing test failed:', error.message);
    throw error;
  }
}

// Test accessible projects
async function testAccessibleProjects() {
  console.log('\n📋 Testing accessible projects...');

  try {
    // Test user 1's accessible projects (should include owned project)
    const user1Response = await makeRequest(
      `${SERVER_URL}/api/accessible-projects`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${user1Token}`,
        },
      },
    );

    if (user1Response.response.ok) {
      console.log('✅ User 1 accessible projects retrieved');
      console.log(`   Owned projects: ${user1Response.data.data.owned.length}`);
      console.log(
        `   Shared projects: ${user1Response.data.data.shared.length}`,
      );
    } else {
      throw new Error(
        'User 1 accessible projects failed: ' + user1Response.data.message,
      );
    }

    // Test user 2's accessible projects (should include shared project)
    const user2Response = await makeRequest(
      `${SERVER_URL}/api/accessible-projects`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${user2Token}`,
        },
      },
    );

    if (user2Response.response.ok) {
      console.log('✅ User 2 accessible projects retrieved');
      console.log(`   Owned projects: ${user2Response.data.data.owned.length}`);
      console.log(
        `   Shared projects: ${user2Response.data.data.shared.length}`,
      );
    } else {
      throw new Error(
        'User 2 accessible projects failed: ' + user2Response.data.message,
      );
    }
  } catch (error) {
    console.error('❌ Accessible projects test failed:', error.message);
    throw error;
  }
}

// Test project access check
async function testProjectAccess() {
  console.log('\n🔐 Testing project access...');

  try {
    // Test user 1's access (should be admin)
    const user1Response = await makeRequest(
      `${SERVER_URL}/api/project/${testProjectId}/access?permission=edit`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${user1Token}`,
        },
      },
    );

    if (user1Response.response.ok) {
      console.log('✅ User 1 access check successful');
      console.log(`   Has access: ${user1Response.data.data.hasAccess}`);
      console.log(`   Permission: ${user1Response.data.data.permission}`);
    } else {
      throw new Error(
        'User 1 access check failed: ' + user1Response.data.message,
      );
    }

    // Test user 2's access (should be edit)
    const user2Response = await makeRequest(
      `${SERVER_URL}/api/project/${testProjectId}/access?permission=edit`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${user2Token}`,
        },
      },
    );

    if (user2Response.response.ok) {
      console.log('✅ User 2 access check successful');
      console.log(`   Has access: ${user2Response.data.data.hasAccess}`);
      console.log(`   Permission: ${user2Response.data.data.permission}`);
    } else {
      throw new Error(
        'User 2 access check failed: ' + user2Response.data.message,
      );
    }
  } catch (error) {
    console.error('❌ Project access test failed:', error.message);
    throw error;
  }
}

// Test shareable project retrieval
async function testShareableProject() {
  console.log('\n🔗 Testing shareable project retrieval...');

  try {
    const response = await makeRequest(
      `${SERVER_URL}/api/project/${testProjectId}/shareable`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${user1Token}`,
        },
      },
    );

    if (response.response.ok) {
      console.log('✅ Shareable project retrieved successfully');
      console.log(`   Project name: ${response.data.data.name}`);
      console.log(`   Owner: ${response.data.data.user.name}`);
      console.log(`   Shared users: ${response.data.data.shares.length}`);
    } else {
      throw new Error(
        'Shareable project retrieval failed: ' + response.data.message,
      );
    }
  } catch (error) {
    console.error('❌ Shareable project test failed:', error.message);
    throw error;
  }
}

// Run all tests
async function runAllTests() {
  try {
    await testAuth();
    await testProjectCreation();
    await testProjectSharing();
    await testAccessibleProjects();
    await testProjectAccess();
    await testShareableProject();

    console.log('\n🎉 All sharing tests passed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ User authentication');
    console.log('   ✅ Project creation');
    console.log('   ✅ Project sharing');
    console.log('   ✅ Accessible projects');
    console.log('   ✅ Project access control');
    console.log('   ✅ Shareable project retrieval');
  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
    process.exit(1);
  }
}

// Start the tests
runAllTests();
