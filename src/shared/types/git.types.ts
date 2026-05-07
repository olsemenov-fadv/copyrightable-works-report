/**
 * A single commit entry with structured data from git or GitHub API
 */
export interface CommitEntry {
  sha: string;
  authorName: string;
  authorEmail: string;
  date: string;
  message: string;
  body?: string;
  /** GitHub commit URL (only available for GitHub API commits) */
  url?: string;
}

/**
 * Commit data from a repository
 */
export interface RepositoryCommitData {
  repositoryPath: string;
  repositoryName: string;
  repositoryLink: string;
  commits: CommitEntry[];
  commitCount: number;
}

/**
 * Statistics summary
 */
export interface ReportStatistics {
  repositoryCount: number;
  totalCommits: number;
  filesChanged: number;
}

// ─── GitHub API Types ───────────────────────────────────────────────────────

/**
 * Authenticated GitHub user info from GET /user
 */
export interface GithubUserInfo {
  login: string;
  name: string;
  email: string | null;
}

/**
 * A GitHub organization from GET /user/orgs
 */
export interface GithubOrg {
  login: string;
  id: number;
  description: string | null;
  avatar_url: string;
  /** Whether the user has selected this org for repo discovery */
  selected: boolean;
}

/**
 * A GitHub repository from GET /orgs/{org}/repos
 */
export interface GithubRepo {
  name: string;
  full_name: string;
  html_url: string;
  private: boolean;
  default_branch: string;
}

/**
 * Renderer-side GitHub repository with selection state
 */
export interface GithubRepository {
  name: string;
  fullName: string;
  htmlUrl: string;
  org: string;
  private: boolean;
  selected: boolean;
}

/**
 * Parameters for fetching commit data from GitHub API.
 * PAT is read internally by the main process from the DB.
 */
export interface GithubGetReportParams {
  authorLogin: string;
  repositoryFullNames: string[];
  sinceDate?: string;
  untilDate?: string;
}
