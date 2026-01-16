-- 清理自定义变量脏数据
-- 问题：之前的代码错误地将 JSON 字符串解析为对象，导致变量名变成 0,1,2,3...

-- 查看当前脏数据
SELECT project_id, custom_variables FROM report_project_overview WHERE custom_variables IS NOT NULL;

-- 清空所有自定义变量（如果数据已损坏，这是最简单的清理方式）
UPDATE report_project_overview SET custom_variables = '{}' WHERE custom_variables IS NOT NULL;

-- 验证清理结果
SELECT project_id, custom_variables FROM report_project_overview WHERE custom_variables IS NOT NULL;
