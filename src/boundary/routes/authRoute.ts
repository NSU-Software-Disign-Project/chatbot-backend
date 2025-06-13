import express from 'express';
import { registerUser, authenticateUser } from '../../services/authentication';
import { authenticateJWT } from '../../services/jwt';
import { getProjectsByOwnerId, getUserById } from '../../control/db/databaseController';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, name, password } = req.body;
    const user = await registerUser({ email, name, password });
    res.json({ user });
  } catch (e) {
    if (e instanceof Error) {
      res.status(400).json({ error: e.message });
    } else {
      res.status(400).json({ error: 'Unknown error' });
    }
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await authenticateUser({ email, password });
    res.json({ user, token });
  } catch (e) {
    if (e instanceof Error) {
      res.status(401).json({ error: e.message });
    } else {
      res.status(401).json({ error: 'Unknown error' });
    }
  }
});

router.get('/my-projects', authenticateJWT, async (req, res) => {
  const userId = (req as any).user.userId;
  try {
    const projects = await getProjectsByOwnerId(userId);
    res.json({ projects });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

router.get('/me', authenticateJWT, (req, res) => {
  const userId = (req as any).user.userId;
  getUserById(userId)
    .then(user => {
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    })
    .catch(() => {
      res.status(500).json({ error: 'Failed to fetch user' });
    });
});

export default router;