import os
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
    if not os.path.exists("record.csv"):
        return pd.DataFrame(columns=["姓名", "物資", "數量", "總金額", "短宣隊", "奉獻方式"])
    record = pd.read_csv("record.csv")
    if record.empty:
        return pd.DataFrame(columns=["姓名", "物資", "數量", "總金額", "短宣隊", "奉獻方式"])
    return record

data = load_data()
record = load_record()

tab_overview, tab_manage, tab_record = st.tabs(["總覽", "管理項目", "管理認獻"])

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

with tab_record:
    st.title("認獻紀錄")
    if record.empty:
        st.info("目前沒有可編輯或刪除的認獻紀錄")
    else:
        record.index = range(1, len(record) + 1)
        st.dataframe(record, hide_index=True)

        record_rows = [
            f"{idx}. {row['姓名']} - {row['物資']}（{row['短宣隊']}）x{row['數量']}"
            for idx, row in record.iterrows()
        ]
        selected_row = st.selectbox("選擇認獻紀錄", record_rows)
        selected_index = int(selected_row.split(".", 1)[0])
        selected_record = record.loc[selected_index]

        st.divider()
        st.title("編輯認獻紀錄")
        item_options = [
            f"{name}（{team}）" for name, team in zip(data["名稱"], data["短宣隊"])
        ]
        current_item_label = f"{selected_record['物資']}（{selected_record['短宣隊']}）"
        if current_item_label not in item_options:
            item_options.insert(0, current_item_label)
        edit_name = st.text_input("姓名", value=selected_record["姓名"])
        edit_item_label = st.selectbox(
            "物資（短宣隊）",
            item_options,
            index=item_options.index(current_item_label),
        )
        edit_number = st.number_input("數量", 1, step=1, value=int(selected_record["數量"]))
        edit_payment = st.selectbox(
            "奉獻方式",
            ["現金", "銀行轉帳"],
            index=0 if selected_record["奉獻方式"] == "現金" else 1,
        )
        edit_submitted = st.button("儲存變更", key="edit_record_submit")

        if edit_submitted:
            edit_item, edit_team = edit_item_label.split("（", 1)
            edit_team = edit_team.replace("）", "")
            old_item = selected_record["物資"]
            old_team = selected_record["短宣隊"]
            old_number = int(selected_record["數量"])

            edit_idx = data.index[
                (data["名稱"] == edit_item) & (data["短宣隊"] == edit_team)
            ]
            old_idx = data.index[
                (data["名稱"] == old_item) & (data["短宣隊"] == old_team)
            ]

            if edit_idx.empty or old_idx.empty:
                st.error("錯誤，找不到對應的認獻項目，請先確認項目清單")
            elif not edit_name or edit_number <= 0:
                st.error("錯誤，請檢查姓名或數量")
            else:
                new_data = data.copy()
                old_id = old_idx.item()
                new_id = edit_idx.item()

                new_data.loc[old_id, "已募集"] -= old_number
                new_data.loc[old_id, "剩餘數量"] += old_number
                new_data.loc[new_id, "已募集"] += int(edit_number)
                new_data.loc[new_id, "剩餘數量"] -= int(edit_number)

                affected_ids = {old_id, new_id}
                invalid = False
                for idx in affected_ids:
                    required = new_data.loc[idx, "所需數量"]
                    raised = new_data.loc[idx, "已募集"]
                    remain = new_data.loc[idx, "剩餘數量"]
                    if (
                        raised < 0
                        or remain < 0
                        or raised > required
                        or remain > required
                        or raised + remain != required
                    ):
                        invalid = True
                        break

                if invalid:
                    st.error("錯誤，調整後的數量不合理，請確認數量設定")
                else:
                    new_total = int(new_data.loc[new_id, "單價"]) * int(edit_number)
                    record.loc[selected_index, "姓名"] = edit_name
                    record.loc[selected_index, "物資"] = edit_item
                    record.loc[selected_index, "短宣隊"] = edit_team
                    record.loc[selected_index, "數量"] = int(edit_number)
                    record.loc[selected_index, "總金額"] = new_total
                    record.loc[selected_index, "奉獻方式"] = edit_payment

                    new_data.to_csv("data.csv", index=False)
                    record.to_csv("record.csv", index=False)
                    st.success("已更新認獻紀錄")
                    st.rerun()

        st.divider()
        st.title("刪除認獻紀錄")
        delete_submitted = st.button("刪除這筆紀錄", key="delete_record_submit")
        if delete_submitted:
            old_item = selected_record["物資"]
            old_team = selected_record["短宣隊"]
            old_number = int(selected_record["數量"])
            old_idx = data.index[
                (data["名稱"] == old_item) & (data["短宣隊"] == old_team)
            ]

            if old_idx.empty:
                st.error("錯誤，找不到對應的認獻項目，無法刪除")
            else:
                new_data = data.copy()
                old_id = old_idx.item()
                new_data.loc[old_id, "已募集"] -= old_number
                new_data.loc[old_id, "剩餘數量"] += old_number
                required = new_data.loc[old_id, "所需數量"]
                raised = new_data.loc[old_id, "已募集"]
                remain = new_data.loc[old_id, "剩餘數量"]
                if (
                    raised < 0
                    or remain < 0
                    or raised > required
                    or remain > required
                    or raised + remain != required
                ):
                    st.error("錯誤，調整後的數量不合理，無法刪除")
                else:
                    record.drop(index=selected_index, inplace=True)
                    new_data.to_csv("data.csv", index=False)
                    record.to_csv("record.csv", index=False)
                    st.success("已刪除認獻紀錄")
                    st.rerun()
