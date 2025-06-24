import express from 'express';
import { authenticateJWT } from '../../services/auth/jwt';
import { getProjectsForUser, getUserById, getUserByEmail } from '../../control/db/databaseController';

const router = express.Router();

router.get('/my-projects', authenticateJWT, async (req, res) => {
  const userId = (req as any).user.userId;
  try {
    const projects = await getProjectsForUser(userId);
    res.json({ projects });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

router.get('/me', authenticateJWT, async (req, res) => {
  const userId = (req as any).user.userId;
  try {
    const user = await getUserById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const { password, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.post('/by-email', authenticateJWT, async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Email обязателен' });
    return;
  }
  try {
    const user = await getUserByEmail(email.trim());
    if (!user) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }
    const { password, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка поиска пользователя', details: e });
  }
});

// Получить пользователя по id (email, name)
router.get('/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ error: 'userId обязателен' });
    return;
  }
  try {
    const user = await getUserById(id);
    if (!user) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }
    const { password, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка поиска пользователя', details: e });
  }
});

export default router;
