import simpleGit, { type DefaultLogFields } from "simple-git";
import path from "node:path";
import type {
  RepositoryCommitData,
  GetReportParams,
  GitUserConfig,
  CommitEntry,
} from "../../shared/types";

/**
 * Service responsible for Git operations
 */
export class GitService {
  /**
   * Gets the global Git user configuration
   */
  async getUserConfig(): Promise<GitUserConfig> {
    try {
      const git = simpleGit();
      const [name, email] = await Promise.all([
        git.raw(["config", "--global", "user.name"]),
        git.raw(["config", "--global", "user.email"]),
      ]);

      return {
        name: name.trim(),
        email: email.trim(),
      };
    } catch (error) {
      console.warn("Could not get git user config:", error);
      return { name: "", email: "" };
    }
  }

  /**
   * Fetches commit data from multiple repositories
   */
  async getRepositoriesData(
    params: GetReportParams,
  ): Promise<RepositoryCommitData[]> {
    const results = await Promise.all(
      params.repositoriesPaths.map((repoPath) =>
        this.getRepositoryData(
          params.author,
          params.authorEmail,
          repoPath,
          params.sinceDate,
        ),
      ),
    );

    return results;
  }

  /**
   * Gets commit data from a single repository
   */
  private async getRepositoryData(
    author: string,
    authorEmail: string,
    repositoryPath: string,
    sinceDate?: string,
  ): Promise<RepositoryCommitData> {
    await this.fetch(repositoryPath);

    const repositoryLink = await this.getRemoteUrl(repositoryPath);
    const commits = await this.getCommits(
      author,
      authorEmail,
      repositoryPath,
      sinceDate,
    );

    return {
      repositoryPath,
      repositoryName: path.basename(repositoryPath),
      repositoryLink,
      commits,
      commitCount: commits.length,
    };
  }

  /**
   * Fetches latest changes from remote
   */
  private async fetch(repositoryPath: string): Promise<void> {
    try {
      await simpleGit(repositoryPath).fetch();
    } catch (error) {
      console.warn(`Could not fetch in ${repositoryPath}:`, error);
    }
  }

  /**
   * Gets the remote origin URL and converts it to HTTPS format
   */
  private async getRemoteUrl(repositoryPath: string): Promise<string> {
    try {
      const remotes = await simpleGit(repositoryPath).getRemotes(true);
      const origin = remotes.find((r) => r.name === "origin");
      const url = origin?.refs?.fetch ?? "";

      return url
        .replace(".git", "")
        .replace("git@github.com:", "https://github.com/")
        .replace("git@gitlab.com:", "https://gitlab.com/")
        .replace("git@bitbucket.org:", "https://bitbucket.org/");
    } catch (error) {
      console.warn(`Could not get remote URL for ${repositoryPath}:`, error);
      return "";
    }
  }

  /**
   * Gets commits from a repository filtered by author
   */
  private async getCommits(
    author: string,
    authorEmail: string,
    repositoryPath: string,
    sinceDate?: string,
  ): Promise<CommitEntry[]> {
    try {
      const effectiveSinceDate = sinceDate || this.getDefaultSinceDate();
      const defaultBranch = await this.getDefaultBranch(repositoryPath);

      const logResult = await simpleGit(repositoryPath).log([
        `origin/${defaultBranch}`,
        `--author=${authorEmail}`,
        `--author=${author}`,
        `--since=${effectiveSinceDate}`,
        "--reverse",
      ]);

      if (logResult.all.length > 0) {
        console.log(`Found commits in ${repositoryPath}`);
        return this.buildCommitEntries(logResult.all);
      }

      return [];
    } catch (error) {
      console.warn(`Could not get commits for ${repositoryPath}:`, error);
      return [];
    }
  }

  /**
   * Converts structured log entries into CommitEntry[]
   */
  private buildCommitEntries(
    commits: readonly DefaultLogFields[],
  ): CommitEntry[] {
    return commits.map((c) => ({
      sha: c.hash,
      authorName: c.author_name,
      authorEmail: c.author_email,
      date: c.date,
      message: c.message,
      body: c.body || undefined,
    }));
  }

  /**
   * Determines the default branch of a repository
   */
  private async getDefaultBranch(repositoryPath: string): Promise<string> {
    const git = simpleGit(repositoryPath);

    try {
      const result = await git.raw([
        "symbolic-ref",
        "refs/remotes/origin/HEAD",
      ]);
      const match = result.trim().match(/refs\/remotes\/origin\/(.+)/);
      if (match) {
        return match[1];
      }
    } catch {
      // Fallback: check if main or master exists
      try {
        await git.raw(["show-ref", "--verify", "refs/remotes/origin/main"]);
        return "main";
      } catch {
        try {
          await git.raw(["show-ref", "--verify", "refs/remotes/origin/master"]);
          return "master";
        } catch {
          // Default to main
        }
      }
    }

    return "main";
  }

  /**
   * Gets the default since date (first day of current month)
   */
  private getDefaultSinceDate(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    return `01.${month}.${year}`;
  }
}

// Export singleton instance
export const gitService = new GitService();
