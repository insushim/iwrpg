// Stable IDs and enumerations — referenced everywhere.

export const TOWN_IDS = [
  'aurora_town',
  'treeshade_town',
  'crimson_fortress',
  'verity_citadel',
  'starhaven',
] as const;

export const HUNTING_GROUND_IDS = [
  'aurora_fields',
  'forgotten_meadow',
  'whisper_woods',
  'sunken_mine',
  'mistwail_marsh',
  'ruined_citadel',
  'ashen_caverns',
  'azure_grove',
  'ruined_temple',
  'pyre_peaks',
  'aether_rift',
  'drakensvale',
] as const;

export const DUNGEON_IDS = [
  'lich_spire',
  'iron_nest',
  'silent_temple',
  'fallen_drake_lair',
] as const;

export const ALL_MAP_IDS = [
  ...TOWN_IDS,
  ...HUNTING_GROUND_IDS,
  ...DUNGEON_IDS,
] as const;

export const STARTING_MAP = 'aurora_town';
export const STARTING_X = 30;
export const STARTING_Y = 36; // moved south off the fountain (fountain at cy=30 in aurora_town)

export const TOPIC_IDS = [
  'school','family','food','animal','body','nature','weather','color','number','time',
  'sports','hobby','emotion','transport','clothes','place','action','character',
  'technology','fairy','daily','science','society','abstract',
] as const;

export const PROFANITY_KO = [
  // Minimal seed; production should integrate a proper filter library.
  '바보','멍청이','미친','죽어','꺼져','시발','병신','새끼',
];
export const PROFANITY_EN = [
  'fuck','shit','bitch','asshole','damn','hell','crap','idiot',
];

export const CHANNEL_NAMES = {
  world: '전체',
  guild: '학급',
  whisper: '귓속말',
  system: '시스템',
} as const;

export const ROLE_LABELS_KO = {
  merchant: '상인',
  blacksmith: '대장장이',
  healer: '치유사',
  questgiver: '의뢰인',
  storyteller: '이야기꾼',
  guard: '경비병',
  innkeeper: '여관 주인',
  banker: '은행원',
  auctioneer: '경매인',
  archmage: '대마법사',
  scholar: '학자',
  gacha_priest: '룬 사제',
  transformer: '변신술사',
} as const;
