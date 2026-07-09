# Community Risk Intelligence Dashboard

커뮤니티 운영자가 키워드 확산, 정책 위반 후보, 사용자 제재, 접근 로그를 한 화면에서 분석하고 조치할 수 있는 관리자 대시보드입니다.

## 주요 기능

- 세션 기반 로그인/로그아웃
- PBKDF2 비밀번호 해시 저장
- 역할 기반 권한 관리: `admin`, `manager`, `viewer`
- 사용자 생성, 비활성화, 삭제
- 접근 로그 필터: IP, Method, Status 기준 조회
- 감사 로그 기록: 사용자 변경, IP 차단, 모더레이션 조치 추적
- IP 차단 등록 및 해제
- Signal Map: 키워드가 게시글/댓글에서 확산되는 흐름 시각화
- Moderation Queue: 정책 위반 의심 콘텐츠 위험도 분석 및 조치
- 룰 기반 분석 엔진: 개인정보, 사기/피싱, 스팸, 분쟁, 고객 불만 확산 탐지

## 실행 방법

```bash
npm install
npm start
```

브라우저에서 `http://localhost:3000`으로 접속합니다.

## 기본 계정

- 아이디: `admin`
- 비밀번호: `admin123`

## 프로젝트 구조

```text
public/
  css/style.css
  js/login.js
  js/dashboard.js
  index.html
  dashboard.html
server/
  app.js
  data/
    posts.json
    comments.json
    moderationActions.json
  logs/
  middleware/
  routes/
    intelligence.js
  utils/
    intelligenceEngine.js
```

## 포트폴리오 포인트

이 프로젝트는 단순 CRUD 관리자 페이지가 아니라, 커뮤니티 운영자가 위험 신호를 발견하고 근거를 확인한 뒤 조치할 수 있는 관제형 대시보드를 목표로 합니다. 실제 외부 사이트를 크롤링하지 않고 샘플 커뮤니티 데이터를 사용하므로 개인정보와 약관 문제 없이 기능 흐름을 보여줄 수 있습니다.

## 참고

데모 프로젝트라 데이터는 JSON 파일에 저장됩니다. 운영 환경에서는 PostgreSQL 같은 데이터베이스, Redis 세션 저장소, HTTPS, CSRF 보호, 보안 헤더, 실제 AI 모델 검토 워크플로를 함께 적용하는 것이 좋습니다.
