import type {
  GithubUserInfo,
  GithubOrg,
  GithubRepo,
  RepositoryCommitData,
  CommitEntry,
} from "../../shared/types";

const GITHUB_API = "https://api.github.com";

function githubHeaders(pat: string) {
  return {
    Authorization: `Bearer ${pat}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function githubGet<T>(pat: string, url: string): Promise<T> {
  const res = await fetch(url, { headers: githubHeaders(pat) });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API error ${res.status} for ${url}: ${body}`);
  }
  return res.json() as Promise<T>;
}

/** Paginate a GitHub list endpoint (100 items per page). */
async function paginateGet<T>(pat: string, baseUrl: string): Promise<T[]> {
  const all: T[] = [];
  let page = 1;

  while (true) {
    const separator = baseUrl.includes("?") ? "&" : "?";
    const url = `${baseUrl}${separator}per_page=100&page=${page}`;
    const items = await githubGet<T[]>(pat, url);
    all.push(...items);
    if (items.length < 100) break;
    page++;
  }

  return all;
}

/**
 * Pure GitHub API service — no disk I/O, no DB access.
 * Every method receives the PAT it needs explicitly.
 */
export class GithubService {
  /**
   * Validate a PAT and return basic user information.
   */
  async getAuthenticatedUser(pat: string): Promise<GithubUserInfo> {
    const data = await githubGet<{
      login: string;
      name: string | null;
      email: string | null;
    }>(pat, `${GITHUB_API}/user`);

    return {
      login: data.login,
      name: data.name ?? data.login,
      email: data.email,
    };
  }

  /**
   * Fetch all organizations the authenticated user belongs to.
   */
  async getOrganizations(pat: string): Promise<GithubOrg[]> {
    const items = await paginateGet<{
      login: string;
      id: number;
      description: string | null;
      avatar_url: string;
    }>(pat, `${GITHUB_API}/user/orgs`);

    return items.map((o) => ({
      login: o.login,
      id: o.id,
      description: o.description,
      avatar_url: o.avatar_url,
      selected: false,
    }));
  }

  /**
   * Fetch all repositories for a given organization.
   */
  async getOrgRepos(pat: string, org: string): Promise<GithubRepo[]> {
    const items = await paginateGet<{
      name: string;
      full_name: string;
      html_url: string;
      private: boolean;
      default_branch: string;
    }>(pat, `${GITHUB_API}/orgs/${encodeURIComponent(org)}/repos`);

    return items.map((r) => ({
      name: r.name,
      full_name: r.full_name,
      html_url: r.html_url,
      private: r.private,
      default_branch: r.default_branch,
    }));
  }

  /**
   * Fetch commit data for a list of repositories and format it as git-log output.
   * @param sinceDate - date string in YYYY-MM-DD format
   */
  async getRepositoriesData(
    pat: string,
    repositoryFullNames: string[],
    authorLogin: string,
    sinceDate?: string,
    untilDate?: string,
  ): Promise<RepositoryCommitData[]> {
    const sinceIso = sinceDate
      ? `${sinceDate.slice(0, 10)}T00:00:00Z`
      : this.getDefaultSinceIso();
    const untilIso = untilDate
      ? `${untilDate.slice(0, 10)}T23:59:59Z`
      : undefined;

    return Promise.all(
      repositoryFullNames.map((fullName) =>
        this.fetchRepoCommitData(
          pat,
          fullName,
          authorLogin,
          sinceIso,
          untilIso,
        ),
      ),
    );
  }

  private async fetchRepoCommitData(
    pat: string,
    fullName: string,
    authorLogin: string,
    sinceIso: string,
    untilIso?: string,
  ): Promise<RepositoryCommitData> {
    const shortName = fullName.split("/").pop() ?? fullName;
    const htmlUrl = `https://github.com/${fullName}`;

    try {
      const [repoOwner, repoName] = fullName.split("/");
      const baseUrl =
        `${GITHUB_API}/repos/${encodeURIComponent(repoOwner)}/${encodeURIComponent(repoName)}/commits` +
        `?author=${encodeURIComponent(authorLogin)}&since=${sinceIso}` +
        (untilIso ? `&until=${untilIso}` : "");

      const commits = await paginateGet<{
        sha: string;
        html_url: string;
        commit: {
          author: { name: string; email: string; date: string } | null;
          message: string;
        };
      }>(pat, baseUrl);

      // GitHub returns newest-first; reverse for chronological order (oldest first)
      const ordered = [...commits].reverse();

      const commitEntries: CommitEntry[] = ordered.map((c) => {
        const [firstLine, ...bodyLines] = c.commit.message.split("\n");
        const body = bodyLines.join("\n").trim();
        return {
          sha: c.sha,
          authorName: c.commit.author?.name ?? "Unknown",
          authorEmail: c.commit.author?.email ?? "",
          date: c.commit.author?.date ?? "",
          message: firstLine,
          body: body || undefined,
          url: c.html_url,
        };
      });

      return {
        repositoryPath: fullName,
        repositoryName: shortName,
        repositoryLink: htmlUrl,
        commits: commitEntries,
        commitCount: commitEntries.length,
      };
    } catch (err) {
      console.warn(
        `[GithubService] Could not fetch commits for ${fullName}:`,
        err,
      );
      return {
        repositoryPath: fullName,
        repositoryName: shortName,
        repositoryLink: htmlUrl,
        commits: [],
        commitCount: 0,
      };
    }
  }

  /** First day of the current month in ISO 8601 */
  private getDefaultSinceIso(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}-01T00:00:00Z`;
  }
}

export const githubService = new GithubService();
