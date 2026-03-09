"""
database.py — SQLAlchemy models + session factory for ClearHeat phase 2.

Tables:
  calculations  — every calculator run, anonymous (no PII)
  leads         — homeowner contact details, linked by calculation_id (opt-in only)

Connection is configured via DATABASE_URL environment variable.
For local dev, set DATABASE_URL in a .env file:
  DATABASE_URL=postgresql://postgres:<password>@db.<project>.supabase.co:5432/postgres
"""
from __future__ import annotations

import os
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")


def _make_engine():
    if not DATABASE_URL:
        return None
    return create_engine(DATABASE_URL, pool_pre_ping=True)


engine = _make_engine()
SessionLocal: sessionmaker | None = sessionmaker(bind=engine, autocommit=False, autoflush=False) if engine else None


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# Layer 1: Calculation record (anonymous)
# ---------------------------------------------------------------------------

class Calculation(Base):
    __tablename__ = "calculations"

    id = Column(String, primary_key=True)          # UUID hex from existing code
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Location / property (new phase-2 inputs, not used by engine)
    county = Column(String, nullable=True)
    house_type = Column(String, nullable=True)     # detached | semi_d | terrace | apartment

    # Home inputs
    ber_band = Column(String, nullable=True)
    floor_area_m2 = Column(Float, nullable=True)
    emitters = Column(String, nullable=True)       # radiators | ufh
    flow_temp_capability = Column(String, nullable=True)
    heating_pattern = Column(String, nullable=True)
    wood_use = Column(String, nullable=True)
    occupants = Column(Integer, nullable=True)

    # Fuel / energy inputs
    fuel_type = Column(String, nullable=True)
    bill_mode = Column(String, nullable=True)
    annual_spend_eur = Column(Float, nullable=True)
    annual_fuel_use = Column(Float, nullable=True)
    electricity_price_eur_per_kwh = Column(Float, nullable=True)

    # Heat pump inputs
    hp_quote_eur = Column(Float, nullable=True)
    grant_applied = Column(Boolean, nullable=True)
    grant_value_eur = Column(Float, nullable=True)
    hp_capex_eur = Column(Float, nullable=True)    # net after grant

    # Engine outputs
    verdict_class = Column(String, nullable=True)  # likely_saves | borderline | unlikely_saves
    confidence_text = Column(String, nullable=True)
    payback_years_typical = Column(Float, nullable=True)
    npv_typical_eur = Column(Float, nullable=True)

    # Email follow-up (optional — set when homeowner requests PDF by email)
    subscriber_email = Column(String, nullable=True)
    report_emailed_at = Column(DateTime(timezone=True), nullable=True)


# ---------------------------------------------------------------------------
# Layer 2: Lead record (PII — only created with explicit consent)
# ---------------------------------------------------------------------------

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    calculation_id = Column(String, nullable=False)   # FK to calculations.id

    # Contact details
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)

    # Lead context (duplicated here for easy installer email, avoids join)
    county = Column(String, nullable=True)
    house_type = Column(String, nullable=True)
    verdict_class = Column(String, nullable=True)
    payback_years_typical = Column(Float, nullable=True)
    hp_quote_eur = Column(Float, nullable=True)
    grant_value_eur = Column(Float, nullable=True)
    ber_band = Column(String, nullable=True)
    floor_area_m2 = Column(Float, nullable=True)
    intent_timeline = Column(String, nullable=True)   # researching | within_12_months | within_3_months

    # Consent
    consent_installer_contact = Column(Boolean, default=False)
    consent_marketing = Column(Boolean, default=False)

    # Routing
    installer_notified = Column(Boolean, default=False)
    installer_email_sent_at = Column(DateTime(timezone=True), nullable=True)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_db() -> Session:
    """Dependency: yields a DB session and closes it after use."""
    if SessionLocal is None:
        raise RuntimeError("DATABASE_URL is not configured.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables() -> None:
    """Create all tables if they don't exist. Safe to call on startup."""
    if engine is None:
        print("⚠️  No DATABASE_URL set — skipping table creation.")
        return
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables ready.")
