/* home.js — 홈 화면. data/*.json 을 읽어 모자이크와 Now 를 그린다. */

import { loadSite } from './data.js';
import { t, lang } from './i18n.js';
import {
  el, injectProducerColors, dots, fieldClass, titleNodes, titleText,
  logo, footer, pageUrl, link, photo, coverCandidates, isArchive, ARCHIVE_LABEL, producerTile,
} from './ui.js';

/* 모자이크에서 사진이 들어갈 자리는 works.json 의 homeFeature 가 지정한다.
   그리드 위치는 CSS 클래스로만 준다 — 인라인 style 은 미디어 쿼리를 이긴다(함정 3). */
const BAND_SLOTS = ['band-1', 'band-2', 'band-3'];

const PRODUCER_SLOTS = ['m-p1', 'm-p2', 'm-p3', 'm-p4'];

const typeLabel = (w) => (w.type === 'performance' ? 'Production' : 'Project');

/**
 * 홈의 사진 자리는 칸 비율이 정해져 있어서 미리 잘라둔 홈 전용 파일을 먼저 쓴다
 * (파노라마 5:2 · 가운데 세로 3:4). 화면에 맞춰 자동으로 자르면 머리가 잘린다.
 * 홈 전용 파일이 없으면 그 작업의 표지로 떨어진다.
 */
const homeCandidates = (w, slot) => [(w.homePhotos || {})[slot], ...coverCandidates(w)];

const bySlot = (works, key) => works.find((w) => (w.homeFeature || []).includes(key));

/* ---------- 날짜 ---------- */

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fmt = (s) => {
  const [y, m, d] = s.split('-');
  return `${y}.${+m}.${+d}`;
};

/**
 * 여러 회차를 한 칸에 늘어놓는다. 앞과 같은 해면 연도를 되풀이하지 않는다.
 *   2026.9.11–13 · 10.22–24
 */
function joinDates(runs) {
  let lastYear = '';
  return runs
    .map((r) => {
      const year = r.start.slice(0, 4);
      let s = t(r.date) || fmtRange(r.start, r.end);
      if (year === lastYear && s.startsWith(`${year}.`)) s = s.slice(year.length + 1);
      lastYear = year;
      return s;
    })
    .join(' · ');
}

/** 2026.9.11–13 · 하루뿐이면 한 번만 */
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

/* 색면 칸은 About 과 같은 컴포넌트(ui.js 의 producerTile)를 쓴다.
   홈에서는 모서리 블롭을, About 에서는 얼굴 사진을 얹는다. */
const cellProducer = (p, slotClass) =>
  producerTile(p, { media: el('i.blob.blob-tr'), extraClass: `.cell.producer.${slotClass}` });

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
        /* 개수는 데이터의 type(공연/프로젝트)으로 센다.
           Works 페이지의 필터는 카테고리라, '공연'만 그대로 대응하는 필터가 있다.
           '프로젝트'는 국제 네트워크·레지던시·리서치에 걸쳐 있어 전체 목록으로 보낸다. */
        link(pageUrl('works', '?category=production'), '', null, el('b', { text: '공연' }), ` ${pf}`),
        link(pageUrl('works'), '', null, el('b', { text: '프로젝트' }), ` ${pj}`)
      )
    )
  );
}

function cellArtists(artists) {
  /* 예술가 명단은 data/artists.json 이 정한다. 작업 목록에서 짐작하지 않는다 —
     작품을 넣고 빼는 것과 명단에 이름을 올리고 내리는 것은 다른 결정이다. */
  const names = artists.map((a) => t(a.name)).filter(Boolean);

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
function cellPhoto(work, slot, slotClass, producerById) {
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
  const visual = photo(homeCandidates(work, slot), pending);

  return link(
    pageUrl('work', work.id),
    cls,
    { 'aria-label': titleText(t(work.title)) },
    visual,
    cap
  );
}

function renderMosaic(site) {
  const { works, producers, producerById, artists } = site;
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
    cellPhoto(bySlot(works, 'mosaic-tall'), 'mosaic-tall', 'm-photo1', producerById),
    cellWorks(works),
    ...producers.map((p, i) => cellProducer(p, slots[i])),
    cellArtists(artists),
    cellAbout(),
    cellPhoto(bySlot(works, 'mosaic-wide-a'), 'mosaic-wide-a', 'm-photo2', producerById),
    cellPhoto(bySlot(works, 'mosaic-wide-b'), 'mosaic-wide-b', 'm-photo3', producerById)
  );
}

/* ---------- Now ---------- */

