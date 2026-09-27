# Compare AI

Ask one question in a single chat box, and watch Claude, GPT, and Gemini answer it **at the same time**, side by side, in three columns. Built with Next.js (App Router) + TypeScript + Tailwind CSS.

- One shared input at the top; three independent, streaming answer columns below.
- Each column starts streaming the moment the request goes out — no waiting for one model before another starts.
- Multi-turn: each column remembers its own conversation history as you keep asking follow-ups.
- A column with no API key configured shows a friendly "add your key" message instead of breaking the page — the other two keep working.
- API keys stay server-side (Next.js Route Handlers); they are never sent to the browser.

## 1. Install dependencies

```bash
npm install
```

## 2. Add your API keys

Copy the example env file:

```bash
cp .env.example .env.local
```

Then open `.env.local` and paste in whichever keys you have. You don't need all three — any column without a key just shows a setup message instead of an answer.

| Model | Env var | Get a key |
|---|---|---|
| Claude (Anthropic) | `ANTHROPIC_API_KEY` | https://console.anthropic.com/settings/keys |
| GPT (OpenAI) | `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
| Gemini (Google) | `GEMINI_API_KEY` | https://aistudio.google.com/apikey |

Each provider requires billing/usage to be set up on their own platform to actually return responses (free trial credits are sometimes available). The app itself doesn't charge you anything — it just calls the API you configure.

Optional: override which model each column uses by setting `ANTHROPIC_MODEL`, `OPENAI_MODEL`, or `GEMINI_MODEL` in `.env.local` (see the commented-out examples in `.env.example`). Model line-ups change often — check each provider's docs for current model IDs if a default stops working:
- Anthropic: https://docs.claude.com/en/docs/about-claude/models
- OpenAI: https://platform.openai.com/docs/models
- Google: https://ai.google.dev/gemini-api/docs/models

## 3. Run it locally

```bash
npm run dev
```

Open http://localhost:3000, type a question, and hit Enter (Shift+Enter for a newline).

## Project structure

```
src/
  app/
    page.tsx                 # the chat UI (input + 3 columns)
    api/chat/[provider]/route.ts   # streams a response from one provider
  components/
    ChatInput.tsx             # the shared input box
    AnswerColumn.tsx          # one model's column (renders markdown)
  lib/
    providers/                # one file per provider's API call
      anthropic.ts
      openai.ts
      gemini.ts
    streamChat.ts             # client-side fetch + stream parser
    chatState.ts / types.ts   # shared types, and the PROVIDERS list
```

To add a 4th model (or swap one out), add a provider entry to `PROVIDERS` in `src/lib/types.ts`, add a `stream<Provider>` function in `src/lib/providers/`, and wire it into the `switch` in `src/app/api/chat/[provider]/route.ts`. The UI grid and history logic don't need to change.

## 4. Deploy to Vercel

The app is a standard Next.js project, so Vercel (made by the Next.js team) is the easiest place to host it — free for personal projects.

### Option A: Vercel dashboard (no CLI needed)

1. Push this project to a GitHub (or GitLab/Bitbucket) repository.
2. Go to https://vercel.com/new and sign in.
3. Click **Import** next to your repository (or paste its URL).
4. Vercel auto-detects Next.js — leave the build settings as default.
5. Before clicking Deploy, expand **Environment Variables** and add whichever of these you have: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` (and optionally `ANTHROPIC_MODEL` / `OPENAI_MODEL` / `GEMINI_MODEL`).
6. Click **Deploy**. Vercel gives you a live `*.vercel.app` URL in about a minute.
7. To change keys later: Project → Settings → Environment Variables → redeploy.

### Option B: Vercel CLI

```bash
npm install -g vercel
vercel login
vercel            # first deploy — follow the prompts, creates the project
vercel env add ANTHROPIC_API_KEY production
vercel env add OPENAI_API_KEY production
vercel env add GEMINI_API_KEY production
vercel --prod     # deploy to your production URL
```

Run `vercel env add` again (with `preview` or `development` instead of `production`) if you also want the keys available on preview deployments or `vercel dev`.

### Notes for deployment

- `.env.local` is only used locally and is git-ignored on purpose — it will **not** be deployed. Environment variables must be set in Vercel's dashboard (or via `vercel env add`) separately.
- The API route streams responses using Node's runtime (`export const runtime = "nodejs"` in `route.ts`), which Vercel supports out of the box.
- Any other Node.js host (Render, Railway, Fly.io, your own server via `npm run build && npm run start`) works too — just make sure the same three environment variables are set wherever it runs.
