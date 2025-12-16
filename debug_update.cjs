const mysql = require('mysql2/promise');

async function debugUpdate() {
  const connection = await mysql.createConnection({
    host: 'sql.gxch.site',
    port: 3306,
    user: 'ProjInvDB',
    password: '8Pd6tTKmkzY6rYSC',
    database: 'ProjInvDB'
  });

  try {
    // 1. 查询一个估算记录
    const [estimates] = await connection.execute(
      'SELECT id, project_id, custom_loan_amount, custom_land_cost FROM investment_estimates LIMIT 1'
    );
    
    if (estimates.length === 0) {
      console.log('❌ 没有找到估算记录');
      return;
    }
    
    const estimate = estimates[0];
    console.log('找到估算记录:', estimate);
    
    // 2. 尝试更新custom_land_cost
    console.log('\n尝试更新custom_land_cost为5000...');
    try {
      await connection.execute(
        'UPDATE investment_estimates SET custom_land_cost = ? WHERE id = ?',
        [5000, estimate.id]
      );
      console.log('✅ 更新成功');
      
      // 3. 验证更新
      const [updated] = await connection.execute(
        'SELECT custom_loan_amount, custom_land_cost FROM investment_estimates WHERE id = ?',
        [estimate.id]
      );
      console.log('更新后的值:', updated[0]);
      
    } catch (updateError) {
      console.error('❌ 更新失败:', updateError.message);
      console.error('SQL State:', updateError.sqlState);
      console.error('错误代码:', updateError.code);
    }
    
    // 4. 测试动态字段更新
    console.log('\n测试动态字段更新...');
    const fields = ['custom_loan_amount', 'custom_land_cost'];
    const values = [30000, 6000];
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    console.log('SET子句:', setClause);
    console.log('值:', values);
    
    try {
      await connection.execute(
        `UPDATE investment_estimates SET ${setClause} WHERE id = ?`,
        [...values, estimate.id]
      );
      console.log('✅ 动态更新成功');
      
      const [updated2] = await connection.execute(
        'SELECT custom_loan_amount, custom_land_cost FROM investment_estimates WHERE id = ?',
        [estimate.id]
      );
      console.log('更新后的值:', updated2[0]);
      
    } catch (dynamicError) {
      console.error('❌ 动态更新失败:', dynamicError.message);
    }
    
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await connection.end();
  }
}

debugUpdate();
