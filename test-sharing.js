// Тест совместного использования проекта
async function testProjectSharing() {
  console.log('\nТестирование совместного использования проекта...');

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
      console.log('Проект успешно предоставлен в совместное использование');
      console.log(`   Предоставлен пользователю: ${TEST_USER_2.email}`);
      console.log(`   Разрешение: ${shareData.permission}`);
    } else {
      throw new Error(
        'Совместное использование проекта не удалось: ' + response.data.message,
      );
    }
  } catch (error) {
    console.error(
      'Тест совместного использования проекта не удался:',
      error.message,
    );
    throw error;
  }
}

// Тест доступных проектов
async function testAccessibleProjects() {
  console.log('\nТестирование доступных проектов...');

  try {
    // Тест доступных проектов пользователя 1 (должен включать собственный проект)
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
      console.log('Доступные проекты пользователя 1 получены');
      console.log(
        `   Собственные проекты: ${user1Response.data.data.owned.length}`,
      );
      console.log(`   Общие проекты: ${user1Response.data.data.shared.length}`);
    } else {
      throw new Error(
        'Доступные проекты пользователя 1 не удались: ' +
          user1Response.data.message,
      );
    }

    // Тест доступных проектов пользователя 2 (должен включать общий проект)
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
      console.log('Доступные проекты пользователя 2 получены');
      console.log(
        `   Собственные проекты: ${user2Response.data.data.owned.length}`,
      );
      console.log(`   Общие проекты: ${user2Response.data.data.shared.length}`);
    } else {
      throw new Error(
        'Доступные проекты пользователя 2 не удались: ' +
          user2Response.data.message,
      );
    }
  } catch (error) {
    console.error('Тест доступных проектов не удался:', error.message);
    throw error;
  }
}

// Тест проверки доступа к проекту
async function testProjectAccess() {
  console.log('\nТестирование доступа к проекту...');

  try {
    // Тест доступа пользователя 1 (должен быть администратором)
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
      console.log('Проверка доступа пользователя 1 успешна');
      console.log(`   Имеет доступ: ${user1Response.data.data.hasAccess}`);
      console.log(`   Разрешение: ${user1Response.data.data.permission}`);
    } else {
      throw new Error(
        'Проверка доступа пользователя 1 не удалась: ' +
          user1Response.data.message,
      );
    }

    // Тест доступа пользователя 2 (должен иметь разрешение на редактирование)
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
      console.log('Проверка доступа пользователя 2 успешна');
      console.log(`   Имеет доступ: ${user2Response.data.data.hasAccess}`);
      console.log(`   Разрешение: ${user2Response.data.data.permission}`);
    } else {
      throw new Error(
        'Проверка доступа пользователя 2 не удалась: ' +
          user2Response.data.message,
      );
    }
  } catch (error) {
    console.error('Тест доступа к проекту не удался:', error.message);
    throw error;
  }
}

// Тест получения проекта для совместного использования
async function testShareableProject() {
  console.log(
    '\nТестирование получения проекта для совместного использования...',
  );

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
      console.log('Проект для совместного использования успешно получен');
      console.log(`   Название проекта: ${response.data.data.name}`);
      console.log(`   Владелец: ${response.data.data.user.name}`);
      console.log(`   Общие пользователи: ${response.data.data.shares.length}`);
    } else {
      throw new Error(
        'Получение проекта для совместного использования не удалось: ' +
          response.data.message,
      );
    }
  } catch (error) {
    console.error(
      'Тест проекта для совместного использования не удался:',
      error.message,
    );
    throw error;
  }
}

// Запуск всех тестов
async function runAllTests() {
  try {
    await testAuth();
    await testProjectCreation();
    await testProjectSharing();
    await testAccessibleProjects();
    await testProjectAccess();
    await testShareableProject();

    console.log('\nВсе тесты совместного использования прошли успешно!');
    console.log('\nИтоги:');
    console.log('   Аутентификация пользователей');
    console.log('   Создание проекта');
    console.log('   Совместное использование проекта');
    console.log('   Доступные проекты');
    console.log('   Контроль доступа к проекту');
    console.log('   Получение проекта для совместного использования');
  } catch (error) {
    console.error('\nНабор тестов не удался:', error.message);
    process.exit(1);
  }
}

// Запуск тестов
runAllTests();
