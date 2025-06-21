const { io } = require('socket.io-client');

// Конфигурация тестов
const SERVER_URL = 'http://localhost:8080';
const PROJECT_ID = 'test-project-123';
const USER_ID_1 = 'user-1';
const USER_ID_2 = 'user-2';

console.log('Тестирование WebSocket реализации совместного редактирования');
console.log('==================================================');

// Создание первого пользовательского соединения
const user1Socket = io(`${SERVER_URL}/project`, {
  query: {
    projectId: PROJECT_ID,
    userId: USER_ID_1,
  },
});

// Создание второго пользовательского соединения
const user2Socket = io(`${SERVER_URL}/project`, {
  query: {
    projectId: PROJECT_ID,
    userId: USER_ID_2,
  },
});

// Тест пользователя 1
user1Socket.on('connect', () => {
  console.log('Пользователь 1 успешно подключен');

  // Слушание присоединения других пользователей
  user1Socket.on('userJoined', (data) => {
    console.log('Пользователь 1 получил событие userJoined:', data);
  });

  // Слушание операций редактирования от других пользователей
  user1Socket.on('editOperation', (operation) => {
    console.log('Пользователь 1 получил editOperation:', operation);
  });

  // Отправка тестовой операции редактирования
  setTimeout(() => {
    console.log('Пользователь 1 отправляет операцию редактирования...');
    user1Socket.emit('editOperation', {
      type: 'nodeMove',
      data: {
        nodeId: 1,
        x: 100,
        y: 200,
      },
    });
  }, 1000);
});

// Тест пользователя 2
user2Socket.on('connect', () => {
  console.log('Пользователь 2 успешно подключен');

  // Слушание присоединения других пользователей
  user2Socket.on('userJoined', (data) => {
    console.log('Пользователь 2 получил событие userJoined:', data);
  });

  // Слушание операций редактирования от других пользователей
  user2Socket.on('editOperation', (operation) => {
    console.log('Пользователь 2 получил editOperation:', operation);
  });

  // Отправка тестовой операции редактирования с задержкой
  setTimeout(() => {
    console.log('Пользователь 2 отправляет операцию редактирования...');
    user2Socket.emit('editOperation', {
      type: 'nodeAdd',
      data: {
        nodeType: 'messageBlock',
        x: 300,
        y: 400,
      },
    });
  }, 2000);
});

// Обработка отключений
user1Socket.on('disconnect', () => {
  console.log('Пользователь 1 отключился');
});

user2Socket.on('disconnect', () => {
  console.log('Пользователь 2 отключился');
});

// Обработка ошибок
user1Socket.on('error', (error) => {
  console.error('Ошибка пользователя 1:', error);
});

user2Socket.on('error', (error) => {
  console.error('Ошибка пользователя 2:', error);
});

// Очистка теста через 5 секунд
setTimeout(() => {
  console.log('Очистка тестовых соединений...');
  user1Socket.emit('leaveProject');
  user2Socket.emit('leaveProject');

  setTimeout(() => {
    user1Socket.disconnect();
    user2Socket.disconnect();
    console.log('Тест завершен');
    process.exit(0);
  }, 1000);
}, 5000);

console.log('Тест выполняется 5 секунд...');
console.log('Подключение к:', SERVER_URL);
console.log('ID проекта:', PROJECT_ID);
console.log('Пользователи:', USER_ID_1, 'и', USER_ID_2);
