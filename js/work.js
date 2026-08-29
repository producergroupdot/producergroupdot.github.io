/* work.js — 작업 상세. 14건이 같은 템플릿을 쓴다.
   화면은 두 열이다. 왼쪽 40% 가 글, 오른쪽 60% 가 영상과 사진.
   대부분의 작업은 본문·크레딧·회차가 비어 있으므로, 값이 없는 부분은
   빈 껍데기를 남기지 않고 통째로 빠진다. */

import { loadSite } from './data.js';
import { t, lang, isFallback } from './i18n.js';
import {
  el, injectProducerColors, dots, fieldClass, titleNodes, titleText,
  topBar, footer, pageUrl, link, photo, coverCandidates, formBadge, formKey, kindName, isPerformance, workPhotos, isPublic,
  latestRun, yearSpan, photoCreditFor, visibleWorks, videoId, isEmbeddedVideo, lightbox, richNodes,
  runWhen,
} from './ui.js';

const MORE = 4; //  Explore more 카드 수

const nn = (n) => String(n).padStart(2, '0');
/* 회차에서 뽑는 것들(latestRun · yearSpan)과 날짜 표기(runWhen)는 ui.js 에 있다.
   Archive 의 '일시'가 같은 함수를 쓴다. */

/* ---------- 제목 블록 ---------- */

function head(work, producerById) {
  /* 국문 제목 아래에 영문 제목을 작고 옅게. 영문이 비어 있거나 국문과 같으면
     줄을 만들지 않는다 — TNN·Aesth:ethics 처럼 두 표기가 같은 작업이 있다.
     Works 카드와 홈 NOW 는 지금처럼 국문만 쓴다. */
  const main = t(work.title);
  const en = work.title?.en && work.title.en !== main ? work.title.en : '';

  return el(
    'header.dhead',
    null,
    el(
      'div.dmeta',
      null,
      dots(work.producers, producerById),
      /* 형식 배지 하나만 둔다. 공연/프로젝트 이분법은 여기 적지 않는다 —
         형식이 여섯으로 늘어난 뒤로는 배지와 겹쳐 읽힌다([영상] 프로젝트).
         그 이분법은 홈의 개수 표시에만 쓴다. */
      formBadge(work),
      el('span.meta.dyear', { text: yearSpan(work) })
    ),
    el('h1', null, titleNodes(main)),
    en ? el('p.dtitle-en', null, titleNodes(en)) : null,
    t(work.subtitle) ? el('p.dsub', { text: t(work.subtitle) }) : null,
    t(work.artist) ? el('p.dartist', { text: t(work.artist) }) : null,
    premiereLine(work)
  );
}

/* ---------- 초연 한 줄 ----------
   제목 아래, 본문 위. 공연에만 붙는다.
   초연 회차는 5.일정 탭의 '초연' 열(runs[].premiere)이 정한다. */

function premiereRun(work) {
  return isPerformance(work) ? (work.runs || []).find((r) => r.premiere === true) || null : null;
}

function premiereLine(work) {
  const r = premiereRun(work);
  if (!r) return null;
  /* '초연' 은 라벨이다 — 라벨과 값 사이는 콜론, 값과 값 사이는 가운뎃점. */
  const text = t(PREMIERE) + ' : ' + [runWhen(r), t(r.venue)].filter(Boolean).join(' · ');
  return el('p.dpremiere.meta', { text });
}

/* ---------- 영상 ---------- */

/* privacy-enhanced 주소(youtube-nocookie)로만 심는다. 자동재생은 없다.
   { embedId, label } 형태를 쓰고, 예전 문자열 형태도 받아준다.
   videoId() 는 ui.js 에 있다 — 아카이브도 같은 판정을 쓴다. */

/** 16:9 임베드 하나. 아래·위 라벨은 부르는 쪽이 붙인다. */
function embed(id, title) {
  return el('div.dvideo-box', null,
    el('iframe', {
      src: `https://www.youtube-nocookie.com/embed/${id}`,
      title,
      /* 유튜브 임베드는 한 개당 1MB 가까이 받는다 — 화면에 들어올 때까지 미룬다.
         닫힌 아코디언 안에 있으면 열기 전에는 받지 않는다. */
      loading: 'lazy',
      allow: 'accelerometer; clipboard-write; encrypted-media; picture-in-picture',
      referrerpolicy: 'strict-origin-when-cross-origin',
      allowfullscreen: true,
    }));
}

