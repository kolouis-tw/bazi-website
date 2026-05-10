# 四柱八字十神排盤系統｜FINAL Agent 工程包

本資料夾是可交給 Codex / Cursor / Claude Code / Gemini Code Assist / 其他 AI Agent 接手的完整工程化版本。

## 入口檔案

```text
index.html
```

直接用瀏覽器開啟即可，不需要伺服器、不需要資料庫。

## 本版核心狀態

目前主程式採用：

```text
四柱八字十神排盤系統_大運同步年度修正版.html
```

作為 `index.html`。

## 目前功能

- 四柱排盤
- 十神分析
- 地支本氣與藏干
- 旺衰分析
- 透干、通根
- 合沖刑害
- 三會局、三合局、半合局
- 六柱十二字整合分析
- 流年自動切換對應大運
- 九步大運
- 大運年齡區間
- 流年查詢
- AI 分析 Markdown 提示詞下載
- A4 PDF 列印優化

## 工程化檔案結構

```text
index.html
README.md
agent_notes.md
docs_algorithm.md
docs_overview.md
SMOKE_TEST.md
PACKAGE_TREE.txt
manifest.json
changelog/
examples/
docs/regression_cases.md
```

## 最重要的維護原則

不要從 DOM 畫面文字反抓八字資料。

正確方式：

```js
chart.year.pillar
chart.month.pillar
chart.day.pillar
chart.hour.pillar
```

錯誤方式：

```js
document.getElementById("dayPillar").innerText
```

因為畫面文字可能含有 span、換行、顏色標籤，會造成 undefined 或統計歸零。
