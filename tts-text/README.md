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

**라이브러리 19권 전체**가 mp3까지 완성되어 있습니다 (총 589개 챕터).

| 폴더 | 챕터 수 | mp3 | 비트레이트 |
|---|---|---|---|
| `great-lines/` (명대사) | 30 | ✅ | 192 kbps |
| `wizard-of-oz/` | 24 | ✅ | 48 kbps |
| `alice-in-wonderland/` | 12 | ✅ | 48 kbps |
| `secret-garden/` | 27 | ✅ | 48 kbps |
| `anne-of-green-gables/` | 38 | ✅ | 48 kbps |
| `sherlock-holmes/` | 12 | ✅ | 48 kbps |
| `call-of-the-wild/` | 7 | ✅ | 48 kbps |
| `christmas-carol/` | 5 | ✅ | 48 kbps |
| `treasure-island/` | 34 | ✅ | 48 kbps |
| `jekyll-and-hyde/` | 10 | ✅ | 48 kbps |
| `great-gatsby/` | 9 | ✅ | 48 kbps |
| `pride-and-prejudice/` | 61 | ✅ | 48 kbps |
| `frankenstein/` | 24 | ✅ | 48 kbps |
| `genesis/` | 50 | ✅ | 64 kbps |
| `psalms/` | 150 | ✅ | 64 kbps |
| `proverbs/` | 31 | ✅ | 64 kbps |
| `matthew/` | 28 | ✅ | 64 kbps |
| `john/` | 21 | ✅ | 64 kbps |
| `romans/` | 16 | ✅ | 64 kbps |

모두 24 kHz 모노. `public/audio/` 전체 약 1.7 GB.

- `great-lines`: 명대사 + 출처 한 줄(앞의 `—` 제거, `(1865)` → `1865`).
- 성경 6권: 낭독이 자연스럽도록 각 절 앞의 **절 번호를 떼고**, `LORD` 같은
  전체 대문자 단어는 첫 글자만 대문자로(→ `Lord`) 바꿔 철자로 읽히지 않게 했습니다.
  화면에는 절 번호가 그대로 보입니다.
- 고전 원서 12권: 본문 그대로. `--` → 대시, 강조용 전체 대문자 단어만 정규화.

## 다른 책도 뽑으려면

```
node scripts/extract-chapter-texts.mjs --book <bookId> --out tts-text/<bookId>
```

`<bookId>`는 `public/books/index.json`의 `id` 값입니다.
