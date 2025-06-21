async function testRegistration() {
  try {
    const fetch = (await import('node-fetch')).default;

    console.log('Тестирование регистрации...');

    const response = await fetch('http://localhost:8080/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
      }),
    });

    const data = await response.json();
    console.log('Статус:', response.status);
    console.log('Ответ:', data);

    if (response.ok) {
      console.log('Регистрация успешна!');
      console.log('Токен:', data.token);
    } else {
      console.log('Регистрация не удалась:', data.message);
    }
  } catch (error) {
    console.error('Ошибка:', error.message);
  }
}

async function testLogin() {
  try {
    const fetch = (await import('node-fetch')).default;

    console.log('\nТестирование входа...');

    const response = await fetch('http://localhost:8080/auth/login', {
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
    console.log('Статус:', response.status);
    console.log('Ответ:', data);

    if (response.ok) {
      console.log('Вход успешен!');
      console.log('Токен:', data.token);
      return data.token;
    } else {
      console.log('Вход не удался:', data.message);
      return null;
    }
  } catch (error) {
    console.error('Ошибка:', error.message);
    return null;
  }
}

async function testGetMe(token) {
  if (!token) {
    console.log('\nПропуск теста getMe - токен недоступен');
    return;
  }

  try {
    const fetch = (await import('node-fetch')).default;

    console.log('\nТестирование getMe...');

    const response = await fetch('http://localhost:8080/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('Статус:', response.status);
    console.log('Ответ:', data);

    if (response.ok) {
      console.log('GetMe успешен!');
    } else {
      console.log('GetMe не удался:', data.message);
    }
  } catch (error) {
    console.error('Ошибка:', error.message);
  }
}

async function runTests() {
  console.log('Запуск тестов аутентификации...\n');

  await testRegistration();
  const token = await testLogin();
  await testGetMe(token);

  console.log('\nТесты завершены!');
}

runTests();
