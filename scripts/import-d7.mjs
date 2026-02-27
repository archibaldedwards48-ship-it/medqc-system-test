import { readFileSync } from 'fs';
import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../.env') });

const dataFile = join(__dirname, '../data/d7_symptom_terms.json');
const terms = JSON.parse(readFileSync(dataFile, 'utf-8'));

const conn = await createConnection(process.env.DATABASE_URL);

let inserted = 0;
let skipped = 0;

for (const term of terms) {
  const [existing] = await conn.execute(
    'SELECT id FROM symptom_terms WHERE name = ?',
    [term.name]
  );
  
  if (existing.length > 0) {
    skipped++;
    continue;
  }
  
  await conn.execute(
    `INSERT INTO symptom_terms (name, aliases, body_part, nature, duration_required, associated_symptoms, related_diseases, category, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      term.name,
      JSON.stringify(term.aliases || []),
      term.bodyPart || null,
      term.nature || null,
      term.durationRequired ? 1 : 0,
      JSON.stringify(term.associatedSymptoms || []),
      JSON.stringify(term.relatedDiseases || []),
      term.category || '其他'
    ]
  );
  inserted++;
}

await conn.end();
console.log(`D7 导入完成：新增 ${inserted} 条，跳过重复 ${skipped} 条，共 ${terms.length} 条症状术语`);
