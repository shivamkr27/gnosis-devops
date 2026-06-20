CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  total_xp INT DEFAULT 0,
  streak_count INT DEFAULT 0,
  last_active_date DATE,
  is_admin BOOLEAN DEFAULT FALSE,
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
  answers JSONB DEFAULT '[]',
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
('AWS Cloud Mastery', 'Description for AWS Cloud Mastery', 1),
('CI/CD & GitOps', 'Description for CI/CD & GitOps', 2),
('COA', 'Description for COA', 3),
('Cryptography (Ciphers & Numericals)', 'Description for Cryptography (Ciphers & Numericals)', 4),
('C Programming', 'Description for C Programming', 5),
('Algorithms (DAA)', 'Description for Algorithms (DAA)', 6),
('DBMS', 'Description for DBMS', 7),
('Computer Networks (DCN)', 'Description for Computer Networks (DCN)', 8),
('DevSecOps', 'Description for DevSecOps', 9),
('Microprocessors', 'Description for Microprocessors', 10),
('Docker & Containers', 'Description for Docker & Containers', 11),
('Data Structures', 'Description for Data Structures', 12),
('Discrete Mathematics', 'Description for Discrete Mathematics', 13),
('Java Development', 'Description for Java Development', 14),
('Kubernetes (K8s)', 'Description for Kubernetes (K8s)', 15),
('Linux', 'Description for Linux', 16),
('Logical Reasoning', 'Description for Logical Reasoning', 17),
('Object Oriented Design (OOAD)', 'Description for Object Oriented Design (OOAD)', 18),
('Operating Systems (OS)', 'Description for Operating Systems (OS)', 19),
('Python Programming', 'Description for Python Programming', 20),
('Quantitative Ability', 'Description for Quantitative Ability', 21),
('Software Engineering', 'Description for Software Engineering', 22),
('System Design', 'Description for System Design', 23),
('Terraform (IaC)', 'Description for Terraform (IaC)', 24),
('TOC', 'Description for TOC', 25)
ON CONFLICT (order_index) DO NOTHING;

