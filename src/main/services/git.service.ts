import { exec } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import type {
  RepositoryCommitData,
  GetReportParams,
  GitUserConfig,
} from "../../shared/types";

const execAsync = promisify(exec);

/**
 * Service responsible for Git operations
 */
export class GitService {
  /**
   * Gets the global Git user configuration
   */
  async getUserConfig(): Promise<GitUserConfig> {
    try {
      const [nameResult, emailResult] = await Promise.all([
        execAsync("git config --global user.name"),
        execAsync("git config --global user.email"),
      ]);

      return {
        name: nameResult.stdout.trim(),
        email: emailResult.stdout.trim(),
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
    // Fetch latest changes from remote
    await this.fetch(repositoryPath);

    const repositoryLink = await this.getRemoteUrl(repositoryPath);
    const commits = await this.getCommits(
      author,
      authorEmail,
      repositoryPath,
      sinceDate,
    );
    const commitCount = this.countCommits(commits);

    return {
      repositoryPath,
      repositoryName: path.basename(repositoryPath),
      repositoryLink,
      commits,
      commitCount,
    };
  }

  /**
   * Fetches latest changes from remote
   */
  private async fetch(repositoryPath: string): Promise<void> {
    try {
      await execAsync("git fetch", {
        cwd: repositoryPath,
        encoding: "utf-8",
      });
    } catch (error) {
      console.warn(`Could not fetch in ${repositoryPath}:`, error);
    }
  }

  /**
   * Gets the remote origin URL and converts it to HTTPS format
   */
  private async getRemoteUrl(repositoryPath: string): Promise<string> {
    try {
      const { stdout: url } = await execAsync(
        "git config --get remote.origin.url",
        {
          cwd: repositoryPath,
          encoding: "utf-8",
        },
      );

      return url
        .trim()
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
  ): Promise<string> {
    try {
      // Calculate default since date (first day of current month)
      const effectiveSinceDate = sinceDate || this.getDefaultSinceDate();

      // Determine the default branch
      const defaultBranch = await this.getDefaultBranch(repositoryPath);

      const { stdout: commits } = await execAsync(
        `git log origin/${defaultBranch} --author="${authorEmail}" --author="${author}" --since='${effectiveSinceDate}' --reverse`,
        {
          cwd: repositoryPath,
          encoding: "utf-8",
          maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large repos
        },
      );

      if (commits.trim()) {
        console.log(`Found commits in ${repositoryPath}`);
      }

      return commits.trim();
    } catch (error) {
      console.warn(`Could not get commits for ${repositoryPath}:`, error);
      return "";
    }
  }

  /**
   * Determines the default branch of a repository
   */
  private async getDefaultBranch(repositoryPath: string): Promise<string> {
    try {
      // Try to get the default branch from remote HEAD
      const { stdout } = await execAsync(
        "git symbolic-ref refs/remotes/origin/HEAD",
        {
          cwd: repositoryPath,
          encoding: "utf-8",
        },
      );

      // Extract branch name from refs/remotes/origin/main
      const match = stdout.trim().match(/refs\/remotes\/origin\/(.+)/);
      if (match) {
        return match[1];
      }
    } catch {
      // Fallback: check if main or master exists
      try {
        await execAsync("git show-ref --verify refs/remotes/origin/main", {
          cwd: repositoryPath,
        });
        return "main";
      } catch {
        try {
          await execAsync("git show-ref --verify refs/remotes/origin/master", {
            cwd: repositoryPath,
          });
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

  /**
   * Counts the number of commits in a git log output
   */
  private countCommits(commitsLog: string): number {
    if (!commitsLog.trim()) {
      return 0;
    }

    const commitMatches = commitsLog.match(/^commit [a-f0-9]{40}$/gm);
    return commitMatches ? commitMatches.length : 0;
  }
}

// Export singleton instance
export const gitService = new GitService();
