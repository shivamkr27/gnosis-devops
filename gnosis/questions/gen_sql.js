/**
 * gen_sql.js — generates seed.sql from all JSON question files
 * Usage: node gen_sql.js > seed.sql
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const QUESTIONS_DIR = __dirname;
const VALID_TYPES = new Set(['easy','medium','hard','tricky','core_concept','numerical','multi_correct']);

const levelRaw = execSync(
  'kubectl exec -n gnosis postgres-0 -- psql -U postgres -d gnosis -t -c "SELECT s.name, l.level_number, l.id FROM levels l JOIN subjects s ON s.id=l.subject_id;"',
  { encoding: 'utf8' }
);

const levelMap = {};
levelRaw.split('\n').forEach(line => {
  const parts = line.trim().split('|').map(p => p.trim());
  if (parts.length === 3 && parts[2]) {
    levelMap[`${parts[0]}::${parts[1]}`] = parts[2];
  }
});

const esc = s => (s || '').replace(/'/g, "''");

const jsonFiles = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json')).sort();

let sql = 'BEGIN;\n';

for (const filename of jsonFiles) {
  const questions = JSON.parse(fs.readFileSync(path.join(QUESTIONS_DIR, filename), 'utf8'));
  if (!questions?.length) continue;

  const { subject_name, level_number } = questions[0];
  const levelId = levelMap[`${subject_name}::${level_number}`];
  if (!levelId) { process.stderr.write(`SKIP ${filename} - not found\n`); continue; }

  const values = questions.map(q => {
    let qtype = q.question_type || 'easy';
    if (!VALID_TYPES.has(qtype)) qtype = 'hard';
    const opts = JSON.stringify(q.correct_options || []).replace(/'/g, "''");
    return `('${levelId}','${esc(q.question_text)}','${esc(q.option_a)}','${esc(q.option_b)}','${esc(q.option_c)}','${esc(q.option_d)}','${opts}'::jsonb,'${qtype}',${q.timer_seconds||20},'${esc(q.explanation||'')}','pregenerated')`;
  }).join(',\n');

  sql += `-- ${filename}\nINSERT INTO questions(level_id,question_text,option_a,option_b,option_c,option_d,correct_options,question_type,timer_seconds,explanation,source) VALUES\n${values}\nON CONFLICT DO NOTHING;\n`;
}

sql += 'COMMIT;\nSELECT count(*) as total_questions FROM questions;\n';
fs.writeFileSync(path.join(__dirname, 'seed.sql'), sql);
process.stderr.write('seed.sql generated\n');
