-- 扩展营收成本估算表结构
-- 添加详细的收入成本建模数据存储

-- 创建收入项明细表
CREATE TABLE IF NOT EXISTS revenue_items (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  estimate_id VARCHAR(36) NOT NULL,
  item_index INT NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL COMMENT 'digital-platform, agriculture-crop, manufacturing, service, real-estate, other',
  field_template VARCHAR(50) NOT NULL COMMENT 'quantity-price, area-yield-price, capacity-utilization, subscription, direct-amount',
  
  -- 动态字段
  quantity DECIMAL(15,4) DEFAULT NULL,
  unit_price DECIMAL(15,4) DEFAULT NULL,
  area DECIMAL(15,4) DEFAULT NULL COMMENT '面积（亩）',
  yield_per_area DECIMAL(15,4) DEFAULT NULL COMMENT '亩产量',
  capacity DECIMAL(15,4) DEFAULT NULL COMMENT '产能',
  utilization_rate DECIMAL(8,6) DEFAULT NULL COMMENT '利用率',
  subscriptions INT DEFAULT NULL COMMENT '订阅数',
  direct_amount DECIMAL(15,2) DEFAULT NULL COMMENT '直接金额',
  
  -- 税务字段
  vat_rate DECIMAL(8,6) NOT NULL DEFAULT 0.130000 COMMENT '增值税率',
  
  -- 备注
  remark TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (estimate_id) REFERENCES revenue_cost_estimates(id) ON DELETE CASCADE,
  INDEX idx_estimate_id (estimate_id)
) COMMENT='收入项明细表';

-- 创建成本项明细表
CREATE TABLE IF NOT EXISTS cost_items (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  estimate_id VARCHAR(36) NOT NULL,
  item_index INT NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL COMMENT 'raw-material, labor, manufacturing, other',
  field_template VARCHAR(50) NOT NULL COMMENT 'quantity-price, direct-amount',
  
  -- 动态字段
  quantity DECIMAL(15,4) DEFAULT NULL,
  unit_price DECIMAL(15,4) DEFAULT NULL,
  direct_amount DECIMAL(15,2) DEFAULT NULL,
  
  -- 备注
  remark TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (estimate_id) REFERENCES revenue_cost_estimates(id) ON DELETE CASCADE,
  INDEX idx_estimate_id (estimate_id)
) COMMENT='成本项明细表';

-- 创建达产率配置表
CREATE TABLE IF NOT EXISTS production_rates (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  estimate_id VARCHAR(36) NOT NULL,
  year_index INT NOT NULL COMMENT '运营年份（1-based）',
  rate DECIMAL(8,6) NOT NULL COMMENT '达产率（0-1）',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (estimate_id) REFERENCES revenue_cost_estimates(id) ON DELETE CASCADE,
  INDEX idx_estimate_id (estimate_id),
  UNIQUE KEY unique_estimate_year (estimate_id, year_index)
) COMMENT='达产率配置表';

-- 更新营收成本估算表，添加工作流状态字段
ALTER TABLE revenue_cost_estimates 
ADD COLUMN IF NOT EXISTS workflow_step VARCHAR(20) DEFAULT 'period' 
COMMENT 'period, suggest, revenue, cost, profit, validate, done';

ALTER TABLE revenue_cost_estimates 
ADD COLUMN IF NOT EXISTS model_data JSON 
COMMENT '完整的建模数据（JSON格式存储）';

ALTER TABLE revenue_cost_estimates 
ADD COLUMN IF NOT EXISTS validation_errors JSON 
COMMENT '验证错误信息';

ALTER TABLE revenue_cost_estimates 
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE 
COMMENT '是否完成建模';

-- 添加索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_workflow_step ON revenue_cost_estimates(workflow_step);
CREATE INDEX IF NOT EXISTS idx_is_completed ON revenue_cost_estimates(is_completed);
