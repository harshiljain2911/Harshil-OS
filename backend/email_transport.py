"""
Resend transport for contact-form emails.

Charter §12: submitContactForm(payload) seam. This module implements the
Resend-backed transport. It's activated ONLY when RESEND_API_KEY is set;
otherwise it's a no-op and the caller falls back to the Mongo-only path.
"""

from __future__ import annotations

import html
import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger("email")


class ResendTransport:
    def __init__(self) -> None:
        self.api_key: Optional[str] = os.environ.get("RESEND_API_KEY", "").strip() or None
        self.from_addr: str = os.environ.get("RESEND_FROM", "").strip()
        self.to_addr: str = os.environ.get("RESEND_TO", "").strip()

    @property
    def enabled(self) -> bool:
        return bool(self.api_key and self.from_addr and self.to_addr)

    async def send(self, *, name: str, email: str, subject: str, message: str) -> bool:
        if not self.enabled:
            return False
        body_html = (
            f"<p><strong>From:</strong> {html.escape(name)} &lt;{html.escape(email)}&gt;</p>"
            f"<p><strong>Subject:</strong> {html.escape(subject)}</p>"
            f"<pre style='white-space:pre-wrap;font-family:inherit'>{html.escape(message)}</pre>"
        )
        payload = {
            "from": self.from_addr,
            "to": [self.to_addr],
            "reply_to": email,
            "subject": f"[Harshil OS] {subject}",
            "html": body_html,
        }
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        try:
            async with httpx.AsyncClient(timeout=8.0) as http:
                r = await http.post("https://api.resend.com/emails", json=payload, headers=headers)
            if r.status_code >= 300:
                logger.warning("resend.send failed: %s %s", r.status_code, r.text[:300])
                return False
            return True
        except Exception as e:
            logger.exception("resend.send exception: %s", e)
            return False


transport = ResendTransport()
