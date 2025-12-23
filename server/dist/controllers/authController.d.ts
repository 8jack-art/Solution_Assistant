import { Request, Response } from 'express';
import { ApiResponse, AuthRequest } from '../types/index.js';
export declare class AuthController {
    static login(req: Request, res: Response<ApiResponse>): Promise<any>;
    static register(req: Request, res: Response<ApiResponse>): Promise<any>;
    static getCurrentUser(req: AuthRequest, res: Response<ApiResponse>): Promise<any>;
    static testUsers(req: Request, res: Response<ApiResponse>): Promise<void>;
}
//# sourceMappingURL=authController.d.ts.map