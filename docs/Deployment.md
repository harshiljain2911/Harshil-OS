# Deployment

Harshil/OS deploys as **two services**: a static **frontend** (Vercel) and a **FastAPI backend** (Railway or Render). MongoDB is optional (Atlas).

```
Vercel (frontend)  ──►  Railway/Render (backend /api)  ──►  MongoDB Atlas (optional)
                                    └──► OpenAI/OpenRouter/Gemini, Resend, GitHub
```

---

## 1. Backend → Railway or Render

### Option A — Railway

1. Push this repo to GitHub (see below).
2. On [railway.app](https://railway.app): **New Project → Deploy from GitHub repo** → select the repo.
3. Set the **root directory** to `backend`.
4. **Build:** `pip install -r requirements.txt`
5. **Start command:**
   ```
   uvicorn server:app --host 0.0.0.0 --port $PORT
   ```
6. Add the environment variables (see table below).
7. Deploy. Note the public URL (e.g. `https://harshil-os-backend.up.railway.app`).

### Option B — Render

1. On [render.com](https://render.com): **New → Web Service** → connect the repo.
2. **Root directory:** `backend`
3. **Runtime:** Python 3
4. **Build command:** `pip install -r requirements.txt`
5. **Start command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`
6. Add environment variables (below) and create the service.

### Backend environment variables

| Variable | Required | Notes |
|---|---|---|
| `ADMIN_PASSWORD` | ✅ | Admin login |
| `ADMIN_JWT_SECRET` | ✅ | Long random string |
| `CORS_ORIGINS` | ✅ | Your frontend URL, e.g. `https://harshil-os.vercel.app` |
| `OPENROUTER_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` | ⚠️ one | Valid **and funded** for LLM mode |
| `RESEND_API_KEY`, `RESEND_TO`, `RESEND_FROM` | ✅ (email) | `RESEND_FROM` must be a verified sender/domain |
| `PORTFOLIO_GITHUB_USER` | ✅ | Repos on the Developer page |
| `MONGO_URL`, `DB_NAME` | optional | MongoDB Atlas connection |
| `SITE_PUBLIC_URL` | optional | Public site URL |

> **Python version:** deploy on Python 3.11 or 3.12 for the smoothest install. If you must use a newer runtime and pinned wheels aren't available, relax pins in `requirements.txt`.
>
> **Uploads persistence:** `backend/uploads/` is committed, so resume PDFs/media ship with the deploy. If you upload new media *through the admin in production*, use a host with a persistent disk (or move media to object storage) — ephemeral filesystems reset on redeploy.

---

## 2. Frontend → Vercel

1. On [vercel.com](https://vercel.com): **Add New → Project** → import the repo.
2. **Root directory:** `frontend`
3. Framework preset: **Create React App** (build `npm run build`, output `build`).
4. **Environment variable:**
   | Variable | Value |
   |---|---|
   | `REACT_APP_BACKEND_URL` | your backend URL, e.g. `https://harshil-os-backend.up.railway.app` |
5. Deploy. Vercel gives you `https://<project>.vercel.app`.
6. Go back to the backend and set `CORS_ORIGINS` to that Vercel URL, then redeploy the backend.

> The build runs `react-snap` (postbuild) to prerender routes. If a host's headless Chrome can't run it, remove the `postbuild` script — the app still works as a normal SPA.

---

## 3. MongoDB (optional)

1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Add a database user and allow your backend host's IP (or `0.0.0.0/0` for simplicity).
3. Set `MONGO_URL` (the SRV connection string) and `DB_NAME` on the backend.

Without MongoDB, contact submissions are still delivered by email and captured in a local fallback file.

---

## 4. Post-deploy checklist

- [ ] Frontend loads; no console errors.
- [ ] `GET <backend>/api/health` returns `200`.
- [ ] Content pages render (Projects/Domains/etc.).
- [ ] Resume opens, downloads, and prints.
- [ ] GitHub repositories load on **Developer**.
- [ ] Contact form submits → email arrives.
- [ ] Assistant streams; **Admin → AI Providers → Test providers** shows a healthy provider.
- [ ] `/admin` login works.
- [ ] `CORS_ORIGINS` includes the exact frontend origin.

---

## 5. Custom domain (optional)

Point your domain at Vercel (frontend) and, if desired, a subdomain (e.g. `api.yourdomain.com`) at the backend host. Update `REACT_APP_BACKEND_URL` and `CORS_ORIGINS` accordingly, then redeploy both.
