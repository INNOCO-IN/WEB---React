/**
 * The desk's own words, in the two languages it is read in.
 *
 * Not part of the site's i18n. That system keys off the locale in the URL —
 * `/ko/news` — and the desk deliberately has no locale in its URL, no nav and
 * no entry in the route table. Putting the chrome in `i18n/resources` would
 * make a staff tool a fourth edition of a three-language public site and tie
 * its wording to a router it does not use. So it is a table, switched by a
 * control in the desk header and remembered per browser.
 *
 * **The desk chrome switches language; the rows do not.** A submission is read
 * in the language it was written in, and only the interface around it moves.
 * Nothing in here translates a row's content. The one thing that looks like an
 * exception is not one: `brings` is a slug the form stored precisely so it
 * carries no language, so rendering it in the desk's language is the bargain
 * being honoured rather than broken. Its sentences live beside the slugs in
 * `services/review.ts`; what is here is only the label on the filter.
 *
 * The Korean is the design bundle's draft, and it is pending IN's own review.
 * Replace it from their copy rather than polishing it here.
 */

import { useEffect, useState } from 'react';
import { EDITIONS, type DeskLang } from '../lib/services/review';
import { HTML_LANG } from '../i18n/locales';

/**
 * The languages the desk is read in, in the desk's own order.
 *
 * `EDITIONS` rather than a list of its own, so this and the Language filter
 * cannot come to disagree about how many languages there are.
 */
export const DESK_LOCALES = EDITIONS;
export type DeskLocale = DeskLang;

