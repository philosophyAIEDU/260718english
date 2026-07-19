/*
 * A short, offline English placement quiz. Six multiple-choice questions
 * of rising difficulty (vocabulary + grammar + reading comprehension);
 * the score maps to a level that matches the Library's Beginner /
 * Intermediate / Advanced tags and is fed into the Gemini system prompt
 * so study guides match the learner's level. Runs entirely client-side —
 * no API call, no cost, works offline.
 */

export const LEVEL_TEST_QUESTIONS = [
  {
    prompt: 'She was very ___ after the long trip.',
    options: ['tired', 'tables', 'yesterday', 'quickly'],
    correctIndex: 0,
  },
  {
    prompt: 'Which sentence is correct?',
    options: [
      'He go to school every day.',
      'He goes to school every day.',
      'He going to school every day.',
      'He gone to school every day.',
    ],
    correctIndex: 1,
  },
  {
    prompt: '"The manager was reluctant to approve the budget." Reluctant means:',
    options: ['eager', 'unwilling', 'confused', 'proud'],
    correctIndex: 1,
  },
  {
    prompt:
      'Read: "Although the storm had passed, the streets remained flooded for days, forcing many residents to leave their homes." Why did residents leave?',
    options: [
      'They wanted a vacation.',
      'A new storm was coming.',
      'The flooding did not go away quickly.',
      'The government asked them to move permanently.',
    ],
    correctIndex: 2,
  },
  {
    prompt: '"Her assertion was met with considerable skepticism." Assertion is closest in meaning to:',
    options: ['question', 'statement', 'apology', 'request'],
    correctIndex: 1,
  },
  {
    prompt:
      'Which underlined idea is the MAIN clause in: "Because the evidence was inconclusive, the committee, which had met for six hours, postponed its decision."',
    options: [
      'Because the evidence was inconclusive',
      'which had met for six hours',
      'the committee postponed its decision',
      'the evidence was inconclusive',
    ],
    correctIndex: 2,
  },
];

export const LEVELS = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

/** Map a raw score (0–6) to a level, matching the Library's level tags. */
export function scoreToLevel(correctCount) {
  if (correctCount <= 2) return LEVELS.BEGINNER;
  if (correctCount <= 4) return LEVELS.INTERMEDIATE;
  return LEVELS.ADVANCED;
}

export function scoreAnswers(answerIndices) {
  const correctCount = LEVEL_TEST_QUESTIONS.reduce(
    (sum, q, i) => sum + (answerIndices[i] === q.correctIndex ? 1 : 0),
    0
  );
  return { correctCount, level: scoreToLevel(correctCount) };
}
