from pydantic import BaseModel
from typing import Optional, List


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    email: str
    password: str


class BatchEncodeRequest(BaseModel):
    count: int
    prefix: Optional[str] = None


class BatchEncodeResponse(BaseModel):
    tokens: List[str]
    count: int


class MerchantCredential(BaseModel):
    email: str
    password: str

class MerchantCreateResponse(BaseModel):
    credentials: List[MerchantCredential]
    count: int


