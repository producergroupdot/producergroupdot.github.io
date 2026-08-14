/* home.js — 홈 화면. data/*.json 을 읽어 모자이크와 Now 를 그린다. */

import { loadSite } from './data.js';
import { t } from './i18n.js';
import { el, injectProducerColors, dots, fieldClass, titleNodes, titleText, logo, footer } from './ui.js';

/* 모자이크에서 사진이 들어갈 자리. works.json 의 homeFeature 가 자리를 지정한다.
   그리드 위치는 CSS 클래스로만 준다 — 인라인 style 은 미디어 쿼리를 이긴다(함정 3). */
const PHOTO_SLOTS = [
  { key: 'mosaic-tall', cls: 'm-photo1' },
  { key: 'mosaic-wide-a', cls: 'm-photo2' },
  { key: 'mosaic-wide-b', cls: 'm-photo3' },
];
const BAND_SLOTS = ['band-1', 'band-2', 'band-3'];

const PRODUCER_SLOTS = ['m-p1', 'm-p2', 'm-p3', 'm-p4'];

const typeLabel = (w) => (w.type === 'performance' ? 'Production' : 'Project');
const workHref = (w) => `#/works/${w.id}`;

const bySlot = (works, key) => works.find((w) => (w.homeFeature || []).includes(key));

/* ---------- 날짜 ---------- */

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fmt = (s) => {
  const [y, m, d] = s.split('-');
  return `${y}.${+m}.${+d}`;
};

/** 2026.9.11–9.13 · 하루뿐이면 한 번만 */
function fmtRange(from, to) {
  if (!to || to === from) return fmt(from);
  const [, fm] = from.split('-');
  const [ty, tm, td] = to.split('-');
  const tail = ty === from.split('-')[0] ? (tm === fm ? `${+td}` : `${+tm}.${+td}`) : fmt(to);
  return `${fmt(from)}–${tail}`;
}

/* ---------- 모자이크 ---------- */

function cellLogo(producers) {
  return el(
    'a.cell.c-cream.m-logo',
    { href: '#/', 'aria-label': 'Producer Group DOT — 홈' },
    logo(producers),
    el(
      'span',
      null,
      el('span.wordmark', null, 'PRODUCER GROUP ', el('span.wordmark-light', { text: 'DOT' })),
      el('span.sub', { text: 'since 2014' })
    )
  );
}

function cellProducer(p, slotClass) {
  return el(
    `a.cell.producer.field-${p.id}.${slotClass}${p.color.dark ? '.on-dark' : ''}`,
    { href: `#/producers/${p.id}` },
    el('i.blob.blob-tr'),
    el('span.meta.num', { text: t(p.role) }),
    el('span', null, el('h3', { text: t(p.name, 'en') }), el('span.sub', { text: t(p.name, 'ko') }))
  );
}

function cellWorks(works) {
  const pf = works.filter((w) => w.type === 'performance').length;
  const pj = works.filter((w) => w.type === 'project').length;
  return el(
    'div.cell.c-cream.m-works',
    null,
    el('i.blob.blob-br.blob-ink'),
    el('span'),
    el(
      'span',
      null,
      el('h2', { text: 'Works' }),
      el(
        'span.sub.split',
        null,
        el('a', { href: '#/works?type=performance' }, el('b', { text: '공연' }), ` ${pf}`),
        el('a', { href: '#/works?type=project' }, el('b', { text: '프로젝트' }), ` ${pj}`)
      )
    )
  );
}

function cellArtists(works) {
  /* artists.json 은 아직 없다. 그때까지는 works.json 의 예술가 이름에서
     작업 수가 많은 순으로 뽑아 보여준다. artists.json 이 생기면 여기만 갈아끼운다. */
  const count = new Map();
  for (const w of works) {
    const name = t(w.artist);
    if (name) count.set(name, (count.get(name) || 0) + 1);
  }
  const names = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n);

  return el(
    'a.cell.c-lav.m-artists.on-dark',
    { href: '#/artists' },
    el('span'),
    el('span', null, el('h2', { text: 'Artists' }), el('span.sub', { text: names.join(' · ') }))
  );
}

function cellAbout() {
  return el(
    'a.cell.c-ink.m-about.on-dark',
    { href: '#/about' },
    el('span'),
    el('span', null, el('h2', { text: 'About' }), el('span.sub', { text: '프로듀서 콜렉티브' }))
  );
}

/** 사진 자리. 표지 이미지가 없으면 담당 프로듀서 색면으로 대체(미지정은 라벤더). */
function cellPhoto(work, slotClass, producerById) {
  if (!work) return el(`div.cell.c-lav.${slotClass}.on-dark`);

  const p = producerById.get((work.producers || [])[0]);
  const dark = !p || p.color.dark; // 라벤더도 어두운 면
  const cls = `a.cell.photo.${fieldClass(work.producers)}.${slotClass}${dark ? '.on-dark' : ''}`;

  const cap = el(
    'span.cap',
    null,
    el('span.meta', { text: typeLabel(work) }),
    el('span.cap-t', null, titleNodes(t(work.title)))
  );

  /* 표지가 들어오면 색면 대신 사진. cover 는 data/works.json 한 곳에서만 바꾼다. */
  const visual = work.cover
    ? el('img.cover', { src: work.cover, alt: '', loading: 'lazy' })
    : el('span.meta.pending', { text: '사진 준비 중' });

  return el(cls, { href: workHref(work), 'aria-label': titleText(t(work.title)) }, visual, cap);
}

