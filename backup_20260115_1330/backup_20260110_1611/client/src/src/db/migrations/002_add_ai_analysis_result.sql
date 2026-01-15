-- 添加 AI 分析结果字段到营收成本估算表
ALTER TABLE revenue_cost_estimates 
ADD COLUMN IF NOT EXISTS ai_analysis_result JSON 
COMMENT 'AI分析结果（JSON格式存储）';