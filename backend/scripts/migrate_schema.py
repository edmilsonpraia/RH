"""Aplica os ALTER TABLE necessarios na BD existente sem perder dados."""
import os
import sqlite3

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(ROOT, "backend", "db", "hr.db")

NEW_COLUMNS = [
    ("meca", "TEXT"),
    ("document_type", "TEXT"),
    ("document_number", "TEXT"),
    ("document_expiry", "DATE"),
    ("document_status", "TEXT"),
    ("nationality", "TEXT"),
    ("birth_date", "DATE"),
    ("gender", "TEXT"),
    ("contract_type", "TEXT"),
    ("contract_duration_days", "INTEGER"),
    ("seniority", "TEXT"),
    ("last_renewal_date", "DATE"),
    ("next_renewal_date", "DATE"),
    ("contract_status", "TEXT"),
    ("activity_type", "TEXT"),
    ("site", "TEXT"),
    ("company", "TEXT"),
    ("children", "INTEGER DEFAULT 0"),
    ("academic_degree", "TEXT"),
]

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

cur.execute("PRAGMA table_info(employees)")
existing = {row[1] for row in cur.fetchall()}

added = 0
for col, type_ in NEW_COLUMNS:
    if col not in existing:
        cur.execute(f"ALTER TABLE employees ADD COLUMN {col} {type_}")
        added += 1
        print(f"  + {col}")

conn.commit()
conn.close()
print(f"Schema migrado. {added} colunas adicionadas.")
