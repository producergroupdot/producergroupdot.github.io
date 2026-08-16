/* producer.js — 프로듀서 상세.
   페이지 전체가 그 사람의 색이 된다. 어느 사람인지는 <body data-producer="…"> 가 정하므로
   다른 세 명의 페이지는 HTML 을 복사해 그 값만 바꾸면 된다. */

import { loadSite } from './data.js';
import { t } from './i18n.js';
import {
  el, injectProducerColors, dots, titleNodes, titleText,
  topBar, footer, pageUrl, link, categoryBadge, photo, faceCandidates, creditLine,
} from './ui.js';

/** 최근 것이 위로. works.html 과 같은 기준. */
const byRecency = (a, b) => (b.yearFrom || 0) - (a.yearFrom || 0);

/* ---------- 머리 ---------- */

/* '좋아하는 것' 원. 선택 필드다 — favorite 이 없는 사람에게는 원을 만들지 않는다.
   화면에 글자는 두지 않고 alt 로만 남긴다(스크린리더가 읽는다). */
function favoriteCircle(person) {
  const f = person.favorite;
  if (!f?.image) return null;

  const box = el('span.pfav');
  const img = el('img.cover', { src: f.image, alt: t(f.alt) || '', loading: 'lazy' });
  /* 파일이 아직 없으면 빈 원을 남기지 않는다. */
  img.addEventListener('error', () => box.remove());
  box.append(img);
  return box;
}

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

  /* 얼굴 원과 '좋아하는 것' 원을 한 덩어리로 묶는다 —
     마우스를 올리면 두 원이 함께 컬러로 풀린다(CSS 가 이 묶음에 걸려 있다). */
  const faces = el('span.pfaces', null, faceCircle, favoriteCircle(person));

  /* 그 사진의 촬영자·제공자. 규칙은 예술가·작업 사진과 같은 것을 쓴다(ui.js).
     크레딧이 없으면 줄도 생기지 않는다. */
  const faceCredit = person.favorite?.image ? creditLine(person.favorite) : null;

  return el(
    'header.phead',
    null,
    el(
      'div.phead-l',
      null,
      faces,
      faceCredit,
      el('span.phead-role', null, el(`i.dot.dot-${person.id}`), el('span.meta', { text: t(person.role) })),
      el('h1', { text: t(person.name) }),
      person.name.en ? el('p.roman', { text: person.name.en }) : null,
      /* 한 줄 소개. 없는 사람에게는 줄이 생기지 않는다. */
      t(person.tagline) ? el('p.tagline', { text: t(person.tagline) }) : null
    ),
    frame
  );
}

/* ---------- 소개문 ---------- */

function prose(person) {
  /* 문단은 빈 줄로 나뉜다. 영문이 비어 있으면 t() 가 국문을 그대로 내보낸다.
     소개문이 아직 없는 사람도 페이지는 성립한다 — 이름과 색면이 이미 있다. */
  const text = t(person.bio);
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

/**
 * 연결. 개인 이메일이 없으면 도트 계정을 쓴다 —
 * 최소 화면(색면 + 이름 + '프로듀서' + 이메일)에는 이메일이 늘 있어야 한다.
 */
function linksBlock(person) {
  const mail = person.email || person.dotEmail;
  if (!person.links?.length && !mail) return null;

  const list = el('ul.llist');
  for (const l of person.links || []) {
    /* 주소가 아직 없는 줄은 그리지 않는다 — 누를 데가 없는 링크를 두지 않는다.
       라벨의 {hex} 토큰은 SVG 육각형으로 그린다(함정 5). */
    if (!l.url) continue;
    list.append(
      el(
        'li',
        null,
        el('a', { href: l.url, target: '_blank', rel: 'noopener' }, titleNodes(t(l.label)))
      )
    );
  }
  if (mail) list.append(el('li', null, el('a', { href: `mailto:${mail}`, text: mail })));
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
