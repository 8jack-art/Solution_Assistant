import { Response } from 'express';
import { ApiResponse, AuthRequest } from '../types/index.js';
export declare class ProjectController {
    static create(req: AuthRequest, res: Response<ApiResponse>): Promise<any>;
    static getByUserId(req: AuthRequest, res: Response<ApiResponse>): Promise<any>;
    static getById(req: AuthRequest, res: Response<ApiResponse>): Promise<any>;
    static update(req: AuthRequest, res: Response<ApiResponse>): Promise<any>;
    static updateStatus(req: AuthRequest, res: Response<ApiResponse>): Promise<any>;
    static lock(req: AuthRequest, res: Response<ApiResponse>): Promise<any>;
    static unlock(req: AuthRequest, res: Response<ApiResponse>): Promise<any>;
    static delete(req: AuthRequest, res: Response<ApiResponse>): Promise<any>;
}
//# sourceMappingURL=projectController.d.ts.map