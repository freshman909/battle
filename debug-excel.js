import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '士兵数据配置.xlsx');

console.log('=== Excel 调试脚本 ===');
console.log('文件路径:', filePath);
console.log('');

const workbook = xlsx.readFile(filePath);

// 1. 所有工作表名称
console.log('【1. 所有工作表名称】');
console.log(workbook.SheetNames);
console.log('');

const firstSheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[firstSheetName];

// 2. 第一个工作表的所有原始数据
console.log('【2. 第一个工作表原始数据】');
console.log('工作表名:', firstSheetName);
const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
console.log('总行数:', rawData.length);
console.log('原始数据 (header:1 模式):');
rawData.forEach((row, idx) => {
  console.log(`  第${idx + 1}行:`, row);
});
console.log('');

// 3. 用默认方式解析（自动识别表头）
console.log('【3. 默认解析结果（自动识别表头）】');
const jsonData = xlsx.utils.sheet_to_json(worksheet);
console.log('数据条数:', jsonData.length);
console.log('');

// 4. 每一行的所有键名
console.log('【4. 每一行的所有键名】');
jsonData.forEach((row, idx) => {
  const keys = Object.keys(row);
  console.log(`  第${idx + 1}条数据键名 [${keys.length}个]:`, keys);
});
console.log('');

// 5. 特别查看第8-11行（技能区域）的数据结构
console.log('【5. 第8-11行（技能区域）的原始数据结构】');
for (let i = 7; i <= 10; i++) {
  if (i < rawData.length) {
    console.log(`  第${i + 1}行原始数据:`, rawData[i]);
  }
}
console.log('');

console.log('【6. 第8-11行（技能区域）的JSON解析结果】');
for (let i = 7; i <= 10; i++) {
  if (i < jsonData.length) {
    console.log(`  第${i + 1}条JSON数据:`);
    console.log(JSON.stringify(jsonData[i], null, 2));
  }
}
console.log('');

// 7. 输出所有原始行，方便查看完整结构
console.log('【7. 完整原始数据（所有行）】');
rawData.forEach((row, idx) => {
  console.log(`Row ${idx + 1}:`, JSON.stringify(row));
});
