import sqlite3

connection = sqlite3.connect("apnamate.db")
cursor = connection.cursor()

try:
    cursor.execute(
        "ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1"
    )

    connection.commit()

    print("✅ is_active column added successfully!")

except sqlite3.OperationalError as error:
    print("📝 Database message:", error)

connection.close()