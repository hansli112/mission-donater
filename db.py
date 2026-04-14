import streamlit as st
import pandas as pd
import gspread

ITEMS_COLS = ["id", "名稱", "短宣隊", "單價", "所需數量", "已募集", "剩餘數量"]
RECORDS_COLS = ["id", "姓名", "物資", "數量", "總金額", "短宣隊", "奉獻方式"]


@st.cache_resource(ttl=600)
def _get_spreadsheet() -> gspread.Spreadsheet:
    gc = gspread.service_account_from_dict(
        dict(st.secrets["gcp_service_account"]),
        scopes=["https://www.googleapis.com/auth/spreadsheets"],
    )
    return gc.open_by_key(st.secrets["SPREADSHEET_ID"])


def _ws(sheet_name: str) -> gspread.Worksheet:
    return _get_spreadsheet().worksheet(sheet_name)


def _next_id(ws: gspread.Worksheet) -> int:
    ids = ws.col_values(1)[1:]  # skip header row
    return max((int(v) for v in ids if v), default=0) + 1


def _find_row(ws: gspread.Worksheet, id_value: int) -> int:
    col = ws.col_values(1)
    for i, val in enumerate(col):
        if val == str(id_value):
            return i + 1
    raise ValueError(f"ID {id_value} not found")


def load_items() -> pd.DataFrame:
    rows = _ws("items").get_all_records()
    if not rows:
        return pd.DataFrame(columns=ITEMS_COLS)
    df = pd.DataFrame(rows)[ITEMS_COLS]
    for col in ["id", "單價", "所需數量", "已募集", "剩餘數量"]:
        df[col] = pd.to_numeric(df[col])
    return df.sort_values("id").reset_index(drop=True)


def load_records() -> pd.DataFrame:
    rows = _ws("records").get_all_records()
    if not rows:
        return pd.DataFrame(columns=RECORDS_COLS)
    df = pd.DataFrame(rows)[RECORDS_COLS]
    for col in ["id", "數量", "總金額"]:
        df[col] = pd.to_numeric(df[col])
    return df.sort_values("id").reset_index(drop=True)


def insert_item(名稱: str, 短宣隊: str, 單價: int, 所需數量: int) -> None:
    ws = _ws("items")
    ws.append_row([_next_id(ws), 名稱, 短宣隊, 單價, 所需數量, 0, 所需數量])


def delete_item(item_id: int) -> None:
    ws = _ws("items")
    ws.delete_rows(_find_row(ws, item_id))


def update_item_counts(item_id: int, 已募集: int, 剩餘數量: int) -> None:
    ws = _ws("items")
    row = _find_row(ws, item_id)
    ws.batch_update([{"range": f"F{row}:G{row}", "values": [[已募集, 剩餘數量]]}])


def insert_record(姓名: str, 物資: str, 數量: int, 總金額: int, 短宣隊: str, 奉獻方式: str) -> None:
    ws = _ws("records")
    ws.append_row([_next_id(ws), 姓名, 物資, 數量, 總金額, 短宣隊, 奉獻方式])


def update_record(record_id: int, 姓名: str, 物資: str, 數量: int, 總金額: int, 短宣隊: str, 奉獻方式: str) -> None:
    ws = _ws("records")
    row = _find_row(ws, record_id)
    ws.batch_update([{"range": f"B{row}:G{row}", "values": [[姓名, 物資, 數量, 總金額, 短宣隊, 奉獻方式]]}])


def delete_record(record_id: int) -> None:
    ws = _ws("records")
    ws.delete_rows(_find_row(ws, record_id))
