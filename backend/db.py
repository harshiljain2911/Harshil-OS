"""
Optional MongoDB access.

MongoDB is NOT required to run Harshil/OS. The Motor client is created **lazily on
first use** — never at import time — and only when `MONGO_URL` is set. This means:

  * the backend boots and serves the entire portfolio with no database configured;
  * if `MONGO_URL` is added later, support activates automatically on the next call;
  * a configured-but-unreachable database degrades gracefully (callers catch the
    query error and fall back), it does not crash startup.

Usage:
    from db import get_db
    db = get_db()
    if db is not None:
        await db.some_collection.insert_one(...)
"""

from __future__ import annotations

import logging
import os
from typing import Any, Optional

logger = logging.getLogger("db")

_db: Optional[Any] = None
_client: Optional[Any] = None
_init_url: Optional[str] = None  # the MONGO_URL the current client was built for


def get_db() -> Optional[Any]:
    """Return the Mongo database handle, or ``None`` if Mongo isn't configured.

    Never connects or constructs a client at import time. The client is built on
    the first call that sees a ``MONGO_URL`` and reused thereafter. If the URL
    changes (e.g. it's added after startup), a new client is created.
    """
    global _db, _client, _init_url

    mongo_url = os.getenv("MONGO_URL")
    if not mongo_url:
        return None

    # Already initialized for this URL — reuse.
    if _db is not None and _init_url == mongo_url:
        return _db

    try:
        from motor.motor_asyncio import AsyncIOMotorClient

        _client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=1500)
        _db = _client[os.getenv("DB_NAME", "harshil_os")]
        _init_url = mongo_url
        logger.info("mongo.enabled db=%s", os.getenv("DB_NAME", "harshil_os"))
        return _db
    except Exception:
        # Client construction should not normally fail, but never let it crash a
        # request/startup — the caller treats a missing DB as "unavailable".
        logger.exception("mongo.init_failed — continuing without a database")
        _db = None
        _client = None
        _init_url = None
        return None
