from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base
from . import models
from .auth import router as auth_router
from .routes import router as booking_router


Base.metadata.create_all(bind=engine)

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "Welcome to ApnaMate API"
    }


@app.get("/health")
def health():
    return {
        "status": "Backend is working"
    }


app.include_router(auth_router)
app.include_router(booking_router)