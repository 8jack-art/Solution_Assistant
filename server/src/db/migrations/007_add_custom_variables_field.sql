-- 在 report_project_overview 表添加 custom_variables JSON 字段
-- 用于存储项目的自定义变量，按项目隔离

ALTER TABLE report_project_overview
ADD COLUMN IF NOT EXISTS custom_variables JSON COMMENT '自定义变量，键值对格式，如 {"{{my_var}}": "值"}';
