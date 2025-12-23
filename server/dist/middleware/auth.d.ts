import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/index.js';
export interface AuthRequest extends Request {
    user?: {
        userId: string;
        username: string;
        isAdmin: boolean;
    };
}
export declare function authenticateToken(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction): any;
export declare function requireAdmin(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction): any;
//# sourceMappingURL=auth.d.ts.map