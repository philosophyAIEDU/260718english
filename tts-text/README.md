# TTS용 챕터별 원문 텍스트

이 폴더는 라이브러리 책의 낭독 mp3를 만들기 위한 **작업용 텍스트**입니다. 앱 자체는
쓰지 않으므로(`public/`이 아니라 저장소 최상위에 있음) 배포된 사이트에는 포함되지
않습니다.

각 책마다 `chN.txt`(챕터별 원문) + `_checklist.txt`(진행 체크리스트)가 들어있고,
`scripts/extract-chapter-texts.mjs`로 `public/books/<bookId>.json`에서 자동으로
뽑은 것입니다. 파일명이 리더 화면이 찾는 `public/audio/<bookId>/chN.mp3` 규칙과
그대로 짝이 맞습니다 — TTS 결과를 같은 번호로 저장해서 그 경로에 넣으면 됩니다.

## 현재 들어있는 책

낭독 mp3는 모두 오픈소스 로컬 TTS **Kokoro-82M** · `af_heart` 보이스로 만들었고,
`public/audio/<bookId>/chN.mp3` 에 챕터별로 들어 있습니다.

| 폴더 | 책 | 챕터 수 | 낭독 mp3 |
|---|---|---|---|
| `great-lines/` | Great Lines from the Classics | 30 | ✅ 30개 (명대사 + 출처 한 줄) |
| `genesis/` | Genesis | 50 | ✅ 50개 |
| `psalms/` | Psalms | 150 | ✅ 150개 |
| `proverbs/` | Proverbs | 31 | ✅ 31개 |
| `matthew/` | Matthew | 28 | ✅ 28개 |
| `john/` | John | 21 | ✅ 21개 |
| `romans/` | Romans | 16 | ✅ 16개 |

- `great-lines`: 각 `chN.txt`의 명대사 + 출처 한 줄(앞의 `—` 제거, `(1865)` →
  `1865`)을 이어 붙여 낭독.
- 성경 6권: 낭독이 자연스럽도록 각 절 앞의 **절 번호를 떼고**, `LORD` 같은 전체
  대문자 단어는 첫 글자만 대문자로 바꿔(→ `Lord`) 철자 그대로 읽지 않게 했습니다.
  화면에는 절 번호가 그대로 보이고, 오디오만 이어지는 산문으로 들립니다.
  mp3는 24 kHz 모노 · 64 kbps(음성용).

## 다른 책도 뽑으려면

```
node scripts/extract-chapter-texts.mjs --book <bookId> --out tts-text/<bookId>
```

`<bookId>`는 `public/books/index.json`의 `id` 값입니다.
