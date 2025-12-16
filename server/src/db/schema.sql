-- User表
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  is_expired BOOLEAN DEFAULT FALSE,
  expired_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 投资项目表
CREATE TABLE IF NOT EXISTS investment_projects (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  project_name VARCHAR(255) NOT NULL,
  total_investment DECIMAL(15,2) NOT NULL,
  project_info TEXT,
  status ENUM('draft', 'completed') DEFAULT 'draft',
  construction_years INT NOT NULL DEFAULT 3,
  operation_years INT NOT NULL DEFAULT 20,
  loan_ratio DECIMAL(5,4) NOT NULL DEFAULT 0.7000,
  loan_interest_rate DECIMAL(8,6) NOT NULL DEFAULT 0.049000,
  -- 用地信息字段
  land_mode VARCHAR(10) DEFAULT 'A',
  land_area DECIMAL(15,4) DEFAULT 0,
  land_unit_price DECIMAL(15,4) DEFAULT 0,
  land_lease_area DECIMAL(15,4) DEFAULT 0,
  land_lease_unit_price DECIMAL(15,4) DEFAULT 0,
  land_purchase_area DECIMAL(15,4) DEFAULT 0,
  land_purchase_unit_price DECIMAL(15,4) DEFAULT 0,
  land_cost DECIMAL(15,4) DEFAULT 0,
  land_remark TEXT,
  seedling_compensation DECIMAL(15,4) DEFAULT 0,
  is_locked BOOLEAN DEFAULT FALSE,
  locked_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
);

-- 投资估算表
CREATE TABLE IF NOT EXISTS investment_estimates (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  project_id VARCHAR(36) NOT NULL,
  estimate_data JSON,
  total_investment DECIMAL(15,2),
  building_investment DECIMAL(15,2),
  construction_interest DECIMAL(15,2),
  gap_rate DECIMAL(8,6),
  construction_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
  equipment_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
  installation_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
  other_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
  land_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
  basic_reserve DECIMAL(15,2) NOT NULL DEFAULT 0,
  price_reserve DECIMAL(15,2) NOT NULL DEFAULT 0,
  construction_period INT NOT NULL DEFAULT 3,
  iteration_count INT NOT NULL DEFAULT 0,
  final_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  loan_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  loan_rate DECIMAL(8,6) NOT NULL DEFAULT 0.049000,
  custom_loan_amount DECIMAL(15,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES investment_projects(id) ON DELETE CASCADE,
  INDEX idx_project_id (project_id)
);

-- 营收成本估算表
CREATE TABLE IF NOT EXISTS revenue_cost_estimates (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  project_id VARCHAR(36) NOT NULL,
  calculation_period INT NOT NULL DEFAULT 25,
  operation_period INT NOT NULL DEFAULT 20,
  production_start_year INT NOT NULL DEFAULT 4,
  full_production_year INT NOT NULL DEFAULT 6,
  annual_revenue DECIMAL(15,2) NOT NULL DEFAULT 0,
  annual_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
  depreciation_years INT NOT NULL DEFAULT 20,
  residual_rate DECIMAL(8,6) NOT NULL DEFAULT 0.050000,
  amortization_years INT NOT NULL DEFAULT 10,
  vat_rate DECIMAL(8,6) NOT NULL DEFAULT 0.130000,
  additional_tax_rate DECIMAL(8,6) NOT NULL DEFAULT 0.120000,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES investment_projects(id) ON DELETE CASCADE,
  INDEX idx_project_id (project_id)
);

-- LLM 配置表
CREATE TABLE IF NOT EXISTS llm_configs (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(100) NOT NULL,
  api_key VARCHAR(500) NOT NULL,
  base_url VARCHAR(500) NOT NULL,
  model VARCHAR(255) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_is_default (is_default)
);

-- 插入测试用户数据
INSERT IGNORE INTO users (id, username, password_hash, is_admin) VALUES
('admin-user-id', 'admin', '$2b$10$u89OF8bb3F6fhc9CUGOiqeIUhEJUsclPy/n4.XS0Ne9IvttS.Vruu', TRUE),
('user-user-id', 'user', '$2b$10$u89OF8bb3F6fhc9CUGOiqeIUhEJUsclPy/n4.XS0Ne9IvttS.Vruu', FALSE);

-- 密码都是 123456