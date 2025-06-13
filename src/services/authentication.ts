import { prisma } from '../control/db/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

export async function registerUser({ email, name, password }: { email: string, name?: string, password: string }) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, name, password: hash }
  });
  // Удаляем пароль из ответа
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function authenticateUser({ email, password }: { email: string, password: string }) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password) throw new Error('User not found or password not set');
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error('Invalid password');
  // Генерируем JWT
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  // Удаляем пароль из ответа
  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
}