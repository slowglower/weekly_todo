# Notion Weekly Collaboration Timeline Widget

Notion 데이터베이스와 연동되는 주간 협업 타임라인 위젯입니다.

## 핵심 구조

- 사람별 레인(swimlane)
- 주간 7일 그리드
- 담당자 필터
- 상태 필터
- 날짜가 겹치는 일정은 같은 위치에 겹쳐서 표시
- 오늘 날짜 기준으로 가까운 블록이 더 위에 표시
- 같은 거리의 이전/이후 일정이 겹치면 이전 일정이 더 위에 표시
- 블록에 마우스를 올리면 해당 블록이 최상단으로 올라옴
- 겹친 영역 호버 깜빡임 방지를 위해 JS hover-lock 적용
- Notion 연동 데이터는 일정 클릭 시 원본 Notion 페이지를 새 탭으로 열 수 있음

## 필요한 Notion 데이터베이스

데이터베이스 이름 예시: `협업 일정`

| 속성명 | 유형 | 필수 | 설명 |
|---|---|---:|---|
| 업무명 | Title | O | 타임라인 블록 제목 |
| 담당자 | Select 또는 People | O | 사람별 레인을 나누는 기준. Select를 쓰면 색상 관리가 쉬움 |
| 기간 | Date | O | 시작일/종료일. 종료일이 없으면 하루 일정으로 처리 |
| 상태 | Status 또는 Select | O | 예정/진행중/완료/막힘 |
| 역할 | Select 또는 Text | 선택 | 담당자 아래 보조 설명으로 사용 가능 |

상태명은 아래처럼 쓰면 자동 매핑됩니다.

- 예정, Todo → 예정
- 진행중, 진행, Doing, In Progress → 진행중
- 완료, Done, Complete → 완료
- 막힘, Blocked, 보류, 확인 필요 → 막힘

## 배포 방법: Vercel 기준

1. 이 폴더를 GitHub 저장소에 올립니다.
2. Vercel에서 해당 저장소를 Import합니다.
3. Vercel Project Settings → Environment Variables에 아래 값을 추가합니다.

```txt
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxx
NOTION_DATA_SOURCE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_TITLE_PROP=업무명
NOTION_OWNER_PROP=담당자
NOTION_DATE_PROP=기간
NOTION_STATUS_PROP=상태
NOTION_ROLE_PROP=역할
NOTION_VERSION=2026-03-11
```

4. Notion에서 `협업 일정` 원본 데이터베이스를 열고, 우측 상단 메뉴에서 만든 Integration을 연결합니다.
5. 배포된 `https://프로젝트명.vercel.app` 주소를 Notion에서 `/embed`로 삽입합니다.

## data source ID 찾기

최신 Notion API는 데이터베이스의 하위 개념인 data source ID를 사용합니다. Notion 데이터베이스 메뉴의 `Manage data sources`에서 `Copy data source ID`를 사용하거나, Retrieve database API로 data_sources 배열을 확인할 수 있습니다.

## 로컬/정적 미리보기

`index.html`만 브라우저에서 열면 API 연결 실패 시 샘플 데이터가 표시됩니다. 실제 Notion 연동은 토큰 보안을 위해 `/api/notion-tasks.js` 같은 서버리스 API가 필요합니다.

## v4 변경 사항

- 겹친 블록 hover 시 `:hover` CSS만으로 z-index를 바꾸지 않고, JS가 `.is-hovered` 상태를 잠그도록 변경했습니다.
- hover-lock 중에는 같은 레인의 다른 블록 pointer event를 잠시 꺼서, 마우스 아래 요소가 반복 교체되며 깜빡이는 현상을 줄였습니다.
- 완료 상태 일정은 취소선 없이 낮은 투명도/명도로만 표현합니다.
- 동일 담당자의 시작일과 종료일이 완전히 같은 일정은 하나를 한 줄 아래로 내려 표시합니다.
- Notion API 응답의 `page.url`을 `task.url`로 전달하여 일정 클릭 시 원본 Notion 페이지가 새 탭으로 열리도록 했습니다.


## v6 업데이트

- 담당자별 일정 개수는 완료 상태를 제외하고 표시합니다.
- Notion 임베드에 어울리도록 전체 UI를 더 미니멀한 톤으로 정리했습니다.
- 완료 일정은 취소선 없이 낮은 명도/투명도로만 구분합니다.

## v7 업데이트

- 포인트 컬러를 세이지 + 스카이 계열로 변경했습니다.
- 전체 배경, 카드, 그리드, 필터, 오늘 표시를 파스텔 플래너 톤으로 조정했습니다.
- 담당자별 기본 컬러도 세이지/스카이 팔레트로 변경했습니다.
- 기존 기능은 그대로 유지합니다.

## v8 업데이트

- 일정 카드 앞의 세로 포인트 선을 작은 원형 dot으로 변경했습니다.
- 세이지+스카이 파스텔톤 디자인과 기존 상호작용은 유지했습니다.
- 실제 Notion에는 Vercel 배포 URL을 `/embed`로 넣으면 됩니다.


## 함께 하는 업무 처리 기준

리서치처럼 여러 사람이 함께 하는 업무는 기본적으로 아래 둘 중 하나로 처리하는 것을 추천합니다.

1. **공통 업무로 관리**: 담당자 속성에 `공통` 또는 `팀 전체` 옵션을 만들면 별도 공통 레인에 표시됩니다. 회의, 리서치, 전체 리뷰처럼 특정 1명의 책임으로 보기 어려운 일정에 적합합니다.
2. **참여자별 업무로 관리**: 담당자 속성을 `Multi-select` 또는 `People`로 쓰면 같은 일정이 각 참여자의 레인에 표시됩니다. 각자의 작업량/일정 충돌까지 확인해야 하는 업무에 적합합니다.

위젯의 기본 축은 담당자별 swimlane이므로, 카테고리는 별도 레인으로 바꾸기보다는 `업무 유형` 속성으로 추가해 필터나 dot 색상에 활용하는 방식이 안정적입니다.

deploy trigger
