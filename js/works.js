/* works.js — 작업 인덱스.
   아카이브는 없어졌다. 지나온 작업도 여기 그대로 있고, 목록을 가르는 것은 필터뿐이다.

   필터는 넷이고 서로 곱해진다 — 형식 AND 시간 AND 장소 AND 프로듀서.
   형식만 늘 보이고, 나머지 셋은 '더 보기' 안에 접어 둔다. */

import { loadSite } from './data.js';
import { t, isEn } from './i18n.js';
import {
  el, injectProducerColors, dots, fieldClass, titleNodes, titleText,
  topBar, footer, pageUrl, link, photo, coverCandidates, isTempFile, formBadge,
  yearSpan, citiesLine, visibleWorks, kindLabel,
  FORMS, formKey, formLabelByKey, isRunningNow, placesOf, byYear,
} from './ui.js';

/* 화면 글자. 데이터와 같은 {ko,en} 모양으로 두고 t() 로 꺼낸다 —
   여기저기 isEn() 삼항식을 흩어 두면 한쪽 언어만 고쳐진다. */
const L = {
  all: { ko: '전체', en: 'All' },
  /* '더 보기' 라고만 두면 무엇이 더 있는지 알 수 없어 아무도 누르지 않는다.
     접혀 있는 세 가지를 그대로 이름으로 적는다. */
  more: { ko: '시간·장소·프로듀서', en: 'When · Where · Producers' },
  less: { ko: '접기', en: 'Close' },
  reset: { ko: '초기화', en: 'Reset' },
  when: { ko: '시간', en: 'When' },
  ongoing: { ko: '현재 진행 중', en: 'Currently running' },
  where: { ko: '장소', en: 'Where' },
  producers: { ko: '프로듀서', en: 'Producers' },
  form: { ko: '형식', en: 'Form' },
  empty: { ko: '해당하는 작업이 없습니다.', en: 'No works match these filters.' },
};

/* 장소 — 한국 아래 둥지230 이 들여쓰기로 붙는다. 판정은 ui.js 의 placesOf 한 곳. */
const PLACES = [
  { key: 'kr', ko: '한국', en: 'Korea' },
  { key: 'doongji', ko: '둥지230', en: 'Doongji230', sub: true },
  { key: 'abroad', ko: '해외', en: 'Abroad' },
];

/**
 * 그 언어에 실제로 항목이 있는 형식만 남긴다.
 * 눌러도 아무것도 안 나오는 버튼은 고장으로 보인다 —
 * 영문판에서 감춘 작업(hideInEn) 때문에 형식이 통째로 비는 일이 실제로 있다.
 */
const usedForms = (works) => {
  const keys = new Set(works.map(formKey));
  return FORMS.filter((f) => keys.has(f.key));
};

/** 장소도 같은 규칙으로 — 걸리는 작업이 없는 칸은 만들지 않는다. */
const usedPlaces = (works) => {
  const keys = new Set(works.flatMap((w) => [...placesOf(w)]));
  return PLACES.filter((p) => keys.has(p.key));
};

/* 표지가 없는 카드의 색면 비율. 메이슨리가 밋밋해지지 않게 돌려 쓴다.
   비율은 CSS 클래스로만 준다 — 인라인 style 금지. */
const AR_COUNT = 6;

const state = {
  form: 'all',
  ongoing: false,
  places: new Set(),
  producer: null,
  open: false, // '더 보기' 가 펼쳐져 있는가
};

const anyFilter = () =>
  state.form !== 'all' || state.ongoing || state.places.size > 0 || !!state.producer;

/* ---------- 차례 ---------- */

/* 회차에서 뽑는 것들(yearSpan · citiesLine)과
   진행 중 판정(isRunningNow)은 ui.js 에 있다. 여기서 다시 만들지 않는다. */

/* 차례는 ui.js 의 byYear 하나가 정한다 — 홈의 밴드도 같은 것을 쓴다.
   두 곳에 두면 홈과 Works 의 '최신 3건' 이 서로 달라진다. */

/* ---------- 주소와 상태 ---------- */

function readQuery() {
  const q = new URLSearchParams(location.search);

  const f = q.get('form');
  if (FORMS.some((x) => x.key === f)) state.form = f;

  if (q.get('ongoing') === '1') state.ongoing = true;

  for (const key of (q.get('place') || '').split(',').filter(Boolean)) {
    if (PLACES.some((x) => x.key === key)) state.places.add(key);
  }

  const p = q.get('producer');
  if (p) state.producer = p;

  /* 접힌 칸 안의 필터가 걸린 채로 들어오면 펼쳐 둔다 —
     걸려 있는 줄 모르고 '왜 이것밖에 없지' 하게 된다. */
  if (state.ongoing || state.places.size || state.producer) state.open = true;
}

