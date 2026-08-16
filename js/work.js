/* work.js — 작업 상세. 14건이 같은 템플릿을 쓴다.
   화면은 두 열이다. 왼쪽 40% 가 글, 오른쪽 60% 가 영상과 사진.
   대부분의 작업은 본문·크레딧·회차가 비어 있으므로, 값이 없는 부분은
   빈 껍데기를 남기지 않고 통째로 빠진다. */

import { loadSite } from './data.js';
import { t, lang } from './i18n.js';
import {
  el, injectProducerColors, dots, fieldClass, titleNodes, titleText,
  topBar, footer, pageUrl, link, photo, coverCandidates, categoryBadge,
  latestRun, yearSpan,
} from './ui.js';

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

/* ---------- 영상 ---------- */

/* privacy-enhanced 주소(youtube-nocookie)로만 심는다. 자동재생은 없다.
   { embedId, label } 형태를 쓰고, 예전 문자열 형태도 받아준다. */
const videoId = (work) => {
  const v = work.video;
  if (!v) return '';
  if (typeof v === 'string') return (v.match(/([A-Za-z0-9_-]{11})(?:[?&/]|$)/) || [])[1] || '';
  return v.embedId || '';
};

function video(work) {
  const id = videoId(work);
  if (!id) return null;

  const caption = typeof work.video === 'string' ? '' : t(work.video.label);
  return el(
    'section.dvideo',
    null,
    el('div.dvideo-box', null,
      el('iframe', {
        src: `https://www.youtube-nocookie.com/embed/${id}`,
        title: `${titleText(t(work.title))} ${caption || '영상'}`,
        /* 유튜브 임베드는 한 개당 1MB 가까이 받는다 — 화면에 들어올 때까지 미룬다. */
        loading: 'lazy',
        allow: 'accelerometer; clipboard-write; encrypted-media; picture-in-picture',
        referrerpolicy: 'strict-origin-when-cross-origin',
        allowfullscreen: true,
      })),
    caption ? el('p.dvideo-cap.meta', { text: caption }) : null
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
  /* 위에 임베드된 영상과 같은 것은 링크 줄로 또 내보내지 않는다.
     데이터 쪽을 지우지 않고 여기서 거른다 — 주소는 자료 목록으로 남을 값이다. */
  const vid = videoId(work);
  const isSameVideo = (url) => Boolean(vid && url && url.includes(vid));

  if (work.accordions?.length) {
    /* 두 가지 모양을 받는다 — 목록(rows)과 산문(paragraphs). */
    return work.accordions
      .map((a) => ({
        title: t(a.title),
        rows: (a.rows || []).filter(
          (r) => t(r) && !('url' in r && !r.url) && !isSameVideo(r.url)
        ),
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

  /* 자료는 주소가 있는 공개 자료만. 아카이브와 같은 규칙.
     위에 임베드한 영상과 같은 주소면 뺀다. */
  const mats = (work.materials || [])
    .filter((m) => m.public === '예' && m.url && !isSameVideo(m.url))
    .map((m) => ({ ko: [m.type, t(m.label)].filter(Boolean).join(' · '), url: m.url }));
  if (mats.length) out.push({ title: '자료', rows: mats });

  return out;
}

function accordions(work) {
  const list = buildAccordions(work);
  if (!list.length) return null; // 다섯 개가 다 비면 본문 아래를 그냥 닫는다

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

/* ---------- 왼쪽 글 열 ---------- */

/* 폭이 아니라 조판으로 읽히게 한다 — 글줄은 34em 에서 멈추고,
   문단 사이는 한 줄 높이만큼 벌리고, 아코디언은 선 하나와 큰 여백으로 떼어 놓는다. */
function textCol(work) {
  const lead = t(work.lead);
  const body = t(work.body);
  const acc = accordions(work);

  /* 리드도 본문도 아코디언도 없으면 글 열 자체를 만들지 않는다. */
  if (!lead && !body && !acc) return null;

  const box = el('div.dcol-text');
  if (lead) box.append(el('p.lead', { text: lead }));
  if (body) {
    for (const para of body.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)) {
      box.append(el('p', null, titleNodes(para)));   // 본문의 {hex} 도 SVG 육각형으로
    }
  }
  if (acc) box.append(acc);
  return box;
}

/* ---------- 오른쪽 사진 ----------
   배치는 사진 수와 비율로 정한다. 패턴은 아래 다섯 가지뿐이고 새로 만들지 않는다.

     1장            가로 → 열 전체 폭 / 세로 → 최대 높이 68vh, 왼쪽 정렬
     2장 가로       위아래로 쌓기
     2장 세로       나란히 2열
     3장 이상 가로 위주   슬라이드
     3장 이상 세로 위주   2열 그리드(세로가 아주 많으면 3열)

   gallery:"sequence" 는 장수·비율과 무관하게 늘 슬라이드다.
   어느 패턴이든 자르지 않는다(object-fit: contain). 모바일은 전부 1열. */

const PHOTO_MAX = 12; //  img/works/<id>/01.jpg … 12.jpg 까지 찾아본다
const MANY_PORTRAITS = 5; //  세로가 이만큼 넘게 모이면 3열로 좁힌다

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
  if (!n) return { kind: 'none' };

  const land = photos.filter((p) => p.kind === 'landscape').length;
  const port = photos.filter((p) => p.kind === 'portrait').length;

  if (n === 1) return { kind: 'one', tall: photos[0].kind === 'portrait' };
  if (n === 2) return port === 2 ? { kind: 'pair' } : { kind: 'stack' };

  /* 가로가 더 많으면 넘겨 보고, 아니면 늘어놓는다.
     반반일 때는 그리드로 간다 — 세로가 섞인 슬라이드는 높이가 널뛴다. */
  if (land > port) return { kind: 'slides' };
  return { kind: 'grid', cols: port > MANY_PORTRAITS ? 'c3' : 'c2' };
}

/** 자르지 않는 사진 한 장. */
function shot(p, cls = '', eager = false) {
  const fig = el(`figure${cls}`);
  fig.append(el('img.cover', { src: p.src, alt: '', loading: eager ? 'eager' : 'lazy' }));
  return fig;
}

/** 표지가 하나도 없을 때의 색면. Works 카드와 같은 규칙. */
const colourBlock = (work) =>
  el(`span.block.${fieldClass(work.producers)}`, null,
    el('i.blob-card'),
    el('span.block-t', { text: typeName(work) }));

/** 고른 패턴대로 그린다. 슬라이드는 sequence 모드와 같은 컴포넌트를 쓴다. */
function photoArea(photos, p) {
  if (p.kind === 'one') return shot(photos[0], `.dshot${p.tall ? '.tall' : ''}`, true);
  if (p.kind === 'stack') return el('div.dstack', null, ...photos.map((x, i) => shot(x, '', i === 0)));
  if (p.kind === 'pair') return el('div.dpair', null, ...photos.map((x, i) => shot(x, '', i === 0)));
  if (p.kind === 'slides') return slideshow(photos.map((x) => x.src));
  return el(`div.dgrid.${p.cols}`, null, ...photos.map((x, i) => shot(x, '', i < 2)));
}

/* ---------- 슬라이드 ----------
   한 장씩 넘겨 본다. 자동 배치의 '3장 이상 가로 위주' 와
   gallery:"sequence" 가 이 하나를 함께 쓴다 — 두 벌을 두면 한쪽만 고쳐진다.
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

function slideshow(files) {
  const list = [...new Set((files || []).filter(Boolean))];
  if (!list.length) return null;

  const track = el('div.seq-track');
  list.forEach((src, i) => {
    const slide = el('figure.seq-slide');
    const img = el('img', { src, alt: '', loading: i < 2 ? 'eager' : 'lazy' });
    img.addEventListener('click', () => lightbox(src));
    slide.append(img);
    track.append(slide);
  });

  const dots = el('div.seq-dots');
  list.forEach((_, i) => dots.append(el('i', { 'data-i': String(i) })));
  const counter = el('span.seq-count.meta');

  const prev = el('button.seq-btn.seq-prev', { type: 'button', 'aria-label': '이전 사진', text: '←' });
  const next = el('button.seq-btn.seq-next', { type: 'button', 'aria-label': '다음 사진', text: '→' });

  let at = 0;
  const show = (i, smooth = true) => {
    at = Math.max(0, Math.min(list.length - 1, i));
    track.scrollTo({ left: at * track.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
    sync();
  };
  const sync = () => {
    counter.textContent = `${at + 1} / ${list.length}`;
    [...dots.children].forEach((d, i) => d.classList.toggle('on', i === at));
    prev.disabled = at === 0;
    next.disabled = at === list.length - 1;
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

    /* 두 열. 사진은 아직 재는 중이라 영상만 먼저 들어간다 —
       열 자체를 미리 만들어 두어야 글이 두 번 자리를 옮기지 않는다. */
    const media = el('div.dcol-media', null, video(work));
    const text = textCol(work);
    /* 글이 아직 없는 작업은 사진이 두 열을 다 쓴다 — 빈 왼쪽 칸을 남기지 않는다. */
    const layout = el(`section.dlayout${text ? '' : '.no-text'}`, null, text, media);

    document.getElementById('page').replaceChildren(
      head(work, site.producerById),
      layout,
      more(work, site.works, site.producerById)
    );
    document.getElementById('page-footer').replaceChildren(footer());

    /* gallery 값이 있으면 장수·비율을 보지 않고 슬라이드로 간다.
       표지도 슬라이드의 첫 장으로 들어간다 — 오른쪽 열에 사진 자리는 하나뿐이다. */
    if (work.gallery === 'sequence') {
      media.append(slideshow([work.cover, ...(work.galleryImages || [])]));
      return;
    }

    const photos = await collectPhotos(work);
    media.append(
      photos.length ? photoArea(photos, plan(photos)) : el('figure.dshot', null, colourBlock(work))
    );
  } catch (err) {
    console.error(err);
    document.getElementById('page').append(
      el('p.load-error', { text: `데이터를 읽지 못했습니다. ${err.message}` })
    );
  }
}

main();
