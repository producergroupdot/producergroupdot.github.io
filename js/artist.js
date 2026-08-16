/* artist.js — 예술가 상세.
   어느 사람인지는 <body data-artist="…"> 가 정한다. 새 예술가는 HTML 을 복사해 값만 바꾸면 된다. */

import { loadSite } from './data.js';
import { t } from './i18n.js';
import {
  el, injectProducerColors, dots, titleNodes, titleText,
  topBar, footer, pageUrl, link, categoryBadge,
} from './ui.js';

const byRecency = (a, b) => (b.yearFrom || 0) - (a.yearFrom || 0);
const faceClass = (a) => (a.producers?.length ? `field-${a.producers[0]}` : 'c-lav');

function head(artist, producerById) {
  const circle = el(`span.face.big.${faceClass(artist)}`);
  if (artist.photo) circle.append(el('img', { src: artist.photo, alt: '' }));
  else circle.append(el('b', { text: titleText(t(artist.name)).slice(0, 2) }));

  /* 사진에는 촬영자 크레딧이 따라붙는다. 사진이 없으면 크레딧도 없다. */
  const credit =
    artist.photo && t(artist.photoCredit)
      ? el('p.credit.meta', { text: `촬영 ${t(artist.photoCredit)}` })
      : null;

  return el(
    'header.ahead',
    null,
    el('div.aface', null, circle, credit),
    el('div.ahead-t', null,
      dots(artist.producers, producerById),
      el('h1', { text: t(artist.name) }),
      /* 로마자는 t() 를 거치지 않는다 — en 이 비면 국문이 되풀이된다. */
      artist.name.en ? el('p.roman', { text: artist.name.en }) : null,
      t(artist.field) ? el('p.field.meta', { text: t(artist.field) }) : null,
      artist.since ? el('p.since.meta', { text: `도트와 함께 ${artist.since}` }) : null)
  );
}

function prose(artist) {
  const text = t(artist.bio);
  const box = el('div.prose');
  if (!text) {
    box.append(el('p.pending-bio', { text: '소개문 준비 중' }));
    return box;
  }
  for (const para of text.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)) {
    box.append(el('p', { text: para }));
  }
  return box;
}

const sideBlock = (title, ...kids) => el('section.sblock', null, el('h2', { text: title }), ...kids);

function worksBlock(artist, works) {
  const mine = works.filter((w) => (w.artists || []).includes(artist.id)).sort(byRecency);
  const list = el('ul.wlist');
  for (const w of mine) {
    list.append(el('li', null,
      link(pageUrl('work', w.id), '.wrow', { 'aria-label': titleText(t(w.title)) },
        el('span.yr.meta', { text: w.year }),
        el('span.wt', null, titleNodes(t(w.title))),
        categoryBadge(w))));
  }
  return sideBlock('함께한 작업', mine.length ? list : el('p.meta.empty', { text: '아직 없습니다.' }));
}

function linksBlock(artist) {
  if (!artist.links?.length) return null;
  const list = el('ul.llist');
  for (const l of artist.links) {
    if (!l.url) continue;
    list.append(el('li', null,
      el('a', { href: l.url, target: '_blank', rel: 'noopener' }, titleNodes(t(l.label)))));
  }
  return sideBlock('링크', list);
}

function producersBlock(artist, producerById, producers) {
  const list = el('ul.plist');
  const ids = artist.producers?.length ? artist.producers : [];
  if (!ids.length) {
    return sideBlock('담당 프로듀서', el('p.meta.empty', { text: '아직 정해지지 않았습니다.' }));
  }
  for (const id of ids) {
    const p = producerById.get(id);
    if (!p) continue;
    list.append(el('li', null,
      link(pageUrl('producer', p.id), '.prow', null,
        el(`i.dot.dot-${p.id}`),
        el('span', { text: t(p.name) }),
        el('span.roman-s.meta', { text: t(p.name, 'en') }))));
  }
  return sideBlock('담당 프로듀서', list);
}

async function main() {
  const id = document.body.dataset.artist;
  try {
    const site = await loadSite();
    injectProducerColors(site.producers);

    const artist = site.artists.find((a) => a.id === id);
    if (!artist) throw new Error(`artists.json 에 '${id}' 가 없습니다.`);
    document.title = `${t(artist.name)} · 프로듀서그룹 도트`;

    document.getElementById('top-bar').replaceChildren(topBar(site.producers, 'artists', site.about));
    document.getElementById('page').replaceChildren(
      head(artist, site.producerById),
      el('div.abody', null,
        prose(artist),
        el('aside.pside', null,
          worksBlock(artist, site.works),
          linksBlock(artist),
          producersBlock(artist, site.producerById, site.producers)))
    );
    document.getElementById('page-footer').replaceChildren(footer());
  } catch (err) {
    console.error(err);
    document.getElementById('page').append(
      el('p.load-error', { text: `데이터를 읽지 못했습니다. ${err.message}` })
    );
  }
}

main();
