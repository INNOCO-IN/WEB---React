-- Copied verbatim from the repo root. The file(s) named below are the source
-- of truth: edit those, then add a new migration rather than editing this one,
-- which has already been applied to the linked project.
-- Source: schema.sql (sections 5c, 5d), seed.sql (projects, communities)

-- The last three walls the site drew from its own markup now read a table: the
-- project index, the All projects rail, and the community directory. That took
-- two kinds of change here, and deliberately no third.
--
--   Columns.  `projects.featured` marks the one project the index gives its own
--             block to, so the wall below can leave it out. `communities.meta`
--             is the line that says where a circle stands, which is what the
--             directory lists. The `_ko` columns hold the Korean copy that used
--             to live in the KO pages' markup — without them, /ko/project
--             would have started rendering English.
--
--   Rows.     projects goes from 8 to 13: five project pages existed with no row
--             in the register, so no rail anywhere listed them and the index
--             could not show them. communities goes from 7 to 9: two circles
--             point at the project that created them rather than at a community
--             page, and the extractor had been dropping exactly those.
--
--   Not realtime. Both tables already carry `replica identity full` and sit in
--             the supabase_realtime publication, and adding a column changes
--             neither — so the pages reading them stay live across this.

-- ---------- projects ----------
alter table public.projects add column if not exists featured boolean not null default false;
alter table public.projects add column if not exists title_ko   text;
alter table public.projects add column if not exists eyebrow_ko text;
alter table public.projects add column if not exists body_ko    text;

-- ---------- communities ----------
alter table public.communities add column if not exists meta text;
alter table public.communities add column if not exists title_ko   text;
alter table public.communities add column if not exists meta_ko    text;
alter table public.communities add column if not exists eyebrow_ko text;
alter table public.communities add column if not exists body_ko    text;

-- ========== projects ==========
insert into public.projects
  (slug, title, title_ko, meta, eyebrow, eyebrow_ko, body, body_ko, image, accent, route, started_on, featured, sort_order, status)
values
  ('asia-exchange', 'MEWE Asia Exchange', null, 'Flagship · 2026–27', 'China · Japan · Korea · Nepal · Taiwan · 2026–2027', null, 'Five countries, five neighborhoods, one question — what stirs when young people are given room to practice community life where they already live?', null, '/community-img/asia-exchange.jpg', 'magenta', '/project/asia-exchange', '2026-06-01', true, 1, 'live'),
  ('food-revolution', 'Food Revolution', '푸드 레볼루션', 'Zayed University · 2017–22', 'Zayed University, UAE · Since 2016', '자이드 대학교, UAE · 2016년부터', 'A university garden became a social lab — and a four-year study of how a food system shapes the wellbeing of everyone inside it.', '대학의 정원이 사회 실험실이 되었습니다 — 먹거리 시스템이 그 안의 모든 이의 안녕을 어떻게 빚는지에 대한 4년의 연구.', '/project-img/food-revolution.jpg', 'slate', '/project/food-revolution', '2022-01-01', false, 2, 'live'),
  ('uae-youth', 'UAE Youth Social Innovation', 'UAE 청년 사회혁신 워크숍 시리즈', 'Sharjah · 2017', 'Sharjah, UAE · 2017', '샤르자, UAE · 2017', 'Six months in which young people turned something they cared about into a social enterprise prototype — through seriously playful investigation.', '청년들이 마음 쓰는 것을 소셜 벤처 프로토타입으로 바꿔낸 여섯 달 — 진지하게 유쾌한 탐구를 통해.', '/project-img/uae-youth-social-innovation.jpg', 'slate', '/project/uae-youth-social-innovation', '2017-01-01', false, 3, 'live'),
  ('unc', 'UAE-Nepal-Connect (UNC)', 'UAE-네팔-커넥트(UNC) 사회혁신', 'Kathmandu · 2016–18', 'Kathmandu, Nepal · 2016–2018', '카트만두, 네팔 · 2016–2018', 'After the 2015 earthquake, youth in two countries built relationships that outlasted the program that introduced them.', '2015년 지진 이후, 두 나라의 청년들은 그들을 이어준 프로그램보다 오래 남은 관계를 지었습니다.', '/project-img/unc.jpg', 'slate', '/project/unc', '2018-01-01', false, 4, 'live'),
  ('unc-documentary', 'UNC Documentary', 'UNC 다큐멘터리', 'Nepal · 2017–18', 'Nepal · 2017–2018', '네팔 · 2017–2018', 'A camera followed Nepali youth for two years — not to record the program, but to see what held after it ended.', '카메라가 네팔 청년들을 2년간 따라갔습니다 — 프로그램을 기록하기 위해서가 아니라, 끝난 뒤에 무엇이 남았는지 보기 위해.', '/project-img/unc-documentary.jpg', 'slate', '/project/unc-documentary', '2018-01-01', false, 5, 'live'),
  ('light-shadow-shift', 'Light, Shadow, Shift', '빛, 그림자, 전환', 'UAE · Women’s Retreat', 'UAE · Residential · Women', 'UAE · 합숙 · 여성', 'Two days, one circle of women, and the same question asked a hundred small ways: what do you want to carry, and what are you ready to leave behind?', '이틀, 여성들의 한 원, 그리고 백 가지 작은 방식으로 던져진 같은 질문: 무엇을 지니고 가고 싶은가, 무엇을 내려놓을 준비가 되었는가?', '/project-img/light-shadow-shift-women.jpg', 'slate', '/project/light-shadow-shift-womens-retreat', '2024-01-01', false, 6, 'live'),
  ('jungle-jam', 'Jungle Jam', '정글 잼', 'Dubai · 2022', 'Al Ain, UAE · March 2023', '알아인, UAE · 2023년 3월', 'A residential gathering for young people — creativity, adventure, and honest reflection, away from the noise of everyday life.', '청년들을 위한 합숙 모임 — 일상의 소음에서 벗어난 창의성, 모험, 정직한 성찰.', '/project-img/jungle-jam.jpg', 'slate', '/project/jungle-jam', '2023-03-01', false, 7, 'live'),
  ('shadow-shifter', 'Shadow Shifter', '섀도 시프터', 'Taiwan · 2023', 'Nanzhi Center, Taiwan · June 2023', '난즈 센터, 대만 · 2023년 6월', 'Eighteen young people, two days, and one discovery: the shape of your own shadow can be changed by what you do.', '열여덟 명의 청년, 이틀, 그리고 하나의 발견: 내 그림자의 모양은 내가 하는 일로 바뀔 수 있다는 것.', '/project-img/shadow-shifter.jpg', 'slate', '/project/shadow-shifter', '2023-06-01', false, 8, 'live'),
  ('bridge-builder-program', 'BridgeBuilder Program', null, 'Five cities · Campaign', 'Five cities · Campaign', null, 'A call for BridgeBuilders in five cities — people ready to connect what''s divided in their own communities.', null, null, 'slate', '/project/bridge-builder-program', '2026-06-01', false, 9, 'live'),
  ('ctn', 'Change The Now (CTN)', null, 'Canada · 2021–23', 'Georgian College, Canada · 2021–2023', null, 'Bringing MEWE into a post-secondary setting — students changing their now, not someday.', null, null, 'slate', '/project/ctn', '2021-01-01', false, 10, 'live'),
  ('gyem', 'GYEM', null, 'Dubai · 2010–15', 'Dubai, UAE · 2010–2015', null, 'The Global Youth Empowerment Movement, co-founded with Seaon Shin — youth leading change for youth.', null, null, 'slate', '/project/gyem', '2010-01-01', false, 11, 'live'),
  ('i-grow-seed', 'I Grow Seed', null, 'Campaign', 'Campaign · Ongoing', null, 'A campaign turning the MEWE practice into small, plantable acts — each person a seed, each act growing outward.', null, null, 'slate', '/project/i-grow-seed', null, false, 12, 'live'),
  ('tasmena', 'tasmena / MENAlab', null, 'Dubai · 2009', 'Dubai, UAE · 2009 · Partner', null, 'An interdisciplinary design lab for change — the earliest room where the MEWE question took working shape.', null, null, 'slate', '/project/tasmena', '2009-01-01', false, 13, 'live')
