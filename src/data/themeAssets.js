export const THEME_ASSETS = {
  Default: {
    characterCard: '/assets/themes/default/characters/presenter.png',
    iconSheet: '/assets/themes/default/icons/icons-sheet.png',
    uiBanner: '/assets/themes/default/ui/banner.png',
  },
  Gangsters: {
    characterCard: '/assets/themes/gangsters/characters/presenter.png',
    iconSheet: '/assets/themes/gangsters/icons/icons-sheet.png',
    uiBanner: '/assets/themes/gangsters/ui/banner.png',
  },
  Monsters: {
    characterCard: '/assets/themes/monsters/characters/presenter.png',
    iconSheet: '/assets/themes/monsters/icons/icons-sheet.png',
    uiBanner: '/assets/themes/monsters/ui/banner.png',
  },
  'Rock Stars': {
    characterCard: '/assets/themes/rock-stars/characters/presenter.png',
    iconSheet: '/assets/themes/rock-stars/icons/icons-sheet.png',
    uiBanner: '/assets/themes/rock-stars/ui/banner.png',
  },
  Aliens: {
    characterCard: '/assets/themes/aliens/characters/presenter.png',
    iconSheet: '/assets/themes/aliens/icons/icons-sheet.png',
    uiBanner: '/assets/themes/aliens/ui/banner.png',
  },
  Royalty: {
    characterCard: '/assets/themes/royalty/characters/presenter.png',
    iconSheet: '/assets/themes/royalty/icons/icons-sheet.png',
    uiBanner: '/assets/themes/royalty/ui/banner.png',
  },
  Medical: {
    characterCard: '/assets/themes/medical/characters/presenter.png',
    iconSheet: '/assets/themes/medical/icons/icons-sheet.png',
    uiBanner: '/assets/themes/medical/ui/banner.png',
  },
  Wrestlers: {
    characterCard: '/assets/themes/wrestlers/characters/presenter.png',
    iconSheet: '/assets/themes/wrestlers/icons/icons-sheet.png',
    uiBanner: '/assets/themes/wrestlers/ui/banner.png',
  },
  GrillEm: {
    characterCard: '/assets/themes/grillem/characters/presenter.png',
    iconSheet: '/assets/themes/grillem/icons/icons-sheet.png',
    uiBanner: '/assets/themes/grillem/ui/banner.png',
  },
};

export function getThemeAssets(themeName = 'Default') {
  return THEME_ASSETS[themeName] || THEME_ASSETS.Default;
}
