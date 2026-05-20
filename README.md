# Secure Admin Dashboard

로그인, 세션 인증, 사용자 관리, 접근 로그 확인, IP 차단 관리를 제공하는 Node.js 기반 관리자 대시보드입니다.

## 주요 기능

- 세션 기반 로그인/로그아웃
- PBKDF2 비밀번호 해시 저장
- 로그인 실패 횟수 제한
- 사용자 생성, 비활성화, 삭제
- 접근 로그 기록 및 최근 로그 조회
- IP 차단 등록 및 해제
- 역할 기반 권한 관리: `admin`, `manager`, `viewer`
- 감사 로그 기록: 사용자 변경, IP 차단/해제 이력 추적
- 접근 로그 필터: IP, Method, Status 기준 조회
- 반응형 관리자 UI

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
  logs/
  middleware/
  routes/
  utils/
```

## 참고

데모 프로젝트라 데이터는 JSON 파일에 저장됩니다. 운영 환경에서는 SQLite, PostgreSQL 같은 데이터베이스와 HTTPS, CSRF 보호, 보안 헤더, 세션 저장소를 함께 적용하는 것이 좋습니다.
