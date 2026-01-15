-- 添加报告生成所需的字段到 investment_projects 表
-- 执行时间: 2024-01-03

-- 添加 location（项目地点）字段
ALTER TABLE investment_projects
ADD COLUMN location VARCHAR(255) DEFAULT '' COMMENT '项目地点' AFTER operation_years;

-- 添加 industry（所属行业）字段
ALTER TABLE investment_projects
ADD COLUMN industry VARCHAR(100) DEFAULT '' COMMENT '所属行业' AFTER location;

-- 如果 construction_unit 已经存在（从 migrate_add_construction_unit.sql），则只添加 location 和 industry
-- 如果不存在则添加 construction_unit
ALTER TABLE investment_projects
ADD COLUMN construction_unit VARCHAR(255) DEFAULT '' COMMENT '建设单位' AFTER industry;
