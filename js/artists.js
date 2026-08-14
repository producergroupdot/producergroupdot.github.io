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

function label(artist, works, producerById) {
  const mine = works
    .filter((w) => (w.artists || []).includes(artist.id))
    .map((w) => titleText(t(w.title)));

  return el(
    'span.info',
    null,
    dots(artist.producers, producerById),
    el('h3', { text: t(artist.name) }),
    /* 로마자는 t() 를 거치지 않는다 — en 이 비면 t() 가 국문을 돌려주어 이름이 두 번 나온다. */
    artist.name.en ? el('span.kr', { text: artist.name.en }) : null,
    mine.length ? el('span.wl.meta', { text: mine.join(' · ') }) : null
  );
}

function canvas(site) {
  const host = document.getElementById('artists-list');
  host.replaceChildren();

  for (const a of site.artists) {
    /* 좌표는 커스텀 프로퍼티로 넘긴다. 자리를 인라인 style 로 박으면
       모바일에서 자유 배치를 걷어내는 미디어 쿼리를 이겨버린다(함정 3). */
    const item = link(pageUrl('artist', a.id), '.artist', { 'aria-label': t(a.name) },
      face(a), label(a, site.works, site.producerById));
    item.style.setProperty('--x', a.pos?.x || '0%');
    item.style.setProperty('--y', a.pos?.y || '0%');
    item.style.setProperty('--d', a.pos?.d || '18vh');
    host.append(item);
  }
}

async function main() {
  try {
    const site = await loadSite();
    injectProducerColors(site.producers);
    document.getElementById('top-bar').replaceChildren(topBar(site.producers, 'artists'));
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
