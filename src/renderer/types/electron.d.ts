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
} from "../../shared/types";

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

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
