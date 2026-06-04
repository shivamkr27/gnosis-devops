/**
 * seed_live.js — seeds all questions into the live cluster postgres
 * Run: node seed_live.js
 * Requires: kubectl configured, postgres-0 accessible
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const QUESTIONS_DIR = __dirname;
const VALID_TYPES = new Set(['easy','medium','hard','tricky','core_concept','numerical','multi_correct']);

// Step 1: Get level IDs from DB
console.log('Fetching level IDs from live DB...');
const levelRaw = execSync(
  `kubectl exec -n gnosis postgres-0 -- psql -U postgres -d gnosis -t -c "SELECT s.name, l.level_number, l.id FROM levels l JOIN subjects s ON s.id=l.subject_id;"`,
  { encoding: 'utf8' }
);

const levelMap = {};
levelRaw.split('\n').forEach(line => {
  const parts = line.trim().split('|').map(p => p.trim());
  if (parts.length === 3 && parts[2]) {
    const key = `${parts[0]}::${parts[1]}`;
    levelMap[key] = parts[2];
  }
});
console.log(`Loaded ${Object.keys(levelMap).length} levels`);

// Step 2: Process each JSON file
const jsonFiles = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json'));
console.log(`Found ${jsonFiles.length} question files`);

let totalInserted = 0;
let totalSkipped = 0;

for (const filename of jsonFiles.sort()) {
  const filepath = path.join(QUESTIONS_DIR, filename);
  const questions = JSON.parse(fs.readFileSync(filepath, 'utf8'));

  if (!questions || !questions.length) {
    console.log(`SKIP ${filename} - empty`);
    continue;
  }

  const { subject_name, level_number } = questions[0];
  const levelId = levelMap[`${subject_name}::${level_number}`];

  if (!levelId) {
    console.log(`SKIP ${filename} - level not found: "${subject_name}" L${level_number}`);
    totalSkipped++;
    continue;
  }

  // Build SQL for this batch
  const values = questions.map(q => {
    let qtype = q.question_type || 'easy';
    if (!VALID_TYPES.has(qtype)) qtype = 'hard';

    const esc = s => (s || '').replace(/'/g, "''");
    const opts = JSON.stringify(q.correct_options || []).replace(/'/g, "''");

    return `('${levelId}','${esc(q.question_text)}','${esc(q.option_a)}','${esc(q.option_b)}','${esc(q.option_c)}','${esc(q.option_d)}','${opts}'::jsonb,'${qtype}',${q.timer_seconds||20},'${esc(q.explanation||'')}','pregenerated')`;
  }).join(',\n');

  const sql = `
INSERT INTO questions(level_id,question_text,option_a,option_b,option_c,option_d,correct_options,question_type,timer_seconds,explanation,source)
VALUES ${values}
ON CONFLICT DO NOTHING;
SELECT COUNT(*) FROM questions WHERE level_id='${levelId}';
`;

  try {
    const result = execSync(
      `kubectl exec -n gnosis postgres-0 -- psql -U postgres -d gnosis -c "${sql.replace(/"/g, '\\"')}"`,
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );
    const countMatch = result.match(/(\d+)/);
    const count = countMatch ? parseInt(countMatch[1]) : '?';
    console.log(`OK  ${filename} → level ${levelId.slice(0,8)}... (${questions.length} q, DB count: ${count})`);
    totalInserted += questions.length;
  } catch (err) {
    console.error(`ERR ${filename}:`, err.message.slice(0, 200));
    totalSkipped++;
  }
}

console.log(`\nDONE: ~${totalInserted} questions processed, ${totalSkipped} files skipped`);
execSync(
  `kubectl exec -n gnosis postgres-0 -- psql -U postgres -d gnosis -c "SELECT count(*) as total_questions FROM questions;"`,
  { stdio: 'inherit' }
);