on conflict (slug) do update set
  title = excluded.title, title_ko = excluded.title_ko, meta = excluded.meta,
  eyebrow = excluded.eyebrow, eyebrow_ko = excluded.eyebrow_ko,
  body = excluded.body, body_ko = excluded.body_ko,
  image = excluded.image, accent = excluded.accent,
  route = excluded.route, started_on = excluded.started_on,
  featured = excluded.featured, sort_order = excluded.sort_order,
  status = excluded.status;

-- ========== communities ==========
insert into public.communities
  (slug, title, title_ko, meta, meta_ko, eyebrow, eyebrow_ko, body, body_ko, image, accent, route, sort_order, status)
values
  ('open-studio', 'MEWE Hub', 'MEWE 허브', 'Online · Resuming soon', '온라인 · 곧 재개', 'Community', '커뮤니티', 'Anyone who completes Möbius Making joins the Hub, an online community that keeps practicing together. Through Open Studio, members share how MEWE is living in their daily lives.', '뫼비우스 만들기를 마친 누구나 허브에 함께합니다 — 계속 함께 연습하는 온라인 공동체. 오픈 스튜디오를 통해 MEWE가 일상 속에서 어떻게 살아 있는지 나눕니다.', '/community-img/mewe-hub.jpg', 'ink', '/community/open-studio', 1, 'live'),
  ('animators', 'Animator Community', '애니메이터 커뮤니티', 'With Junior Youth', '주니어 유스와 함께', 'Community', '커뮤니티', 'Animators walking alongside Junior Youth groups — building true friendship and supporting young people’s expression. As friendships deepen, animators find their own blind spots and new ways to grow.', '주니어 유스 그룹과 나란히 걷는 애니메이터들 — 진짜 우정을 쌓고 청소년들의 표현을 지지합니다. 우정이 깊어질수록 애니메이터들도 자신의 사각지대와 새로운 성장의 길을 발견합니다.', '/community-img/animators.jpg', 'ink', '/community/animators', 2, 'live'),
  ('in-collectives', 'IN-Collective Open Studio', 'IN-콜렉티브 오픈 스튜디오', 'Weekly + annual', '매주 + 매년', 'Community', '커뮤니티', 'IN-Collectives meet to reflect on their journeys and on how MEWE practice is developing — consulting one another on real project challenges through a MEWE lens.', 'IN-콜렉티브들이 모여 각자의 여정과 MEWE 실천의 성장을 돌아봅니다 — 실제 프로젝트의 과제를 MEWE의 렌즈로 서로에게 묻고 답하면서.', '/community-img/open-studio.jpg', 'ink', '/community/in-collectives', 3, 'live'),
  ('facilitators', 'Pathfinder Community', '패스파인더 커뮤니티', 'Facilitators · Growing', '퍼실리테이터 · 성장 중', 'Community', '커뮤니티', 'Those who complete Pathfinder facilitator training join a community that keeps growing, carrying the practice into their own contexts and holding space for others.', '패스파인더 퍼실리테이터 훈련을 마친 이들은 계속 자라나는 공동체에 합류해, 실천을 자신의 맥락으로 옮기고 다른 이들을 위한 공간을 엽니다.', '/community-img/facilitators.jpg', 'ink', '/community/facilitators', 4, 'live'),
  ('bridge-builders', 'BridgeBuilder Community', '브리지빌더 커뮤니티', 'Wherever someone steps in', '누군가 발을 딛는 곳 어디든', 'Community', '커뮤니티', 'Young people building small bridges in their own neighborhoods. Reaches well beyond the Asia Exchange’s five countries — Canada, the USA, Saudi Arabia, India, and more. Anyone who begins belongs here.', '자신의 동네에서 작은 다리를 짓는 청년들. 아시아 익스체인지의 다섯 나라를 훌쩍 넘어 — 캐나다, 미국, 사우디아라비아, 인도까지. 시작하는 누구나 이곳에 속합니다.', null, 'ink', '/community/bridge-builders', 5, 'live'),
  ('asia-exchange-community', 'Asia Exchange Community', '아시아 익스체인지 커뮤니티', 'China · Japan · Korea · Nepal · Taiwan', '중국 · 일본 · 한국 · 네팔 · 대만', 'Community', '커뮤니티', 'The group living the one-year MEWE Asia Exchange — five communities, each practicing in their own place while learning together. Full detail on the Asia Exchange project page.', '1년의 MEWE 아시아 익스체인지를 살아가는 그룹 — 다섯 공동체가 각자의 자리에서 실천하며 함께 배웁니다. 자세한 내용은 아시아 익스체인지 프로젝트 페이지에.', '/community-img/asia-exchange.jpg', 'ink', '/project/asia-exchange', 6, 'live'),
  ('i-grow-seeds-kulna', 'I Grow Seeds — KULNA', '아이 그로우 시즈 — KULNA', 'Dubai · Online', '두바이 · 온라인', 'Community', '커뮤니티', 'Grew out of Food Revolution. A living network of farmers, filmmakers, naturalists, researchers, graduates, and volunteers, still exchanging across locations. Quieter now, but still connected.', '푸드 레볼루션에서 자라났습니다. 농부, 영화감독, 자연학자, 연구자, 졸업생, 자원활동가로 이루어진 살아 있는 네트워크 — 지금은 조용하지만 여전히 연결되어 있습니다.', '/community-img/igrowseeds.jpg', 'red', '/project/food-revolution', 7, 'live'),
  ('nepal-youth-cluster', 'Nepal / UAE Youth Cluster', '네팔 / UAE 유스 클러스터', 'On hold · Archive', '휴면 · 아카이브', 'Community', '커뮤니티', 'An earlier community of youth across Nepal and the UAE. Not active right now — held in the archive, part of how the practice grew.', '네팔과 UAE를 잇던 초기 청년 공동체. 지금은 활동하지 않지만 — 아카이브에 간직되어, 실천이 자라온 길의 일부로 남아 있습니다.', '/community-img/nepal-cluster.jpg', 'red', '/community/nepal-youth-cluster', 8, 'live'),
  ('uae-youth-cluster', 'UAE Youth Cluster', 'UAE 유스 클러스터', 'On hold · Archive', '휴면 · 아카이브', 'Community', '커뮤니티', 'An earlier community of youth across Nepal and the UAE. Not active right now — held in the archive, part of how the practice grew.', '네팔과 UAE를 잇던 초기 청년 공동체. 지금은 활동하지 않지만 — 아카이브에 간직되어, 실천이 자라온 길의 일부로 남아 있습니다.', '/community-img/uae-cluster.jpg', 'red', '/community/uae-youth-cluster', 9, 'live')
on conflict (slug) do update set
  title = excluded.title, title_ko = excluded.title_ko,
  meta = excluded.meta, meta_ko = excluded.meta_ko,
  eyebrow = excluded.eyebrow, eyebrow_ko = excluded.eyebrow_ko,
  body = excluded.body, body_ko = excluded.body_ko,
  image = excluded.image, accent = excluded.accent, route = excluded.route,
  sort_order = excluded.sort_order, status = excluded.status;
