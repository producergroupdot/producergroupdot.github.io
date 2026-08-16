/* work.js — 작업 상세. 13건이 같은 템플릿을 쓴다.
   대부분의 작업은 본문·크레딧·회차가 비어 있으므로, 값이 없는 부분은
   빈 껍데기를 남기지 않고 통째로 빠진다. */

import { loadSite } from './data.js';
import { t, lang } from './i18n.js';
import {
  el, injectProducerColors, dots, fieldClass, titleNodes, titleText,
  topBar, footer, pageUrl, link, photo, coverCandidates, isTempFile, categoryBadge,
  latestRun, yearSpan,
} from './ui.js';

const PHOTO_TRIES = 6; //  img/works/<id>/01.jpg … 06.jpg
const STRIP_MAX = 4; //  사진 띠에 놓는 장수
const MORE = 4; //  Explore more 카드 수

const nn = (n) => String(n).padStart(2, '0');
const typeName = (w) =>
  lang.current === 'en'
    ? w.type === 'performance' ? 'Production' : 'Project'
    : w.type === 'performance' ? '공연' : '프로젝트';

/* 회차에서 뽑는 것들(latestRun · yearSpan)은 ui.js 에 있다. */

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
    /* 두 가지 모양을 받는다 — 목록(rows)과 산문(paragraphs). */
    return work.accordions
      .map((a) => ({
        title: t(a.title),
        rows: (a.rows || []).filter((r) => t(r) && !('url' in r && !r.url)),
        paragraphs: (t(a.paragraphs, lang.current) || a.paragraphs?.ko || []).filter?.(Boolean) ?? [],
      }))
      .filter((a) => a.title && (a.rows.length || a.paragraphs.length));
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

  /* credits 배열이 있으면 크레딧 항목으로. 데이터만 있고 화면에 없는 필드를 두지 않는다. */
  const credits = (work.credits || [])
    .map((c) => ({ ko: [t(c.role), t(c.name)].filter(Boolean).join(' · ') }))
    .filter((r) => r.ko);
  if (credits.length) out.push({ title: '크레딧', rows: credits });

  /* 자료는 주소가 있는 공개 자료만. 아카이브와 같은 규칙. */
  const mats = (work.materials || [])
    .filter((m) => m.public === '예' && m.url)
    .map((m) => ({ ko: [m.type, t(m.label)].filter(Boolean).join(' · '), url: m.url }));
  if (mats.length) out.push({ title: '자료', rows: mats });

  return out;
}

function accordions(work) {
  const list = buildAccordions(work);
  if (!list.length) return null; // 다섯 개가 다 비면 패널 아래를 그냥 닫는다

  const box = el('div.acc');
  list.forEach((a, i) => {
    const det = el('details', i === 0 ? { open: true } : null); // 첫 항목만 열어 둔다
    det.append(el('summary', { text: a.title }));

    /* 산문은 문단으로, 목록은 줄로. ⬡ 는 SVG 로 그린다. */
    if (a.paragraphs?.length) {
      const prose = el('div.acc-prose');
      for (const para of a.paragraphs) prose.append(el('p', null, titleNodes(para)));
      det.append(prose);
    }
    if (a.rows.length) {
      const ul = el('ul.acc-rows');
      for (const r of a.rows) {
        ul.append(
          el(
            'li',
            null,
            r.url
              ? el('a', { href: r.url, target: '_blank', rel: 'noopener' }, titleNodes(t(r)))
              : el('span', null, titleNodes(t(r)))
          )
        );
      }
      det.append(ul);
    }
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
      box.append(el('p', null, titleNodes(para)));   // 본문의 {hex} 도 SVG 육각형으로
    }
  }
  if (acc) box.append(acc);
  return box;
}

/* ---------- 사진 ----------
   배치는 사진 수와 비율로 정한다. 패턴은 아래 다섯 가지뿐이고 새로 만들지 않는다.

     1장     가로 → 텍스트 오른쪽에 걸치기 / 세로 → 오른쪽, 최대 높이 68vh
     2장     둘 다 세로 → 오른쪽에 나란히 2열(각 60vh) / 그 외 → 본문 아래 2열
     3장     첫 장 크게 + 나머지 2장 아래 작게
     4~6장   본문 아래 갤러리. 가로가 많으면 2열 / 세로가 많으면 3열 / 반반이면 메이슨리
     7장 이상 6장까지 보이고 '사진 더 보기'로 펼침

   어느 패턴이든 자르지 않는다(object-fit: contain). 모바일은 전부 1열. */

const PHOTO_MAX = 12; //  img/works/<id>/01.jpg … 12.jpg 까지 찾아본다

const photoCandidates = (w) => {
  const list = [
    w.cover,
    ...Array.from({ length: PHOTO_MAX }, (_, i) => `img/works/${w.id}/${nn(i + 1)}.jpg`),
    `img/works/${w.id}/poster.jpg`,
  ].filter(Boolean);
  return [...new Set(list)];
};

