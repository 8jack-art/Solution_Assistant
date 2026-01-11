-- 添加 project_type（项目类型）字段
-- 执行时间: 2026-01-03
-- 说明：将 industry（所属行业）重命名为 project_type（项目类型）

-- 添加 project_type 字段
ALTER TABLE investment_projects
ADD COLUMN project_type VARCHAR(100) DEFAULT '' COMMENT '项目类型（曾用名：所属行业）' AFTER location;

-- 如果 industry 字段存在，将数据迁移到 project_type
-- 注意：这个操作需要根据实际情况执行，可能需要手动处理
-- UPDATE investment_projects SET project_type = industry WHERE industry IS NOT NULL AND industry != '';
