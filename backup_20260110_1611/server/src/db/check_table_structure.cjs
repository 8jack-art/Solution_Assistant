const mysql = require('mysql2/promise');

async function checkTableStructure() {
  const connection = await mysql.createConnection({
    host: 'sql.gxch.site',
    port: 3306,
    user: 'ProjInvDB',
    password: '8Pd6tTKmkzY6rYSC',
    database: 'ProjInvDB'
  });

  try {
    console.log('检查generated_reports表结构...');
    
    const [rows] = await connection.execute('DESCRIBE generated_reports');
    console.log('generated_reports表结构:');
    console.table(rows);
    
    console.log('\n检查report_templates表结构...');
    const [templateRows] = await connection.execute('DESCRIBE report_templates');
    console.log('report_templates表结构:');
    console.table(templateRows);
    
    console.log('\n检查最新插入的报告记录...');
    const [reportRows] = await connection.execute('SELECT * FROM generated_reports ORDER BY created_at DESC LIMIT 5');
    console.log('最新的报告记录:');
    console.table(reportRows);
    
  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    await connection.end();
  }
}

checkTableStructure();