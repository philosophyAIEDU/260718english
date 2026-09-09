# TTS용 챕터별 원문 텍스트

이 폴더는 라이브러리 책의 낭독 mp3를 만들기 위한 **작업용 텍스트**입니다. 앱 자체는
쓰지 않으므로(`public/`이 아니라 저장소 최상위에 있음) 배포된 사이트에는 포함되지
않습니다.

각 책마다 `chN.txt`(챕터별 원문) + `_checklist.txt`(진행 체크리스트)가 들어있고,
`scripts/extract-chapter-texts.mjs`로 `public/books/<bookId>.json`에서 자동으로
뽑은 것입니다. 파일명이 리더 화면이 찾는 `public/audio/<bookId>/chN.mp3` 규칙과
그대로 짝이 맞습니다 — TTS 결과를 같은 번호로 저장해서 그 경로에 넣으면 됩니다.

## 현재 들어있는 책

| 폴더 | 책 | 챕터 수 | 낭독 mp3 |
|---|---|---|---|
| `great-lines/` | Great Lines from the Classics | 30 | ✅ `public/audio/great-lines/` 에 30개 모두 포함 (Kokoro-82M · `af_heart`) |
| `genesis/` | Genesis | 50 | — |
| `psalms/` | Psalms | 150 | — |
| `proverbs/` | Proverbs | 31 | — |
| `matthew/` | Matthew | 28 | — |
| `john/` | John | 21 | — |
| `romans/` | Romans | 16 | — |

`great-lines`는 각 `chN.txt`의 명대사 + 출처 한 줄(앞의 `—` 제거, `(1865)` →
`1865`)을 이어 붙여 낭독한 것입니다. 나머지 6권은 아직 텍스트만 있고 mp3는
비어 있습니다.

## 다른 책도 뽑으려면

```
node scripts/extract-chapter-texts.mjs --book <bookId> --out tts-text/<bookId>
```

`<bookId>`는 `public/books/index.json`의 `id` 값입니다.
