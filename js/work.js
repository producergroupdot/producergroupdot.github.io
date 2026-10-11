/* work.js — 작업 상세. 모든 작업이 같은 템플릿을 쓴다.
   화면은 두 열이다. 왼쪽 36% 가 제목·글(붙박이), 오른쪽 64% 가 영상과 세로로 흐르는 사진.
   대부분의 작업은 본문·크레딧·회차가 비어 있으므로, 값이 없는 부분은
   빈 껍데기를 남기지 않고 통째로 빠진다. */

import { loadSite } from './data.js?v=20261011';
import { t, lang, isFallback, UI } from './i18n.js?v=20261011';
import {
  el, injectProducerColors, dots, fieldClass, titleNodes, titleText,
  topBar, footer, pageUrl, link, photo, coverCandidates, formBadge, formKey, kindName, isPerformance, workPhotos, isPublic,
  latestRun, yearSpan, photoCreditFor, visibleWorks, videoId, videoIdOf, videoProvider,
  isEmbeddedVideo, lightbox, richNodes,
  runWhen,
} from './ui.js?v=20261011';

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
    t(work.artist) ? el('p.dartist', { text: t(work.artist) }) : null
  );
}

/* ---------- 초연 회차 ----------
   초연은 머스트헤드에 따로 적지 않고 일정 칸의 그 회차 줄 앞에 라벨로만 붙인다.
   위에서 내린 것이지 버린 것이 아니다 — 라벨이 없으면 어느 회차가 초연이었는지가 사라진다.
   공연에만 붙는다. 초연 회차는 5.일정 탭의 '초연' 열(runs[].premiere)이 정한다. */

function premiereRun(work) {
  return isPerformance(work) ? (work.runs || []).find((r) => r.premiere === true) || null : null;
}

/* ---------- 영상 ---------- */

/* 추적을 끈 주소로만 심는다. 자동재생은 없다.
   { embedId, label } 형태를 쓰고, 예전 문자열 형태도 받아준다.
   videoId() · videoProvider() 는 ui.js 에 있다 — 판정을 한 곳에 둔다. */

/* 서비스마다 플레이어 주소가 다르다. 새 서비스가 생기면 여기 한 줄만 더한다.
   유튜브는 privacy-enhanced 주소, 비메오는 dnt=1 로 추적을 끈다. */
const EMBED_SRC = {
  youtube: (id) => `https://www.youtube-nocookie.com/embed/${id}`,
  vimeo: (id) => `https://player.vimeo.com/video/${id}?dnt=1`,
};

