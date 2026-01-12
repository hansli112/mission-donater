import os
import re
import streamlit as st
import pandas as pd

st.set_page_config(page_title="短宣募資", layout="centered")
st.markdown(
    """
    <style>
    [data-testid="stSidebar"], [data-testid="stSidebarNav"] { display: none; }
    </style>
    """,
    unsafe_allow_html=True,
)

st.title("短宣募資")

def load_data():
    data = pd.read_csv("data.csv")
    data.astype({"單價": int, "所需數量": int, "已募集": int, "剩餘數量": int})
    return data

if "is_submit" not in st.session_state:
    st.session_state["is_submit"] = False

item_list = load_data()

# get info
name = st.text_input(label='姓名', placeholder='請輸入姓名')
item_names = [f"{name}（{team}）" for name, team in zip(item_list["名稱"], item_list["短宣隊"])]
item_name = st.selectbox("物資", item_names)
item, team = re.split("（|）", item_name)[:2]
item_id = item_list.index[(item_list["名稱"] == item) & (item_list["短宣隊"] == team)].item()

# show details
st.text(f"金額：${item_list.loc[item_id, '單價']}/份")
st.text(f"剩餘：{item_list.loc[item_id, '剩餘數量']}份")

st.divider()

# input donation
payment = st.selectbox("奉獻方式", ["現金", "銀行轉帳"])
if payment == "銀行轉帳":
    st.caption("請轉至：國泰世華 (013) 127506314089")

number = st.number_input("數量", 0, item_list.loc[item_id, "剩餘數量"])
total_money = item_list.loc[item_id, "單價"] * number
st.text(f"總金額：${total_money}")

if st.button("送出", disabled=st.session_state["is_submit"]):
    if not name or number == 0 or number > item_list.loc[item_id, "剩餘數量"]:
        st.text("錯誤，請檢查姓名或數量")
    else:
        st.text("已送出，願神大大祝福你所擺上的")
        if not st.session_state["is_submit"]:
            # save record
            record = pd.DataFrame(
                    data={"姓名": [name], "物資": [item], "數量": [number], "總金額": [total_money], "短宣隊": [team], "奉獻方式": [payment]}
            )
            out_path = "record.csv"
            record.to_csv(out_path, mode='a', header=not os.path.exists(out_path), index=False)

            # update database
            item_list.loc[item_id, "已募集"] += number
            item_list.loc[item_id, "剩餘數量"] -= number
            item_list.to_csv("data.csv", index=False)

            st.session_state["is_submit"] = True
