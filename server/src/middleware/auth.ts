import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { errorResponse } from '../utils/apiResponse';
import { User } from '@shared/types';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const JWT_SECRET = process.env.VITE_JWT_SECRET || 'your_jwt_secret';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json(errorResponse('No token provided'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as User;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json(errorResponse('Invalid token'));
  }
}

export function generateToken(user: User): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
} 