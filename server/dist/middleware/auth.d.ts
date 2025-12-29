import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/index.js';
export declare function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): Response<any, Record<string, any>>;
export declare function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Response<any, Record<string, any>>;
//# sourceMappingURL=auth.d.ts.map