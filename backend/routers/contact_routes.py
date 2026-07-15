from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
from slowapi import Limiter
from slowapi.util import get_remote_address

from email_transport import transport as email_transport
from models import ContactSubmission, ContactSubmissionCreate

logger = logging.getLogger("contact")

router = APIRouter(prefix="/contact", tags=["contact"])
limiter = Limiter(key_func=get_remote_address)

_client = AsyncIOMotorClient(os.environ["MONGO_URL"], serverSelectionTimeoutMS=1500)
_db = _client[os.environ["DB_NAME"]]

# Durable local fallback so a submission is never lost, even if both the email
# provider and the database are unavailable. Append-only JSONL.
_FALLBACK_FILE = Path(__file__).parent.parent / "contact_submissions.jsonl"


def _append_fallback(doc: dict) -> bool:
    try:
        with _FALLBACK_FILE.open("a", encoding="utf-8") as f:
            f.write(json.dumps(doc, ensure_ascii=False) + "\n")
        return True
    except Exception:
        logger.exception("contact.fallback_write_failed")
        return False


@router.post("", response_model=ContactSubmission)
@limiter.limit("5/hour;3/minute")
async def submit_contact(request: Request, payload: ContactSubmissionCreate) -> ContactSubmission:
    # Spam: honeypot filled → pretend success, drop silently.
    if payload.company.strip():
        logger.info("contact.spam_honeypot ip=%s", get_remote_address(request))
        return ContactSubmission(name=payload.name, email=payload.email, subject=payload.subject, message=payload.message)

    submission = ContactSubmission(
        name=payload.name, email=payload.email, subject=payload.subject, message=payload.message
    )
    doc = submission.model_dump()
    doc["created_at"] = doc["created_at"].isoformat() if isinstance(doc["created_at"], datetime) else str(doc["created_at"])
    doc["ip"] = get_remote_address(request)

    email_ok = False
    if email_transport.enabled:
        try:
            email_ok = await email_transport.send(
                name=submission.name, email=submission.email,
                subject=submission.subject, message=submission.message,
            )
        except Exception:
            logger.exception("contact.email_failed")
    doc["email_sent"] = email_ok

    stored = False
    try:
        await _db.contact_submissions.insert_one(dict(doc))
        stored = True
    except Exception:
        logger.exception("contact.store_failed")

    # Always capture the message durably so nothing is ever lost.
    filed = _append_fallback(doc) if not stored else False

    if not (email_ok or stored or filed):
        raise HTTPException(
            status_code=503,
            detail="Message could not be delivered right now. Please email me directly at kotaharshil2906@gmail.com.",
        )
    logger.info("contact.received email=%s stored=%s filed=%s", email_ok, stored, filed)
    return submission
