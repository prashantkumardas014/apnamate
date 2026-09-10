import sqlite3
import os
from dotenv import load_dotenv

load_dotenv()

def view_database():
    try:
        db_url = os.getenv('DATABASE_URL')
        if not db_url:
            print("❌ DATABASE_URL not found in .env")
            return
        
        db_path = db_url.replace('sqlite:///', '')
        print(f"📁 Database: {db_path}\n")
        print("=" * 60)
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = cursor.fetchall()
        
        if not tables:
            print("⚠️ No tables found in database")
            return
        
        print(f"📊 Found {len(tables)} tables\n")
        
        for table in tables:
            table_name = table[0]
            print(f"📋 TABLE: {table_name.upper()}")
            print("-" * 40)
            
            # Get column info
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = cursor.fetchall()
            
            print("   Columns:")
            for col in columns:
                col_id, col_name, col_type, not_null, default, pk = col
                pk_marker = "🔑 " if pk else "   "
                print(f"   {pk_marker}{col_name}: {col_type}")
            
            # Get row count
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            print(f"\n   📊 Total rows: {count}")
            
            # Show sample data if table has rows
            if count > 0:
                cursor.execute(f"SELECT * FROM {table_name} LIMIT 3")
                sample_data = cursor.fetchall()
                print(f"\n   📝 Sample data (first {len(sample_data)} rows):")
                for i, row in enumerate(sample_data, 1):
                    print(f"      Row {i}: {row}")
            else:
                print("   ⚠️ Table is empty")
            
            print("\n" + "=" * 60 + "\n")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    view_database()
