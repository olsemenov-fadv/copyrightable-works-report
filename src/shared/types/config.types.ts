import type { GitRepository } from "./git.types";

/**
 * Saved repository (without selected state)
 */
export interface SavedRepository {
  name: string;
  path: string;
}

/**
 * Application configuration that gets persisted
 */
export interface AppConfig {
  approver: string;
  sinceDate?: string;
  repositories: SavedRepository[];
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: AppConfig = {
  approver: "",
  repositories: [],
};
