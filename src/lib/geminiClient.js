/*
 * Gemini API client.
 *
 * Calls the Google Generative Language REST API directly from the browser
 * with the user's own key — there is no proxy or backend server involved.
 * The key travels only to generativelanguage.googleapis.com.
 */

const MODEL = 'gemini-3.1-flash-lite';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const MAX_RETRIES = 2; // total attempts = 1 + MAX_RETRIES
const BASE_DELAY_MS = 1200;

const SYSTEM_PROMPT = `You are ReadMate, an English reading companion for a learner who studies English books through English only.

You must respond ONLY in English. Do not use any Korean words anywhere. For each vocabulary word, provide both a Collins-style explanatory definition and a Longman-style short synonym list.

The user sends you a photo of one page from an English book. Read the page carefully and produce a study guide as a single JSON object with EXACTLY this shape:

{
  "pageSummary": "A summary of the page in 3-4 sentences of simple, clear English.",
  "keyVocabulary": [
    {
      "word": "the word or expression",
      "partOfSpeech": "noun | verb | adjective | adverb | phrase | idiom",
      "collinsDefinition": "A full-sentence, Collins COBUILD style explanatory definition, e.g. 'If someone is reluctant to do something, they do not really want to do it.'",
      "longmanSynonyms": ["2-3", "short", "synonyms"],
      "exampleFromPage": "A NEW example sentence that YOU write yourself, using the word in a situation similar to the page's context. Do NOT copy any sentence or phrase from the page.",
      "wordFamily": ["related noun/verb/adjective/adverb forms, each labelled, e.g. 'reluctance (noun)'"],
      "collocations": ["1-2 common collocations, e.g. 'reluctant to admit'"],
      "register": "formal | informal | neutral | literary"
    }
  ],
  "sentenceBreakdown": {
    "sentence": "Pick one grammatically complex sentence from the page, then PARAPHRASE it: keep exactly the same grammatical structure, but change the names and wording so no phrase is copied. Write your paraphrased sentence here.",
    "parts": [
      { "text": "the clause or phrase (from your paraphrased sentence)", "label": "main clause | relative clause | adverbial clause | participial phrase | etc.", "explanation": "One short sentence explaining what this part does." }
    ]
  },
  "comprehensionQuestions": [
    { "question": "A question checking understanding of the page.", "answer": "A short model answer in simple English." }
  ],
  "tryThis": "A short writing prompt asking the learner to write 1-2 sentences using some of the key vocabulary."
}

Rules:
- Choose 5 to 8 key vocabulary items that are genuinely useful for an intermediate learner.
- Write 2 or 3 comprehension questions.
- CRITICAL copyright rule — do NOT reproduce ANY text from the page verbatim. Not one sentence, not one phrase. Every string in your response (summary, definitions, examples, the sentence breakdown, questions, answers) must be written entirely in your own words. For the sentence breakdown, paraphrase the sentence you analyze. If you copy from the page, your entire answer will be blocked and the learner gets nothing.
- Every string must be plain English text. No Korean, no romanized Korean, no other languages.
- If the photo is not a readable page of English text, return exactly: {"error": "UNREADABLE_PAGE", "message": "a short English explanation of what went wrong"}.
- Return ONLY the JSON object. No markdown fences, no commentary.`;

export class GeminiError extends Error {
  constructor(message, { status, retryable = false } = {}) {
    super(message);
    this.name = 'GeminiError';
    this.status = status;
    this.retryable = retryable;
  }
}

/**
 * Analyze a book-page photo.
 *
 * @param {string} apiKey        the user's Gemini API key
 * @param {string} imageBase64   raw base64 JPEG payload (no data: prefix)
 * @param {string} mimeType      e.g. "image/jpeg"
 * @param {function} onStatus    optional progress callback (string)
 * @returns {Promise<object>}    the parsed study-guide object
 */
export async function analyzePageImage(apiKey, imageBase64, mimeType, onStatus) {
  return analyzeContent(
    apiKey,
    [
      { inlineData: { mimeType, data: imageBase64 } },
      {
        text: 'Here is a photo of one page from my English book. Please create my study guide following your instructions exactly.',
      },
    ],
    onStatus
  );
}

/**
 * Analyze a page of plain text (used for the built-in public-domain
 * Library, where the page text is already known — no OCR needed).
 *
 * @param {string} apiKey  the user's Gemini API key
 * @param {string} pageText the page's plain text
 * @param {function} onStatus optional progress callback (string)
 * @returns {Promise<object>} the parsed study-guide object
 */
export async function analyzePageText(apiKey, pageText, onStatus) {
  return analyzeContent(
    apiKey,
    [
      {
        text: `Here is one page from my English book:\n\n"""\n${pageText}\n"""\n\nPlease create my study guide following your instructions exactly.`,
      },
    ],
    onStatus
  );
}

