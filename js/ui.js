/* ui.js — 여러 화면이 함께 쓰는 조각들.
   프로듀서 색 주입 · 색점 · 로고 · 특수문자 SVG · 작은 DOM 헬퍼. */

import { t, lang, isEn, setLang } from './i18n.js';

/* ---------- DOM 헬퍼 ---------- */

/** el('a.cell.c-cream', {href:'#/works'}, child, child…) */
export function el(spec, attrs, ...children) {
  const [tag, ...classes] = spec.split('.');
  const node = document.createElement(tag || 'div');
  if (classes.length) node.classList.add(...classes);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'text') node.textContent = v;
    else if (k.startsWith('--')) node.style.setProperty(k, v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c);
  }
  return node;
}

/* ---------- 어느 페이지가 이미 있는가 ---------- */

/**
 * 사이트에서 링크가 걸리는 곳은 전부 여기를 거친다.
 * 아직 만들지 않은 페이지는 null 로 두면 링크가 걸리지 않고 그냥 글자로 나온다.
 * 페이지를 만들면 이 표에서 한 줄만 고치면 사이트 전체의 링크가 한꺼번에 살아난다.
 */
const PAGES = {
  home: () => 'index.html',
  works: (query) => 'works.html' + (query || ''),
  artists: () => 'artists.html',
  about: () => 'about.html',
  /* Contact 은 페이지가 아니라 About 맨 아래 블록이다. */
  contact: () => 'about.html#contact',
  work: (id) => `work.html?id=${id}`,
  /* 네 사람 모두 페이지가 있다. 데이터가 비었는지로 링크를 막지 않는다 —
     소개문이 없어도 색면·이름·이메일만으로 페이지가 성립한다. */
  producer: (id) => `producers/${id}.html`,
  artist: (id) => `artists/${id}.html`,
};

/** 있는 페이지면 주소를, 없으면 빈 문자열을 돌려준다. */
export function pageUrl(kind, arg) {
  const make = PAGES[kind];
  if (!make) return '';
  return withLang(make(arg));
}

/**
 * 영문 화면에서는 사이트 안의 모든 링크에 ?lang=en 을 달고 다닌다.
 * 링크 한 번에 국문으로 돌아가 버리면 토글이 있으나 마나다.
 * 국문일 때는 아무것도 붙이지 않는다 — 국문이 기본이므로 주소가 깨끗하다.
 */