/** 오늘 기준 앞뒤 3개월 안에 회차가 있는 공연 + 진행 중인 프로젝트. */
function nowItems(site, today = new Date()) {
  const { works, nowOrder } = site;
  const from = new Date(today);
  from.setMonth(from.getMonth() - 3);
  const to = new Date(today);
  to.setMonth(to.getMonth() + 3);
  const [A, Z, T] = [iso(from), iso(to), iso(today)];

  const workById = new Map(works.map((w) => [w.id, w]));
  const items = [];

  /* 무엇이 Now 에 나오는지는 data/now.json 이 정한다(배열에 없으면 안 나온다).
     차례는 works.json 의 order 가 정한다 — Works 페이지와 같은 기준이다. */
  (nowOrder || []).forEach((id, order) => {
    const w = workById.get(id);
    if (!w) return; // 없는 id 는 조용히 건너뛴다
    if (isArchive(w)) return; // 아카이브로 넘어간 작업은 Now 에 두지 않는다

    /* 회차는 이제 작품 안에 있다(works.json 의 runs). */
    const rs = (w.runs || [])
      .filter((r) => r.end >= A && r.start <= Z)
      .sort((x, y) => (x.start < y.start ? -1 : 1));

    if (rs.length) {
      /* 한 작업의 여러 회차는 한 줄로 합친다. 같은 작업이 줄만 늘리지 않게. */
      const unique = (xs) => [...new Set(xs.filter(Boolean))];
      const venues = unique(rs.map((r) => t(r.venue)));
      const times = unique(rs.map((r) => r.time));

      /* 장소가 하나면 도시·장소를 그대로 쓰고, 여럿이면 도시만 모은다.
         회차마다 시간이 같으면 그 시간도 한 번 보여준다. */
      const where =
        venues.length === 1
          ? unique([...unique(rs.map((r) => t(r.city))), venues[0], times.length === 1 ? times[0] : '']).join(' · ')
          : unique(rs.map((r) => t(r.city))).join(' · ');

      items.push({
        work: w,
        order,
        sort: rs[0].start,
        when: joinDates(rs),
        where,
        /* 회차별 메모(낭독 작가·작품 같은 것)는 여러 줄이 되면 한 줄에 담기지 않는다.
           합쳐진 줄에서는 접고, 작업 상세의 일정에서 펼친다. */
        note: rs.length === 1 ? t(rs[0].note) : '',
        past: rs.every((r) => r.end < T), // 모든 회차가 끝났을 때만 지난 것
      });
    } else if (w.status === 'ongoing') {
      /* 회차가 따로 없는 진행 중 프로젝트는 한 줄로. */
      items.push({ work: w, order, sort: '', when: w.year, where: t(w.artist), past: false });
    }
  });

  /* 차례는 works.json 의 order 가 정한다(Works 페이지와 같은 기준).
     지난 것만 예외로 늘 맨 아래에 둔다. */
  items.sort(
    (a, b) =>
      a.past - b.past ||
      (a.work.order ?? Infinity) - (b.work.order ?? Infinity) ||
      (a.sort < b.sort ? -1 : 1)
  );

  return { items };
}

/* 제목 · 날짜 · 장소 · 색점 순. 색점은 오른쪽 끝 고정폭 칸에 조용히 놓는다 —
   맨 앞에 두면 제목보다 먼저 눈에 들어온다.
   지난 것은 배지 대신 줄 전체를 흐리게 해서 구분한다. */
/** 공연 / 프로젝트. 영문 화면에서는 Production / Project. */
const typeName = (w) =>
  lang.current === 'en'
    ? w.type === 'performance'
      ? 'Production'
      : 'Project'
    : w.type === 'performance'
      ? '공연'
      : '프로젝트';

function nowRow(it, producerById) {
  return link(
    pageUrl('work', it.work.id),
    `.row${it.past ? '.past' : ''}`,
    null,
    el('span.kind.meta', { text: typeName(it.work) }),
    /* 제목은 한 덩어리로 감싼다. .t 가 flex 라서 감싸지 않으면
       SVG 육각형이 각각 별개의 flex 항목이 되어 제목이 벌어진다. */
    el(
      'span.t',
      null,
      el('span.t-title', null, titleNodes(t(it.work.title))),
      it.note ? el('span.note-flag.meta', { text: it.note }) : null
    ),
    el('span.when', { text: it.when }),
    el('span.where', { text: it.where, title: it.where }),
    dots(it.work.producers, producerById)
  );
}

function renderNow(site) {
  const { items } = nowItems(site);
  const list = document.getElementById('now-list');
  list.replaceChildren(
    ...(items.length
      ? items.map((it) => nowRow(it, site.producerById))
      : [el('p.empty.meta', { text: '앞뒤 3개월 안에 예정된 회차가 없습니다.' })]),
    /* 목록 맨 아래 한 줄. NOW 항목보다 작고 옅게 — 지금 일이 아니라 지나온 일이다. */
    link(pageUrl('archive'), '.now-archive.meta', null, `${ARCHIVE_LABEL} →`)
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
        photo(homeCandidates(w, key), pending)),
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
