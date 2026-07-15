"""Tests for iteration 3 new features: SSE stream, GitHub repos, email transport no-op."""
import concurrent.futures
import json
import os
import time

import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break
API = f"{BASE_URL}/api"


# ---------- SSE stream ----------
class TestAssistantStream:
    def test_stream_emits_citations_delta_done(self):
        # cool down (previous rate-limit test may have consumed capacity)
        time.sleep(65)
        r = requests.post(
            f"{API}/assistant/stream",
            json={"session_id": "test-stream-1", "question": "Tell me about AetherLink"},
            timeout=60,
            stream=True,
            headers={"Accept": "text/event-stream"},
        )
        assert r.status_code == 200, r.text
        ctype = r.headers.get("content-type", "")
        assert "text/event-stream" in ctype, ctype

        events = []
        current_event = None
        buf = ""
        for chunk in r.iter_content(chunk_size=None, decode_unicode=True):
            if not chunk:
                continue
            buf += chunk
            while "\n\n" in buf:
                raw, buf = buf.split("\n\n", 1)
                lines = raw.strip().split("\n")
                ev = None
                data_lines = []
                for line in lines:
                    if line.startswith("event:"):
                        ev = line.split(":", 1)[1].strip()
                    elif line.startswith("data:"):
                        data_lines.append(line.split(":", 1)[1].strip())
                events.append((ev, "\n".join(data_lines)))
            if any(e[0] == "done" or e[0] == "error" for e in events):
                break
        r.close()

        event_names = [e[0] for e in events]
        assert "citations" in event_names, f"missing citations: {event_names}"
        assert "done" in event_names or "error" in event_names, f"no terminator: {event_names}"

        # Validate citations event is JSON list
        citations_ev = next(e for e in events if e[0] == "citations")
        parsed = json.loads(citations_ev[1])
        assert isinstance(parsed, list)

        # If no error, ensure we had at least one delta
        if "error" not in event_names:
            deltas = [e for e in events if e[0] == "delta"]
            assert len(deltas) >= 1, f"expected deltas, got: {event_names}"
            # each delta data is a JSON-encoded string
            for _, d in deltas[:3]:
                json.loads(d)

    def test_stream_rate_limit_429(self):
        """Fire ~14 concurrent requests to trip the 10/minute limit."""
        time.sleep(2)

        def _one(i):
            try:
                resp = requests.post(
                    f"{API}/assistant/stream",
                    json={"session_id": "test-stream-burst", "question": f"q{i}"},
                    timeout=30,
                    stream=True,
                )
                sc = resp.status_code
                body = ""
                if sc == 429:
                    body = resp.text
                resp.close()
                return sc, body
            except Exception as e:
                return 0, str(e)

        with concurrent.futures.ThreadPoolExecutor(max_workers=14) as ex:
            results = list(ex.map(_one, range(14)))

        codes = [c for c, _ in results]
        assert 429 in codes, f"expected some 429 in {codes}"
        # verify body shape of one 429
        for c, b in results:
            if c == 429:
                assert "throttled" in b.lower() or "rate" in b.lower(), b
                break


# ---------- GitHub repos ----------
class TestGithub:
    def test_repos_shape_and_graceful_empty(self):
        r = requests.get(f"{API}/github/repos", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "user" in data
        assert "repos" in data
        assert "cached_at" in data
        assert isinstance(data["repos"], list)
        # env has PORTFOLIO_GITHUB_USER=harshiljadhav (does not exist) -> [] expected
        # Graceful: should NOT be 500
        for repo in data["repos"]:
            for k in ["slug", "title", "desc", "stars", "url", "language", "topics", "updated_at"]:
                assert k in repo, f"missing {k} in repo"

    def test_repos_second_call_ok(self):
        r1 = requests.get(f"{API}/github/repos", timeout=20)
        r2 = requests.get(f"{API}/github/repos", timeout=20)
        assert r1.status_code == 200
        assert r2.status_code == 200


# ---------- Contact (no-op email transport) ----------
class TestContactNoop:
    def test_contact_success_when_transport_disabled(self):
        r = requests.post(
            f"{API}/contact",
            json={
                "name": "TEST NoopUser",
                "email": "test_noop@example.com",
                "subject": "Hello",
                "message": "email transport should be disabled and this should still succeed.",
            },
            timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "id" in data
        # response shouldn't include an error field
        assert "error" not in data

    def test_contact_invalid_email_422(self):
        r = requests.post(
            f"{API}/contact",
            json={"name": "TEST", "email": "bad", "subject": "s", "message": "m"},
            timeout=15,
        )
        assert r.status_code in (400, 422)