export interface DeskCopy {
  /** Which of the two this is. Carried so that anything holding the copy can
      also render a stored slug — `brings` — in the language around it. */
  locale: DeskLocale;
  /** Names the header's own language control, which shows no visible label. */
  deskLanguage: string;
  /* The queue-specific selects. Only the labels are here: the *options* are the
     submitter's own vocabulary as the row stores it — `lived`, `ME + WE` — and
     the rail prints those verbatim, so translating them here would mean picking
     a word the rows never show. `brings` is the exception that proves it: the
     form stores a slug carrying no language, so the desk is free to render it. */
  door: string;
  anyDoor: string;
  format: string;
  anyFormat: string;
  arc: string;
  anyArc: string;
  brings: string;
  anyBrings: string;
  workshop: string;
  anyWorkshop: string;
  /* The rest of what a row's fields are called. Same rule as above: the desk's
     word for the field, never the submitter's word for its value. */
  credit: string;
  consent: string;
  consentNotGiven: string;
  email: string;
  organisation: string;
  /* The news queue. Its own words, because none of the intake vocabulary fits:
     a news item does not arrive, is not waiting on anybody, and is edited
     rather than decided. `newsTakenOver` is the one sentence here that states a
     rule rather than names a field — see `edited_at` in services/review.ts. */
  newsKind: string;
  newsEyebrow: string;
  newsTitle: string;
  newsBody: string;
  newsStatus: string;
  newsAnyStatus: string;
  newsTakenOver: (day: string) => string;
  newsFromRegister: string;
  newsNarrowed: string;
  newsUntitled: string;
  /* The words an editor is drawn with, shared by the two queues that write
     rather than move. These were `newsEdit`, `newsSave` and the rest until the
     story collection grew an editor of its own — "Save" was never a news word,
     and one of it per language is enough. */
  edition: string;
  edit: string;
  close: string;
  save: string;
  saving: string;
  revert: string;
  unsaved: string;
  /* The published collection: the story entries behind /story and /story/all,
     and the wall of cards at the foot of the first. A third vocabulary because
     it asks a third question — not who is waiting and not what the register
     says, but whether this is still right and whether it belongs on the front.
     `entryTakenOver` is this queue's copy of the news queue's one rule-stating
     sentence; `wallAuto` and `wallPinned` are the other, and the two of them
     are what make a nullable column legible as a decision. */
  /** The fold that reveals the submission a published card was made from. */
  sentIn: string;
  entriesEmpty: string;
  entriesNarrowed: string;
  entriesWhere: string;
  entriesAnywhere: string;
  entriesWall: string;
  entriesOffWall: string;
  entriesHidden: string;
  entryEyebrow: string;
  entryTitle: string;
  entryBlurb: string;
  entryText: string;
  entryDate: string;
  entryTopic: string;
  entryImage: string;
  entryUpload: string;
  entryUploading: string;
  entryNoPicture: string;
  /** The way into the screen that writes a story nobody sent. */
  addStory: string;
  entryHide: string;
  entryRestore: string;
  entryDraft: string;
  entryFinished: string;
  entryTakenOver: (day: string) => string;
  entryFromRegister: string;
  wallAuto: (cards: number) => string;
  wallPinned: (pinned: number, cards: number) => string;
  wallPinThese: (cards: number) => string;
  wallClear: string;
  wallPin: string;
  wallUnpin: string;
  wallUp: string;
  wallDown: string;
  wallPlace: (place: number) => string;
  wallOff: string;
  /** Pinned, but past the twelve the wall has room for. */
  wallBehind: string;
  /** Every status as a noun, for the rail. Keyed by the column's own value. */
  statusWord: Record<string, string>;
  /**
   * Every status as the thing you are about to do, for the button.
   *
   * A row offers the two statuses it is not in, and each reads as a verb rather
   * than as the column value: `contacted` offers "Back to new", and `new`
   * offers "Contacted". Every status is reachable from every other, because
   * nothing is ever deleted and so every decision has to be reversible.
   */
  statusVerb: Record<string, string>;
  writeTo: (first: string) => string;
  eyebrow: string;
  title: string;
  signOut: string;
  tabs: { stories: string; submissions: string; workshop_registrations: string; news: string };
  search: string;
  arrived: string;
  arrivedAny: string;
  arrived30: string;
  arrivedYear: string;
  arrivedRange: string;
  from: string;
  to: string;
  language: string;
  languageAny: string;
  order: string;
  newest: string;
  oldest: string;
  waiting: string;
  handled: string;
  allShown: string;
  showing: (shown: number, total: number) => string;
  showMore: string;
  jumpTo: string;
  clearAll: string;
  narrowedTo: string;
  selectRows: string;
  selected: (count: number) => string;
  archiveSelected: string;
  clearSelection: string;
  reading: string;
  empty: Record<'stories' | 'submissions' | 'workshop_registrations' | 'news', string>;
  failedTitle: string;
  failedBody: string;
  tryAgain: string;
  signInAgain: string;
  noMessage: string;
  anonymous: string;
  readInFull: string;
  backToQueue: string;
  openFullSize: string;
  notOnSite: string;
  onSite: string;
  view: string;
  carriedAcross: string;
}

