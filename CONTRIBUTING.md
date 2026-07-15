# Contributing to Harshil/OS

Thanks for your interest! This is primarily a personal portfolio, but improvements, bug reports, and forks are welcome.

## Ways to contribute

- 🐛 **Report a bug** — open an issue with steps to reproduce (use the bug template).
- 💡 **Suggest a feature** — open an issue describing the idea and why it helps (feature template).
- 🔧 **Send a pull request** — for fixes and improvements.

## Development setup

See the [README](README.md#installation) for full setup. In short:

```bash
# Backend
cd backend && python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt && cp .env.example .env
uvicorn server:app --host 127.0.0.1 --port 8899

# Frontend
cd frontend && npm install && cp .env.example .env
npm start
```

## Guidelines

- **Match the existing style.** Follow the conventions and formatting already in the file you're editing.
- **Keep the design language intact.** UI changes should respect the black/orange OS theme, typography, and spacing.
- **Content is data.** New content types should be added as a Pydantic model + `COLLECTION_MAP` entry, not hardcoded.
- **Never commit secrets.** `.env` files are gitignored; use `.env.example` for new variables.
- **Validate before you push.** Run `npm run build` (frontend) and confirm the backend boots (`uvicorn server:app`) with your changes.
- **Small, focused PRs** are easier to review than large ones.

## Commit messages

Use clear, conventional-style messages where possible, e.g. `feat: …`, `fix: …`, `docs: …`, `refactor: …`.

## Reporting security issues

Please **do not** open a public issue for security vulnerabilities. Contact the maintainer directly (see the site's contact page).
