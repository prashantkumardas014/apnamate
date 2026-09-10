
import sqlite3

def add_missing_columns():
    conn = sqlite3.connect('apnamate.db')
    cursor = conn.cursor()

    try:
        # Add 'created_at' column
        cursor.execute("ALTER TABLE users ADD COLUMN created_at DATETIME")
        print("Added 'created_at' column to users table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("'created_at' column already exists.")
        else:
            raise

    try:
        # Add 'updated_at' column
        cursor.execute("ALTER TABLE users ADD COLUMN updated_at DATETIME")
        print("Added 'updated_at' column to users table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("'updated_at' column already exists.")
        else:
            raise

    try:
        # Add 'availability' column
        cursor.execute("ALTER TABLE users ADD COLUMN availability VARCHAR")
        print("Added 'availability' column to users table.")
    except sqlite.OperationalError as e:
        if "duplicate column name" in str(e):
            print("'availability' column already exists.")
        else:
            raise

    try:
        # Add 'category' column
        cursor.execute("ALTER TABLE users ADD COLUMN category VARCHAR")
        print("Added 'category' column to users table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("'category' column already exists.")
        else:
            raise

    conn.commit()
    conn.close()

if __name__ == "__main__":
    add_missing_columns()