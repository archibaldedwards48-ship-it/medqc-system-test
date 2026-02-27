import { readFileSync } from 'fs';
import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../.env') });

const dataFile = join(__dirname, '../data/d10_content_rules.json');
const rules = JSON.parse(readFileSync(dataFile, 'utf-8'));

const conn = await createConnection(process.env.DATABASE_URL);

let inserted = 0;
let skipped = 0;

for (const rule of rules) {
  const [existing] = await conn.execute(
    'SELECT id FROM content_rules WHERE document_type = ? AND section = ? AND check_type = ?',
    [rule.documentType, rule.section, rule.checkType]
  );
  
  if (existing.length > 0) {
    skipped++;
    continue;
  }
  
  await conn.execute(
    `INSERT INTO content_rules (document_type, section, check_type, condition, error_message, severity, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, NOW())`,
    [
      rule.documentType,
      rule.section,
      rule.checkType,
      JSON.stringify(rule.condition),
      rule.errorMessage,
      rule.severity || 'major'
    ]
  );
  inserted++;
}

await conn.end();
console.log(`✅ D10 导入完成：新增 ${inserted} 条，跳过重复 ${skipped} 条，共 ${rules.length} 条规则`);
