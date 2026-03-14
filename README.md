# CureInsight — Crowdsourced Treatment Intelligence Platform

AI-powered platform aggregating patient discussions into structured treatment insights.
Live data from Reddit, PubMed, and Drugs.com.

---

## Quick Setup (Both Backend + Frontend)

### Prerequisites
- Python 3.10+
- Node.js 18+
- Git

---

## 1. Clone the repo

```bash
git clone <your-repo-url>
cd <repo-folder>
```

---

## 2. Backend Setup

```bash
# Create and activate a virtual environment
python -m venv venv

# Mac/Linux:
source venv/bin/activate

# Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Create your backend `.env` file

```bash
cp .env.example .env
```

Edit `.env` — only these are required to start:
```
# Optional — AI features (smart NER, chat, timeline synthesis)
GROQ_API_KEY=your_groq_key_here

# Optional — YouTube comments as a data source
YOUTUBE_API_KEY=your_youtube_key_here

# Optional — how long to cache search results (default: 24 hours)
CACHE_TTL_HOURS=24
```

Reddit, PubMed, and Drugs.com work with **no API keys at all**.

### Start the backend

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
  Pipeline Ready! API is now serving.
  🟢 Live Scraping: ALWAYS ON
     Active sources: Reddit, PubMed, Drugs.com
```

---

## 3. Frontend Setup

```bash
cd frontend   # or wherever your src/ folder lives — adjust to your project structure
```

### Create your frontend `.env` file

```bash
cp .env.example .env
```

Edit `.env`:
```
# If backend is on the SAME machine (default):
VITE_API_URL=http://localhost:8000

# If backend is on a DIFFERENT machine on your local network:
# First find the host machine's IP address:
#   Mac/Linux : ifconfig | grep "inet " | grep -v 127.0.0.1
#   Windows   : ipconfig | findstr IPv4
# Then set:
# VITE_API_URL=http://192.168.1.42:8000
```

### Install and run

```bash
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Troubleshooting

### "Port 5173 is already in use"
Another Vite app is running. Stop it first (`Ctrl+C` in that terminal), then retry.
The app is configured with `strictPort: true` — it will NOT silently switch to 5174.

### "Keeps loading, no results"
Almost always means the frontend can't reach the backend. Check:

1. **Is the backend running?**
   ```bash
   curl http://localhost:8000/health
   ```
   Should return `{"status":"healthy",...}`. If it fails, the backend isn't running — go back to Step 2.

2. **Wrong IP for a different machine?**
   Make sure `VITE_API_URL` in `.env` matches the actual IP of the machine running the backend.
   After editing `.env`, restart the frontend (`Ctrl+C` then `npm run dev` again).

3. **Firewall blocking port 8000?**
   - Mac: System Settings → Network → Firewall
   - Windows: Allow an app through Windows Firewall → add Python/uvicorn
   - Linux: `sudo ufw allow 8000`

4. **Did you restart after editing `.env`?**
   Vite reads `.env` at startup only. Always restart after changing it.

### "No data found" for a treatment
The scraper ran but found nothing. Try:
- Check spelling (e.g. `Metformin` not `metfromin`)
- Try a more common treatment name first (e.g. `Ibuprofen`)
- Check backend terminal for scraper error messages

### Backend won't start — missing module
```bash
pip install -r requirements.txt
```
Make sure your virtual environment is activated first.

---

## Project Structure

```
├── main.py                  # FastAPI app entry point
├── requirements.txt         # Python dependencies
├── .env.example             # Environment variable template
├── nlp/
│   ├── pipeline.py          # Main orchestrator
│   ├── aggregator.py        # Data aggregation
│   ├── entity_extractor.py  # NER (LLM + patterns)
│   ├── sentiment.py         # VADER sentiment
│   ├── credibility.py       # Source credibility scoring
│   ├── misinfo.py           # Misinformation detection
│   ├── topic_modeler.py     # Topic modeling
│   ├── drug_normalizer.py   # RxNorm drug name normalization
│   ├── llm_extractor.py     # Groq entity extraction
│   ├── llm_synthesis.py     # Groq timeline synthesis
│   └── llm_chat.py          # Groq RAG chat
├── scrapers/
│   ├── reddit_scraper.py    # Reddit public JSON (no key)
│   ├── pubmed_scraper.py    # NIH eutils API (no key)
│   ├── web_scraper.py       # Drugs.com reviews (no key)
│   └── youtube_scraper.py   # YouTube API (key required)
├── routes/
│   ├── search.py            # GET /api/search, /api/search/stream
│   ├── compare.py           # GET /api/compare
│   └── chat.py              # POST /api/chat
└── src/
    ├── api/
    │   └── client.js        # All API calls — reads VITE_API_URL
    ├── components/
    │   └── ...              # React components
    ├── App.jsx
    └── main.jsx
```
