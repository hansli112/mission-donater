import os
import re
import streamlit as st
import pandas as pd

st.set_page_config(page_title="短宣募資", layout="centered")
st.markdown(
    """
    <style>
    [data-testid="stSidebar"], [data-testid="stSidebarNav"] { display: none; }
    .receipt {
        border: 2px dashed #2f6f4e;
        background: #f6fffb;
        padding: 16px 18px;
        border-radius: 12px;
        box-shadow: 0 6px 18px rgba(47, 111, 78, 0.15);
        margin-top: 16px;
    }
    .receipt h3 {
        margin: 0 0 8px 0;
        font-size: 20px;
        color: #1e4d35;
    }
    .receipt .row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 6px 0;
        border-bottom: 1px dashed rgba(47, 111, 78, 0.25);
    }
    .receipt .row:last-child {
        border-bottom: none;
        padding-bottom: 0;
    }
    .receipt .label {
        color: #2f6f4e;
        font-weight: 600;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

st.title("短宣募資")

def load_data():
    data = pd.read_csv("data.csv")
    data.astype({"單價": int, "所需數量": int, "已募集": int, "剩餘數量": int})
    return data

if "receipt" not in st.session_state:
    st.session_state["receipt"] = None
if "error" not in st.session_state:
    st.session_state["error"] = None


def submit_donation():
    item_list = load_data()
    if item_list.empty:
        st.session_state["error"] = "目前沒有可選的認獻項目"
        return
    item_name = st.session_state.get("item_name", "")
    name = st.session_state.get("name", "")
    payment = st.session_state.get("payment", "現金")
    number = st.session_state.get("number", 0)

    if not item_name:
        st.session_state["error"] = "錯誤，請選擇物資"
        return

    item, team = re.split("（|）", item_name)[:2]
    item_id = item_list.index[(item_list["名稱"] == item) & (item_list["短宣隊"] == team)].item()

    if not name or number == 0 or number > item_list.loc[item_id, "剩餘數量"]:
        st.session_state["error"] = "錯誤，請檢查姓名或數量"
        return

    total_money = item_list.loc[item_id, "單價"] * number

    record = pd.DataFrame(
        data={
            "姓名": [name],
            "物資": [item],
            "數量": [number],
            "總金額": [total_money],
            "短宣隊": [team],
            "奉獻方式": [payment],
        }
    )
    out_path = "record.csv"
    record.to_csv(out_path, mode="a", header=not os.path.exists(out_path), index=False)

    item_list.loc[item_id, "已募集"] += number
    item_list.loc[item_id, "剩餘數量"] -= number
    item_list.to_csv("data.csv", index=False)

    st.session_state["receipt"] = {
        "姓名": name,
        "物資": item,
        "短宣隊": team,
        "數量": number,
        "總金額": total_money,
        "奉獻方式": payment,
    }
    st.session_state["error"] = None
    st.session_state["name"] = ""
    st.session_state["number"] = 0
    st.session_state["payment"] = "現金"

item_list = load_data()
if item_list.empty:
    st.warning("目前沒有可選的認獻項目")
    st.stop()

# get info
name = st.text_input(label="姓名", placeholder="請輸入姓名", key="name")
item_names = [f"{name}（{team}）" for name, team in zip(item_list["名稱"], item_list["短宣隊"])]
if "item_name" not in st.session_state or st.session_state["item_name"] not in item_names:
    st.session_state["item_name"] = item_names[0]
item_name = st.selectbox("物資", item_names, key="item_name")
item, team = re.split("（|）", item_name)[:2]
item_id = item_list.index[(item_list["名稱"] == item) & (item_list["短宣隊"] == team)].item()

st.text(f"金額：${item_list.loc[item_id, '單價']}/份")
st.text(f"剩餘：{item_list.loc[item_id, '剩餘數量']}份")

st.divider()

payment = st.selectbox("奉獻方式", ["現金", "銀行轉帳"], key="payment")
if payment == "銀行轉帳":
    st.caption("請轉至：國泰世華 (013) 127506314089")

number = st.number_input("數量", 0, item_list.loc[item_id, "剩餘數量"], key="number")
total_money = item_list.loc[item_id, "單價"] * number
st.text(f"總金額：${total_money}")

st.button("送出", on_click=submit_donation)

if st.session_state["error"]:
    st.error(st.session_state["error"])

if st.session_state["receipt"]:
    receipt = st.session_state["receipt"]
    st.markdown(
        f"""
        <div class="receipt">
            <h3>成功送出</h3>
            <div class="row"><span class="label">姓名</span><span>{receipt["姓名"]}</span></div>
            <div class="row"><span class="label">物資</span><span>{receipt["物資"]}（{receipt["短宣隊"]}）</span></div>
            <div class="row"><span class="label">數量</span><span>{receipt["數量"]}</span></div>
            <div class="row"><span class="label">奉獻方式</span><span>{receipt["奉獻方式"]}</span></div>
            <div class="row"><span class="label">總金額</span><span>${receipt["總金額"]}</span></div>
        </div>
        """,
        unsafe_allow_html=True,
    )
