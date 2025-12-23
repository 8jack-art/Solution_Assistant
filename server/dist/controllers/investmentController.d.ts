import { Response } from 'express';
import { ApiResponse, AuthRequest } from '../types/index.js';
export declare class InvestmentController {
    static calculate(req: AuthRequest, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
    static save(req: AuthRequest, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
    static getByProjectId(req: AuthRequest, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
    static generateSummary(req: AuthRequest, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
}
//# sourceMappingURL=investmentController.d.ts.map