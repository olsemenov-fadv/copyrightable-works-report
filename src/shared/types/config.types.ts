/**
 * Application configuration persisted in the database
 */
export interface AppConfig {
  approver: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: AppConfig = {
  approver: "",
};
