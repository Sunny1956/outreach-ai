# 🚀 AI-Powered Outreach Desk
**Semester 7 Major Project — Full-Stack Web Engineering / Intelligent Systems / Applied AI & NLP**

> Manual-First Execution with Intelligent Machine-Assisted Text Personalization *(Aria-Bot Pattern)*

---

## 📐 Architecture
- **Pattern**: Decoupled RESTful (Frontend ↔ Backend API)
- **Database**: PostgreSQL (relational, multi-tenant safe)
- **Auth**: JWT-based secure session handling

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React.js v18+ (TypeScript) | UI Framework |
| Tailwind CSS | Glassmorphic Styling |
| Context API + React Router v6 | State & Routing |
| Recharts / Chart.js | Analytics Visualizations |

### Backend
| Technology | Purpose |
|---|---|
| Python 3.10+ + FastAPI | Async REST API |
| SQLAlchemy | ORM layer |
| PostgreSQL | Relational Database |
| Alembic | DB Migrations |
| JWT (python-jose) | Authentication |
| OpenAI / Groq API | AI Message Synthesis |

---

## ✨ Key Features
1. **Product Profile Engine** — Curated product value propositions with taglines & target personas
2. **Contextual Lead Hub** — Flexible lead manager with platform-specific nodes (Email, LinkedIn, X, WhatsApp)
3. **Dynamic Tone & Format Workspace** — AI-driven message generation (Warm / Direct / Formal tones)
4. **Performance CRM Dashboard** — Conversion funnel: New → Drafted → Sent → Replied → Converted

---

## 📊 Lead Scoring Formula
```
R_score = (α₁ × C_length) + (α₂ × T_days) − (α₃ × S_weight)
```
- `C_length` — Character depth of factual lead notes
- `T_days` — Total duration since record creation or last action
- `S_weight` — Structural deduction multiplier based on funnel progress
- `α₁, α₂, α₃` — Priority weights configured dynamically in user preferences

---

## 📅 Implementation Roadmap
| Phase | Focus | Weeks |
|---|---|---|
| 1 | Database Engineering & Schema Design | 1–3 |
| 2 | FastAPI REST Architecture Development | 4–6 |
| 3 | AI Message Synthesis & Generation Layer | 7–9 |
| 4 | Responsive Glassmorphic Frontend | 10–12 |
| 5 | Analytics, QA & Testing | 13–14 |

---

## 🚦 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- PostgreSQL 14+

### Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate         # Windows
pip install -r requirements.txt
cp .env.example .env          # Fill in your credentials
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local    # Fill in your API base URL
npm run dev
```

### Full Stack (Docker)
```bash
docker-compose up --build
```

---

## 📁 Project Structure
```
outreach-desk/
├── backend/          # FastAPI application
│   ├── app/
│   │   ├── models/   # SQLAlchemy ORM models
│   │   ├── schemas/  # Pydantic request/response schemas
│   │   ├── routers/  # API route handlers
│   │   ├── services/ # Business logic & AI service
│   │   └── utils/    # JWT, helpers
│   ├── tests/        # Pytest test suite
│   └── alembic/      # DB migration scripts
├── frontend/         # React + TypeScript SPA
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── context/
│       ├── hooks/
│       └── services/
└── docker-compose.yml
```

---

## 👨‍💻 Author
Major Project — Semester 7  
*AI-Powered Outreach Desk Blueprint*
