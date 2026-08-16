/* works.js — 작업 인덱스.
   전체/공연/프로젝트 토글과 프로듀서 색점 필터는 동시에 걸린다. */

import { loadSite } from './data.js';
import { t, isEn } from './i18n.js';
import {
  el, injectProducerColors, dots, fieldClass, titleNodes, titleText,
  topBar, footer, pageUrl, link, photo, coverCandidates, isTempFile, categoryBadge,
  latestRun, yearSpan, runCities, isArchive, ARCHIVE_LABEL,
  categoryKey, categoryLabelByKey, visibleWorks,
} from './ui.js';

/* 상단 필터. 카테고리(일의 종류)로 거른다.
   data 의 type(공연/프로젝트)은 홈의 개수 표시에 쓰이므로 그대로 남아 있다. */
const CATEGORIES = [
  { key: 'all', label: '전체', en: 'All' },
  { key: 'production', label: '공연' },
  { key: 'research', label: '리서치' },
  { key: 'network-and-conference', label: '네트워크·컨퍼런스' },
  { key: 'festival', label: '축제' },
  { key: 'residency', label: '레지던시' },
  { key: 'doongji-230', label: '둥지230' },
];

/* 영문 라벨은 ui.js 한 곳에서 온다 — 카드의 배지와 같은 말을 쓰게 하기 위해서. */
const catLabel = (cat) =>
  isEn() ? (cat.key === 'all' ? 'All' : categoryLabelByKey(cat.key)) : cat.label;

/**
 * 그 언어에 실제로 항목이 있는 형식만 남긴다.
 * 영문판에서 월간 할머니들이 빠지면 '둥지230' 에 남는 것이 없으므로 버튼도 사라진다 —
 * 눌러도 아무것도 안 나오는 버튼은 고장으로 보인다.
 */
const usedCategories = (works) => {
  const keys = new Set(works.filter((w) => !isArchive(w)).map(categoryKey));
  return CATEGORIES.filter((c) => c.key === 'all' || keys.has(c.key));
};

const typeLabel = (w) => (w.type === 'performance' ? 'Production' : 'Project');

/* 표지가 없는 카드의 색면 비율. 메이슨리가 밋밋해지지 않게 돌려 쓴다.
   비율은 CSS 클래스로만 준다 — 인라인 style 금지. */
const AR_COUNT = 6;

const state = { category: 'all', producer: null };

/* ---------- 차례 ---------- */

/** '2025–' 처럼 끝이 열려 있거나 status 가 ongoing 이면 진행 중으로 본다. */
const isOngoing = (w) => w.status === 'ongoing' || /[–-]\s*$/.test(w.year || '');

/* 회차에서 뽑는 것들(latestRun · yearSpan · runCities)은 ui.js 에 있다. */

/**
 * 차례는 works.json 의 order 가 정한다. 날짜로 자동 정렬하지 않는다 —
 * 무엇을 앞세울지는 사람이 정할 일이다.
 * order 가 없는 작업은 맨 뒤로 가고, 그 안에서만 최신 회차 순으로 늘어선다.
 * 필터는 걸러내기만 하고 차례는 건드리지 않는다.
 */
function byOrder(a, b) {
  const ao = a.order ?? Infinity;
  const bo = b.order ?? Infinity;
  if (ao !== bo) return ao - bo;
  return latestRun(b).localeCompare(latestRun(a)) || isOngoing(b) - isOngoing(a);
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

/* 카테고리 필터와 프로듀서 색점 필터는 동시에 걸린다.
   아카이브로 넘어간 작업은 여기 나오지 않는다(판정은 ui.js 의 isArchive 한 곳에서). */
const filtered = (works) =>
  visibleWorks(works)
    .filter((w) => !isArchive(w))
    .filter(
      (w) =>
        (state.category === 'all' || categoryKey(w) === state.category) &&
        (!state.producer || (w.producers || []).includes(state.producer))
    )
    .sort(byOrder);

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
    /* 값이 없는 줄은 아예 만들지 않는다 — 빈 span 은 빈 줄로 보인다.
       카드에는 리드를 쓰지 않는다(제목·예술가·연도까지만). */
    cardVisual(work, i),
    categoryBadge(work),
    el('span.t', null, titleNodes(t(work.title))),
    t(work.artist) ? el('span.a', { text: t(work.artist) }) : null,
    el(
      'span.m',
      null,
      dots(work.producers, producerById),
      yearSpan(work) ? el('span.yr', { text: yearSpan(work) }) : null
    ),
    /* 회차가 열린 도시. 회차가 없는 작업에는 줄이 생기지 않는다. */
    runCities(work).length ? el('span.cities.meta', { text: runCities(work).join(' · ') }) : null,
    /* 도트의 역할은 필터가 아니라 글자로만 보여준다 — 제작·공동제작·투어·기획. */
    t(work.dotRole) ? el('span.drole.meta', { text: t(work.dotRole) }) : null,
    /* 확인이 필요한 항목은 화면에 드러나 있어야 넷이 같이 볼 수 있다. */
    t(work.note) ? el('span.note-flag.meta', { text: t(work.note) }) : null
  );
}

/* ---------- 필터 줄 ---------- */

function buildFilters(site, rerender) {
  const seg = el('span.seg', { role: 'group', 'aria-label': '카테고리' });
  for (const cat of usedCategories(visibleWorks(site.works))) {
    const b = el('button', { type: 'button', text: catLabel(cat), 'data-category': cat.key });
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
  const current = visibleWorks(site.works).filter((w) => !isArchive(w));
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
    list.length === current.length ? `${list.length}개` : `${list.length} / ${current.length}개`;

  writeQuery();
}

async function main() {
  try {
    const site = await loadSite();
    injectProducerColors(site.producers);

    document.getElementById('top-bar').replaceChildren(topBar(site.producers, 'works', site.about));
    document.getElementById('works-footer').replaceChildren(footer());

    readQuery();
    /* 국문에서 복사한 주소를 영문으로 열면 없는 형식이 걸려 목록이 비어 보인다.
       그 언어에 없는 형식이면 전체로 되돌린다. */
    if (!usedCategories(visibleWorks(site.works)).some((c) => c.key === state.category)) {
      state.category = 'all';
    }
    const ui = buildFilters(site, () => render(site, ui));
    render(site, ui);

    /* 맨 아래 아카이브로 가는 한 줄. 표기는 ARCHIVE_LABEL 한 곳에서 온다. */
    document
      .getElementById('works-archive')
      .replaceChildren(link(pageUrl('archive'), '.arc-link', null, `${ARCHIVE_LABEL} →`));
  } catch (err) {
    console.error(err);
    document.getElementById('works-list').append(
      el('p.load-error', { text: `데이터를 읽지 못했습니다. ${err.message}` })
    );
  }
}

main();
