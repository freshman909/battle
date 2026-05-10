import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Excel 文件路径
const EXCEL_FILE = path.resolve('士兵数据配置.xlsx');
// 输出 JSON 文件路径
const OUTPUT_JSON = path.resolve('units.json');

try {
  // 读取 Excel
  const workbook = XLSX.readFile(EXCEL_FILE);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // 转换为 JSON
  const rawData = XLSX.utils.sheet_to_json(sheet);
  
  if (rawData.length === 0) {
    console.error('Excel 文件为空');
    process.exit(1);
  }
  
  // 自动获取所有列名（除了"单位类型"作为 key）
  const columns = Object.keys(rawData[0]);
  const keyColumn = columns.find(col => col.includes('类型') || col.includes('名称'));
  const valueColumns = columns.filter(col => col !== keyColumn);
  
  console.log('检测到列:', columns.join(', '));
  console.log('主键列:', keyColumn);
  console.log('数据行数:', rawData.length);
  
  // 转换为对象格式（保留所有列）
  const result = {};
  
  rawData.forEach(row => {
    const key = row[keyColumn];
    if (!key) return;
    
    const entry = {};
    valueColumns.forEach(col => {
      let value = row[col];
      
      // 自动类型转换
      if (typeof value === 'string') {
        // 尝试转换为数字
        const num = Number(value);
        if (!isNaN(num)) {
          value = num;
        }
        // 尝试解析逗号分隔的标签数组
        else if (value.includes(',')) {
          value = value.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
      
      entry[col] = value;
    });
    
    result[key] = entry;
  });
  
  // 保存为 JSON
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(result, null, 2));
  
  console.log('✅ 转换完成！');
  console.log('📄 输出文件:', OUTPUT_JSON);
  console.log('📊 单位数量:', Object.keys(result).length);
  
} catch (error) {
  console.error('❌ 转换失败:', error.message);
  process.exit(1);
}
