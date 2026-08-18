/* archive.js — 아카이브.
   사진 없이 글자와 색면만. 행을 누르면 그 자리에서 아코디언이 열린다. */

import { loadSite } from './data.js';
import { t } from './i18n.js';
import {
  el, injectProducerColors, dots, titleNodes, titleText,
  topBar, footer, pageUrl, link, isArchive, lastYear, ARCHIVE_LABEL, visibleWorks, isEmbeddedVideo,
  richNodes, lightbox, photo, coverCandidates,
} from './ui.js';

const state = { year: 'all', form: 'all', producer: null };

/**
 * 공개로 표시되고 주소가 있는 자료만 화면에 낸다.
 * '확인 필요'는 아직 내보내지 않고, 주소가 없는 것은 누를 데가 없어 내지 않는다.
 */
/* 공개된 자료만. 상세 페이지에 이미 임베드된 영상은 뺀다 —
   '자세히 보기' 안에 같은 영상이 들어 있어 두 번 걸리게 된다.
   판정은 ui.js 의 isEmbeddedVideo() 한 곳(상세 페이지도 같은 것을 쓴다). */
const publicMaterials = (w) =>
  (w.materials || []).filter((m) => m.public === '예' && m.url && !isEmbeddedVideo(w, m.url));

const formOf = (w) => t(w.category) || '기타';

/* ---------- 주소 ---------- */

function readQuery() {
  const q = new URLSearchParams(location.search);
  for (const k of ['year', 'form']) if (q.get(k)) state[k] = q.get(k);
  if (q.get('producer')) state.producer = q.get('producer');
}
function writeQuery() {
  const q = new URLSearchParams();
  if (state.year !== 'all') q.set('year', state.year);
  if (state.form !== 'all') q.set('form', state.form);
  if (state.producer) q.set('producer', state.producer);
  const s = q.toString();
  history.replaceState(null, '', s ? `?${s}` : location.pathname);
}

const filtered = (works) =>
  works.filter(
    (w) =>
      (state.year === 'all' || String(lastYear(w)) === state.year) &&
      (state.form === 'all' || formOf(w) === state.form) &&
      (!state.producer || (w.producers || []).includes(state.producer))
  );

/* ---------- 한 줄 ---------- */

function runLine(w) {
  const r = (w.runs || [])[0];
  if (!r) return null;
  const when = t(r.date) || `${r.start}${r.end && r.end !== r.start ? ` – ${r.end}` : ''}`;
  const where = [t(r.city), t(r.venue)].filter(Boolean).join(' · ');
  return [when, where].filter(Boolean).join('  ·  ');
}

function row(w, producerById) {
  const mats = publicMaterials(w);

  const head = el(
    'div.arow-head',
    null,
    el('span.a-title', null, titleNodes(t(w.title))),
    el('span.a-artist', { text: t(w.artist) }),
    el('span.a-form.meta', { text: formOf(w) }),
    el('span.a-role.meta', { text: t(w.dotRole) || '' }),
    dots(w.producers, producerById)
  );

  /* 펼쳤을 때 보일 것이 하나도 없으면 아코디언을 만들지 않는다 — 눌러도 열릴 게 없다.
     소개·정보·자료 셋 중 하나라도 있으면 연다. */
  const summary = t(w.summary);
  const info = (w.info || []).filter((x) => t(x));
  if (!summary && !info.length && !mats.length) {
    const plain = el('div.arow.arow-plain');
    plain.append(head);
    return plain;
  }

  const det = el('details.arow');
  const sum = el('summary');
  sum.append(head);
  det.append(sum);

  /* 왼쪽에 글, 오른쪽에 이미지 한 장. 이미지가 없으면 글이 폭을 다 쓴다.
     차례는 소개 → 정보 → 자료 → 자세히 보기. 없는 덩어리는 만들지 않는다. */
  const left = el('div.arow-text');

  const line = runLine(w);
  if (line) left.append(el('p.a-run.meta', { text: line }));

  /* 소개 한 문단. 작품 이름에 걸린 {work:…} 링크가 여기서 살아난다. */
  if (summary) {
    for (const para of summary.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean)) {
      left.append(el('p.a-summary', null, richNodes(para)));
    }
  }

  if (info.length) {
    const ul = el('ul.a-info');
    for (const x of info) ul.append(el('li', null, richNodes(t(x))));
    left.append(ul);
  }

  if (mats.length) {
    const ul = el('ul.a-mats');
    for (const m of mats) {
      const label = [m.type, t(m.label)].filter(Boolean).join(' · ');
      ul.append(
        el('li', null, el('a', { href: m.url, target: '_blank', rel: 'noopener', text: label }))
      );
    }
    left.append(ul);
  }

  /* 상세 페이지가 있으면 이어지는 링크를 맨 끝에. 없으면 이 줄은 생기지 않는다. */
  const detail = pageUrl('work', w.id);
  if (detail) left.append(el('a.a-more', { href: detail, text: '자세히 보기 →' }));

  const box = el('div.arow-body', null, left, rowImage(w));
  det.append(box);
  return det;
}

