# 📖 ReadMate — 영어 원문 읽기 챌린지

영어 원서의 한 페이지를 **사진으로 찍어 올리거나**, 앱에 내장된 **무료 고전 영어 원서**를 바로 읽으면,
Google Gemini AI가 그 페이지를 읽고 **100% 영어로 된 학습 가이드**(요약 · 핵심 단어 · 문장 분석 ·
이해도 퀴즈)를 만들어 주는 웹앱입니다. 별표(⭐)로 저장한 단어는 **1일 → 3일 → 7일 → 14일 간격
반복 복습**으로 다시 만나게 되고, 연속 학습일(스트릭)·뱃지·진행상황 공유 기능으로 여러 명이
함께하는 **영어 원문 읽기 챌린지**를 운영할 수 있습니다.

> 학습 내용(요약·단어 설명·퀴즈 등)이 영어로만 제공되는 이유: 영어를 한국어로 번역하지 않고
> **영어를 영어로 이해하는 몰입 학습**을 위해서입니다. (이 README와 앱의 안내 문구처럼
> "사용 방법"을 설명하는 부분만 한국어입니다.)

---

## ✅ 준비물

1. **Node.js** — [nodejs.org](https://nodejs.org)에서 LTS 버전을 설치하세요. (이미 있다면 건너뛰기)
2. **Gemini API 키 (무료)** — [aistudio.google.com/apikey](https://aistudio.google.com/apikey)에 접속해
   구글 계정으로 로그인 후 **"Create API key"** 버튼을 누르면 키가 발급됩니다. 복사해 두세요.
   (내장된 고전 원서를 읽을 때도 학습 가이드 생성에는 이 키가 필요합니다.)

## 🚀 실행 방법 (3단계)

터미널(맥: 터미널 앱, 윈도우: 명령 프롬프트/PowerShell)을 열고, 이 폴더로 이동한 뒤:

```bash
# 1) 필요한 파일 설치 (처음 한 번만)
npm install

# 2) 앱 실행
npm run dev
```

3. 화면에 나오는 주소(보통 `http://localhost:5173`)를 브라우저로 열면 끝!
   첫 화면에서 복사해 둔 Gemini API 키를 붙여넣으면 바로 사용할 수 있습니다.
   홈 화면 상단의 **"ReadMate 이용 방법"**을 펼치면 전체 사용법을 한국어로 볼 수 있습니다.

### 📱 휴대폰에서 쓰고 싶다면

배포(아래 참고) 후 휴대폰 브라우저로 접속하면 카메라로 바로 페이지를 찍을 수 있습니다.
브라우저 메뉴에서 **"홈 화면에 추가"**를 누르면 일반 앱처럼 설치되며(PWA),
저장한 단어장과 복습 화면은 **오프라인에서도** 열립니다.

## 📦 배포용 빌드 (선택)

```bash
npm run build
```

`dist/` 폴더가 생성됩니다. 이 폴더를 Netlify, Vercel, GitHub Pages, Cloudflare Pages 등
아무 정적 호스팅에나 올리면 됩니다. 서버가 전혀 필요 없습니다.

## 🎯 챌린지 핵심 기능

- **📷 Scan a Page** — 내가 읽는 책 한 페이지를 사진으로 찍어 AI 학습 가이드를 받습니다.
- **📖 Read the Library** — 계정·비용 없이 바로 읽을 수 있는 무료 고전 영어 원서 8종이
  들어있습니다 (아래 목록 참고). 페이지를 넘기며 읽다가 "Analyze this page"를 누르면
  사진 없이 바로 학습 가이드가 만들어집니다.
- **🔊 발음 듣기** — 단어 옆 스피커 아이콘을 누르면 브라우저 내장 음성으로 발음을 들을 수 있습니다.
- **📊 영어 레벨 테스트** — 설정 탭에서 6문항 테스트로 내 레벨(Beginner/Intermediate/Advanced)을
  확인하면, 학습 가이드의 어휘 난이도와 라이브러리 추천 도서가 그에 맞게 조정됩니다.
- **🔥 스트릭 & 뱃지** — Progress 탭에서 연속 학습일, 완독한 챕터/책 수, 저장한 단어 수에 따른
  뱃지를 확인할 수 있습니다.
- **✅ 체크 & 공유** — 홈 화면의 "오늘 학습 완료 체크 & 공유" 버튼을 누르면 챌린지 인증 이미지가
  만들어져 바로 저장하거나 공유할 수 있습니다.
- **🖨️ 인쇄하기** — 학습 결과 화면 상단의 Print 버튼으로 요약·단어·퀴즈를 깔끔한 인쇄용
  레이아웃으로 출력할 수 있습니다.
- **🤝 단어장 함께 쓰기** — Word Book의 "Share Deck"으로 단어 목록을 파일로 내보내고, 챌린지
  멤버가 "Import Deck"으로 가져와 같은 단어를 함께 복습할 수 있습니다.

### 📚 내장 무료 원서 목록 (모두 저작권 만료, 공개 도메인)

| 레벨 | 책 | 저자 | 챕터 |
|---|---|---|---|
| Beginner | The Wonderful Wizard of Oz | L. Frank Baum | 24 |
| Beginner | Alice's Adventures in Wonderland | Lewis Carroll | 12 |
| Beginner | The Secret Garden | Frances Hodgson Burnett | 27 |
| Intermediate | The Adventures of Sherlock Holmes | Arthur Conan Doyle | 12 |
| Intermediate | The Call of the Wild | Jack London | 7 |
| Intermediate | A Christmas Carol | Charles Dickens | 5 |
| Advanced | The Great Gatsby | F. Scott Fitzgerald | 9 |
| Advanced | Pride and Prejudice | Jane Austen | 61 |

새 책을 추가하려면 `scripts/build-books.mjs`의 `BOOKS` 목록에 항목을 추가하고
`node scripts/build-books.mjs`를 실행하세요. `public/books/*.json`이 새로 생성됩니다.

## 🔒 개인정보

- API 키, 단어장, 학습 기록(스트릭·진행상황)은 **내 브라우저(IndexedDB)에만** 저장됩니다.
  외부 서버로 전송되지 않습니다.
- API 키는 오직 Google Gemini API 호출에만 사용됩니다.
- 업로드한 책 사진은 분석에만 쓰이고 **저장되지 않습니다.**
- "체크 & 공유"로 만든 이미지에는 책 원문이나 개인정보가 들어가지 않으며, 저장·공유 여부는
  전적으로 사용자가 직접 선택합니다.
- 회원가입 · 로그인 · 광고 · 추적 스크립트가 전혀 없습니다.

## 🗂 프로젝트 구조

```
scripts/
  build-books.mjs             # 공개 도메인 원서를 내려받아 public/books/*.json 생성
src/
  App.jsx                      # 화면 전환(라우팅) + 전체 레이아웃 + 다크모드
  components/
    ApiKeyScreen.jsx           # API 키 입력/관리 + 레벨 테스트 진입점 + 크레딧
    HomeScreen.jsx              # 챌린지 홈 (이용 방법 안내 + 체크&공유 + 진입 카드)
    UploadScreen.jsx           # 사진 촬영/업로드 + 분석 (스켈레톤 로딩)
    BookLibraryScreen.jsx      # 내장 원서 목록 (레벨 추천 표시)
    BookReaderScreen.jsx       # 원서 페이지 리더 + 그 자리에서 분석
    ResultScreen.jsx           # 학습 결과 (요약/단어/문장분석/퀴즈/라이팅/인쇄)
    VocabScreen.jsx            # 단어장 (검색·필터·태그·내보내기·덱 공유)
    ReviewScreen.jsx           # 간격 반복 플래시카드 복습
    ProgressScreen.jsx         # 스트릭·뱃지·진행상황 공유 카드
    LevelTestScreen.jsx        # 6문항 영어 레벨 테스트
    SpeakButton.jsx            # 발음 듣기 버튼 (브라우저 내장 TTS)
    ErrorBoundary.jsx          # 앱 전체 오류 방지
  lib/
    geminiClient.js            # Gemini API 호출 (재시도 + 레벨별 프롬프트)
    db.js                      # IndexedDB 저장소 (idb 라이브러리)
    spacedRepetition.js        # Leitner box 복습 스케줄링 (주석에 설명)
    streaks.js / badges.js     # 스트릭 계산 / 뱃지 판정
    statsUtils.js              # 활동 기록 → 통계 집계
    pagination.js              # 원서 챕터를 페이지 단위로 분할
    progressCard.js            # 캔버스로 공유용 진행상황 이미지 생성
    deckShare.js                # 단어장 내보내기/가져오기 (JSON)
    levelTest.js                # 레벨 테스트 문항/채점
    imageUtils.js              # 사진 리사이즈/압축 (최대 1600px JPEG)
    exportUtils.js             # Anki CSV / Quizlet TXT 내보내기
    speech.js                   # 브라우저 내장 TTS 래퍼
public/
  books/                       # 내장 원서 JSON (빌드 산출물, 커밋됨)
  manifest.webmanifest, sw.js  # PWA 설치 + 오프라인 지원
```

## ❓ 자주 묻는 질문

- **분석이 실패해요** → 페이지 전체가 선명하게 나오도록 다시 찍어 보세요. 네트워크/일시 오류는
  자동으로 최대 2회 재시도합니다. 키 오류라면 설정(⚙️) 탭에서 키를 다시 확인하세요.
- **단어 내보내기는 어떻게 하나요?** → 단어장(📚) 탭 상단의 **Anki (CSV) / Quizlet (TXT)** 버튼을
  누르면 파일이 다운로드됩니다. **Share Deck**은 ReadMate 전용 형식(JSON)으로, 다른 챌린지
  멤버가 **Import Deck**으로 그대로 가져와 같은 단어를 복습할 수 있습니다.
- **복습 간격은 어떻게 정해지나요?** → Leitner 상자 방식입니다. 새 단어는 1일 뒤에 나타나고,
  `Good`을 누를 때마다 3일 → 7일 → 14일 → 30일로 늘어납니다. `Hard`는 처음(1일)으로 되돌리고,
  `Easy`는 한 단계 건너뜁니다.
- **스트릭은 어떻게 계산되나요?** → 사진 분석, 라이브러리 페이지 분석, "체크 & 공유" 중 하나라도
  한 날짜에 있으면 그날은 "활동한 날"로 기록됩니다. 오늘 아직 아무것도 안 했어도 어제까지의
  스트릭은 자정이 지나기 전까지 유지됩니다.
- **레벨 테스트 결과는 어디에 쓰이나요?** → 학습 가이드의 어휘 난이도(Gemini 프롬프트)와
  라이브러리의 "Recommended for you" 표시에 반영됩니다. 설정 탭에서 언제든 다시 볼 수 있습니다.
