# boot-finance/node — CLAUDE.md

## Stack
- Node.js + Express 5, Sequelize 6 + PostgreSQL
- Auth: JWT (`req.userId` set by `auth_middleware`)
- Payments: Stripe + AbacatePay
- AI: Anthropic SDK + Groq SDK
- Messaging: WhatsApp (wwebjs) + Twilio + Nodemailer
- Cron: node-cron (non-overlapping, parallelized per user)
- Deploy: Render (render.yaml + Dockerfile)

## Architecture
```
route → middleware → controller → service → repository → model
```
- **Controller**: HTTP only. try/catch, call service, return JSON.
- **Service**: business logic + validation. Throw `Error` with PT-BR messages.
- **Repository**: DB queries only. No business logic.
- **Model**: Sequelize schema only.

## Naming
- Files: `snake_case.js` (e.g. `transaction_service.js`)
- Classes: `PascalCase`
- Methods/vars: `camelCase`
- DB columns: `snake_case`
- Exports: singleton instance (`module.exports = new MyClass()`)

## Error handling
- Services throw `new Error('mensagem em PT-BR')`
- Controllers catch and return `res.status(4xx).json({ error: err.message })`
- 5xx + DB errors → global `error_handler.js` → Slack notification
- Never use `console.log` for errors in production paths — errors propagate to handler
- Status heuristic: `err.message.includes('permissão') ? 403 : 400`

## Validation
- Do in **service layer**, not controller
- Validate at boundaries: user input, external API responses
- Don't validate what Sequelize constraints already guarantee

## Patterns
- Stripe webhook: raw Buffer before `express.json()` — keep order in `app.js`
- DB sync via `dbInit()` in `server.js` before `app.listen()` — not in `app.js`
- Cron jobs: check `isRunning` flag to prevent overlap; process users in parallel
- Email: queue-based (`email_queue` table + `email_queue_service`)
- Plan gates: `check_plan` middleware on premium routes

## Don't do
- No tests exist — don't add test scaffolding unless asked
- No comments explaining WHAT code does — only WHY if non-obvious
- No `console.log` for error handling — throw and let handler catch
- No migrations yet (TODO in app.js) — use `database.sync()` until asked to migrate
- Don't add abstractions beyond the Controller→Service→Repository pattern

## Key files
- `src/app.js` — Express setup, middleware order matters
- `src/index.js` — server entry, calls `dbInit()`
- `src/middlewares/error_handler.js` — global error handler, always last
- `src/middlewares/auth_middleware.js` — sets `req.userId`
- `src/middlewares/check_plan.js` — plan gate
- `src/routes/index.js` — route aggregator
- `src/configs/database.js` — Sequelize connection singleton
- `src/models/index.js` — model associations

## Environment
- `.env.example` is source of truth for required vars
- `env_validator.js` validates at startup
- Never commit `.env` or `.env.production`
