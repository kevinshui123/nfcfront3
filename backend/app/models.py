from sqlalchemy import Column, String, Integer, ForeignKey, Enum, DateTime, JSON, func
from .db import Base
import enum


class TagStatus(enum.Enum):
    unused = "unused"
    encoded = "encoded"
    active = "active"


class Shop(Base):
    __tablename__ = "shops"
    id = Column(String(length=36), primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String)


class NFCTag(Base):
    __tablename__ = "nfc_tags"
    id = Column(String(length=36), primary_key=True)
    shop_id = Column(String(length=36), ForeignKey("shops.id"), nullable=True)
    token = Column(String, unique=True, nullable=False, index=True)
    ndef_payload = Column(JSON)
    status = Column(Enum(TagStatus), default=TagStatus.unused)
    created_at = Column(DateTime, server_default=func.now())
    encoded_at = Column(DateTime)


class ContentItem(Base):
    __tablename__ = "content_items"
    id = Column(String(length=36), primary_key=True)
    shop_id = Column(String(length=36), ForeignKey("shops.id"))
    title = Column(String)
    body = Column(String)
    metadata_json = Column("metadata", JSON)
    created_by = Column(String)
    created_at = Column(DateTime, server_default=func.now())


class Visit(Base):
    __tablename__ = "visits"
    id = Column(String(length=36), primary_key=True)
    tag_id = Column(String(length=36), ForeignKey("nfc_tags.id"))
    user_agent = Column(String)
    referer = Column(String)
    device_info = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())


class User(Base):
    __tablename__ = "users"
    id = Column(String(length=36), primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, server_default=func.now())


