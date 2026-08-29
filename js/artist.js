/* artist.js — 예술가 상세.
   어느 사람인지는 <body data-artist="…"> 가 정한다. 새 예술가는 HTML 을 복사해 값만 바꾸면 된다. */

import { loadSite } from './data.js';
import { t } from './i18n.js';
import {
  el, injectProducerColors, dots, titleNodes, titleText,
  topBar, footer, pageUrl, link, formBadge, creditLine,
  visibleWorks,
} from './ui.js';

const byRecency = (a, b) => (b.yearFrom || 0) - (a.yearFrom || 0);
const faceClass = (a) => (a.producers?.length ? `field-${a.producers[0]}` : 'c-lav');

function head(artist, producerById) {
  const circle = el(`span.face.big.${faceClass(artist)}`);
  if (artist.photo) circle.append(el('img', { src: artist.photo, alt: '' }));
  else circle.append(el('b', { text: titleText(t(artist.name)).slice(0, 2) }));

  /* 크레딧 규칙은 ui.js 한 곳에 있다 — 작업 사진과 같은 규칙을 쓴다. */
  const credit = artist.photo ? creditLine(artist) : null;

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
      artist.since ? el('p.since.meta', { text: `도트와 함께 ${artist.since}` }) : null,
      /* 한 줄 소개. 없는 사람에게는 줄이 생기지 않는다 — 프로듀서 페이지와 같은 규칙. */
      t(artist.tagline) ? el('p.tagline', { text: t(artist.tagline) }) : null)
  );
}

/** 문단을 나눠 담는다. 빈 줄이 문단을 가른다. */
function paragraphs(text, box) {
  for (const para of String(text).split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)) {
    box.append(el('p', { text: para }));
  }
  return box;
}

/* ---------- 컴퍼니 · 인용 ----------
   둘 다 선택 필드다. 있는 사람에게만 그린다 — 없으면 빈 제목을 남기지 않는다. */

function company(artist) {
  const c = artist.company;
  if (!c || !t(c.text)) return null;

  /* 소제목은 '알오티씨 Robot Theater Company' — 국문 뒤에 영문을 옅게.
     두 표기가 같으면 한 번만 적는다. */
  const ko = t(c.name);
  const en = c.name?.en && c.name.en !== ko ? c.name.en : '';
  const box = el('section.acompany');
  if (ko) box.append(el('h2', null, ko, en ? el('span.h2-en', { text: ` ${en}` }) : null));
  return paragraphs(t(c.text), box);
}

/* 제목 줄은 두지 않는다. 위쪽 선과 여백이 이미 구역을 가르고, 인용부호가 붙은
   블록이라 '리뷰'라고 다시 적지 않아도 무엇인지 읽힌다.
   제목이 차지하던 높이는 css 의 padding-top 이 대신한다(.areviews). */
function reviews(artist) {
  const list = (artist.reviews || []).filter((r) => t(r.quote));
  if (!list.length) return null;

  const box = el('section.areviews');
  for (const r of list) {
    box.append(
      el('figure.quote', null,
        el('blockquote', { text: t(r.quote) }),
        t(r.source) ? el('figcaption.meta', { text: t(r.source) }) : null)
    );
  }
  return box;
}

function prose(artist) {
  const text = t(artist.bio);
  const box = el('div.prose');
  if (!text) {
    box.append(el('p.pending-bio', { text: '소개문 준비 중' }));
    return box;
  }
  paragraphs(text, box);
  /* null 을 그대로 append 하면 'null' 이라는 글자가 찍힌다. 있는 것만 붙인다. */
  for (const block of [company(artist), reviews(artist)]) if (block) box.append(block);
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
        formBadge(w))));
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

    document.getElementById('top-bar').replaceChildren(topBar(site, 'artists'));
    document.getElementById('page').replaceChildren(
      head(artist, site.producerById),
      el('div.abody', null,
        prose(artist),
        el('aside.pside', null,
          worksBlock(artist, visibleWorks(site.works)),
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
