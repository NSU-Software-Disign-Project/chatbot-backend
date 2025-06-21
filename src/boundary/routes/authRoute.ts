import { Router } from 'express';
import {
  register,
  login,
  getMe,
  getMyProjects,
} from '../../control/api/authController';
import { authMiddleware } from '../../services/authMiddleware';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', authMiddleware, getMe);
router.get('/my-projects', authMiddleware, getMyProjects);

export default router;
