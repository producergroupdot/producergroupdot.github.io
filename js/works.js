/* works.js — 작업 인덱스.
   전체/공연/프로젝트 토글과 프로듀서 색점 필터는 동시에 걸린다. */

import { loadSite } from './data.js';
import { t } from './i18n.js';
import {
  el, injectProducerColors, dots, fieldClass, titleNodes, titleText,
  topBar, footer, pageUrl, link, photo, coverCandidates, isTempFile, categoryBadge,
} from './ui.js';

/* 상단 필터. 카테고리(일의 종류)로 거른다.
   data 의 type(공연/프로젝트)은 홈의 개수 표시에 쓰이므로 그대로 남아 있다. */
const CATEGORIES = [
  { key: 'all', label: '전체', en: '' },
  { key: 'production', label: '공연', en: 'Production' },
  { key: 'international-network', label: '국제 네트워크', en: 'International Network' },
  { key: 'residency', label: '레지던시', en: 'Residency' },
  { key: 'research', label: '리서치', en: 'Research' },
  { key: 'creative-programme', label: '창작 프로그램', en: 'Creative Programme' },
];

/** 영문 이름을 키로 삼는다 — 국문 표기가 바뀌어도 주소와 필터는 그대로다. */
const categoryKey = (work) =>
  (t(work.category, 'en') || '').toLowerCase().replace(/\s+/g, '-');

const typeLabel = (w) => (w.type === 'performance' ? 'Production' : 'Project');

/* 표지가 없는 카드의 색면 비율. 메이슨리가 밋밋해지지 않게 돌려 쓴다.
   비율은 CSS 클래스로만 준다 — 인라인 style 금지. */
const AR_COUNT = 6;

const state = { category: 'all', producer: null };

/* ---------- 차례 ---------- */

/** '2025–' 처럼 끝이 열려 있거나 status 가 ongoing 이면 진행 중으로 본다. */
const isOngoing = (w) => w.status === 'ongoing' || /[–-]\s*$/.test(w.year || '');

/**
 * 최근 것이 위로. 같은 연도면 진행 중인 것이 위로.
 * 연도는 '2025–26' 처럼 범위일 수 있어서 시작 연도(yearFrom)로 본다.
 */
function byRecency(a, b) {
  return (b.yearFrom || 0) - (a.yearFrom || 0) || isOngoing(b) - isOngoing(a);
}

/* ---------- 주소와 상태 ---------- */

function readQuery() {
  const q = new URLSearchParams(location.search);
  const c = q.get('category');
  if (CATEGORIES.some((x) => x.key === c)) state.category = c;
  const p = q.get('producer');
  if (p) state.producer = p;
}

function writeQuery() {
  const q = new URLSearchParams();
  if (state.category !== 'all') q.set('category', state.category);
  if (state.producer) q.set('producer', state.producer);
  const s = q.toString();
  history.replaceState(null, '', s ? `?${s}` : location.pathname);
}

/* 카테고리 필터와 프로듀서 색점 필터는 동시에 걸린다. */
const filtered = (works) =>
  works
    .filter(
      (w) =>
        (state.category === 'all' || categoryKey(w) === state.category) &&
        (!state.producer || (w.producers || []).includes(state.producer))
    )
    .sort(byRecency);

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
  const wrap = el('span.wrapimg');
  const tmp = el('span.tmp', { text: '임시 이미지' });

  const markTemp = () => {
    if (!tmp.parentNode) wrap.prepend(tmp);
  };
  if (work.coverTemp) markTemp();

  wrap.append(
    photo(
      coverCandidates(work),
      () => {
        tmp.remove(); // 색면으로 떨어졌으면 임시 라벨도 같이 걷는다
        return coverBlock(work, i);
      },
      (src) => isTempFile(src) && markTemp()
    )
  );
  return wrap;
}

function card(work, i, producerById) {
  return link(
    pageUrl('work', work.id),
    '.card',
    { 'aria-label': titleText(t(work.title)) },
    cardVisual(work, i),
    categoryBadge(work),
    el('span.t', null, titleNodes(t(work.title))),
    el('span.a', { text: t(work.artist) }),
    el('span.m', null, dots(work.producers, producerById), el('span.yr', { text: work.year })),
    /* 확인이 필요한 항목은 화면에 드러나 있어야 넷이 같이 볼 수 있다. */
    t(work.note) ? el('span.note-flag.meta', { text: t(work.note) }) : null
  );
}

/* ---------- 필터 줄 ---------- */

function buildFilters(site, rerender) {
  const seg = el('span.seg', { role: 'group', 'aria-label': '카테고리' });
  for (const cat of CATEGORIES) {
    const b = el('button', { type: 'button', text: cat.label, 'data-category': cat.key });
    b.addEventListener('click', () => {
      state.category = cat.key;
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
    const on = b.dataset.category === state.category;
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

  /* 무엇이 선택됐는지는 위 필터에 이미 드러나 있다. 큰 소제목으로 되풀이하지 않는다. */
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

    document.getElementById('top-bar').replaceChildren(topBar(site.producers, 'works', site.about));
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
