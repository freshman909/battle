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

  const result = {
    units: {},
    skills: {}
  };

  // 读取士兵系统工作表
  if (workbook.SheetNames.includes('士兵系统')) {
    const unitSheet = workbook.Sheets['士兵系统'];
    const unitRows = XLSX.utils.sheet_to_json(unitSheet, { header: 1 });

    if (unitRows.length > 1) {
      const unitHeaderRow = unitRows[0];
      const unitDataRows = unitRows.slice(1);

      console.log('士兵表头:', unitHeaderRow.filter(Boolean).join(', '));
      console.log('士兵数据行数:', unitDataRows.length);

      unitDataRows.forEach(row => {
        const key = row[0];
        if (!key) return;

        const entry = {};
        for (let i = 1; i < unitHeaderRow.length; i++) {
          const colName = unitHeaderRow[i];
          if (!colName) continue;

          let value = row[i];
          if (value === null || value === '' || value === undefined) continue;

          if (typeof value === 'string') {
            // 尝试转换为数字
            const num = Number(value);
            if (!isNaN(num) && value.trim() !== '') {
              value = num;
            } else if (value.includes(',')) {
              // 逗号分隔的数组
              value = value.split(',').map(s => s.trim()).filter(Boolean);
            }
          }

          entry[colName] = value;
        }

        result.units[key] = entry;
      });
    }
  }

  // 读取技能系统工作表
  if (workbook.SheetNames.includes('技能系统')) {
    const skillSheet = workbook.Sheets['技能系统'];
    const skillRows = XLSX.utils.sheet_to_json(skillSheet, { header: 1 });

    if (skillRows.length > 1) {
      const skillHeaderRow = skillRows[0];
      const skillDataRows = skillRows.slice(1);

      console.log('技能表头:', skillHeaderRow.filter(Boolean).join(', '));
      console.log('技能数据行数:', skillDataRows.length);

      skillDataRows.forEach(row => {
        const key = row[0];
        if (!key) return;

        const entry = {};
        for (let i = 1; i < skillHeaderRow.length; i++) {
          const colName = skillHeaderRow[i];
          if (!colName) continue;

          let value = row[i];
          if (value === null || value === '' || value === undefined) continue;

          if (typeof value === 'string') {
            // 尝试转换为数字
            const num = Number(value);
            if (!isNaN(num) && value.trim() !== '') {
              value = num;
            }
          }

          entry[colName] = value;
        }

        result.skills[key] = entry;
      });
    }
  }

  // 保存为 JSON
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(result, null, 2));

  // 同步 Excel 时间戳到 JSON 文件
  const excelStat = fs.statSync(EXCEL_FILE);
  fs.utimesSync(OUTPUT_JSON, excelStat.atime, excelStat.mtime);

  console.log('\n✅ 转换完成！');
  console.log('📄 输出文件:', OUTPUT_JSON);
  console.log('📊 单位数量:', Object.keys(result.units).length);
  console.log('🔮 技能数量:', Object.keys(result.skills).length);

  // 输出样本数据用于验证
  console.log('\n📋 单位数据样本:');
  const unitKeys = Object.keys(result.units);
  if (unitKeys.length > 0) {
    console.log(JSON.stringify(result.units[unitKeys[0]], null, 2));
  }

  console.log('\n🔮 技能数据样本:');
  const skillKeys = Object.keys(result.skills);
  if (skillKeys.length > 0) {
    console.log(JSON.stringify(result.skills[skillKeys[0]], null, 2));
  }

} catch (error) {
  console.error('❌ 转换失败:', error.message);
  console.error(error.stack);
  process.exit(1);
}