function video(work) {
  const id = videoId(work);
  if (!id) return null;

  const caption = typeof work.video === 'string' ? '' : t(work.video.label);
  return el(
    'section.dvideo',
    null,
    embed(id, `${titleText(t(work.title))} ${caption || '영상'}`),
    caption ? el('p.dvideo-cap.meta', { text: caption }) : null
  );
}

/* 영상이 여럿인 작업(연도별 기록 영상 같은 것)은 아코디언 안에 세로로 쌓는다.
   video(하나짜리)는 오른쪽 열 맨 위에 그대로 두고, 이쪽은 videos 배열이 정한다. */
const RECORDINGS = { ko: '기록 영상', en: 'Recordings' };

function videoStack(work) {
  const list = (work.videos || []).filter((v) => v.embedId);
  if (!list.length) return null;

  const box = el('div.dvstack');
  for (const v of list) {
    const label = t(v.label) || v.year || '';
    box.append(
      el('figure.dvitem', null,
        label ? el('figcaption.meta', { text: label }) : null,
        embed(v.embedId, `${titleText(t(work.title))} ${label}`))
    );
  }
  return box;
}

/* ---------- 아코디언 ---------- */

/* 아코디언 제목과 표시 문구. 국문·영문을 한 곳에 둔다. */
/* 회차 칸은 두 개뿐이고 모든 작업이 같은 이름을 쓴다.
   '공연 일정'이라 부르지 않는다 — 움직이는 숲처럼 워크숍 회차가 절반인 작업이 있다. */
const UPCOMING = { ko: '일정', en: 'Upcoming' };
const PAST = { ko: '지난 일정', en: 'Past' };
const INFO = { ko: '정보', en: 'Info' };
const CREDITS = { ko: '크레딧', en: 'Credits' };
const MATERIALS = { ko: '자료', en: 'Materials' };
const PREMIERE = { ko: '초연', en: 'Premiere' };
const SCHEDULE_TITLE = /^(일정|지난 일정|공연 일정|공연 히스토리|Upcoming|Past|Dates|History|Schedule)/;

