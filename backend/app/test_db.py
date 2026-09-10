# test_db.py
import os
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL')
print(f"DATABASE_URL: {db_url}")