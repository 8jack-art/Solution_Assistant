import { LLMConfig } from '../types/index.js';
export declare class LLMConfigModel {
    static findById(id: string): Promise<LLMConfig | null>;
    static findByUserId(userId: string, isAdmin?: boolean): Promise<LLMConfig[]>;
    static findDefaultByUserId(userId: string): Promise<LLMConfig | null>;
    static create(configData: Omit<LLMConfig, 'id' | 'created_at' | 'updated_at'>): Promise<LLMConfig | null>;
    static update(id: string, updates: Partial<LLMConfig>): Promise<LLMConfig | null>;
    static setDefault(id: string, userId: string): Promise<LLMConfig | null>;
    static delete(id: string): Promise<boolean>;
}
//# sourceMappingURL=LLMConfig.d.ts.map