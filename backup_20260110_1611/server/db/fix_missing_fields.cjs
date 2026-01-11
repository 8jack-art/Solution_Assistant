/**
 * 修复缺失的数据库字段
 * 执行时间: 2026-01-07
 * 问题: location 字段在 add_land_info.sql 中未定义，但在 007 迁移脚本中被引用
 */

const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'sql.gxch.site',
  port: 3306,
  user: 'ProjInvDB',
  password: '8Pd6tTKmkzY6rYSC',
  database: 'ProjInvDB'
};

async function fixMissingFields() {
  const connection = await mysql.createConnection(dbConfig);

  try {
    console.log('🔍 检查并修复缺失的数据库字段...\n');

    // 1. 检查 location 字段是否存在
    const [fields] = await connection.execute('DESCRIBE investment_projects');
    const fieldNames = fields.map(f => f.Field);

    console.log('当前 investment_projects 表字段:', fieldNames.join(', '));

    // 2. 添加缺失的字段
    const alterQueries = [];

    if (!fieldNames.includes('location')) {
      alterQueries.push(
        "ALTER TABLE investment_projects ADD COLUMN location VARCHAR(255) DEFAULT '' COMMENT '项目地点'"
      );
    }

    if (!fieldNames.includes('project_type')) {
      alterQueries.push(
        "ALTER TABLE investment_projects ADD COLUMN project_type VARCHAR(100) DEFAULT '' COMMENT '项目类型（曾用名：所属行业）'"
      );
    }

    if (!fieldNames.includes('construction_unit')) {
      alterQueries.push(
        "ALTER TABLE investment_projects ADD COLUMN construction_unit VARCHAR(255) DEFAULT '' COMMENT '建设单位'"
      );
    }

    // 3. 执行迁移
    for (const query of alterQueries) {
      try {
        await connection.execute(query);
        const fieldMatch = query.match(/ADD COLUMN\s+\w+\s+(\w+)/);
        console.log('✅ 添加字段成功:', fieldMatch ? fieldMatch[1] : 'unknown');
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log('⏭️ 字段已存在，跳过');
        } else {
          console.error('❌ 执行失败:', error.message);
        }
      }
    }

    // 4. 检查 investment_estimates 表
    const [estimateFields] = await connection.execute('DESCRIBE investment_estimates');
    const estimateFieldNames = estimateFields.map(f => f.Field);

    if (!estimateFieldNames.includes('custom_land_cost')) {
      try {
        await connection.execute(
          'ALTER TABLE investment_estimates ADD COLUMN custom_land_cost DECIMAL(15,2) NULL COMMENT "自定义土地费用（万元）" AFTER custom_loan_amount'
        );
        console.log('✅ 添加字段成功: custom_land_cost');
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log('⏭️ custom_land_cost 字段已存在，跳过');
        } else {
          console.error('❌ 执行失败:', error.message);
        }
      }
    }

    console.log('\n✅ 数据库字段修复完成！');
    console.log('请重新启动后端服务器: cd server && npm run dev');

  } catch (error) {
    console.error('❌ 数据库操作失败:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

fixMissingFields();
