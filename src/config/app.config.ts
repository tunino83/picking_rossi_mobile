// Application Configuration
export const APP_CONFIG = {
  // API Configuration
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://10.90.1.5:3001/api',

  // Use dummy server for development/testing
  USE_DUMMY_SERVER: false , //import.meta.env.VITE_USE_DUMMY_SERVER !== 'false', // Default to true for easier testing
  DUMMY_API_BASE_URL: import.meta.env.VITE_DUMMY_API_BASE_URL || 'http://10.90.1.5:3002/api',

  // Authentication Configuration
  ENABLE_2FA: import.meta.env.VITE_ENABLE_2FA === 'true', // Default disabled for easier testing
  
  // App Information
  APP_NAME: 'ROSSI Warehouse Picking System',
  APP_VERSION: '1.0.0',
  
  // Development flags
  DEBUG_MODE: import.meta.env.DEV || false,
  
  // Feature flags
  FEATURES: {
    USER_MANAGEMENT: true,
    PRODUCT_MANAGEMENT: true,
    ORDER_MANAGEMENT: true,
    ANALYTICS: true,
    SETTINGS: true,
  }
};

// Get the appropriate API base URL based on configuration
export const getApiBaseUrl = () => {
  return APP_CONFIG.USE_DUMMY_SERVER 
    ? APP_CONFIG.DUMMY_API_BASE_URL 
    : APP_CONFIG.API_BASE_URL;
};

// Log configuration in development
if (APP_CONFIG.DEBUG_MODE) {
  console.log('🔧 App Configuration:', {
    apiUrl: getApiBaseUrl(),
    useDummyServer: APP_CONFIG.USE_DUMMY_SERVER,
    enable2FA: APP_CONFIG.ENABLE_2FA,
    features: APP_CONFIG.FEATURES
  });
}