/** 오늘(현지 시각 기준). 회차를 지난 것과 앞으로 있을 것으로 가르는 기준. */
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${nn(d.getMonth() + 1)}-${nn(d.getDate())}`;
}

/* '초연'은 공연에만 쓰는 개념이다.
   리서치·네트워크·레지던시·축제에는 첫 회차라는 것이 따로 의미를 갖지 않는다. */

/**
 * '기록 영상'을 목록에 끼워 넣는다. 링크 항목 바로 앞 — 링크는 늘 맨 마지막이다.
 * videos 가 없으면 아무것도 하지 않는다.
 */
function addRecordings(list, work) {
  const stack = videoStack(work);
  if (!stack) return;
  const item = { title: t(RECORDINGS), rows: [], node: stack };
  const at = list.findIndex((a) => /^(링크|Links|자료|Materials)/.test(a.title));
  if (at === -1) list.push(item);
  else list.splice(at, 0, item);
}

/**
 * 아코디언 목록을 만든다.
 * works.json 에 accordions 가 있으면 그대로 쓰고(적힌 순서 유지),
 * 없으면 가진 데이터에서 '일정'과 '정보'를 만들어 본다.
 * 어느 쪽이든 줄이 하나도 없는 항목은 만들지 않는다 — 빈 제목만 남기지 않기 위해서.
 */
function buildAccordions(work) {
  /* 위에 임베드된 영상과 같은 것은 링크 줄로 또 내보내지 않는다.
     데이터 쪽을 지우지 않고 여기서 거른다 — 주소는 자료 목록으로 남을 값이다. */
  const isSameVideo = (url) => isEmbeddedVideo(work, url);

  /* '일정'은 늘 runs 에서 만든다 — 손으로 적은 목록과 회차 데이터를 둘 다 두면
     반드시 한쪽만 고쳐져 어긋난다. */
  const runs = [...(work.runs || [])];
  const first = premiereRun(work);

  /* 한 줄: 날짜·시간 · 도시 · 장소 · 도트의 역할 · 초연
     도트의 역할이 비어 있으면 그 자리가 통째로 빠진다 — 도트가 관여하지 않은 회차다.
     도시와 장소가 같은 말이면 한 번만 적는다(도르트문트 · 도르트문트). */
  const where = (r, l) => [...new Set([t(r.city, l), t(r.venue, l)].filter(Boolean))].join(' · ');

  /* 회차의 역할이 작업 전체의 역할과 같으면 회차 줄에는 적지 않는다 —
     APP 의 열 회차에 '기획'이 열 번 되풀이되면 다른 것과 구별되지 않는다.
     데이터는 그대로 둔다. 비워 두면 '도트가 관여하지 않은 회차'라는 뜻이 되어 버린다.
     같은지는 국문으로 견준다 — 화면 언어에 따라 나왔다 사라졌다 하면 안 된다. */
  const roleOf = (r, l) =>
    t(r.dotRole, 'ko') === t(work.dotRole, 'ko') ? '' : t(r.dotRole, l);
  /* 회차 메모(축제 이름 같은 것)도 그린다 — 적어 두고 화면에 없으면 없는 값과 같다(함정 1). */
  const line = (r, l, mark) =>
    [
      [runWhen(r, l), r.time].filter(Boolean).join(' '),
      where(r, l),
      t(r.note, l),
      roleOf(r, l),
      /* 메모에 이미 '초연' 이 적혀 있으면 표시를 또 붙이지 않는다 —
         '런던 초연 · 국제공동제작 · 초연' 처럼 같은 말이 두 번 남는다. */
      r === first && !t(r.note, l).includes(mark) ? mark : '',
    ]
      .filter(Boolean)
      .join(' · ');

  const runRow = (r) => ({ ko: line(r, 'ko', PREMIERE.ko), en: line(r, 'en', PREMIERE.en) });

  /**
   * 공연은 '앞으로 있을 회차가 있느냐'로 갈린다.
   *
   *   있으면  공연 일정(예정·진행 중, 가까운 것부터) + 공연 히스토리(지난 것, 최신이 위로)
   *   없으면  공연 일정 하나에 전 회차를 최신순으로
   *
   * 지난 공연만 남은 작업에까지 '히스토리'라는 칸을 따로 두면,
   * 앞으로 아무 일도 없다는 것이 두 번 말해진다.
   * 공연이 아닌 작업(리서치·네트워크·레지던시·축제)은 '일정' 하나로 둔다.
   */
  /* '일정' 은 앞으로 있을 회차 전부에, 지난 것 중 가장 최근 한 건을 더한 것이다.
     방금 끝난 회차가 '지난 일정' 으로 떨어져 버리면 지금 무엇을 하고 있는지가 안 보인다.
     나머지 지난 회차는 '지난 일정' 으로 간다. 날짜로만 가르고 사람이 옮기지 않는다.

     일정  — 오름차순. 가까운 것이 위. (막 끝난 한 건이 맨 위, 그 다음이 다음 회차)
     지난 일정 — 내림차순. 최신이 위.
     지난 일정이 비면 그 칸을 만들지 않는다. */
  const schedule = () => {
    if (!runs.length) return [];
    const asc = (a, b) => (a.start < b.start ? -1 : 1);
    const desc = (a, b) => -asc(a, b);
    const ended = (r) => (r.end || r.start) < today();

    const past = runs.filter(ended).sort(desc);      // 최신이 앞
    const upcoming = runs.filter((r) => !ended(r));
    if (past.length) upcoming.push(past.shift());    // 가장 최근 지난 것 한 건을 일정으로

    return [
      { title: t(UPCOMING), rows: upcoming.sort(asc).map(runRow) },
      ...(past.length ? [{ title: t(PAST), rows: past.map(runRow) }] : []),
    ];
  };

  if (work.accordions?.length) {
    /* 두 가지 모양을 받는다 — 목록(rows)과 산문(paragraphs). */
    const list = work.accordions
      .map((a) => ({
        title: t(a.title),
        rows: (a.rows || []).filter(
          (r) => t(r) && !('url' in r && !r.url) && !isSameVideo(r.url)
        ),
        paragraphs: (t(a.paragraphs, lang.current) || a.paragraphs?.ko || []).filter?.(Boolean) ?? [],
      }))
      .filter((a) => a.title && (a.rows.length || a.paragraphs.length || a.node));

    /* 직접 적은 목록에 일정이 없고 회차 데이터가 있으면 맨 앞에 넣어 준다.
       회차를 채웠는데 화면에 안 나오는 일을 막기 위한 것이다(함정 1). */
    if (!list.some((a) => SCHEDULE_TITLE.test(a.title))) list.unshift(...schedule());
    addRecordings(list, work);
    return list;
  }

  const out = [...schedule()];

  /* '도트의 역할'은 여기 두지 않는다 — 아카이브의 닫힌 행에 이미 나와 있다.
     같은 말을 목록과 상세에 두 번 적으면 한쪽만 고쳐진다. */
  const info = [
    ['장소', t(work.venue)],
    ['제작·주최', t(work.produced)],
    ['커미션', t(work.commission)],
    ['키워드', t(work.keywords)],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => ({ ko: `${k} : ${v}` }));

  /* works.json 의 info[] — 라벨과 값이 짝으로 들어 있다(role · name).
     라벨을 필드 이름에서 만들지 않으므로 한 작업에 주체를 여럿 적을 수 있고,
     둘 다 {ko,en} 이라 영문 화면에서는 라벨까지 함께 바뀐다.
     아카이브의 아코디언도 같은 배열을 쓴다 — 두 화면이 어긋나지 않는다. */
  const roles = (work.info || [])
    .filter((x) => t(x.name))
    .map((x) => ({
      ko: [t(x.role, 'ko'), t(x.name, 'ko')].filter(Boolean).join(' : '),
      en: [t(x.role, 'en'), t(x.name, 'en')].filter(Boolean).join(' : '),
    }));

  if (info.length || roles.length) out.push({ title: t(INFO), rows: [...info, ...roles] });
  addRecordings(out, work);

  /* credits 배열이 있으면 크레딧 항목으로. 데이터만 있고 화면에 없는 필드를 두지 않는다. */
  const credits = (work.credits || [])
    .map((c) => ({
      ko: [t(c.role, 'ko'), t(c.name, 'ko')].filter(Boolean).join(' : '),
      en: [t(c.role, 'en'), t(c.name, 'en')].filter(Boolean).join(' : '),
    }))
    .filter((r) => r.ko);
  if (credits.length) out.push({ title: t(CREDITS), rows: credits });

  /* 자료는 주소가 있는 공개 자료만. 아카이브와 같은 규칙.
     위에 임베드한 영상과 같은 주소면 뺀다. */
  const mats = (work.materials || [])
    .filter((m) => m.public === '예' && m.url && !isSameVideo(m.url))
    .map((m) => ({ ko: [m.type, t(m.label)].filter(Boolean).join(' : '), url: m.url }));
  if (mats.length) out.push({ title: t(MATERIALS), rows: mats });

  return out;
}

function accordions(work) {
  const list = buildAccordions(work);
  if (!list.length) return null; // 다섯 개가 다 비면 본문 아래를 그냥 닫는다

  const box = el('div.acc');
  list.forEach((a, i) => {
    const det = el('details', i === 0 ? { open: true } : null); // 첫 항목만 열어 둔다
    det.append(el('summary', { text: a.title }));

    /* 세 가지 모양을 받는다 — 산문(paragraphs) · 목록(rows) · 만들어 둔 조각(node). */
    if (a.node) det.append(a.node);

    /* 산문은 문단으로, 목록은 줄로. ⬡ 는 SVG 로 그린다. */
    if (a.paragraphs?.length) {
      const prose = el('div.acc-prose');
      for (const para of a.paragraphs) prose.append(el('p', null, richNodes(para)));
      det.append(prose);
    }
    if (a.rows.length) {
      const ul = el('ul.acc-rows');
      /* 아코디언 안의 두 층. 괄호는 표시에서 걷어낸다.
           [머리줄]   회차·구간의 머리. 굵게, 위에 선을 긋는다.
           《소제목》  묶음 이름. 연하고 작게. 그 아래 줄들은 한 단 들여쓴다.
         머리줄이 나오면 들여쓰기를 푼다 — 다음 구간이 시작된 것이다. */
      let indent = false;
      for (const r of a.rows) {
        const head = t(r).match(/^\[(.+)\]$/);
        if (head) {
          indent = false;
          ul.append(el('li.acc-head', null, el('b', { text: head[1] })));
          continue;
        }
        const sub = t(r).match(/^《(.+)》$/);
        if (sub) {
          indent = true;
          ul.append(el('li.acc-sub', { text: sub[1] }));
          continue;
        }
        ul.append(
          el(
            `li${indent ? '.acc-in' : ''}`,
            null,
            r.url
              ? el('a', { href: r.url, target: '_blank', rel: 'noopener' }, titleNodes(t(r)))
              : el('span', null, richNodes(t(r)))
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

  /* 영문을 청했는데 본문 영문이 없어 국문이 그대로 나오는 경우.
     번역이 없다고 화면을 비우지 않는다 — 대신 무엇을 보고 있는지 한 줄로 알린다. */
  if (isFallback(work.body)) {
    box.append(el('p.dtranslating.meta', { text: 'Korean text — English translation in progress' }));
  }

  if (lead) box.append(el('p.lead', { text: lead }));
  if (body) {
    for (const para of body.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)) {
      box.append(el('p', null, richNodes(para)));   // {hex} 는 SVG, {work:…} 는 링크로
    }
  }
  /* 작품 안의 노랫말·대사. 본문이 아니므로 들여쓰고 옅게, 줄바꿈을 그대로 살린다
     (CSS 의 white-space:pre-line). 행을 다시 흘리면 노랫말이 아니게 된다. */
  if (t(work.quote)) box.append(el('p.dquote', { text: t(work.quote) }));

  /* 본문 각주. 낱말 하나를 풀어 주는 짧은 글이라 본문보다 작게, 바로 아래에 둔다.
     Works 카드의 '확인 필요' 표시(note)와는 다른 필드다(bodyNote). */
  if (t(work.bodyNote)) box.append(el('p.dnote.meta', { text: t(work.bodyNote) }));
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

const PHOTO_MAX = 35; //  img/works/<id>/01.jpg … 35.jpg 까지 찾아본다 (없는 번호는 조용히 빠진다)
const MANY_PORTRAITS = 5; //  세로가 이만큼 넘게 모이면 3열로 좁힌다

/* 폴더에 파일만 넣으면 뜨는 것이 기본이다(01.jpg … 12.jpg).
   photos 배열을 적으면 그 목록만 쓴다 — 파일 이름이 다른 형식이거나
   폴더에 있는 것 중 일부만 걸고 싶을 때. 표지는 늘 맨 앞이다. */
const photoCandidates = (w) => {
  /* photos 를 적었으면 그 목록이 전부다 — 적힌 차례대로 나간다.
     빈 배열도 뜻이 있다: '상세에 실을 사진이 없다'. 그때는 폴더를 뒤지지 않는다.
     아예 안 적었으면 예전처럼 폴더에서 번호 순으로 찾아본다. */
  const list = Array.isArray(w.photos)
    ? workPhotos(w)
    : [
        w.cover,
        ...Array.from({ length: PHOTO_MAX }, (_, i) => `img/works/${w.id}/${nn(i + 1)}.jpg`),
        `img/works/${w.id}/poster.jpg`,
      ];
  return [...new Set(list.filter(Boolean))];
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

/* 사진 아래 촬영자·제공자 한 줄. 슬라이드에서는 넘길 때마다 이 줄이 함께 바뀐다.
   한 화면에 여러 장이 함께 보이는 배치에서는 서로 다른 크레딧을 모아 적는다.
   works.json 의 note 는 '확인 필요' 표시라 여기 넘기지 않는다 —
   넘기면 크레딧 자리에 그 글자가 찍힌다.
   creditType 은 쓰지 않는다 — 파일별 크레딧은 'ⓒ…' 처럼 표기가 문자열 안에 이미 있다. */
function creditBar(work) {
  const node = el('p.credit.meta');
  const set = (srcs) => {
    if (work.photoCreditShow === false) { node.hidden = true; return; }
    const seen = [...new Set([].concat(srcs).map((x) => photoCreditFor(work, x)).filter(Boolean))];
    node.textContent = seen.join(' · ');
    node.hidden = !seen.length;      // 적을 것이 없으면 줄을 만들지 않는다
  };
  return { node, set };
}

/** 표지가 하나도 없을 때의 색면. Works 카드와 같은 규칙. */
const colourBlock = (work) =>
  el(`span.block.${fieldClass(work.producers)}`, null,
    el('i.blob-card'),
    el('span.block-t', { text: kindName(work) }));

/** 고른 패턴대로 그린다. 슬라이드는 sequence 모드와 같은 컴포넌트를 쓴다. */
function photoArea(photos, p, onSlide) {
  if (p.kind === 'one') return shot(photos[0], `.dshot${p.tall ? '.tall' : ''}`, true);
  if (p.kind === 'stack') return el('div.dstack', null, ...photos.map((x, i) => shot(x, '', i === 0)));
  if (p.kind === 'pair') return el('div.dpair', null, ...photos.map((x, i) => shot(x, '', i === 0)));
  if (p.kind === 'slides') return slideshow(photos.map((x) => x.src), onSlide);
  return el(`div.dgrid.${p.cols}`, null, ...photos.map((x, i) => shot(x, '', i < 2)));
}

/* ---------- 슬라이드 ----------
   한 장씩 넘겨 본다. 자동 배치의 '3장 이상 가로 위주' 와
   gallery:"sequence" 가 이 하나를 함께 쓴다 — 두 벌을 두면 한쪽만 고쳐진다.
   어떤 경우에도 자르지 않는다(contain). */


const THUMBS_FROM = 10; //  사진이 이보다 많을 때만 아래에 썸네일 줄을 만든다

/* 누르고 있으면 계속 넘어간다. 30장을 한 번씩 눌러 넘기게 두지 않기 위한 것.
   처음 한 번은 바로, 그 뒤로는 조금 뜸을 들였다가 이어서. */
function holdToRepeat(btn, step) {
  let first = null, tick = null;
  const stop = () => { clearTimeout(first); clearInterval(tick); first = tick = null; };
  btn.addEventListener('pointerdown', (e) => {
    if (btn.disabled) return;
    e.preventDefault();
    btn.setPointerCapture?.(e.pointerId);
    step();
    first = setTimeout(() => { tick = setInterval(step, 170); }, 420);
  });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) btn.addEventListener(ev, stop);
  /* pointerdown 에서 이미 한 칸 넘겼으므로 click 은 무시한다 — 두 칸 넘어가지 않게. */
  btn.addEventListener('click', (e) => e.preventDefault());
}

function slideshow(files, onSlide) {
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

  /* 점은 두지 않는다 — 서른 개가 늘어서면 지금 어디인지 알려주지 못한다.
     자리는 '12 / 30' 숫자가 알려준다. */
  const counter = el('span.seq-count.meta');

  const prev = el('button.seq-btn.seq-prev', { type: 'button', 'aria-label': '이전 사진', text: '←' });
  const next = el('button.seq-btn.seq-next', { type: 'button', 'aria-label': '다음 사진', text: '→' });

  /* 썸네일 줄. 장수가 많을 때만 만든다 — 적으면 화살표로 충분하다. */
  const many = list.length > THUMBS_FROM;
  const thumbs = many ? el('div.seq-thumbs', { role: 'tablist', 'aria-label': '사진 고르기' }) : null;
  if (thumbs) {
    list.forEach((src, i) => {
      const b = el('button.seq-thumb', { type: 'button', 'aria-label': `${i + 1}번째 사진` });
      b.append(el('img', { src, alt: '', loading: 'lazy' }));
      b.addEventListener('click', () => show(i));
      thumbs.append(b);
    });
  }

  let at = 0;
  const show = (i, smooth = true) => {
    at = Math.max(0, Math.min(list.length - 1, i));
    track.scrollTo({ left: at * track.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
    sync();
  };
  const sync = () => {
    onSlide?.(list[at]);            // 크레딧 줄이 이 사진을 따라온다
    counter.textContent = `${at + 1} / ${list.length}`;
    prev.disabled = at === 0;
    next.disabled = at === list.length - 1;
    if (!thumbs) return;
    [...thumbs.children].forEach((b, i) => {
      const on = i === at;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', String(on));
      /* 고른 썸네일이 줄 밖으로 나가 있으면 끌어온다. */
      if (on) b.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
    });
  };

  holdToRepeat(prev, () => show(at - 1));
  holdToRepeat(next, () => show(at + 1));

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
    el('div.seq-foot', null, counter),
    thumbs);

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
  /* 영문판에서 감춘 작업은 Explore more 에도 나오지 않는다. */
  const others = visibleWorks(works).filter((w) => w.id !== work.id);
  const byNew = [...others].sort((a, b) => latestRun(b).localeCompare(latestRun(a)));
  const same = byNew.filter((w) => formKey(w) === formKey(work) && formKey(work));

  /* 같은 형식을 먼저 채우고, 모자라면 최신순으로 이어 붙인다. */
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
    card.append(vis, formBadge(w), el('span.t', null, titleNodes(t(w.title))),
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

    /* 감춘 작업은 없는 것으로 다룬다 — 주소를 직접 쳐도 열리지 않게. */
    const work = site.works.filter(isPublic).find((w) => w.id === id);
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
    /* gallery:"sequence" — galleryImages 를 적었으면 그 목록만,
       적지 않았으면 폴더에서 찾아낸 사진 전부를 순서대로 넘겨 본다. */
    /* gallery:"sequence" — photos 에 적은 차례대로 넘겨 본다.
       예전 galleryImages 도 아직 받아준다. */
    const listed = work.gallery === 'sequence'
      ? [...new Set([...workPhotos(work), ...(work.galleryImages || []), work.cover].filter(Boolean))]
      : [];
    /* 크레딧 줄은 어느 배치에서든 하나뿐이다. 슬라이드면 넘길 때마다 갈아 끼운다. */
    const bar = creditBar(work);

    if (listed.length > 1) {
      media.append(slideshow(listed, bar.set), bar.node);
      return;
    }

    const photos = await collectPhotos(work);

    /* 넘길 것이 한 장뿐이면 슬라이드를 만들지 않는다 —
       화살표가 둘 다 꺼진 채 '1 / 1' 만 남으면 고장으로 보인다. */
    if (work.gallery === 'sequence' && photos.length > 1) {
      media.append(slideshow(photos.map((p) => p.src), bar.set), bar.node);
      return;
    }

    /* photos: [] 라고 적어 둔 작업은 사진 자리를 아예 만들지 않는다 —
       영상만 있는 작업에 빈 틀이나 색면이 남지 않게. 사진 칸을 적지 않은 작업은
       종전처럼 색면으로 자리를 채운다(오른쪽 열이 통째로 비면 조판이 무너진다). */
    if (!photos.length && Array.isArray(work.photos)) return;

    const shape = plan(photos);
    media.append(
      photos.length ? photoArea(photos, shape, bar.set) : el('figure.dshot', null, colourBlock(work))
    );
    /* 사진 아래에 촬영자·제공자를 적는다. 예술가 사진과 같은 규칙(ui.js).
       슬라이드는 넘길 때마다 slideshow 가 이 줄을 갈아 끼우므로 건드리지 않는다 —
       여기서 다시 채우면 첫 장의 크레딧이 전체 목록으로 덮여 버린다.
       한 화면에 여러 장이 함께 보이는 배치에서만 보이는 것을 모아 적는다. */
    if (photos.length) {
      if (shape.kind !== 'slides') bar.set(photos.map((x) => x.src));
      media.append(bar.node);
    }
  } catch (err) {
    console.error(err);
    document.getElementById('page').append(
      el('p.load-error', { text: `데이터를 읽지 못했습니다. ${err.message}` })
    );
  }
}

main();