const EN: DeskCopy = {
  locale: 'en',
  deskLanguage: 'Desk language',
  door: 'Door',
  anyDoor: 'Any door',
  format: 'Format',
  anyFormat: 'Any format',
  arc: 'Arc',
  anyArc: 'Any stage',
  brings: 'What brings them',
  anyBrings: 'Anything',
  workshop: 'Workshop',
  anyWorkshop: 'Any workshop',
  credit: 'Credit',
  consent: 'Consent',
  consentNotGiven: 'Not given — cannot be published',
  email: 'Email',
  organisation: 'Organisation',
  newsKind: 'Kind',
  newsEyebrow: 'Eyebrow',
  newsTitle: 'Title',
  newsBody: 'Body',
  newsStatus: 'Status',
  newsAnyStatus: 'Any status',
  newsTakenOver: (day) => `Edited here on ${day} — site/data no longer overwrites this item.`,
  newsFromRegister: 'From the content register. Editing it here takes it over.',
  newsNarrowed: 'No news item matches that. Widen the status or clear the search.',
  newsUntitled: '(no title in this edition)',
  edition: 'Edition',
  edit: 'Edit',
  close: 'Close',
  save: 'Save',
  saving: 'Saving…',
  revert: 'Revert',
  unsaved: 'Unsaved changes',
  sentIn: 'What was sent',
  entriesEmpty: 'Nothing has been published to the story collection yet.',
  entriesNarrowed: 'No story matches that. Widen the filter or clear the search.',
  entriesWhere: 'Where',
  entriesAnywhere: 'Anywhere on the site',
  entriesWall: 'On the wall',
  entriesOffWall: 'Not on the wall',
  entriesHidden: 'Taken off the site',
  entryEyebrow: 'Eyebrow',
  entryTitle: 'Title',
  entryBlurb: 'Blurb — the sentence on the card',
  entryText: 'Full text — one paragraph per blank line',
  entryDate: 'Published',
  entryTopic: 'Topic',
  entryImage: 'Picture',
  entryUpload: 'Or upload a new one',
  entryUploading: 'Uploading…',
  entryNoPicture: 'No picture. The card shows the amber band instead.',
  addStory: 'Add a story',
  entryHide: 'Take off the site',
  entryRestore: 'Put back on the site',
  entryDraft: 'Mark unfinished',
  entryFinished: 'Mark finished',
  entryTakenOver: (day) => `Edited here on ${day} — site/data no longer overwrites this story.`,
  entryFromRegister: 'From site/data. Editing it here takes it over.',
  wallAuto: (cards) => `The wall is the ${cards} most recent. Nothing is pinned.`,
  wallPinned: (pinned, cards) =>
    pinned > cards
      ? `All ${cards} are pinned, and ${pinned - cards} more wait behind them.`
      : pinned === cards
        ? `All ${cards} are pinned — a newly published story cannot reach the wall until one is unpinned.`
        : `${pinned} pinned, ${cards - pinned} filled by date.`,
  wallPinThese: (cards) => `Pin these ${cards}`,
  wallClear: 'Let the date decide',
  wallPin: 'Pin to the wall',
  wallUnpin: 'Unpin',
  wallUp: 'Move up',
  wallDown: 'Move down',
  wallPlace: (place) => `On the wall · ${place}`,
  wallOff: 'Not on the wall',
  wallBehind: 'Pinned, behind the twelve',
  statusWord: {
    pending: 'Pending',
    published: 'Published',
    declined: 'Declined',
    new: 'New',
    contacted: 'Contacted',
    archived: 'Archived',
    draft: 'Draft',
    live: 'Live',
  },
  statusVerb: {
    pending: 'Back to pending',
    published: 'Publish →',
    declined: 'Decline',
    new: 'Back to new',
    contacted: 'Contacted',
    archived: 'Archive',
    draft: 'Back to draft',
    live: 'Put live',
  },
  writeTo: (first) => (first ? `Write to ${first} →` : 'Write to them →'),
  eyebrow: 'IN · Internal',
  title: 'Review desk',
  signOut: 'Sign out',
  tabs: { stories: 'Stories', submissions: 'Are you IN?', workshop_registrations: 'Workshop sign-ups', news: 'News' },
  search: 'Search this queue',
  arrived: 'Arrived',
  arrivedAny: 'Any time',
  arrived30: '30 days',
  arrivedYear: 'This year',
  arrivedRange: 'Dates…',
  from: 'From',
  to: 'To',
  language: 'Language',
  languageAny: 'Any language',
  order: 'Order',
  newest: 'Newest first',
  oldest: 'Oldest first',
  waiting: 'waiting',
  handled: 'handled',
  allShown: 'all shown',
  showing: (shown, total) => `Showing ${shown} of ${total} handled`,
  showMore: 'Show 25 more',
  jumpTo: 'Jump to',
  clearAll: 'Clear all',
  narrowedTo: 'Narrowed to',
  selectRows: 'Select rows',
  selected: (count) => `${count} selected`,
  archiveSelected: 'Archive selected',
  clearSelection: 'Clear selection',
  reading: 'Reading…',
  empty: {
    stories: 'Nothing in this queue. When somebody sends a story, it arrives here.',
    submissions: 'Nothing in this queue. When somebody writes, it arrives here.',
    workshop_registrations: 'Nobody has signed up for a workshop yet. When somebody does, it arrives here.',
    news: 'No news items. They come from site/data when the content extractor runs.',
  },
  failedTitle: 'The read did not go through',
  failedBody: 'This queue could not be read. Nothing has been lost — the rows are still there.',
  tryAgain: 'Try again',
  signInAgain: 'Sign in again',
  noMessage: 'No message.',
  anonymous: 'left blank — anonymous',
  readInFull: 'Read in full →',
  backToQueue: '← Back to the queue',
  openFullSize: 'Open full size',
  notOnSite: 'Not on the site',
  onSite: 'On the site',
  view: 'View',
  carriedAcross: 'Korean: English carried across',
};

