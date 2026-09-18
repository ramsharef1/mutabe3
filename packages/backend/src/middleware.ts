import { Request, Response, NextFunction } from 'express';
import { verifyJWT } from './auth';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Get token from Authorization header or cookies
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.cookies?.authToken);

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: no token provided' });
    }

    // Verify token
    const decoded = verifyJWT(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized: invalid token' });
    }

    // Attach userId to request
    (req as any).userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
