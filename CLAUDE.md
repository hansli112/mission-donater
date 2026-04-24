# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概述

「Mission Donater」是一個短宣認獻管理工具，前端為靜態 HTML，後端 API 使用 Cloudflare Pages Functions，資料存放於 Google Sheets。

## 執行指令

```bash
# 安裝依賴
npm install

# 本地開發（僅本機）
npm run dev

# 本地開發（開放 LAN 存取）
npm run dev:lan
```

## Secrets 設定

複製範本並填入正式資料：

```bash
cp .dev.vars.example .dev.vars
```

`.dev.vars` 需要三個值：

```
GCP_CLIENT_EMAIL=service-account@project-id.iam.gserviceaccount.com
GCP_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
SPREADSHEET_ID=你的試算表ID
```

Cloudflare 部署後改用 `wrangler secret put` 設定。

## 架構說明

### 前端

- `public/index.html`：捐款人介面
- `public/admin.html`：管理介面

### API（Cloudflare Pages Functions）

- `functions/api/items.js`：取得物資清單
- `functions/api/items/[id].js`：刪除物資
- `functions/api/donate.js`：送出認獻（同步更新 items 數量）
- `functions/api/records.js`：取得認獻紀錄、新增
- `functions/api/records/[id].js`：編輯、刪除認獻紀錄（同步更新 items 數量）

### 資料層（`functions/_shared/sheets.js`）

所有 Google Sheets 存取封裝在 `SheetsClient` 類別，透過 GCP Service Account JWT 認證（用 `crypto.subtle` 在 Workers runtime 簽名，不依賴 Node.js）。

- `makeClient(env)` 建立 client，token 快取 55 分鐘
- `getAll(sheet)` 回傳 row 物件陣列（以第一列為 header）
- `nextId(sheet)` 掃描第一欄取最大 ID + 1
- `findRow(sheet, id)` 掃描第一欄找列號（1-based），用於 update/delete
- `deleteRow(sheet, rowNum)` 用 batchUpdate deleteDimension 刪列

**資料一致性規則**：`已募集 + 剩餘數量 == 所需數量`，donate、編輯、刪除認獻時都需同步更新 items。

## Docker

本地用 Docker 跑（適合 LAN 測試）：

```bash
docker compose up --build -d
```

`docker-compose.yml` 會自動讀取 `.dev.vars`，port 為 `8788`。

原本的 Python/Streamlit 版保留在 `archive/streamlit` branch，其 Dockerfile 備份在 `Dockerfile.streamlit`。

## 部署到 Cloudflare Pages

```bash
npx wrangler pages project create mission-donater  # 首次
npx wrangler pages deploy public
npx wrangler pages secret put GCP_CLIENT_EMAIL
npx wrangler pages secret put GCP_PRIVATE_KEY
npx wrangler pages secret put SPREADSHEET_ID
```
