export type AppMode = 'dev' | 'online'
export type LoginMode = 'local' | 'wechat'

export const APP_MODE: AppMode = 'dev'

const MODE_CONFIG: Record<AppMode, { apiBase: string; loginMode: LoginMode }> = {
  dev: {
    apiBase: 'http://localhost:8787',
    loginMode: 'local',
  },
  online: {
    apiBase: 'https://www.synclimb.online',
    loginMode: 'wechat',
  },
}

export const API_BASE = MODE_CONFIG[APP_MODE].apiBase
export const LOGIN_MODE = MODE_CONFIG[APP_MODE].loginMode
