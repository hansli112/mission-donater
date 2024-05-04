import os
import streamlit as st
import pandas as pd

st.title("短宣募資")

def load_data():
    data = pd.read_csv("data.csv", index_col=0)
    data.astype({"單價": int, "所需數量": int, "已募集": int, "剩餘數量": int})
    return data

if "is_submit" not in st.session_state:
    st.session_state["is_submit"] = False

item_list = load_data()

name = st.text_input(label='姓名', placeholder='請輸入姓名')
item = st.selectbox("物資", item_list.index)
st.text(f"金額：${item_list.loc[item, '單價']}/個")
st.text(f"剩餘：{item_list.loc[item, '剩餘數量']}個")
st.text(item_list.loc[item, "短宣隊"])

st.divider()

number = st.number_input("數量", 0, item_list.loc[item, "剩餘數量"])
total_money = item_list.loc[item, '單價'] * number
st.text(f"總金額：${total_money}")

if st.button("送出", disabled=st.session_state["is_submit"]):
    if not name or number == 0 or number > item_list.loc[item, "剩餘數量"]:
        st.text("錯誤，請檢查姓名或數量")
    else:
        st.text("已送出，願神大大祝福你所擺上的")
        if not st.session_state["is_submit"]:
            record = pd.DataFrame(data={"姓名": [name], "物資": [item], "數量": [number], "總金額": [total_money]})
            out_path = "record.csv"
            record.to_csv(out_path, mode='a', header=not os.path.exists(out_path), index=False)

            item_list.loc[item, "已募集"] += number
            item_list.loc[item, "剩餘數量"] -= number
            item_list.to_csv("data.csv")

            st.session_state["is_submit"] = True
