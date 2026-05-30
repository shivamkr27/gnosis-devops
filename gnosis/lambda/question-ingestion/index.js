const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { Pool } = require('pg');

const s3 = new S3Client({ region: process.env.AWS_REGION });

// Initialize connection pool outside the handler for reuse in warm starts
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false } // Required for AWS RDS
});

exports.handler = async (event) => {
  try {
    // 1. Get bucket name and object key from event
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));

    console.log(`Processing file: s3://${bucket}/${key}`);

    // 2. Download file from S3
    const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const bodyString = await response.Body.transformToString();
    
    // Some files might be arrays of questions directly, or wrapped in an object.
    // Based on the format you provided: Array of questions where each question has subject_name, level_number
    let questionsData = JSON.parse(bodyString);
    
    // If it's an array, process each, if it's an object with a "questions" array, use that.
    // Looking at the json files locally, they are usually an array of objects.
    if (!Array.isArray(questionsData) && questionsData.questions) {
      // Prompt format: { subject_name, level_number, questions: [...] }
      const subjectName = questionsData.subject_name;
      const levelNumber = questionsData.level_number;
      // normalize so we can loop
      questionsData = questionsData.questions.map(q => ({
        ...q,
        subject_name: subjectName,
        level_number: levelNumber
      }));
    }

    if (!Array.isArray(questionsData) || questionsData.length === 0) {
      console.log('No valid questions found in file');
      return { statusCode: 400, body: 'Invalid JSON format' };
    }

    let insertedCount = 0;
    
    // Using a single client from the pool to handle multiple inserts efficiently
    const client = await pool.connect();

    try {
      // 3. For each question, get the level_id and insert
      for (const q of questionsData) {
        
        // Find level_id from DB
        const levelRes = await client.query(`
          SELECT l.id FROM levels l
          JOIN subjects s ON s.id = l.subject_id
          WHERE s.name = $1 AND l.level_number = $2
        `, [q.subject_name, q.level_number]);

        if (levelRes.rows.length === 0) {
          console.error(`Level not found for Subject: ${q.subject_name}, Level: ${q.level_number}`);
          continue; // Skip this question and move to next
        }

        const levelId = levelRes.rows[0].id;

        // Ensure correct_options is a proper JSON array format for postgres if needed
        const correctOptionsJson = JSON.stringify(q.correct_options || []);

        // Bulk insert question
        const insertRes = await client.query(`
          INSERT INTO questions (
            level_id, question_text, 
            option_a, option_b, option_c, option_d,
            correct_options, question_type, 
            timer_seconds, explanation, source
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pregenerated')
          ON CONFLICT DO NOTHING
        `, [
          levelId,
          q.question_text,
          q.option_a,
          q.option_b,
          q.option_c,
          q.option_d,
          correctOptionsJson,
          q.question_type || 'easy',
          q.timer_seconds || 20,
          q.explanation || ''
        ]);

        if (insertRes.rowCount > 0) {
          insertedCount++;
        }
      }
    } finally {
      client.release();
    }

    const resultBody = { 
      inserted: insertedCount, 
      subject: questionsData[0].subject_name,
      level: questionsData[0].level_number,
      file: key
    };
    
    console.log('Success:', resultBody);

    return { 
      statusCode: 200,
      body: JSON.stringify(resultBody)
    };

  } catch (error) {
    console.error('Error processing S3 event:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
