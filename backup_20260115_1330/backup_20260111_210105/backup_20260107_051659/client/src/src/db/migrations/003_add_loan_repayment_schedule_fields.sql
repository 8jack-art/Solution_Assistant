-- 添加借款还本付息计划表相关字段
-- 执行日期：2025-12-29
-- 说明：为investment_estimates表添加建设期利息详情和还本付息计划表字段

-- 添加建设期利息详情字段
ALTER TABLE investment_estimates 
ADD COLUMN construction_interest_details JSON NULL COMMENT '建设期利息详情JSON数据';

-- 添加还本付息计划简表字段（等额本金）
ALTER TABLE investment_estimates 
ADD COLUMN loan_repayment_schedule_simple JSON NULL COMMENT '还本付息计划简表JSON数据（等额本金）';

-- 添加还本付息计划详细表字段（等额本息）
ALTER TABLE investment_estimates 
ADD COLUMN loan_repayment_schedule_detailed JSON NULL COMMENT '还本付息计划详细表JSON数据（等额本息）';
