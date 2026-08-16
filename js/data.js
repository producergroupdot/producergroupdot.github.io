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

export async function loadSite() {
  const [producers, works, artists, nowOrder, about] = await Promise.all([
    json('producers.json'),
    json('works.json'),
    json('artists.json'),
    json('now.json'),
    json('about.json'),
  ]);

  const producerById = new Map(producers.map((p) => [p.id, p]));

  /* 회차는 works.json 의 각 작품 안에 있다(work.runs). 따로 읽지 않는다 —
     같은 데이터를 두 곳에 두면 반드시 한쪽만 고쳐져 어긋난다. */
  return { producers, works, artists, nowOrder, about, producerById };
}
