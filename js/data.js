/* data.js — data/*.json 을 읽어오는 유일한 창구.
   사이트는 JSON 만 읽습니다. 데이터를 코드 안에 적지 마세요. */

const DATA = new URL('../data/', import.meta.url);

async function json(name) {
  const res = await fetch(new URL(name, DATA));
  if (!res.ok) throw new Error(`data/${name} 을 읽지 못했습니다 (${res.status})`);
  return res.json();
}

export async function loadSite() {
  const [producers, works, runs] = await Promise.all([
    json('producers.json'),
    json('works.json'),
    json('runs.json'),
  ]);

  const producerById = new Map(producers.map((p) => [p.id, p]));
  const runsByWork = new Map();
  for (const r of runs) {
    if (!runsByWork.has(r.workId)) runsByWork.set(r.workId, []);
    runsByWork.get(r.workId).push(r);
  }

  return { producers, works, runs, producerById, runsByWork };
}
