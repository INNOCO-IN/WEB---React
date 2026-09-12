# AGENTS.md

給 AI 助手（Claude Code 等）的專案約定。**這個檔案可以直接手動編輯**，它是唯一的真相來源；
`.claude/hooks/inject-rules.mjs` 會在你每次送出訊息時重新注入它，所以改完下一則訊息就生效。

## 回覆語言

- 用**繁體中文（台灣用語，zh-TW）**回覆我，包括說明、總結、提問和回報結果。
- 我用英文提問時也一樣用繁體中文回覆。
- 只有在我明確說 "reply in English" 或「用英文」時才切換。

不受影響的部分（維持現狀，仍然是英文）：

- 程式碼、變數名稱、型別名稱、檔案名稱
- 程式碼註解、commit message、PR 標題和內文
- 網站本身的文案 —— 站台是 **EN / KO / zh-TW 三語**（i18next，`app/src/i18n/resources/`）。
  站台有 zh-TW 這件事和「你用什麼語言回覆我」完全無關，不要因為這條規則去改任何頁面文案。

## Shell：Windows PowerShell 5.1

- **不要用 `&&`，也不要用 `||`** —— 這裡是 Windows PowerShell 5.1，這兩個運算子都會噴語法錯誤。
  - 連續執行：`指令A; 指令B`
  - 前一個成功才執行：`指令A; if ($?) { 指令B }`
- 同理沒有 `?:`、`??`、`?.` 這些運算子。
- Supabase CLI 不要 `cd`，改用 `--workdir`：`npx supabase db push --workdir app`
  （專案設定在 `app/supabase/`）。

## 專案約定

（這一節留給你以後自己加規則，例如建置指令、程式碼風格、不要碰的目錄等。）
