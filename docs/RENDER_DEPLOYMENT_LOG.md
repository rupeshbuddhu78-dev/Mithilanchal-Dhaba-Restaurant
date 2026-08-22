# Render Deployment Log

- **Date:** 2026-08-22
- **Render service:** `mithilanchal-dhaba-restaurant` in Singapore on the free tier.
- **Temporary database:** TiDB Cloud Starter instance `mithilanchal-dhaba-temp`, Singapore region, configured through masked Render environment variables.
- **Environment configuration:** `NODE_ENV=production`, `DATABASE_URL`, `DATABASE_SSL=true`, and a generated `JWT_SECRET` were added in Render.
- **Initial deployment result:** Build failed because `corepack enable` attempted to alter the read-only system `pnpm` path in Render’s Node 24 runtime.
- **Correction applied:** The Render build command is now `pnpm install --frozen-lockfile && pnpm run build` on the free tier.
- **Latest build result:** The source commit `9fcd1f9` built successfully on Render. Runtime startup and database schema validation remain pending.
- **Schema status:** The essential restaurant tables were created successfully in TiDB Cloud’s `test` application schema. The Render connection URL was updated from the protected `sys` schema to `test` and the service was redeployed.
- **Runtime status:** Render reports the service live at its public URL. The current deployment logs confirm that external Manus OAuth is not configured; this prevents the original Manus login flow from operating on Render. The public catalog request still needs a final database-query check and seed validation.
