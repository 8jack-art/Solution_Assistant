-- 添加custom_land_cost字段到investment_estimates表
ALTER TABLE investment_estimates 
ADD COLUMN custom_land_cost DECIMAL(15,2) DEFAULT NULL 
COMMENT '自定义土地费用（万元）' 
AFTER custom_loan_amount;
