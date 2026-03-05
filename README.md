This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Admin Access Control

To restrict `/admin` to only you, set these environment variables:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

Example:

```bash
ADMIN_USERNAME=your_name
ADMIN_PASSWORD=very_strong_password
```

Access `/login` and choose `Admin` to sign in.

## 管理UIの扱い

- `palette_ai` は生成機能を担当します。
- 顧客管理UIは `pal-db` (`http://localhost:3100/admin`) に分離されています。
- HP生成などの管理UIは `pal_studio` 側で運用します。

## Customer-specific main URL

Use customer-specific main links in this format:

`/main?cid=<customer_id>`

You can copy this URL from the customer panel in `/admin`.

## Customer Login

- In `/admin`, set each customer's `loginId` and `loginPassword`.
- Customers sign in from `/login` with `Customer` selected.
- After login, they are redirected to their own `/main?cid=<customer_id>`.

## Sales DB (取引先・プラン・契約)

この機能は `pal-db` サービスに分離されています。

`palette_ai` は以下の環境変数で `pal-db` に接続します。

- `PAL_DB_BASE_URL`（例: `http://localhost:3100`）

`pal-db` 側で `@vercel/postgres` 上に管理用テーブルを自動作成します（初回アクセス時）。

- `accounts`: 取引先（顧客）
- `service_plans`: 提供プラン
- `contracts`: どの顧客がどのプランをいつからいつまで、いくらで契約しているか

### 管理API

- `GET /api/admin/accounts` 取引先一覧
- `POST /api/admin/accounts` 取引先作成・更新
- `GET /api/admin/plans?includeInactive=1` プラン一覧
- `POST /api/admin/plans` プラン作成・更新
- `GET /api/admin/contracts?accountId=...&activeOn=YYYY-MM-DD` 契約一覧
- `POST /api/admin/contracts` 契約作成・更新

### palette_ai 連携API

- `GET /api/palette-ai/customer-contract?paletteCustomerId=<customer_id>&activeOn=YYYY-MM-DD`
- `GET /api/palette-ai/services-by-palette-id?paletteId=<palette_id>&activeOn=YYYY-MM-DD`

返却内容:

- `account`: 顧客情報
- `contracts`: 顧客の契約情報
- `plans`: 契約中プランの詳細情報

## 起動順（ローカル）

1. `pal-db` を起動（`http://localhost:3100`）
2. `palette_ai` を起動（`http://localhost:3000`）

`palette_ai` の `.env.local` 例:

```bash
PAL_DB_BASE_URL=http://localhost:3100
```
