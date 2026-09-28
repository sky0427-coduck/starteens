# 별빛틴즈

GitHub Pages에서 실행하는 정적 중등부 홈페이지입니다. 화면의 문서 뼈대와 내비게이션은 `index.html`, 스타일은 `style.css`, 동작은 일반 JavaScript 모듈에 둡니다. 프레임워크나 빌드 단계는 사용하지 않습니다.

## Supabase 연결

1. Supabase SQL Editor에서 [`supabase/schema.sql`](supabase/schema.sql)을 실행해 학생/출석 테이블을 준비하고, [`supabase/content-storage.sql`](supabase/content-storage.sql)을 실행해 말씀/광고 저장 테이블과 사진 저장소를 준비합니다. 기존 학생/출석 테이블이 이미 있다면 콘텐츠 기능을 위해 `content-storage.sql`만 실행하면 됩니다.
2. [`supabase-config.js`](supabase-config.js)에 별빛틴즈 프로젝트 URL과 공개 anon key를 설정해 두었습니다. anon key는 브라우저 공개용이며, `service_role` 키를 이 파일이나 GitHub에 절대 넣지 마세요.
3. `supabase/functions/create-student/index.js`를 Supabase Edge Function `create-student`로 배포합니다. 함수는 service role 키를 서버에서 사용하므로 그 키를 웹사이트에 넣지 않습니다.
4. GitHub Pages가 새 버전을 배포하면 기존 관리자 로그인 후 출석 화면의 **학생 관리**에서 학생 아이디와 초기 비밀번호를 추가합니다.

학생 비밀번호는 평문으로 별도 테이블에 저장하지 않고 Supabase Auth가 관리합니다.

## 말씀과 주보/광고 콘텐츠

`supabase/content-storage.sql`은 `site_content` 테이블과 `public-materials` Storage 버킷 및 정책을 준비합니다. 말씀 문구/서식과 광고 설명은 `site_content`에 저장하고, 사진 파일은 Storage에 올린 뒤 공개 이미지 주소만 콘텐츠 레코드에 보관합니다. 사진은 공개 웹사이트에 표시되며, 공개 anon key에 읽기/쓰기 권한이 있습니다. JPEG, PNG, WebP, 파일당 10MB까지 허용합니다.

사이트의 기존 관리자 로그인 뒤에 별도 Supabase Auth 로그인을 요구하지 않도록 구성했습니다.

## 관리자 로그인 관련

기존 화면 관리자 비밀번호는 요청에 따라 유지했습니다. 요청한 방식에 맞춰 공개 anon key로 콘텐츠/출석 DB 쓰기와 이미지 업로드, 학생 생성 Function 호출을 허용합니다. 사이트 화면은 관리자 로그인 여부에 따라 관리 버튼을 표시하지만, 브라우저 공개 키로 직접 요청하는 것을 차단하지는 않습니다.
