import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction, RequestHandler } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

// Черный список токенов (в памяти)
const tokenBlacklist = new Set<string>();

export const authenticateJWT: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Malformed token' });
    return;
  }

  // Проверка на черный список
  if (tokenBlacklist.has(token)) {
    res.status(401).json({ error: 'Token is invalidated (logged out)' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Endpoint для logout
export function logoutJWT(req: Request, res: Response) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(400).json({ error: 'No token provided' });
    return;
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(400).json({ error: 'Malformed token' });
    return;
  }
  tokenBlacklist.add(token);
  res.json({ message: 'Logged out successfully' });
}