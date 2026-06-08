# ADR-001: Core Tech Stack

**Date:** 2026-06-08  
**Status:** Accepted

---

## Context

folio-ai needs a frontend framework, hosting platform, agent backend, vector store, and scheduling integration. Decisions are constrained by a 100-hour build budget, a solo developer, and the requirement that the site itself demonstrate AI engineering and cloud-native instincts.

---

## Decisions

### Frontend: Next.js (App Router) over Astro

**Chosen:** Next.js 15 with App Router  
**Rejected:** Astro

**Rationale:** The flagship feature is a ReAct-style agentic chatbot with streaming responses and an admin note-review panel. This is interactivity-heavy, not content-heavy. Next.js Route Handlers co-locate the agent API inside the same Vercel project, eliminating a separate backend service. Astro's island architecture would add friction for the real-time chat and auth flows without offsetting benefit.

---

### Hosting: Vercel over Cloudflare Pages

**Chosen:** Vercel  
**Rejected:** Cloudflare Pages

**Rationale:** First-class Next.js support (same company), zero-config deployment, built-in streaming support for AI SDK responses, and Vercel Postgres integrates directly with the Neon pgvector setup. Cloudflare Pages offers better edge performance globally but adds Worker/adapter complexity that isn't justified for a portfolio site at this scale.

---

### Agent Backend: Claude API (Anthropic SDK) via Next.js Route Handlers

**Chosen:** Claude claude-sonnet-4-20250514 via `@anthropic-ai/sdk`, co-located in `src/app/api/`  
**Rejected:** Separate Express/Fastify service; OpenAI

**Rationale:** Claude's extended thinking and tool-use capabilities are strong fits for a ReAct loop. Co-locating as Route Handlers avoids a second deployment target. claude-sonnet-4-20250514 balances capability and cost for a portfolio use case.

---

### Vector Store: pgvector (Neon) over Pinecone

**Chosen:** pgvector extension on Neon (Vercel Postgres)  
**Rejected:** Pinecone

**Rationale:** RAG is a stretch goal on a 100-hour budget. pgvector keeps the service graph to one database (Postgres for both relational data and vectors), runs on Neon's free tier, and avoids onboarding a dedicated vector DB for a feature that may not ship in v1. If RAG scales beyond portfolio use, migrating to Pinecone is straightforward.

---

### Scheduling: Cal.com

**Chosen:** Cal.com  
**Rejected:** Calendly, Google Calendar direct

**Rationale:** Open source and self-hostable — consistent with the project's OSS template identity. Clean API for tool-call integration. Free tier is sufficient. Calendly is closed source; Google Calendar direct adds OAuth complexity.

---

## Consequences

- All API routes live in `src/app/api/` — no separate backend service to deploy or secure independently
- Agent streaming requires Next.js Edge Runtime or Node.js streaming — confirm compatibility before implementing
- pgvector migration path: if RAG needs dedicated scale, Neon → Pinecone is a well-documented pattern
- Cal.com requires a Cal.com account and API key in environment variables
