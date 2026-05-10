# Agent 接手注意事項

## 使用者目前最重視

1. 功能不要因為 UI 調整而壞掉。
2. 四柱必須由左至右：年、月、日、時。
3. 每柱必須天干在上、地支在下。
4. 五行顏色固定：木綠、火紅、土棕、金灰、水藍。
5. 十神分析不可全部歸零。
6. 地支藏干不可出現 undefined。
7. 大運必須九步，且包含西元年月與年齡。
8. 六柱十二字整合分析的大運必須與大運試算同步。
9. 流年變更時，對應大運也必須同步切換。
10. AI 分析 Markdown 下載功能不可壞。

## 最容易回歸的 Bug

### Bug 1：DOM 反抓造成 undefined

不要從畫面讀干支。請從 `chart` 物件讀。

### Bug 2：六柱整合大運不同步

六柱十二字整合分析不能固定用「現在的大運」。

指定流年改變時：

```text
指定流年 → 判斷該年度主要對應大運 → 與原局、流年合併分析
```

目前採用年度中段判定，讓六柱整合頁與大運試算的年度顯示同步。

### Bug 3：修改 updateLuckOnly 時破壞 buildPromptMarkdown

之前曾因函式替換錯誤，把 `buildPromptMarkdown()` 的函式頭蓋掉，造成整頁 JavaScript 死掉。

修改前後請務必跑：

```bash
node --check extracted_script.js
```

## 建議下一步工程化

目前仍是單檔 HTML。建議未來拆分為：

```text
src/
  bazi-core.js
  luck-cycle.js
  ten-god.js
  combinations.js
  markdown-export.js
  render-ui.js
styles.css
index.html
```
