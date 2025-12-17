
# Assessment Forge

Assessment Forge is an AI-powered assessment authoring platform designed for educators and test developers. It leverages Google's Gemini models to generate high-quality assessment items, including reading passages, questions, and supporting illustrations.

---

## 🚀 Quick Start

1. **Clone the repository** and run:
   ```bash
   npm install
   npm run dev
   ```
2. **Set your API Key** in the **User Settings** tab (or create a `.env` file with `GEMINI_API_KEY=your_key`)
3. **Navigate to Guided Mode** and generate your first assessment item!

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Guided Mode** | Form-based interface for quick single-item generation |
| **Flow Builder** | Visual node editor for complex generation pipelines |
| **Knowledge Base (RAG)** | Upload PDFs/Text to ground AI in your curriculum |
| **Prompt Library** | Manage AI personas and system prompts |
| **Item Bank** | Store and export generated assessment items |
| **Quality Assurance** | AI-powered review with scores and feedback |

---

## 📚 Understanding Flows

### Pre-built Flows

| Flow Name | Description | Nodes |
|-----------|-------------|-------|
| **Standard Assessment Flow** | Generates passage → MCQ item → QA review | Passage Gen → Item Gen → Quality → Export |
| **Shortfilm Flow** | Creative storytelling: logline → 3-act outline | Logline Gen → Act Expert → Export |
| **TOEFL Integrated** | Academic writing task with context | Context Gen → Essay Gen → Item → Export |

### Node Types

| Node | Purpose |
|------|---------|
| **Text Gen** | Core AI generator. Configurable with prompts and variables. |
| **Quality Check** | Evaluates items and produces IQS score + feedback |
| **Export** | Displays final output with full formatting |

---

## ⚙️ Configuration Reference

### Files You Can Modify

| File | Purpose | When to Modify |
|------|---------|----------------|
| `data/initialPrompts.ts` | All system prompts | To change AI behavior, add new prompts, or customize output formats |
| `data/defaultFlow.ts` | Standard Assessment Flow | To change the default flow structure or node configuration |
| `data/toeflFlow.ts` | TOEFL Integrated Flow | To customize the TOEFL-style assessment flow |
| `services/geminiService.ts` | AI API integration | To change models, temperature, or response schemas |
| `components/CustomNodes.tsx` | Node UI components | To customize how nodes look and display output |
| `types.ts` | TypeScript interfaces | When adding new data fields |

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Your Google AI API key | Yes (or use User Settings) |

---

## 🎯 Customization Guide

### Adding a New Prompt

1. Open `data/initialPrompts.ts`
2. Add a new object to the `initialPrompts` array:
   ```typescript
   {
     id: "my-custom-prompt",
     name: "My Custom Prompt",
     description: "What this prompt does",
     content: "You are an expert... Generate a {type} about {topic}",
     defaultMode: "freeform" // or "assessment"
   }
   ```

### Variable Substitution

Use `{variable_name}` syntax in prompts:
- **`{__main_content__}`**: Auto-filled with upstream node output
- **`{custom_var}`**: User-provided or from upstream JSON keys

### Output Modes

| Mode | Use Case | Output |
|------|----------|--------|
| **Freeform** | Essays, stories, outlines | Plain text/markdown |
| **Assessment** | MCQs, quizzes | Structured JSON with question, options, rationale |

---

## 🔧 Technical Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React 19, TypeScript |
| Styling | Tailwind CSS |
| Visual Editor | React Flow |
| AI | Google Gemini API (via @google/genai) |
| PDF Processing | PDF.js |
| Embeddings | text-embedding-004 |

---

## 🏗️ Production Deployment

### Build for Production
```bash
npm run build
```

### Deployment Options
- **Static Hosting**: Deploy the `dist/` folder to Vercel, Netlify, or GitHub Pages
- **Docker**: Create a Dockerfile with nginx to serve static files

### Security Checklist
- [ ] Never commit `.env` files with API keys
- [ ] Use environment variables in production
- [ ] Consider rate limiting if exposing publicly
- [ ] API key should have appropriate permissions only

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Blank screen on load | Click "Reset" or "Run Diagnostics" in Load modal |
| Rate limit errors (429) | Wait 60 seconds or use a different API key |
| API errors | Verify API key in User Settings |
| Missing variables | Check upstream node is connected and has output |

---

## 📂 Project Structure

```
assessment-forge/
├── App.tsx              # Main application component
├── index.tsx            # Entry point
├── types.ts             # TypeScript interfaces
├── components/
│   ├── FlowBuilder.tsx  # Visual flow editor
│   ├── CustomNodes.tsx  # Node components (TextGen, Quality, Export)
│   ├── GuidedMode.tsx   # Form-based generation
│   ├── Library.tsx      # Item Bank
│   └── ...
├── data/
│   ├── initialPrompts.ts  # ⭐ MAIN CONFIG: All prompts
│   ├── defaultFlow.ts     # Standard Assessment Flow
│   └── toeflFlow.ts       # TOEFL Flow
├── services/
│   ├── geminiService.ts   # AI API calls
│   ├── flowExecutionService.ts  # Flow execution engine
│   └── vectorDb.ts        # RAG/embeddings
└── .env                 # API key (create this)
```

---

## 📝 License

This project is proprietary and intended for internal use.

---

## 🤝 Contributing

1. Create a feature branch
2. Make changes to the relevant files (see Configuration Reference)
3. Test using `npm run dev`
4. Submit a pull request

---

**Version**: 1.8.0  
**Last Updated**: December 2024
