"""Backend API tests for Harshil OS"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback: read from frontend .env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

API = f"{BASE_URL}/api"


# ---------- Health & meta ----------
class TestHealth:
    def test_health(self):
        r = requests.get(f"{API}/health", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        expected = {"domains": 5, "projects": 6, "certifications": 4, "experience": 3,
                    "achievements": 5, "timeline": 8, "blog": 3, "research": 3, "labs": 5}
        assert data["collections"] == expected

    def test_collections_list(self):
        r = requests.get(f"{API}/content/collections", timeout=15)
        assert r.status_code == 200
        cols = r.json()
        # Accept list or dict wrapper
        names = cols if isinstance(cols, list) else cols.get("collections", list(cols.keys()))
        for c in ["domains", "projects", "certifications", "experience", "achievements",
                  "timeline", "blog", "research", "labs"]:
            assert c in names, f"missing {c} in {names}"

    def test_schemas(self):
        r = requests.get(f"{API}/schemas", timeout=15)
        assert r.status_code == 200
        data = r.json()
        for c in ["domains", "projects", "certifications", "experience", "achievements",
                  "timeline", "blog", "research", "labs"]:
            assert c in data


# ---------- Content routes ----------
class TestContent:
    def _extract(self, data):
        return data["items"] if isinstance(data, dict) and "items" in data else data

    def test_projects_sorted_by_depth(self):
        r = requests.get(f"{API}/content/projects", timeout=15)
        assert r.status_code == 200
        items = self._extract(r.json())
        assert len(items) == 6
        assert items[0]["slug"] == "aetherlink"
        assert "_depth_score" in items[0]

    def test_project_detail(self):
        r = requests.get(f"{API}/content/projects/aetherlink", timeout=15)
        assert r.status_code == 200
        p = r.json()
        for k in ["problem", "approach", "outcome", "metrics", "learnings", "next_steps"]:
            assert k in p, f"missing {k}"

    def test_domains_featured_first(self):
        r = requests.get(f"{API}/content/domains", timeout=15)
        assert r.status_code == 200
        items = self._extract(r.json())
        assert len(items) == 5
        assert items[0]["slug"] == "ai-systems"

    def test_blog_list_and_detail(self):
        r = requests.get(f"{API}/content/blog", timeout=15)
        assert r.status_code == 200
        assert len(self._extract(r.json())) == 3
        r2 = requests.get(f"{API}/content/blog/backpressure-is-a-ui-problem", timeout=15)
        assert r2.status_code == 200
        assert r2.json().get("slug") == "backpressure-is-a-ui-problem"

    def test_unknown_collection_404(self):
        r = requests.get(f"{API}/content/unknown", timeout=15)
        assert r.status_code == 404

    def test_unknown_item_404(self):
        r = requests.get(f"{API}/content/projects/does-not-exist", timeout=15)
        assert r.status_code == 404


# ---------- Contact ----------
class TestContact:
    def test_contact_valid(self):
        payload = {"name": "TEST User", "email": "test_valid@example.com",
                   "subject": "Hello", "message": "This is a test message from pytest."}
        r = requests.post(f"{API}/contact", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "id" in data
        assert "created_at" in data
        # created_at should be ISO parseable
        from datetime import datetime
        datetime.fromisoformat(data["created_at"].replace("Z", "+00:00"))

    def test_contact_invalid_email(self):
        payload = {"name": "TEST", "email": "not-an-email",
                   "subject": "x", "message": "y"}
        r = requests.post(f"{API}/contact", json=payload, timeout=15)
        assert r.status_code in (400, 422)


# ---------- SEO ----------
class TestSEO:
    def test_sitemap(self):
        r = requests.get(f"{API}/sitemap.xml", timeout=15)
        assert r.status_code == 200
        body = r.text
        assert "<urlset" in body or "<sitemapindex" in body
        assert "/projects/aetherlink" in body
        assert "/domains/ai-systems" in body
        assert "/blog/backpressure-is-a-ui-problem" in body

    def test_robots(self):
        r = requests.get(f"{API}/robots.txt", timeout=15)
        assert r.status_code == 200
        text = r.text
        assert "User-agent" in text
        assert "Allow" in text
        assert "Sitemap" in text


# ---------- OG images ----------
class TestOG:
    def test_og_project(self):
        r = requests.get(f"{API}/og", params={"type": "project", "slug": "aetherlink"}, timeout=20)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/png")
        assert len(r.content) > 100

    def test_og_domain(self):
        r = requests.get(f"{API}/og", params={"type": "domain", "slug": "ai-systems"}, timeout=20)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/png")
        assert len(r.content) > 100


# ---------- Assistant ----------
class TestAssistant:
    def test_assistant_happy(self):
        # single call - should succeed
        r = requests.post(f"{API}/assistant",
                          json={"session_id": "test-session-happy", "question": "What is AetherLink about?"},
                          timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("answer")
        assert isinstance(data.get("citations"), list)
        assert "session_id" in data
        # citation kinds validation
        allowed = {"projects", "domains", "blog", "research", "experience",
                   "achievements", "certifications"}
        for c in data["citations"]:
            k = c.get("kind") if isinstance(c, dict) else None
            if k:
                assert k in allowed

    def test_assistant_rate_limit(self):
        # Wait a bit to reset window from previous test
        time.sleep(2)
        got_429 = False
        for i in range(12):
            r = requests.post(f"{API}/assistant",
                              json={"session_id": "test-session-burst", "question": f"Quick q {i}"},
                              timeout=30)
            if r.status_code == 429:
                got_429 = True
                data = r.json()
                # Expect {error:'throttled', ...}
                assert data.get("error") == "throttled" or "throttled" in str(data).lower()
                break
        assert got_429, "Expected a 429 response within 12 burst requests"
