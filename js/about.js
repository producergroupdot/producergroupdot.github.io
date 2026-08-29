/* about.js — 도트 소개 · 프로듀서 4인 · 둥지230 · 연결 */

import { loadSite } from './data.js';
import { t } from './i18n.js';
import {
  el, injectProducerColors, topBar, footer, pageUrl, link, photo, faceCandidates, shuffle,
  producerTile, titleNodes,
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

  /* 네 칸의 차례는 새로고침할 때마다 섞는다 — 홈 모자이크와 같은 방식.
     넷 사이에 앞뒤가 없다는 것이 도트의 수평성이다.

     칸은 홈과 같은 컴포넌트를 쓴다. 칸 전체가 프로듀서 페이지 링크이고,
     이메일은 이 안에 두지 않는다 — 맨 아래 Contact 블록에 있다. */
  for (const p of shuffle(producers)) {
    row.append(producerTile(p, { media: faceBlob(p), extraClass: '.person', roleLang: 'en' }));
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
      /* 주소. 영문 표기가 아직 없어 영문 화면에서는 t() 가 국문을 그대로 내보낸다 —
         길을 찾는 데 쓰는 값이라 비우는 것보다 국문이라도 보이는 편이 낫다.
         값이 없으면 줄 자체를 만들지 않는다. */
      t(d.address) ? el('p.dj-addr.meta', { text: t(d.address) }) : null,
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

  /* 제목도 캡션도 없다. 사진만 놓인다. */
  return el('section.together', { 'aria-label': '함께' }, strip);
}

/* ---------- 연결 ---------- */

/* Contact — 페이지 맨 아래 블록. 상단 메뉴에는 넣지 않는다.
   푸터와 모바일 메뉴의 Contact 가 이리로 온다(#contact). */
function contact(about, producers) {
  const list = el('ul.clist');

  /* 이메일이 먼저. 주소는 data/about.json 의 email 에만 적는다.
     비어 있으면 줄 자체를 내지 않는다 — 없는 주소를 지어내지 않기 위해서. */
  if (about.email) {
    list.append(el('li', null, el('a', { href: `mailto:${about.email}`, text: about.email })));
  }

  /* 프로듀서 네 사람의 도트 계정. 색면 칸에서 뺐으므로 여기 모아 둔다. */
  for (const p of producers || []) {
    if (!p.dotEmail) continue;
    list.append(
      el(
        'li',
        null,
        el('span.cname', { text: `${t(p.name)} ` }),
        el('a', { href: `mailto:${p.dotEmail}`, text: p.dotEmail })
      )
    );
  }
  for (const l of about.links || []) {
    if (!l.url) continue;
    list.append(
      el('li', null, el('a', { href: l.url, target: '_blank', rel: 'noopener' }, titleNodes(t(l.label))))
    );
  }

  return el('section.contact', { id: 'contact' }, el('h2', { text: 'Contact' }), list);
}

/* ---------- 부팅 ---------- */

async function main() {
  try {
    const site = await loadSite();
    injectProducerColors(site.producers);

    document.getElementById('top-bar').replaceChildren(topBar(site, 'about'));
    document.getElementById('page').replaceChildren(
      intro(site.about),
      el('h2.sec', { text: 'Producers' }),
      people(site.producers),
      doongji(site.about.doongji),
      together(site.about),
      contact(site.about, site.producers)
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
