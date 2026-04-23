/**
 * Preload script for the Electron application
 * This script runs in a sandboxed environment and bridges the main and renderer processes
 */

import { contextBridge, ipcRenderer } from "electron";
import { IpcChannels } from "../shared/constants";
import type {
  GitRepository,
  GetReportParams,
  RepositoryCommitData,
  GitUserConfig,
  GenerateReportParams,
  AddReportToHistoryParams,
  ReportHistoryEntry,
  ReportHistory,
  AppConfig,
  ExportReportParams,
} from "../shared/types";

/**
 * API exposed to the renderer process
 */
export interface ElectronAPI {
  // Dialog operations
  selectDirectory: () => Promise<string | null>;

  // Git operations
  scanForRepositories: (directoryPath: string) => Promise<GitRepository[]>;
  getUserConfig: () => Promise<GitUserConfig>;
  getReport: (params: GetReportParams) => Promise<RepositoryCommitData[]>;

  // Report operations
  generateAndSaveReport: (
    params: GenerateReportParams,
  ) => Promise<ReportHistoryEntry>;
  addReportToHistory: (
    params: AddReportToHistoryParams,
  ) => Promise<ReportHistoryEntry>;
  getReportById: (id: string) => Promise<ReportHistoryEntry | null>;
  createDocumentForReport: (
    id: string,
    approver?: string,
  ) => Promise<ReportHistoryEntry | null>;
  getReportHistory: () => Promise<ReportHistory>;
  downloadReport: (filePath: string, fileName: string) => Promise<boolean>;
  exportReport: (params: ExportReportParams) => Promise<boolean>;
  deleteReport: (id: string) => Promise<boolean>;

  // Config operations
  getConfig: () => Promise<AppConfig>;
  saveConfig: (config: Partial<AppConfig>) => Promise<AppConfig>;
}

// Expose the API to the renderer process
const electronAPI: ElectronAPI = {
  // Dialog operations
  selectDirectory: (): Promise<string | null> =>
    ipcRenderer.invoke(IpcChannels.DIALOG_SELECT_DIRECTORY),

  // Git operations
  scanForRepositories: (directoryPath: string): Promise<GitRepository[]> =>
    ipcRenderer.invoke(IpcChannels.GIT_SCAN_REPOSITORIES, directoryPath),

  getUserConfig: (): Promise<GitUserConfig> =>
    ipcRenderer.invoke(IpcChannels.GIT_GET_USER_CONFIG),

  getReport: (params: GetReportParams): Promise<RepositoryCommitData[]> =>
    ipcRenderer.invoke(IpcChannels.GIT_GET_REPORT, params),

  // Report operations
  generateAndSaveReport: (
    params: GenerateReportParams,
  ): Promise<ReportHistoryEntry> =>
    ipcRenderer.invoke(IpcChannels.REPORT_GENERATE_AND_SAVE, params),

  addReportToHistory: (
    params: AddReportToHistoryParams,
  ): Promise<ReportHistoryEntry> =>
    ipcRenderer.invoke(IpcChannels.REPORT_ADD_TO_HISTORY, params),

  getReportById: (id: string): Promise<ReportHistoryEntry | null> =>
    ipcRenderer.invoke(IpcChannels.REPORT_GET_BY_ID, id),

  createDocumentForReport: (
    id: string,
    approver?: string,
  ): Promise<ReportHistoryEntry | null> =>
    ipcRenderer.invoke(IpcChannels.REPORT_CREATE_DOCUMENT, id, approver),

  getReportHistory: (): Promise<ReportHistory> =>
    ipcRenderer.invoke(IpcChannels.REPORT_GET_HISTORY),

  downloadReport: (filePath: string, fileName: string): Promise<boolean> =>
    ipcRenderer.invoke(IpcChannels.REPORT_DOWNLOAD, filePath, fileName),

  exportReport: (params: ExportReportParams): Promise<boolean> =>
    ipcRenderer.invoke(IpcChannels.REPORT_EXPORT, params),

  deleteReport: (id: string): Promise<boolean> =>
    ipcRenderer.invoke(IpcChannels.REPORT_DELETE, id),

  // Config operations
  getConfig: (): Promise<AppConfig> =>
    ipcRenderer.invoke(IpcChannels.CONFIG_GET),

  saveConfig: (config: Partial<AppConfig>): Promise<AppConfig> =>
    ipcRenderer.invoke(IpcChannels.CONFIG_SAVE, config),
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