export function withLang(url) {
  if (!isEn() || !url) return url;
  const [path, hash = ''] = url.split('#');
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}lang=en${hash ? `#${hash}` : ''}`;
}

/**
 * 주소가 있으면 <a>, 없으면 같은 모양의 <span>.
 * 아직 없는 페이지로 가는 링크가 404 를 내지 않게 한다.
 */
export function link(url, spec, attrs, ...children) {
  const node = el((url ? 'a' : 'span') + spec, url ? { ...attrs, href: url } : attrs, ...children);
  if (!url) node.classList.add('inert');
  return node;
}

/* ---------- 회차에서 뽑는 것들 ----------
   Works · Archive · 홈 NOW · 작업 상세가 모두 이 함수들을 쓴다.
   같은 계산을 여러 파일에 복사해 두면 한쪽만 고쳐져 화면끼리 어긋난다. */

/** 가장 최근 회차의 끝 날짜. 회차가 없으면 시작 연도로 대신한다. */
export function latestRun(w) {
  const ends = (w.runs || []).map((r) => r.end || r.start).filter(Boolean);
  return ends.length ? ends.sort().at(-1) : `${w.yearFrom || 0}-00-00`;
}

/** 마지막 회차의 연도(숫자). 회차가 없으면 yearFrom. */
export const lastYear = (w) => Number(latestRun(w).slice(0, 4)) || 0;

/**
 * 회차의 최소~최대 연도. 회차가 없으면 works.json 에 적힌 year 를 그대로 쓴다.
 *
 * 시작 연도(yearFrom)가 가장 이른 회차보다 앞서면 거기서부터 센다.
 * 회차를 다 적어 두지 않은 작업 — 리서치·네트워크처럼 초기 몇 해를 기록하지 않은 것들 —
 * 이 뒤늦은 회차 하나 때문에 그 해에 시작한 것처럼 보이는 일을 막는다.
 * (Aesth:ethics 가 2024년에 시작했는데 2026 회차 하나만 있어 '2026' 으로 나왔다.)
 */
export function yearSpan(w) {
  const ys = (w.runs || []).flatMap((r) => [r.start, r.end]).filter(Boolean).map((d) => d.slice(0, 4));
  if (!ys.length) return w.year || '';
  let lo = ys.reduce((a, b) => (a < b ? a : b));
  const hi = ys.reduce((a, b) => (a > b ? a : b));
  if (w.yearFrom && String(w.yearFrom) < lo) lo = String(w.yearFrom);
  /* 진행 중인 작업은 끝을 닫지 않는다 — 마지막으로 적어 둔 회차의 해에 끝난 것처럼 보인다.
     APP 가 2025년 캠프까지만 적혀 있다고 '2014–25' 로 나오면 끝난 네트워크로 읽힌다. */
  if (w.status === 'ongoing') return `${lo}–`;
  return lo === hi ? lo : `${lo}–${hi.slice(2)}`;
}

/* ---------- 회차의 날짜 표기 ----------
   Archive 의 '일시'와 작업 상세의 '일정'이 같은 함수를 쓴다.
   두 곳에 따로 두면 한쪽만 고쳐져 같은 회차가 화면마다 다르게 적힌다. */

const WEEKDAYS = {
  ko: ['일', '월', '화', '수', '목', '금', '토'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

/* 요일은 날짜에서 계산한다 — 데이터에 따로 적지 않는다. 적어 두면 날짜만 고쳤을 때 어긋난다.
   UTC 로 읽는다. 현지 시간대로 읽으면 자정 근처에서 하루가 밀린다. */
const weekday = (iso, l) => (WEEKDAYS[l || lang.current] || WEEKDAYS.ko)[new Date(`${iso}T00:00:00Z`).getUTCDay()];

export const fmtDate = (s, withDay = false, l) => {
  const [y, m, d] = s.split('-');
  const base = `${y}. ${+m}. ${+d}`;
  return withDay ? `${base} (${weekday(s, l)})` : base;
};

/* 끝 날짜는 앞과 겹치는 만큼만 줄여 적는다.
   달을 넘기면 달까지, 해를 넘기면 날짜를 통째로 — 줄이지 않으면 9.29–10.3 이 9.29–3 이 된다. */
export const runRange = (r) => {
  const [fy, fm] = r.start.split('-');
  const [ty, tm, td] = r.end.split('-');
  if (ty !== fy) return `${fmtDate(r.start)} – ${fmtDate(r.end)}`;
  return `${fmtDate(r.start)} – ${tm === fm ? '' : `${+tm}. `}${+td}`;
};

/* 하루짜리 회차에만 요일을 붙인다. 범위에 붙이면 어느 날의 요일인지 알 수 없다. */
export const runWhen = (r, l) =>
  t(r.date, l) || (r.end && r.end !== r.start ? runRange(r) : fmtDate(r.start, true, l));

/** 회차가 열린 도시들. 같은 도시는 한 번만. */
export const runCities = (w) => [...new Set((w.runs || []).map((r) => t(r.city)).filter(Boolean))];

/* 목록의 도시 줄은 세 곳까지만 적고 나머지는 세어서 접는다.
   APP 처럼 회차가 열 번인 작업은 접지 않으면 카드 한 칸이 도시 이름으로 다섯 줄이 된다.
   상세의 일정은 접지 않는다 — 거기서는 회차를 다 보여주는 것이 목적이다. */
const CITIES_MAX = 3;

export function citiesLine(w) {
  const cs = runCities(w);
  if (cs.length <= CITIES_MAX) return cs.join(' · ');
  const rest = cs.length - CITIES_MAX;
  return cs.slice(0, CITIES_MAX).join(' · ') + (isEn() ? ` and ${rest} more` : ` 외 ${rest}곳`);
}

/**
 * 같은 장소에서 하루씩 이어지는 회차를 한 덩어리로 묶는다.
 *   10.15 · 10.16 · 10.17  →  10.15–17
 *
 * 시간이 다르면 회차를 나눠 적어야 하는데(상세의 '일정'에 시간이 나와야 하므로),
 * 그 세 줄이 Works 카드와 홈 NOW 에까지 그대로 나오면 목록이 같은 작업으로 길어진다.
 * 묶는 것은 짧게 적는 화면뿐이고, 상세의 '일정'은 원래 회차를 그대로 쓴다.
 *
 * 날짜를 손으로 적어 둔 회차(date)는 건드리지 않는다 — 사람이 정한 표기다.
 */
export function mergeRuns(runs) {
  const dayAfter = (iso) => {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  };
  const last = (r) => r.end || r.start;

  const out = [];
  for (const r of [...(runs || [])].sort((a, b) => (a.start < b.start ? -1 : 1))) {
    const prev = out.at(-1);
    const joinable =
      prev &&
      !t(prev.date) && !t(r.date) &&
      t(prev.venue) === t(r.venue) &&
      r.start <= dayAfter(last(prev));      // 이어지거나 겹칠 때만
    if (joinable) {
      if (last(r) > last(prev)) prev.end = last(r);
      continue;
    }
    out.push({ ...r });
  }
  return out;
}

/* ---------- 시간 ----------
   아카이브는 없어졌다. 지나온 작업도 Works 에 그대로 남고,
   '현재 진행 중' 은 목록을 가르는 것이 아니라 걸었다 풀었다 하는 필터 하나다. */

export const todayIso = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * 앞으로 있을 회차가 있거나 status 가 ongoing 이면 진행 중으로 본다.
 * 오늘 끝나는 회차도 아직 진행 중이다(end >= 오늘).
 */
export function isRunningNow(work, today = todayIso()) {
  if (work.status === 'ongoing') return true;
  return (work.runs || []).some((r) => (r.end || r.start) >= today);
}

/* ---------- 장소 ----------
   장소는 데이터에 따로 적지 않는다 — 회차(runs)의 city 에서 판정한다.
   두 곳에 두면 회차만 고쳤을 때 어긋난다.

   한 작업이 한국과 해외 양쪽에 속할 수 있다(국내 초연 + 해외 투어).

   아래 목록에 없는 도시는 해외로 본다. 새 한국 도시에서 공연하면
   여기 한 줄을 더한다 — 판정이 이 배열 하나에만 있으므로 그것으로 끝난다. */
const KOREA_CITIES = [
  '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
  '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
  '강화',
  '수원', '성남', '고양', '용인', '부천', '안산', '안양', '화성', '평택', '파주', '김포',
  '춘천', '원주', '강릉', '속초', '홍천', '화천', '양양',
  '청주', '충주', '천안', '아산', '홍성', '공주', '보령', '서산', '당진',
  '전주', '군산', '익산', '목포', '여수', '순천', '나주',
  '포항', '경주', '구미', '안동', '창원', '진주', '통영', '김해', '거제', '양산',
];

/** 국문 도시 이름으로 판정한다 — 화면 언어와 무관하게 같은 답이 나와야 한다. */
export const isKoreaCity = (cityKo) => KOREA_CITIES.some((k) => (cityKo || '').includes(k));

/** 둥지230 은 한국 안의 한 곳이다 — 회차의 venue 로만 붙는다. */
const DOONGJI = '둥지230';

/**
 * 그 작업이 걸리는 장소 키들. 회차가 없으면 빈 집합이다(장소 필터에 걸리지 않는다).
 *   'kr' 한국 · 'abroad' 해외 · 'doongji' 둥지230
 */
export function placesOf(work) {
  const out = new Set();
  for (const r of work.runs || []) {
    const city = t(r.city, 'ko');
    if (city) out.add(isKoreaCity(city) ? 'kr' : 'abroad');
    if (t(r.venue, 'ko').includes(DOONGJI)) out.add('doongji');
  }
  return out;
}

/* ---------- 프로듀서 색 ---------- */

/**
 * data/producers.json 의 색을 CSS 커스텀 프로퍼티로 주입한다.
 * 색값은 JSON 에만 있고 CSS·JS 어디에도 하드코딩되어 있지 않다.
 *
 *   :root { --p-jisun-field: …; --p-jisun-dot: …; --p-jisun-on: … }
 *   .field-jisun { background: …; color: … }
 *   .dot-jisun   { background: … }      ← 크림 위에서는 언제나 진한 짝
 */
export function injectProducerColors(producers) {
  const vars = [];
  const rules = [];
  for (const p of producers) {
    const c = p.color;
    vars.push(
      `--p-${p.id}-field:${c.field}`,
      `--p-${p.id}-dot:${c.dot}`,
      `--p-${p.id}-point:${c.point || c.field}`,
      `--p-${p.id}-on:${c.on}`
    );
    rules.push(
      /* --field-bg 는 그 면 위에 얹히는 조각이 '바탕색과 같은 테두리'를 그릴 때 쓴다
         (프로듀서 페이지의 겹친 두 원). 배경값을 CSS 에 다시 적지 않기 위한 것. */
      `.field-${p.id}{background:var(--p-${p.id}-field);color:var(--p-${p.id}-on);--field-bg:var(--p-${p.id}-field)}`,
      /* 점은 면 색을 그대로 쓰고 얇은 잉크 테두리로 크림 위에서도 보이게 한다.
         진한 짝(dot)은 글자에만 쓴다 — 점에 쓰면 노랑이 올리브로 보인다. */
      `.dot-${p.id}{background:var(--p-${p.id}-point);box-shadow:inset 0 0 0 .5px var(--dot-edge)}`,
      `.text-${p.id}{color:var(--p-${p.id}-dot)}`
    );
  }
  const style = document.createElement('style');
  style.id = 'producer-colors';
  style.textContent = `:root{${vars.join(';')}}\n${rules.join('\n')}`;
  document.head.append(style);
}

/** 담당 프로듀서 색점. 미지정이면 빈 원(라벤더 테두리). */
export function dots(producerIds, producerById) {
  const wrap = el('span.who');
  if (!producerIds || !producerIds.length) {
    wrap.append(el('i.dot.none', { title: '담당 미지정', 'aria-label': '담당 미지정' }));
    return wrap;
  }
  for (const id of producerIds) {
    const p = producerById.get(id);
    if (!p) continue;
    wrap.append(el(`i.dot.dot-${p.id}`, { title: t(p.name), 'aria-label': t(p.name) }));
  }
  return wrap;
}

/* ---------- 프로듀서 색면 칸 ----------
   홈 모자이크와 About 이 같은 것을 쓴다. 두 벌로 두면 한쪽만 고쳐져 어긋난다
   (실제로 About 쪽만 링크가 아니어서 색면이 눌리지 않았다).

   칸 전체가 링크다. 안에 다른 링크를 넣지 않는다 — <a> 안에 <a> 는 안 된다.
   이메일은 About 맨 아래 Contact 블록에만 둔다. */
/* role: false 면 역할 라벨을 넣지 않는다 — 칸 밖에 이미 라벨이 있는 화면(홈)용. */
export function producerTile(p, { media = null, extraClass = '', roleLang, role = true } = {}) {
  return link(
    pageUrl('producer', p.id),
    `.ptile.field-${p.id}${p.color.dark ? '.on-dark' : ''}${extraClass}`,
    { 'aria-label': t(p.name) },
    media,
    role ? el('span.meta.num', { text: roleLang ? t(p.role, roleLang) : t(p.role) }) : null,
    el(
      'span.ptile-name',
      null,
      el('h3', { text: t(p.name, 'en') }),
      el('span.sub', { text: t(p.name, 'ko') })
    )
  );
}

/** 그 작업의 면 색 클래스. 담당 미지정이면 구조색인 라벤더. */
export function fieldClass(producerIds) {
  return producerIds && producerIds.length ? `field-${producerIds[0]}` : 'c-lav';
}

/* ---------- 카테고리 배지 ---------- */

/**
 * 일의 종류를 제목 앞에 네모로 표시한다. 카드와 작업 상세가 같은 것을 쓴다.
 *
 * 색은 절대 쓰지 않는다 — 네 가지 색은 사람(담당 프로듀서)을 가리키는 표시이고
 * 카테고리는 일의 종류다. 둘이 섞이면 색이 무엇을 뜻하는지 알 수 없게 된다.
 * 그래서 배지는 잉크색 얇은 테두리 + 잉크 글씨뿐이다.
 *
 * 카테고리가 아직 안 정해진 작업은 아무것도 그리지 않는다(빈 네모를 두지 않는다).
 */
export function formBadge(work) {
  const label = formLabel(work);
  return label ? el('span.cat.meta', { text: label }) : null;
}

/* ---------- 형식(form) ----------
   여섯 가지뿐이고 여기서 늘리지 않는다. 국·영문 라벨이 한 표에 나란히 있어야
   카드의 배지와 Works 의 필터 버튼이 같은 말을 쓴다 — 한쪽은 'Production',
   다른 쪽은 'Performance' 가 되면 같은 것인지 알 수 없다.

   키는 works.json 의 form 값이다. 국·영문 표기가 바뀌어도 주소와 필터는 그대로다. */

export const FORMS = [
  { key: 'performance', ko: '공연', en: 'Performance' },
  { key: 'research', ko: '리서치 & 국제 예술 프로젝트 (축제 등)', en: 'Research & International Art Projects' },
  { key: 'network', ko: '네트워크·컨퍼런스', en: 'Network & Conference' },
  { key: 'residency', ko: '레지던시', en: 'Residency' },
  { key: 'workshop', ko: '워크숍', en: 'Workshop' },
  { key: 'video', ko: '영상', en: 'Video' },
];

const FORM_BY_KEY = new Map(FORMS.map((f) => [f.key, f]));

/** 그 작업의 형식 키. works.json 의 form 값 그대로. 판정은 여기 한 곳에서만 한다. */
export const formKey = (work) => (FORM_BY_KEY.has(work.form) ? work.form : '');

/** 화면에 적는 형식 이름. 형식이 없으면 빈 문자열 — 배지 줄 자체가 생기지 않는다. */
export function formLabel(work) {
  const f = FORM_BY_KEY.get(formKey(work));
  return f ? (isEn() ? f.en : f.ko) : '';
}

/** 키로 바로 라벨을 얻는다(필터 버튼용). */
export const formLabelByKey = (key) => {
  const f = FORM_BY_KEY.get(key);
  return f ? (isEn() ? f.en : f.ko) : key;
};

/* ---------- 공연인가 프로젝트인가 ----------
   형식(form)이 '공연'이면 공연이고, 나머지 넷은 전부 프로젝트다.
   따로 type 필드를 두지 않는다 — 두 곳에 두면 반드시 한쪽만 고쳐진다
   (월간 할머니들이 form 은 공연인데 type 은 project 로 남아 홈의 개수와 어긋났다). */

export const isPerformance = (work) => formKey(work) === 'performance';

/** 색면·캡션에 얹는 장식 라벨. 화면 언어와 무관하게 늘 영문이다. */
export const kindLabel = (work) => (isPerformance(work) ? 'Production' : 'Project');

/** 화면 언어를 따르는 이름 — 홈 NOW 와 작업 상세가 쓴다. */
export const kindName = (work) =>
  isEn() ? kindLabel(work) : isPerformance(work) ? '공연' : '프로젝트';

/* ---------- 영문판에서 감추는 작업 ----------
   works.json 의 hideInEn 이 true 면 영문 목록 어디에도 나오지 않는다.
   국문 목록에는 그대로 남는다. 목록을 만드는 곳은 모두 이 함수를 거친다 —
   한 곳만 빠뜨리면 감췄다고 믿는 작업이 그 화면에만 남는다. */
export const shownInLang = (work) => !(isEn() && work.hideInEn === true);
export const visibleWorks = (works) => (works || []).filter(shownInLang);

/* ---------- 특수문자는 폰트에 맡기지 않는다 (함정 5) ---------- */

const HEX_TOKEN = /\{hex\}/g;

function hexSvg() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 20 22');
  svg.setAttribute('class', 'glyph-hex');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', 'M10 1 19 6.25v10.5L10 22 1 16.75V6.25Z');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.6');
  path.setAttribute('stroke-linejoin', 'round');
  svg.append(path);
  return svg;
}

/**
 * 제목 문자열의 {hex} 토큰을 SVG 육각형으로 바꾼 조각을 돌려준다.
 * 〈⬡⬡의 섬〉은 환경에 따라 ○○ 로 보이므로 글리프에 기대지 않는다.
 */
/* ---------- 원본 크기 라이트박스 ----------
   작업 상세의 슬라이드와 아카이브의 이미지가 같은 것을 쓴다. */
export function lightbox(src, alt) {
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

/* ---------- 글 안의 토큰 ----------
   두 가지를 쓴다. 데이터에는 토큰으로 적고, 화면에 그릴 때만 풀어낸다.

     {hex}                      → SVG 육각형 (폰트에 맡기면 ○ 로 보인다 · 함정 5)
     {work:<id>|보일 이름}       → 그 작업으로 가는 링크

   작업 사이를 잇는 링크는 늘 이 토큰으로 적는다. 본문에 <a> 를 직접 쓰지 않는다 —
   주소 규칙이 바뀌면(해시 라우팅 등) 본문을 전부 고쳐야 하고, 영문판에서
   ?lang=en 이 붙지 않아 한 번에 국문으로 떨어진다.
   아카이브 항목과 Works 항목 사이에도 그대로 쓴다 — 둘 다 work.html 이다. */

const WORK_TOKEN = /\{work:([a-z0-9-]+)\|([^}]*)\}/g;
const ANY_TOKEN = /\{hex\}|\{work:([a-z0-9-]+)\|([^}]*)\}/g;

function inlineNodes(str, { links }) {
  const frag = document.createDocumentFragment();
  const s = real(str);
  let at = 0;
  for (const m of s.matchAll(ANY_TOKEN)) {
    if (m.index > at) frag.append(document.createTextNode(s.slice(at, m.index)));
    if (m[0] === '{hex}') frag.append(hexSvg());
    else {
      const [, id, label] = m;
      frag.append(
        links ? link(pageUrl('work', id), '.worklink', null, label) : document.createTextNode(label)
      );
    }
    at = m.index + m[0].length;
  }
  if (at < s.length) frag.append(document.createTextNode(s.slice(at)));
  return frag;
}

/** 제목·라벨용. 육각형은 그리되 링크는 걸지 않는다(제목 안의 링크는 눌리는 곳이 겹친다). */
export const titleNodes = (str) => inlineNodes(str, { links: false });

/** 본문·소개용. 작업 이름에 링크가 걸린다. */
export const richNodes = (str) => inlineNodes(str, { links: true });

/** 화면 밖(aria-label, title, alt)에서 쓸 평문. 여기서는 폰트가 관여하지 않는다. */
/** 글자만 남긴다 — aria-label·브라우저 탭 제목처럼 태그를 넣을 수 없는 자리. */
export function titleText(str) {
  return real(str).replace(HEX_TOKEN, '⬡').replace(WORK_TOKEN, '$2');
}

/* ---------- 로고 ---------- */

/**
 * 검정 로고 + 액센트 점 하나.
 * 액센트 점 색은 페이지마다 네 색 중 무작위. 그 페이지의 면 색은 제외한다.
 */
export function logo(producers, exclude = []) {
  const wrap = el('span.logo', { 'aria-hidden': 'true' });
  wrap.append(el('i.half'), el('i.half'), el('i.full'), el('i.half'));

  const pool = producers.filter((p) => !exclude.includes(p.id));
  const pick = (pool.length ? pool : producers)[Math.floor(Math.random() * (pool.length || producers.length))];
  wrap.append(el(`i.accent.dot-${pick.id}`));
  return wrap;
}

/* ---------- 사진 ---------- */

/* ---------- 프로듀서 얼굴 사진 ---------- */

const FACE_TRIES = 8; //  producers.json 에 목록이 없을 때 img/producers/<id>-01.jpg … -08.jpg 를 두드려 본다

const nn = (n) => String(n).padStart(2, '0');

export const shuffle = (xs) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * 그 사람의 얼굴 사진 후보. 페이지를 열 때마다 차례가 섞이므로
 * 뜨는 것 중 하나가 무작위로 걸린다.
 *
 * where='about' 이면 aboutPhotos 를 먼저 본다 — About 의 원은 작아서
 * 얼굴이 크게 나온 사진만 골라 써야 하기 때문. 없으면 photos 전체를 쓴다.
 */
export const faceCandidates = (p, where) => {
  const list =
    (where === 'about' && p.aboutPhotos?.length ? p.aboutPhotos : null) ||
    (p.photos?.length ? p.photos : null) ||
    Array.from({ length: FACE_TRIES }, (_, i) => `img/producers/${p.id}-${nn(i + 1)}.jpg`);
  return shuffle(list);
};

/* ---------- 그 작업에 임베드된 영상 ----------
   상세 페이지가 이미 심어 놓은 영상과 같은 주소는 자료·링크 줄로 또 내보내지 않는다.
   판정이 두 곳에 있으면 한쪽만 고쳐져 어긋나므로 여기 한 곳에 둔다. */

export const videoId = (work) => {
  const v = work.video;
  if (!v) return '';
  if (typeof v === 'string') return (v.match(/([A-Za-z0-9_-]{11})(?:[?&/]|$)/) || [])[1] || '';
  return v.embedId || '';
};

/** 그 작업의 임베드 영상과 같은 주소인가. */
export const isEmbeddedVideo = (work, url) => {
  const id = videoId(work);
  return Boolean(id && url && url.includes(id));
};

/* ---------- 사진 크레딧 ----------
   예술가 사진과 작업 사진이 같은 규칙을 쓴다 — 두 벌을 두면 한쪽만 고쳐진다.

   유형은 creditType 이 정한다: '촬영' · '제공'.
   적혀 있지 않으면 앞말을 붙이지 않고 이름만 적는다 —
   'ⓒJisun' 처럼 표기가 이미 문자열 안에 있는 경우다('촬영 ⓒJisun' 이 되면 안 된다). */

const CREDIT_TYPE = {
  촬영: { ko: '촬영', en: 'Photo' },
  제공: { ko: '제공', en: 'Courtesy' },
};

/**
 * 화면에 적을 값이 실제로 있는가.
 * null·undefined·빈 문자열·공백뿐인 문자열, 그리고 문자열 'null'·'undefined' 를
 * 모두 없는 것으로 본다 — JSON 을 손으로 고치다 보면 셋 다 실제로 들어온다.
 */
export function real(v) {
  if (v == null) return '';
  const s = String(v).trim();
  return s === '' || s === 'null' || s === 'undefined' ? '' : s;
}

/**
 * 크레딧 한 줄. 없으면 null 이라 자리도 생기지 않는다.
 *   photoCreditShow: false  → 기록은 남기고 화면에만 내지 않는다
 *   note                    → 크레딧이 없을 때 그 자리에 사유를 적는다(교체 예정 임시 사진)
 */
export function creditLine({ photoCredit, creditType, photoCreditShow, note } = {}) {
  const who = real(t(photoCredit));
  if (!who) {
    const why = real(t(note));
    return why ? el('p.credit.meta', { text: why }) : null;
  }
  if (photoCreditShow === false) return null;

  const kind = CREDIT_TYPE[creditType];
  return el('p.credit.meta', { text: kind ? `${t(kind)} ${who}` : who });
}

/* ---------- 사진 한 장의 크레딧 ----------
   촬영자가 사진마다 다른 작업이 있다. works.json 의 photoCredits 가 파일명을 키로 잡는다.

     photoCredits: { "MULJIL-01.jpg": "ⓒShinjoong Kim" }

   그 파일에 값이 없으면 작업 단위 photoCredit 으로 떨어지고, 그것도 없으면 빈 문자열이다
   — 빈 문자열이면 크레딧 줄 자체를 만들지 않는다.
   키는 경로가 아니라 파일명이다. 폴더를 옮겨도 따라오게 하기 위한 것. */
export function photoCreditFor(item, src) {
  const file = String(src || '').split('/').pop();
  const per = item?.photoCredits?.[file];
  return real(t(per)) || real(t(item?.photoCredit)) || '';
}

/** 파일명이 TEMP- 로 시작하면 임시 이미지다. 폴더에 넣을 때 붙이는 표시. */
export function isTempFile(src) {
  return /(^|\/)TEMP-/.test(src || '');
}

/** 작업 표지로 시도할 경로들 — cover 먼저, 없으면 01.jpg, 그 다음 poster.jpg. */
export function coverCandidates(work) {
  return [work.cover, `img/works/${work.id}/01.jpg`, `img/works/${work.id}/poster.jpg`].filter(
    (v, i, all) => v && all.indexOf(v) === i
  );
}

/**
 * 후보 경로를 차례로 시도하는 사진.
 * 전부 실패하면 fallback() 으로 갈아끼운다 — 색면 + '사진 준비 중'.
 * onResolved 에는 실제로 뜬 경로가 들어온다(TEMP- 판정용).
 *
 * 폴더에 파일만 넣으면 JSON 을 고치지 않아도 사진이 뜨게 하기 위한 것.
 */
export function photo(candidates, fallback, onResolved) {
  const list = (candidates || []).filter(Boolean);
  const img = el('img.cover', { alt: '', loading: 'lazy' });
  let next = 0;

  const advance = () => {
    if (next >= list.length) {
      img.replaceWith(fallback());
      return;
    }
    img.src = list[next++];
  };

  img.addEventListener('error', advance);
  img.addEventListener('load', () => onResolved && onResolved(img.getAttribute('src')));
  advance();
  return img;
}

/* ---------- 상단 메뉴 (홈 말고 모든 페이지) ---------- */

/** 메뉴는 About · Works · Artists · Contact 넷. 메뉴에는 프로듀서 색을 쓰지 않는다. */
const NAV = [
  ['about', 'About'],
  ['works', 'Works'],
  ['artists', 'Artists'],
  ['contact', 'Contact'],
];

/* ---------- KO / EN 토글 ----------
   메뉴 오른쪽 끝, Contact 다음. 지금 보고 있는 쪽이 진하다.
   버튼이지 링크가 아니다 — 어느 페이지에 있든 그 자리에 머문 채 언어만 바뀐다. */
export function langToggle(extraClass = '') {
  const box = el(`span.langswitch.meta${extraClass}`, { role: 'group', 'aria-label': '언어' });
  const pick = (code, label) => {
    const on = lang.current === code;
    const b = el(`button.lang${on ? '.on' : ''}`, {
      type: 'button',
      text: label,
      'aria-pressed': String(on),
      lang: code,
    });
    /* 둘 다 누를 수 있다. 지금 언어를 눌러도 setLang 이 알아서 아무 일도 하지 않는다 —
       한쪽만 눌리면 '이건 버튼이 아닌가' 하고 다른 곳을 찾게 된다. */
    b.addEventListener('click', () => setLang(code));
    return b;
  };
  box.append(pick('ko', 'KO'), el('span.lang-sep', { text: '/' }), pick('en', 'EN'));
  return box;
}

export function topBar(producers, here, about) {
  const nav = el('nav');
  for (const [kind, label] of NAV) {
    const url = pageUrl(kind);
    const item = link(url, kind === here ? '.here' : '', null, label);
    nav.append(item);
  }

  /* 햄버거는 모바일에서만 보인다(CSS). Contact 는 상단 메뉴에 넣지 않는다 —
     모바일 메뉴·푸터·About 맨 아래, 세 군데에만 둔다. */
  const burger = el('button.burger', { type: 'button', 'aria-label': '메뉴 열기', 'aria-expanded': 'false' });
  burger.append(el('span.burger-i', { 'aria-hidden': 'true' }));
  burger.addEventListener('click', () => openMenu(about, burger));

  return el(
    'div.bar',
    null,
    link(pageUrl('home'), '.logo-link', { 'aria-label': '홈' }, logo(producers)),
    link(pageUrl('home'), '.wordmark', null, 'PRODUCER GROUP ', el('span.wordmark-light', { text: 'DOT' })),
    nav,
    el('span.spacer'),
    langToggle(),
    burger
  );
}

/* ---------- 모바일 전체화면 메뉴 ---------- */

/* 라벤더는 구조색이라 메뉴에 쓸 수 있다. 프로듀서 네 색은 사람을 가리키므로 쓰지 않는다.
   항목은 위 NAV 하나만 쓴다 — 두 벌을 두면 한쪽만 고쳐져 어긋난다. */

function openMenu(about, burger) {
  const close = el('button.menu-x', { type: 'button', 'aria-label': '메뉴 닫기' }, '✕');

  /* 데스크톱 상단 메뉴와 같은 배열(NAV)을 쓴다. 항목 전체가 눌린다. */
  const list = el('nav.menu-list');
  for (const [kind, label] of NAV) {
    list.append(link(pageUrl(kind), '.menu-item', null, el('span', { text: label })));
  }

  const socials = el('div.menu-social');
  socials.append(...socialLinks());   // 푸터와 같은 세 개

  /* 모바일에서는 상단 메뉴가 햄버거 안으로 들어가므로 토글도 여기 둔다 — 맨 위. */
  const langs = langToggle('.menu-lang');

  const overlay = el('div.menu-overlay', { role: 'dialog', 'aria-modal': 'true', 'aria-label': '메뉴' },
    close, langs, list, socials,
    about?.email ? el('a.menu-mail', { href: `mailto:${about.email}`, text: about.email }) : null);

  const shut = () => {
    overlay.remove();
    document.body.classList.remove('menu-open'); // 뒤쪽 스크롤 잠금 해제
    burger.setAttribute('aria-expanded', 'false');
    burger.focus();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => e.key === 'Escape' && shut();

  close.addEventListener('click', shut);
  document.addEventListener('keydown', onKey);

  document.body.append(overlay);
  document.body.classList.add('menu-open'); // 열려 있는 동안 뒤쪽 스크롤 잠금
  burger.setAttribute('aria-expanded', 'true');
  close.focus();
}

/* ---------- 푸터 ---------- */

const ICONS = {
  instagram:
    '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"/>',
  youtube:
    '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10.4 9.6l5 2.4-5 2.4z" fill="currentColor" stroke="none"/>',
  facebook:
    '<path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.6A22 22 0 0 0 14.3 3.5c-2.4 0-4 1.45-4 4.1v2.3H7.6V13h2.7v8z" fill="currentColor" stroke="none"/>',
};

function sico(href, label, key) {
  const a = el('a.sico', { href, target: '_blank', rel: 'noopener', 'aria-label': label });
  a.innerHTML = `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">${ICONS[key]}</svg>`;
  return a;
}

/** 모든 화면이 같은 SNS 세 개를 쓴다 — 푸터와 모바일 메뉴가 어긋나지 않게. */
export function socialLinks() {
  return [
    sico('https://www.youtube.com/channel/UCW_8rEDfkNiyIS9J8axn0LA', 'YouTube', 'youtube'),
    sico('https://www.instagram.com/producergroupdot/', 'Instagram', 'instagram'),
    /* ?locale=ko_KR 은 붙이지 않는다 — 방문자 언어에 따라 페이스북이 알아서 잡는다. */
    sico('https://www.facebook.com/producergroupdot/', 'Facebook', 'facebook'),
  ];
}

/** 왼쪽 Contact · Archive / 오른쪽 유튜브 · 인스타그램 · 페이스북. 모든 페이지 공통. */
export function footer() {
  return el(
    'footer',
    null,
    el('span.foot-l', null, link(pageUrl('contact'), '.meta', null, 'Contact')),
    el('span.spacer'),
    el('span.foot-r', null, ...socialLinks())
  );
}
