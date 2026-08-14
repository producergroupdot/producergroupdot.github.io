/* work.js — 작업 상세. 13건이 같은 템플릿을 쓴다.
   대부분의 작업은 본문·크레딧·회차가 비어 있으므로, 값이 없는 부분은
   빈 껍데기를 남기지 않고 통째로 빠진다. */

import { loadSite } from './data.js';
import { t, lang } from './i18n.js';
import {
  el, injectProducerColors, dots, fieldClass, titleNodes, titleText,
  topBar, footer, pageUrl, link, photo, coverCandidates, isTempFile, categoryBadge,
} from './ui.js';

const PHOTO_TRIES = 6; //  img/works/<id>/01.jpg … 06.jpg
const STRIP_MAX = 4; //  사진 띠에 놓는 장수
const MORE = 4; //  Explore more 카드 수

const nn = (n) => String(n).padStart(2, '0');
const typeName = (w) =>
  lang.current === 'en'
    ? w.type === 'performance' ? 'Production' : 'Project'
    : w.type === 'performance' ? '공연' : '프로젝트';

/* ---------- 회차에서 뽑는 것들 (works.html 과 같은 규칙) ---------- */

const latestRun = (w) => {
  const ends = (w.runs || []).map((r) => r.end || r.start).filter(Boolean);
  return ends.length ? ends.sort().at(-1) : `${w.yearFrom || 0}-00-00`;
};

function yearSpan(w) {
  const ys = (w.runs || []).flatMap((r) => [r.start, r.end]).filter(Boolean).map((d) => d.slice(0, 4));
  if (!ys.length) return w.year || '';
  const lo = ys.reduce((a, b) => (a < b ? a : b));
  const hi = ys.reduce((a, b) => (a > b ? a : b));
  return lo === hi ? lo : `${lo}–${hi.slice(2)}`;
}

const fmtDate = (s) => {
  const [y, m, d] = s.split('-');
  return `${y}. ${+m}. ${+d}`;
};
const runWhen = (r) =>
  t(r.date) || (r.end && r.end !== r.start ? `${fmtDate(r.start)} – ${+r.end.split('-')[2]}` : fmtDate(r.start));

/* ---------- 제목 블록 ---------- */

function head(work, producerById) {
  return el(
    'header.dhead',
    null,
    el(
      'div.dmeta',
      null,
      dots(work.producers, producerById),
      categoryBadge(work),
      el('span.meta.dtype', { text: typeName(work) }),
      el('span.meta.dyear', { text: yearSpan(work) })
    ),
    el('h1', null, titleNodes(t(work.title))),
    t(work.subtitle) ? el('p.dsub', { text: t(work.subtitle) }) : null,
    t(work.artist) ? el('p.dartist', { text: t(work.artist) }) : null
  );
}

/* ---------- 아코디언 ---------- */

/**
 * 아코디언 목록을 만든다.
 * works.json 에 accordions 가 있으면 그대로 쓰고(적힌 순서 유지),
 * 없으면 가진 데이터에서 '일정'과 '정보'를 만들어 본다.
 * 어느 쪽이든 줄이 하나도 없는 항목은 만들지 않는다 — 빈 제목만 남기지 않기 위해서.
 */
function buildAccordions(work) {
  if (work.accordions?.length) {
    return work.accordions
      .map((a) => ({
        title: t(a.title),
        rows: (a.rows || []).filter((r) => t(r) && !('url' in r && !r.url)),
      }))
      .filter((a) => a.title && a.rows.length);
  }

  const out = [];

  const runRows = (work.runs || []).map((r) => ({
    ko: [runWhen(r), [t(r.city), t(r.venue)].filter(Boolean).join(' · '), r.time]
      .filter(Boolean)
      .join('  ·  '),
  }));
  if (runRows.length) out.push({ title: '일정', rows: runRows });

  const info = [
    ['장소', t(work.venue)],
    ['제작·주최', t(work.produced)],
    ['도트의 역할', t(work.dotRole)],
    ['커미션', t(work.commission)],
    ['키워드', t(work.keywords)],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => ({ ko: `${k} · ${v}` }));
  if (info.length) out.push({ title: '정보', rows: info });

  return out;
}

function accordions(work) {
  const list = buildAccordions(work);
  if (!list.length) return null; // 다섯 개가 다 비면 패널 아래를 그냥 닫는다

  const box = el('div.acc');
  list.forEach((a, i) => {
    const det = el('details', i === 0 ? { open: true } : null); // 첫 항목(보통 일정)만 열어 둔다
    det.append(el('summary', { text: a.title }));
    const ul = el('ul.acc-rows');
    for (const r of a.rows) {
      ul.append(
        el(
          'li',
          null,
          r.url
            ? el('a', { href: r.url, target: '_blank', rel: 'noopener', text: t(r) })
            : el('span', { text: t(r) })
        )
      );
    }
    det.append(ul);
    box.append(det);
  });
  return box;
}

/* ---------- 본문 패널 ---------- */

