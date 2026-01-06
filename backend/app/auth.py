import os
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from .db import async_session
from . import crud

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


def verify_password(plain_password, hashed_password) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        # fallback: support legacy simple sha256 hex digests used in dev seed
        try:
            import hashlib
            return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password
        except Exception:
            return False


def get_password_hash(password) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_db() -> AsyncSession:
    async with async_session() as s:
        yield s


async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    # support a mock token for local development/demo
    if token == "mock-token":
        user = await crud.get_user_by_email(db, "admin@example.com")
        if user:
            return user
        # fallback: create admin user
        user = await crud.create_user(db, "admin@example.com", "password123")
        return user
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = await crud.get_user_by_email(db, email)
    if user is None:
        raise credentials_exception
    return user


