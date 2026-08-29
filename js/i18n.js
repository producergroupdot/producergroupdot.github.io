/* i18n.js — 국문/영문 필드 하나만 통과하는 문(門).
   데이터의 모든 텍스트 필드는 {ko, en} 객체입니다.
   화면에 글자를 찍을 때는 반드시 t() 를 거치세요. field.ko 를 직접 읽지 마세요. */

const KEY = 'dot-lang';

/**
 * 어느 언어로 볼 것인가.
 *   1) 주소의 ?lang=en 이 있으면 그것
 *   2) 없으면 이 탭에서 고른 값(sessionStorage)
 *   3) 그것도 없으면 국문
 *
 * sessionStorage 를 쓴다 — 탭을 닫으면 잊는다.
 * localStorage 로 남겨 두면 넉 달 뒤에 다시 들어온 사람이 왜 영문인지 모른 채 마주친다.
 */
function readLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'en' || q === 'ko') return q;
  try {
    const saved = sessionStorage.getItem(KEY);
    if (saved === 'en' || saved === 'ko') return saved;
  } catch {
    /* 사파리 비공개 모드처럼 저장이 막힌 곳에서는 그냥 국문으로 간다. */
  }
  return 'ko';
}

export const lang = { current: readLang() };

/** 영문 화면인가. 곳곳에서 lang.current === 'en' 을 되풀이하지 않기 위한 것. */
export const isEn = () => lang.current === 'en';

/* <html lang> 을 맞춘다 — 글꼴·줄바꿈·스크린리더가 이 값을 본다. */
document.documentElement.lang = lang.current;

/* 영문 화면이면 data-en 을 가진 메타 태그를 그 값으로 갈아 끼운다.
   국문이 기본이라 HTML 에 적힌 content 는 국문이고, 영문은 같은 태그에 data-en 으로 붙어 있다.
   ?lang=en 은 같은 주소의 질의 문자열이라 정적 태그를 언어별로 둘 수 없다.
   주의: 페이스북·트위터 크롤러는 JS 를 돌리지 않으므로 공유 미리보기는 언제나 국문이다.
   영문 미리보기가 필요해지면 주소를 따로 내야 한다(/en/…). */
if (lang.current === 'en') {
  for (const m of document.querySelectorAll('meta[data-en]')) {
    if (m.dataset.en) m.setAttribute('content', m.dataset.en);
  }
}

/** 언어를 바꾸고 같은 페이지를 다시 연다. 주소에도 남겨 링크를 공유할 수 있게 한다. */
export function setLang(next) {
  if (next === lang.current) return;
  try {
    sessionStorage.setItem(KEY, next);
  } catch {
    /* 저장이 막혀 있어도 주소의 ?lang= 이 남으므로 그 페이지에서는 동작한다. */
  }
  const url = new URL(location.href);
  if (next === 'en') url.searchParams.set('lang', 'en');
  else url.searchParams.delete('lang');
  location.assign(url.toString());
}

/**
 * {ko, en} 필드를 현재 언어 문자열로 바꾼다.
 * en 이 비어 있으면 ko 를 그대로 내보낸다 — 번역이 없다고 화면이 비지 않게.
 * 이미 문자열인 값(연도 등)은 그대로 통과시킨다.
 */
export function t(field, l = lang.current) {
  if (field == null) return '';
  if (typeof field === 'string') return field;
  const v = field[l];
  if (v != null && v !== '') return v;
  return field.ko ?? '';
}

/** 영문을 청했는데 영문이 없어 국문이 나오는가. '번역 준비 중' 알림의 판정. */
export function isFallback(field) {
  if (!isEn() || field == null || typeof field === 'string') return false;
  return Boolean(field.ko) && !field.en;
}
