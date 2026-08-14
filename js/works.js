/* works.js — 작업 인덱스.
   전체/공연/프로젝트 토글과 프로듀서 색점 필터는 동시에 걸린다. */

import { loadSite } from './data.js';
import { t } from './i18n.js';
import {
  el, injectProducerColors, dots, fieldClass, titleNodes, titleText,
  topBar, footer, pageUrl, link, coverImage,
} from './ui.js';

const TYPES = [
  { key: 'all', label: '전체' },
  { key: 'performance', label: '공연' },
  { key: 'project', label: '프로젝트' },
];

const typeLabel = (w) => (w.type === 'performance' ? 'Production' : 'Project');

/* 표지가 없는 카드의 색면 비율. 메이슨리가 밋밋해지지 않게 돌려 쓴다.
   비율은 CSS 클래스로만 준다 — 인라인 style 금지. */
const AR_COUNT = 6;

const state = { type: 'all', producer: null };

/* ---------- 주소와 상태 ---------- */

function readQuery() {
  const q = new URLSearchParams(location.search);
  const type = q.get('type');
  if (TYPES.some((x) => x.key === type)) state.type = type;
  const p = q.get('producer');
  if (p) state.producer = p;
}

function writeQuery() {
  const q = new URLSearchParams();
  if (state.type !== 'all') q.set('type', state.type);
  if (state.producer) q.set('producer', state.producer);
  const s = q.toString();
  history.replaceState(null, '', s ? `?${s}` : location.pathname);
}

const filtered = (works) =>
  works.filter(
    (w) =>
      (state.type === 'all' || w.type === state.type) &&
      (!state.producer || (w.producers || []).includes(state.producer))
  );

/* ---------- 카드 ---------- */

function coverBlock(work, i) {
  /* 표지가 없으면 담당 프로듀서 색면. 담당 미지정이면 라벤더. */
  return el(
    `span.block.${fieldClass(work.producers)}.ar-${(i % AR_COUNT) + 1}`,
    null,
    el('i.blob-card'),
    el('span.block-t', { text: typeLabel(work) })
  );
}

function cardVisual(work, i) {
  if (!work.cover) return coverBlock(work, i);
  return el(
    'span.wrapimg',
    null,
    work.coverTemp ? el('span.tmp', { text: '임시 이미지' }) : null,
    coverImage(work.cover, () => coverBlock(work, i))
  );
}

function card(work, i, producerById) {
  return link(
    pageUrl('work', work.id),
    '.card',
    { 'aria-label': titleText(t(work.title)) },
    cardVisual(work, i),
    el('span.t', null, titleNodes(t(work.title))),
    el('span.a', { text: t(work.artist) }),
    el('span.m', null, dots(work.producers, producerById), el('span.yr', { text: work.year }))
  );
}

/* ---------- 필터 줄 ---------- */

function buildFilters(site, rerender) {
  const seg = el('span.seg', { role: 'group', 'aria-label': '종류' });
  for (const type of TYPES) {
    const b = el('button', { type: 'button', text: type.label, 'data-type': type.key });
    b.addEventListener('click', () => {
      state.type = type.key;
      rerender();
    });
    seg.append(b);
  }

  const pdots = el('span.dots', { role: 'group', 'aria-label': '프로듀서' });
  for (const p of site.producers) {
    const b = el(`button.dot.dot-${p.id}`, {
      type: 'button',
      'data-producer': p.id,
      'aria-label': t(p.name),
      title: t(p.name),
    });
    b.addEventListener('click', () => {
      /* 같은 점을 다시 누르면 해제. 색점을 누르면 그 사람의 작업만 남는다. */
      state.producer = state.producer === p.id ? null : p.id;
      rerender();
    });
    pdots.append(b);
  }

  document.getElementById('seg').replaceWith(seg);
  document.getElementById('pdots').replaceWith(pdots);
  return { seg, pdots };
}

function syncFilterUI({ seg, pdots }) {
  for (const b of seg.children) {
    const on = b.dataset.type === state.type;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  }
  for (const b of pdots.children) {
    const on = b.dataset.producer === state.producer;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  }
}

/* ---------- 그리기 ---------- */

function render(site, ui) {
  const list = filtered(site.works);

  syncFilterUI(ui);

  const typeName = TYPES.find((x) => x.key === state.type).label;
  const who = state.producer ? site.producerById.get(state.producer) : null;
  document.getElementById('works-h2').textContent = who ? `${typeName} · ${t(who.name)}` : typeName;

  const cards = document.getElementById('works-list');
  cards.replaceChildren(
    ...(list.length
      ? list.map((w, i) => card(w, i, site.producerById))
      : [el('p.empty', { text: '해당하는 작업이 없습니다.' })])
  );

  document.getElementById('works-count').textContent =
    list.length === site.works.length ? `${list.length}개` : `${list.length} / ${site.works.length}개`;

  writeQuery();
}

async function main() {
  try {
    const site = await loadSite();
    injectProducerColors(site.producers);

    document.getElementById('top-bar').replaceChildren(topBar(site.producers, 'works'));
    document.getElementById('works-footer').replaceChildren(footer());

    readQuery();
    const ui = buildFilters(site, () => render(site, ui));
    render(site, ui);
  } catch (err) {
    console.error(err);
    document.getElementById('works-list').append(
      el('p.load-error', { text: `데이터를 읽지 못했습니다. ${err.message}` })
    );
  }
}

main();
