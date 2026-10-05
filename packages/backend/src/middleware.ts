import { Request, Response, NextFunction } from 'express';
import { verifyJWT } from './auth';

// Answering before the request body has been read makes Node drop the socket while
// nginx is still writing it, and readers see a 502 instead of our JSON (D-041
// Found 3). Discard whatever is left of the body first. Bodies already consumed by
// a parser resolve immediately.
export const drainRequest = (req: Request): Promise<void> =>
  new Promise((resolve) => {
    if (req.complete || req.readableEnded) return resolve();
    req.once('end', resolve);
    req.once('error', () => resolve());
    req.once('close', () => resolve());
    req.resume();
  });

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Get token from Authorization header or cookies
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.cookies?.authToken);

    if (!token) {
      await drainRequest(req);
      return res.status(401).json({ error: 'Unauthorized: no token provided' });
    }

    // Verify token
    const decoded = verifyJWT(token);
    if (!decoded) {
      await drainRequest(req);
      return res.status(401).json({ error: 'Unauthorized: invalid token' });
    }

    // Attach userId to request
    (req as any).userId = decoded.userId;
    next();
  } catch (error) {
    await drainRequest(req);
    res.status(401).json({ error: 'Unauthorized' });
  }
}
