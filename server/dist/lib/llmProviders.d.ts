export interface LLMProviderConfig {
    id: string;
    name: string;
    baseUrl: string;
    defaultModel: string;
    models: string[];
}
export declare const llmProviders: LLMProviderConfig[];
export declare function getProviderById(id: string): LLMProviderConfig | undefined;
export declare function validateProviderAndModel(provider: string, model: string): boolean;
//# sourceMappingURL=llmProviders.d.ts.map