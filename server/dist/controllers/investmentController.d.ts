import { Response } from 'express';
import { AuthRequest } from '../types/index.js';
export declare class InvestmentController {
    static calculate(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static save(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getByProjectId(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static generateSummary(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=investmentController.d.ts.map