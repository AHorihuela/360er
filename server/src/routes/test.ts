import { Router } from 'express';
import { successResponse } from '../utils/apiResponse';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/public', (req, res) => {
  res.json(successResponse({ message: 'Public route is working!' }));
});

router.get('/protected', authMiddleware, (req, res) => {
  res.json(successResponse({ message: 'Protected route is working!', user: req.user }));
});

export default router; 