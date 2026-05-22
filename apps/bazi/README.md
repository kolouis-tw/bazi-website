# 八字排盤子專案

這是 `louisko.com` 的八字排盤子專案。正式入口為：

```text
https://louisko.com/apps/bazi/
```

根目錄 `bazi.html` 只作為舊網址相容入口，會導向本子專案。

## 主要檔案

- `index.html`: 八字排盤主頁與核心程式。
- `docs_algorithm.md`: 演算法說明。
- `docs_overview.md`: 功能總覽。
- `SMOKE_TEST.md`: 基本測試清單。
- `docs/regression_cases.md`: 回歸案例。
- `changelog/`: 版本紀錄。
- `examples/`: 範例資料。

## 維護規則

不要從 DOM 畫面文字反抓八字資料。畫面文字可能含有 `span`、換行、顏色標籤或格式化內容，容易造成資料錯誤。

若修改八字頁、排盤邏輯、大運、流年、流月、神煞、AI payload、測試或文件，務必同步檢查並視需要連動更新：

- `01_Louisko_Website_目前站台/Louisko_Website`
- `02_louisko.com_未來開發專案/louisko.com_未來開發專案`
- `03_bazi-engine-ts/bazi-engine-ts`

若只更新其中一處，需記錄或說明沒有同步其他處的原因。

正確方式：

```js
chart.year.pillar
chart.month.pillar
chart.day.pillar
chart.hour.pillar
```

修改排盤、流年、大運、六柱或十神邏輯後，至少確認：

```text
2024/03/10 00:20 => 甲辰 丁卯 癸酉 壬子
1974/10/03 04:00 女命 2026流年 => 六柱大運需為戊辰
```
