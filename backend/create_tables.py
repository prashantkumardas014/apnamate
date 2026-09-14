# create_tables.py
import sys
from sqlalchemy import create_engine
from app.models import Base

if len(sys.argv) < 2:
    print("Usage: python create_tables.py <DATABASE_URL>")
    sys.exit(1)

db_url = sys.argv[1]
engine = create_engine(db_url, connect_args={"sslmode": "require"})

print("Creating tables...")
Base.metadata.create_all(bind=engine)
print("? All tables created successfully")

# Verify
from sqlalchemy import inspect
inspector = inspect(engine)
tables = inspector.get_table_names()
print(f"\nTables in database ({len(tables)}):")
for t in sorted(tables):
    print(f"  - {t}")