const KO: DeskCopy = {
  locale: 'ko',
  deskLanguage: '데스크 언어',
  door: '문',
  anyDoor: '전체 문',
  format: '형식',
  anyFormat: '전체 형식',
  arc: '아크 단계',
  anyArc: '전체 단계',
  brings: '무엇 때문에 연락했나요',
  anyBrings: '전체',
  workshop: '워크숍',
  anyWorkshop: '전체 워크숍',
  credit: '이름 표기',
  consent: '동의',
  consentNotGiven: '받지 않음 — 게시할 수 없습니다',
  email: '이메일',
  organisation: '소속',
  newsKind: '종류',
  newsEyebrow: '윗줄',
  newsTitle: '제목',
  newsBody: '본문',
  newsStatus: '상태',
  newsAnyStatus: '전체 상태',
  newsTakenOver: (day) => `${day}에 여기서 편집됨 — 이제 site/data가 이 항목을 덮어쓰지 않습니다.`,
  newsFromRegister: '콘텐츠 레지스터에서 온 항목입니다. 여기서 편집하면 데스크가 맡습니다.',
  newsNarrowed: '해당하는 소식이 없습니다. 상태를 넓히거나 검색어를 지우세요.',
  newsUntitled: '(이 언어판에는 제목이 없습니다)',
  edition: '언어판',
  edit: '편집',
  close: '닫기',
  save: '저장',
  saving: '저장 중…',
  revert: '되돌리기',
  unsaved: '저장하지 않은 변경',
  sentIn: '들어온 글',
  entriesEmpty: '아직 게시된 이야기가 없습니다.',
  entriesNarrowed: '해당하는 이야기가 없습니다. 조건을 넓히거나 검색어를 지우세요.',
  entriesWhere: '위치',
  entriesAnywhere: '사이트 전체',
  entriesWall: '카드 벽에 있음',
  entriesOffWall: '카드 벽에 없음',
  entriesHidden: '사이트에서 내림',
  entryEyebrow: '윗줄',
  entryTitle: '제목',
  entryBlurb: '카드에 실리는 한 문장',
  entryText: '본문 — 빈 줄로 문단을 나눕니다',
  entryDate: '게시일',
  entryTopic: '주제',
  entryImage: '사진',
  entryUpload: '새 사진 올리기',
  entryUploading: '올리는 중…',
  entryNoPicture: '사진 없음. 카드에는 황색 띠가 대신 들어갑니다.',
  addStory: '이야기 추가',
  entryHide: '사이트에서 내리기',
  entryRestore: '사이트에 다시 올리기',
  entryDraft: '미완성으로 표시',
  entryFinished: '완성으로 표시',
  entryTakenOver: (day) => `${day}에 여기서 편집됨 — 이제 site/data가 이 이야기를 덮어쓰지 않습니다.`,
  entryFromRegister: 'site/data에서 온 이야기입니다. 여기서 편집하면 데스크가 맡습니다.',
  wallAuto: (cards) => `카드 벽은 최신 ${cards}편입니다. 고정된 것은 없습니다.`,
  wallPinned: (pinned, cards) =>
    pinned > cards
      ? `${cards}편 모두 고정, ${pinned - cards}편은 그 뒤에서 대기 중입니다.`
      : pinned === cards
        ? `${cards}편 모두 고정되어 있습니다 — 하나를 풀기 전에는 새 이야기가 카드 벽에 오를 수 없습니다.`
        : `${pinned}편 고정, ${cards - pinned}편은 날짜순.`,
  wallPinThese: (cards) => `이 ${cards}편 고정하기`,
  wallClear: '날짜에 맡기기',
  wallPin: '카드 벽에 고정',
  wallUnpin: '고정 해제',
  wallUp: '앞으로',
  wallDown: '뒤로',
  wallPlace: (place) => `카드 벽 · ${place}번째`,
  wallOff: '카드 벽에 없음',
  wallBehind: '고정됨 — 열두 편 뒤에서 대기',
  statusWord: {
    pending: '대기',
    published: '게시됨',
    declined: '반려됨',
    new: '신규',
    contacted: '연락함',
    archived: '보관됨',
    draft: '초안',
    live: '게시 중',
  },
  statusVerb: {
    pending: '대기로 되돌리기',
    published: '게시하기 →',
    declined: '반려',
    new: '신규로 되돌리기',
    contacted: '연락함',
    archived: '보관',
    draft: '초안으로 되돌리기',
    live: '게시하기',
  },
  writeTo: (first) => (first ? `${first}에게 답장` : '답장 보내기'),
  eyebrow: 'IN · 내부용',
  title: '리뷰 데스크',
  signOut: '로그아웃',
  tabs: { stories: '이야기', submissions: 'Are You IN?', workshop_registrations: '워크숍 신청', news: '소식' },
  search: '이 목록에서 찾기',
  arrived: '도착',
  arrivedAny: '전체 기간',
  arrived30: '30일',
  arrivedYear: '올해',
  arrivedRange: '기간 지정…',
  from: '시작',
  to: '끝',
  language: '언어',
  languageAny: '전체 언어',
  order: '정렬',
  newest: '최신순',
  oldest: '오래된순',
  waiting: '대기',
  handled: '처리됨',
  allShown: '전체 표시',
  showing: (shown, total) => `처리됨 ${total} 중 ${shown} 표시`,
  showMore: '25개 더 보기',
  jumpTo: '바로 가기',
  clearAll: '모두 해제',
  narrowedTo: '좁힌 조건',
  selectRows: '줄 선택',
  selected: (count) => `${count}개 선택됨`,
  archiveSelected: '선택 항목 보관',
  clearSelection: '선택 해제',
  reading: '읽는 중…',
  empty: {
    stories: '이 목록은 비어 있습니다. 이야기가 도착하면 여기에 나타납니다.',
    submissions: '이 목록은 비어 있습니다. 문의가 오면 여기에 나타납니다.',
    workshop_registrations: '아직 워크숍 신청이 없습니다. 신청이 오면 여기에 나타납니다.',
    news: '소식 항목이 없습니다. 콘텐츠 추출기를 실행하면 site/data에서 들어옵니다.',
  },
  failedTitle: '읽어오지 못했습니다',
  failedBody: '이 목록을 읽지 못했습니다. 사라진 것은 없습니다 — 줄은 그대로 있습니다.',
  tryAgain: '다시 시도',
  signInAgain: '다시 로그인',
  noMessage: '메시지 없음.',
  anonymous: '비워 둠 — 익명',
  readInFull: '전문 읽기 →',
  backToQueue: '← 목록으로',
  openFullSize: '원본 열기',
  notOnSite: '사이트에 없음',
  onSite: '사이트에 있음',
  view: '보기',
  carriedAcross: '한국어: 영어를 그대로 옮김',
};

