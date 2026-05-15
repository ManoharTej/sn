import sqlite3

def upgrade_db():
    conn = sqlite3.connect('csa_training.db')
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE content_sources ADD COLUMN source_type VARCHAR DEFAULT 'pdf'")
        print("Added source_type to content_sources.")
    except sqlite3.OperationalError as e:
        print("source_type might already exist:", e)

    try:
        cursor.execute("ALTER TABLE chat_messages ADD COLUMN context_used TEXT")
        print("Added context_used to chat_messages.")
    except sqlite3.OperationalError as e:
        print("context_used might already exist:", e)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    upgrade_db()
