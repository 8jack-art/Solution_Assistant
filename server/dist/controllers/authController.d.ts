import { Request, Response } from 'express';
import { ApiResponse, AuthRequest } from '../types/index.js';
export declare class AuthController {
    static login(req: Request, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
    static register(req: Request, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
    static getCurrentUser(req: AuthRequest, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
    static testUsers(req: Request, res: Response<ApiResponse>): Promise<void>;
}
//# sourceMappingURL=authController.d.ts.map