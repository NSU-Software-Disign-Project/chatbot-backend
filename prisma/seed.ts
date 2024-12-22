import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Создание или обновление проекта с начальными данными
  const project = await prisma.project.upsert({
    where: { name: 'Default Project' },
    update: {},
    create: {
      name: 'Default Project',
      createdAt: new Date(),
      updatedAt: new Date(),
      nodeDataArray: [
        {
          id: 0,
          type: 'startBlock',
        },
        {
          id: 1,
          type: 'messageBlock',
          text: 'Выпить пива',
        },
        {
          id: 2,
          type: 'conditionalBlock',
          conditions: [
            {
              conditionId: 1,
              variableName: 'age',
              condition: '<',
              conditionValue: 18,
              portId: 'OUT1',
            },
            {
              conditionId: 2,
              variableName: 'age',
              condition: '>=',
              conditionValue: 18,
              portId: 'OUT',
            },
          ],
        },
        {
          id: 4,
          type: 'saveBlock',
          variableName: 'age',
        },
        {
          id: -6,
          type: 'messageBlock',
          text: 'Сколько лет?',
        },
        {
          id: -7,
          type: 'messageBlock',
          text: 'Красава!',
        },
        {
          id: -8,
          type: 'messageBlock',
          text: 'Молодой',
        },
      ],
      linkDataArray: [
        {
          from: 0,
          to: 1,
          fromPort: 'OUT',
          toPort: 'IN',
        },
        {
          from: 1,
          to: -6,
          fromPort: 'OUT',
          toPort: 'IN',
        },
        {
          from: -6,
          to: 4,
          fromPort: 'OUT',
          toPort: 'IN',
        },
        {
          from: 4,
          to: 2,
          fromPort: 'OUT',
          toPort: 'IN',
        },
        {
          from: 2,
          to: -7,
          fromPort: 'OUT',
          toPort: 'IN',
        },
        {
          from: 2,
          to: -8,
          fromPort: 'OUT1',
          toPort: 'IN',
        },
      ],
    },
  });

  console.log({ project });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });