const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../db');

const router = express.Router();
const aiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function normalizeArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map(String).sort();
}

function extractTextFromContent(content) {
  if (!content || !Array.isArray(content.parts)) {
    return '';
  }
  return content.parts
    .map((part) => (part && typeof part.text === 'string' ? part.text : ''))
    .join('');
}

router.get('/subjects', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, description, order_index FROM subjects ORDER BY order_index ASC'
    );
    const subjects = result.rows.map((subject) => ({
      ...subject,
      level_count: 4,
    }));
    res.json(subjects);
  } catch (error) {
    console.error('GET /content/subjects error', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

router.get('/subjects/:subjectId', async (req, res) => {
  const { subjectId } = req.params;

  try {
    const subjectResult = await db.query(
      'SELECT id, name, description, order_index FROM subjects WHERE id = $1',
      [subjectId]
    );

    if (!subjectResult.rowCount) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    const levelsResult = await db.query(
      'SELECT id, level_number, topic, xp_reward FROM levels WHERE subject_id = $1 ORDER BY level_number ASC',
      [subjectId]
    );

    res.json({
      ...subjectResult.rows[0],
      levels: levelsResult.rows,
    });
  } catch (error) {
    console.error('GET /content/subjects/:subjectId error', error);
    res.status(500).json({ error: 'Failed to fetch subject details' });
  }
});

router.get('/levels/:levelId', async (req, res) => {
  const { levelId } = req.params;

  try {
    const result = await db.query(
      `SELECT l.id, l.subject_id, l.level_number, l.topic, l.xp_reward, s.name AS subject_name
       FROM levels l
       JOIN subjects s ON s.id = l.subject_id
       WHERE l.id = $1`,
      [levelId]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Level not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('GET /content/levels/:levelId error', error);
    res.status(500).json({ error: 'Failed to fetch level details' });
  }
});

router.get('/levels/:levelId/questions', async (req, res) => {
  const { levelId } = req.params;
  const isInternal = req.headers['x-internal-service'] === 'battle-service' || req.query.internal === 'true';

  try {
    const query = isInternal 
      ? `SELECT id, question_text, option_a, option_b, option_c, option_d, question_type, timer_seconds, correct_options, explanation
         FROM questions
         WHERE level_id = $1
         ORDER BY RANDOM()
         LIMIT 10`
      : `SELECT id, question_text, option_a, option_b, option_c, option_d, question_type, timer_seconds
         FROM questions
         WHERE level_id = $1
         ORDER BY RANDOM()
         LIMIT 10`;

    const result = await db.query(query, [levelId]);
    res.json(result.rows);
  } catch (error) {
    console.error('GET /content/levels/:levelId/questions error', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

router.post('/levels/:levelId/answer', async (req, res) => {
  const { levelId } = req.params;
  const { questionId, selectedOptions, timeTakenMs } = req.body;

  if (!questionId || !Array.isArray(selectedOptions) || typeof timeTakenMs !== 'number') {
    return res.status(400).json({ error: 'questionId, selectedOptions, and timeTakenMs are required' });
  }

  try {
    const result = await db.query(
      `SELECT correct_options, explanation, question_type
       FROM questions
       WHERE id = $1 AND level_id = $2`,
      [questionId, levelId]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Question not found for this level' });
    }

    const { correct_options: correctOptionsFromDb, explanation, question_type: questionType } = result.rows[0];
    const normalizedSelected = normalizeArray(selectedOptions);
    const normalizedCorrect = normalizeArray(correctOptionsFromDb);
    const correct =
      normalizedSelected.length === normalizedCorrect.length &&
      normalizedSelected.every((value, index) => value === normalizedCorrect[index]);

    let xpEarned = 0;
    if (correct) {
      xpEarned = questionType === 'multi_correct' ? 15 : 10;
      if (timeTakenMs < 5000) {
        xpEarned += 5;
      } else if (timeTakenMs <= 8000) {
        xpEarned += 2;
      }
    }

    res.json({
      correct,
      correctOptions: correctOptionsFromDb,
      explanation,
      xpEarned,
      questionId,
    });
  } catch (error) {
    console.error('POST /content/levels/:levelId/answer error', error);
    res.status(500).json({ error: 'Failed to evaluate answer' });
  }
});

router.post('/admin/subjects', async (req, res) => {
  const { name, description, order_index } = req.body;

  if (!name || typeof order_index !== 'number') {
    return res.status(400).json({ error: 'name and order_index are required' });
  }

  try {
    const result = await db.query(
      `INSERT INTO subjects (name, description, order_index)
       VALUES ($1, $2, $3)
       RETURNING id, name`,
      [name, description || null, order_index]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('POST /content/admin/subjects error', error);
    res.status(500).json({ error: 'Failed to create subject' });
  }
});

router.post('/admin/levels', async (req, res) => {
  const { subject_id, level_number, topic, xp_reward } = req.body;

  if (!subject_id || typeof level_number !== 'number' || !topic) {
    return res.status(400).json({ error: 'subject_id, level_number, and topic are required' });
  }

  try {
    const result = await db.query(
      `INSERT INTO levels (subject_id, level_number, topic, xp_reward)
       VALUES ($1, $2, $3, $4)
       RETURNING id, level_number, topic`,
      [subject_id, level_number, topic, xp_reward || 100]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('POST /content/admin/levels error', error);
    res.status(500).json({ error: 'Failed to create level' });
  }
});

router.post('/admin/questions/bulk', async (req, res) => {
  const { questions } = req.body;

  if (!Array.isArray(questions) || !questions.length) {
    return res.status(400).json({ error: 'questions must be a non-empty array' });
  }

  const values = [];
  const placeholders = [];

  questions.forEach((question, index) => {
    const baseIndex = index * 10;
    placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9}, $${baseIndex + 10})`);
    values.push(
      question.level_id,
      question.question_text,
      question.option_a,
      question.option_b,
      question.option_c,
      question.option_d,
      question.correct_options || [],
      question.question_type,
      question.timer_seconds || 20,
      question.explanation || null
    );
  });

  try {
    const insertQuery = `
      INSERT INTO questions (
        level_id,
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_options,
        question_type,
        timer_seconds,
        explanation
      ) VALUES ${placeholders.join(', ')}
      ON CONFLICT DO NOTHING
    `;

    const result = await db.query(insertQuery, values);
    res.json({ inserted: result.rowCount, message: 'done' });
  } catch (error) {
    console.error('POST /content/admin/questions/bulk error', error);
    res.status(500).json({ error: 'Failed to insert questions' });
  }
});

router.get('/levels/:levelId/questions/gemini', async (req, res) => {
  const { levelId } = req.params;

  try {
    const levelResult = await db.query(
      `SELECT l.topic, s.name AS subject_name
       FROM levels l
       JOIN subjects s ON s.id = l.subject_id
       WHERE l.id = $1`,
      [levelId]
    );

    if (!levelResult.rowCount) {
      return res.status(404).json({ error: 'Level not found' });
    }

    const { topic, subject_name: subjectName } = levelResult.rows[0];
    const prompt = `Generate exactly 10 multiple choice questions for the topic: ${topic} (subject: ${subjectName}). Return ONLY a valid JSON array, no markdown, no explanation. Each object must have these exact fields: question_text, option_a, option_b, option_c, option_d, correct_options (array like ['A'] or ['A','C']), timer_seconds (integer, 20-60), explanation (one line)`;

    const model = aiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const output = extractTextFromContent(result?.response?.candidates?.[0]?.content);
    const questions = JSON.parse(output.trim());

    if (!Array.isArray(questions) || questions.length !== 10) {
      throw new Error('Gemini response did not return exactly 10 questions');
    }

    res.json(questions);
  } catch (error) {
    console.error('GET /content/levels/:levelId/questions/gemini error', error);
    res.status(500).json({ error: error.message || 'Gemini request failed' });
  }
});

module.exports = router;
