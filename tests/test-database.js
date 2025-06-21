const { PrismaClient } = require('@prisma/client');

console.log('Тестирование подключения к базе данных');
console.log('==============================');

async function testDatabaseConnection() {
  const prisma = new PrismaClient();

  try {
    console.log('Попытка подключения к базе данных...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL || 'Не установлен');

    // Тест подключения
    await prisma.$connect();
    console.log('Подключение к базе данных успешно');

    // Тест таблицы проектов
    console.log('Тестирование доступа к таблице проектов...');
    const projectCount = await prisma.project.count();
    console.log(`Таблица проектов доступна, найдено ${projectCount} проектов`);

    // Тест таблицы пользователей
    console.log('Тестирование доступа к таблице пользователей...');
    const userCount = await prisma.user.count();
    console.log(
      `Таблица пользователей доступна, найдено ${userCount} пользователей`,
    );

    console.log('Тест базы данных прошел успешно!');
  } catch (error) {
    console.error('Тест базы данных не удался:', error);
    console.log('Убедитесь, что:');
    console.log('   - MongoDB запущен');
    console.log('   - DATABASE_URL правильно установлен в .env');
    console.log('   - Сеть позволяет подключение к MongoDB');

    if (error.code === 'ECONNREFUSED') {
      console.log(
        'MongoDB подключение отклонено - проверьте, запущен ли MongoDB',
      );
    } else if (error.code === 'ENOTFOUND') {
      console.log('Хост MongoDB не найден - проверьте DATABASE_URL');
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('Подключение к базе данных закрыто');
  }
}

testDatabaseConnection();
