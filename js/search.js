/* search.js — 전체 찾기.
   상단 메뉴의 돋보기가 층 하나를 덮고, 치는 대로 결과가 쌓인다. 버튼은 없다.

   비교는 공백을 지운 소문자끼리 한다 — '기후 위기'로 쳐도 '기후위기'가 걸리고 그 반대도 걸린다.
   화면에 보여줄 때는 원문 그대로다. 그래서 공백을 지운 문자열의 자리에서
   원문의 자리로 되돌아올 수 있게 자리표(map)를 함께 만든다. 이것이 이 파일의 핵심이다. */

import { el, link, pageUrl, shownInLang, byYear, titleNodes, titleText } from './ui.js';
import { t, lang } from './i18n.js';

const L = {
  open: { ko: '찾기', en: 'Search' },
  close: { ko: '닫기', en: 'Close' },
  ph: { ko: '작업 · 사람 · 낱말', en: 'Works, people, words' },
  empty: { ko: '찾는 내용이 없습니다', en: 'No results' },
  hint: { ko: '두 글자 이상 입력하세요', en: 'Type at least two characters' },
  count: { ko: (n) => `${n}건`, en: (n) => `${n} result${n === 1 ? '' : 's'}` },
};
const G = {
  work: { ko: '작업', en: 'Works' },
  producer: { ko: '프로듀서', en: 'Producers' },
  artist: { ko: '아티스트', en: 'Artists' },
  other: { ko: '그 밖', en: 'Elsewhere' },
};
/* 어디서 걸렸는지 줄 끝에 작게 적는다. */
const F = {
  title: { ko: '제목', en: 'Title' },
  name: { ko: '이름', en: 'Name' },
  subtitle: { ko: '부제', en: 'Subtitle' },
  lead: { ko: '리드', en: 'Lead' },
  body: { ko: '본문', en: 'Body' },
  credit: { ko: '크레딧', en: 'Credits' },
  keyword: { ko: '키워드', en: 'Keywords' },
  place: { ko: '장소', en: 'Places' },
  field: { ko: '분야', en: 'Field' },
  tagline: { ko: '한 줄 소개', en: 'Tagline' },
};

/* 걸린 자리의 무게. 제목·이름이 먼저, 그다음 키워드·분야 같은 짧은 칸, 본문은 맨 뒤. */
const WEIGHT = { title: 0, name: 0, subtitle: 1, keyword: 1, field: 1, tagline: 1, place: 1, lead: 2, body: 2, credit: 2 };

/* ---------- 공백을 지운 짝과 자리표 ----------
   fold('기후 위기') → { s:'기후위기', map:[0,1,3,4] }
   map[i] 는 s[i] 가 원문의 몇 번째 글자였는지다. 발췌와 굵게 칠하기가 이것으로 돌아간다. */
function fold(raw) {
  const s = [];
  const map = [];
  const src = String(raw || '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (/\s/.test(c)) continue;
    s.push(c.toLowerCase());
    map.push(i);
  }
  return { s: s.join(''), map, src };
}

/** 찾는 말도 같은 방식으로 접는다. 공백만 친 것은 찾지 않는다. */
export const foldQuery = (q) => String(q || '').toLowerCase().replace(/\s+/g, '');

/* ---------- 어느 칸을 뒤지는가 ----------
   값은 늘 현재 언어로 읽는다. 다만 제목과 이름만 국·영문을 함께 뒤진다 —
   영문 화면에서 '강화'로도 찾히게 하려는 것이다(그 반대도 같다). */
const cur = (f) => t(f, lang.current);
const both = (f) => [t(f, 'ko'), t(f, 'en')];

function workFields(w) {
  const out = [];
  const push = (kind, ...vals) => {
    for (const v of vals) if (v) out.push([kind, v]);
  };
  push('title', ...both(w.title).map(titleText));
  push('subtitle', cur(w.subtitle));
  push('lead', cur(w.lead));
  push('body', cur(w.body));
  push('keyword', cur(w.keywords));
  /* 크레딧은 두 곳에 있다 — credits[] 짝과 아코디언의 줄. 둘 다 뒤진다. */
  for (const c of w.credits || []) push('credit', cur(c.role), cur(c.name));
  for (const a of w.accordions || []) {
    push('credit', cur(a.title));
    for (const r of a.rows || []) push('credit', cur(r));
  }
  for (const r of w.info || []) push('credit', cur(r.role), cur(r.name));
  for (const r of w.runs || []) push('place', cur(r.city), cur(r.venue));
  return out;
}

