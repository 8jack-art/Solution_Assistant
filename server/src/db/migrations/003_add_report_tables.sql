-- 投资方案报告模块相关表结构

-- 报告模板表
CREATE TABLE IF NOT EXISTS report_templates (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  prompt_template TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_is_default (is_default)
);

-- 生成的报告表
CREATE TABLE IF NOT EXISTS generated_reports (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  project_id VARCHAR(36) NOT NULL,
  template_id VARCHAR(36),
  user_id VARCHAR(36) NOT NULL,
  report_title VARCHAR(255) NOT NULL,
  report_content LONGTEXT,
  report_data JSON,
  generation_status ENUM('generating', 'completed', 'failed', 'paused') DEFAULT 'generating',
  file_path VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES investment_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES report_templates(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_project_id (project_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (generation_status),
  INDEX idx_created_at (created_at)
);

-- 报告生成历史表
CREATE TABLE IF NOT EXISTS report_generation_history (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  report_id VARCHAR(36) NOT NULL,
  chunk_content TEXT,
  chunk_order INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES generated_reports(id) ON DELETE CASCADE,
  INDEX idx_report_id (report_id),
  INDEX idx_chunk_order (chunk_order)
);

-- 插入默认的系统报告模板
INSERT IGNORE INTO report_templates (id, user_id, name, description, prompt_template, is_default, is_system) VALUES
('template-default-system', 'system', '标准投资方案报告模板', '系统默认的投资方案报告模板，包含完整的投资分析内容', '请基于以下项目数据生成一份专业的投资方案报告：

报告应包含以下部分：
1. 项目概述
2. 投资估算分析
3. 财务指标分析
4. 收入成本分析
5. 投资效益评估
6. 风险分析与建议

请使用专业的财务分析术语，确保数据准确性和分析深度。', TRUE, TRUE);