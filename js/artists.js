/* artists.js — 예술가 목록. 격자가 아니라 자유 배치 캔버스.
   좌표와 지름은 data/artists.json 의 pos 가 정한다. */

import { loadSite } from './data.js';
import { t } from './i18n.js';
import { el, injectProducerColors, dots, titleText, topBar, footer, pageUrl, link } from './ui.js';

/** 사진이 없으면 담당 프로듀서 색 원 + 이름 앞 두 글자. 담당이 없으면 라벤더. */
const faceClass = (a) => (a.producers?.length ? `field-${a.producers[0]}` : 'c-lav');

function face(artist) {
  const box = el(`span.face.${faceClass(artist)}`);
  if (artist.photo) {
    box.append(el('img', { src: artist.photo, alt: '', loading: 'lazy' }));
  } else {
    box.append(el('b', { text: titleText(t(artist.name)).slice(0, 2) }));
  }
  return box;
}

/* 카드에는 사진 · 색점 · 이름만 둔다.
   다른 언어 이름과 연관 작품명은 상세 페이지에 있다 — 목록에서는 훑는 것이 목적이라
   작은 글씨 두 줄이 붙으면 원 사이가 멀어지고 이름이 눈에 덜 들어온다. */
function label(artist, producerById) {
  return el(
    'span.info',
    null,
    dots(artist.producers, producerById),
    el('h3', { text: t(artist.name) })
  );
}

/* ---------- 무작위 배치 ----------
   자리는 새로고침할 때마다 달라진다. 다만 아무 데나 두면 원이 겹치므로
   범위 안에서 뽑고 겹치면 다시 뽑는다. 끝내 못 찾으면 artists.json 의
   고정 좌표로 되돌린다 — 화면이 깨지는 것보다 낫다. */
const RANGE = { x: [2, 70], y: [0, 70] }; //  %
const PER_ITEM = 200; //  항목 하나를 놓을 때의 재시도
const LABEL_W = 236; //  라벨 최소 폭
/* 원 아래 라벨 높이. 패딩 14 + 색점 줄 16 + 이름 두 줄 50 = 80.
   이름이 길면 두 줄이 된다(Elephants Laugh (Lee Jinyeob) · 코끼리들이 웃는다(이진엽)).
   모자라게 잡으면 라벨이 옆 원을 덮는다 — 이 값은 겹침 검사가 그대로 쓴다. */
const LABEL_H = 80;
const FLOAT = 6; //  플로팅이 위아래로 움직이는 폭
const GAP = 28 + FLOAT; //  사각형 사이 최소 간격. 흔들리는 폭까지 더해 34px

const rand = (lo, hi) => lo + Math.random() * (hi - lo);

/**
 * 한 항목이 실제로 차지하는 사각형. 원만 보고 검사하면 라벨이 옆 원을 덮는다.
 * 기준점은 원의 왼쪽 위이고, 라벨이 원보다 넓으면 좌우로 균등하게 넘친다.
 */
function boxOf(x, y, d, boxW, boxH) {
  const w = Math.max(d, LABEL_W);
  const h = d + LABEL_H;
  const left = (x / 100) * boxW - (w - d) / 2;
  const top = (y / 100) * boxH;
  return { x, y, left, top, right: left + w, bottom: top + h, w, h };
}

/** 두 사각형이 간격까지 포함해 떨어져 있는가. */
const apart = (a, b) =>
  a.right + GAP <= b.left || b.right + GAP <= a.left ||
  a.bottom + GAP <= b.top || b.bottom + GAP <= a.top;

/** 사각형 전체가 캔버스 안에 있는가. 위아래로는 흔들리는 폭만큼 더 여유를 둔다. */
const inside = (r, boxW, boxH) =>
  r.left >= 0 && r.right <= boxW && r.top >= FLOAT && r.bottom <= boxH - FLOAT;

/**
 * 겹치지 않는 좌표 한 벌을 찾는다. 전체가 실패하면 null.
 *
 * 검사 단위는 원이 아니라 '원 + 라벨' 사각형이다. 원만 보면 라벨이 옆 원을 덮는다.
 * 큰 것부터 놓고, 한 항목이 200번 안에 자리를 못 잡으면 그 항목만 고정 좌표로
 * 되돌린다. 그 고정 자리마저 겹치면 전체를 고정 배치로 되돌린다.
 */
