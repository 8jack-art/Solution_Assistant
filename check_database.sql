-- 查询投资估算数据，检查各费用字段
-- 请替换 project_id 为实际的项目ID

SELECT
    id,
    project_id,
    -- 基本投资数据
    total_investment,
    construction_cost,      -- 建设工程费
    equipment_cost,         -- 设备购置费
    installation_cost,      -- 安装工程费
    other_cost,             -- 其它费用
    land_cost,              -- 土地费用

    -- 计算第一部分工程费用总额（用于验证）
    (construction_cost + equipment_cost + installation_cost + other_cost) AS partATotal_calculated,

    -- 其他数据
    basic_reserve,
    final_total,
    iteration_count,
    gap_rate,

    -- 时间戳
    created_at,
    updated_at
FROM investment_estimates
WHERE project_id = 'your_project_id_here'  -- 替换为实际项目ID
ORDER BY updated_at DESC
LIMIT 1;
