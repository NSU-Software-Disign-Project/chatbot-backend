import { prisma } from '../control/db/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { ApiError } from './ApiError';

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
    throw new ApiError(400, 'Ошибка валидации: ' + formatZodErrors(parsed.error.issues));
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name, password: hash },
    });
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (err: any) {
    // Логируем полную ошибку на сервере для отладки
    console.error("Internal error during user registration:", err);

    // P2002 - это код ошибки Prisma для нарушения уникального ограничения
    if (err.code === 'P2002' && err.meta?.target?.includes('email')) {
      throw new ApiError(409, 'Этот email уже используется');
    }

    // Перебрасываем более информативную ошибку для клиента
    const message = err.message || 'Неизвестная ошибка сервера';
    throw new ApiError(500, `Ошибка регистрации: ${message}`);
  }
}

export async function authenticateUser({ email, password }: { email: string, password: string }) {
  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) {
    throw new ApiError(400, 'Ошибка валидации: ' + formatZodErrors(parsed.error.issues));
  }
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      throw new ApiError(401, 'Неверный email или пароль');
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new ApiError(401, 'Неверный email или пароль');
    }
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(500, 'Ошибка авторизации на сервере');
  }
}