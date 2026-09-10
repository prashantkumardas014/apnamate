import sqlite3
import os
from dotenv import load_dotenv

load_dotenv()

def check_db():
    try:
        db_url = os.getenv('DATABASE_URL')
        print(f"📌 DATABASE_URL: {db_url}")
        
        if not db_url:
            print("❌ DATABASE_URL not found in .env")
            return
        
        db_path = db_url.replace('sqlite:///', '')
        print(f"📁 Database path: {db_path}")
        
        if os.path.exists(db_path):
            print(f"✅ Database file exists!")
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()
            if tables:
                print(f"📊 Found {len(tables)} tables:")
                for table in tables:
                    print(f"  - {table[0]}")
            else:
                print("⚠️ No tables found yet")
            conn.close()
        else:
            print(f"❌ Database file NOT found at: {db_path}")
            print("💡 Creating new database...")
            conn = sqlite3.connect(db_path)
            print("✅ Database created successfully!")
            conn.close()
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check_db()
