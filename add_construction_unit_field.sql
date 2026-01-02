-- 为 investment_projects 表添加 construction_unit 字段
ALTER TABLE investment_projects 
ADD COLUMN construction_unit VARCHAR(255) COMMENT '建设单位' AFTER loan_interest_rate;
