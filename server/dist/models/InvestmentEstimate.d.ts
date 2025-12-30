import { InvestmentEstimate } from '../types/index.js';
export declare class InvestmentEstimateModel {
    static findById(id: string): Promise<InvestmentEstimate | null>;
    static findByProjectId(projectId: string): Promise<InvestmentEstimate | null>;
    static create(estimateData: Omit<InvestmentEstimate, 'id' | 'created_at' | 'updated_at'>): Promise<InvestmentEstimate | null>;
    static update(id: string, updates: Partial<InvestmentEstimate>): Promise<InvestmentEstimate | null>;
    static delete(id: string): Promise<boolean>;
}
//# sourceMappingURL=InvestmentEstimate.d.ts.map