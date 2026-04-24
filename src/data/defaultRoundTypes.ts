import { RoundType } from '../types';

export const DEFAULT_ROUND_TYPES: RoundType[] = [
  {
    id: 'bluff-round',
    name: 'Bluff Round',
    description: 'Players present confident lies as believable truths.',
    promptStyle: 'Give a bold claim that sounds true at first glance.',
    examples: [
      'Convince everyone you once met a pirate dentist in Croydon.',
      'Claim you can identify any biscuit brand by smell alone.'
    ],
    rules: ['Speak confidently', 'Keep statement short', 'No impossible magic claims']
  },
  {
    id: 'truth-round',
    name: 'Truth Round',
    description: 'Players share a likely true statement while bluffers dodge details.',
    promptStyle: 'State a plausible truth with one memorable detail.',
    examples: [
      'Describe a real life mishap involving shoes.',
      'Share a genuine skill nobody expects from you.'
    ],
    rules: ['Use believable detail', 'No over-explaining', 'Stay concise']
  },
  {
    id: 'quickfire-round',
    name: 'Quickfire Round',
    description: 'Fast one-liners under pressure.',
    promptStyle: 'Produce rapid punchline-style responses.',
    examples: [
      'Name the worst superhero side-hustle in under five words.',
      'Pitch a cursed breakfast in one sentence.'
    ],
    rules: ['Keep it snappy', 'One line only', 'Avoid rambling']
  },
  {
    id: 'story-round',
    name: 'Story Round',
    description: 'Short narrative setup with twist potential.',
    promptStyle: 'Tell a mini story with setup and a twist ending.',
    examples: [
      'Tell a 2-line tale about a haunted vending machine.',
      'Narrate a failed disguise mission at a wedding.'
    ],
    rules: ['Max two lines', 'Must include twist', 'Stay in theme']
  },
  {
    id: 'accusation-round',
    name: 'Accusation Round',
    description: 'Players call out suspicious behavior with flair.',
    promptStyle: 'Make a dramatic accusation grounded in observations.',
    examples: [
      'Accuse someone of being the snack thief with one odd clue.',
      'Point at the likely liar using theatrical language.'
    ],
    rules: ['No direct personal attacks', 'Focus on game clues', 'Be dramatic not cruel']
  },
  {
    id: 'confession-round',
    name: 'Confession Round',
    description: 'Fake or real confessions that sound suspiciously honest.',
    promptStyle: 'Deliver a confession that feels believable yet chaotic.',
    examples: [
      'Confess to a ridiculous social mistake at a party.',
      'Admit to a harmless habit nobody would expect.'
    ],
    rules: ['No illegal instruction', 'Keep it playful', 'Avoid harmful admissions']
  },
  {
    id: 'challenge-round',
    name: 'Challenge Round',
    description: 'Players set tiny dares or challenge statements.',
    promptStyle: 'Issue a harmless challenge with comic stakes.',
    examples: [
      'Challenge someone to explain pineapple pizza like a lawyer.',
      'Dare the table to name a villainous pet hamster.'
    ],
    rules: ['Harmless only', 'No physical risk', 'Keep challenge verbal']
  },
  {
    id: 'chaos-round',
    name: 'Chaos Round',
    description: 'High-energy absurdity while remaining playable.',
    promptStyle: 'Generate bizarre but readable chaos prompts.',
    examples: [
      'Pitch a disco-themed emergency plan in one line.',
      'Describe a cursed office ritual everyone follows.'
    ],
    rules: ['Readable sentence', 'No hate speech', 'Keep it party-safe']
  },
  {
    id: 'wildcard-round',
    name: 'Wildcard Round',
    description: 'Flexible hybrid structure using one selected style.',
    promptStyle: 'Blend bluff, confession, and quickfire tones in a single punchy line.',
    examples: [
      'Confidently confess to inventing a fake holiday and dare others to celebrate it.',
      'Drop one absurd claim and one defensive comeback in the same sentence.'
    ],
    rules: ['One concise line', 'Stay game-safe', 'Keep structure clear']
  }
];

export const ROUND_TYPE_ID_SET = new Set(DEFAULT_ROUND_TYPES.map((roundType) => roundType.id));
