import { Response } from 'express';
import { ApiResponse, AuthRequest } from '../types/index.js';
export declare class LLMController {
    static getProviders(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    static create(req: AuthRequest, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
    static getByUserId(req: AuthRequest, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
    static getDefault(req: AuthRequest, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
    static update(req: AuthRequest, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
    static setDefault(req: AuthRequest, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
    static testConnection(req: AuthRequest, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
    static delete(req: AuthRequest, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
    static generateInvestmentContent(req: AuthRequest, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
    static analyzeProjectInfo(req: AuthRequest, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
    static analyzeEngineeringItems(req: AuthRequest, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
    static subdivideEngineeringItem(req: AuthRequest, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
}
//# sourceMappingURL=llmController.d.ts.map