/** 가로 w/h > 1.2 · 세로 < 0.85 · 그 사이는 정사각 */
const classify = (r) => (r > 1.2 ? 'landscape' : r < 0.85 ? 'portrait' : 'square');

/** 실제로 뜨는 사진만 골라 크기까지 재어 온다. 없는 파일은 조용히 빠진다. */
function probe(src) {
  return new Promise((done) => {
    const im = new Image();
    im.onload = () =>
      done({ src, w: im.naturalWidth, h: im.naturalHeight, kind: classify(im.naturalWidth / im.naturalHeight) });
    im.onerror = () => done(null);
    im.src = src;
  });
}

const collectPhotos = async (work) =>
  (await Promise.all(photoCandidates(work).map(probe))).filter(Boolean);

/** 사진 수와 비율로 패턴 하나를 고른다. */
function plan(photos) {
  const n = photos.length;
  const count = (k) => photos.filter((p) => p.kind === k).length;

  if (!n) return { kind: 'none' };
  if (n === 1) return { kind: 'side', tall: photos[0].kind === 'portrait' };
  if (n === 2) return photos.every((p) => p.kind === 'portrait') ? { kind: 'side-pair' } : { kind: 'below-2' };
  if (n === 3) return { kind: 'hero' };

  /* 4장부터는 본문 아래 갤러리. 7장 이상이면 6장만 먼저 보인다. */
  const land = count('landscape');
  const port = count('portrait');
  const cols = land > port ? 'c2' : port > land ? 'c3' : 'masonry';
  return { kind: 'gallery', cols, more: n > 6 };
}

/** 자르지 않는 사진 한 장. */
function shot(p, cls = '') {
  const fig = el(`figure${cls}`);
  fig.append(el('img.cover', { src: p.src, alt: '', loading: 'lazy' }));
  return fig;
}

/** 표지가 하나도 없을 때의 색면. Works 카드와 같은 규칙. */
const colourBlock = (work) =>
  el(`span.block.${fieldClass(work.producers)}`, null,
    el('i.blob-card'),
    el('span.block-t', { text: typeName(work) }));

/* ---------- 배치 그리기 ---------- */

/** 텍스트 오른쪽에 걸치는 자리(1장 · 세로 2장). */
function sideArea(photos, p) {
  const box = el(`figure.dimg${p.kind === 'side-pair' ? '.pair' : ''}${p.tall ? '.portrait' : ''}`);
  for (const ph of photos) box.append(el('img.cover', { src: ph.src, alt: '' }));
  return box;
}

/** 본문 아래에 놓이는 자리(2장 · 3장 · 갤러리). */
function belowArea(photos, p) {
  if (p.kind === 'below-2') {
    return el('section.dgal.c2', null, ...photos.map((x) => shot(x)));
  }

  if (p.kind === 'hero') {
    /* 첫 장 크게, 나머지 둘은 아래 작게. */
    return el(
      'section.dhero',
      null,
      shot(photos[0], '.hero-main'),
      el('div.hero-rest', null, ...photos.slice(1).map((x) => shot(x)))
    );
  }

  /* 갤러리. 7장 이상이면 6장만 먼저 보이고 나머지는 접어 둔다. */
  const shown = p.more ? photos.slice(0, 6) : photos;
  const rest = p.more ? photos.slice(6) : [];

  const grid = el(`section.dgal.${p.cols}`, null, ...shown.map((x) => shot(x)));
  if (!rest.length) return grid;

  const hidden = el(`div.dgal-rest.${p.cols}`, { hidden: true }, ...rest.map((x) => shot(x)));
  const btn = el('button.dgal-more', { type: 'button', text: `사진 더 보기 (${rest.length})` });
  btn.addEventListener('click', () => {
    hidden.hidden = false;
    btn.remove();
  });
  return el('div.dgal-wrap', null, grid, hidden, btn);
}

/* ---------- gallery: "sequence" ----------
   글자가 든 이미지(카드뉴스 등)를 한 장씩 넘겨 본다.
   자동 배치 다섯 패턴과 별개의 모드다 — works.json 의 gallery 값이 없으면 그쪽으로 간다.
   어떤 경우에도 자르지 않는다(contain). */

