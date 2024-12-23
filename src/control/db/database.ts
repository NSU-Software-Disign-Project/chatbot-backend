
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function connectToDatabase() {
  try {
    await prisma.$connect();
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

export { prisma, connectToDatabase };