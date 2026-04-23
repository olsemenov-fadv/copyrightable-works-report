import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "node:path";
import { app } from "electron";
import type { AppConfig } from "../../shared/types/config.types";
import { DEFAULT_CONFIG } from "../../shared/types/config.types";

/**
 * Service responsible for persisting application configuration
 */
export class ConfigService {
  private _configPath: string | null = null;

  private get configPath(): string {
    if (!this._configPath) {
      this._configPath = path.join(app.getPath("userData"), "app-config.json");
    }
    return this._configPath;
  }

  /**
   * Gets the current configuration
   */
  getConfig(): AppConfig {
    if (!existsSync(this.configPath)) {
      return { ...DEFAULT_CONFIG };
    }

    try {
      const data = readFileSync(this.configPath, "utf-8");
      const config = JSON.parse(data) as Partial<AppConfig>;
      return { ...DEFAULT_CONFIG, ...config };
    } catch (error) {
      console.error("Error reading config:", error);
      return { ...DEFAULT_CONFIG };
    }
  }

  /**
   * Saves the configuration
   */
  saveConfig(config: Partial<AppConfig>): AppConfig {
    const currentConfig = this.getConfig();
    const newConfig = { ...currentConfig, ...config };

    try {
      writeFileSync(this.configPath, JSON.stringify(newConfig, null, 2));
    } catch (error) {
      console.error("Error saving config:", error);
    }

    return newConfig;
  }
}

// Export singleton instance
export const configService = new ConfigService();
