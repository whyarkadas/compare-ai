# Compare AI

Ask one question in a single chat box, and watch Claude, GPT, and Gemini answer it **at the same time**, side by side. Upload PDFs and every model answers from the same passages of your documents (RAG). Built with Next.js (App Router) + TypeScript + Tailwind CSS.

- One shared input; independent, streaming answer columns.
- Show 1, 2, or 3 models on the page (header pills or the × on a column), and pick which of them receive each message (toggles in the chat box).
- Each column starts streaming the moment the request goes out — no waiting for one model before another starts.
- Multi-turn: each model remembers the turns it actually took part in.
- Upload PDFs; relevant passages are retrieved and given to every model, with a **Sources** list under each answer. See [Chat with your documents (RAG)](#chat-with-your-documents-rag).
- A column with no API key configured shows a friendly "add your key" message instead of breaking the page — the others keep working.
- API keys stay server-side (Next.js Route Handlers); they are never sent to the browser.

## 1. Install dependencies

Requires **Node.js 24** (pinned in `.nvmrc`). With [nvm](https://github.com/nvm-sh/nvm):

```bash
nvm install    # reads .nvmrc
nvm use
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

`OPENAI_API_KEY` is also required for the **Documents** feature — it's used to create embeddings, even if you hide the GPT column.

Each provider requires billing/usage to be set up on their own platform to actually return responses (Google AI Studio also has a free tier for projects without billing). The app itself doesn't charge you anything — it just calls the APIs you configure.

### Default models

| Column | Default model | Override with |
|---|---|---|
| Claude | `claude-sonnet-5` | `ANTHROPIC_MODEL` |
| GPT | `gpt-6-luna` | `OPENAI_MODEL` |
| Gemini | `gemini-3.5-flash-lite` | `GEMINI_MODEL` |

The active model ID is shown at the top of each column. Model line-ups change often — check each provider's docs for current IDs if a default stops working:
- Anthropic: https://docs.claude.com/en/docs/about-claude/models
- OpenAI: https://platform.openai.com/docs/models
- Google: https://ai.google.dev/gemini-api/docs/models

## 3. Run it locally

```bash
npm run dev
```

Open http://localhost:3000, type a question, and hit Enter (Shift+Enter for a newline).

## Chat with your documents (RAG)

RAG (retrieval-augmented generation) means: before a model answers, look up the most relevant passages in your own documents and include them in the prompt. The model then answers from your content instead of only from what it learned in training.

### Using it

1. Click **Documents** (top right) → **Upload PDF**. You can select several files at once.
2. Each file is read, split into chunks, and indexed; it then appears in the list with its page and chunk count.
3. Ask a question. While **Use in answers** is on (and at least one document exists), a green "Answers use your N documents" note appears under the chat box.
4. Each answer cites passages inline like `[1]`, and a collapsible **Sources** list under it shows the file, page, and passage text.

If a question is unrelated to your documents, nothing matches and the models answer normally.

### How it works

```
UPLOAD (once per PDF)
  PDF ──► extract text per page ──► split into chunks ──► embed each chunk ──► save to data/rag-index.json
          (unpdf, local)            (local)               (OpenAI API)          (local)

ASK (every question)
  question ──► embed question ──► compare with every chunk ──► top 5 passages (as text)
               (OpenAI API)       (cosine similarity, local)          │
                                                                      ▼
                              same system prompt + passages ──► Claude, GPT, Gemini (in parallel)
```

Retrieval runs **once per question** and the same passages go to every selected model, so the comparison is fair: all models answer from identical sources.

| Step | Algorithm / tool | Runs | Code |
|---|---|---|---|
| Text extraction | [`unpdf`](https://github.com/unjs/unpdf) (PDF.js), one string per page | Locally | `src/app/api/documents/route.ts` |
| Chunking | Sliding window of **220 words**, **40-word overlap**, never crossing pages (so each chunk keeps its page number) | Locally | `src/lib/rag/chunk.ts` |
| Embeddings | OpenAI **`text-embedding-3-small`** → 1,536 numbers per chunk, batched 96 at a time | OpenAI API | `src/lib/rag/embed.ts` |
| Storage | One JSON file, `data/rag-index.json` (git-ignored); writes are serialized so parallel uploads don't clash | Locally | `src/lib/rag/store.ts` |
| Search | Exact (brute-force) nearest neighbors by **cosine similarity**; keep the **top 5** scoring **≥ 0.25** | Locally | `src/lib/rag/search.ts` |
| Prompting | Passages are numbered into the system prompt with instructions to cite them | — | `src/app/api/chat/[provider]/route.ts` |

### What is actually sent to the models

Plain text — the vectors are only used to *find* passages and are never sent to Claude, GPT, or Gemini. For a question like "How many vacation days do new employees get?", the system prompt looks roughly like:

```
You are a helpful, concise assistant. Answer the user's question directly.

The user has uploaded documents. Passages that may be relevant to their question
are listed below. When they are relevant, base your answer on them and cite them
inline like [1] or [2]. If they don't contain the answer, say so briefly, then
answer from general knowledge and make clear which parts aren't from the documents.

<sources>
[1] handbook.pdf, page 12
New employees receive 15 days of paid vacation per year...

[2] handbook.pdf, page 13
Vacation days must be requested at least two weeks in advance...
</sources>
```

followed by the conversation history and the user's question, exactly as without RAG.

### Limitations

- **Local storage only.** `data/rag-index.json` lives on disk, so documents don't persist on serverless hosts like Vercel. For deployment, move the store to Postgres + [pgvector](https://github.com/pgvector/pgvector) (e.g. Neon or Supabase).
- **Text-based PDFs only.** Scanned (image-only) PDFs have no extractable text and are rejected; they'd need OCR.
- **Max 20 MB per PDF.**
- **One embedding model per index.** Vectors from different models aren't comparable — if you change `EMBEDDING_MODEL`, delete and re-upload your documents.
- **Brute-force search** is instant for thousands of chunks; for millions you'd want an approximate index (HNSW), which pgvector and vector databases provide.

### Cost

Embedding is cheap: indexing a 100-page PDF costs well under one US cent with `text-embedding-3-small`, and each question adds one tiny embedding call. The passages do make each chat request longer (roughly 5 × 300 extra input tokens per model).

## RAG concepts FAQ

**What is an embedding?**
A list of numbers that represents the *meaning* of a piece of text. An embedding model turns "How do I reset my password?" into something like `[0.012, -0.481, 0.910, …]`. Texts with similar meanings get similar numbers even when they share no words — "forgot my login" lands close to "password reset", while "pizza recipe" lands far away. That's what makes "search by meaning" possible.

**What is a vector?**
An ordered list of numbers — in code, just an array. `[3, 4]` can be pictured as a point on a 2D map (3 right, 4 up); `[3, 4, 2]` is a point in 3D. An embedding is the same idea with 1,536 numbers: every chunk of text becomes a point in a 1,536-dimensional space, and similar meanings are nearby points. Finding relevant passages = finding the points closest to the question's point. A "vector database" is a database built to do that quickly.

**Is creating embeddings like creating tokens?**
Related, but different steps. *Tokenizing* chops text into pieces and maps each to an ID from a fixed vocabulary (`"Embeddings are useful"` → `[31251, 6910, 819, 527, 5505]`) — a lookup table, no understanding, and the IDs carry no meaning. *Embedding* runs those tokens through a neural network and outputs one meaning vector for the whole text. Every model tokenizes first; an embedding model's job is to output a vector you can store and compare. Both are billed per token.

**How is this search different from Elasticsearch?**
Classic Elasticsearch is *keyword* search (BM25): it ranks documents by how often the query's words appear and how rare they are. It's excellent for exact terms (error codes, names, SKUs) but misses paraphrases. Embedding search is *semantic*: it matches meaning, so "days off for new hires" finds a paragraph about "paid vacation for new employees". Modern Elasticsearch supports vector search too, and **hybrid search** (keyword + vector scores combined) is often the strongest setup. This project uses vector search only; running Elasticsearch would be overkill at this scale.

**How are embeddings saved?**
Each chunk is stored as a record holding the text, where it came from, and its vector:

```json
{
  "id": "e7d8…#0",
  "documentId": "e7d8…",
  "page": 4,
  "text": "To reset your password, open Settings → Security…",
  "embedding": [0.0123, -0.4811, 0.9102, …]
}
```

Here all records live in `data/rag-index.json`. At scale they'd go into Postgres with a `vector(1536)` column (pgvector) or a dedicated vector database (Pinecone, Qdrant, Chroma, Weaviate). Size: 1,536 numbers × 4 bytes ≈ 6 KB per chunk.

**What do we send to the LLM when asking a question?**
Text only: instructions + the retrieved passages (in the system prompt) + the conversation + the question. See [What is actually sent to the models](#what-is-actually-sent-to-the-models).

**Which algorithms are used?**
OpenAI's `text-embedding-3-small` (a transformer neural network) creates the embeddings; a 220-word sliding window with 40-word overlap creates the chunks; cosine similarity with exact nearest-neighbor search (top 5, minimum score 0.25) finds the passages. Cosine similarity measures whether two vectors point in the same direction, from −1 (opposite) to 1 (identical).

**Does it all run through APIs, or can it run locally?**
Everything except creating embeddings (and generating answers) already runs locally: PDF text extraction, chunking, storage, and search. Embeddings could also be local — via [Ollama](https://ollama.com) (e.g. `nomic-embed-text`, called on `http://localhost:11434`) or [Transformers.js](https://huggingface.co/docs/transformers.js) running a small model inside the Node server. Local embeddings are free, offline, and keep documents on your machine, but are slower on CPU and usually somewhat less accurate than OpenAI's. Switching requires re-embedding all documents.

## Project structure

```
src/
  app/
    page.tsx                         # server component: reads model names, renders CompareApp
    api/chat/[provider]/route.ts     # streams a response from one provider (adds RAG passages to the system prompt)
    api/documents/route.ts           # GET list / POST upload (extract → chunk → embed → store)
    api/documents/[id]/route.ts      # DELETE a document
    api/rag/search/route.ts          # POST { query } → top matching passages
  components/
    CompareApp.tsx                   # page state: models on page, recipients, turns, documents
    ChatInput.tsx                    # the chat box with recipient toggles
    AnswerColumn.tsx                 # one model's column (markdown answers + Sources list)
    DocumentsPanel.tsx               # Documents button, upload, list, "Use in answers" switch
  lib/
    providers/                       # one file per provider's API call + default model
      anthropic.ts
      openai.ts
      gemini.ts
    rag/                             # server-only RAG pipeline
      chunk.ts  embed.ts  search.ts  store.ts
    documentsClient.ts               # browser-side calls to the documents/search APIs
    streamChat.ts                    # client-side fetch + stream parser
    chatState.ts / types.ts          # shared types, and the PROVIDERS list
data/
  rag-index.json                     # created on first upload (git-ignored)
```

To add a 4th model (or swap one out), add a provider entry to `PROVIDERS` in `src/lib/types.ts`, add a `stream<Provider>` function in `src/lib/providers/`, wire it into the `switch` in `src/app/api/chat/[provider]/route.ts`, and pass its model name from `src/app/page.tsx`. The grid, history, and RAG logic don't need to change.

## 4. Deploy to Vercel

The app is a standard Next.js project, so Vercel (made by the Next.js team) is the easiest place to host it — free for personal projects.

> **Note:** the Documents (RAG) feature stores its index on the local filesystem, which doesn't persist on Vercel. Chat works fine there; for documents, move the store to Postgres + pgvector first (see [Limitations](#limitations)).

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
- The API routes use Node's runtime (`export const runtime = "nodejs"`), which Vercel supports out of the box. Set the project's Node.js version to 24 in Vercel's settings to match `.nvmrc`.
- Any other Node.js host (Render, Railway, Fly.io, your own server via `npm run build && npm run start`) works too — just make sure the same environment variables are set wherever it runs. On a host with a persistent disk, the Documents feature works as-is.
