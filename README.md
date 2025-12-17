# Assessment Forge

AI-powered assessment authoring platform for educators and test developers. Generate high-quality reading passages, MCQ questions, and more using Google's Gemini AI.

---

## ✨ Features

- 📝 **Guided Mode** - Quick form-based item generation
- 🔗 **Flow Builder** - Visual node editor for complex pipelines
- 📚 **Knowledge Base** - Upload PDFs to ground AI in your curriculum (RAG)
- ✅ **Quality Assurance** - AI-powered scoring and feedback
- 💾 **Item Bank** - Save and export assessment items

---

## 🚀 Quick Start (5 minutes)

### Prerequisites
- **Node.js** (v18+) - [Download](https://nodejs.org)
- **Python 3** (v3.9+) - [Download](https://python.org)
- **Google AI API Key** - [Get one here](https://aistudio.google.com/apikey)

### Step 1: Clone & Install
```bash
git clone https://github.com/MLsandeep/Assessment-Forge.git
cd Assessment-Forge
./install.sh
```

### Step 2: Start the App
```bash
./start.sh
```

### Step 3: Open in Browser
Go to: **http://localhost:3000**

### Step 4: Add Your API Key
1. Click **"Settings"** at the bottom of the left sidebar
2. Enter your Google AI API Key
3. Click **Save**

---

## 📖 How to Use

### Guided Mode (Easiest)
1. Go to **Guided** tab
2. Select topic, difficulty, skill
3. Click **Generate Assessment Item**
4. Review and save to Item Bank

### Flow Builder (Advanced)
1. Go to **Builder** tab
2. Load a pre-built flow (e.g., "Standard Assessment Flow")
3. Click the topic field and edit variables
4. Click **Execute Flow**

### Knowledge Base (RAG)
1. Go to **Knowledge** tab
2. Upload a PDF document
3. In Flow Builder, enable **"Use Knowledge"** on a Text Generator node
4. The AI will use content from your PDF to generate better items!

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Assessment Forge                      │
├─────────────────────────┬───────────────────────────────┤
│   Frontend (React)      │   RAG Backend (Python)        │
│   Port 3000             │   Port 8000                   │
├─────────────────────────┼───────────────────────────────┤
│ • UI Components         │ • PDF Processing              │
│ • Flow Builder          │ • FREE Local Embeddings       │
│ • Item Generation       │ • FAISS Vector Search         │
│ • IndexedDB Storage     │ • Similarity Search API       │
└─────────────────────────┴───────────────────────────────┘
          │                         │
          └────── Gemini API ───────┘
              (for text generation)
```

---

## 🔑 Getting an API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click **"Get API Key"**
3. Copy the key and paste it in Settings

---

## 📚 Learn More

For detailed information about:
- Customizing prompts
- Creating new flows
- Configuration options
- Troubleshooting

👉 **See [WORKFLOW_GUIDE.md](WORKFLOW_GUIDE.md)**

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React, TypeScript, Tailwind CSS |
| Visual Editor | React Flow |
| AI Generation | Google Gemini API |
| RAG Backend | Python, FastAPI, LangChain |
| Vector Search | FAISS with HuggingFace Embeddings |
| Storage | IndexedDB (browser), FAISS (backend) |

---

## 📝 License

Proprietary - Internal Use

---

**Version**: 2.0.0 | **Last Updated**: December 2024
