import sqlite3
conn = sqlite3.connect('apnamate.db')
c = conn.cursor()

c.execute('''
CREATE TABLE IF NOT EXISTS provider_payouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id INTEGER NOT NULL,
    booking_id INTEGER,
    payment_id INTEGER,
    amount NUMERIC(10,2) NOT NULL,
    commission NUMERIC(10,2) DEFAULT 0,
    net_amount NUMERIC(10,2) NOT NULL,
    status VARCHAR DEFAULT 'owed',
    payout_ref VARCHAR,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    paid_out_at DATETIME
)
''')
print("✅ provider_payouts created")

def add_col(table, col, typ):
    try:
        c.execute(f'ALTER TABLE {table} ADD COLUMN {col} {typ}')
        print(f'✅ {table}.{col}')
    except sqlite3.OperationalError as e:
        print(f'SKIP {table}.{col}: {e}')

add_col('users', 'upi_id', 'VARCHAR')
add_col('payments', 'screenshot_url', 'VARCHAR')
add_col('payments', 'utr_number', 'VARCHAR')

conn.commit()
conn.close()
print("\n✅ Migration complete")