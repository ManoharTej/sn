import sqlite3
import io

# Connect to your local file (Make sure the name matches your .db file!)
connection = sqlite3.connect('csa_training.db')

# Write the data to a SQL text file
with io.open('data_dump.sql', 'w', encoding='utf-8') as f:
    for line in connection.iterdump():
        # Skips SQLite settings that break Supabase
        if any(x in line for x in ["PRAGMA", "BEGIN TRANSACTION", "COMMIT"]):
            continue
        f.write('%s\n' % line)

print("Done! data_dump.sql is ready.")
connection.close()
