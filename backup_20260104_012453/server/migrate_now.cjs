const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./src/db/database.sqlite');

console.log('检查现有字段...');
db.all('PRAGMA table_info(investment_estimates)', (err, rows) => {
  if (err) {
    console.error('错误:', err);
    process.exit(1);
  }
  const existingColumns = rows.map(row => row.name);
  console.log('现有字段:', existingColumns);
  
  const fieldsToAdd = [
    'construction_interest_details',
    'loan_repayment_schedule_simple', 
    'loan_repayment_schedule_detailed'
  ];
  
  let completed = 0;
  fieldsToAdd.forEach(field => {
    if (!existingColumns.includes(field)) {
      db.run('ALTER TABLE investment_estimates ADD COLUMN ' + field + ' TEXT', (err) => {
        if (err) {
          console.error('添加字段 ' + field + ' 失败:', err);
        } else {
          console.log('✓ 添加 ' + field + ' 字段');
        }
        completed++;
        if (completed === fieldsToAdd.length) {
          console.log('✅ 数据库迁移完成！');
          db.close();
        }
      });
    } else {
      console.log('- ' + field + ' 字段已存在');
      completed++;
      if (completed === fieldsToAdd.length) {
        console.log('✅ 数据库迁移完成！');
        db.close();
      }
    }
  });
});
