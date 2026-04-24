function buildPool(a, b, limit = 50, joiner = ' ') {
  const out = [];
  for (const first of a) {
    for (const second of b) {
      out.push(`${first}${joiner}${second}`.trim());
      if (out.length >= limit) return out;
    }
  }
  return out;
}

function ensureMinSize(pool, min = 50, fallback = []) {
  if (pool.length >= min) return pool;
  const merged = [...pool];
  for (const candidate of fallback) {
    if (!merged.includes(candidate)) merged.push(candidate);
    if (merged.length >= min) break;
  }
  return merged;
}

export const NAME_POOLS = {
  Default: buildPool(
    ['Captain', 'Disco', 'Nacho', 'Professor', 'Laser', 'Captain', 'Bubble', 'Waffle', 'Turbo', 'Banana', 'Goblin', 'Doctor', 'Pixel', 'Funky', 'Mystic', 'Sassy', 'Ninja', 'Chaotic', 'Cosmic', 'Mega'],
    ['Pants', 'McGiggles', 'Thunderbiscuit', 'Von Drama', 'Snorkel', 'Fluff', 'BoomBoom', 'Pickle', 'Sparkles', 'Wobble', 'McNugget', 'Beep', 'Fizz', 'Nope', 'Chaos', 'Bananas', 'Whistle', 'Wiggles', 'McSauce', 'Jellybean'],
    100
  ),
  Pirates: ensureMinSize(buildPool(['Captain', 'Salty', 'Barnacle', 'Pegleg', 'Scurvy', 'Mad', 'Cutlass', 'Blacktooth', 'Rumbeard', 'One-Eyed', 'Kraken', 'Buccaneer'], ['Jack', 'Babs', 'Bill', 'Pam', 'Barry', 'Mollie', 'Ron', 'Cathy', 'Gus', 'Ollie', 'Nibs', 'Bones'], 60)),
  Victorian: ensureMinSize(buildPool(['Lord', 'Lady', 'Sir', 'Miss', 'Baron', 'Duchess', 'Professor', 'Mrs', 'General', 'Archibald', 'Countess', 'Reverend'], ['Butterworth', 'Widdershins', 'Crump', 'Puddleton', 'Thistlewick', 'Marigold', 'Chumley', 'Dithersby', 'Puffleton', 'Snoot', 'Bumbershoot', 'Fitzwhistle'], 60)),
  Spies: ensureMinSize(buildPool(['Agent', 'Cipher', 'Shadow', 'Nova', 'Whisper', 'Ghost', 'Zero', 'Velvet', 'Ivy', 'Echo', 'Phantom', 'Onyx'], ['Black', 'Knox', 'Vane', 'Wire', 'Pike', 'Mercer', 'Code', 'Reed', 'Static', 'Malone', 'Switch', 'Locke'], 60)),
  Cowboys: ensureMinSize(buildPool(['Dusty', 'Calamity', 'Buckshot', 'Cactus', 'Trigger', 'Whiskey', 'Rattlesnake', 'Prairie', 'Lasso', 'Sheriff', 'Bandit', 'Tumbleweed'], ['Dan', 'Jo', 'Benny', 'Kate', 'Tess', 'Wade', 'Ray', 'June', 'Lou', 'Skip', 'Mae', 'Bo'], 60)),
  Gangsters: ensureMinSize(buildPool(['Tony', 'Big', 'Vinny', 'Sal', 'Lucky', 'Frankie', 'Mickey', 'Johnny', 'Donny', 'Rico', 'Joey', 'Benny'], ['Two-Times', 'the Knife', 'the Rat', 'No Nose', 'Brass', 'the Mouth', 'Tight Lips', 'the Ghost', 'Bags', 'the Fixer', 'Long Coat', 'Quick Hands'], 60)),
  Monsters: ensureMinSize(buildPool(['Count', 'Ghoul', 'Fang', 'Mummy', 'Banshee', 'Sludge', 'Rotfang', 'Howler', 'Creep', 'Bog', 'Crypt', 'Witch'], ['Dracula', 'Maw', 'Nora', 'Bones', 'Stitch', 'Rot', 'Wailer', 'Claw', 'Tooth', 'Lurker', 'Mire', 'Hex'], 60)),
  'Rock Stars': ensureMinSize(buildPool(['Riff', 'Axel', 'Crash', 'Neon', 'Jett', 'Razor', 'Blaze', 'Echo', 'Spike', 'Storm', 'Vinyl', 'Solo'], ['Voltage', 'Vandal', 'Starlight', 'Riot', 'Hammer', 'Screamer', 'Static', 'Wild', 'Feedback', 'Thunder', 'Overdrive', 'Backbeat'], 60)),
  'Flying Squad': ensureMinSize(buildPool(['Wing', 'Flight', 'Squadron', 'Ace', 'Falcon', 'Spitfire', 'Tempest', 'Lancaster', 'Radar', 'Maverick', 'Comet', 'Striker'], ['Leader', 'Fox', 'Bishop', 'Hawk', 'Jones', 'Clarke', 'Viper', 'King', 'Arrow', 'Rook', 'Blaze', 'Stone'], 60)),
  'Drag Queens': ensureMinSize(buildPool(['Miss', 'Lady', 'Velvet', 'Crystal', 'Sasha', 'Cherry', 'Diva', 'Electra', 'Glam', 'Lola', 'Paris', 'Nova'], ['Devine', 'St. James', 'Fierce', 'Deluxe', 'LaRue', 'Lips', 'Fantasia', 'Sparkle', 'Monroe', 'Velour', 'Sensation', 'Supreme'], 60)),
  Superheroes: ensureMinSize(buildPool(['Captain', 'Mega', 'Ultra', 'Shadow', 'Star', 'Iron', 'Cosmic', 'Mighty', 'Turbo', 'Thunder', 'Quantum', 'Nova'], ['Nova', 'Shield', 'Blaze', 'Bolt', 'Falcon', 'Comet', 'Titan', 'Pulse', 'Vortex', 'Phantom', 'Sentinel', 'Burst'], 60)),
  Aliens: ensureMinSize(buildPool(['Zor', 'Xan', 'Glip', 'Vrax', 'Qor', 'Nebu', 'Kly', 'Orbi', 'Zyn', 'Ryl', 'Prax', 'Mork'], ['thar', 'bix', 'nox', 'dari', 'quon', 'miri', 'vex', 'lume', 'zar', 'trix', 'plex', 'zon'], 60, '-')),
  Medical: ensureMinSize(buildPool(['Dr', 'Nurse', 'Consultant', 'Matron', 'Paramedic', 'Surgeon', 'Registrar', 'Porter', 'Professor', 'Medic', 'Therapist', 'Midwife'], ['Payne', 'Stitches', 'Murphy', 'Grey', 'Bones', 'Hart', 'Swift', 'Stone', 'Wells', 'Bloom', 'Scalpel', 'Pulse'], 60)),
  Royalty: ensureMinSize(buildPool(['King', 'Queen', 'Prince', 'Princess', 'Duke', 'Duchess', 'Baron', 'Baroness', 'Lord', 'Lady', 'Regent', 'Count'], ['Aurelius', 'Beatrice', 'Cedric', 'Evangeline', 'Montrose', 'Windsor', 'Thorne', 'Valmont', 'Rosemere', 'Ashbury', 'Goldcrest', 'Ivoryhall'], 60)),
  Wrestlers: ensureMinSize(buildPool(['The', 'Big', 'Stone', 'Mad', 'Raging', 'Iron', 'Savage', 'Dirty', 'Neon', 'Steel', 'Bone', 'Ultra'], ['Crusher', 'Slammer', 'Viper', 'Hammer', 'Dropkick', 'Destroyer', 'Titan', 'Ripper', 'Bulldog', 'Renegade', 'Suplex', 'PileDriver'], 60)),
};