const producerFields = (p) => [
  ...both(p.name).map((v) => ['name', v]),
  ['tagline', cur(p.tagline)],
  ['body', cur(p.bio)],
].filter(([, v]) => v);

const artistFields = (a) => [
  ...both(a.name).map((v) => ['name', v]),
  ['field', cur(a.field)],
  ['body', cur(a.bio)],
].filter(([, v]) => v);

/* about.json 의 소개문은 문단 배열이고, 둥지230 은 label·title·body·address 짝이다. */
const aboutFields = (about) => {
  const d = about?.doongji || {};
  return [
    ...(about?.intro || []).map((p) => ['body', cur(p)]),
    ['title', cur(d.title)],
    ['body', cur(d.body)],
    ['place', cur(d.address)],
  ].filter(([, v]) => v);
};

/* ---------- 발췌 ----------
   걸린 자리 앞뒤로 잘라 원문 그대로 내보내고, 걸린 부분만 굵게 칠한다.
   자리는 fold 의 map 을 거꾸로 밟아 원문에서 찾는다. */
const PAD = 42;

function excerpt(field, foldIdx, qLen) {
  const { map, src } = field;
  const a = map[foldIdx];
  const b = map[foldIdx + qLen - 1] + 1;
  let from = Math.max(0, a - PAD);
  let to = Math.min(src.length, b + PAD);
  /* 낱말 가운데서 자르지 않도록 라틴 글자면 공백까지 물러난다. 한글은 그냥 자른다. */
  if (from > 0) {
    const sp = src.lastIndexOf(' ', from);
    if (sp > from - 12) from = sp + 1;
  }
  if (to < src.length) {
    const sp = src.indexOf(' ', to);
    if (sp !== -1 && sp < to + 12) to = sp;
  }
  return {
    before: (from > 0 ? '… ' : '') + src.slice(from, a),
    hit: src.slice(a, b),
    after: src.slice(b, to) + (to < src.length ? ' …' : ''),
  };
}

/* ---------- 한 항목을 훑는다 ----------
   가장 무게가 가벼운(=앞에 두고 싶은) 자리 하나만 결과로 남긴다.
   같은 작업이 본문·크레딧·제목에서 다 걸렸다고 세 줄이 되면 목록을 읽을 수 없다. */
function scan(fields, q) {
  let best = null;
  for (const [kind, raw] of fields) {
    const f = fold(raw);
    const i = f.s.indexOf(q);
    if (i === -1) continue;
    const w = WEIGHT[kind] ?? 2;
    if (best && best.weight <= w) continue;
    best = { kind, weight: w, ...excerpt(f, i, q.length) };
    if (w === 0) break; // 제목·이름보다 앞설 자리는 없다
  }
  return best;
}

/**
 * 사이트 전체에서 찾는다. 결과는 종류별로 묶여 나온다.
 * 비공개(hidden)와 영문판 제외(hideInEn) 작업은 뺀다 — 판정은 ui.js 의 shownInLang() 하나.
 */
export function search(site, query) {
  const q = foldQuery(query);
  if (q.length < 2) return null;

  const groups = { work: [], producer: [], artist: [], other: [] };

  const works = (site.works || []).filter(shownInLang).sort(byYear);
  works.forEach((w, i) => {
    const hit = scan(workFields(w), q);
    if (hit) groups.work.push({ ...hit, order: i, title: t(w.title), url: pageUrl('work', w.id) });
  });
  (site.producers || []).forEach((p, i) => {
    const hit = scan(producerFields(p), q);
    if (hit) groups.producer.push({ ...hit, order: i, title: t(p.name), url: pageUrl('producer', p.id) });
  });
  (site.artists || []).forEach((a, i) => {
    const hit = scan(artistFields(a), q);
    if (hit) groups.artist.push({ ...hit, order: i, title: t(a.name), url: pageUrl('artist', a.id) });
  });
  const ab = scan(aboutFields(site.about), q);
  if (ab) groups.other.push({ ...ab, order: 0, title: 'About', url: pageUrl('about') });

  /* 무게가 먼저, 같으면 각 목록의 본래 차례(작업은 Works 정렬)를 따른다. */
  for (const k of Object.keys(groups)) groups[k].sort((a, b) => a.weight - b.weight || a.order - b.order);
  const total = Object.values(groups).reduce((n, g) => n + g.length, 0);
  return { groups, total };
}

