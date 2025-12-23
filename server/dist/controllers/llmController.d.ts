import { Response } from 'express';
import { ApiResponse, AuthRequest } from '../types/index.js';
export declare class LLMController {
    static getProviders(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    static create(req: AuthRequest, res: Response<ApiResponse>): Promise<any>;
    static getByUserId(req: AuthRequest, res: Response<ApiResponse>): Promise<any>;
    static getDefault(req: AuthRequest, res: Response<ApiResponse>): Promise<any>;
    static update(req: AuthRequest, res: Response<ApiResponse>): Promise<any>;
    static setDefault(req: AuthRequest, res: Response<ApiResponse>): Promise<any>;
    static testConnection(req: AuthRequest, res: Response<ApiResponse>): Promise<any>;
    static delete(req: AuthRequest, res: Response<ApiResponse>): Promise<any>;
    static generateInvestmentContent(req: AuthRequest, res: Response<ApiResponse>): Promise<any>;
    static analyzeProjectInfo(req: AuthRequest, res: Response<ApiResponse>): Promise<any>;
    static analyzeEngineeringItems(req: AuthRequest, res: Response<ApiResponse>): Promise<any>;
    static subdivideEngineeringItem(req: AuthRequest, res: Response<ApiResponse>): Promise<any>;
}
//# sourceMappingURL=llmController.d.ts.map