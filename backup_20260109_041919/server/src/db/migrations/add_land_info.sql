-- 添加土地信息相关字段到 investment_projects 表
ALTER TABLE investment_projects 
ADD COLUMN land_mode VARCHAR(20) DEFAULT 'A' COMMENT '用地模式: A-一次性征地, B-长期租赁, C-无土地需求, D-混合用地',
ADD COLUMN land_area DECIMAL(10,2) DEFAULT 0 COMMENT '土地面积(亩)',
ADD COLUMN land_unit_price DECIMAL(10,2) DEFAULT 0 COMMENT '土地单价(万元/亩或万元/亩/年)',
ADD COLUMN land_cost DECIMAL(15,2) DEFAULT 0 COMMENT '土地费用(万元)',
ADD COLUMN land_remark TEXT COMMENT '土地信息备注',
ADD COLUMN land_lease_area DECIMAL(10,2) DEFAULT 0 COMMENT '租赁土地面积(亩,混合模式)',
ADD COLUMN land_lease_unit_price DECIMAL(10,2) DEFAULT 0 COMMENT '租赁土地单价(万元/亩/年,混合模式)',
ADD COLUMN land_purchase_area DECIMAL(10,2) DEFAULT 0 COMMENT '征地面积(亩,混合模式)',
ADD COLUMN land_purchase_unit_price DECIMAL(10,2) DEFAULT 0 COMMENT '征地单价(万元/亩,混合模式)';
