import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().with_name('expenses.db')


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_connection() as conn:
        conn.execute(
            '''
            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                amount REAL NOT NULL,
                date TEXT NOT NULL
            )
            '''
        )

        existing = conn.execute('SELECT COUNT(*) AS total FROM expenses').fetchone()
        if existing['total'] == 0:
            sample_data = [
                ('Apartment Rent', 'Housing', 1400.00, '2026-09-10'),
                ('Groceries', 'Food', 320.00, '2026-09-12'),
                ('Fuel', 'Travel', 180.00, '2026-09-18'),
                ('Electricity', 'Utilities', 150.00, '2026-09-22'),
            ]
            conn.executemany(
                'INSERT INTO expenses (name, category, amount, date) VALUES (?, ?, ?, ?)',
                sample_data,
            )

        conn.commit()


def get_expenses():
    with get_connection() as conn:
        rows = conn.execute(
            'SELECT id, name, category, amount, date FROM expenses ORDER BY date DESC'
        ).fetchall()
        return [dict(row) for row in rows]


def add_expense(name, category, amount, date):
    with get_connection() as conn:
        cursor = conn.execute(
            'INSERT INTO expenses (name, category, amount, date) VALUES (?, ?, ?, ?)',
            (name, category, float(amount), date),
        )
        conn.commit()
        new_id = cursor.lastrowid

    return {
        'id': new_id,
        'name': name,
        'category': category,
        'amount': float(amount),
        'date': date,
    }


def delete_expense(expense_id):
    with get_connection() as conn:
        deleted = conn.execute(
            'DELETE FROM expenses WHERE id = ?',
            (expense_id,),
        )
        conn.commit()
        return deleted.rowcount > 0


init_db()
