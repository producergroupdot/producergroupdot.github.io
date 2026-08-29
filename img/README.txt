프로듀서그룹 도트 웹사이트 — 이미지 폴더
==========================================

이 폴더를 저장소 루트에 통째로 넣으세요.
  producergroupdot.github.io/img/

파일명 규칙
-----------
작업 사진      img/works/<작업ID>/01.jpg  (02, 03 … 순번)
포스터         img/works/<작업ID>/poster.jpg
홈 파노라마    img/home/<이름>.jpg        (5:2 로 미리 잘라서 넣습니다)
예술가         img/artists/<예술가ID>.jpg
프로듀서       img/producers/<이름>.jpg

한글·공백·괄호는 파일명에 쓰지 않습니다. 영문 소문자·숫자·하이픈만.


들어 있는 것
------------

[home] — 홈 화면 전용. 칸 비율에 맞춰 미리 잘라둔 파일입니다.
  ganghwa-panorama.jpg          1800×720 (5:2)  아래 왼쪽    사진 Jisun
  moving-a-forest-panorama.jpg  1800×720 (5:2)  아래 오른쪽  사진 제공 무제의 길
  sync-de-sync-vertical.jpg     1050×1400 (3:4) 가운데 세로  사진 Jisun

[works/sync-de-sync] 4장                        사진 Jisun
[works/ganghwa]      7장                        사진 Jisun
[works/moving-a-forest] 5장                     사진 제공 무제의 길
[works/hihihistory]  poster.jpg                 2026 SPAF 포스터
[works/tnn]          4장                        사진 제공 한국문화예술위원회
[works/app]          4장                        APP 캠프 기록
[works/on-the-birds-day] 8장                    사진 박지선 Park Jisun
[works/energy]       8장                        사진 박지선 Park Jisun


★ 반드시 교체해야 하는 것 — 파일명 앞에 TEMP- 가 붙어 있습니다
--------------------------------------------------------------

works/gwantong-18/TEMP-01~03.jpg
  인스타그램에 올린 카드 이미지라 글자가 박혀 있습니다.
  글자 없는 원본이 필요합니다. 촬영 Sang Hoon Ok.

artists/TEMP-hwang.jpg
artists/TEMP-ambiguous.jpg
artists/TEMP-untitledroad.jpg
  인물 사진이 아니라 작업 사진을 임시로 넣은 것입니다.
  Artists 페이지의 동그라미에 들어갈 인물 사진이 필요합니다.


★ 아직 없는 것
--------------

works/mooljil/            코끼리들이 웃는다 〈물질〉


★ 규칙에서 벗어나 있는 것 — 정리하면 좋습니다
--------------------------------------------

works/aesthethics.jpg
  폴더가 아니라 낱장 파일입니다. 지금은 works.json 의 cover 가 이 파일을
  직접 가리키고 있어 화면에는 정상으로 나옵니다.
  works/aesthethics/01.jpg 로 옮기면 규칙과 같아집니다.

works/climate-residency/2020/  2021/  2022/
  해마다 폴더가 한 겹 더 있습니다. 표지는 2020/01.jpg 로 걸어두었습니다.
  01.jpg 를 자동으로 찾는 규칙은 이 한 겹을 넘어가지 못하므로,
  표지를 바꾸려면 works.json 의 cover 를 직접 고쳐야 합니다.
artists/kwon.jpg          권병준
artists/elephants.jpg     코끼리들이 웃는다


[producers]
  jisun-illustration.png   리소그래프풍 4색 변환 (하늘 #2A5982 / 땅 #EAC119
                           / 구름·길 #EAE4DA / 인물 #1D1D1B)
  jisun-original-photo.jpg 변환 전 원본. 파타고니아. 촬영 Jisun.

  나머지 세 분 사진은 각자에게 받아야 합니다.
  같은 방식으로 변환하려면 원본 사진을 주세요.


원 안에 들어가는 축소본 — <이름>-thumb.jpg
------------------------------------------
Artists 캔버스의 원(최대 235px)과 About 의 프로듀서 원(104~132px)은
원본 대신 480×480 축소본을 씁니다. 품질 82. 17장 · 합계 741KB.
원본은 그대로 둡니다 — 프로듀서 상세의 큰 원과 상세 페이지가 계속 씁니다.

축소본이 없으면 코드가 원본으로 조용히 떨어집니다. 그러니 새 인물 사진을
넣을 때 축소본을 안 만들어도 화면은 깨지지 않습니다. 다만 무거워집니다.

만드는 법 — 원본에서 가운데 정사각을 잘라 480×480, 품질 82.
얼굴이 가운데에 없는 사진만 자를 자리를 따로 잡았습니다(비율은 원본 기준):

  artists/elephants.jpg    가로 65.6% · 세로 35%   얼굴이 오른쪽에 있습니다.
                           가운데로 자르면 얼굴이 오른쪽 끝에서 잘립니다.
  artists/ambiguous.jpg    가로 50%   · 세로 43%   세로 사진. 얼굴이 위쪽입니다.
  producers/bongmin-01.jpg 가로 41%   · 세로 50%   세로 사진.

  나머지 14장은 원본이 이미 정사각이라 자를 것이 없습니다.

producers/miseon-02.jpg 는 원본이 410×410 이라 축소본을 만들지 않았습니다.
480 으로 늘리면 뭉개지고 용량도 줄지 않습니다. 이 한 장만 원본으로 나갑니다.

works.json 의 coverPosition(top·center·bottom)과는 다른 값입니다.
그 칸은 작업 사진에만 있고 예술가·프로듀서 데이터에는 없습니다.
가로 위치를 가리키는 값(left·right)도 아직 없습니다.


해상도에 대해
-------------
여기 있는 사진은 개인 웹사이트에 올라가 있던 것을 다시 내려받은 것이라
이미 한 번 줄어든 상태입니다(1200~1800px). 화면에 쓰기에는 충분하지만,
원본 파일이 따로 있으면 그쪽으로 바꾸는 편이 좋습니다.
