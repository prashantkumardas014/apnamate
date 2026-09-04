import sqlite3

connection = sqlite3.connect("apnamate.db")
cursor = connection.cursor()

try:
    cursor.execute(
        "ALTER TABLE users ADD COLUMN category TEXT DEFAULT 'General'"
    )
    connection.commit()
    print("✅ category column added successfully!")

except sqlite3.OperationalError as error:
    print("📝 Database message:", error)

connection.close()