function lightbox(src, alt) {
  const box = el('div.lb', { role: 'dialog', 'aria-modal': 'true', 'aria-label': '원본 크기' });
  box.append(el('img', { src, alt: alt || '' }));

  const shut = () => {
    box.remove();
    document.body.classList.remove('lb-open');
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => e.key === 'Escape' && shut();

  box.addEventListener('click', shut);
  document.addEventListener('keydown', onKey);
  document.body.append(box);
  document.body.classList.add('lb-open');
}

function sequence(work) {
  const files = (work.galleryImages || []).filter(Boolean);
  if (!files.length) return null;

  const track = el('div.seq-track');
  files.forEach((src, i) => {
    const slide = el('figure.seq-slide');
    const img = el('img', { src, alt: '', loading: i < 2 ? 'eager' : 'lazy' });
    img.addEventListener('click', () => lightbox(src));
    slide.append(img);
    track.append(slide);
  });

  const dots = el('div.seq-dots');
  files.forEach((_, i) => dots.append(el('i', { 'data-i': String(i) })));
  const counter = el('span.seq-count.meta');

  const prev = el('button.seq-btn.seq-prev', { type: 'button', 'aria-label': '이전 사진', text: '←' });
  const next = el('button.seq-btn.seq-next', { type: 'button', 'aria-label': '다음 사진', text: '→' });

  let at = 0;
  const show = (i, smooth = true) => {
    at = Math.max(0, Math.min(files.length - 1, i));
    track.scrollTo({ left: at * track.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
    sync();
  };
  const sync = () => {
    counter.textContent = `${at + 1} / ${files.length}`;
    [...dots.children].forEach((d, i) => d.classList.toggle('on', i === at));
    prev.disabled = at === 0;
    next.disabled = at === files.length - 1;
  };

  prev.addEventListener('click', () => show(at - 1));
  next.addEventListener('click', () => show(at + 1));
  [...dots.children].forEach((d, i) => d.addEventListener('click', () => show(i)));

  /* 스와이프는 브라우저의 가로 스크롤에 맡긴다 — 스크롤이 멎으면 위치를 다시 읽는다. */
  let timer = null;
  track.addEventListener('scroll', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      at = Math.round(track.scrollLeft / track.clientWidth);
      sync();
    }, 90);
  });

  const box = el('section.seq', { 'aria-roledescription': 'carousel' },
    el('div.seq-stage', null, track, prev, next),
    el('div.seq-foot', null, dots, counter));

  /* 키보드 ← → 는 이 영역에 들어와 있을 때만 듣는다. */
  box.tabIndex = 0;
  box.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(at - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(at + 1); }
  });

  sync();
  window.addEventListener('resize', () => show(at, false));
  return box;
}

/* ---------- 영상 ---------- */

/* privacy-enhanced 주소(youtube-nocookie)로만 심는다. 16:9 는 CSS 가 잡는다.
   video 가 없으면 아무것도 그리지 않는다.
   { embedId, label } 형태를 쓰고, 예전 문자열 형태도 받아준다. */
function video(work) {
  const v = work.video;
  if (!v) return null;

  const src =
    typeof v === 'string'
      ? v
      : v.embedId
        ? `https://www.youtube-nocookie.com/embed/${v.embedId}`
        : '';
  if (!src) return null;

  const caption = typeof v === 'string' ? '' : t(v.label);
  return el(
    'section.dvideo',
    null,
    el('div.dvideo-box', null,
      el('iframe', {
        src,
        title: `${titleText(t(work.title))} ${caption || '영상'}`,
        loading: 'lazy',
        allow: 'accelerometer; clipboard-write; encrypted-media; picture-in-picture',
        referrerpolicy: 'strict-origin-when-cross-origin',
        allowfullscreen: true,
      })),
    caption ? el('p.dvideo-cap.meta', { text: caption }) : null
  );
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

    const wrap = el('div.dwrap', null, panel(work));
    const page = document.getElementById('page');
    page.replaceChildren(
      head(work, site.producerById),
      wrap,
      video(work),
      more(work, site.works, site.producerById)
    );
    document.getElementById('page-footer').replaceChildren(footer());

    /* gallery 값이 있으면 그 모드로. 없으면 비율을 재어 다섯 패턴 중 하나로 간다. */
    if (work.gallery === 'sequence') {
      /* 표지는 평소처럼 텍스트 오른쪽에 두고, 나머지는 넘겨 보는 갤러리로 내린다. */
      const cover = work.cover ? await probe(work.cover) : null;
      if (cover) wrap.append(sideArea([cover], { kind: 'side', tall: cover.kind === 'portrait' }));
      const seq = sequence(work);
      if (seq) wrap.insertAdjacentElement('afterend', seq);
      fitPanel(wrap);
      return;
    }

    const photos = await collectPhotos(work);
    const p = plan(photos);

    if (p.kind === 'side' || p.kind === 'side-pair') {
      wrap.append(sideArea(photos, p));
    } else if (p.kind === 'none') {
      wrap.append(el('figure.dimg', null, colourBlock(work)));
    } else {
      wrap.insertAdjacentElement('afterend', belowArea(photos, p));
    }

    fitPanel(wrap);
  } catch (err) {
    console.error(err);
    document.getElementById('page').append(
      el('p.load-error', { text: `데이터를 읽지 못했습니다. ${err.message}` })
    );
  }
}

main();
