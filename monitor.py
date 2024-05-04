import streamlit as st
import pandas as pd

st.title("短宣募資狀況")

data = pd.read_csv("data.csv")
st.dataframe(data, hide_index=True)

st.divider()
st.title("募資清單")
record = pd.read_csv("record.csv")
record.index = range(1, len(record) + 1)
st.dataframe(record, hide_index=True)
