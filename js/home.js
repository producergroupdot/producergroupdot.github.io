/* home.js — 홈 화면. data/*.json 을 읽어 모자이크와 Now 를 그린다. */

import { loadSite } from './data.js';
import { t, lang } from './i18n.js';
import {
  el, injectProducerColors, dots, fieldClass, titleNodes, titleText,
  logo, footer, pageUrl, link, photo, coverCandidates, producerTile, kindLabel, kindName, isPerformance,
  isRunLive,
  byYear, coverPosition,
  langToggle,
  shownInLang, visibleWorks,
  mergeRuns,
} from './ui.js';
/* 돋보기는 상단 메뉴와 같은 것을 쓴다. */
import { searchButton } from './search.js';

/* 모자이크 세 칸은 works.json 의 homeFeature 가 지정한다 — 그 자리의 비율에 맞는
   사진을 사람이 골라야 하기 때문이다.
   그리드 위치는 CSS 클래스로만 준다 — 인라인 style 은 미디어 쿼리를 이긴다(함정 3). */

/* Now 아래 띠 세 칸은 손으로 지정하지 않는다. Works 목록과 같은 차례(최신순)의
   앞 세 건을 그대로 쓴다 — 새 작업이 들어오면 홈이 알아서 따라온다.
   단 모자이크에 이미 쓰인 작업은 건너뛴다. 한 화면에 같은 작업이 두 번 나오면 안 된다. */
const BAND_COUNT = 3;
const MOSAIC_SLOTS = ['mosaic-tall', 'mosaic-wide-a', 'mosaic-wide-b'];

const PRODUCER_SLOTS = ['m-p1', 'm-p2', 'm-p3', 'm-p4'];

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

/* 홈에서 이 칸은 어디로도 가지 않는다 — 링크가 아니라 그냥 칸이다.
   메뉴 칸만 마우스에 반응하므로, 누를 수 있는 칸과 아닌 칸이 그 차이로 갈린다. */
function cellLogo(site) {
  return el(
    'div.cell.c-cream.m-logo',
    null,
    /* 홈에는 상단 메뉴가 없다. 찾기와 언어 전환은 이 칸의 오른쪽 위 모서리,
       점 다섯과 같은 높이에 둔다 — 크림 색면 안이라 잘 읽힌다.
       사진 칸 위에는 얹지 않는다(사진마다 밝기가 달라 글자가 묻힌다).
       돋보기는 내부 페이지의 상단 메뉴와 같은 것을 쓴다(search.js 의 searchButton) —
       여기에 따로 만들면 두 곳이 어긋난다. */
    el('div.m-top', null, searchButton(site), langToggle('.m-lang')),
    /* 점 다섯 · 워드마크 · since 2014 를 한 덩어리로 위에 붙인다. */
    el(
      'div.m-brand',
      null,
      logo(site.producers),
      el(
        'span',
        null,
        el('span.wordmark', null, 'PRODUCER GROUP ', el('span.wordmark-light', { text: 'DOT' })),
        el('span.sub', { text: 'since 2014' })
      )
    ),
    /* 바로 아래 네 색면이 무엇인지 알리는 라벨. Works·Artists·About 과 같은 크기다. */
    el('h2.m-plabel', { text: 'Producers' })
  );
}

/* 색면 칸은 About 과 같은 컴포넌트(ui.js 의 producerTile)를 쓴다.
   홈에서는 모서리 블롭을, About 에서는 얼굴 사진을 얹는다. */
/* 역할 라벨('프로듀서')은 칸에 넣지 않는다 — 네 칸 위에 'Producers' 라벨이 이미 있다. */
const cellProducer = (p, slotClass) =>
  producerTile(p, { media: el('i.blob.blob-tr'), extraClass: `.cell.producer.${slotClass}`, role: false });