function renderMosaic(site) {
  const { works, producers, producerById } = site;
  const mosaic = document.getElementById('mosaic');
  mosaic.replaceChildren();

  /* 프로듀서 네 칸의 자리는 매 방문마다 섞는다. 메뉴 칸은 자리를 지킨다. */
  const slots = [...PRODUCER_SLOTS];
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }

  mosaic.append(
    cellLogo(producers),
    cellPhoto(bySlot(works, 'mosaic-tall'), 'm-photo1', producerById),
    cellWorks(works),
    ...producers.map((p, i) => cellProducer(p, slots[i])),
    cellArtists(works),
    cellAbout(),
    cellPhoto(bySlot(works, 'mosaic-wide-a'), 'm-photo2', producerById),
    cellPhoto(bySlot(works, 'mosaic-wide-b'), 'm-photo3', producerById)
  );
}

/* ---------- Now ---------- */

/** 오늘 기준 앞뒤 3개월 안에 회차가 있는 공연 + 진행 중인 프로젝트. */
function nowItems(site, today = new Date()) {
  const { works, runs } = site;
  const from = new Date(today);
  from.setMonth(from.getMonth() - 3);
  const to = new Date(today);
  to.setMonth(to.getMonth() + 3);
  const [A, Z, T] = [iso(from), iso(to), iso(today)];

  const workById = new Map(works.map((w) => [w.id, w]));
  const items = [];

  for (const r of runs) {
    if (r.to < A || r.from > Z) continue;
    const w = workById.get(r.workId);
    if (!w) continue;
    const where = [t(r.city), t(r.venue)].filter(Boolean).join(' · ');
    items.push({
      work: w,
      sort: r.from,
      when: fmtRange(r.from, r.to),
      where,
      tag: r.from > T ? '예정' : r.to < T ? '지난' : '진행 중',
    });
  }
  items.sort((a, b) => (a.sort < b.sort ? -1 : 1));

  /* 회차가 없는 진행 중 프로젝트는 한 줄로. 이미 회차로 나온 작업은 겹쳐 넣지 않는다. */
  const shown = new Set(items.map((it) => it.work.id));
  for (const w of works) {
    if (w.status !== 'ongoing' || shown.has(w.id)) continue;
    items.push({ work: w, sort: '9999', when: w.year, where: t(w.artist), tag: '진행 중' });
  }

  return { items, range: `${fmt(A)} — ${fmt(Z)}` };
}

function nowRow(it, producerById) {
  return el(
    'a.row',
    { href: workHref(it.work) },
    dots(it.work.producers, producerById),
    el('span.t', null, titleNodes(t(it.work.title))),
    el('span.when', { text: it.when }),
    el('span.where', { text: it.where }),
    el('span.tag', { text: it.tag })
  );
}

function renderNow(site) {
  const { items, range } = nowItems(site);
  document.getElementById('now-range').textContent = range;

  const list = document.getElementById('now-list');
  list.replaceChildren(
    ...(items.length
      ? items.map((it) => nowRow(it, site.producerById))
      : [el('p.empty.meta', { text: '앞뒤 3개월 안에 예정된 회차가 없습니다.' })])
  );
}

/* ---------- Now 아래 사진 3장 ---------- */

function renderBand(site) {
  const band = document.getElementById('home-band');
  const figures = BAND_SLOTS.map((key) => {
    const w = bySlot(site.works, key);
    if (!w) return null;
    const p = site.producerById.get((w.producers || [])[0]);
    const dark = !p || p.color.dark;
    const fig = el(`figure.${fieldClass(w.producers)}${dark ? '.on-dark' : ''}`);
    fig.append(
      el('a.band-a', { href: workHref(w), 'aria-label': titleText(t(w.title)) },
        w.cover
          ? el('img.cover', { src: w.cover, alt: '', loading: 'lazy' })
          : el('span.meta.pending', { text: '사진 준비 중' })),
      el(
        'figcaption',
        null,
        el('span.meta', { text: typeLabel(w) }),
        el('span.cap-t', null, titleNodes(t(w.title)), ` · ${w.year}`)
      )
    );
    return fig;
  }).filter(Boolean);

  band.replaceChildren(...figures);
}

/* ---------- 부팅 ---------- */

async function main() {
  try {
    const site = await loadSite();
    injectProducerColors(site.producers);
    renderMosaic(site);
    renderNow(site);
    renderBand(site);
    document.getElementById('home-footer').replaceChildren(footer());
  } catch (err) {
    console.error(err);
    document.getElementById('mosaic').append(
      el('p.load-error', { text: `데이터를 읽지 못했습니다. ${err.message}` })
    );
  }
}

main();
