-- Traditional Chinese for the two tables the Chinese pages actually read.
--
-- 20260828120000 added the `_ko` columns and 20260901090000 added the `_zh_tw`
-- ones. Neither backfilled anything, and for Chinese nothing ever did: the
-- register under site/data is written in English and Korean, so `seed.sql` has
-- no Chinese to carry and never will. That left /zh-tw serving Chinese chrome
-- around English rows — the page headings translated, the cards inside them not.
--
-- This fills the two tables the translated pages read: `news`, which the home
-- page and /news render, and `workshops`, which the /zh-tw/workshop index
-- renders. The other four content tables — projects, communities,
-- constellation_points, collectives — are left alone on purpose: the pages that
-- read them have no Chinese page copy yet either, so translating their rows
-- would produce a card in Chinese sitting inside a section in English, which
-- reads worse than a page that is honestly still English.
--
-- **Every column is filled with coalesce, so this only ever writes into a null.**
-- Supabase is where translations are edited — the same rule `seed.sql` states
-- for Korean — and a migration that overwrote an editor's Chinese would be a
-- worse bug than the gap it closes. Re-running it changes nothing.
--
-- `workshops.title_zh_tw` is deliberately NOT set. The workshop names are IN's
-- own — Möbius Making, Pathfinder, Metanoia — and Korean has names for them
-- because IN wrote them. Nobody has written the Chinese ones, and inventing
-- them here would publish a product name that no one chose. Left null, `inLang`
-- falls back to the English title, which is the honest answer until IN names
-- them. `audience_zh_tw` is safe by contrast: `audience` stays the grouping key
-- the filter matches on, and the translated column is only the chip's label.

-- ========== news ==========
update public.news as n set
  kind_zh_tw    = coalesce(n.kind_zh_tw,    t.kind),
  eyebrow_zh_tw = coalesce(n.eyebrow_zh_tw, t.eyebrow),
  title_zh_tw   = coalesce(n.title_zh_tw,   t.title),
  body_zh_tw    = coalesce(n.body_zh_tw,    t.body)
from (values
  ('COMM/NEWS/up-jungle-jam', '即將登場', '韓國首爾', 'JUNGLE JAM · 秋季場',
   '兩天的節奏、即興與共同創作。歡迎參加過 ME=WE 場次的人，也歡迎還沒參加過的人。'),
  ('COMM/NEWS/1', '消息', '網絡 · 成長中', 'BridgeBuilder 網絡',
   '一個不斷長大的青年網絡，在自己的社區裡搭起一座座小橋。'),
  ('COMM/NEWS/2', '消息', '線上 · 每兩個月', 'BridgeBuilder 線上實驗室',
   '跨國的 BridgeBuilder 每兩個月在線上聚一次，分享各自正在發現的東西。'),
  ('COMM/NEWS/up-open-studio', 'Open Studio', '線上 · 每月', 'Open Studio 每月回歸',
   '每個月的第一個星期一，工作室的門會開著。進來坐坐，帶一個問題來，帶一個實踐走。'),
  ('STORY/1', null, '故事 · 歌', '「或許我們早就已經連在一起了。」',
   '一位參與者從 ME=WE Core 場次帶出來的回想。'),
  ('COMM/NEWS/mile-collective-nepal', '里程碑', '尼泊爾辛杜利', '尼泊爾出現新的 IN-Collective',
   'StoryCycle 成為工作室的第五個 IN-Collective，用他們自己的語言，把 ME=WE 帶進村莊的說故事圈。'),
  ('COMM/NEWS/3', '消息', '尼泊爾辛杜利', '辛杜利說故事節',
   '由 Saurav Dhakal 帶領的 StoryCycle 團隊，正在籌備一場慶祝辛杜利村民間故事的節慶，把長輩和青年接在一起。'),
  ('STORY/2', null, '故事 · 畫', '兩隻手，一條線',
   '一幅在 Möbius Making 裡畫下的圖——ME 與 WE 的兩個面在那裡成了同一個面。'),
  ('COMM/NEWS/4', '消息', '日本山口', '山口家庭節',
   '山口市一個以家庭為核心的社群，用音樂和歌聲照顧孩子的心靈——一起學習、一起練習、一起慶祝生活。'),
  ('COMM/NEWS/recap-pathfinder-uae', '回顧', '阿聯阿布達比', '與 60 位青年領袖的 Pathfinder',
   '三天，走在 ME 與 WE 之間那條線上。參與者帶走了一張自己畫的地圖——還有彼此的電話。'),
  ('COMM/NEWS/launch-constellation', '上線', '工作室', 'Constellation 上線了',
   '每一場聚會、每一個故事、每一個集體，都在同一張不斷長大的地圖上。加上一個點，然後看著那些線來找你。'),
  ('PROJ/1', null, '阿聯扎耶德大學', 'Food Revolution',
   'KULNA 社區花園——一個從課堂實驗開始的社會實驗室，一起種食物，也一起分食物。'),
  ('COMM/NEWS/5', '消息', '中國北京', 'Junior Youth Space',
   '來自許多國家的年輕人聚在一起，認真談論品格與社群的安好，並自己設計社區服務專案——一種不要求彼此相同的歸屬模型。'),
  ('COMM/NEWS/press-fuller', '報導', '紙本 · 專訪', '「獨自傾斜，一起轉動」',
   '一場很長的對話：為什麼這間工作室做的是實踐而不是方案，以及一條莫比烏斯帶和歸屬感有什麼關係。'),
  ('COMM/NEWS/ws-mobius-chinese', '工作坊', '台灣台中', 'Möbius Making，現在有中文了',
   '這場手作的內容已完整翻譯，並和高中生與老師一起試過。引導者手冊今年秋天跟上。'),
  ('COMM/NEWS/6', '消息', '台灣台中', '草屯的 Animators',
   'Junior Youth 的 animators 正在成為草屯校園與社區裡的日常風景，而 Möbius Making 也以中文帶給了高中生與老師——實踐會跨過語言旅行。'),
  ('COMM/NEWS/proj-asia-exchange', '專案', '北京 · 台中 · 山口', 'Asia Exchange 進入第二年',
   '三座城市，一個輪流被問的問題。第二輪多了一本跟著這群人走的共筆手記。'),
  ('COMM/NEWS/kin-storycycle', '同行者', '尼泊爾加德滿都', '與 StoryCycle 同行',
   '一個我們持續向它學習的相近實踐：用人們談論自己喝的水時說的故事，去描繪一整個國家。')
) as t(id, kind, eyebrow, title, body)
where n.id = t.id;