/* 펼친 아코디언 오른쪽의 이미지 한 장. 닫힌 행에는 넣지 않는다 — 목록은 글자만.
   파일이 없으면 자리도 만들지 않는다. 누르면 원본 크기로 크게 본다. */
function rowImage(w) {
  if (!w.cover) return null;

  const fig = el('figure.a-img');
  const img = photo(coverCandidates(w), () => {
    fig.remove();
    return el('span');
  });
  img.addEventListener('click', () => lightbox(img.currentSrc || img.src, titleText(t(w.title))));
  fig.append(img);
  return fig;
}

/* ---------- 연도 묶음 ---------- */

function groups(works, producerById) {
  const byYear = new Map();
  for (const w of works) {
    const y = lastYear(w) || 0;
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(w);
  }

  const box = el('div.a-groups');
  for (const y of [...byYear.keys()].sort((a, b) => b - a)) {
    const sec = el('section.a-group');
    sec.append(el('h2.a-year', { text: String(y || '연도 미상') }));
    const list = el('div.a-rows');
    for (const w of byYear.get(y)) list.append(row(w, producerById));
    sec.append(list);
    box.append(sec);
  }
  return box;
}

/* ---------- 필터 줄 ---------- */

function buildFilters(archived, producers, rerender) {
  const years = [...new Set(archived.map((w) => lastYear(w)).filter(Boolean))].sort((a, b) => b - a);
  const forms = [...new Set(archived.map(formOf))];

  const seg = (name, key, items) => {
    const wrap = el('span.seg', { role: 'group', 'aria-label': name });
    for (const [val, label] of [['all', '전체'], ...items.map((x) => [String(x), String(x)])]) {
      const b = el('button', { type: 'button', text: label, 'data-val': val, 'data-key': key });
      b.addEventListener('click', () => {
        state[key] = val;
        rerender();
      });
      wrap.append(b);
    }
    return wrap;
  };

  const pdots = el('span.dots', { role: 'group', 'aria-label': '프로듀서' });
  for (const p of producers) {
    const b = el(`button.dot.dot-${p.id}`, {
      type: 'button', 'data-producer': p.id, 'aria-label': t(p.name), title: t(p.name),
    });
    b.addEventListener('click', () => {
      state.producer = state.producer === p.id ? null : p.id;
      rerender();
    });
    pdots.append(b);
  }

  const bar = document.getElementById('a-filters');
  bar.replaceChildren(
    el('span.meta.label', { text: '연도' }), seg('연도', 'year', years),
    el('span.meta.label', { text: '형식' }), seg('형식', 'form', forms),
    el('span.spacer'),
    el('span.meta.label', { text: '프로듀서' }), pdots
  );
  return bar;
}

function syncFilters(bar) {
  for (const b of bar.querySelectorAll('button[data-key]')) {
    const on = state[b.dataset.key] === b.dataset.val;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  }
  for (const b of bar.querySelectorAll('button[data-producer]')) {
    const on = b.dataset.producer === state.producer;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  }
}

/* ---------- 부팅 ---------- */

function render(archived, site, bar) {
  syncFilters(bar);
  const list = filtered(archived);
  const host = document.getElementById('a-list');
  host.replaceChildren(
    list.length
      ? groups(list, site.producerById)
      : el('p.a-empty', { text: '아직 아카이브로 옮겨진 작업이 없습니다.' })
  );
  document.getElementById('a-count').textContent =
    list.length === archived.length ? `${list.length}건` : `${list.length} / ${archived.length}건`;
  writeQuery();
}

async function main() {
  try {
    const site = await loadSite();
    injectProducerColors(site.producers);
    document.getElementById('top-bar').replaceChildren(topBar(site.producers, 'archive', site.about));

    const archived = visibleWorks(site.works).filter((w) => isArchive(w));

    /* 표기는 고정이다. 데이터가 채워지는 동안 숫자가 들쭉날쭉하지 않게. */
    document.getElementById('a-title').textContent = ARCHIVE_LABEL;

    readQuery();
    const bar = buildFilters(archived, site.producers, () => render(archived, site, bar));
    render(archived, site, bar);

    document.getElementById('page-footer').replaceChildren(footer());
  } catch (err) {
    console.error(err);
    document.getElementById('a-list').append(
      el('p.load-error', { text: `데이터를 읽지 못했습니다. ${err.message}` })
    );
  }
}

main();
