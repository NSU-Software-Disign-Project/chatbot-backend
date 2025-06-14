import express from 'express';
import { registerUser, authenticateUser } from '../../services/authentication';

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

export default router;