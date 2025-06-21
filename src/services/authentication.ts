import { prisma } from '../control/db/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

const registerSchema = z.object({
  email: z.string().email({ message: 'Некорректный email' }),
  name: z.string().optional(),
  password: z.string().min(6, { message: 'Пароль должен быть не менее 6 символов' })
});

const loginSchema = z.object({
  email: z.string().email({ message: 'Некорректный email' }),
  password: z.string().min(6, { message: 'Пароль должен быть не менее 6 символов' })
});

function formatZodErrors(errors: z.ZodIssue[]) {
  return errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
}

export async function registerUser({ email, name, password }: { email: string, name?: string, password: string }) {
  const parsed = registerSchema.safeParse({ email, name, password });
  if (!parsed.success) {
    throw new Error('Ошибка валидации: ' + formatZodErrors(parsed.error.issues));
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new Error('Пользователь с таким email уже зарегистрирован');
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name, password: hash }
    });
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (err: any) {
    if (err.code === 'P2002') {
      throw new Error('Email уже используется');
    }
    throw new Error('Ошибка регистрации: ' + (err.message || err));
  }
}

export async function authenticateUser({ email, password }: { email: string, password: string }) {
  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) {
    throw new Error('Ошибка валидации: ' + formatZodErrors(parsed.error.issues));
  }
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('Пользователь не найден');
    if (!user.password) throw new Error('У пользователя не установлен пароль');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error('Неверный пароль');
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  } catch (err: any) {
    throw new Error('Ошибка авторизации: ' + (err.message || err));
  }
}