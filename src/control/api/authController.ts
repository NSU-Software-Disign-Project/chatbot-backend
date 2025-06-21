import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../../services/authMiddleware';

const prisma = new PrismaClient();

// JWT secret key - in production, this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, name, password } = req.body;

    // Validate input
    if (!email || !name || !password) {
      res.status(400).json({ message: 'All fields are required' });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({ message: 'User with this email already exists' });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '24h',
    });

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token,
    });
    return;
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '24h',
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      token,
    });
    return;
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    // The user ID will be available from the auth middleware
    const userId = (req as AuthenticatedRequest).user?.userId;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({ user });
    return;
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
}

export async function getMyProjects(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).user?.userId;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const projects = await prisma.project.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json(projects);
    return;
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
}
