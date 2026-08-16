/* ui.js — 여러 화면이 함께 쓰는 조각들.
   프로듀서 색 주입 · 색점 · 로고 · 특수문자 SVG · 작은 DOM 헬퍼. */

import { t, lang, isEn, setLang } from './i18n.js';

/* ---------- DOM 헬퍼 ---------- */

/** el('a.cell.c-cream', {href:'#/works'}, child, child…) */
export function el(spec, attrs, ...children) {
  const [tag, ...classes] = spec.split('.');
  const node = document.createElement(tag || 'div');
  if (classes.length) node.classList.add(...classes);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'text') node.textContent = v;
    else if (k.startsWith('--')) node.style.setProperty(k, v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c);
  }
  return node;
}

/* ---------- 어느 페이지가 이미 있는가 ---------- */

/**
 * 사이트에서 링크가 걸리는 곳은 전부 여기를 거친다.
 * 아직 만들지 않은 페이지는 null 로 두면 링크가 걸리지 않고 그냥 글자로 나온다.
 * 페이지를 만들면 이 표에서 한 줄만 고치면 사이트 전체의 링크가 한꺼번에 살아난다.
 */
const PAGES = {
  home: () => 'index.html',
  works: (query) => 'works.html' + (query || ''),
  artists: () => 'artists.html',
  archive: () => 'archive.html',
  about: () => 'about.html',
  /* Contact 은 페이지가 아니라 About 맨 아래 블록이다. */
  contact: () => 'about.html#contact',
  work: (id) => `work.html?id=${id}`,
  /* 네 사람 모두 페이지가 있다. 데이터가 비었는지로 링크를 막지 않는다 —
     소개문이 없어도 색면·이름·이메일만으로 페이지가 성립한다. */
  producer: (id) => `producers/${id}.html`,
  artist: (id) => `artists/${id}.html`,
};

/** 있는 페이지면 주소를, 없으면 빈 문자열을 돌려준다. */
export function pageUrl(kind, arg) {
  const make = PAGES[kind];
  if (!make) return '';
  return withLang(make(arg));
}

/**
 * 영문 화면에서는 사이트 안의 모든 링크에 ?lang=en 을 달고 다닌다.
 * 링크 한 번에 국문으로 돌아가 버리면 토글이 있으나 마나다.
 * 국문일 때는 아무것도 붙이지 않는다 — 국문이 기본이므로 주소가 깨끗하다.
 */
