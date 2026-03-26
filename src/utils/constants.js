/** Browser storage keys — single source of truth */
export const STORAGE_KEYS = {
  BOOKINGS: 'ns_bookings',
  USER_META: 'ns_user_meta',
  HOST_LISTINGS: 'ns_host_listings',
  HOST_OPERATIONS: 'ns_host_operations',
  HOST_PROMOS: 'ns_host_promotions',
  PROPERTY_REVIEWS: 'ns_property_reviews',
  IN_APP_NOTIFICATIONS: 'ns_in_app_notifications',
  AUTH_SESSION: 'ns_auth_session',
  PAYMENT_RESUME: 'ns_payment_resume',
  ADMIN_PLATFORM_SETTINGS: 'ns_admin_platform_settings',
  HOST_MESSAGES: 'ns_host_messages',
  DISPUTES: 'ns_disputes',
  CLIENT_ERROR_LOG: 'ns_client_error_log',
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

/** Fixed logins that receive Admin / Owner roles when signing in with these emails */
export const PLATFORM_ROLE_EMAILS = {
  ADMIN: 'admin@sanctum.com',
  OWNER: 'owner@sanctum.com',
}
