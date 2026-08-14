/* ui.js — 여러 화면이 함께 쓰는 조각들.
   프로듀서 색 주입 · 색점 · 로고 · 특수문자 SVG · 작은 DOM 헬퍼. */

import { t } from './i18n.js';

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
/* 프로듀서 상세는 한 사람씩 만들고 있다. 여기 적힌 사람만 링크가 걸린다. */
const PRODUCER_PAGES = new Set(['jisun']);

const PAGES = {
  home: () => 'index.html',
  works: (query) => 'works.html' + (query || ''),
  artists: () => 'artists.html',
  about: () => 'about.html',
  work: null, //  만들면 → (id) => `work.html?id=${id}`   (작업 상세)
  producer: (id) => (PRODUCER_PAGES.has(id) ? `producers/${id}.html` : ''),
  artist: (id) => `artists/${id}.html`,
};

/** 있는 페이지면 주소를, 없으면 빈 문자열을 돌려준다. */
export function pageUrl(kind, arg) {
  const make = PAGES[kind];
  return make ? make(arg) : '';
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
      `--p-${p.id}-on:${c.on}`
    );
    rules.push(
      `.field-${p.id}{background:var(--p-${p.id}-field);color:var(--p-${p.id}-on)}`,
      `.dot-${p.id}{background:var(--p-${p.id}-dot)}`
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
    wrap.append(el('i.none', { title: '담당 미지정', 'aria-label': '담당 미지정' }));
    return wrap;
  }
  for (const id of producerIds) {
    const p = producerById.get(id);
    if (!p) continue;
    wrap.append(el(`i.dot-${p.id}`, { title: t(p.name), 'aria-label': t(p.name) }));
  }
  return wrap;
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
  const label = t(work.category);
  return label ? el('span.cat.meta', { text: label }) : null;
}

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
  ['works', 'Works'],
  ['artists', 'Artists'],
  ['about', 'About'],
];

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
    el('span.meta.langswitch', { text: 'KO / EN' }),
    burger
  );
}

/* ---------- 모바일 전체화면 메뉴 ---------- */

/* 라벤더는 구조색이라 메뉴에 쓸 수 있다. 프로듀서 네 색은 사람을 가리키므로 쓰지 않는다. */
const MENU = [
  ['works', 'Works'],
  ['artists', 'Artists'],
  ['about', 'About'],
];

function openMenu(about, burger) {
  const close = el('button.menu-x', { type: 'button', 'aria-label': '메뉴 닫기' }, '✕');

  const list = el('nav.menu-list');
  for (const [kind, label] of MENU) {
    const url = pageUrl(kind);
    list.append(link(url, '.menu-item', null, el('span', { text: label }), el('span.arrow', { text: '→' })));
  }
  /* Contact 는 페이지가 아니라 About 맨 아래 블록으로 간다. */
  const contactUrl = pageUrl('about');
  list.append(
    link(contactUrl ? `${contactUrl}#contact` : '', '.menu-item', null,
      el('span', { text: 'Contact' }), el('span.arrow', { text: '→' }))
  );

  const socials = el('div.menu-social');
  socials.append(
    sico('https://www.instagram.com/producergroupdot/', 'Instagram', 'instagram'),
    sico('https://www.youtube.com/channel/UCW_8rEDfkNiyIS9J8axn0LA', 'YouTube', 'youtube'),
    sico('https://www.instagram.com/doongji230/', '둥지230 Instagram', 'instagram')
  );

  const overlay = el('div.menu-overlay', { role: 'dialog', 'aria-modal': 'true', 'aria-label': '메뉴' },
    close, list, socials,
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
};

function sico(href, label, key) {
  const a = el('a.sico', { href, target: '_blank', rel: 'noopener', 'aria-label': label });
  a.innerHTML = `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">${ICONS[key]}</svg>`;
  return a;
}

export function footer() {
  /* Contact 는 상단 메뉴에 없다. 여기와 모바일 메뉴, About 맨 아래 — 세 군데뿐이다. */
  const about = pageUrl('about');
  return el(
    'footer',
    null,
    el('span.meta', { text: '프로듀서그룹 도트 Producer Group DOT' }),
    sico('https://www.instagram.com/producergroupdot/', 'Instagram', 'instagram'),
    sico('https://www.youtube.com/channel/UCW_8rEDfkNiyIS9J8axn0LA', 'YouTube', 'youtube'),
    link(about ? `${about}#contact` : '', '.meta.foot-contact', null, 'Contact'),
    el('span.spacer'),
    el('span.meta.langswitch', { text: 'KO / EN' })
  );
}
