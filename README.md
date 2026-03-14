# 🧬 CureInsight — Crowdsourced Treatment Intelligence Platform

AI-powered platform that transforms scattered online patient treatment discussions into structured, actionable health intelligence.

## 🚀 Quick Start

### 1. Start the Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

The NLP pipeline will process the dataset on startup and the API will be available at `http://localhost:8000`.

### 2. Start the Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## 🏗️ Architecture

```
Raw Patient Discussions → Data Collection → Text Preprocessing
→ Medical Entity Extraction → Sentiment Analysis → Aggregation
→ Dashboard Visualization → AI Chat Assistant
```

### Backend (FastAPI + Python)
- **NLP Pipeline**: Entity extraction, sentiment analysis, aggregation
- **API**: Search, Compare, Chat endpoints
- **Dataset**: 90 pre-curated patient discussions across 6 treatments

### Frontend (React + Vite + Recharts)
- Premium dark theme with glassmorphism
- Interactive charts (side effects, sentiment, timelines)
- Treatment comparison with radar charts
- AI Chat Assistant with source citations

## 📊 Features

| Feature | Description |
|---------|-------------|
| **Treatment Search** | Search any treatment for structured insights |
| **Side Effect Intelligence** | Bar charts showing most reported side effects |
| **Recovery Timeline** | Visual patient journey week-by-week |
| **Sentiment Analysis** | Donut chart of patient sentiment distribution |
| **Treatment Comparison** | Radar chart + table comparing treatments |
| **Combination Therapy** | Commonly combined treatments |
| **Source Traceability** | Links back to original discussions |
| **AI Chat Assistant** | Ask questions about any treatment |

## 🛠️ Tech Stack

- **Backend**: Python, FastAPI, TextBlob
- **Frontend**: React, Vite, Recharts
- **NLP**: Pattern-based entity extraction, TextBlob sentiment
- **Design**: Glassmorphism, Inter font, gradient accents

## 👥 Treatments Available

Metformin | Insulin | Lisinopril | Omeprazole | Amoxicillin | Ibuprofen
