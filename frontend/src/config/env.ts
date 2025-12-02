// Environment configuration
export const env = {
  // API Configuration
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  
  // App Configuration
  APP_NAME: import.meta.env.VITE_APP_NAME || 'node drop',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT || 'development',
  
  // Feature Flags
  IS_DEVELOPMENT: import.meta.env.DEV,
  IS_PRODUCTION: import.meta.env.PROD,
  
  // Derived values
  get IS_LOCAL() {
    return this.API_URL.includes('localhost')
  },
  
  get API_BASE_URL() {
    // Always use full API URL (no proxy)
    return `${this.API_URL}/api`
  }
} as const

// Type for environment variables
export type Environment = typeof env

// Export individual values for convenience
export const {
  API_URL,
  APP_NAME,
  APP_VERSION,
  ENVIRONMENT,
  IS_DEVELOPMENT,
  IS_PRODUCTION
} = env
