const http = require('http');

console.log('Тестирование бэкенд сервера');
console.log('========================');

// Тест конечной точки проверки состояния
const testHealth = () => {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:8080/health', (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('Проверка состояния прошла успешно:', response);
          resolve(response);
        } catch (error) {
          console.error(
            'Не удалось разобрать ответ проверки состояния:',
            error,
          );
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('Проверка состояния не удалась:', error.message);
      reject(error);
    });

    req.setTimeout(5000, () => {
      console.error('Таймаут проверки состояния');
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
};

// Тест API конечной точки
const testAPI = () => {
  return new Promise((resolve, reject) => {
    console.log('Тестирование конечной точки /api/projects...');

    const req = http.get('http://localhost:8080/api/projects', (res) => {
      console.log(`Статус ответа: ${res.statusCode}`);
      console.log(`Заголовки ответа:`, res.headers);

      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`Тело ответа: ${data}`);
        try {
          const response = JSON.parse(data);
          console.log('API тест прошел успешно:', response);
          resolve(response);
        } catch (error) {
          console.error('Не удалось разобрать API ответ:', error);
          console.error('Сырой ответ:', data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('API тест не удался:', error.message);
      reject(error);
    });

    req.setTimeout(10000, () => {
      console.error('Таймаут API теста (10 секунд)');
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
};

// Запуск тестов
const runTests = async () => {
  try {
    console.log('Тестирование конечных точек сервера...');

    await testHealth();
    await testAPI();

    console.log('Все тесты прошли! Сервер работает корректно.');
    console.log('Теперь вы можете:');
    console.log('   - Открыть http://localhost:8080/health в браузере');
    console.log(
      '   - Протестировать совместное редактирование с помощью: npm run test-collaborative',
    );
    console.log('   - Подключить фронтенд к бэкенду');
  } catch (error) {
    console.error('Тесты не прошли:', error.message);
    console.log('Убедитесь, что сервер запущен с помощью: npm run dev');
    console.log('Убедитесь, что MongoDB запущен и доступен');
    console.log('Проверьте DATABASE_URL в файле .env');
    process.exit(1);
  }
};

runTests();