/**
 * Traditional Chinese, Taiwan.
 *
 * A draft, and more of one than the Korean: the site's own zh-TW pages are
 * still empty stubs apart from `are-you-in`, so apart from the six `brings`
 * sentences there was nothing established to follow. Replace it from IN's copy.
 */
const ZH: DeskCopy = {
  locale: 'zh-TW',
  deskLanguage: '審稿台語言',
  door: '門',
  anyDoor: '所有的門',
  format: '形式',
  anyFormat: '所有形式',
  arc: '歷程階段',
  anyArc: '所有階段',
  brings: '為什麼來信',
  anyBrings: '全部',
  workshop: '工作坊',
  anyWorkshop: '所有工作坊',
  credit: '署名',
  consent: '同意',
  consentNotGiven: '未取得 — 無法刊出',
  email: '電子郵件',
  organisation: '單位',
  newsKind: '類型',
  newsEyebrow: '眉標',
  newsTitle: '標題',
  newsBody: '內文',
  newsStatus: '狀態',
  newsAnyStatus: '所有狀態',
  newsTakenOver: (day) => `${day} 在這裡編輯過 — site/data 不再覆寫這一則。`,
  newsFromRegister: '來自內容登錄檔。在這裡編輯就由審稿台接手。',
  newsNarrowed: '沒有符合的消息。把狀態放寬，或清掉搜尋字。',
  newsUntitled: '（這個語言版沒有標題）',
  edition: '語言版',
  edit: '編輯',
  close: '關閉',
  save: '儲存',
  saving: '儲存中…',
  revert: '還原',
  unsaved: '尚未儲存的變更',
  sentIn: '看投稿原文',
  entriesEmpty: '故事集還沒有任何一篇上站。',
  entriesNarrowed: '沒有符合的故事。把條件放寬，或清掉搜尋字。',
  entriesWhere: '位置',
  entriesAnywhere: '站上任何地方',
  entriesWall: '在卡牆上',
  entriesOffWall: '不在卡牆上',
  entriesHidden: '已從站上撤下',
  entryEyebrow: '眉標',
  entryTitle: '標題',
  entryBlurb: '摘要 — 卡片上的那一句',
  entryText: '全文 — 空一行分段',
  entryDate: '刊出日期',
  entryTopic: '主題',
  entryImage: '圖片',
  entryUpload: '或上傳新的一張',
  entryUploading: '上傳中…',
  entryNoPicture: '沒有圖。卡片會改用琥珀色的橫帶。',
  addStory: '新增一則故事',
  entryHide: '從站上撤下',
  entryRestore: '放回站上',
  entryDraft: '標記為未完成',
  entryFinished: '標記為已完成',
  entryTakenOver: (day) => `${day} 在這裡編輯過 — site/data 不再覆寫這一篇。`,
  entryFromRegister: '來自 site/data。在這裡編輯就由審稿台接手。',
  wallAuto: (cards) => `卡牆是最新的 ${cards} 篇，沒有任何一篇被釘住。`,
  wallPinned: (pinned, cards) =>
    pinned > cards
      ? `${cards} 篇全部釘住，另有 ${pinned - cards} 篇在後面排隊。`
      : pinned === cards
        ? `${cards} 篇全部釘住了 — 除非先取消一張，否則新刊出的故事上不了卡牆。`
        : `釘住 ${pinned} 篇，其餘 ${cards - pinned} 篇依日期。`,
  wallPinThese: (cards) => `把這 ${cards} 篇釘住`,
  wallClear: '交給日期決定',
  wallPin: '釘到卡牆',
  wallUnpin: '取消釘選',
  wallUp: '往前',
  wallDown: '往後',
  wallPlace: (place) => `卡牆 · 第 ${place} 張`,
  wallOff: '不在卡牆上',
  wallBehind: '已釘選，排在 12 張之後',
  statusWord: {
    pending: '待處理',
    published: '已刊出',
    declined: '未採用',
    new: '新進',
    contacted: '已聯絡',
    archived: '已封存',
    draft: '草稿',
    live: '上線中',
  },
  statusVerb: {
    pending: '退回待處理',
    published: '刊出 →',
    declined: '不採用',
    new: '退回新進',
    contacted: '已聯絡',
    archived: '封存',
    draft: '退回草稿',
    live: '上線',
  },
  writeTo: (first) => (first ? `回信給 ${first} →` : '回信 →'),
  eyebrow: 'IN · 內部',
  title: '審稿台',
  signOut: '登出',
  tabs: { stories: '故事', submissions: 'Are You IN?', workshop_registrations: '工作坊報名', news: '最新消息' },
  search: '搜尋這份清單',
  arrived: '收到時間',
  arrivedAny: '不限時間',
  arrived30: '30 天內',
  arrivedYear: '今年',
  arrivedRange: '指定日期…',
  from: '起',
  to: '迄',
  language: '語言',
  languageAny: '全部語言',
  order: '排序',
  newest: '最新在前',
  oldest: '最舊在前',
  waiting: '待處理',
  handled: '已處理',
  allShown: '全部顯示',
  showing: (shown, total) => `已處理 ${total} 筆中顯示 ${shown} 筆`,
  showMore: '再顯示 25 筆',
  jumpTo: '跳到',
  clearAll: '全部清除',
  narrowedTo: '已篩選',
  selectRows: '選取',
  selected: (count) => `已選 ${count} 筆`,
  archiveSelected: '封存所選',
  clearSelection: '取消選取',
  reading: '讀取中…',
  empty: {
    stories: '這份清單是空的。有人投稿故事時會出現在這裡。',
    submissions: '這份清單是空的。有人來信時會出現在這裡。',
    workshop_registrations: '還沒有人報名工作坊。有人報名時會出現在這裡。',
    news: '沒有消息項目。跑內容擷取器時會從 site/data 進來。',
  },
  failedTitle: '沒有讀取成功',
  failedBody: '這份清單讀不到。沒有東西遺失 — 資料都還在。',
  tryAgain: '再試一次',
  signInAgain: '重新登入',
  noMessage: '沒有留言。',
  anonymous: '留白 — 匿名',
  readInFull: '讀全文 →',
  backToQueue: '← 回到清單',
  openFullSize: '開啟原始檔',
  notOnSite: '不在網站上',
  onSite: '已在網站上',
  view: '檢視',
  carriedAcross: '韓文：沿用英文',
};

