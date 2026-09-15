import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Reads DATABASE_URL from environment. Falls back to local SQLite when running on your PC.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./apnamate.db")

# Render sometimes hands out "postgres://" — SQLAlchemy 2.x needs "postgresql://"
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,    # auto-reconnect on dropped connections
        pool_recycle=300,      # recycle idle connections every 5 min
    )

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()