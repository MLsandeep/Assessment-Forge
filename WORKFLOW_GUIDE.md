# Workflow & Configuration Guide

This document provides detailed information about flows, prompts, and customization options in Assessment Forge.

---

## 📚 Understanding Flows

### What is a Flow?
A flow is a visual pipeline that connects AI nodes to generate content step-by-step. Think of it like a recipe: each node is a step, and data flows from one to the next.

### Pre-built Flows

| Flow Name | What it Does |
|-----------|--------------|
| **Standard Assessment Flow** | Creates a reading passage → generates MCQ question → reviews quality |
| **Shortfilm Flow** | Creates a movie logline → expands into a 3-act story outline |
| **TOEFL Integrated** | Creates academic writing task with context and essay |

---

## 🎯 Node Types

| Node | Purpose | When to Use |
|------|---------|-------------|
| **Text Gen** | AI generator configured with prompts | Main content creation |
| **Quality Check** | Reviews and scores generated items | After item generation |
| **Export** | Shows final formatted output | End of every flow |

---

## ⚙️ Configuration Files

### Where to Make Changes

| I want to... | Edit this file |
|--------------|----------------|
| Change AI prompts | `data/initialPrompts.ts` |
| Modify the Standard Flow | `data/defaultFlow.ts` |
| Change AI model or settings | `services/geminiService.ts` |
| Add new data fields | `types.ts` |

---

## 📝 Adding a New Prompt

1. Open `data/initialPrompts.ts`
2. Add a new entry:

```typescript
{
  id: "my-prompt",
  name: "My Custom Prompt",
  description: "What this prompt does",
  content: "You are an expert. Generate content about {topic}",
  defaultMode: "freeform"
}
```

### Variable Syntax
- Use `{variable_name}` in prompts
- **`{__main_content__}`** = Output from previous node (automatic)
- **`{topic}`**, **`{level}`** = User-provided values

---

## 🔄 Output Modes

| Mode | Use For | Output Format |
|------|---------|---------------|
| **Freeform** | Essays, stories, outlines | Plain text/markdown |
| **Assessment** | MCQs, quizzes | Structured JSON (question, options, rationale) |

---

## 🏗️ Project Structure

```
assessment-forge/
├── data/
│   ├── initialPrompts.ts    ← All AI prompts
│   ├── defaultFlow.ts       ← Standard Assessment Flow
│   └── toeflFlow.ts         ← TOEFL Flow
├── services/
│   ├── geminiService.ts     ← AI API calls
│   └── flowExecutionService.ts ← Flow engine
├── components/              ← UI components
└── types.ts                 ← Data interfaces
```

---

## 🔧 Advanced: Production Deployment

### Build for Production
```bash
npm run build
```

### Security Checklist
- [ ] Never commit `.env` files
- [ ] Use environment variables in production
- [ ] API key should have appropriate permissions only

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Blank screen on load | Click "Reset" button |
| Rate limit errors (429) | Wait 60 seconds |
| Model overloaded (503) | Try again or switch model in Settings |
| API errors | Verify API key in User Settings |

---

**For basic setup instructions, see [README.md](README.md)**
