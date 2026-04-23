import { ipcMain } from "electron";
import { IpcChannels } from "../../../shared/constants";
import type { AppConfig } from "../../../shared/types";
import { configService } from "../../services";

/**
 * Registers Config-related IPC handlers
 */
export function registerConfigHandlers(): void {
  // Get config
  ipcMain.handle(IpcChannels.CONFIG_GET, async (): Promise<AppConfig> => {
    try {
      return configService.getConfig();
    } catch (error) {
      console.error("Error getting config:", error);
      throw error;
    }
  });

  // Save config
  ipcMain.handle(
    IpcChannels.CONFIG_SAVE,
    async (_event, config: Partial<AppConfig>): Promise<AppConfig> => {
      try {
        return configService.saveConfig(config);
      } catch (error) {
        console.error("Error saving config:", error);
        throw error;
      }
    },
  );
}
