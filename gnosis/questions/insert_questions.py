import json
import os
import psycopg2
from psycopg2.extras import execute_values

# DB connection
conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="gnosis",
    user="postgres",
    password="gnosis_pass"
)

cursor = conn.cursor()

questions_dir = "."  # current folder (questions/)

# Get all JSON files
json_files = [f for f in os.listdir(questions_dir) if f.endswith(".json")]
print(f"Found {len(json_files)} files")

total_inserted = 0
total_skipped = 0

# Allowed DB question types
VALID_TYPES = {
    "easy",
    "medium",
    "hard",
    "tricky",
    "core_concept",
    "numerical",
    "multi_correct"
}

for filename in sorted(json_files):

    filepath = os.path.join(questions_dir, filename)

    with open(filepath, "r", encoding="utf-8") as f:
        questions = json.load(f)

    if not questions:
        print(f"SKIP {filename} - empty")
        continue

    # Get subject_name and level_number
    first_q = questions[0]

    subject_name = first_q["subject_name"]
    level_number = first_q["level_number"]

    # Find level_id
    cursor.execute("""
        SELECT l.id
        FROM levels l
        JOIN subjects s ON s.id = l.subject_id
        WHERE s.name = %s AND l.level_number = %s
    """, (subject_name, level_number))

    row = cursor.fetchone()

    if not row:
        print(
            f"SKIP {filename} - subject '{subject_name}' level {level_number} not found"
        )
        total_skipped += 1
        continue

    level_id = row[0]

    # Prepare bulk insert data
    values = []

    for q in questions:

        qtype = q.get("question_type", "easy")

        # Map invalid question types
        if qtype not in VALID_TYPES:
            qtype = "hard"

        values.append((
            level_id,
            q.get("question_text", ""),
            q.get("option_a", ""),
            q.get("option_b", ""),
            q.get("option_c", ""),
            q.get("option_d", ""),
            json.dumps(q.get("correct_options", [])),
            qtype,
            q.get("timer_seconds", 20),
            q.get("explanation", ""),
            "pregenerated"
        ))

    # Bulk insert
    execute_values(cursor, """
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
            explanation,
            source
        ) VALUES %s
        ON CONFLICT DO NOTHING
    """, values)

    inserted = cursor.rowcount
    total_inserted += inserted

    print(
        f"OK {filename} - {inserted}/{len(questions)} inserted "
        f"(subject: {subject_name}, level: {level_number})"
    )

conn.commit()

cursor.close()
conn.close()

print(f"\nDONE: {total_inserted} questions inserted, {total_skipped} files skipped")