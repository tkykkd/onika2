# onika2

Artist portfolio with **Supabase** (auth, storage, database) and a local admin page.

## Local preview

1. `npm install`
2. Copy `.env.example` → `onika2/.env.local`
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Project Settings → API; use **Publishable** / anon key)
4. In Supabase: create bucket **`portfolio-assets`** (public), run `docs/supabase-setup.sql` in SQL Editor
5. Authentication → URL Configuration: add `http://127.0.0.1:3000/**` and `http://127.0.0.1:3002/**` (or your dev port) to **Redirect URLs**
6. `npm run dev`（同じWi‑Fiのスマホから開くときは下記「スマホ確認」）
7. Open:
   - Public: `http://127.0.0.1:3000/`
   - Admin: `http://127.0.0.1:3000/admin`

## スマホから確認（同じWi‑Fi）

1. Mac とスマホを **同じWi‑Fi** に繋ぐ。
2. `npm run dev` を実行するとターミナルに **Network: http://192.168.x.x:3000/** のような行が出る。
3. スマホのブラウザでその **Network の URL** を開く（ポートは表示どおり）。
4. Supabase → Authentication → URL Configuration → Redirect URLs に  
   `http://192.168.0.0/16` は使えないことが多いので、**実際のNetwork URL** をベースに  
   `http://192.168.xx.xx:ポート/**` を追加する。
5. Google ログインがスマホで失敗する場合、Google Cloud の OAuth クライアントに  
   **承認済みの JavaScript 生成元** に `http://192.168.xx.xx:ポート`（スラッシュなし）を追加する。

## Admin

- Google login (Supabase Auth → Google provider)
- Allowed admin email: `tkykkd@gmail.com`
- Image/video upload max 50MB; title, tag, accent color

## Free tier note

Uses Supabase free plan; stay within project limits for storage and egress.

## GitHub Pages deploy

- Repository: `tkykkd/onika2`
- Production URL: `https://tkykkd.github.io/onika2/`
- Deploy trigger: push to `main` (GitHub Actions)

### Required GitHub Secrets

Set these in repository settings (`Settings` → `Secrets and variables` → `Actions`):

- `VITE_SUPABASE_URL` = `https://qdmbyrmvghxjrxsnlszv.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = your Supabase publishable key
