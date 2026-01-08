import { Request } from 'express';
export interface User {
    id: string;
    username: string;
    password_hash: string;
    is_admin: boolean;
    is_expired: boolean;
    expired_at?: string;
    created_at: string;
    updated_at: string;
}
export interface InvestmentProject {
    id: string;
    user_id: string;
    project_name: string;
    total_investment: number;
    project_info?: string;
    status: 'draft' | 'completed';
    construction_years: number;
    operation_years: number;
    loan_ratio: number;
    loan_interest_rate: number;
    construction_unit?: string;
    location?: string;
    project_type?: string;
    is_locked: boolean;
    locked_at?: string;
    land_mode?: 'A' | 'B' | 'C' | 'D' | 'E';
    land_area?: number;
    land_unit_price?: number;
    land_cost?: number;
    land_remark?: string;
    land_lease_area?: number;
    land_lease_unit_price?: number;
    land_purchase_area?: number;
    land_purchase_unit_price?: number;
    seedling_compensation?: number;
    lease_seedling_compensation?: number;
    created_at: string;
    updated_at: string;
}
export interface InvestmentEstimate {
    id: string;
    project_id: string;
    estimate_data?: any;
    total_investment?: number;
    building_investment?: number;
    construction_interest?: number;
    gap_rate?: number;
    construction_cost: number;
    equipment_cost: number;
    installation_cost: number;
    other_cost: number;
    land_cost: number;
    basic_reserve: number;
    price_reserve: number;
    construction_period: number;
    iteration_count: number;
    final_total: number;
    loan_amount: number;
    loan_rate: number;
    custom_loan_amount?: number | null;
    custom_land_cost?: number | null;
    construction_interest_details?: any;
    loan_repayment_schedule_simple?: any;
    loan_repayment_schedule_detailed?: any;
    created_at: string;
    updated_at: string;
}
export interface RevenueCostEstimate {
    id: string;
    project_id: string;
    calculation_period: number;
    operation_period: number;
    production_start_year: number;
    full_production_year: number;
    annual_revenue: number;
    annual_cost: number;
    depreciation_years: number;
    residual_rate: number;
    amortization_years: number;
    vat_rate: number;
    additional_tax_rate: number;
    created_at: string;
    updated_at: string;
}
export interface LLMConfig {
    id: string;
    user_id: string;
    name: string;
    provider: string;
    api_key: string;
    base_url: string;
    model: string;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface JwtPayload {
    userId: string;
    username: string;
    isAdmin: boolean;
}
export interface AuthRequest extends Request {
    user?: JwtPayload;
}
//# sourceMappingURL=index.d.ts.map