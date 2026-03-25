/** Browser storage keys — single source of truth */
export const STORAGE_KEYS = {
  BOOKINGS: 'ns_bookings',
  USER_META: 'ns_user_meta',
  HOST_LISTINGS: 'ns_host_listings',
  AUTH_SESSION: 'ns_auth_session',
  PAYMENT_RESUME: 'ns_payment_resume',
  ADMIN_MOCK_APP_STATUS: 'ns_admin_mock_app_status',
  ADMIN_PLATFORM_SETTINGS: 'ns_admin_platform_settings',
}

export const ROUTES = {
  HOME: '/',
  PROPERTIES: '/properties',
  PROPERTY: id => `/property/${id}`,
  PAYMENT: '/payment',
  LOGIN: '/login',
  SIGNUP: '/signup',
  OWNER: '/owner',
  ADMIN: '/admin',
  BOOKINGS: '/bookings',
  LIST: '/list',
  ABOUT: '/about',
  HELP: '/help',
  COOKIES: '/cookies',
}

export const DEMO_EMAILS = {
  ADMIN: 'admin@sanctum.com',
  OWNER: 'owner@sanctum.com',
}
