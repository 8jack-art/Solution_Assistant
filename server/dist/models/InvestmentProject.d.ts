import { InvestmentProject } from '../types/index.js';
export declare class InvestmentProjectModel {
    static findById(id: string): Promise<InvestmentProject | null>;
    static findByUserId(userId: string, isAdmin?: boolean): Promise<InvestmentProject[]>;
    static create(projectData: Omit<InvestmentProject, 'id' | 'created_at' | 'updated_at'>): Promise<InvestmentProject | null>;
    static update(id: string, updates: Partial<InvestmentProject>): Promise<InvestmentProject | null>;
    static updateStatus(id: string, status: 'draft' | 'completed'): Promise<InvestmentProject | null>;
    static lock(id: string): Promise<InvestmentProject | null>;
    static unlock(id: string): Promise<InvestmentProject | null>;
    static delete(id: string): Promise<boolean>;
}
//# sourceMappingURL=InvestmentProject.d.ts.map