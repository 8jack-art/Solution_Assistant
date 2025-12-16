import { LLMConfig as DBLLMConfig } from '../types/index.js';
export interface LLMMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
export interface LLMResponse {
    success: boolean;
    content?: string;
    error?: string;
}
export declare class LLMService {
    static testConnection(config: DBLLMConfig | {
        apiKey: string;
        baseUrl: string;
        model: string;
        provider: string;
        name: string;
    }): Promise<LLMResponse>;
    static generateContent(config: DBLLMConfig, messages: LLMMessage[], options?: {
        maxTokens?: number;
        temperature?: number;
    }): Promise<LLMResponse>;
}
export declare function generateInvestmentPrompt(projectInfo: {
    projectName: string;
    totalInvestment: number;
    constructionYears: number;
    industry?: string;
}): LLMMessage[];
export declare function analyzeEngineeringItemsPrompt(projectName: string, projectDescription: string, totalInvestment: number): LLMMessage[];
export declare function subdivideEngineeringItemPrompt(itemName: string, itemRemark: string, totalAmount: number, projectName: string, projectDescription: string): LLMMessage[];
export declare function analyzeRevenueStructurePrompt(projectName: string, projectDescription: string, totalInvestment: number, engineeringItems?: Array<{
    name: string;
    amount: number;
}>): LLMMessage[];
export declare function analyzeProjectInfoPrompt(projectInfo: string): LLMMessage[];
//# sourceMappingURL=llm.d.ts.map