-- LEVELS insert
INSERT INTO levels (subject_id, level_number, topic, xp_reward)
SELECT id, 1, 'Intro to AWS', 100 FROM subjects WHERE name = 'AWS Cloud Mastery'
UNION ALL
SELECT id, 2, 'IAM Policies', 150 FROM subjects WHERE name = 'AWS Cloud Mastery'
UNION ALL
SELECT id, 3, 'VPC Networking', 200 FROM subjects WHERE name = 'AWS Cloud Mastery'
UNION ALL
SELECT id, 4, 'Advanced VPC Architecture', 250 FROM subjects WHERE name = 'AWS Cloud Mastery'
UNION ALL
SELECT id, 1, 'Pipelines', 100 FROM subjects WHERE name = 'CI/CD & GitOps'
UNION ALL
SELECT id, 2, 'Git Branching Strategies', 150 FROM subjects WHERE name = 'CI/CD & GitOps'
UNION ALL
SELECT id, 3, 'Advanced GitOps', 200 FROM subjects WHERE name = 'CI/CD & GitOps'
UNION ALL
SELECT id, 4, 'Chaos Engineering', 250 FROM subjects WHERE name = 'CI/CD & GitOps'
UNION ALL
SELECT id, 1, 'Digital Logic', 100 FROM subjects WHERE name = 'COA'
UNION ALL
SELECT id, 2, 'Memory Hierarchy', 150 FROM subjects WHERE name = 'COA'
UNION ALL
SELECT id, 3, 'CPU Components', 200 FROM subjects WHERE name = 'COA'
UNION ALL
SELECT id, 4, 'I/O Organization', 250 FROM subjects WHERE name = 'COA'
UNION ALL
SELECT id, 1, 'Topic 1', 100 FROM subjects WHERE name = 'Cryptography (Ciphers & Numericals)'
UNION ALL
SELECT id, 2, 'Topic 1', 150 FROM subjects WHERE name = 'Cryptography (Ciphers & Numericals)'
UNION ALL
SELECT id, 3, 'Topic 1', 200 FROM subjects WHERE name = 'Cryptography (Ciphers & Numericals)'
UNION ALL
SELECT id, 4, 'Topic 1', 250 FROM subjects WHERE name = 'Cryptography (Ciphers & Numericals)'
UNION ALL
SELECT id, 1, 'Memory Layout, Storage Classes, Operator Precedence', 100 FROM subjects WHERE name = 'C Programming'
UNION ALL
SELECT id, 2, 'Pointer Arithmetic, Array-Pointer duality, Function Pointers', 150 FROM subjects WHERE name = 'C Programming'
UNION ALL
SELECT id, 3, 'Dynamic Memory Allocation, File I/O', 200 FROM subjects WHERE name = 'C Programming'
UNION ALL
SELECT id, 4, 'Structures, Unions, Bit-fields, Hardware Interfacing', 250 FROM subjects WHERE name = 'C Programming'
UNION ALL
SELECT id, 1, 'Big O Notation', 100 FROM subjects WHERE name = 'Algorithms (DAA)'
UNION ALL
SELECT id, 2, 'Sorting Patterns', 150 FROM subjects WHERE name = 'Algorithms (DAA)'
UNION ALL
SELECT id, 3, 'Advanced DP', 200 FROM subjects WHERE name = 'Algorithms (DAA)'
UNION ALL
SELECT id, 4, 'P vs NP', 250 FROM subjects WHERE name = 'Algorithms (DAA)'
UNION ALL
SELECT id, 1, 'ER Modeling', 100 FROM subjects WHERE name = 'DBMS'
UNION ALL
SELECT id, 2, 'Normalization', 150 FROM subjects WHERE name = 'DBMS'
UNION ALL
SELECT id, 3, 'Indexing', 200 FROM subjects WHERE name = 'DBMS'
UNION ALL
SELECT id, 4, 'Distributed Databases', 250 FROM subjects WHERE name = 'DBMS'
UNION ALL
SELECT id, 1, 'OSI Model', 100 FROM subjects WHERE name = 'Computer Networks (DCN)'
UNION ALL
SELECT id, 2, 'Data Link Layer', 150 FROM subjects WHERE name = 'Computer Networks (DCN)'
UNION ALL
SELECT id, 3, 'TCP Congestion Control', 200 FROM subjects WHERE name = 'Computer Networks (DCN)'
UNION ALL
SELECT id, 4, 'Advanced TCP', 250 FROM subjects WHERE name = 'Computer Networks (DCN)'
UNION ALL
SELECT id, 1, 'Security Basics', 100 FROM subjects WHERE name = 'DevSecOps'
UNION ALL
SELECT id, 2, 'Security Scanning', 150 FROM subjects WHERE name = 'DevSecOps'
UNION ALL
SELECT id, 3, 'Security in Pipelines', 200 FROM subjects WHERE name = 'DevSecOps'
UNION ALL
SELECT id, 4, 'Advanced Application Security', 250 FROM subjects WHERE name = 'DevSecOps'
UNION ALL
SELECT id, 1, '8085 Architecture', 100 FROM subjects WHERE name = 'Microprocessors'
UNION ALL
SELECT id, 2, 'Addressing Modes', 150 FROM subjects WHERE name = 'Microprocessors'
UNION ALL
SELECT id, 3, 'Interrupts', 200 FROM subjects WHERE name = 'Microprocessors'
UNION ALL
SELECT id, 4, '8086 Architecture', 250 FROM subjects WHERE name = 'Microprocessors'
UNION ALL
SELECT id, 1, 'Docker Basics', 100 FROM subjects WHERE name = 'Docker & Containers'
UNION ALL
SELECT id, 2, 'Networking', 150 FROM subjects WHERE name = 'Docker & Containers'
UNION ALL
SELECT id, 3, 'Docker Swarm', 200 FROM subjects WHERE name = 'Docker & Containers'
UNION ALL
SELECT id, 4, 'Architecture', 250 FROM subjects WHERE name = 'Docker & Containers'
UNION ALL
SELECT id, 1, 'Basics & Big-O', 100 FROM subjects WHERE name = 'Data Structures'
UNION ALL
SELECT id, 2, 'Trees, Heaps & Hashing', 150 FROM subjects WHERE name = 'Data Structures'
UNION ALL
SELECT id, 3, 'Dynamic Programming & Graphs', 200 FROM subjects WHERE name = 'Data Structures'
UNION ALL
SELECT id, 4, 'Expert Algorithms & String Theory', 250 FROM subjects WHERE name = 'Data Structures'
UNION ALL
SELECT id, 1, 'Set Theory', 100 FROM subjects WHERE name = 'Discrete Mathematics'
UNION ALL
SELECT id, 2, 'Combinatorics', 150 FROM subjects WHERE name = 'Discrete Mathematics'
UNION ALL
SELECT id, 3, 'Graph Theory', 200 FROM subjects WHERE name = 'Discrete Mathematics'
UNION ALL
SELECT id, 4, 'Recurrence Relations', 250 FROM subjects WHERE name = 'Discrete Mathematics'
UNION ALL
SELECT id, 1, 'JVM Architecture, Bytecode, Wrapper Classes', 100 FROM subjects WHERE name = 'Java Development'
UNION ALL
SELECT id, 2, 'OOPs (Inheritance, Polymorphism, Abstraction, Interfaces), Exception Handling', 150 FROM subjects WHERE name = 'Java Development'
UNION ALL
SELECT id, 3, 'Collections Framework (List, Set, Map, Queue), Generics', 200 FROM subjects WHERE name = 'Java Development'
UNION ALL
SELECT id, 4, 'Multithreading, Java 8 Features (Lambda, Streams, Optional), File I/O (NIO.2)', 250 FROM subjects WHERE name = 'Java Development'
UNION ALL
SELECT id, 1, 'K8s Architecture', 100 FROM subjects WHERE name = 'Kubernetes (K8s)'
UNION ALL
SELECT id, 2, 'Pod Lifecycle', 150 FROM subjects WHERE name = 'Kubernetes (K8s)'
UNION ALL
SELECT id, 3, 'Advanced Scheduling', 200 FROM subjects WHERE name = 'Kubernetes (K8s)'
UNION ALL
SELECT id, 4, 'Advanced Architecture', 250 FROM subjects WHERE name = 'Kubernetes (K8s)'
UNION ALL
SELECT id, 1, 'Basic Commands', 100 FROM subjects WHERE name = 'Linux'
UNION ALL
SELECT id, 2, 'Redirection', 150 FROM subjects WHERE name = 'Linux'
UNION ALL
SELECT id, 3, 'Shell Scripting', 200 FROM subjects WHERE name = 'Linux'
UNION ALL
SELECT id, 4, 'Process Management', 250 FROM subjects WHERE name = 'Linux'
UNION ALL
SELECT id, 1, 'Series', 100 FROM subjects WHERE name = 'Logical Reasoning'
UNION ALL
SELECT id, 2, 'Topic 1', 150 FROM subjects WHERE name = 'Logical Reasoning'
UNION ALL
SELECT id, 3, 'Topic 1', 200 FROM subjects WHERE name = 'Logical Reasoning'
UNION ALL
SELECT id, 4, 'Topic 1', 250 FROM subjects WHERE name = 'Logical Reasoning'
UNION ALL
SELECT id, 1, 'SOLID Principles', 100 FROM subjects WHERE name = 'Object Oriented Design (OOAD)'
UNION ALL
SELECT id, 2, 'Topic 1', 150 FROM subjects WHERE name = 'Object Oriented Design (OOAD)'
UNION ALL
SELECT id, 3, 'Topic 1', 200 FROM subjects WHERE name = 'Object Oriented Design (OOAD)'
UNION ALL
SELECT id, 4, 'Topic 1', 250 FROM subjects WHERE name = 'Object Oriented Design (OOAD)'
UNION ALL
SELECT id, 1, 'OS Basics', 100 FROM subjects WHERE name = 'Operating Systems (OS)'
UNION ALL
SELECT id, 2, 'Scheduling Algorithms', 150 FROM subjects WHERE name = 'Operating Systems (OS)'
UNION ALL
SELECT id, 3, 'Paging', 200 FROM subjects WHERE name = 'Operating Systems (OS)'
UNION ALL
SELECT id, 4, 'Advanced Scheduling', 250 FROM subjects WHERE name = 'Operating Systems (OS)'
UNION ALL
SELECT id, 1, 'Basics & Data Types', 100 FROM subjects WHERE name = 'Python Programming'
UNION ALL
SELECT id, 2, 'Intermediate Concepts', 150 FROM subjects WHERE name = 'Python Programming'
UNION ALL
SELECT id, 3, 'OOP & Advanced Structures', 200 FROM subjects WHERE name = 'Python Programming'
UNION ALL
SELECT id, 4, 'Expert Internals & Async', 250 FROM subjects WHERE name = 'Python Programming'
UNION ALL
SELECT id, 1, 'Numbers', 100 FROM subjects WHERE name = 'Quantitative Ability'
UNION ALL
SELECT id, 2, 'Topic 1', 150 FROM subjects WHERE name = 'Quantitative Ability'
UNION ALL
SELECT id, 3, 'Topic 1', 200 FROM subjects WHERE name = 'Quantitative Ability'
UNION ALL
SELECT id, 4, 'Topic 1', 250 FROM subjects WHERE name = 'Quantitative Ability'
UNION ALL
SELECT id, 1, 'SDLC Models', 100 FROM subjects WHERE name = 'Software Engineering'
UNION ALL
SELECT id, 2, 'Testing Levels', 150 FROM subjects WHERE name = 'Software Engineering'
UNION ALL
SELECT id, 3, 'Design Patterns', 200 FROM subjects WHERE name = 'Software Engineering'
UNION ALL
SELECT id, 4, 'Software Metrics', 250 FROM subjects WHERE name = 'Software Engineering'
UNION ALL
SELECT id, 1, 'Vertical Scaling', 100 FROM subjects WHERE name = 'System Design'
UNION ALL
SELECT id, 2, 'CAP Theorem', 150 FROM subjects WHERE name = 'System Design'
UNION ALL
SELECT id, 3, 'Distributed Consensus', 200 FROM subjects WHERE name = 'System Design'
UNION ALL
SELECT id, 4, 'Architecture at Scale', 250 FROM subjects WHERE name = 'System Design'
UNION ALL
SELECT id, 1, 'Topic 1', 100 FROM subjects WHERE name = 'Terraform (IaC)'
UNION ALL
SELECT id, 2, 'Topic 1', 150 FROM subjects WHERE name = 'Terraform (IaC)'
UNION ALL
SELECT id, 3, 'Topic 1', 200 FROM subjects WHERE name = 'Terraform (IaC)'
UNION ALL
SELECT id, 4, 'Topic 1', 250 FROM subjects WHERE name = 'Terraform (IaC)'
UNION ALL
SELECT id, 1, 'Finite Automata', 100 FROM subjects WHERE name = 'TOC'
UNION ALL
SELECT id, 2, 'Context-Free Languages', 150 FROM subjects WHERE name = 'TOC'
UNION ALL
SELECT id, 3, 'Turing Machines', 200 FROM subjects WHERE name = 'TOC'
UNION ALL
SELECT id, 4, 'Undecidability', 250 FROM subjects WHERE name = 'TOC'
ON CONFLICT DO NOTHING; -- assuming standard conflict handling or adjust as needed
