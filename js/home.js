/* home.js — 홈 화면. data/*.json 을 읽어 모자이크와 Now 를 그린다. */

import { loadSite } from './data.js';
import { t } from './i18n.js';
import {
  el, injectProducerColors, dots, fieldClass, titleNodes, titleText,
  logo, footer, pageUrl, link, coverImage,
} from './ui.js';

/* 모자이크에서 사진이 들어갈 자리는 works.json 의 homeFeature 가 지정한다.
   그리드 위치는 CSS 클래스로만 준다 — 인라인 style 은 미디어 쿼리를 이긴다(함정 3). */
const BAND_SLOTS = ['band-1', 'band-2', 'band-3'];

const PRODUCER_SLOTS = ['m-p1', 'm-p2', 'm-p3', 'm-p4'];

const typeLabel = (w) => (w.type === 'performance' ? 'Production' : 'Project');

/* 아래 파노라마 두 칸은 5:2 로 미리 잘라둔 홈 전용 파일을 쓴다. 없으면 표지로 떨어진다. */
const photoSrc = (w, wide) => (wide && w.homePhoto) || w.cover || '';

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
  return link(
    pageUrl('home'),
    '.cell.c-cream.m-logo',
    { 'aria-label': 'Producer Group DOT — 홈' },
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
  return link(
    pageUrl('producer', p.id),
    `.cell.producer.field-${p.id}.${slotClass}${p.color.dark ? '.on-dark' : ''}`,
    null,
    el('i.blob.blob-tr'),
    el('span.meta.num', { text: t(p.role) }),
    el('span', null, el('h3', { text: t(p.name, 'en') }), el('span.sub', { text: t(p.name, 'ko') }))
  );
}

function cellWorks(works) {
  const pf = works.filter((w) => w.type === 'performance').length;
  const pj = works.filter((w) => w.type === 'project').length;
  /* 이 칸만 바깥이 링크가 아니다 — 안에 '공연'·'프로젝트' 두 링크가 있어서
     <a> 안에 <a> 가 들어가면 안 되기 때문. 제목 자체가 Works 로 가는 링크다. */
  return el(
    'div.cell.c-cream.m-works',
    null,
    el('i.blob.blob-br.blob-ink'),
    el('span'),
    el(
      'span',
      null,
      link(pageUrl('works'), '.h2-link', null, el('h2', { text: 'Works' })),
      el(
        'span.sub.split',
        null,
        link(pageUrl('works', '?type=performance'), '', null, el('b', { text: '공연' }), ` ${pf}`),
        link(pageUrl('works', '?type=project'), '', null, el('b', { text: '프로젝트' }), ` ${pj}`)
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

  return link(
    pageUrl('artists'),
    '.cell.c-lav.m-artists.on-dark',
    { 'aria-label': 'Artists' },
    el('span'),
    el('span', null, el('h2', { text: 'Artists' }), el('span.sub', { text: names.join(' · ') }))
  );
}

function cellAbout() {
  return link(
    pageUrl('about'),
    '.cell.c-ink.m-about.on-dark',
    { 'aria-label': 'About' },
    el('span'),
    el('span', null, el('h2', { text: 'About' }), el('span.sub', { text: '프로듀서 콜렉티브' }))
  );
}

/** 사진 자리. 사진 파일이 아직 없으면 담당 프로듀서 색면으로 떨어진다(미지정은 라벤더). */
function cellPhoto(work, slotClass, producerById, wide = false) {
  if (!work) return el(`div.cell.c-lav.${slotClass}.on-dark`);

  const p = producerById.get((work.producers || [])[0]);
  const dark = !p || p.color.dark; // 라벤더도 어두운 면
  const cls = `.cell.photo.${fieldClass(work.producers)}.${slotClass}${dark ? '.on-dark' : ''}`;

  const cap = el(
    'span.cap',
    null,
    el('span.meta', { text: typeLabel(work) }),
    el('span.cap-t', null, titleNodes(t(work.title)))
  );

  const pending = () => el('span.meta.pending', { text: '사진 준비 중' });
  const src = photoSrc(work, wide);
  const visual = src ? coverImage(src, pending) : pending();

  return link(
    pageUrl('work', work.id),
    cls,
    { 'aria-label': titleText(t(work.title)) },
    visual,
    cap
  );
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
    cellPhoto(bySlot(works, 'mosaic-wide-a'), 'm-photo2', producerById, true),
    cellPhoto(bySlot(works, 'mosaic-wide-b'), 'm-photo3', producerById, true)
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
  return link(
    pageUrl('work', it.work.id),
    '.row',
    null,
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
    const pending = () => el('span.meta.pending', { text: '사진 준비 중' });
    fig.append(
      link(pageUrl('work', w.id), '.band-a', { 'aria-label': titleText(t(w.title)) },
        w.cover ? coverImage(w.cover, pending) : pending()),
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
