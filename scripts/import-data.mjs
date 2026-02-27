/**
 * 数据导入脚本：将 JSON 数据文件导入数据库
 * - D10: content_rules (45条)
 * - D7: symptom_terms (152条)
 * - D2: qc_configs as soap_template (30条)
 * - D5: qc_configs as typo_mapping (55条)
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Load env
const dotenvPath = resolve(root, '.env');
import('dotenv').then(dotenv => dotenv.config({ path: dotenvPath }));

import mysql from 'mysql2/promise';

async function getConnection() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  return mysql.createConnection(url);
}

function loadJson(filename) {
  const path = resolve(root, 'data', filename);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

async function importContentRules(conn) {
  const rules = loadJson('d10_content_rules.json');
  console.log(`\n[D10] Importing ${rules.length} content rules...`);
  
  // Clear existing
  await conn.execute('DELETE FROM content_rules');
  
  let count = 0;
  for (const r of rules) {
    await conn.execute(
      `INSERT INTO content_rules (document_type, section, check_type, \`condition\`, error_message, severity, is_active)
       VALUES (?, ?, ?, ?, ?, ?, true)`,
      [r.documentType, r.section, r.checkType, JSON.stringify(r.condition), r.errorMessage, r.severity || 'major']
    );
    count++;
  }
  console.log(`[D10] ✅ Imported ${count} content rules`);
}

async function importSymptomTerms(conn) {
  const terms = loadJson('d7_symptom_terms.json');
  console.log(`\n[D7] Importing ${terms.length} symptom terms...`);
  
  // Clear existing
  await conn.execute('DELETE FROM symptom_terms');
  
  let count = 0;
  for (const t of terms) {
    await conn.execute(
      `INSERT INTO symptom_terms (name, aliases, body_part, nature, duration_required, associated_symptoms, related_diseases, category)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        t.name,
        JSON.stringify(t.aliases || []),
        t.bodyPart || null,
        t.nature || null,
        t.durationRequired !== false,
        JSON.stringify(t.associatedSymptoms || []),
        JSON.stringify(t.relatedDiseases || []),
        t.category || null
      ]
    );
    count++;
  }
  console.log(`[D7] ✅ Imported ${count} symptom terms`);
}

async function importSoapTemplates(conn) {
  const templates = loadJson('d2_soap_templates.json');
  console.log(`\n[D2] Importing ${templates.length} SOAP templates...`);
  
  // Clear existing soap_template configs
  await conn.execute("DELETE FROM qc_configs WHERE configType = 'soap_template'");
  
  let count = 0;
  for (const t of templates) {
    const configKey = `soap_${t.disease.replace(/\s+/g, '_')}`;
    const configValue = JSON.stringify({
      disease: t.disease,
      icdCode: t.icdCode || '',
      subjective: t.subjective,
      objective: t.objective,
      assessment: t.assessment,
      plan: t.plan
    });
    await conn.execute(
      `INSERT INTO qc_configs (configType, configKey, configValue, description, status)
       VALUES ('soap_template', ?, ?, ?, 'active')`,
      [configKey, configValue, `${t.disease} SOAP模板`]
    );
    count++;
  }
  console.log(`[D2] ✅ Imported ${count} SOAP templates`);
}

async function importTypoMappings(conn) {
  const typos = loadJson('d5_typo_mapping.json');
  console.log(`\n[D5] Importing ${typos.length} typo mappings...`);
  
  // Clear existing typo_mapping configs
  await conn.execute("DELETE FROM qc_configs WHERE configType = 'typo_mapping'");
  
  let count = 0;
  for (const t of typos) {
    const configKey = `typo_${t.wrong}`;
    const configValue = JSON.stringify({
      wrong: t.wrong,
      correct: t.correct,
      category: t.category
    });
    await conn.execute(
      `INSERT INTO qc_configs (configType, configKey, configValue, description, status)
       VALUES ('typo_mapping', ?, ?, ?, 'active')`,
      [configKey, configValue, `错别字：${t.wrong} → ${t.correct}`]
    );
    count++;
  }
  console.log(`[D5] ✅ Imported ${count} typo mappings`);
}

async function main() {
  console.log('=== 数据导入开始 ===');
  const conn = await getConnection();
  
  try {
    await importContentRules(conn);
    await importSymptomTerms(conn);
    await importSoapTemplates(conn);
    await importTypoMappings(conn);
    
    // Verify counts
    const [cr] = await conn.execute('SELECT COUNT(*) as cnt FROM content_rules');
    const [st] = await conn.execute('SELECT COUNT(*) as cnt FROM symptom_terms');
    const [soap] = await conn.execute("SELECT COUNT(*) as cnt FROM qc_configs WHERE configType = 'soap_template'");
    const [typo] = await conn.execute("SELECT COUNT(*) as cnt FROM qc_configs WHERE configType = 'typo_mapping'");
    
    console.log('\n=== 导入结果 ===');
    console.log(`content_rules: ${cr[0].cnt}`);
    console.log(`symptom_terms: ${st[0].cnt}`);
    console.log(`qc_configs (soap_template): ${soap[0].cnt}`);
    console.log(`qc_configs (typo_mapping): ${typo[0].cnt}`);
    console.log('\n=== 数据导入完成 ===');
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error('导入失败:', err);
  process.exit(1);
});
