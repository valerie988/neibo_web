# NeBo

Farm-fresh marketplace connecting farmers and customers.

**Stack:** React 18 · TypeScript · Tailwind CSS · FastAPI · MySQL · Docker

---

## Quick Start

```bash
# 1. Clone and configure
cp .env.example .env
# Edit .env — generate SECRET_KEY with:
# python3 -c "import secrets; print(secrets.token_hex(32))"

# 2. Start everything
docker compose up --build
```

| Service  | URL                            |
| -------- | ------------------------------ |
| Frontend | http://localhost:5173          |
| API      | http://localhost:8000          |
| API Docs | http://localhost:8000/api/docs |

---

## Project Structure

```
agrimarket/
├── frontend/                  # React + Vite + Tailwind
│   └── src/
│       ├── pages/             # 8 pages (Login, Signup, Dashboard, Products, Chat, Orders, Recommend, Detail)
│       ├── components/layout/ # Sidebar + Layout
│       ├── store/             # Zustand: auth + WebSocket chat
│       └── services/api.ts    # Axios with auto token refresh
│
├── backend/                   # FastAPI
│   └── app/
│       ├── main.py            # Entrypoint
│       ├── core/              # config (reads .env), database, security
│       ├── models/            # SQLAlchemy: all tables
│       ├── routers/           # auth, users, products, orders, chat, recommendations
│       ├── schemas/           # Pydantic schemas
│       └── services/          # Hybrid recommendation engine (TF-IDF + collaborative)
│
├── .env.example               # ← copy to .env, never commit .env
├── docker-compose.yml
└── README.md
```

---

## Environment Variables

All secrets live in `.env` (never committed). See `.env.example` for all keys.

Key variables:
| Variable | Description |
|--------------|------------------------------------------|
| `SECRET_KEY` | JWT signing key — generate with openssl |
| `MYSQL_*` | Database credentials |
| `VITE_API_URL` | Backend URL for frontend |

---

## Features

- **Auth** — JWT login/signup for farmers and customers, auto token refresh
- **Products** — List, search, filter by category, farmers can create with photo upload
- **Orders** — Customers order, farmers advance status (processing → confirmed → in_transit → delivered)
- **Chat** — Real-time WebSocket messaging between farmers and customers
- **Recommendations** — Hybrid ML engine: TF-IDF content similarity + location + collaborative filtering
- **Responsive** — Works on mobile and desktop

---

## Development (without Docker)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# Set DATABASE_URL in .env to point to your local MySQL
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```
