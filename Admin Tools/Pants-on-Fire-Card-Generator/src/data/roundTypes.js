export const ROUND_TYPES = {
  prompt: {
    id: 'prompt',
    name: 'Hot Seat',
    tagline: 'Classic clue-slinging. Keep it vague, keep it clean.',
    passThePhoneReady: true,
    onlineOnly: false,
  },
  opinion: {
    id: 'opinion',
    name: 'Truth or Twisted',
    tagline: "Same scenario for everyone. Liars must argue against their own instincts.",
    passThePhoneReady: true,
    onlineOnly: false,
  },
  picture: {
    id: 'picture',
    name: 'Flash Frame',
    tagline: 'A picture paints a thousand lies.',
    passThePhoneReady: true,
    onlineOnly: false,
  },
  grill: {
    id: 'grill',
    name: "Grill 'Em",
    tagline: 'Ask by mic, hear spoken AI answers. Liars know the hidden prompt.',
    passThePhoneReady: true,
    onlineOnly: false,
  },
  sound: {
    id: 'sound',
    name: 'Dodgy Audio',
    tagline: 'Hear it. Bluff it. Survive it.',
    passThePhoneReady: false,
    onlineOnly: true,
  },
  video: {
    id: 'video',
    name: 'Clip Trap',
    tagline: 'A tiny clip. A huge accusation.',
    passThePhoneReady: false,
    onlineOnly: true,
  },
};

export const PASS_THE_PHONE_ROUND_TYPES = Object.values(ROUND_TYPES).filter(
  (roundType) => roundType.passThePhoneReady && !roundType.onlineOnly
);