function writeQuery() {
  const q = new URLSearchParams();
  if (state.form !== 'all') q.set('form', state.form);
  if (state.ongoing) q.set('ongoing', '1');
  if (state.places.size) q.set('place', [...state.places].join(','));
  if (state.producer) q.set('producer', state.producer);
  const s = q.toString();
  history.replaceState(null, '', s ? `?${s}` : location.pathname);
}

/* 네 필터는 동시에 걸린다. 장소는 다중값이라 하나라도 겹치면 남는다
   (국내 초연 + 해외 투어인 작업은 한국·해외 양쪽에 속한다). */
const filtered = (works) =>
  visibleWorks(works)
    .filter((w) => state.form === 'all' || formKey(w) === state.form)
    .filter((w) => !state.ongoing || isRunningNow(w))
    .filter((w) => {
      if (!state.places.size) return true;
      const has = placesOf(w);
      return [...state.places].some((k) => has.has(k));
    })
    .filter((w) => !state.producer || (w.producers || []).includes(state.producer))
    .sort(byYear);

/* ---------- 카드 ---------- */

function coverBlock(work, i) {
  /* 표지가 없으면 담당 프로듀서 색면. 담당 미지정이면 라벤더. */
  return el(
    `span.block.${fieldClass(work.producers)}.ar-${(i % AR_COUNT) + 1}`,
    null,
    el('i.blob-card'),
    el('span.block-t', { text: kindLabel(work) })
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
    formBadge(work),
    el('span.t', null, titleNodes(t(work.title))),
    t(work.artist) ? el('span.a', { text: t(work.artist) }) : null,
    el(
      'span.m',
      null,
      dots(work.producers, producerById),
      yearSpan(work) ? el('span.yr', { text: yearSpan(work) }) : null
    ),
    /* 회차가 열린 도시. 회차가 없는 작업에는 줄이 생기지 않는다. */
    citiesLine(work) ? el('span.cities.meta', { text: citiesLine(work) }) : null,
    /* 도트의 역할은 필터가 아니라 글자로만 보여준다 — 제작·공동제작·투어·기획. */
    t(work.dotRole) ? el('span.drole.meta', { text: t(work.dotRole) }) : null,
    /* 확인이 필요한 항목은 화면에 드러나 있어야 넷이 같이 볼 수 있다. */
    t(work.note) ? el('span.note-flag.meta', { text: t(work.note) }) : null
  );
}

/* ---------- 필터 줄 ---------- */

/** 체크박스 한 칸. 라벨 전체가 눌린다. */
function check(labelText, extraClass, onToggle) {
  const box = el('input', { type: 'checkbox' });
  box.addEventListener('change', () => onToggle(box.checked));
  const wrap = el(`label.chk${extraClass || ''}`, null, box, el('span', { text: labelText }));
  return { wrap, box };
}

function buildFilters(site, rerender) {
  const works = visibleWorks(site.works);

  /* 형식 — 단일 선택, 늘 보인다. */
  const seg = el('span.seg', { role: 'group', 'aria-label': t(L.form) });
  const forms = [{ key: 'all', label: t(L.all) }, ...usedForms(works).map((f) => ({ key: f.key, label: formLabelByKey(f.key) }))];
  for (const f of forms) {
    const b = el('button', { type: 'button', text: f.label, 'data-form': f.key });
    b.addEventListener('click', () => {
      state.form = f.key;
      rerender();
    });
    seg.append(b);
  }

  /* '더 보기' 는 형식 버튼 바로 오른쪽에 같은 크기로 붙인다(오른쪽 끝으로 밀지 않는다).
     같은 테두리 안에 들어가야 필터 줄의 일부로 읽힌다. */
  const moreBtn = el('button.morebtn', { type: 'button', 'aria-expanded': 'false', 'aria-controls': 'more-filters' });
  seg.append(el('span.seg-sep', { 'aria-hidden': 'true' }), moreBtn);
  moreBtn.addEventListener('click', () => {
    state.open = !state.open;
    rerender();
  });

  const resetBtn = el('button.resetbtn.meta', { type: 'button', text: t(L.reset) });
  resetBtn.addEventListener('click', () => {
    state.form = 'all';
    state.ongoing = false;
    state.places.clear();
    state.producer = null;
    rerender();
  });

  document.getElementById('seg').replaceWith(seg);
  document.getElementById('secbar-tail').replaceChildren(resetBtn);

  /* ---- 접히는 칸: 시간 · 장소 · 프로듀서 ---- */

  const ongoing = check(t(L.ongoing), '', (on) => {
    state.ongoing = on;
    rerender();
  });

  const placeBoxes = new Map();
  const placeRow = el('span.chks');
  for (const p of usedPlaces(works)) {
    const c = check(isEn() ? p.en : p.ko, p.sub ? '.sub' : '', (on) => {
      if (on) state.places.add(p.key);
      else state.places.delete(p.key);
      rerender();
    });
    placeBoxes.set(p.key, c.box);
    placeRow.append(c.wrap);
  }

  const pdots = el('span.dots', { role: 'group', 'aria-label': t(L.producers) });
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

  const group = (label, ...body) =>
    el('div.fgroup', null, el('span.meta.label', { text: label }), el('span.fbody', null, ...body));

  const panel = el(
    'div.morefilters',
    { id: 'more-filters' },
    group(t(L.when), ongoing.wrap),
    placeRow.children.length ? group(t(L.where), placeRow) : null,
    group(t(L.producers), pdots)
  );
  document.getElementById('more-filters').replaceWith(panel);

  return { seg, moreBtn, resetBtn, panel, ongoingBox: ongoing.box, placeBoxes, pdots };
}

