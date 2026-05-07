import type {
  RepositoryCommitData,
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
} from "../../shared/types";

export interface ElectronAPI {
  // External operations
  openExternal: (url: string) => Promise<void>;

  // Dialog operations
  selectDirectory: () => Promise<string | null>;

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
  saveGithubPat: (
    pat: string,
  ) => Promise<{ user: GithubUserInfo; orgs: GithubOrg[] }>;
  getConnectedGithubUser: () => Promise<GithubUserInfo | null>;
  getSavedGithubOrgs: () => Promise<GithubOrg[]>;
  refreshGithubOrgs: () => Promise<GithubOrg[]>;
  saveGithubOrgSelection: (login: string, selected: boolean) => Promise<void>;
  getGithubOrgRepos: () => Promise<GithubRepo[]>;
  getGithubReport: (
    params: GithubGetReportParams,
  ) => Promise<RepositoryCommitData[]>;
  getActiveRepos: () => Promise<GithubRepository[]>;
  addActiveRepo: (repo: GithubRepository) => Promise<void>;
  removeActiveRepo: (fullName: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