/** 16:9 임베드 하나. 아래·위 라벨은 부르는 쪽이 붙인다. */
function embed(id, title, provider = 'youtube') {
  const src = (EMBED_SRC[provider] || EMBED_SRC.youtube)(id);
  return el('div.dvideo-box', null,
    el('iframe', {
      src,
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
    embed(id, `${titleText(t(work.title))} ${caption || '영상'}`, videoProvider(work.video)),
    caption ? el('p.dvideo-cap.meta', { text: caption }) : null
  );
}

/* 영상이 여럿인 작업(연도별 기록 영상 같은 것)은 아코디언 안에 세로로 쌓는다.
   video(하나짜리)는 오른쪽 열 맨 위에 그대로 두고, 이쪽은 videos 배열이 정한다. */
const RECORDINGS = { ko: '기록 영상', en: 'Recordings' };

function videoStack(work) {
  const list = (work.videos || []).filter((v) => v.embedId || videoIdOf(v));
  if (!list.length) return null;

  const box = el('div.dvstack');
  for (const v of list) {
    const label = t(v.label) || v.year || '';
    box.append(
      el('figure.dvitem', null,
        label ? el('figcaption.meta', { text: label }) : null,
        embed(videoIdOf(v), `${titleText(t(work.title))} ${label}`, videoProvider(v)))
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

  /* 한 줄: (초연) · 날짜·시간 · 도시 · 장소 · 메모 · 도트의 역할
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
      /* 초연 라벨은 줄 맨 앞 — 날짜보다 먼저 읽혀야 어느 회차인지 눈에 든다.
         메모에 '런던 초연' 이 있어도 붙인다. 메모를 보고 빼면 그 회차만 라벨 자리가 비고,
         대소문자가 다른 영문(UK premiere)에서는 언어에 따라 나왔다 사라졌다 한다. */
      r === first ? mark : '',
      [runWhen(r, l), t(r.time, l)].filter(Boolean).join(' '),
      where(r, l),
      t(r.note, l),
      roleOf(r, l),
    ]
      .filter(Boolean)
      .join(' · ');

  const runRow = (r) => ({ ko: line(r, 'ko', PREMIERE.ko), en: line(r, 'en', PREMIERE.en) });

  /**
   * 회차 칸은 둘뿐이고 형식과 무관하게 모든 작업이 같은 이름을 쓴다.
   * 가르는 것은 날짜뿐이다 — 사람이 회차를 옮기지 않는다.
   *
   *   일정      오늘 이후의 회차만      오름차순, 가까운 것이 위
   *   지난 일정  오늘 이전의 모든 회차   내림차순, 최신이 위
   *
   * 비면 그 칸을 그리지 않는다. 오늘 끝나는 회차는 아직 진행 중이라 '일정' 에 남는다 —
   * 홈 NOW 와 Works 의 '현재 진행 중' 이 쓰는 ui.js 의 isRunLive() 와 같은 기준이다.
   */
  const schedule = () => {
    if (!runs.length) return [];
    const asc = (a, b) => (a.start < b.start ? -1 : 1);
    const desc = (a, b) => -asc(a, b);
    const ended = (r) => (r.end || r.start) < today();

    const past = runs.filter(ended).sort(desc);          // 최신이 앞
    const upcoming = runs.filter((r) => !ended(r)).sort(asc);

    /* 예정이 없으면 '일정' 칸을 아예 만들지 않는다.
       막 끝난 한 건을 끌어올려 칸을 채우던 방식은 없앴다 — 지난 회차가
       '일정' 이라는 이름 아래 놓이면 앞으로 볼 수 있는 것으로 읽힌다.
       지난 것은 '지난 일정' 에 전부 그대로 있다. */
    return [
      ...(upcoming.length ? [{ title: t(UPCOMING), rows: upcoming.map(runRow) }] : []),
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

  /* 하나만 열어 둔다 — 맨 앞에 오는 일정 칸(예정이 있으면 '일정', 없으면 '지난 일정').
     날짜가 클릭 뒤로 숨지 않게. 일정 칸이 없는 작업은 첫 항목을 연다. */
  const openAt = Math.max(0, list.findIndex((a) => SCHEDULE_TITLE.test(a.title)));

  const box = el('div.acc');
  list.forEach((a, i) => {
    const det = el('details', i === openAt ? { open: true } : null);
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

/* 제목 블록부터 아코디언까지 전부 이 열에 든다. 노트북에서는 스크롤에 붙박이고
   (css/work.css), 모바일에서는 이 열이 풀려 사진과 한 줄로 섞인다.
   그래서 덩어리마다 따로 감싸 둔다 — 제목 · 리드 · 본문 · 아코디언.
   폭이 아니라 조판으로 읽히게 한다 — 글줄은 34em 에서 멈추고,
   문단 사이는 한 줄 높이만큼 벌리고, 아코디언은 선 하나와 큰 여백으로 떼어 놓는다. */
function textCol(work, producerById) {
  const lead = t(work.lead);
  const body = t(work.body);
  const acc = accordions(work);

  const box = el('div.dcol-text', null, head(work, producerById));
  if (lead) box.append(el('p.lead', { text: lead }));

  const main = el('div.dbody');
  /* 영문을 청했는데 본문 영문이 없어 국문이 그대로 나오는 경우.
     번역이 없다고 화면을 비우지 않는다 — 대신 무엇을 보고 있는지 한 줄로 알린다. */
  if (body && isFallback(work.body)) {
    main.append(el('p.dtranslating.meta', { text: 'Korean text — English translation in progress' }));
  }
  if (body) {
    for (const para of body.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean)) {
      main.append(el('p', null, richNodes(para)));   // {hex} 는 SVG, {work:…} 는 링크로
    }
  }
  /* 작품 안의 노랫말·대사. 본문이 아니므로 들여쓰고 옅게, 줄바꿈을 그대로 살린다
     (CSS 의 white-space:pre-line). 행을 다시 흘리면 노랫말이 아니게 된다. */
  if (t(work.quote)) main.append(el('p.dquote', { text: t(work.quote) }));

  /* 본문 각주. 낱말 하나를 풀어 주는 짧은 글이라 본문보다 작게, 바로 아래에 둔다.
     Works 카드의 '확인 필요' 표시(note)와는 다른 필드다(bodyNote). */
  if (t(work.bodyNote)) main.append(el('p.dnote.meta', { text: t(work.bodyNote) }));
  if (main.children.length) box.append(main);
  if (acc) box.append(acc);
  return box;
}

/* ---------- 오른쪽 사진 ----------
   사진을 세로로 한 장씩, 열 폭 그대로 흘린다. 슬라이드도 격자도 쓰지 않는다 —
   넘겨야 보이는 사진은 대부분 보지 않고 지나간다.
   흘려 두면 글을 읽는 동안 옆에서 사진이 지나간다.

   가로든 세로든 열 폭을 꽉 채운다(높이 상한은 열 폭의 2배 — css/work.css).
   어느 쪽이든 자르지 않는다. 크레딧이 같은 사진은 한 덩어리로 붙고, 크레딧은 덩어리 맨 아래에 한 번. */

const SHOW_FIRST = 10; //  처음에 펼쳐 두는 장수. 나머지는 '더 보기' 뒤에 접힌다
const PHOTO_MAX = 35; //  img/works/<id>/01.jpg … 35.jpg 까지 찾아본다 (photos 를 적지 않은 작업만)

/* photos 를 적었으면 그 목록이 전부다 — 적힌 차례대로 나간다.
   빈 배열도 뜻이 있다: '상세에 실을 사진이 없다'. 그때는 폴더를 뒤지지 않는다.
   아예 안 적었으면 예전처럼 폴더에서 번호 순으로 찾아본다(그때만 실제로 떠 보아 거른다). */
async function photoList(work) {
  if (Array.isArray(work.photos)) return [...new Set(workPhotos(work))];
  const tries = [
    work.cover,
    ...Array.from({ length: PHOTO_MAX }, (_, i) => `img/works/${work.id}/${nn(i + 1)}.jpg`),
    `img/works/${work.id}/poster.jpg`,
  ];
  const found = await Promise.all([...new Set(tries.filter(Boolean))].map((src) =>
    new Promise((done) => {
      const im = new Image();
      im.onload = () => done(src);
      im.onerror = () => done(null);
      im.src = src;
    })));
  return found.filter(Boolean);
}

/** 사진 한 장. 누르면 원본 크기로 연다. 없는 파일은 조용히 빠진다 —
    덩어리에 남은 사진이 없으면 덩어리도 함께 빠진다. */
function photoImg(src, i) {
  const img = el('img.cover', { src, alt: '', loading: i < 2 ? 'eager' : 'lazy' });
  img.addEventListener('error', () => {
    const box = img.parentElement;
    img.remove();
    if (box && !box.querySelector('img')) box.remove();
  });
  img.addEventListener('click', () => lightbox(src));
  return img;
}

/* 크레딧이 같은 사진끼리 한 덩어리로 묶는다. 데이터 차례대로 읽으며 **이어진** 것만 묶는다 —
   차례는 작품의 흐름이 정하므로 바꾸지 않는다. 같은 촬영자가 떨어져 나오면 덩어리도 둘이다.
   크레딧이 빈 사진끼리도 묶인다(아래에 아무것도 나오지 않는다).
   같은지는 화면에 나올 글자로 견준다 — 국문은 다르고 영문이 같으면 영문 화면에서는 한 덩어리다. */
function photoGroups(work, photos) {
  const groups = [];
  photos.forEach((src) => {
    const credit = work.photoCreditShow === false ? '' : photoCreditFor(work, src);
    const last = groups[groups.length - 1];
    if (last && last.credit === credit) last.srcs.push(src);
    else groups.push({ credit, srcs: [src] });
  });
  return groups;
}

/** 덩어리 하나 — 사진들(사이 0) + 맨 아래 크레딧 한 번. */
function shotGroup(group, start) {
  const fig = el('figure.dshot', null, ...group.srcs.map((src, k) => photoImg(src, start + k)));
  if (group.credit) fig.append(el('figcaption.credit.meta', { text: group.credit }));
  return fig;
}

/* 모바일에서 본문 앞으로 올리는 첫 사진 한 장. 데스크톱에서는 감춘다(css/work.css).
   덩어리에서 떨어져 혼자 서므로 그 덩어리의 크레딧을 자기 아래에 단다. */
function liftedShot(group) {
  const fig = el('figure.dshot.dlift', null, photoImg(group.srcs[0], 0));
  if (group.credit) fig.append(el('figcaption.credit.meta', { text: group.credit }));
  return fig;
}

/* SHOW_FIRST 장 가까이에서 접는다. 다만 덩어리 경계에서만 자른다 —
   덩어리 중간을 자르면 크레딧이 엉뚱한 사진 아래에 붙는다.
   경계(앞에서부터 센 장수) 가운데 SHOW_FIRST 에 가장 가까운 것을 고르고, 같으면 더 많이 보이는 쪽.
   첫 덩어리는 늘 보인다. 고른 경계가 끝이면 접을 것이 없다.
   누르면 전부 펼치고 버튼은 사라진다 — 접기는 두지 않는다.
   접힌 사진도 loading="lazy" 이므로 펼치기 전에는 받지 않는다(display:none 은 받지 않는다). */
function foldGroups(groups, figs) {
  let count = 0, cut = 1, best = Infinity;
  groups.forEach((g, i) => {
    count += g.srcs.length;
    const d = Math.abs(count - SHOW_FIRST);
    if (d <= best) { best = d; cut = i + 1; }
  });
  const rest = figs.slice(cut);
  if (!rest.length) return null;
  const n = groups.slice(cut).reduce((sum, g) => sum + g.srcs.length, 0);
  rest.forEach((f) => { f.hidden = true; });
  const btn = el('button.dmore-photos.meta', {
    type: 'button',
    text: t(UI.morePhotos).replace('{n}', n),
  });
  btn.addEventListener('click', () => {
    rest.forEach((f) => { f.hidden = false; });
    btn.remove();
  });
  return btn;
}

/* ---------- Explore more ---------- */

/** 표지가 하나도 없을 때의 색면. Works 카드와 같은 규칙. */
const colourBlock = (work) =>
  el(`span.block.${fieldClass(work.producers)}`, null,
    el('i.blob-card'),
    el('span.block-t', { text: kindName(work) }));

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

    document.getElementById('top-bar').replaceChildren(topBar(site, 'works'));

    /* 사진 목록을 먼저 정한다 — 사진이 없으면 두 열을 만들지 않기 때문이다.
       photos 를 적은 작업은 기다릴 것이 없다. */
    const photos = await photoList(work);
    const groups = photoGroups(work, photos);
    let at = 0;
    const figs = groups.map((g) => { const f = shotGroup(g, at); at += g.srcs.length; return f; });
    /* 모바일에서는 첫 사진 한 장만 본문 앞으로 올라간다(css/work.css 의 order).
       첫 덩어리에 그 한 장뿐이면 덩어리째 모바일에서 감춘다. */
    const lift = groups.length ? liftedShot(groups[0]) : null;
    figs[0]?.classList.add('first');
    if (groups[0]?.srcs.length === 1) figs[0].classList.add('single');

    /* 영상은 오른쪽 열 맨 위. 영상도 사진도 없으면 오른쪽 열 없이 글만 한 열로 둔다. */
    const vid = video(work);
    const media = vid || figs.length
      ? el('div.dcol-media', null, lift, vid, ...figs, foldGroups(groups, figs))
      : null;
    const text = textCol(work, site.producerById);
    const layout = el(`section.dlayout${media ? '' : '.solo'}`, null, text, media);

    document.getElementById('page').replaceChildren(
      layout,
      more(work, site.works, site.producerById)
    );
    document.getElementById('page-footer').replaceChildren(footer());
  } catch (err) {
    console.error(err);
    document.getElementById('page').append(
      el('p.load-error', { text: `${t(UI.loadError)} ${err.message}` })
    );
  }
}

main();
