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
  GithubUserInfo,
  GithubOrg,
  GithubRepo,
  GithubGetReportParams,
  GenerateReportParams,
  AddReportToHistoryParams,
  ReportHistoryEntry,
  ReportHistory,
  AppConfig,
  ExportReportParams,
  GithubRepository,
} from "../shared/types";

/**
 * API exposed to the renderer process
 */
export interface ElectronAPI {
  // Dialog operations
  selectDirectory: () => Promise<string | null>;
  openExternal: (url: string) => Promise<void>;

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

  // GitHub operations
  /** Validate PAT, encrypt+store, fetch+cache orgs. Returns user + org list. */
  saveGithubPat: (
    pat: string,
  ) => Promise<{ user: GithubUserInfo; orgs: GithubOrg[] }>;
  /** Returns the cached connected user (no API call). Null if no PAT configured. */
  getConnectedGithubUser: () => Promise<GithubUserInfo | null>;
  /** Returns cached orgs from DB (no API call). */
  getSavedGithubOrgs: () => Promise<GithubOrg[]>;
  /** Re-fetches orgs from GitHub API, overwrites cache, returns updated list. */
  refreshGithubOrgs: () => Promise<GithubOrg[]>;
  /** Toggle the selected flag for one org (persisted to DB). */
  saveGithubOrgSelection: (login: string, selected: boolean) => Promise<void>;
  /** Fetch repos live from API for all currently selected orgs. */
  getGithubOrgRepos: () => Promise<GithubRepo[]>;
  /** Fetch commit data for the given repos via GitHub API. */
  getGithubReport: (
    params: GithubGetReportParams,
  ) => Promise<RepositoryCommitData[]>;
  /** Get persisted active repos from DB. */
  getActiveRepos: () => Promise<GithubRepository[]>;
  /** Add a repo to the persisted active list. */
  addActiveRepo: (repo: GithubRepository) => Promise<void>;
  /** Remove a repo from the persisted active list. */
  removeActiveRepo: (fullName: string) => Promise<void>;
}

// Expose the API to the renderer process
const electronAPI: ElectronAPI = {
  // Dialog operations
  selectDirectory: (): Promise<string | null> =>
    ipcRenderer.invoke(IpcChannels.DIALOG_SELECT_DIRECTORY),

  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke(IpcChannels.SHELL_OPEN_EXTERNAL, url),

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

  // GitHub operations
  saveGithubPat: (pat: string) =>
    ipcRenderer.invoke(IpcChannels.GITHUB_SAVE_PAT, pat),

  getConnectedGithubUser: () =>
    ipcRenderer.invoke(IpcChannels.GITHUB_GET_CONNECTED_USER),

  getSavedGithubOrgs: () =>
    ipcRenderer.invoke(IpcChannels.GITHUB_GET_SAVED_ORGS),

  refreshGithubOrgs: () => ipcRenderer.invoke(IpcChannels.GITHUB_REFRESH_ORGS),

  saveGithubOrgSelection: (login: string, selected: boolean) =>
    ipcRenderer.invoke(IpcChannels.GITHUB_SAVE_ORG_SELECTION, login, selected),

  getGithubOrgRepos: () => ipcRenderer.invoke(IpcChannels.GITHUB_GET_ORG_REPOS),

  getGithubReport: (params: GithubGetReportParams) =>
    ipcRenderer.invoke(IpcChannels.GITHUB_GET_REPORT, params),

  getActiveRepos: () => ipcRenderer.invoke(IpcChannels.GITHUB_GET_ACTIVE_REPOS),

  addActiveRepo: (repo: GithubRepository) =>
    ipcRenderer.invoke(IpcChannels.GITHUB_ADD_ACTIVE_REPO, repo),

  removeActiveRepo: (fullName: string) =>
    ipcRenderer.invoke(IpcChannels.GITHUB_REMOVE_ACTIVE_REPO, fullName),
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
