import { Prisma } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';

// Обработка известных ошибок Prisma
export function prismaErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Обработка известных ошибок Prisma (например, нарушение уникальности)
    // Можно добавить более гранулярную обработку кодов ошибок Prisma
    return res.status(400).json({
      message: 'Database error',
      code: err.code,
      meta: err.meta,
    });
  }
  return next(err);
}

// Обработка глобальных ошибок сервера
export function serverErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error({
    message: err.message,
    statusCode: statusCode,
    stack: err.stack,
    path: req.path,
  });

  const errorResponse: { message: string; stack?: string } = {
    message,
  };

  // Отправляем стек только в режиме разработки
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
}