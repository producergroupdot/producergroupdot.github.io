/* data.js — data/*.json 을 읽어오는 유일한 창구.
   사이트는 JSON 만 읽습니다. 데이터를 코드 안에 적지 마세요. */

const DATA = new URL('../data/', import.meta.url);

async function json(name) {
  /* 늘 새로 받는다. 브라우저가 JSON 을 캐시해 두면 데이터를 고쳐도 화면이 그대로라,
     코드를 의심하며 한참을 헤매게 된다 — 실제로 한 번 겪었다.
     정적 JSON 이라 배포 뒤에도 되돌릴 필요가 없다(다 합쳐 100KB 남짓). */
  const res = await fetch(new URL(name, DATA), { cache: 'no-store' });
  if (!res.ok) throw new Error(`data/${name} 을 읽지 못했습니다 (${res.status})`);
  return res.json();
}

/* ---------- 화면에 안 나오는 필드 잡아내기 ----------
   works.json 에 accordions 를 직접 쓰면 js/work.js 가 그 목록만 그린다.
   자동 '정보' 칸을 만들지 않으므로 아래 필드는 값이 있어도 어디에도 안 나온다.
   데이터만 고치고 화면은 그대로라 한참 헤매게 되는 자리다(CLAUDE.md 함정 1).

   개발 중에만 알린다 — 방문자 콘솔에 찍을 말이 아니다. */
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === 'file:';
const DEAD_WITH_ACCORDIONS = ['produced', 'keywords', 'venue', 'commission', 'info'];

function warnDeadFields(works) {
  if (!LOCAL) return;
  for (const w of works || []) {
    if (!w.accordions?.length) continue;
    const dead = DEAD_WITH_ACCORDIONS.filter((k) => {
      const v = w[k];
      return Array.isArray(v) ? v.length : v && (typeof v === 'string' ? v : v.ko || v.en);
    });
    if (dead.length) {
      console.warn(
        `[dot] '${w.id}' 는 accordions 를 직접 쓰므로 ${dead.join(' · ')} 이(가) 화면에 나오지 않습니다.` +
          ' 정보 아코디언으로 옮기고 그 필드는 지우세요.'
      );
    }
  }
}

export async function loadSite() {
  const [producers, works, artists, nowOrder, about] = await Promise.all([
    json('producers.json'),
    json('works.json'),
    json('artists.json'),
    json('now.json'),
    json('about.json'),
  ]);

  warnDeadFields(works);

  const producerById = new Map(producers.map((p) => [p.id, p]));

  /* 회차는 works.json 의 각 작품 안에 있다(work.runs). 따로 읽지 않는다 —
     같은 데이터를 두 곳에 두면 반드시 한쪽만 고쳐져 어긋난다. */
  return { producers, works, artists, nowOrder, about, producerById };
}
