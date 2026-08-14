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
const PAGES = {
  home: () => 'index.html',
  works: (query) => 'works.html' + (query || ''),
  artists: null, //  만들면 → () => 'artists.html'
  about: null, //  만들면 → () => 'about.html'
  work: null, //  만들면 → (id) => `work.html?id=${id}`   (작업 상세)
  producer: null, //  만들면 → (id) => `producer.html?id=${id}`
  artist: null, //  만들면 → (id) => `artist.html?id=${id}`
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
  return el(
    'footer',
    null,
    el('span.meta', { text: '프로듀서그룹 도트 Producer Group DOT' }),
    sico('https://www.instagram.com/producergroupdot/', 'Instagram', 'instagram'),
    sico('https://www.youtube.com/channel/UCW_8rEDfkNiyIS9J8axn0LA', 'YouTube', 'youtube'),
    el('span.spacer'),
    el('span.meta.langswitch', { text: 'KO / EN' })
  );
}
