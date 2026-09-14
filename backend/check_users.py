# check_users.py
import sys
from sqlalchemy import create_engine, text

if len(sys.argv) < 2:
    print("Usage: python check_users.py <DATABASE_URL>")
    sys.exit(1)

engine = create_engine(sys.argv[1], connect_args={"sslmode": "require"})

with engine.connect() as conn:
    result = conn.execute(text("SELECT id, name, email, role, is_active FROM users ORDER BY id"))
    rows = result.fetchall()

    if not rows:
        print("? No users in the database yet.")
    else:
        print(f"? Found {len(rows)} user(s):\n")
        for r in rows:
            print(f"  ID={r[0]}  name={r[1]}  email={r[2]}  role={r[3]}  active={r[4]}")
