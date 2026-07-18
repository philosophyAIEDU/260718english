# 📖 ReadMate — 영어 원서 학습 도우미

영어 원서의 한 페이지를 **사진으로 찍어 올리면**, Google Gemini AI가 그 페이지를 읽고
**100% 영어로 된 학습 가이드**(요약 · 핵심 단어 · 문장 분석 · 이해도 퀴즈)를 만들어 주는 웹앱입니다.
별표(⭐)로 저장한 단어는 **1일 → 3일 → 7일 → 14일 간격 반복 복습**으로 다시 만나게 됩니다.

> 모든 학습 내용이 영어로만 제공되는 이유: 영어를 한국어로 번역하지 않고
> **영어를 영어로 이해하는 몰입 학습**을 위해서입니다.

---

## ✅ 준비물

1. **Node.js** — [nodejs.org](https://nodejs.org)에서 LTS 버전을 설치하세요. (이미 있다면 건너뛰기)
2. **Gemini API 키 (무료)** — [aistudio.google.com/apikey](https://aistudio.google.com/apikey)에 접속해
   구글 계정으로 로그인 후 **"Create API key"** 버튼을 누르면 키가 발급됩니다. 복사해 두세요.

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

## 🔒 개인정보

- API 키와 단어장은 **내 브라우저(IndexedDB)에만** 저장됩니다. 외부 서버로 전송되지 않습니다.
- API 키는 오직 Google Gemini API 호출에만 사용됩니다.
- 업로드한 책 사진은 분석에만 쓰이고 **저장되지 않습니다.**
- 회원가입 · 로그인 · 광고 · 추적 스크립트가 전혀 없습니다.

## 🗂 프로젝트 구조

```
src/
  App.jsx                      # 화면 전환(라우팅) + 전체 레이아웃 + 다크모드
  components/
    ApiKeyScreen.jsx           # API 키 입력/관리 화면
    UploadScreen.jsx           # 사진 촬영/업로드 + 분석 (스켈레톤 로딩)
    ResultScreen.jsx           # 학습 결과 (요약/단어/문장분석/퀴즈/라이팅)
    VocabScreen.jsx            # 단어장 (검색·필터·태그·내보내기)
    ReviewScreen.jsx           # 간격 반복 플래시카드 복습
    ErrorBoundary.jsx          # 앱 전체 오류 방지
  lib/
    geminiClient.js            # Gemini API 호출 (지수 백오프 재시도 포함)
    db.js                      # IndexedDB 저장소 (idb 라이브러리)
    spacedRepetition.js        # Leitner box 복습 스케줄링 (주석에 설명)
    imageUtils.js              # 사진 리사이즈/압축 (최대 1600px JPEG)
    exportUtils.js             # Anki CSV / Quizlet TXT 내보내기
public/
  manifest.webmanifest, sw.js  # PWA 설치 + 오프라인 지원
```

## ❓ 자주 묻는 질문

- **분석이 실패해요** → 페이지 전체가 선명하게 나오도록 다시 찍어 보세요. 네트워크/일시 오류는
  자동으로 최대 2회 재시도합니다. 키 오류라면 설정(⚙️) 탭에서 키를 다시 확인하세요.
- **단어 내보내기는 어떻게 하나요?** → 단어장(📚) 탭 상단의 **Export for Anki / Quizlet** 버튼을 누르면
  파일이 다운로드됩니다. Anki는 CSV 가져오기(쉼표 구분, HTML 허용), Quizlet은 텍스트 붙여넣기
  (탭 구분)로 가져오면 됩니다.
- **복습 간격은 어떻게 정해지나요?** → Leitner 상자 방식입니다. 새 단어는 1일 뒤에 나타나고,
  `Good`을 누를 때마다 3일 → 7일 → 14일 → 30일로 늘어납니다. `Hard`는 처음(1일)으로 되돌리고,
  `Easy`는 한 단계 건너뜁니다.
