import type { AppConfig } from "../../shared/types/config.types";
import { DEFAULT_CONFIG } from "../../shared/types/config.types";
import { databaseService } from "./database.service";

/**
 * Service responsible for persisting application configuration.
 * Backed by the SQLite database (key-value store in the `config` table).
 */
export class ConfigService {
  /**
   * Gets the current configuration
   */
  getConfig(): AppConfig {
    try {
      const approver =
        databaseService.getConfigValue("approver") ?? DEFAULT_CONFIG.approver;
      return { approver };
    } catch (error) {
      console.error("Error reading config:", error);
      return { ...DEFAULT_CONFIG };
    }
  }

  /**
   * Saves a partial configuration (merges with existing values)
   */
  saveConfig(config: Partial<AppConfig>): AppConfig {
    try {
      if (config.approver !== undefined) {
        databaseService.setConfigValue("approver", config.approver);
      }
    } catch (error) {
      console.error("Error saving config:", error);
    }
    return this.getConfig();
  }
}

// Export singleton instance
export const configService = new ConfigService();