async function analyzeContent(apiKey, userParts, onStatus) {
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: userParts }],
    generationConfig: {
      // Higher temperature adds wording variance, which further reduces the
      // chance of the output matching the book text and tripping RECITATION.
      temperature: 0.8,
      // No maxOutputTokens cap: on thinking-capable models the cap is also
      // consumed by internal reasoning tokens, and a low cap can end the
      // response (finishReason MAX_TOKENS) before any visible text is
      // produced — which surfaces as a persistent "empty response".
      responseMimeType: 'application/json',
    },
  };

  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    if (attempt > 0) {
      // Exponential backoff: 1.2s, then 2.4s.
      const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
      onStatus?.(`Retrying (attempt ${attempt + 1} of ${MAX_RETRIES + 1})…`);
      await sleep(delay);
    } else {
      onStatus?.('Sending the page to Gemini…');
    }

    try {
      return await requestOnce(apiKey, body, onStatus);
    } catch (err) {
      lastError = err;
      if (!(err instanceof GeminiError) || !err.retryable) throw err;
    }
  }

  throw lastError;
}

async function requestOnce(apiKey, body, onStatus) {
  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new GeminiError(
      'Network error — check your internet connection and try again.',
      { retryable: true }
    );
  }

  if (!response.ok) {
    const status = response.status;
    let detail = '';
    try {
      const errJson = await response.json();
      detail = errJson?.error?.message || '';
    } catch {
      /* body was not JSON */
    }

    if (status === 400 && /api key/i.test(detail)) {
      throw new GeminiError('The API key was rejected. Please check it on the Settings screen.', { status });
    }
    if (status === 401 || status === 403) {
      throw new GeminiError('This API key is not authorized for the Gemini API. Please check it on the Settings screen.', { status });
    }
    if (status === 429) {
      throw new GeminiError('Rate limit reached. Waiting a moment before retrying…', { status, retryable: true });
    }
    if (status >= 500) {
      throw new GeminiError('The Gemini service had a temporary problem.', { status, retryable: true });
    }
    throw new GeminiError(detail || `Request failed with status ${status}.`, { status });
  }

  onStatus?.('Reading Gemini’s study guide…');

  const json = await response.json();
  const candidate = json?.candidates?.[0];
  // Skip "thought" parts (thinking-capable models may include reasoning
  // summaries alongside the answer) and join the visible text parts.
  const text = (candidate?.content?.parts || [])
    .filter((p) => typeof p.text === 'string' && !p.thought)
    .map((p) => p.text)
    .join('');

  if (!text) {
    const blockReason = json?.promptFeedback?.blockReason;
    if (blockReason) {
      throw new GeminiError(`Gemini declined to analyze this image (${blockReason}). Try a clearer photo of a book page.`);
    }
    const finishReason = candidate?.finishReason;
    if (finishReason === 'MAX_TOKENS') {
      throw new GeminiError(
        'Gemini ran out of space before finishing its answer. Retrying…',
        { retryable: true }
      );
    }
    if (finishReason === 'RECITATION') {
      // The model copied too much of the (copyrighted) book text and was
      // cut off. Retries often succeed because temperature varies the
      // wording; the prompt also instructs the model to paraphrase.
      throw new GeminiError(
        "Gemini's copyright filter stopped this answer because it copied too much of the book. Please tap Analyze again — a retry usually succeeds.",
        { retryable: true }
      );
    }
    if (finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT') {
      throw new GeminiError(
        'Gemini declined to analyze this image. Try a clearer photo showing only the book page.'
      );
    }
    throw new GeminiError(
      `Gemini returned an empty response${finishReason ? ` (${finishReason})` : ''}. Please try again.`,
      { retryable: true }
    );
  }

  const parsed = parseStudyGuide(text);

  if (parsed.error) {
    throw new GeminiError(parsed.message || 'The photo could not be read as a page of English text.');
  }

  return normalizeStudyGuide(parsed);
}

/** Parse the model output, tolerating stray markdown fences. */
function parseStudyGuide(text) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    // Last resort: extract the outermost JSON object.
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    throw new GeminiError('Could not parse the study guide from Gemini. Please try again.', { retryable: true });
  }
}

/** Fill in any missing fields so the UI never renders undefined. */
function normalizeStudyGuide(raw) {
  return {
    pageSummary: raw.pageSummary || '',
    keyVocabulary: (raw.keyVocabulary || []).map((v) => ({
      word: v.word || '',
      partOfSpeech: v.partOfSpeech || '',
      collinsDefinition: v.collinsDefinition || '',
      longmanSynonyms: Array.isArray(v.longmanSynonyms) ? v.longmanSynonyms : [],
      exampleFromPage: v.exampleFromPage || '',
      wordFamily: Array.isArray(v.wordFamily) ? v.wordFamily : [],
      collocations: Array.isArray(v.collocations) ? v.collocations : [],
      register: (v.register || 'neutral').toLowerCase(),
    })),
    sentenceBreakdown: raw.sentenceBreakdown
      ? {
          sentence: raw.sentenceBreakdown.sentence || '',
          parts: (raw.sentenceBreakdown.parts || []).map((p) => ({
            text: p.text || '',
            label: p.label || '',
            explanation: p.explanation || '',
          })),
        }
      : null,
    comprehensionQuestions: (raw.comprehensionQuestions || []).map((q) => ({
      question: q.question || '',
      answer: q.answer || '',
    })),
    tryThis: raw.tryThis || '',
    analyzedAt: new Date().toISOString(),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
