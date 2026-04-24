import { RoundType } from '../types';

export const DEFAULT_ROUND_TYPES: RoundType[] = [
  {
    id: 'prompt',
    name: 'Hot Seat',
    cardType: 'prompt',
    onlineOnly: false,
    description:
      'Classic liar round. Most players get the main prompt; liar(s) get a similar-but-different prompt and try to blend in with clues.',
    promptStyle: 'Classic liar-style clue prompt with believable overlap.',
    examples: [
      'Truthful players receive: "Name a place you avoid at night."',
      'Liar receives: "Name a place you love at night."'
    ],
    rules: [
      'Most players receive the main prompt',
      'Liar(s) receive a similar-but-different prompt',
      'Answer in ways that can plausibly overlap'
    ]
  },
  {
    id: 'opinion',
    name: 'Truth or Twisted',
    cardType: 'opinion',
    onlineOnly: false,
    description:
      'Everyone gets the same scenario, but liar(s) must argue against what they naturally think to appear convincing.',
    promptStyle: 'Opinion scenario where liar(s) defend a stance opposite their natural take.',
    examples: [
      'Scenario: "Best holiday is silence-only retreat."',
      'Liar task: argue opposite of your real opinion without revealing discomfort.'
    ],
    rules: ['All players see the same scenario', 'Liar(s) must argue against natural instinct', 'Stay convincing under pushback']
  },
  {
    id: 'picture',
    name: 'Flash Frame',
    cardType: 'picture',
    onlineOnly: false,
    description: 'Visual clue round using image-based prompts; players bluff based on what they saw.',
    promptStyle: 'Image clue interpretation and bluffing prompt.',
    examples: [
      'Image clue: blurry carnival photo with hidden mascot.',
      'Liar describes plausible details despite seeing alternate/limited clue.'
    ],
    rules: ['Use image-based clue interpretation', 'Keep responses short and specific', 'Bluff without over-claiming impossible details']
  },
  {
    id: 'grill',
    name: "Grill 'Em",
    cardType: 'grill',
    onlineOnly: false,
    description:
      "AI interrogation round. Players ask questions (mic/text), AI gives short answers, and liar(s) already know the hidden topic and try to steer suspicion.",
    promptStyle: 'Interrogation-focused round with short AI-style answer constraints.',
    examples: [
      'Prompt everyone to ask one tight probing question each.',
      'Liar steers attention using prior hidden-topic knowledge.'
    ],
    rules: ['Questions should be concise', 'Answers are short and direct', 'Liar(s) exploit hidden-topic context']
  },
  {
    id: 'sound',
    name: 'Dodgy Audio',
    cardType: 'sound',
    onlineOnly: true,
    description: 'Audio-based bluffing round where players infer and misdirect from sound clues.',
    promptStyle: 'Sound clue inference and misdirection prompt.',
    examples: [
      'Audio clue: short clip with layered ambient sounds.',
      'Liar explains what they "heard" and nudges suspicion elsewhere.'
    ],
    rules: ['Online-only clue delivery', 'Infer from short audio snippets', 'Use misdirection without impossible claims']
  },
  {
    id: 'video',
    name: 'Clip Trap',
    cardType: 'video',
    onlineOnly: true,
    description: 'Short video clue round designed for fast suspicion and bluffing from brief clips.',
    promptStyle: 'Brief video clue analysis with high-tempo suspicion dynamics.',
    examples: [
      'Video clue: 2-second action cut with one critical detail.',
      'Liar reconstructs the moment while nudging attention away from gaps.'
    ],
    rules: ['Online-only clue delivery', 'Clips are intentionally brief', 'Fast accusation and bluff cadence']
  }
];

export const ROUND_TYPE_ID_SET = new Set(DEFAULT_ROUND_TYPES.map((roundType) => roundType.id));
