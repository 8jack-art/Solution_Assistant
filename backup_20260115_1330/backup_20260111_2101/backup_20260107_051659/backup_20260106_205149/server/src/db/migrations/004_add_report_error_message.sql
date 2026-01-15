-- 为报告表添加 error_message 字段
-- 日期: 2024-01-02

-- 1. 为 generated_reports 表添加 error_message 字段
ALTER TABLE generated_reports
ADD COLUMN IF NOT EXISTS error_message TEXT AFTER generation_status;

-- 2. 为 generated_reports 表添加 style_config 字段（JSON格式存储样式配置）
ALTER TABLE generated_reports
ADD COLUMN IF NOT EXISTS style_config JSON AFTER report_data;

-- 3. 为 generated_reports 表添加 sections_config 字段（JSON格式存储章节配置）
ALTER TABLE generated_reports
ADD COLUMN IF NOT EXISTS sections_config JSON AFTER style_config;

-- 4. 为 generated_reports 表添加 resources_config 字段（JSON格式存储资源映射）
ALTER TABLE generated_reports
ADD COLUMN IF NOT EXISTS resources_config JSON AFTER sections_config;
