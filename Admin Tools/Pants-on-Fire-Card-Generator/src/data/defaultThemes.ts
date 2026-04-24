import { Theme } from '../types';

export const DEFAULT_THEMES: Theme[] = [
  {
    id: 'pirates',
    name: 'Pirates',
    palette: ['#3a1d0f', '#ad6a2b', '#e5bf74', '#0f1f26'],
    motifs: ['treasure maps', 'anchors', 'skulls', 'captain hats'],
    borderMotifs: ['rope corners', 'compass roses', 'gold rivets'],
    avoid: ['real-world violence', 'modern guns']
  },
  {
    id: 'victorian',
    name: 'Victorian',
    palette: ['#2d2035', '#7b5f8f', '#d7c3a5', '#3f2f2a'],
    motifs: ['lace', 'pocket watches', 'foggy lamps', 'ornate frames'],
    borderMotifs: ['filigree flourishes', 'clock gears', 'tea rose corners'],
    avoid: ['industrial grime', 'photorealism']
  },
  {
    id: 'spy-vs-spy',
    name: 'Spy vs Spy',
    palette: ['#0a0a0a', '#ffffff', '#e63b2e', '#35f4b6'],
    motifs: ['gadget briefcases', 'lasers', 'silhouettes', 'code screens'],
    borderMotifs: ['warning stripes', 'spy icons', 'crosshair dots'],
    avoid: ['military realism', 'war propaganda']
  },
  {
    id: 'cowboys',
    name: 'Cowboys',
    palette: ['#8b4f2f', '#d49358', '#f4d9a7', '#5a3220'],
    motifs: ['lassos', 'boots', 'hats', 'wanted posters'],
    borderMotifs: ['stitched leather', 'horseshoes', 'cactus ticks'],
    avoid: ['graphic weapon focus']
  },
  {
    id: 'gangsters',
    name: 'Gangsters',
    palette: ['#1e1f27', '#dfb978', '#b83131', '#f6f0d0'],
    motifs: ['pinstripes', 'fedora hats', 'speakeasy signs', 'dice'],
    borderMotifs: ['art deco corners', 'gold trim', 'city silhouettes'],
    avoid: ['real criminal groups']
  },
  {
    id: 'ghouls-and-ghosts',
    name: 'Ghouls and Ghosts',
    palette: ['#151028', '#6a4de3', '#8ff8f2', '#fefefe'],
    motifs: ['specters', 'haunted lanterns', 'mist swirls', 'gravestones'],
    borderMotifs: ['ectoplasm drips', 'moon glyphs', 'spooky curls'],
    avoid: ['gore', 'body horror']
  },
  {
    id: 'rock-stars',
    name: 'Rock Stars',
    palette: ['#131313', '#ff2f6f', '#ffd74a', '#48f0ff'],
    motifs: ['amps', 'electric guitars', 'stage lights', 'glitter'],
    borderMotifs: ['sound waves', 'starbursts', 'neon tape'],
    avoid: ['real artist likenesses']
  },
  {
    id: 'raf-airforce',
    name: 'RAF / Airforce',
    palette: ['#0f2d4a', '#4f7ea8', '#d2e8f6', '#f5b942'],
    motifs: ['vintage wings', 'flight badges', 'propellers', 'cloud icons'],
    borderMotifs: ['wing rivets', 'altimeter marks', 'flight paths'],
    avoid: ['active warfare scenes']
  },
  {
    id: 'drag-queens',
    name: 'Drag Queens',
    palette: ['#2d053d', '#ff3bbd', '#9eff35', '#ffc93a'],
    motifs: ['sequins', 'spotlights', 'heels', 'crowns'],
    borderMotifs: ['glam curls', 'gem studs', 'confetti arcs'],
    avoid: ['harmful stereotypes']
  },
  {
    id: 'superheroes',
    name: 'Superheroes',
    palette: ['#081a5c', '#e7332b', '#f5dd45', '#4df6ff'],
    motifs: ['cape swishes', 'energy blasts', 'city emblems', 'hero badges'],
    borderMotifs: ['comic halftones', 'speed lines', 'shield corners'],
    avoid: ['licensed character copies']
  },
  {
    id: 'sci-fi',
    name: 'Sci Fi',
    palette: ['#020913', '#1e4ef5', '#29f8d8', '#e8f7ff'],
    motifs: ['holograms', 'circuits', 'robots', 'star maps'],
    borderMotifs: ['circuit traces', 'hex grids', 'neon dials'],
    avoid: ['hard realism backgrounds']
  },
  {
    id: 'doctors-and-nurses',
    name: 'Doctors and Nurses',
    palette: ['#f6fbff', '#58b7ff', '#ff5b6b', '#32586b'],
    motifs: ['stethoscopes', 'pill icons', 'clipboards', 'medical bags'],
    borderMotifs: ['heartbeat lines', 'cross icons', 'sterile tabs'],
    avoid: ['real injuries', 'medical trauma']
  },
  {
    id: 'royalty',
    name: 'Royalty',
    palette: ['#2e114a', '#a67bf5', '#f8df8e', '#f8f2e6'],
    motifs: ['crowns', 'scepters', 'velvet banners', 'castle sigils'],
    borderMotifs: ['gold filigree', 'jewel settings', 'heraldic seals'],
    avoid: ['historical hate symbols']
  },
  {
    id: 'wrestling',
    name: 'Wrestling',
    palette: ['#191919', '#f92f2f', '#ffe24f', '#40f7ff'],
    motifs: ['rings', 'championship belts', 'foam fingers', 'spotlights'],
    borderMotifs: ['rope corners', 'impact bursts', 'belt studs'],
    avoid: ['graphic injury scenes']
  }
];
