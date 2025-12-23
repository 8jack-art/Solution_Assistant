import { Response } from 'express';
import { ApiResponse, AuthRequest } from '../types/index.js';
export declare class InvestmentController {
    static calculate(req: AuthRequest, res: Response<ApiResponse>): Promise<any>;
    static save(req: AuthRequest, res: Response<ApiResponse>): Promise<any>;
    static getByProjectId(req: AuthRequest, res: Response<ApiResponse>): Promise<any>;
    static generateSummary(req: AuthRequest, res: Response<ApiResponse>): Promise<any>;
}
//# sourceMappingURL=investmentController.d.ts.map