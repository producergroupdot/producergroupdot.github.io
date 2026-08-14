/* i18n.js — 국문/영문 필드 하나만 통과하는 문(門).
   데이터의 모든 텍스트 필드는 {ko, en} 객체입니다.
   화면에 글자를 찍을 때는 반드시 t() 를 거치세요. field.ko 를 직접 읽지 마세요. */

export const lang = {
  /** 현재 언어. 나중에 KO/EN 토글이 이 값만 바꾸면 됩니다. */
  current: (document.documentElement.lang || 'ko').slice(0, 2),
};

/**
 * {ko, en} 필드를 현재 언어 문자열로 바꾼다.
 * en 이 비어 있으면 ko 를 그대로 내보낸다.
 * 이미 문자열인 값(연도 등)은 그대로 통과시킨다.
 */
export function t(field, l = lang.current) {
  if (field == null) return '';
  if (typeof field === 'string') return field;
  const v = field[l];
  if (v != null && v !== '') return v;
  return field.ko ?? '';
}
