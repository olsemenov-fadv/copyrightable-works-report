/**
 * Represents a Git repository found during scanning
 */
export interface GitRepository {
  name: string;
  path: string;
  selected: boolean;
}

/**
 * Git user configuration from global git config
 */
export interface GitUserConfig {
  name: string;
  email: string;
}

/**
 * Commit data from a repository
 */
export interface RepositoryCommitData {
  repositoryPath: string;
  repositoryName: string;
  repositoryLink: string;
  commits: string;
  commitCount: number;
}

/**
 * Request parameters for generating a report
 */
export interface GetReportParams {
  author: string;
  authorEmail: string;
  repositoriesPaths: string[];
  sinceDate?: string;
}

/**
 * Statistics summary
 */
export interface ReportStatistics {
  repositoryCount: number;
  totalCommits: number;
  filesChanged: number;
}
