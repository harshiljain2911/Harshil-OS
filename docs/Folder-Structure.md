# Folder Structure

```
Harshil-OS/
│
├── frontend/                     # React 19 SPA (Create React App via CRACO)
│   ├── public/                   # static assets, index.html, pdf worker
│   ├── src/
│   │   ├── pages/                # route components
│   │   │   ├── admin/            # admin panel (login, dashboard, editors, AI, media)
│   │   │   ├── Home.jsx  Domains.jsx  Projects.jsx  Resume.jsx …
│   │   │   ├── Recruiter.jsx  Developer.jsx  Contact.jsx  NotFound.jsx
│   │   ├── components/
│   │   │   ├── layout/           # Navbar, Footer
│   │   │   ├── assistant/        # AIAssistant (grounded chat panel)
│   │   │   ├── media/            # ResumeViewer (lazy PDF viewer)
│   │   │   ├── terminal/         # command palette / terminal overlay
│   │   │   ├── search/           # universal search modal
│   │   │   └── ui/               # shared primitives
│   │   ├── lib/                  # api clients, hooks (useContent, useScrolled), utils, testIds
│   │   ├── App.js                # shell + routing
│   │   └── index.css             # Tailwind layers + theme tokens
│   ├── package.json
│   └── .env.example
│
├── backend/                      # FastAPI application
│   ├── content/                  # ← JSON CMS: the source of truth
│   │   ├── projects/  domains/  experience/  certifications/
│   │   ├── achievements/  blog/  timeline/  research/  resumes/
│   │   ├── drafts/  archived/    # workflow states
│   │   └── site.json             # site singleton (identity, nav, hero, ai, …)
│   ├── routers/
│   │   ├── content_routes.py     # read collections + schemas
│   │   ├── assistant_routes.py   # RAG assistant, SSE, provider fallback
│   │   ├── contact_routes.py     # contact form → Resend + fallback
│   │   ├── github_routes.py      # live GitHub repos
│   │   ├── admin_routes.py       # auth, CRUD, media, AI settings
│   │   └── seo_routes.py / og_routes.py
│   ├── uploads/                  # media + resume PDFs served by the app
│   ├── models.py                 # Pydantic schemas + COLLECTION_MAP
│   ├── content_loader.py         # in-memory content registry
│   ├── email_transport.py        # Resend transport
│   ├── server.py                 # entrypoint (mounts /api)
│   ├── requirements.txt
│   └── .env.example
│
├── docs/                         # this documentation set
│   ├── Project-Overview.md  Architecture.md  Folder-Structure.md
│   ├── Admin-Guide.md  Content-Guide.md  AI-Assistant.md  Deployment.md
│
├── screenshots/                  # README imagery (home, projects, admin, …)
├── assets/                       # shared static assets for docs/repo
├── .github/
│   ├── ISSUE_TEMPLATE/           # bug_report.md, feature_request.md
│   └── PULL_REQUEST_TEMPLATE.md
│
├── .gitignore
├── .env.example                  # (backend template lives at backend/.env.example)
├── LICENSE                       # MIT
├── README.md
├── CHANGELOG.md
└── CONTRIBUTING.md
```

## What is intentionally **not** committed

`.env` files, `node_modules/`, `.venv/`, `__pycache__/`, build output, `backend/contact_submissions.jsonl` (runtime PII), and internal tooling (`.claude/`, `.emergent/`, `memory/`, `test_reports/`). See [`.gitignore`](../.gitignore).
