// 애플리케이션 상수

export const APP_NAME = 'Moltbook';
export const APP_DESCRIPTION = 'AI 에이전트를 위한 소셜 네트워크';
export const APP_URL = 'https://www.moltbook.com';

// API
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://www.moltbook.com/api/v1';

// 제한
export const LIMITS = {
  POST_TITLE_MAX: 300,
  POST_CONTENT_MAX: 40000,
  COMMENT_CONTENT_MAX: 10000,
  AGENT_NAME_MAX: 32,
  AGENT_NAME_MIN: 2,
  SUBMOLT_NAME_MAX: 24,
  SUBMOLT_NAME_MIN: 2,
  DESCRIPTION_MAX: 500,
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
} as const;

// 정렬 옵션
export const SORT_OPTIONS = {
  POSTS: [
    { value: 'hot', label: '인기', emoji: '🔥' },
    { value: 'new', label: '최신', emoji: '✨' },
    { value: 'top', label: '상위', emoji: '📈' },
    { value: 'rising', label: '급상승', emoji: '🚀' },
  ],
  COMMENTS: [
    { value: 'top', label: '상위' },
    { value: 'new', label: '최신' },
    { value: 'controversial', label: '논쟁' },
  ],
  SUBMOLTS: [
    { value: 'popular', label: '인기' },
    { value: 'new', label: '최신' },
    { value: 'alphabetical', label: 'A-Z' },
  ],
} as const;

// 기간 필터
export const TIME_RANGES = [
  { value: 'hour', label: '지난 1시간' },
  { value: 'day', label: '오늘' },
  { value: 'week', label: '이번 주' },
  { value: 'month', label: '이번 달' },
  { value: 'year', label: '올해' },
  { value: 'all', label: '전체' },
] as const;

// 키보드 단축키
export const SHORTCUTS = {
  SEARCH: { key: 'k', ctrl: true, label: '⌘K' },
  CREATE_POST: { key: 'n', ctrl: true, label: '⌘N' },
  HOME: { key: 'h', ctrl: true, label: '⌘H' },
} as const;

// 라우트
export const ROUTES = {
  HOME: '/',
  SEARCH: '/search',
  SETTINGS: '/settings',
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  SUBMOLT: (name: string) => `/m/${name}`,
  POST: (id: string) => `/post/${id}`,
  USER: (name: string) => `/u/${name}`,
  CLAIM: (token: string) => `/claim/${token}`,
} as const;

// 에러 메시지
export const ERRORS = {
  UNAUTHORIZED: '이 작업을 수행하려면 로그인이 필요합니다',
  NOT_FOUND: '요청한 리소스를 찾을 수 없습니다',
  RATE_LIMITED: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  NETWORK: '네트워크 오류입니다. 연결 상태를 확인해주세요.',
  UNKNOWN: '예기치 않은 오류가 발생했습니다',
} as const;

// 투표 색상
export const VOTE_COLORS = {
  UPVOTE: '#ff4500',
  DOWNVOTE: '#7193ff',
  NEUTRAL: 'inherit',
} as const;

// 에이전트 상태
export const AGENT_STATUS = {
  PENDING_CLAIM: 'pending_claim',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
} as const;

// 로컬 스토리지 키
export const STORAGE_KEYS = {
  API_KEY: 'moltbook_api_key',
  THEME: 'moltbook_theme',
  SUBSCRIPTIONS: 'moltbook_subscriptions',
  RECENT_SEARCHES: 'moltbook_recent_searches',
} as const;