function scatter(sizes, fixed, boxW, boxH) {
  /* 큰 것부터 자리를 잡는다. 큰 사각형을 나중에 놓으면 들어갈 자리가 없다. */
  const order = sizes.map((d, i) => i).sort((a, b) => sizes[b] - sizes[a]);
  const placed = new Map();

  for (const i of order) {
    const d = sizes[i];
    let got = null;

    for (let n = 0; n < PER_ITEM && !got; n++) {
      const x = rand(RANGE.x[0], RANGE.x[1]);
      const y = rand(RANGE.y[0], RANGE.y[1]);
      const box = boxOf(x, y, d, boxW, boxH);
      if (!inside(box, boxW, boxH)) continue;
      if ([...placed.values()].every((p) => apart(p, box))) got = box;
    }

    if (!got) {
      /* 200번 안에 자리를 못 잡으면 이 항목만 고정 좌표로 되돌린다. */
      const f = boxOf(parseFloat(fixed[i].x), parseFloat(fixed[i].y), d, boxW, boxH);
      if (![...placed.values()].every((p) => apart(p, f))) return null; // 그마저 겹치면 전체 실패
      got = f;
    }
    placed.set(i, got);
  }

  return sizes.map((_, i) => placed.get(i));
}

/* 아주 느린 플로팅. prefers-reduced-motion 이 켜져 있으면 base.css 가 끈다. */
function float(item, i) {
  item.style.setProperty('--float-dur', `${(8 + Math.random() * 6).toFixed(1)}s`);
  item.style.setProperty('--float-delay', `${(-i * 1.7 - Math.random() * 3).toFixed(1)}s`);
}

function canvas(site) {
  const host = document.getElementById('artists-list');
  host.replaceChildren();

  const items = site.artists.map((a) => {
    /* 좌표는 커스텀 프로퍼티로 넘긴다. 자리를 인라인 style 로 박으면
       모바일에서 자유 배치를 걷어내는 미디어 쿼리를 이겨버린다(함정 3). */
    const item = link(pageUrl('artist', a.id), '.artist', { 'aria-label': t(a.name) },
      face(a), label(a, site.producerById));
    item.style.setProperty('--x', a.pos?.x || '0%');
    item.style.setProperty('--y', a.pos?.y || '0%');
    item.style.setProperty('--d', a.pos?.d || '18vh');
    host.append(item);
    return item;
  });

  /* 모바일은 세로 목록으로 되돌아가므로 무작위 배치도 플로팅도 하지 않는다. */
  if (!window.matchMedia('(min-width: 901px)').matches) return;

  const boxW = host.clientWidth;
  const boxH = host.clientHeight;
  const sizes = items.map((it) => it.querySelector('.face').getBoundingClientRect().width);
  const fixed = site.artists.map((a) => a.pos || { x: '0%', y: '0%' });

  const spots = scatter(sizes, fixed, boxW, boxH);
  items.forEach((item, i) => {
    if (spots) {
      item.style.setProperty('--x', `${spots[i].x.toFixed(2)}%`);
      item.style.setProperty('--y', `${spots[i].y.toFixed(2)}%`);
    }
    float(item, i);
  });
  /* 전체가 실패하면 artists.json 의 고정 배치를 그대로 쓴다 — 이미 --x·--y 에 들어 있다. */
  if (!spots) console.info('무작위 배치에 실패해 고정 좌표를 그대로 씁니다.');
}

async function main() {
  try {
    const site = await loadSite();
    injectProducerColors(site.producers);
    document.getElementById('top-bar').replaceChildren(topBar(site.producers, 'artists', site.about));
    canvas(site);
    document.getElementById('page-footer').replaceChildren(footer());
  } catch (err) {
    console.error(err);
    document.getElementById('artists-list').append(
      el('p.load-error', { text: `데이터를 읽지 못했습니다. ${err.message}` })
    );
  }
}

main();