export function withLang(url) {
  if (!isEn() || !url) return url;
  const [path, hash = ''] = url.split('#');
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}lang=en${hash ? `#${hash}` : ''}`;
}

/**
 * 주소가 있으면 <a>, 없으면 같은 모양의 <span>.
 * 아직 없는 페이지로 가는 링크가 404 를 내지 않게 한다.
 */
export function link(url, spec, attrs, ...children) {
  const node = el((url ? 'a' : 'span') + spec, url ? { ...attrs, href: url } : attrs, ...children);
  if (!url) node.classList.add('inert');
  return node;
}

/* ---------- 회차에서 뽑는 것들 ----------
   Works · Archive · 홈 NOW · 작업 상세가 모두 이 함수들을 쓴다.
   같은 계산을 여러 파일에 복사해 두면 한쪽만 고쳐져 화면끼리 어긋난다. */

/** 가장 최근 회차의 끝 날짜. 회차가 없으면 시작 연도로 대신한다. */
export function latestRun(w) {
  const ends = (w.runs || []).map((r) => r.end || r.start).filter(Boolean);
  return ends.length ? ends.sort().at(-1) : `${w.yearFrom || 0}-00-00`;
}

/** 마지막 회차의 연도(숫자). 회차가 없으면 yearFrom. */
export const lastYear = (w) => Number(latestRun(w).slice(0, 4)) || 0;

/** 회차의 최소~최대 연도. 회차가 없으면 works.json 에 적힌 year 를 그대로 쓴다. */
export function yearSpan(w) {
  const ys = (w.runs || []).flatMap((r) => [r.start, r.end]).filter(Boolean).map((d) => d.slice(0, 4));
  if (!ys.length) return w.year || '';
  const lo = ys.reduce((a, b) => (a < b ? a : b));
  const hi = ys.reduce((a, b) => (a > b ? a : b));
  return lo === hi ? lo : `${lo}–${hi.slice(2)}`;
}

/** 회차가 열린 도시들. 같은 도시는 한 번만. */
export const runCities = (w) => [...new Set((w.runs || []).map((r) => t(r.city)).filter(Boolean))];

/**
 * 같은 장소에서 하루씩 이어지는 회차를 한 덩어리로 묶는다.
 *   10.15 · 10.16 · 10.17  →  10.15–17
 *
 * 시간이 다르면 회차를 나눠 적어야 하는데(상세의 '일정'에 시간이 나와야 하므로),
 * 그 세 줄이 Works 카드와 홈 NOW 에까지 그대로 나오면 목록이 같은 작업으로 길어진다.
 * 묶는 것은 짧게 적는 화면뿐이고, 상세의 '일정'은 원래 회차를 그대로 쓴다.
 *
 * 날짜를 손으로 적어 둔 회차(date)는 건드리지 않는다 — 사람이 정한 표기다.
 */
export function mergeRuns(runs) {
  const dayAfter = (iso) => {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  };
  const last = (r) => r.end || r.start;

  const out = [];
  for (const r of [...(runs || [])].sort((a, b) => (a.start < b.start ? -1 : 1))) {
    const prev = out.at(-1);
    const joinable =
      prev &&
      !t(prev.date) && !t(r.date) &&
      t(prev.venue) === t(r.venue) &&
      r.start <= dayAfter(last(prev));      // 이어지거나 겹칠 때만
    if (joinable) {
      if (last(r) > last(prev)) prev.end = last(r);
      continue;
    }
    out.push({ ...r });
  }
  return out;
}

/* ---------- Works 인가 Archive 인가 ----------
   판정은 여기 한 곳에서만 한다. */

/* 아카이브 표기는 어디서나 이 문자열을 쓴다 — 페이지 제목·메뉴·링크가 따로 놀지 않게.
   연도 범위는 자동 계산하지 않는다. 데이터가 채워지는 동안 숫자가 들쭉날쭉해지기 때문. */
export const ARCHIVE_LABEL = 'Archive 2014–';

/**
 * works.json 의 archive 필드로만 가른다. 연도로 자동 판정하지 않는다.
 *   archive: true  → 아카이브
 *   없거나 false   → Works
 *
 * 기준은 사람이 정한다 — 완전히 끝나 재공연·투어 가능성이 없는 것만 true.
 * 연도로 자동 판정하면 몇 해 쉬었다 다시 오르는 작업이 제멋대로 넘어간다.
 */
export const isArchive = (work) => work.archive === true;

export const isCurrent = (work) => !isArchive(work);

/* ---------- 프로듀서 색 ---------- */

/**
 * data/producers.json 의 색을 CSS 커스텀 프로퍼티로 주입한다.
 * 색값은 JSON 에만 있고 CSS·JS 어디에도 하드코딩되어 있지 않다.
 *
 *   :root { --p-jisun-field: …; --p-jisun-dot: …; --p-jisun-on: … }
 *   .field-jisun { background: …; color: … }
 *   .dot-jisun   { background: … }      ← 크림 위에서는 언제나 진한 짝
 */
export function injectProducerColors(producers) {
  const vars = [];
  const rules = [];
  for (const p of producers) {
    const c = p.color;
    vars.push(
      `--p-${p.id}-field:${c.field}`,
      `--p-${p.id}-dot:${c.dot}`,
      `--p-${p.id}-point:${c.point || c.field}`,
      `--p-${p.id}-on:${c.on}`
    );
    rules.push(
      `.field-${p.id}{background:var(--p-${p.id}-field);color:var(--p-${p.id}-on)}`,
      /* 점은 면 색을 그대로 쓰고 얇은 잉크 테두리로 크림 위에서도 보이게 한다.
         진한 짝(dot)은 글자에만 쓴다 — 점에 쓰면 노랑이 올리브로 보인다. */
      `.dot-${p.id}{background:var(--p-${p.id}-point);box-shadow:inset 0 0 0 .5px var(--dot-edge)}`,
      `.text-${p.id}{color:var(--p-${p.id}-dot)}`
    );
  }
  const style = document.createElement('style');
  style.id = 'producer-colors';
  style.textContent = `:root{${vars.join(';')}}\n${rules.join('\n')}`;
  document.head.append(style);
}

/** 담당 프로듀서 색점. 미지정이면 빈 원(라벤더 테두리). */
export function dots(producerIds, producerById) {
  const wrap = el('span.who');
  if (!producerIds || !producerIds.length) {
    wrap.append(el('i.dot.none', { title: '담당 미지정', 'aria-label': '담당 미지정' }));
    return wrap;
  }
  for (const id of producerIds) {
    const p = producerById.get(id);
    if (!p) continue;
    wrap.append(el(`i.dot.dot-${p.id}`, { title: t(p.name), 'aria-label': t(p.name) }));
  }
  return wrap;
}

/* ---------- 프로듀서 색면 칸 ----------
   홈 모자이크와 About 이 같은 것을 쓴다. 두 벌로 두면 한쪽만 고쳐져 어긋난다
   (실제로 About 쪽만 링크가 아니어서 색면이 눌리지 않았다).

   칸 전체가 링크다. 안에 다른 링크를 넣지 않는다 — <a> 안에 <a> 는 안 된다.
   이메일은 About 맨 아래 Contact 블록에만 둔다. */
/* role: false 면 역할 라벨을 넣지 않는다 — 칸 밖에 이미 라벨이 있는 화면(홈)용. */
export function producerTile(p, { media = null, extraClass = '', roleLang, role = true } = {}) {
  return link(
    pageUrl('producer', p.id),
    `.ptile.field-${p.id}${p.color.dark ? '.on-dark' : ''}${extraClass}`,
    { 'aria-label': t(p.name) },
    media,
    role ? el('span.meta.num', { text: roleLang ? t(p.role, roleLang) : t(p.role) }) : null,
    el(
      'span.ptile-name',
      null,
      el('h3', { text: t(p.name, 'en') }),
      el('span.sub', { text: t(p.name, 'ko') })
    )
  );
}

/** 그 작업의 면 색 클래스. 담당 미지정이면 구조색인 라벤더. */
export function fieldClass(producerIds) {
  return producerIds && producerIds.length ? `field-${producerIds[0]}` : 'c-lav';
}

/* ---------- 카테고리 배지 ---------- */

/**
 * 일의 종류를 제목 앞에 네모로 표시한다. 카드와 작업 상세가 같은 것을 쓴다.
 *
 * 색은 절대 쓰지 않는다 — 네 가지 색은 사람(담당 프로듀서)을 가리키는 표시이고
 * 카테고리는 일의 종류다. 둘이 섞이면 색이 무엇을 뜻하는지 알 수 없게 된다.
 * 그래서 배지는 잉크색 얇은 테두리 + 잉크 글씨뿐이다.
 *
 * 카테고리가 아직 안 정해진 작업은 아무것도 그리지 않는다(빈 네모를 두지 않는다).
 */
export function categoryBadge(work) {
  const label = categoryLabel(work);
  return label ? el('span.cat.meta', { text: label }) : null;
}

/* ---------- 형식(카테고리) ----------
   키는 데이터의 영문 이름에서 뽑는다 — 국문 표기가 바뀌어도 주소와 필터는 그대로다.
   화면에 적는 영문 라벨만 여기서 정한다. 배지와 필터가 같은 말을 쓰게 하기 위한 것 —
   한쪽은 'Production', 다른 쪽은 'Performance' 가 되면 같은 것인지 알 수 없다. */

const CATEGORY_EN = {
  production: 'Performance',
  research: 'Research',
  'network-and-conference': 'Network & Conference',
  festival: 'Festival',
  residency: 'Residency',
  'doongji-230': 'Doongji230',
};

export const categoryKey = (work) =>
  (t(work.category, 'en') || '').toLowerCase().replace(/\s+/g, '-');

export const categoryLabel = (work) =>
  isEn() ? CATEGORY_EN[categoryKey(work)] || t(work.category, 'en') : t(work.category);

/** 키로 바로 영문 라벨을 얻는다(필터 버튼용). */
export const categoryLabelByKey = (key) => CATEGORY_EN[key] || key;

/* ---------- 영문판에서 감추는 작업 ----------
   works.json 의 hideInEn 이 true 면 영문 목록 어디에도 나오지 않는다.
   국문 목록에는 그대로 남는다. 목록을 만드는 곳은 모두 이 함수를 거친다 —
   한 곳만 빠뜨리면 감췄다고 믿는 작업이 그 화면에만 남는다. */
export const shownInLang = (work) => !(isEn() && work.hideInEn === true);
export const visibleWorks = (works) => (works || []).filter(shownInLang);

/* ---------- 특수문자는 폰트에 맡기지 않는다 (함정 5) ---------- */

const HEX_TOKEN = /\{hex\}/g;

function hexSvg() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 20 22');
  svg.setAttribute('class', 'glyph-hex');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', 'M10 1 19 6.25v10.5L10 22 1 16.75V6.25Z');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.6');
  path.setAttribute('stroke-linejoin', 'round');
  svg.append(path);
  return svg;
}

/**
 * 제목 문자열의 {hex} 토큰을 SVG 육각형으로 바꾼 조각을 돌려준다.
 * 〈⬡⬡의 섬〉은 환경에 따라 ○○ 로 보이므로 글리프에 기대지 않는다.
 */
export function titleNodes(str) {
  const frag = document.createDocumentFragment();
  const parts = String(str).split(HEX_TOKEN);
  parts.forEach((part, i) => {
    if (part) frag.append(document.createTextNode(part));
    if (i < parts.length - 1) frag.append(hexSvg());
  });
  return frag;
}

/** 화면 밖(aria-label, title, alt)에서 쓸 평문. 여기서는 폰트가 관여하지 않는다. */
export function titleText(str) {
  return String(str).replace(HEX_TOKEN, '⬡');
}

/* ---------- 로고 ---------- */

/**
 * 검정 로고 + 액센트 점 하나.
 * 액센트 점 색은 페이지마다 네 색 중 무작위. 그 페이지의 면 색은 제외한다.
 */
export function logo(producers, exclude = []) {
  const wrap = el('span.logo', { 'aria-hidden': 'true' });
  wrap.append(el('i.half'), el('i.half'), el('i.full'), el('i.half'));

  const pool = producers.filter((p) => !exclude.includes(p.id));
  const pick = (pool.length ? pool : producers)[Math.floor(Math.random() * (pool.length || producers.length))];
  wrap.append(el(`i.accent.dot-${pick.id}`));
  return wrap;
}

/* ---------- 사진 ---------- */

/* ---------- 프로듀서 얼굴 사진 ---------- */

const FACE_TRIES = 8; //  producers.json 에 목록이 없을 때 img/producers/<id>-01.jpg … -08.jpg 를 두드려 본다

const nn = (n) => String(n).padStart(2, '0');

export const shuffle = (xs) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * 그 사람의 얼굴 사진 후보. 페이지를 열 때마다 차례가 섞이므로
 * 뜨는 것 중 하나가 무작위로 걸린다.
 *
 * where='about' 이면 aboutPhotos 를 먼저 본다 — About 의 원은 작아서
 * 얼굴이 크게 나온 사진만 골라 써야 하기 때문. 없으면 photos 전체를 쓴다.
 */
export const faceCandidates = (p, where) => {
  const list =
    (where === 'about' && p.aboutPhotos?.length ? p.aboutPhotos : null) ||
    (p.photos?.length ? p.photos : null) ||
    Array.from({ length: FACE_TRIES }, (_, i) => `img/producers/${p.id}-${nn(i + 1)}.jpg`);
  return shuffle(list);
};

/* ---------- 사진 크레딧 ----------
   예술가 사진과 작업 사진이 같은 규칙을 쓴다 — 두 벌을 두면 한쪽만 고쳐진다.

   유형은 creditType 이 정한다: '촬영' · '제공'.
   적혀 있지 않으면 앞말을 붙이지 않고 이름만 적는다 —
   'ⓒJisun' 처럼 표기가 이미 문자열 안에 있는 경우다('촬영 ⓒJisun' 이 되면 안 된다). */

const CREDIT_TYPE = {
  촬영: { ko: '촬영', en: 'Photo' },
  제공: { ko: '제공', en: 'Courtesy' },
};

/**
 * 크레딧 한 줄. 없으면 null 이라 자리도 생기지 않는다.
 *   photoCreditShow: false  → 기록은 남기고 화면에만 내지 않는다
 *   note                    → 크레딧이 없을 때 그 자리에 사유를 적는다(교체 예정 임시 사진)
 */
export function creditLine({ photoCredit, creditType, photoCreditShow, note } = {}) {
  const who = t(photoCredit);
  if (!who) return t(note) ? el('p.credit.meta', { text: t(note) }) : null;
  if (photoCreditShow === false) return null;

  const kind = CREDIT_TYPE[creditType];
  return el('p.credit.meta', { text: kind ? `${t(kind)} ${who}` : who });
}

/** 파일명이 TEMP- 로 시작하면 임시 이미지다. 폴더에 넣을 때 붙이는 표시. */
export function isTempFile(src) {
  return /(^|\/)TEMP-/.test(src || '');
}

/** 작업 표지로 시도할 경로들 — cover 먼저, 없으면 01.jpg, 그 다음 poster.jpg. */
export function coverCandidates(work) {
  return [work.cover, `img/works/${work.id}/01.jpg`, `img/works/${work.id}/poster.jpg`].filter(
    (v, i, all) => v && all.indexOf(v) === i
  );
}

/**
 * 후보 경로를 차례로 시도하는 사진.
 * 전부 실패하면 fallback() 으로 갈아끼운다 — 색면 + '사진 준비 중'.
 * onResolved 에는 실제로 뜬 경로가 들어온다(TEMP- 판정용).
 *
 * 폴더에 파일만 넣으면 JSON 을 고치지 않아도 사진이 뜨게 하기 위한 것.
 */
export function photo(candidates, fallback, onResolved) {
  const list = (candidates || []).filter(Boolean);
  const img = el('img.cover', { alt: '', loading: 'lazy' });
  let next = 0;

  const advance = () => {
    if (next >= list.length) {
      img.replaceWith(fallback());
      return;
    }
    img.src = list[next++];
  };

  img.addEventListener('error', advance);
  img.addEventListener('load', () => onResolved && onResolved(img.getAttribute('src')));
  advance();
  return img;
}

/* ---------- 상단 메뉴 (홈 말고 모든 페이지) ---------- */

/** 메뉴는 Works · Artists · About 셋. 메뉴에는 프로듀서 색을 쓰지 않는다. */
const NAV = [
  ['about', 'About'],
  ['works', 'Works'],
  ['artists', 'Artists'],
  ['archive', 'Archive'],
  ['contact', 'Contact'],
];

/* ---------- KO / EN 토글 ----------
   메뉴 오른쪽 끝, Contact 다음. 지금 보고 있는 쪽이 진하다.
   버튼이지 링크가 아니다 — 어느 페이지에 있든 그 자리에 머문 채 언어만 바뀐다. */
export function langToggle(extraClass = '') {
  const box = el(`span.langswitch.meta${extraClass}`, { role: 'group', 'aria-label': '언어' });
  const pick = (code, label) => {
    const on = lang.current === code;
    const b = el(`button.lang${on ? '.on' : ''}`, {
      type: 'button',
      text: label,
      'aria-pressed': String(on),
      lang: code,
    });
    if (!on) b.addEventListener('click', () => setLang(code));
    return b;
  };
  box.append(pick('ko', 'KO'), el('span.lang-sep', { text: '/' }), pick('en', 'EN'));
  return box;
}

export function topBar(producers, here, about) {
  const nav = el('nav');
  for (const [kind, label] of NAV) {
    const url = pageUrl(kind);
    const item = link(url, kind === here ? '.here' : '', null, label);
    nav.append(item);
  }

  /* 햄버거는 모바일에서만 보인다(CSS). Contact 는 상단 메뉴에 넣지 않는다 —
     모바일 메뉴·푸터·About 맨 아래, 세 군데에만 둔다. */
  const burger = el('button.burger', { type: 'button', 'aria-label': '메뉴 열기', 'aria-expanded': 'false' });
  burger.append(el('span.burger-i', { 'aria-hidden': 'true' }));
  burger.addEventListener('click', () => openMenu(about, burger));

  return el(
    'div.bar',
    null,
    link(pageUrl('home'), '.logo-link', { 'aria-label': '홈' }, logo(producers)),
    link(pageUrl('home'), '.wordmark', null, 'PRODUCER GROUP ', el('span.wordmark-light', { text: 'DOT' })),
    nav,
    el('span.spacer'),
    langToggle(),
    burger
  );
}

/* ---------- 모바일 전체화면 메뉴 ---------- */

/* 라벤더는 구조색이라 메뉴에 쓸 수 있다. 프로듀서 네 색은 사람을 가리키므로 쓰지 않는다.
   항목은 위 NAV 하나만 쓴다 — 두 벌을 두면 한쪽만 고쳐져 어긋난다. */

function openMenu(about, burger) {
  const close = el('button.menu-x', { type: 'button', 'aria-label': '메뉴 닫기' }, '✕');

  /* 데스크톱 상단 메뉴와 같은 배열(NAV)을 쓴다. 항목 전체가 눌린다. */
  const list = el('nav.menu-list');
  for (const [kind, label] of NAV) {
    list.append(link(pageUrl(kind), '.menu-item', null, el('span', { text: label })));
  }

  const socials = el('div.menu-social');
  socials.append(...socialLinks());   // 푸터와 같은 세 개

  /* 모바일에서는 상단 메뉴가 햄버거 안으로 들어가므로 토글도 여기 둔다. */
  const langs = langToggle('.menu-lang');

  const overlay = el('div.menu-overlay', { role: 'dialog', 'aria-modal': 'true', 'aria-label': '메뉴' },
    close, list, langs, socials,
    about?.email ? el('a.menu-mail', { href: `mailto:${about.email}`, text: about.email }) : null);

  const shut = () => {
    overlay.remove();
    document.body.classList.remove('menu-open'); // 뒤쪽 스크롤 잠금 해제
    burger.setAttribute('aria-expanded', 'false');
    burger.focus();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => e.key === 'Escape' && shut();

  close.addEventListener('click', shut);
  document.addEventListener('keydown', onKey);

  document.body.append(overlay);
  document.body.classList.add('menu-open'); // 열려 있는 동안 뒤쪽 스크롤 잠금
  burger.setAttribute('aria-expanded', 'true');
  close.focus();
}

/* ---------- 푸터 ---------- */

const ICONS = {
  instagram:
    '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"/>',
  youtube:
    '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10.4 9.6l5 2.4-5 2.4z" fill="currentColor" stroke="none"/>',
  facebook:
    '<path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.6A22 22 0 0 0 14.3 3.5c-2.4 0-4 1.45-4 4.1v2.3H7.6V13h2.7v8z" fill="currentColor" stroke="none"/>',
};

function sico(href, label, key) {
  const a = el('a.sico', { href, target: '_blank', rel: 'noopener', 'aria-label': label });
  a.innerHTML = `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">${ICONS[key]}</svg>`;
  return a;
}

/** 모든 화면이 같은 SNS 세 개를 쓴다 — 푸터와 모바일 메뉴가 어긋나지 않게. */
export function socialLinks() {
  return [
    sico('https://www.youtube.com/channel/UCW_8rEDfkNiyIS9J8axn0LA', 'YouTube', 'youtube'),
    sico('https://www.instagram.com/producergroupdot/', 'Instagram', 'instagram'),
    /* ?locale=ko_KR 은 붙이지 않는다 — 방문자 언어에 따라 페이스북이 알아서 잡는다. */
    sico('https://www.facebook.com/producergroupdot/', 'Facebook', 'facebook'),
  ];
}

/** 왼쪽 Contact · Archive / 오른쪽 유튜브 · 인스타그램 · 페이스북. 모든 페이지 공통. */
export function footer() {
  return el(
    'footer',
    null,
    el('span.foot-l', null, link(pageUrl('contact'), '.meta', null, 'Contact')),
    el('span.spacer'),
    /* 홈에는 상단 메뉴바가 없다. 푸터에 토글이 없으면 홈에서 영문으로 갈 길이 없다. */
    langToggle('.foot-lang'),
    el('span.foot-r', null, ...socialLinks())
  );
}
