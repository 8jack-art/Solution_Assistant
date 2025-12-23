import { Response } from 'express';
import { ApiResponse, AuthRequest } from '../types/index.js';
/**
 * 收入成本建模控制器
 */
export declare class RevenueCostController {
    /**
     * 保存收入成本建模数据
     */
    static save(req: AuthRequest, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
    /**
     * 根据项目ID获取收入成本建模数据
     */
    static getByProjectId(req: AuthRequest, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
    /**
     * AI推荐营收结构
     */
    static aiRecommend(req: AuthRequest, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
    /**
     * AI分析税率和计费模式
     */
    static analyzePricing(req: AuthRequest, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
    /**
     * AI生成收入项目表
     */
    static generateItems(req: AuthRequest, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
    /**
     * 估算单个收入项
     */
    static estimateItem(req: AuthRequest, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
    /**
     * 更新工作流步骤
     */
    static updateWorkflowStep(req: AuthRequest, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
    /**
     * 删除收入成本建模数据
     */
    static delete(req: AuthRequest, res: Response<ApiResponse>): Promise<Response<ApiResponse<any>, Record<string, any>> | undefined>;
}
//# sourceMappingURL=revenueCostController.d.ts.map