import express from 'express';
import { registerUser, authenticateUser } from '../../services/auth/authentication';
import { authenticateJWT, logoutJWT } from '../../services/auth/jwt';

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const { email, name, password } = req.body;
    const user = await registerUser({ email, name, password });
    
    const { token } = await authenticateUser({ email, password });
    
    res.status(201).json({ user, token });
  } catch (e) {
    next(e);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await authenticateUser({ email, password });
    res.json({ user, token });
  } catch (e) {
    // передаем ошибку в централизованный обработчик
    next(e);
  }
});

// Новый endpoint для logout
router.post('/logout', authenticateJWT, logoutJWT);

export default router;