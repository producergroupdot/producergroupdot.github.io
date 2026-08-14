/* producer.js — 프로듀서 상세.
   페이지 전체가 그 사람의 색이 된다. 어느 사람인지는 <body data-producer="…"> 가 정하므로
   다른 세 명의 페이지는 HTML 을 복사해 그 값만 바꾸면 된다. */

import { loadSite } from './data.js';
import { t } from './i18n.js';
import {
  el, injectProducerColors, dots, titleNodes, titleText,
  topBar, footer, pageUrl, link, categoryBadge, photo, faceCandidates,
} from './ui.js';

/** 최근 것이 위로. works.html 과 같은 기준. */
const byRecency = (a, b) => (b.yearFrom || 0) - (a.yearFrom || 0);

/* ---------- 머리 ---------- */

function head(person) {
  const ill = person.illustration;

  const frame = ill?.file
    ? el(
        'figure.frame',
        null,
        el('img', { src: ill.file, alt: '' }),
        t(ill.caption) ? el('figcaption.meta', { text: t(ill.caption) }) : null
      )
    : null;

  /* 얼굴 사진 원. 일러스트는 오른쪽 칸에 있으므로 왼쪽 칸 맨 위에 두어 겹치지 않는다.
     평소 흑백, 마우스를 올리면 컬러로 풀린다 — Artists 원과 같은 규칙. */
  const faceCircle = (() => {
    const box = el('span.pface');
    box.append(
      photo(faceCandidates(person), () => {
        box.remove(); // 사진이 없으면 자리도 남기지 않는다
        return el('span');
      })
    );
    return box;
  })();

  return el(
    'header.phead',
    null,
    el(
      'div.phead-l',
      null,
      faceCircle,
      el('span.phead-role', null, el(`i.dot.dot-${person.id}`), el('span.meta', { text: t(person.role) })),
      el('h1', { text: t(person.name) }),
      person.name.en ? el('p.roman', { text: person.name.en }) : null
    ),
    frame
  );
}

/* ---------- 소개문 ---------- */

function prose(person) {
  /* 문단은 빈 줄로 나뉜다. 영문이 비어 있으면 t() 가 국문을 그대로 내보낸다. */
  const text = t(person.bio);
  const box = el('div.prose');
  for (const para of text.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)) {
    box.append(el('p', { text: para }));
  }
  return box;
}

/* ---------- 사이드바 ---------- */

function sideBlock(title, ...children) {
  return el('section.sblock', null, el('h2', { text: title }), ...children);
}

/** 도트에서 맡은 작업 — works.json 에서 담당에 이 사람이 있는 것을 자동으로 뽑는다. */
function worksBlock(person, works) {
  const mine = works.filter((w) => (w.producers || []).includes(person.id)).sort(byRecency);

  const list = el('ul.wlist');
  for (const w of mine) {
    list.append(
      el(
        'li',
        null,
        link(
          pageUrl('work', w.id),
          '.wrow',
          { 'aria-label': titleText(t(w.title)) },
          el('span.yr.meta', { text: w.year }),
          el('span.wt', null, titleNodes(t(w.title))),
          categoryBadge(w)
        )
      )
    );
  }

  return sideBlock(
    '도트에서 맡은 작업',
    mine.length ? list : el('p.meta.empty', { text: '아직 없습니다.' })
  );
}

function linksBlock(person) {
  const list = el('ul.llist');
  for (const l of person.links || []) {
    list.append(
      el('li', null, el('a', { href: l.url, target: '_blank', rel: 'noopener', text: t(l.label) }))
    );
  }
  if (person.email) {
    list.append(el('li', null, el('a', { href: `mailto:${person.email}`, text: person.email })));
  }
  return sideBlock('연결', list);
}

/** 다른 프로듀서. 아직 페이지가 없는 사람은 링크 없이 글자로만 둔다. */
function othersBlock(person, producers) {
  const list = el('ul.plist');
  for (const p of producers) {
    if (p.id === person.id) continue;
    list.append(
      el(
        'li',
        null,
        link(pageUrl('producer', p.id), '.prow', null,
          el(`i.dot.dot-${p.id}`),
          el('span', { text: t(p.name) }),
          el('span.roman-s.meta', { text: t(p.name, 'en') }))
      )
    );
  }
  return sideBlock('다른 프로듀서', list);
}

/* ---------- 부팅 ---------- */

async function main() {
  const id = document.body.dataset.producer;
  try {
    const site = await loadSite();
    injectProducerColors(site.producers);

    const person = site.producerById.get(id);
    if (!person) throw new Error(`producers.json 에 '${id}' 가 없습니다.`);

    /* 페이지 전체가 그 사람의 색. 어두운 면이면 글자와 선이 함께 뒤집힌다. */
    document.body.classList.add('producer-page', `field-${person.id}`);
    if (person.color.dark) document.body.classList.add('on-dark');
    document.title = `${t(person.name)} · 프로듀서그룹 도트`;

    document.getElementById('top-bar').replaceChildren(topBar(site.producers, 'about', site.about));
    document.getElementById('page').replaceChildren(
      head(person),
      el(
        'div.pbody',
        null,
        prose(person),
        el(
          'aside.pside',
          null,
          worksBlock(person, site.works),
          linksBlock(person),
          othersBlock(person, site.producers)
        )
      )
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
