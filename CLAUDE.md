# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概述

「Mission Donater」是一個 Streamlit 短宣認獻管理工具，資料存放於 Supabase。

## 執行指令

```bash
# 安裝依賴
uv sync

# 啟動開發伺服器（預設 port 8501）
uv run streamlit run app.py

# 指定 port
uv run streamlit run app.py --server.port 8501
```

## 架構說明

### 頁面

- `app.py`：捐款人介面。讓使用者選擇物資、填寫姓名與數量，送出後顯示收據。
- `pages/admin.py`：管理介面（Streamlit 多頁面路由自動識別）。提供三個 tab：總覽、管理項目（新增/刪除）、管理認獻（編輯/刪除紀錄）。

### 資料層

使用 Supabase 作為後端資料庫，需在 `.streamlit/secrets.toml` 設定：

```toml
SUPABASE_URL = "..."
SUPABASE_KEY = "..."
```

兩張資料表：
- `items`：欄位 `id, 名稱, 短宣隊, 單價, 所需數量, 已募集, 剩餘數量`
- `records`：欄位 `id, 姓名, 物資, 數量, 總金額, 短宣隊, 奉獻方式`

**資料一致性規則**：`已募集 + 剩餘數量 == 所需數量`，任何編輯或刪除認獻紀錄時都需同步更新 `items` 表。

### 關鍵邏輯

- `get_supabase()` 使用 `@st.cache_resource` 快取，避免重複建立連線。
- 物資選擇格式為 `名稱（短宣隊）`，以 `re.split("（|）", ...)` 解析。
- 送出認獻後同步更新 `items.已募集` 與 `items.剩餘數量`。
- 編輯認獻紀錄時，若物資改變，需同時回退舊項目數量並累加新項目數量，並在寫入 DB 前驗證數量合理性。

## Docker

Dockerfile 以 `arm32v7/python:3.11` 為基底（針對 ARM 32-bit 裝置），並從原始碼編譯 Apache Arrow（因 arm32 無預編譯 wheel）。

```bash
# 使用 docker-compose 執行（需掛載 secrets）
docker compose up
```

映像發布於 `hansli112/mission-donater`。
