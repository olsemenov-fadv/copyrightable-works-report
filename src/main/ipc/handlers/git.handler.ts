import { ipcMain } from "electron";
import { IpcChannels } from "../../../shared/constants";
import type {
  GetReportParams,
  GitRepository,
  RepositoryCommitData,
  GitUserConfig,
} from "../../../shared/types";
import { fileService, gitService } from "../../services";

/**
 * Registers Git-related IPC handlers
 */
export function registerGitHandlers(): void {
  // Scan for repositories
  ipcMain.handle(
    IpcChannels.GIT_SCAN_REPOSITORIES,
    async (_event, directoryPath: string): Promise<GitRepository[]> => {
      try {
        return await fileService.scanForRepositories(directoryPath);
      } catch (error) {
        console.error("Error scanning for repositories:", error);
        throw error;
      }
    },
  );

  // Get user's git config
  ipcMain.handle(
    IpcChannels.GIT_GET_USER_CONFIG,
    async (): Promise<GitUserConfig> => {
      try {
        return await gitService.getUserConfig();
      } catch (error) {
        console.error("Error getting git user config:", error);
        throw error;
      }
    },
  );

  // Get report data
  ipcMain.handle(
    IpcChannels.GIT_GET_REPORT,
    async (
      _event,
      params: GetReportParams,
    ): Promise<RepositoryCommitData[]> => {
      try {
        return await gitService.getRepositoriesData(params);
      } catch (error) {
        console.error("Error getting report:", error);
        throw error;
      }
    },
  );
}
