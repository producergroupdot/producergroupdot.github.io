/* about.js — 도트 소개 · 프로듀서 4인 · 둥지230 · 연결 */

import { loadSite } from './data.js';
import { t } from './i18n.js';
import {
  el, injectProducerColors, topBar, footer, pageUrl, link, photo, faceCandidates,
} from './ui.js';

/* 사진은 파일만 올리면 뜬다 — JSON 을 고칠 필요가 없다.
   없는 파일은 조용히 건너뛴다. (얼굴 사진 고르기는 ui.js 의 faceCandidates 가 맡는다.) */
const TOGETHER_TRIES = 12; //  img/about/together/01.jpg … 12.jpg

const nn = (n) => String(n).padStart(2, '0');

/* ---------- 소개문 ---------- */

function intro(about) {
  const box = el('div.about-cols');
  for (const para of about.intro || []) {
    const text = t(para);
    if (text) box.append(el('p', { text }));
  }
  return box;
}

/* ---------- 프로듀서 네 칸 ---------- */

/**
 * 색면 네 칸. 순서와 색은 producers.json 이 정한다.
 * 오른쪽 위 모서리에 반쯤 걸친 원 안에 얼굴 사진이 흑백으로 들어가고,
 * 마우스를 올리면 원이 커지며 색면을 덮고 컬러로 바뀐다.
 * 사진이 아직 없으면 예전처럼 그 칸의 글자색에서 뽑은 빈 원만 남는다.
 */
function faceBlob(p) {
  const blob = el('i.pblob');
  blob.append(
    photo(faceCandidates(p, 'about'), () => {
      blob.classList.add('no-photo'); // 사진이 하나도 없을 때는 커지지 않는다
      return el('span.pblob-empty');
    })
  );
  return blob;
}

function people(producers) {
  const row = el('div.people');
  for (const p of producers) {
    row.append(
      link(
        pageUrl('producer', p.id),
        `.person.field-${p.id}${p.color.dark ? '.on-dark' : ''}`,
        { 'aria-label': t(p.name) },
        faceBlob(p),
        el('span.meta', { text: t(p.role, 'en') || 'Producer' }),
        el(
          'span',
          null,
          el('h3', { text: t(p.name, 'en') }),
          el('span.kr', { text: t(p.name, 'ko') })
        )
      )
    );
  }
  return row;
}

/* ---------- 둥지230 ---------- */

/* 페이지에서 유일한 어두운 면이다. 작게 만들지 않는다. */
function doongji(d) {
  return el(
    'section.doongji.on-dark',
    null,
    el('i.dj-dot'),
    el(
      'div.dj-in',
      null,
      el('span.meta', { text: t(d.label) }),
      el('h2', { text: t(d.title) }),
      el('p', { text: t(d.body) }),
      d.link?.url
        ? el('a.dj-btn', {
            href: d.link.url,
            target: '_blank',
            rel: 'noopener',
            text: t(d.link.label),
          })
        : null
    )
  );
}

/* ---------- '함께' 가로 띠 ---------- */

/* 캡션 없이 사진만 옆으로 늘어놓는다. 없는 파일은 조용히 빠지므로
   몇 장을 올리든 코드를 고칠 필요가 없다. */
function together(about) {
  const files = about.together?.length
    ? about.together
    : Array.from({ length: TOGETHER_TRIES }, (_, i) => `img/about/together/${nn(i + 1)}.jpg`);

  const strip = el('div.together-strip');
  for (const src of files) {
    const fig = el('figure.together-item');
    fig.append(
      photo([src], () => {
        fig.remove(); // 그 자리에 파일이 없으면 칸 자체를 뺀다
        return el('span');
      })
    );
    strip.append(fig);
  }

  return el('section.together', null, el('h2.sec', { text: '함께' }), strip);
}

/* ---------- 연결 ---------- */

/* Contact — 페이지 맨 아래 블록. 상단 메뉴에는 넣지 않는다.
   푸터와 모바일 메뉴의 Contact 가 이리로 온다(#contact). */
function contact(about) {
  const list = el('ul.clist');

  /* 이메일이 먼저. 주소는 data/about.json 의 email 에만 적는다.
     비어 있으면 줄 자체를 내지 않는다 — 없는 주소를 지어내지 않기 위해서. */
  if (about.email) {
    list.append(el('li', null, el('a', { href: `mailto:${about.email}`, text: about.email })));
  }
  for (const l of about.links || []) {
    list.append(
      el('li', null, el('a', { href: l.url, target: '_blank', rel: 'noopener', text: t(l.label) }))
    );
  }

  return el('section.contact', { id: 'contact' }, el('h2', { text: 'Contact' }), list);
}

/* ---------- 부팅 ---------- */

async function main() {
  try {
    const site = await loadSite();
    injectProducerColors(site.producers);

    document.getElementById('top-bar').replaceChildren(topBar(site.producers, 'about', site.about));
    document.getElementById('page').replaceChildren(
      intro(site.about),
      el('h2.sec', { text: 'Producers' }),
      people(site.producers),
      doongji(site.about.doongji),
      together(site.about),
      contact(site.about)
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
