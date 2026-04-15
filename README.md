# Mission Donater

一個短宣募資與認獻管理小工具，目前前端為靜態頁面，後端 API 使用 Cloudflare Pages Functions。

## JS 版本開發與 LAN 存取

先準備本地 secrets：

```bash
cp .dev.vars.example .dev.vars
```

把 `.dev.vars` 裡的三個值換成正式資料：
- `GCP_CLIENT_EMAIL`
- `GCP_PRIVATE_KEY`
- `SPREADSHEET_ID`

## Docker 啟動

這是現在最適合你的入口。LAN 測試跟之後推到雲端用的是同一個容器。

這不會改掉 Cloudflare Pages 的專案格式；`public/`、`functions/`、`wrangler.toml` 仍然照原本方式保留，直接推到 Cloudflare Pages 仍可用。

```bash
cp .dev.vars.example .dev.vars
docker compose up --build -d
```

連線位址：

```bash
http://<你的電腦區網 IP>:8788
```

常用指令：

```bash
docker compose logs -f
docker compose down
```

如果你要自己 build / push image：

```bash
docker build -t mission-donater:js .
```

目前 repo 根目錄的 `Dockerfile` 是 JS 版；原本的 Python/Streamlit 容器保留在 `Dockerfile.streamlit`。

## 本機直接跑

安裝依賴並啟動：

```bash
npm install
npm run dev:lan
```

這個指令會用本地 Node dev server 直接載入 `public/` 與 `functions/api/`，不依賴 Cloudflare `workerd`。

預設會監聽 `0.0.0.0:8788`，同一個 LAN 的其他裝置可用這個格式連入：

```bash
http://<你的電腦區網 IP>:8788
```

若只想在本機測試：

```bash
npm run dev
```

若你的環境能正常跑 Cloudflare 本地 runtime，也保留了原本的指令：

```bash
npm run dev:cf
npm run dev:cf:lan
```

若其他裝置無法連線，請確認主機防火牆有放行 TCP `8788`。

## 功能摘要
- 捐款人可選擇物資、填寫姓名與數量並送出奉獻紀錄。
- 自動計算金額與剩餘數量，並生成收據樣式的完成畫面。
- 管理者可新增/刪除項目、檢視/編輯/刪除認獻紀錄。

## 專案結構
- `public/index.html`: 一般奉獻頁。
- `public/admin.html`: 管理頁面。
- `functions/api/*`: Cloudflare Pages Functions API。
- `functions/_shared/sheets.js`: Google Sheets 存取封裝。
- `app.py`: 主要捐款人介面。
- `pages/admin.py`: 管理介面（Streamlit 多頁面）。
- `data.csv`: 物資清單與數量狀態。
- `record.csv`: 送出的奉獻紀錄。
- `pyproject.toml` / `uv.lock`: Python 依賴設定。

## Python 版本開發與執行
使用 `uv` 管理依賴（建議）。

```bash
uv sync
uv run streamlit run app.py
```

若需要固定埠號：
```bash
uv run streamlit run app.py --server.port 8501
```

## 資料說明
- `data.csv` 欄位需包含：`名稱`, `短宣隊`, `單價`, `所需數量`, `已募集`, `剩餘數量`
- `record.csv` 欄位包含：`姓名`, `物資`, `數量`, `總金額`, `短宣隊`, `奉獻方式`
- 調整庫存時請確保 `已募集 + 剩餘數量 == 所需數量`

## 注意事項
- `data.csv` 與 `record.csv` 為狀態資料，請避免覆蓋正式資料。
- UI 文字目前以中文為主，若需多語系建議集中管理字串。
