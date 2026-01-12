import streamlit as st
import pandas as pd

st.set_page_config(page_title="短宣認獻管理", layout="centered")
st.markdown(
    """
    <style>
    [data-testid="stSidebar"], [data-testid="stSidebarNav"] { display: none; }
    </style>
    """,
    unsafe_allow_html=True,
)

st.title("短宣認獻管理")

if "add_item_name" not in st.session_state:
    st.session_state["add_item_name"] = ""
if "add_team" not in st.session_state:
    st.session_state["add_team"] = ""
if "add_price" not in st.session_state:
    st.session_state["add_price"] = 0
if "add_required" not in st.session_state:
    st.session_state["add_required"] = 1
if st.session_state.get("clear_add_inputs"):
    st.session_state["add_item_name"] = ""
    st.session_state["add_team"] = ""
    st.session_state["add_price"] = 0
    st.session_state["add_required"] = 1
    st.session_state["clear_add_inputs"] = False

def load_data():
    data = pd.read_csv("data.csv")
    data.astype({"單價": int, "所需數量": int, "已募集": int, "剩餘數量": int})
    return data

def load_record():
    record = pd.read_csv("record.csv")
    if record.empty:
        return pd.DataFrame(columns=["姓名", "物資", "數量", "總金額", "短宣隊", "奉獻方式"])
    return record

data = load_data()
record = load_record()

tab_overview, tab_manage = st.tabs(["總覽", "管理項目"])

with tab_overview:
    st.dataframe(data, hide_index=True)

    st.divider()
    st.title("認獻清單")
    record.index = range(1, len(record) + 1)
    st.dataframe(record, hide_index=True)

with tab_manage:
    st.title("項目清單")
    st.dataframe(data, hide_index=True)

    st.divider()
    st.title("新增項目")
    item_name = st.text_input(label="物資名稱", placeholder="例如：孩子禮物", key="add_item_name")
    team = st.text_input(label="短宣隊", placeholder="例如：肯亞短宣", key="add_team")
    price = st.number_input("單價", 0, step=1, key="add_price")
    required = st.number_input("所需數量", 1, step=1, key="add_required")
    submitted = st.button("新增", key="add_submit")

    if submitted:
        exists = (data["名稱"] == item_name) & (data["短宣隊"] == team)
        if not item_name or not team or price <= 0 or required <= 0:
            st.error("錯誤，請檢查名稱、短宣隊、單價或所需數量")
        elif exists.any():
            st.error("已存在相同物資與短宣隊的項目")
        else:
            new_row = pd.DataFrame(
                data={
                    "名稱": [item_name],
                    "短宣隊": [team],
                    "單價": [int(price)],
                    "所需數量": [int(required)],
                    "已募集": [0],
                    "剩餘數量": [int(required)],
                }
            )
            data = pd.concat([data, new_row], ignore_index=True)
            data.to_csv("data.csv", index=False)
            st.success("已新增認獻項目")
            st.session_state["clear_add_inputs"] = True
            st.rerun()

    st.title("刪除項目")
    if data.empty:
        st.info("目前沒有可刪除的認獻項目")
    else:
        item_names = [f"{name}（{team}）" for name, team in zip(data["名稱"], data["短宣隊"])]
        delete_name = st.selectbox("選擇項目", item_names)
        delete_item, delete_team = delete_name.split("（", 1)
        delete_team = delete_team.replace("）", "")
        delete_id = data.index[
            (data["名稱"] == delete_item) & (data["短宣隊"] == delete_team)
        ].item()
        st.caption(
            f"所需：{data.loc[delete_id, '所需數量']}，已募集：{data.loc[delete_id, '已募集']}，剩餘：{data.loc[delete_id, '剩餘數量']}"
        )
        if st.button("刪除"):
            data.drop(index=delete_id, inplace=True)
            data.to_csv("data.csv", index=False)
            st.success("已刪除認獻項目")
            st.rerun()
