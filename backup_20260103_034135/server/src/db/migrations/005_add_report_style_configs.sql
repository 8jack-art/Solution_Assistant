-- 创建报告样式配置表
CREATE TABLE IF NOT EXISTS report_style_configs (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT '样式名称',
    config JSON NOT NULL COMMENT '样式配置JSON',
    is_default BOOLEAN DEFAULT FALSE COMMENT '是否默认样式',
    user_id VARCHAR(36) COMMENT '用户ID（系统样式为NULL）',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_is_default (is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='报告样式配置表';
