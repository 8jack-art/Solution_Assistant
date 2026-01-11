-- 添加项目概况表 report_project_overview
-- 执行时间: 2024-01-06

-- 创建 report_project_overview 表
CREATE TABLE IF NOT EXISTS report_project_overview (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL COMMENT '项目ID',
  content LONGTEXT NOT NULL COMMENT '项目概况HTML内容',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_project_id (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目概况表';

-- 添加项目ID唯一索引（确保每个项目只有一条概况记录）
CREATE UNIQUE INDEX idx_project_id_unique ON report_project_overview (project_id);
