import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const EXCEL_FILE = path.resolve('士兵数据配置.xlsx');

console.log('📂 读取文件:', EXCEL_FILE);
console.log('─'.repeat(60));

try {
  const workbook = XLSX.readFile(EXCEL_FILE);
  
  console.log('\n📋 所有工作表名称:');
  workbook.SheetNames.forEach((name, i) => {
    console.log(`   ${i + 1}. "${name}"`);
  });
  console.log('─'.repeat(60));

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    console.log(`\n📑 工作表: "${sheetName}"`);
    console.log(`   总行数: ${rawData.length}`);
    console.log(`   显示前20行:`);
    console.log('─'.repeat(60));
    
    rawData.slice(0, 20).forEach((row, idx) => {
      const cells = row.map(cell => {
        if (cell === undefined || cell === null || cell === '') return '(空)';
        return String(cell);
      });
      console.log(`   行${String(idx + 1).padStart(2)}: ${cells.join(' | ')}`);
    });
    
    if (rawData.length > 20) {
      console.log(`   ... (${rawData.length - 20} 行省略)`);
    }
    console.log('─'.repeat(60));
  });

} catch (error) {
  console.error('❌ 读取失败:', error.message);
  process.exit(1);
}
