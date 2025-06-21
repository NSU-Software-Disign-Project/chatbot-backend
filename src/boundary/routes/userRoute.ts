import express from 'express';
import { authenticateJWT } from '../../services/jwt';
import { getProjectsByOwnerId, getUserById } from '../../control/db/databaseController';

const router = express.Router();

router.get('/my-projects', authenticateJWT, async (req, res) => {
  const userId = (req as any).user.userId;
  try {
    const projects = await getProjectsByOwnerId(userId);
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

export default router;
