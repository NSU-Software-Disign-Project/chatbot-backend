import { PrismaClient } from '@prisma/client';
import { ObjectId } from 'mongodb';

const prisma = new PrismaClient();

async function main() {
  try {
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        blocks: {
          create: [
            {
              id: new ObjectId().toHexString(),
              type: 'start',
              attributes: { text: 'Start Block' },
            },
            {
              id: new ObjectId().toHexString(),
              type: 'message',
              attributes: { text: 'Hello, world!' },

            },
            {
              id: new ObjectId().toHexString(),
              type: 'end',
              attributes: { text: 'End Block' },
            },
          ],
        },
      },
      include: { blocks: true }
    });

    const blockIds = project.blocks.map(block => block.id);

    if (blockIds.length < 3) {
      console.error('Не удалось создать достаточное количество блоков');
      return;
    }


    await prisma.transition.createMany({
      data: [
        {
          id: new ObjectId().toHexString(),
          fromBlockId: blockIds[0],
          toBlockId: blockIds[1],
          condition: {},
          projectId: project.id,
        },
        {
          id: new ObjectId().toHexString(),
          fromBlockId: blockIds[1],
          toBlockId: blockIds[2],
          condition: {},
          projectId: project.id,
        },
      ],
    });




    console.log('Seed data created successfully:', project);

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();