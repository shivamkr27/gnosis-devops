const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'questions');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

const subjectsMap = {}; // subject_name -> { levels: { [level_number]: topic } }

files.forEach(file => {
  const content = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
  if (content.length > 0) {
    const q = content[0];
    const subName = q.subject_name;
    const lvlNum = q.level_number;
    const topic = q.level_topic;

    if (!subjectsMap[subName]) {
      subjectsMap[subName] = { levels: {} };
    }
    subjectsMap[subName].levels[lvlNum] = topic;
  }
});

let sql = `CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  total_xp INT DEFAULT 0,
  streak_count INT DEFAULT 0,
  last_active_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(requester_id, receiver_id)
);

CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  order_index INT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  level_number INT NOT NULL CHECK (level_number BETWEEN 1 AND 4),
  topic VARCHAR(200) NOT NULL,
  xp_reward INT DEFAULT 100,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(subject_id, level_number)
);

CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id UUID REFERENCES levels(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_options JSONB NOT NULL,
  question_type VARCHAR(20) CHECK (question_type IN (
    'easy','medium','hard','tricky',
    'core_concept','numerical','multi_correct'
  )),
  timer_seconds INT DEFAULT 20,
  explanation TEXT,
  source VARCHAR(20) DEFAULT 'pregenerated',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  level_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  status VARCHAR(20) DEFAULT 'locked'
    CHECK (status IN ('locked', 'unlocked', 'complete')),
  xp_earned INT DEFAULT 0,
  completed_at TIMESTAMP,
  UNIQUE(user_id, level_id)
);

CREATE TABLE IF NOT EXISTS daily_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  activity_date DATE NOT NULL,
  levels_completed INT DEFAULT 0,
  UNIQUE(user_id, activity_date)
);

CREATE TABLE IF NOT EXISTS xp_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  username VARCHAR(50) NOT NULL,
  amount INT NOT NULL,
  source VARCHAR(30) CHECK (source IN (
    'lesson', 'streak_bonus', 'level_complete', 'battle'
  )),
  scope VARCHAR(10) CHECK (scope IN ('global', 'room')),
  room_id VARCHAR(20),
  awarded_at TIMESTAMP DEFAULT NOW()
);

-- SUBJECTS insert
INSERT INTO subjects (name, description, order_index) VALUES
`;
let subjectIndex = 1;
const subjectNames = Object.keys(subjectsMap);

const subjectsValues = subjectNames.map(name => {
  return `('${name.replace(/'/g, "''")}', 'Description for ${name.replace(/'/g, "''")}', ${subjectIndex++})`;
}).join(',\n');

sql += subjectsValues + `\nON CONFLICT (order_index) DO NOTHING;\n\n`;

sql += `-- LEVELS insert\nINSERT INTO levels (subject_id, level_number, topic, xp_reward)\n`;
let firstLevel = true;

subjectNames.forEach(subName => {
  const levels = subjectsMap[subName].levels;
  Object.keys(levels).forEach(lvlNum => {
    const topic = levels[lvlNum];
    let xp = 100;
    if (lvlNum == 2) xp = 150;
    if (lvlNum == 3) xp = 200;
    if (lvlNum == 4) xp = 250;

    if (!firstLevel) {
      sql += `UNION ALL\n`;
    }
    firstLevel = false;

    sql += `SELECT id, ${lvlNum}, '${topic.replace(/'/g, "''")}', ${xp} FROM subjects WHERE name = '${subName.replace(/'/g, "''")}'\n`;
  });
});

sql += `ON CONFLICT DO NOTHING; -- assuming standard conflict handling or adjust as needed\n`;

fs.writeFileSync(path.join(__dirname, 'init_db.sql'), sql);
console.log('Generated init_db.sql with ' + subjectNames.length + ' subjects.');
