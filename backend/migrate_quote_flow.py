import sqlite3

DB_PATH = 'apnamate.db'
conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

booking_columns = [
    ('quoted_amount',     'NUMERIC(10,2)'),
    ('quote_note',        'TEXT'),
    ('quoted_at',         'DATETIME'),
    ('quote_accepted_at', 'DATETIME'),
    ('quote_rejected_at', 'DATETIME'),
    ('rejection_reason',  'TEXT'),
    ('paid_at',           'DATETIME'),
    ('paid_amount',       'NUMERIC(10,2)'),
]

print('--- bookings ---')
for col_name, col_type in booking_columns:
    try:
        c.execute(f'ALTER TABLE bookings ADD COLUMN {col_name} {col_type}')
        print(f'OK   bookings.{col_name}')
    except sqlite3.OperationalError as e:
        print(f'SKIP bookings.{col_name}: {e}')

user_columns = [
    ('min_price', 'NUMERIC(10,2) DEFAULT 0'),
    ('max_price', 'NUMERIC(10,2) DEFAULT 0'),
]

print('--- users ---')
for col_name, col_type in user_columns:
    try:
        c.execute(f'ALTER TABLE users ADD COLUMN {col_name} {col_type}')
        print(f'OK   users.{col_name}')
    except sqlite3.OperationalError as e:
        print(f'SKIP users.{col_name}: {e}')

print('--- notifications ---')
try:
    c.execute('ALTER TABLE notifications ADD COLUMN booking_id INTEGER REFERENCES bookings(id)')
    print('OK   notifications.booking_id')
except sqlite3.OperationalError as e:
    print(f'SKIP notifications.booking_id: {e}')

print('--- payments ---')
for col_name, col_type in [('upi_id', 'VARCHAR'), ('upi_txn_ref', 'VARCHAR')]:
    try:
        c.execute(f'ALTER TABLE payments ADD COLUMN {col_name} {col_type}')
        print(f'OK   payments.{col_name}')
    except sqlite3.OperationalError as e:
        print(f'SKIP payments.{col_name}: {e}')

print('--- migrating old statuses ---')
for old, new in [('Pending', 'pending_quote'),
                 ('Confirmed', 'accepted'),
                 ('Completed', 'paid'),
                 ('Cancelled', 'cancelled')]:
    c.execute('UPDATE bookings SET status = ? WHERE status = ?', (new, old))
    print(f'MOVED {old} -> {new} ({c.rowcount} rows)')

conn.commit()

print('\n--- final bookings columns ---')
for row in c.execute('PRAGMA table_info(bookings)'):
    print(f'  {row[1]}')

conn.close()
print('\nDONE')