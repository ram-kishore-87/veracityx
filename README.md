🛡️ VeracityX

### Real-Time Misinformation & Credibility Detection Engine

> AI-powered browser extension that evaluates online content for credibility, bias, emotional manipulation, and misinformation — in real time.

---



🌍 Why VeracityX?

The internet is flooded with:

* Sensational headlines
* Emotional manipulation
* Logical fallacies
* Unverified claims
* Polarized narratives

Yet users lack **real-time credibility intelligence** inside their browser.

VeracityX solves this by embedding an AI-powered credibility layer directly into Chrome and Firefox.

---

🧠 What Makes It Different?

Unlike simple sentiment analyzers, VeracityX performs **multi-dimensional analysis**:

| Dimension                 | What It Detects                                   |
| ------------------------- | ------------------------------------------------- |
| Credibility Score         | Overall trustworthiness (0–100)                   |
| Sentiment Analysis        | Polarity detection                                |
| Emotion Detection         | Anger, Fear, Joy, Sadness                         |
| Logical Fallacies         | Emotional reasoning, overgeneralization           |
| Misinformation Indicators | ALL CAPS, sensational tone, excessive punctuation |
| Text Neutralization       | Balanced content rewriting                        |

---

🏗 System Architecture

```
User Browser
   ↓
Browser Extension (JS)
   ↓
Content Script (Text Extraction)
   ↓
FastAPI Backend
   ↓
NLP Processing Engine
   ↓
Credibility & Risk Evaluation Layer
   ↓
Structured JSON Response
   ↓
Interactive UI Rendering
```

---

⚙️ Tech Stack

### Frontend

* JavaScript (ES6+)
* Chrome Extension APIs
* Firefox WebExtensions API
* HTML5 / CSS3

### Backend

* FastAPI
* Uvicorn
* Python 3.10+
* NLP Models (Sentiment + Emotion)

---

🧪 AI / NLP Pipeline

1. Text Preprocessing

   * Tokenization
   * Noise removal
   * Normalization

2. Sentiment Classification

   * Polarity scoring

3. Emotion Detection

   * Multi-label emotional probability distribution

4. Credibility Heuristic Layer

   * Rule-based scoring
   * Linguistic signal detection
   * Pattern-based misinformation flags

5. Composite Credibility Score
   Weighted aggregation of:

   * Sentiment volatility
   * Emotional intensity
   * Risk flags
   * Language patterns

---

📊 Performance

| Metric             | Result                             |
| ------------------ | ---------------------------------- |
| Avg Response Time  | < 1s (≤1000 chars)                 |
| Supported Browsers | Chrome 90+, Edge 90+, Firefox 109+ |
| Deployment         | Local API (Privacy-first)          |

---

🔒 Privacy First Design

* No third-party APIs
* No cloud tracking
* User-controlled backend
* No persistent data storage

VeracityX is designed as a **self-hosted credibility engine**.

---

📦 Installation

1️⃣ Clone Repository

```bash
git clone https://github.com/yourusername/veracityx.git
cd veracityx
```

2️⃣ Start Backend

```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

 3️⃣ Load Extension (Chrome)

* Go to `chrome://extensions/`
* Enable Developer Mode
* Click **Load Unpacked**
* Select extension folder

---
📂 Project Structure

```
veracityx/
│
├── backend/
│   ├── main.py
│   ├── models/
│   └── analyzers/
│
├── extension/
│   ├── manifest.json
│   ├── popup.js
│   ├── content.js
│   └── background.js
│
└── README.md
```

---

🛣 Roadmap

* [ ] Multi-language support
* [ ] Transformer-based credibility classifier
* [ ] Cloud deployment option
* [ ] Real-time webpage highlighting
* [ ] Model benchmarking dataset
* [ ] Browser sync

---
📈 Future Research Direction

VeracityX can evolve into:

* Trust & Safety AI system
* News verification engine
* Social media misinformation detector
* Enterprise content risk analysis tool

---

🏆 Hackathon Project

Built during a competitive hackathon focused on AI-driven social impact tools.

---

👨‍💻 Author

Ram Kishore L R
BSc Computer Science (AI & ML) 
---

