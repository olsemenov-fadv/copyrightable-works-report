import type { RepositoryCommitData } from "./git.types";

/**
 * Export format options
 */
export type ExportFormat = "docx" | "pdf";

/**
 * Parameters for exporting a report
 */
export interface ExportReportParams {
  id: string;
  format: ExportFormat;
  approver?: string;
}

/**
 * Parameters for generating a report
 */
export interface GenerateReportParams {
  fullName: string;
  approver?: string;
  repositoriesData: RepositoryCommitData[];
}

/**
 * Parameters for adding a report to history
 */
export interface AddReportToHistoryParams {
  fullName: string;
  sinceDate: string;
  repositoriesData: RepositoryCommitData[];
}

/**
 * Status of a report in history - indicates if report has commits
 */
export type ReportStatus = "has-commits" | "no-commits";

/**
 * A single entry in the report history
 */
export interface ReportHistoryEntry {
  id: string;
  fileName: string;
  filePath: string;
  createdAt: string;
  authorName: string;
  reportingMonth: string;
  sinceDate: string;
  repositoryCount: number;
  totalCommits: number;
  status: ReportStatus;
  repositoriesData: RepositoryCommitData[];
}

/**
 * Collection of report history entries
 */
export interface ReportHistory {
  entries: ReportHistoryEntry[];
}