export const DESK_COPY: Record<DeskLocale, DeskCopy> = { en: EN, ko: KO, 'zh-TW': ZH };

const STORAGE_KEY = 'in.review.lang';

/** The language the desk was last read in. Per browser, not per account. */
export function storedDeskLocale(): DeskLocale {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    // Validated against the list rather than trusted: a value left in storage
    // by an older build — or by a language since removed — would otherwise
    // index `DESK_COPY` to undefined and take the whole desk down.
    return DESK_LOCALES.find((locale) => locale === saved) ?? 'en';
  } catch {
    // Private browsing, or storage turned off. English is the default anyway.
    return 'en';
  }
}

function storeDeskLocale(locale: DeskLocale): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Not worth telling anyone about: the switch still works for this session.
  }
}

/**
 * The desk's language, shared by every screen under `/review`.
 *
 * One value in a module rather than one `useState` per screen. The screens are
 * routes — the queue, one story, the publishing flow — so only one is mounted
 * at a time, and each reading storage for itself worked only because the write
 * happens to be synchronous. This makes the sharing the point rather than the
 * accident, and gives the switch somewhere to publish to.
 */
const listeners = new Set<(locale: DeskLocale) => void>();
let shared: DeskLocale | null = null;

export function useDeskCopy(): { copy: DeskCopy; locale: DeskLocale; setLocale: (next: DeskLocale) => void } {
  const [locale, setLocale] = useState<DeskLocale>(() => (shared ??= storedDeskLocale()));

  useEffect(() => {
    listeners.add(setLocale);
    return () => {
      listeners.delete(setLocale);
    };
  }, []);

  /**
   * Which language the document is in, so a screen reader announces Korean as
   * Korean and the CJK font stacks in `tokens/fonts.css` resolve.
   *
   * Set rather than set-and-restored: `lib/head.ts` writes this on every site
   * page from the locale in the URL, and the desk has no locale in its URL and
   * no `SiteLayout` to call it. Leaving the desk's language behind is therefore
   * harmless — the next site page overwrites it — and restoring it here would
   * only put back whatever page was open before.
   */
  useEffect(() => {
    document.documentElement.lang = HTML_LANG[locale];
  }, [locale]);

  return { copy: DESK_COPY[locale], locale, setLocale: switchDeskLocale };
}

/** Switches every mounted desk screen, and remembers it for the next visit. */
export function switchDeskLocale(next: DeskLocale): void {
  shared = next;
  storeDeskLocale(next);
  for (const listener of listeners) listener(next);
}
