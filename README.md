# Mission Donater

一個使用 Streamlit 製作的短宣募資與認獻管理小工具，包含一般奉獻頁與管理頁面。

## 功能摘要
- 捐款人可選擇物資、填寫姓名與數量並送出奉獻紀錄。
- 自動計算金額與剩餘數量，並生成收據樣式的完成畫面。
- 管理者可新增/刪除項目、檢視/編輯/刪除認獻紀錄。

## 專案結構
- `app.py`: 主要捐款人介面。
- `pages/admin.py`: 管理介面（Streamlit 多頁面）。
- `data.csv`: 物資清單與數量狀態。
- `record.csv`: 送出的奉獻紀錄。
- `pyproject.toml` / `uv.lock`: Python 依賴設定。

## 開發與執行
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