function validateNamePools() {
  const MIN_DEFAULT = 100;
  const MIN_THEME = 50;
  const issues = [];

  const defaultCount = (NAME_POOLS.Default || []).length;
  if (defaultCount < MIN_DEFAULT) {
    issues.push(`Default has ${defaultCount} names (needs ${MIN_DEFAULT}).`);
  }

  for (const [theme, names] of Object.entries(NAME_POOLS)) {
    if (theme === 'Default') continue;
    if ((names || []).length < MIN_THEME) {
      issues.push(`${theme} has ${(names || []).length} names (needs ${MIN_THEME}).`);
    }
  }

  if (issues.length && typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(`[Pants on Fire] Name pool validation failed:\n- ${issues.join('\n- ')}`);
  }
}

validateNamePools();

export function randomNameFromTheme(theme, exclude = []) {
  const pool = NAME_POOLS[theme] || NAME_POOLS.Default;
  const blockedTokens = new Set(
    (exclude || [])
      .flatMap((name) => String(name || '').toLowerCase().split(/[^a-z0-9]+/g))
      .filter(Boolean)
  );

  // Prefer names that do not reuse any token from already-assigned names.
  const tokenFiltered = pool.filter((candidate) => {
    const tokens = String(candidate).toLowerCase().split(/[^a-z0-9]+/g).filter(Boolean);
    return tokens.length > 0 && !tokens.some((token) => blockedTokens.has(token));
  });

  const exactFiltered = pool.filter((name) => !exclude.includes(name));
  const selectionPool = tokenFiltered.length ? tokenFiltered : (exactFiltered.length ? exactFiltered : pool);
  return selectionPool[Math.floor(Math.random() * selectionPool.length)] || pool[0];
}