function panel(work) {
  const lead = t(work.lead);
  const body = t(work.body);
  const acc = accordions(work);

  /* 리드도 본문도 아코디언도 없으면 패널 자체를 만들지 않는다. */
  if (!lead && !body && !acc) return null;

  const box = el('div.dpanel');
  if (lead) box.append(el('p.lead', { text: lead }));
  if (body) {
    for (const para of body.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)) {
      box.append(el('p', { text: para }));
    }
  }
  if (acc) box.append(acc);
  return box;
}

/* ---------- 사진 ---------- */

const stripCandidates = (w) => [
  ...coverCandidates(w),
  ...Array.from({ length: PHOTO_TRIES }, (_, i) => `img/works/${w.id}/${nn(i + 1)}.jpg`),
];

/** 표지가 없으면 Works 카드와 같은 규칙 — 담당 프로듀서 색면(미지정은 라벤더). */
const colourBlock = (work) =>
  el(`span.block.${fieldClass(work.producers)}`, null,
    el('i.blob-card'),
    el('span.block-t', { text: typeName(work) }));

function sidePhoto(work) {
  const fig = el('figure.dimg');
  const tmp = el('span.tmp', { text: '임시 이미지' });
  fig.append(
    photo(
      coverCandidates(work),
      () => {
        tmp.remove();
        return colourBlock(work);
      },
      (src) => isTempFile(src) && !tmp.parentNode && fig.prepend(tmp)
    )
  );
  return fig;
}

/** 사진 4장 가로 띠. 있는 만큼만 놓고, 한 장도 없으면 띠를 만들지 않는다. */
function strip(work) {
  const seen = new Set();
  const files = stripCandidates(work).filter((f) => !seen.has(f) && seen.add(f)).slice(0, STRIP_MAX + 2);

  const row = el('div.dstrip');
  for (const src of files.slice(0, STRIP_MAX)) {
    const fig = el('figure');
    fig.append(photo([src], () => {
      fig.remove();
      return el('span');
    }));
    row.append(fig);
  }
  return row;
}

/* ---------- Explore more ---------- */

function more(work, works, producerById) {
  const others = works.filter((w) => w.id !== work.id);
  const byNew = [...others].sort((a, b) => latestRun(b).localeCompare(latestRun(a)));
  const same = byNew.filter((w) => t(w.category, 'en') === t(work.category, 'en') && t(work.category, 'en'));

  /* 같은 카테고리를 먼저 채우고, 모자라면 최신순으로 이어 붙인다. */
  const picked = [];
  for (const w of [...same, ...byNew]) {
    if (picked.length >= MORE) break;
    if (!picked.includes(w)) picked.push(w);
  }
  if (!picked.length) return null;

  const grid = el('div.mgrid');
  for (const w of picked) {
    const card = link(pageUrl('work', w.id), '.mcard', { 'aria-label': titleText(t(w.title)) });
    const vis = el('span.wrapimg');
    vis.append(photo(coverCandidates(w), () => colourBlock(w)));
    card.append(vis, categoryBadge(w), el('span.t', null, titleNodes(t(w.title))),
      el('span.m', null, dots(w.producers, producerById), el('span.yr', { text: yearSpan(w) })));
    grid.append(card);
  }
  return el('section.more', null, el('h2', { text: 'Explore more' }), grid);
}

/* ---------- 패널 높이 맞추기 ----------
   오른쪽 사진은 절대 위치라 패널 높이에 반영되지 않는다.
   사진이 다 뜬 뒤 패널 높이를 사진 높이에 맞춰야 아래 내용이 겹치지 않는다(CLAUDE.md). */
function fitPanel(wrap) {
  const dpanel = wrap.querySelector('.dpanel');
  const dimg = wrap.querySelector('.dimg');
  if (!dimg) return;

  const apply = () => {
    if (!window.matchMedia('(min-width: 901px)').matches) {
      wrap.style.minHeight = '';
      return;
    }
    const need = dimg.getBoundingClientRect().height + 70; // top 70px 만큼 내려가 있다
    const have = dpanel ? dpanel.getBoundingClientRect().height : 0;
    wrap.style.minHeight = `${Math.max(need, have)}px`;
  };

  apply();
  for (const img of dimg.querySelectorAll('img')) {
    if (!img.complete) img.addEventListener('load', apply, { once: true });
  }
  window.addEventListener('resize', apply);
}

/* ---------- 부팅 ---------- */

async function main() {
  const id = new URLSearchParams(location.search).get('id');
  try {
    const site = await loadSite();
    injectProducerColors(site.producers);

    const work = site.works.find((w) => w.id === id);
    if (!work) throw new Error(`works.json 에 '${id}' 가 없습니다.`);
    document.title = `${titleText(t(work.title))} · 프로듀서그룹 도트`;

    document.getElementById('top-bar').replaceChildren(topBar(site.producers, 'works', site.about));

    const body = panel(work);
    const wrap = el('div.dwrap', null, body, sidePhoto(work));

    document.getElementById('page').replaceChildren(
      head(work, site.producerById),
      wrap,
      strip(work),
      more(work, site.works, site.producerById)
    );
    document.getElementById('page-footer').replaceChildren(footer());

    fitPanel(wrap);
  } catch (err) {
    console.error(err);
    document.getElementById('page').append(
      el('p.load-error', { text: `데이터를 읽지 못했습니다. ${err.message}` })
    );
  }
}

main();
