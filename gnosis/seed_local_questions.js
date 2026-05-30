const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: './api-gateway/.env' }); // or any service's .env

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'gnosis',
  user: 'postgres',
  password: 'gnosis_pass',
});

async function seedQuestions() {
  const dir = path.join(__dirname, 'questions');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  const client = await pool.connect();

  try {
    console.log(`Found ${files.length} JSON files to process.`);
    let totalInserted = 0;

    for (const file of files) {
      const content = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
      
      let questionsData = content;
      if (!Array.isArray(questionsData) && questionsData.questions) {
        const subjectName = questionsData.subject_name;
        const levelNumber = questionsData.level_number;
        questionsData = questionsData.questions.map(q => ({
          ...q,
          subject_name: subjectName,
          level_number: levelNumber
        }));
      }

      if (!Array.isArray(questionsData) || questionsData.length === 0) continue;

      for (const q of questionsData) {
        const levelRes = await client.query(`
          SELECT l.id FROM levels l
          JOIN subjects s ON s.id = l.subject_id
          WHERE s.name = $1 AND l.level_number = $2
        `, [q.subject_name, q.level_number]);

        if (levelRes.rows.length === 0) {
          console.error(`Level not found for Subject: ${q.subject_name}, Level: ${q.level_number}`);
          continue;
        }

        const levelId = levelRes.rows[0].id;
        const correctOptionsJson = JSON.stringify(q.correct_options || []);

        let qType = q.question_type || 'easy';
        if (qType === 'expert') qType = 'hard';

        const insertRes = await client.query(`
          INSERT INTO questions (
            level_id, question_text, 
            option_a, option_b, option_c, option_d,
            correct_options, question_type, 
            timer_seconds, explanation, source
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pregenerated')
          ON CONFLICT DO NOTHING
        `, [
          levelId, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
          correctOptionsJson, qType, q.timer_seconds || 20, q.explanation || ''
        ]);

        if (insertRes.rowCount > 0) totalInserted++;
      }
      console.log(`Processed ${file}`);
    }
    console.log(`\nSuccess! Inserted ${totalInserted} questions into the local database.`);
  } catch (err) {
    console.error('Error inserting questions:', err);
  } finally {
    client.release();
    pool.end();
  }
}

seedQuestions();