-- ========== workshops ==========
-- title_zh_tw absent by design — see the header.
update public.workshops as w set
  eyebrow_zh_tw  = coalesce(w.eyebrow_zh_tw,  t.eyebrow),
  blurb_zh_tw    = coalesce(w.blurb_zh_tw,    t.blurb),
  audience_zh_tw = coalesce(w.audience_zh_tw, t.audience),
  duration_zh_tw = coalesce(w.duration_zh_tw, t.duration),
  cta_zh_tw      = coalesce(w.cta_zh_tw,      t.cta)
from (values
  ('mobius-making', '代表性的那一場工作坊 · 對所有人',
   '最基礎的一場工作坊——第一次把 ME=WE 當成活出來的東西，而不只是被解釋的東西。核心 3 小時；可以延長成半天或一整天，也有後續場次的整套方案。',
   '對所有人', '3 小時 · 可延長', '認識它'),
  ('pathfinder', '引導者培訓',
   '準備好為別人撐開一個空間了嗎？從裡面學會 ME=WE 工作坊，然後把它帶進你自己的脈絡裡。',
   '對所有人', null, '認識它'),
  ('metanoia', '組織 · 1–4 天',
   '從內部開始的改變。為那些內在狀態會形塑一個社群的人設計的四天密集課程——教育者、主管，以及任何為別人撐開空間的人。',
   '組織', null, '認識它'),
  ('jungle-jam', '青年 · 合宿',
   '離開日常，遇見自己。為年輕人設計的合宿聚會——創造力、冒險，以及誠實的省思。',
   '青年', null, '認識它'),
  ('two-wings', '給父母',
   '給父母、伴侶與家庭——一個在家裡練習 ME=WE 的空間，也可以調整到整個社區的尺度。',
   '父母', null, '報名'),
  ('heros-journey', '對所有人',
   '一段有人帶著走的旅程，跨過屬於自己的那道門檻，用 ME=WE 航行過改變。',
   '對所有人', null, '報名'),
  ('second-life', 'Junior Youth 與青年',
   '自我照顧的基本功——運動、睡眠、飲食、靜心。與 Taejin Kim 及 Vahid Buehrer 共同創作。',
   '青年', null, '報名'),
  ('shadow-shifter', '青年 · 合宿',
   '我們可以怎麼成為主角？兩天，九個動手做的挑戰——由台灣的年輕人自己設計、共同帶領。',
   '青年', null, '認識它'),
  ('bucket-list', '對所有人 · 半天',
   '把「我是誰」弄清楚，然後行動——為自己，也為別人。與 Hojin Choi 共同創作。',
   '對所有人', null, '認識它'),
  ('light-shadow-shift', '女性',
   '一個專屬於女性的空間，退後一步、重新連結，一起練習 ME=WE。完整內容即將公布。',
   '女性', null, '報名')
) as t(slug, eyebrow, blurb, audience, duration, cta)
where w.slug = t.slug;
