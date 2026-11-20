# OWASP Project


## Prerequisites

- Node.js 18+
- npm
- Netlify CLI

Install Netlify CLI globally (once):

```powershell
npm install -g netlify-cli
```

## Install dependencies

From project root:

```powershell
npm install
```

## Run locally (with AI features)

This app uses:
- Angular app on `http://localhost:4200`
- Netlify Function on `http://localhost:8888/.netlify/functions/grok`

You need **2 terminals**.

### Terminal 1: start Netlify Functions

Choose one provider and set env vars.

### Option A: Groq (recommended for free tier testing)

```powershell
Remove-Item Env:OPENAI_API_KEY -ErrorAction SilentlyContinue
Remove-Item Env:XAI_API_KEY -ErrorAction SilentlyContinue
$env:GROQ_API_KEY="YOUR_GROQ_KEY"
$env:GROQ_MODEL="llama-3.1-8b-instant"
npx netlify functions:serve --port 8888
```

### Option B: xAI

```powershell
Remove-Item Env:OPENAI_API_KEY -ErrorAction SilentlyContinue
Remove-Item Env:GROQ_API_KEY -ErrorAction SilentlyContinue
$env:XAI_API_KEY="YOUR_XAI_KEY"
$env:XAI_MODEL="grok-2-latest"
npx netlify functions:serve --port 8888
```

### Option C: OpenAI

```powershell
Remove-Item Env:GROQ_API_KEY -ErrorAction SilentlyContinue
Remove-Item Env:XAI_API_KEY -ErrorAction SilentlyContinue
$env:OPENAI_API_KEY="YOUR_OPENAI_KEY"
$env:OPENAI_MODEL="gpt-4o-mini"
npx netlify functions:serve --port 8888
```

### Terminal 2: start Angular app

```powershell
npm start
```

Open:

- `http://localhost:4200`

## Important configuration notes

- Keep frontend API key empty in environment files:
  - `src/environments/environment.ts`
  - `src/environments/environment.prod.ts`
- API calls go through backend function only: `/.netlify/functions/grok`
- Provider selection priority in backend:
  1. `XAI_API_KEY`
  2. `GROQ_API_KEY`
  3. `OPENAI_API_KEY`

## Common issues

### 401 Unauthorized
- Invalid key or wrong provider key for selected endpoint.
- Regenerate key and restart Terminal 1.

### 403 Forbidden
- Key is valid but account/model permission is blocked.
- Try a different model (for example `grok-2-latest` or `gpt-4o-mini`).

### 429 Too Many Requests
- Rate limit/quota reached.
- Wait and retry, or use lower-cost/free-tier model.


## Available npm scripts

```powershell
npm start      # Angular dev server
npm run build  # Production build
npm test       # Unit tests
```

