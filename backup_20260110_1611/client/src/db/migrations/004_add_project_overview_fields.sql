-- 添加项目概况信息字段到投资估算表
-- 投资构成信息（用于AI生成项目概况）
ALTER TABLE investment_projects 
ADD COLUMN IF NOT EXISTS investment_summary TEXT COMMENT '投资构成信息，如：总投资xxx万元，其中：工程费用xxx万元...';

-- 资金来源信息（用于AI生成项目概况）
ALTER TABLE investment_projects 
ADD COLUMN IF NOT EXISTS funding_source TEXT COMMENT '资金来源信息，如：申请银行贷款xxx万元，占投资估算总额的xx%...';

-- 添加更新时间戳
ALTER TABLE investment_projects 
ADD COLUMN IF NOT EXISTS overview_updated_at TIMESTAMP NULL COMMENT '项目概况信息更新时间';

-- 如果字段已存在但没有comment，更新comment
COMMENT ON COLUMN investment_projects.investment_summary IS '投资构成信息（用于AI生成项目概况）';
COMMENT ON COLUMN investment_projects.funding_source IS '资金来源信息（用于AI生成项目概况）';
COMMENT ON COLUMN investment_projects.overview_updated_at IS '项目概况信息更新时间';
