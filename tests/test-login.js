async function testLogin() {
  const fetch = (await import('node-fetch')).default;
  const baseUrl = 'http://localhost:8080/auth';

  console.log('🧪 Testing User Login Functionality\n');

  // Test 1: Successful login with valid credentials
  console.log('1️⃣ Testing successful login...');
  try {
    const response = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.status === 200 && data.token) {
      console.log('✅ Login successful! Token received.\n');

      // Test 2: Use the token to access protected route
      console.log('2️⃣ Testing protected route access with token...');
      const meResponse = await fetch(`${baseUrl}/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${data.token}`,
          'Content-Type': 'application/json',
        },
      });

      const meData = await meResponse.json();
      console.log('Status:', meResponse.status);
      console.log('Response:', JSON.stringify(meData, null, 2));

      if (meResponse.status === 200) {
        console.log('✅ Protected route access successful!\n');
      } else {
        console.log('❌ Protected route access failed!\n');
      }
    } else {
      console.log('❌ Login failed!\n');
    }
  } catch (error) {
    console.error(
      '❌ Error during successful login test:',
      error.message,
      '\n',
    );
  }

  // Test 3: Login with invalid email
  console.log('3️⃣ Testing login with invalid email...');
  try {
    const response = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'password123',
      }),
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.status === 401) {
      console.log('✅ Invalid email correctly rejected!\n');
    } else {
      console.log('❌ Invalid email not properly handled!\n');
    }
  } catch (error) {
    console.error('❌ Error during invalid email test:', error.message, '\n');
  }

  // Test 4: Login with invalid password
  console.log('4️⃣ Testing login with invalid password...');
  try {
    const response = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrongpassword',
      }),
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.status === 401) {
      console.log('✅ Invalid password correctly rejected!\n');
    } else {
      console.log('❌ Invalid password not properly handled!\n');
    }
  } catch (error) {
    console.error(
      '❌ Error during invalid password test:',
      error.message,
      '\n',
    );
  }

  // Test 5: Login with missing email
  console.log('5️⃣ Testing login with missing email...');
  try {
    const response = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password: 'password123',
      }),
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.status === 400) {
      console.log('✅ Missing email correctly rejected!\n');
    } else {
      console.log('❌ Missing email not properly handled!\n');
    }
  } catch (error) {
    console.error('❌ Error during missing email test:', error.message, '\n');
  }

  // Test 6: Login with missing password
  console.log('6️⃣ Testing login with missing password...');
  try {
    const response = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
      }),
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.status === 400) {
      console.log('✅ Missing password correctly rejected!\n');
    } else {
      console.log('❌ Missing password not properly handled!\n');
    }
  } catch (error) {
    console.error(
      '❌ Error during missing password test:',
      error.message,
      '\n',
    );
  }

  // Test 7: Access protected route without token
  console.log('7️⃣ Testing protected route access without token...');
  try {
    const response = await fetch(`${baseUrl}/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.status === 401) {
      console.log('✅ Unauthorized access correctly rejected!\n');
    } else {
      console.log('❌ Unauthorized access not properly handled!\n');
    }
  } catch (error) {
    console.error(
      '❌ Error during unauthorized access test:',
      error.message,
      '\n',
    );
  }

  console.log('🎉 Login testing completed!');
}

// First register a user if needed, then test login
async function setupAndTest() {
  const fetch = (await import('node-fetch')).default;

  console.log('🔧 Setting up test user...\n');

  try {
    // Try to register a test user first
    const registerResponse = await fetch(
      'http://localhost:8080/auth/register',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
          password: 'password123',
        }),
      },
    );

    const registerData = await registerResponse.json();
    if (registerResponse.status === 201) {
      console.log('✅ Test user registered successfully\n');
    } else if (
      registerResponse.status === 400 &&
      registerData.message.includes('already exists')
    ) {
      console.log(
        'ℹ️  Test user already exists, proceeding with login tests\n',
      );
    } else {
      console.log('⚠️  Registration response:', registerData.message, '\n');
    }
  } catch (error) {
    console.log(
      '⚠️  Could not register test user, proceeding anyway:',
      error.message,
      '\n',
    );
  }

  // Run the login tests
  await testLogin();
}

setupAndTest();
