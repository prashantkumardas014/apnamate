from pydantic import BaseModel
from typing import Optional

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str
    service: Optional[str] = None
    location: Optional[str] = None
    experience: Optional[str] = None
    price: Optional[str] = None
    category: Optional[str] = None