/* about.js — 도트 소개 · 프로듀서 4인 · 둥지230 · 연결 */

import { loadSite } from './data.js';
import { t } from './i18n.js';
import { el, injectProducerColors, topBar, footer, pageUrl, link } from './ui.js';

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
 * 모서리 원은 그 칸의 글자색(currentColor)에서 뽑는다 —
 * 다른 사람의 색을 얹으면 '이 칸은 누구의 것인가'가 흐려진다.
 */
function people(producers) {
  const row = el('div.people');
  for (const p of producers) {
    row.append(
      link(
        pageUrl('producer', p.id),
        `.person.field-${p.id}${p.color.dark ? '.on-dark' : ''}`,
        { 'aria-label': t(p.name) },
        el('i.pblob'),
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

/* ---------- 연결 ---------- */

function contact(about) {
  const list = el('ul.clist');
  for (const l of about.links || []) {
    list.append(
      el('li', null, el('a', { href: l.url, target: '_blank', rel: 'noopener', text: t(l.label) }))
    );
  }
  /* 이메일은 주소가 정해지면 data/about.json 의 email 만 채우면 나온다. */
  if (about.email) {
    list.append(el('li', null, el('a', { href: `mailto:${about.email}`, text: about.email })));
  }
  return el('section.contact', null, el('h2', { text: '연결' }), list);
}

/* ---------- 부팅 ---------- */

async function main() {
  try {
    const site = await loadSite();
    injectProducerColors(site.producers);

    document.getElementById('top-bar').replaceChildren(topBar(site.producers, 'about'));
    document.getElementById('page').replaceChildren(
      intro(site.about),
      el('h2.sec', { text: 'Producers' }),
      people(site.producers),
      doongji(site.about.doongji),
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
