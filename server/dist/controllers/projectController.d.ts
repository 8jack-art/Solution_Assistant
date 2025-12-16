import { Response } from 'express';
import { ApiResponse, AuthRequest } from '../types/index.js';
export declare class ProjectController {
    static create(req: AuthRequest, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
    static getByUserId(req: AuthRequest, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
    static getById(req: AuthRequest, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
    static update(req: AuthRequest, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
    static updateStatus(req: AuthRequest, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
    static lock(req: AuthRequest, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
    static unlock(req: AuthRequest, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
    static delete(req: AuthRequest, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
}
//# sourceMappingURL=projectController.d.ts.map