function cellWorks(works) {
  const shown = visibleWorks(works);
  /* 개수는 형식(form)으로 센다 — '공연'과 그 나머지(프로젝트). */
  const pf = shown.filter(isPerformance).length;
  const pj = shown.length - pf;
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
           Works 페이지의 필터는 형식이라, '공연'만 그대로 대응하는 필터가 있다.
           '프로젝트'는 리서치·네트워크·레지던시·워크숍에 걸쳐 있어 전체 목록으로 보낸다. */
        link(pageUrl('works', '?form=performance'), '', null, el('b', { text: '공연' }), ` ${pf}`),
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
    el('span.meta', { text: kindLabel(work) }),
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
    cellLogo(site),
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

/**
 * Now 에 나오는 것은 '지금 하고 있거나 앞으로 할 것'뿐이다.
 * 오늘이 회차의 시작–종료 사이에 있거나, 오늘 이후에 시작하는 회차가 있으면 남는다.
 * 끝난 회차는 뺀다 — 지난 것은 Works 에 그대로 있다.
 * 판정은 ui.js 의 isRunLive() 한 곳이고 Works 의 '현재 진행 중' 필터도 그것을 쓴다.
 */
function nowItems(site, today = new Date()) {
  const { works, nowOrder } = site;
  const T = iso(today);

  const workById = new Map(works.map((w) => [w.id, w]));
  const items = [];

  /* 무엇이 Now 에 나오는지는 data/now.json 이 정한다(배열에 없으면 안 나온다).
     차례는 works.json 의 order 가 정한다 — Works 페이지와 같은 기준이다. */
  (nowOrder || []).forEach((id, order) => {
    const w = workById.get(id);
    if (!w) return; // 없는 id 는 조용히 건너뛴다
    if (!shownInLang(w)) return; // 영문판에서 감춘 작업(hideInEn)

    /* 회차는 이제 작품 안에 있다(works.json 의 runs). */
    const rs = (w.runs || [])
      .filter((r) => isRunLive(r, T))
      .sort((x, y) => (x.start < y.start ? -1 : 1));

    if (rs.length) {
      /* 한 작업의 여러 회차는 한 줄로 합친다. 같은 작업이 줄만 늘리지 않게. */
      const unique = (xs) => [...new Set(xs.filter(Boolean))];
      const venues = unique(rs.map((r) => t(r.venue)));
      const times = unique(rs.map((r) => t(r.time)));

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
        /* 하루씩 나눠 적은 회차는 한 범위로 묶어 짧게 적는다(2026.10.15–17).
           나눠 적은 이유는 시간이 달라서인데, 그 시간은 상세의 '일정'에서 보여준다. */
        when: joinDates(mergeRuns(rs)),
        where,
        /* 회차별 메모(낭독 작가·작품 같은 것)는 여러 줄이 되면 한 줄에 담기지 않는다.
           합쳐진 줄에서는 접고, 작업 상세의 일정에서 펼친다. */
        note: rs.length === 1 ? t(rs[0].note) : '',
      });
    } else if (!(w.runs || []).length && w.status === 'ongoing') {
      /* 회차를 따로 적지 않는 진행 중 프로젝트(네트워크 같은 것)는 한 줄로.
         회차가 있는데 다 끝난 작업은 여기로 내려오지 않는다 — status 가 ongoing 이라도
         Now 에서는 빠진다. 살아 있는 회차가 없으면 지금 하고 있는 것이 아니다. */
      items.push({ work: w, order, sort: '', when: w.year, where: t(w.artist) });
    }
  });

  /* 차례는 works.json 의 order 가 정한다(Works 페이지와 같은 기준).
     지난 것을 맨 아래로 내리던 예외는 없앴다 — 이제 지난 것은 여기 오지 않는다. */
  items.sort(
    (a, b) =>
      (a.work.order ?? Infinity) - (b.work.order ?? Infinity) || (a.sort < b.sort ? -1 : 1)
  );

  return { items };
}

/* 제목 · 날짜 · 장소 · 색점 순. 색점은 오른쪽 끝 고정폭 칸에 조용히 놓는다 —
   맨 앞에 두면 제목보다 먼저 눈에 들어온다.
   지난 것은 배지 대신 줄 전체를 흐리게 해서 구분한다. */
function nowRow(it, producerById) {
  return link(
    pageUrl('work', it.work.id),
    '.row',
    null,
    el('span.kind.meta', { text: kindName(it.work) }),
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
      : [el('p.empty.meta', { text: '앞뒤 3개월 안에 예정된 회차가 없습니다.' })])
  );
}

/* ---------- Now 아래 사진 3장 ---------- */

/** 모자이크가 이미 데려간 작업들. 띠에서는 건너뛴다. */
const mosaicWorks = (works) =>
  new Set(MOSAIC_SLOTS.map((k) => bySlot(works, k)?.id).filter(Boolean));

/** 띠에 올릴 세 건 — Works 와 같은 차례에서 모자이크와 겹치지 않는 앞쪽부터. */
function bandWorks(works) {
  const taken = mosaicWorks(works);
  return works
    .filter(shownInLang)                 // 영문판에서 감춘 작업은 홈에도 두지 않는다
    .filter((w) => !taken.has(w.id))
    .filter((w) => w.hideFromBand !== true)   // 사람이 띠에서 뺀 작업
    .sort(byYear)
    .slice(0, BAND_COUNT);
}

function renderBand(site) {
  const band = document.getElementById('home-band');
  const figures = bandWorks(site.works).map((w, i) => {
    const key = `band-${i + 1}`;         // homePhotos 를 이 이름으로 찾는다
    const p = site.producerById.get((w.producers || [])[0]);
    const dark = !p || p.color.dark;
    const fig = el(`figure.${fieldClass(w.producers)}${dark ? '.on-dark' : ''}`);
    const pending = () => el('span.meta.pending', { text: '사진 준비 중' });
    /* 어디를 남기고 자를지는 실제로 뜬 파일이 정해진 뒤에 붙인다 —
       후보를 차례로 시도하다 표지로 떨어질 수 있어서다. */
    fig.append(
      link(pageUrl('work', w.id), '.band-a', { 'aria-label': titleText(t(w.title)) },
        photo(homeCandidates(w, key), pending, (src) => {
          fig.dataset.pos = coverPosition(w, src);
        })),
      el(
        'figcaption',
        null,
        el('span.meta', { text: kindLabel(w) }),
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
