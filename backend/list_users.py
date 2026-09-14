import sys
from sqlalchemy import create_engine, text

url = sys.argv[1] if len(sys.argv) > 1 else input("Paste your DB URL: ").strip()
engine = create_engine(url, connect_args={"sslmode": "require"})

with engine.connect() as conn:
    rows = conn.execute(text("SELECT id, email, role FROM users ORDER BY id")).fetchall()
    print(f"\n{len(rows)} user(s):")
    for r in rows:
        print(f"  ID={r[0]}  email='{r[1]}'  role={r[2]}")
