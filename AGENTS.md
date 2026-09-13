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

### 兩棵樹

- `site/` 是 **Vercel 現在服務的東西**，也是設計的真相來源（80 個 `.dc.html` 畫板）。
- `app/` 是 React 移植版，本機跑得起來但**還沒上線**。切換的步驟寫在 `README.md` 的 Deploy。
- 要改設計就改 `site/` 的 `.dc.html`，然後重跑 generator；不要直接改 `app/src/pages/*.tsx`。

### 畫面的分工：結構歸 code，樣子歸 design

這是兩件不同的事，各有各的真相來源，不要混在一起：

| | 真相來源 | 意思 |
|---|---|---|
| **畫面怎麼組成**——結構、行為、路由、資料、狀態 | **code**（`app/`） | 手寫的元件、模板、hook 才是實作。不要為了「跟設計稿一致」去改它們的行為。 |
| **畫面長什麼樣**——顏色、字體、間距 | **design**（`app/src/styles/tokens/`） | 值只在 token 檔定義一次，頁面**只能引用名字**。 |

所以：

- 頁面裡**不要出現寫死的 hex**。要用一個顏色，就用 `var(--color-x)`。
- 要加一個新顏色，是去 `src/styles/tokens/colors.css` 命名一行，然後重跑
  `node scripts/convert-pages.mjs`——不是在頁面上寫 hex。轉換器會自己把有名字的
  顏色換成 token，並在結尾列出它叫不出名字的那些。
- **例外**：`<SiteLayout footer={{ cta: "#1E648C" }}>` 必須是字面 hex。
  `Footer.tsx` 會用 `isDark()` 解析它來決定線條要米色還是墨色，`var()` 會讓它
  靜默失效。SVG 的 `fill` / `stroke` 屬性同理，維持現狀。

目前這條規則只有一半成立：**樣子**已經歸 design 了，但**結構**還是從
`site/` 產生的（見下一節）。那是還沒收掉的落差，不是規則的例外。

### Design 丟整包過來的時候：先 handoff:check

設計工具有時候不是改 `site/`，而是另外導出一整棵樹（例如 `New COM/` 底下那包）。
那棵樹**沒有這個 repo 的接線**——寫在 markup 裡、只有 generator 會讀的那些屬性和註解。
導出的人看不到 app，所以不可能帶上它們。直接蓋過 `site/` 的話：

```
npm --prefix app run handoff:check     # 只報告，不寫任何檔案
npm --prefix app run handoff:check -- "路徑"
```

它會點名四件事，順序就是重要性：

| | 意思 |
|---|---|
| **hooks** | 傳入版少掉的接線。`in-component:`、`data-in-form`、`data-value`… 這些不是設計，蓋過去就沒了，而且**每一個都安靜地壞掉**——頁面照樣渲染，表單照樣長得像表單，資料就是進不了 Supabase。 |
| **values** | 表單控制項送的是句子而不是 slug（見下面「表單欄位的值要是穩定 slug」）。 |
| **inventory** | 多了、少了、改名了哪些頁。改名的每一個都是線上網址，要配 redirect。 |
| **detail** | 換行符、叫不出名字的顏色、兩邊都找不到的圖檔。 |

無名顏色是拿**現行 `site/` 的數字**當對照的，因為那 87 個多半不是傳入版造成的；
只有「這裡才新出現」的那幾個才需要處理。

### Design 改了東西之後：用 design-sync，不要直接跑 convert-pages

`convert-pages.mjs` 會把一頁**整個**重產——元件、樣式、路由、文案。當 `site/` 是設計、
React 頁面只是它的輸出時，那是對的工具。但元件一旦有人手動改過，它就會把一次
「文案更新」變成一次沒人要求的元件覆寫。

所以 Design 那邊有新內容時，走這個：

```
npm --prefix app run design:check    # 只報告，不寫任何檔案
npm --prefix app run design:words    # 只收文案，元件原封不動
npm --prefix app run design:apply    # 全收（等同 convert-pages）
```

它會把一次設計改動分成三類：

| 類別 | 意思 | 怎麼辦 |
|---|---|---|
| **words** | 只有句子變了 | 安全，`design:words` 收下 |
| **structure** | 區塊搬了、加了或刪了 | 元件必須跟著改，這是決定不是同步，先看再說 |
| **stale** | 文案變動讓 key 重新編號 | **中文翻譯靜默失效**，它會逐頁點名 |

第三類是這支工具真正的理由。key 是**依位置編號**的（`000_div`、`001_h1`…），所以在
設計裡插一段文字，後面每個 key 都會位移——而 `zh-TW/pages/*.json` 是手寫的、轉換器
故意不覆蓋，於是它繼續回答舊的號碼。**頁面照樣渲染，只是講錯話。** 沒有別的東西會
發現這件事。

注意：`site/` 的 `.dc.html` 是 **CRLF**。用會改寫換行的方式編輯它，會讓整頁看起來
都變了，`design:check` 就會誤報成 structure 變更。

### 不要手改的產物

這些是 `app/scripts/` 生出來的，手改下次重跑就沒了：

- `app/src/pages/*.tsx` 和 `*.css`、`registry.ts`、`route-map.ts`
- `app/src/lib/content/*.ts`、根目錄的 `seed*.sql`
- `ROUTES.md` 的路由表、`CONTENT.md` 的內容對照表

例外：`app/src/i18n/resources/zh-TW/pages/*.json` 是**手寫**的，
`convert-pages.mjs` 只會建空檔不會覆蓋（`HAND_TRANSLATED`）。

### 檢查指令

```
npm --prefix app run typecheck     # tsc --noEmit
npm --prefix app test              # vitest run
npm --prefix app run lint          # oxlint
npm --prefix app run dev           # 本機 Supabase（vite --mode devdb）
npm --prefix app run dev:live      # 打 hosted 專案
```

### git status 的假訊號

倉庫沒有 `.gitattributes`，而 `core.autocrlf=true`，所以 `git status` 會長期
顯示一批「已修改」但其實只有換行符不同的檔案（目前約 55 個）。
**`git diff` 才是真相**——`git diff --name-only` 沒列到的就是沒有實質改動。
統計實際改了什麼用 `git diff --stat`，不要數 `git status` 的行數。

### 表單欄位的值要是穩定 slug

`site/` 的表單 `<option>` 一定要寫 `value="some-slug"`，不能讓瀏覽器拿顯示文字
當值——三個語言版本的同一個選項必須送出同一個字串，否則審稿台會把同一種詢問
分進三個桶。`data-prefill` 和 `data-hide-when` 都用 `field=value` 的寫法，
理由同上：規則裡不要出現任何會被翻譯改掉的句子。