/* ---------- 화면 ---------- */

function resultRow(r) {
  const where = el('span.sr-where.meta', { text: t(F[r.kind] || F.body) });
  const line =
    r.weight === 0
      ? null
      : el('p.sr-ex', null,
          el('span', { text: r.before }),
          el('mark', { text: r.hit }),
          el('span', { text: r.after }));
  /* 제목의 ⬡ 은 폰트에 맡기지 않고 SVG 로 그린다(CLAUDE.md 함정 5). */
  return link(r.url, '.sr-row', { 'aria-label': titleText(r.title) },
    el('span.sr-head', null, el('span.sr-title', null, titleNodes(r.title)), where),
    line);
}

let open = false;

/** 돋보기 층을 연다. 닫히면 원래 눌렀던 버튼으로 포커스를 돌려준다. */
export function openSearch(site, opener) {
  if (open) return;
  open = true;

  const input = el('input.sr-input', {
    type: 'search',
    autocomplete: 'off',
    'aria-label': t(L.open),
    placeholder: t(L.ph),
  });
  const close = el('button.sr-x', { type: 'button', 'aria-label': t(L.close) }, '✕');
  const count = el('p.sr-count.meta');
  const body = el('div.sr-body', { role: 'region', 'aria-live': 'polite' });

  const panel = el('div.sr-panel', null,
    el('div.sr-head-row', null, input, close), count, body);
  const overlay = el('div.sr-overlay', {
    role: 'dialog', 'aria-modal': 'true', 'aria-label': t(L.open),
  }, panel);

  const draw = () => {
    const res = search(site, input.value);
    body.replaceChildren();
    if (!res) {
      count.textContent = input.value.trim() ? t(L.hint) : '';
      return;
    }
    count.textContent = t(L.count)(res.total);
    if (!res.total) {
      body.append(el('p.sr-empty', { text: t(L.empty) }));
      return;
    }
    for (const key of ['work', 'producer', 'artist', 'other']) {
      const rows = res.groups[key];
      if (!rows.length) continue;
      body.append(
        el('section.sr-group', null,
          el('h2.sr-gtitle.meta', { text: t(G[key]) }),
          el('div.sr-rows', null, ...rows.map(resultRow)))
      );
    }
  };

  const shut = () => {
    open = false;
    overlay.remove();
    document.body.classList.remove('menu-open');
    document.removeEventListener('keydown', onKey);
    opener?.setAttribute?.('aria-expanded', 'false');
    opener?.focus?.();
  };
  const onKey = (e) => e.key === 'Escape' && shut();

  input.addEventListener('input', draw);
  close.addEventListener('click', shut);
  /* 배경을 누르면 닫힌다. 판 안쪽을 누른 것은 여기까지 올라오지 않게 막는다. */
  overlay.addEventListener('click', (e) => e.target === overlay && shut());
  panel.addEventListener('click', (e) => e.stopPropagation?.());
  document.addEventListener('keydown', onKey);

  document.body.append(overlay);
  document.body.classList.add('menu-open');
  opener?.setAttribute?.('aria-expanded', 'true');
  input.focus();
}

/** 상단 메뉴에 놓는 돋보기 버튼. */
export function searchButton(site) {
  const b = el('button.sr-open', {
    type: 'button',
    'aria-label': t(L.open),
    'aria-expanded': 'false',
  });
  b.innerHTML =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" ' +
    'stroke-width="1.8" stroke-linecap="round" aria-hidden="true">' +
    '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.4 15.4 20.5 20.5"/></svg>';
  b.addEventListener('click', () => openSearch(site, b));
  return b;
}
