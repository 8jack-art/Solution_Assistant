-- 添加 custom_land_cost 字段
-- 执行时间: 2026-01-04
-- 说明：为investment_estimates表添加custom_land_cost字段，用于保存自定义土地费用

-- 添加自定义土地费用字段
ALTER TABLE investment_estimates 
ADD COLUMN custom_land_cost DECIMAL(15,2) NULL COMMENT '自定义土地费用' AFTER custom_loan_amount;