function syncFilterUI(ui) {
  for (const b of ui.seg.children) {
    if (!b.dataset?.form) continue;          // 구분선과 '더 보기' 는 형식 버튼이 아니다
    const on = b.dataset.form === state.form;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  }

  ui.moreBtn.textContent = state.open ? `－ ${t(L.less)}` : `＋ ${t(L.more)}`;
  ui.moreBtn.setAttribute('aria-expanded', String(state.open));
  ui.panel.hidden = !state.open;

  ui.resetBtn.hidden = !anyFilter();

  ui.ongoingBox.checked = state.ongoing;
  for (const [key, box] of ui.placeBoxes) box.checked = state.places.has(key);

  for (const b of ui.pdots.children) {
    const on = b.dataset.producer === state.producer;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  }
}

/* ---------- 열에 번갈아 넣기 ----------
   목록이 가로로 읽히게 한다 — 첫 줄 왼쪽부터 1·2·3, 둘째 줄에 4·5·6.
   CSS columns 는 한 열을 끝까지 채우고 넘어가므로 세로로 읽힌다.

   열 수는 css/works.css 의 --cols 가 정한다. 여기서 중단점을 다시 적지 않는다 —
   두 곳에 적으면 화면 폭이 바뀔 때 한쪽만 고쳐져 어긋난다. */

let shown = [];          // 지금 그려져 있는 카드들. 창 크기가 바뀌면 다시 나눠 담는다.

const colCount = (host) =>
  Math.max(1, parseInt(getComputedStyle(host).getPropertyValue('--cols'), 10) || 1);

function columnise(host, list) {
  const n = colCount(host);
  const cols = Array.from({ length: n }, () => el('div.col'));
  list.forEach((node, i) => cols[i % n].append(node));   // 1번 1열, 2번 2열, 3번 3열, 4번 다시 1열
  host.replaceChildren(...cols);
  host.dataset.cols = String(n);
}

/* 열 수가 바뀔 때만 다시 담는다. 카드는 만들어 둔 것을 옮기기만 한다 —
   새로 만들면 사진을 처음부터 다시 찾아 화면이 깜빡인다. */
function watchColumns(host) {
  let timer = null;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (shown.length && String(colCount(host)) !== host.dataset.cols) columnise(host, shown);
    }, 120);
  });
}

/* ---------- 그리기 ---------- */

function render(site, ui) {
  const all = visibleWorks(site.works);
  const list = filtered(site.works);

  syncFilterUI(ui);

  /* 무엇이 선택됐는지는 위 필터에 이미 드러나 있다. 큰 소제목으로 되풀이하지 않는다. */
  const cards = document.getElementById('works-list');
  if (!list.length) {
    shown = [];
    cards.replaceChildren(el('p.empty', { text: t(L.empty) }));
  } else {
    shown = list.map((w, i) => card(w, i, site.producerById));
    columnise(cards, shown);
  }

  document.getElementById('works-count').textContent =
    list.length === all.length ? `${list.length}개` : `${list.length} / ${all.length}개`;

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
    if (state.form !== 'all' && !usedForms(visibleWorks(site.works)).some((f) => f.key === state.form)) {
      state.form = 'all';
    }
    const ui = buildFilters(site, () => render(site, ui));
    render(site, ui);
    watchColumns(document.getElementById('works-list'));
  } catch (err) {
    console.error(err);
    document.getElementById('works-list').append(
      el('p.load-error', { text: `데이터를 읽지 못했습니다. ${err.message}` })
    );
  }
}

main();
