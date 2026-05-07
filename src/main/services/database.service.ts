import Database from "better-sqlite3";
import path from "node:path";
import { app, safeStorage } from "electron";
import type {
  GithubOrg,
  GithubRepository,
  CommitEntry,
} from "../../shared/types/git.types";
import type { ReportHistoryEntry } from "../../shared/types/report.types";
import type { RepositoryCommitData } from "../../shared/types/git.types";

// ---------------------------------------------------------------------------
// Row shapes matching the SQLite schema
// ---------------------------------------------------------------------------

interface ConfigRow {
  key: string;
  value: string;
}

interface SecretRow {
  key: string;
  value: Buffer;
}

interface OrgRow {
  login: string;
  id: number;
  description: string | null;
  avatar_url: string;
  selected: number; // SQLite stores booleans as 0/1
}

interface ReportRow {
  id: string;
  file_name: string;
  file_path: string;
  created_at: string;
  author_name: string;
  reporting_month: string;
  since_date: string;
  until_date: string;
  repository_count: number;
  total_commits: number;
  status: string;
}

interface ReportRepoRow {
  id: number;
  report_id: string;
  repo_path: string;
  repo_name: string;
  repo_link: string;
  commits: string;
  commit_count: number;
}

interface CommitRow {
  id: number;
  repo_id: number;
  sha: string;
  author_name: string;
  author_email: string;
  date: string;
  message: string;
  body: string;
  url: string;
}

interface ActiveRepoRow {
  full_name: string;
  name: string;
  org: string;
  html_url: string;
  private: number;
}

/**
 * Central SQLite data-store for the application.
 * All persistent state (config, GitHub orgs, report history) lives here.
 *
 * The PAT is encrypted using Electron's safeStorage (OS keychain on all
 * platforms) before being written to the `secrets` table.
 */
export class DatabaseService {
  private readonly db: Database.Database;

  constructor() {
    const dbPath = path.join(app.getPath("userData"), "app.db");
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.migrate();
  }

  // ---------------------------------------------------------------------------
  // Schema migration
  // ---------------------------------------------------------------------------

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS config (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS secrets (
        key   TEXT PRIMARY KEY,
        value BLOB NOT NULL
      );

      CREATE TABLE IF NOT EXISTS github_orgs (
        login       TEXT PRIMARY KEY,
        id          INTEGER NOT NULL,
        description TEXT,
        avatar_url  TEXT NOT NULL DEFAULT '',
        selected    INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS reports (
        id               TEXT PRIMARY KEY,
        file_name        TEXT NOT NULL DEFAULT '',
        file_path        TEXT NOT NULL DEFAULT '',
        created_at       TEXT NOT NULL,
        author_name      TEXT NOT NULL,
        reporting_month  TEXT NOT NULL,
        since_date       TEXT NOT NULL DEFAULT '',
        repository_count INTEGER NOT NULL DEFAULT 0,
        total_commits    INTEGER NOT NULL DEFAULT 0,
        status           TEXT NOT NULL DEFAULT 'no-commits'
      );

      CREATE TABLE IF NOT EXISTS report_repos (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id    TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
        repo_path    TEXT NOT NULL DEFAULT '',
        repo_name    TEXT NOT NULL DEFAULT '',
        repo_link    TEXT NOT NULL DEFAULT '',
        commits      TEXT NOT NULL DEFAULT '',
        commit_count INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS active_repos (
        full_name TEXT PRIMARY KEY,
        name      TEXT NOT NULL,
        org       TEXT NOT NULL,
        html_url  TEXT NOT NULL DEFAULT '',
        private   INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS report_commits (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        repo_id      INTEGER NOT NULL REFERENCES report_repos(id) ON DELETE CASCADE,
        sha          TEXT NOT NULL DEFAULT '',
        author_name  TEXT NOT NULL DEFAULT '',
        author_email TEXT NOT NULL DEFAULT '',
        date         TEXT NOT NULL DEFAULT '',
        message      TEXT NOT NULL DEFAULT '',
        body         TEXT NOT NULL DEFAULT '',
        url          TEXT NOT NULL DEFAULT ''
      );
    `);

    // Add until_date column to reports if it doesn't exist (migration)
    try {
      this.db.exec(
        "ALTER TABLE reports ADD COLUMN until_date TEXT NOT NULL DEFAULT ''",
      );
    } catch {
      // Column already exists — no-op
    }
  }

  // ---------------------------------------------------------------------------
  // Config key-value store
  // ---------------------------------------------------------------------------

  getConfigValue(key: string): string | null {
    const row = this.db
      .prepare<[string], ConfigRow>("SELECT value FROM config WHERE key = ?")
      .get(key);
    return row?.value ?? null;
  }

  setConfigValue(key: string, value: string): void {
    this.db
      .prepare("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)")
      .run(key, value);
  }

  // ---------------------------------------------------------------------------
  // Secrets (PAT) — encrypted via safeStorage
  // ---------------------------------------------------------------------------

  getPat(): string | null {
    const row = this.db
      .prepare<[string], SecretRow>("SELECT value FROM secrets WHERE key = ?")
      .get("github_pat");

    if (!row) return null;

    try {
      if (safeStorage.isEncryptionAvailable()) {
        return safeStorage.decryptString(row.value);
      }
      // Fallback: value was stored as plain UTF-8 text
      return row.value.toString("utf-8");
    } catch (err) {
      console.error("[DatabaseService] Failed to decrypt PAT:", err);
      return null;
    }
  }

  setPat(plaintext: string): void {
    let stored: Buffer;

    if (safeStorage.isEncryptionAvailable()) {
      stored = safeStorage.encryptString(plaintext);
    } else {
      console.warn(
        "[DatabaseService] safeStorage not available — storing PAT as plaintext. " +
          "This typically happens on headless Linux without a keyring daemon.",
      );
      stored = Buffer.from(plaintext, "utf-8");
    }

    this.db
      .prepare("INSERT OR REPLACE INTO secrets (key, value) VALUES (?, ?)")
      .run("github_pat", stored);
  }

  hasPat(): boolean {
    const row = this.db
      .prepare("SELECT 1 FROM secrets WHERE key = ?")
      .get("github_pat");
    return row != null;
  }

  // ---------------------------------------------------------------------------
  // GitHub Orgs
  // ---------------------------------------------------------------------------

  getOrgs(): GithubOrg[] {
    const rows = this.db
      .prepare<[], OrgRow>("SELECT * FROM github_orgs ORDER BY login ASC")
      .all();
    return rows.map(this.rowToOrg);
  }

  saveOrgs(orgs: GithubOrg[]): void {
    // Preserve existing selection state when refreshing
    const existingSelections = new Map<string, boolean>(
      this.getOrgs().map((o) => [o.login, o.selected]),
    );

    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO github_orgs (login, id, description, avatar_url, selected)
      VALUES (@login, @id, @description, @avatar_url, @selected)
    `);

    const tx = this.db.transaction((orgList: GithubOrg[]) => {
      this.db.prepare("DELETE FROM github_orgs").run();
      for (const org of orgList) {
        insert.run({
          login: org.login,
          id: org.id,
          description: org.description ?? null,
          avatar_url: org.avatar_url,
          selected: (existingSelections.get(org.login) ?? false) ? 1 : 0,
        });
      }
    });

    tx(orgs);
  }

  setOrgSelected(login: string, selected: boolean): void {
    this.db
      .prepare("UPDATE github_orgs SET selected = ? WHERE login = ?")
      .run(selected ? 1 : 0, login);
  }

  getSelectedOrgLogins(): string[] {
    const rows = this.db
      .prepare<
        [],
        { login: string }
      >("SELECT login FROM github_orgs WHERE selected = 1 ORDER BY login ASC")
      .all();
    return rows.map((r) => r.login);
  }

  private rowToOrg(row: OrgRow): GithubOrg {
    return {
      login: row.login,
      id: row.id,
      description: row.description,
      avatar_url: row.avatar_url,
      selected: row.selected === 1,
    };
  }

  // ---------------------------------------------------------------------------
  // Active Repos
  // ---------------------------------------------------------------------------

  getActiveRepos(): GithubRepository[] {
    const rows = this.db
      .prepare<
        [],
        ActiveRepoRow
      >("SELECT * FROM active_repos ORDER BY full_name ASC")
      .all();
    return rows.map((r) => ({
      name: r.name,
      fullName: r.full_name,
      htmlUrl: r.html_url,
      org: r.org,
      private: r.private === 1,
      selected: true,
    }));
  }

  setActiveRepos(repos: GithubRepository[]): void {
    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO active_repos (full_name, name, org, html_url, private)
      VALUES (@full_name, @name, @org, @html_url, @private)
    `);
    const tx = this.db.transaction(() => {
      this.db.prepare("DELETE FROM active_repos").run();
      for (const r of repos) {
        insert.run({
          full_name: r.fullName,
          name: r.name,
          org: r.org,
          html_url: r.htmlUrl,
          private: r.private ? 1 : 0,
        });
      }
    });
    tx();
  }

  addActiveRepo(repo: GithubRepository): void {
    this.db
      .prepare(
        `
        INSERT OR REPLACE INTO active_repos (full_name, name, org, html_url, private)
        VALUES (@full_name, @name, @org, @html_url, @private)
      `,
      )
      .run({
        full_name: repo.fullName,
        name: repo.name,
        org: repo.org,
        html_url: repo.htmlUrl,
        private: repo.private ? 1 : 0,
      });
  }

  removeActiveRepo(fullName: string): void {
    this.db
      .prepare("DELETE FROM active_repos WHERE full_name = ?")
      .run(fullName);
  }

  // ---------------------------------------------------------------------------
  // Report History
  // ---------------------------------------------------------------------------

  getReports(): ReportHistoryEntry[] {
    const rows = this.db
      .prepare<[], ReportRow>("SELECT * FROM reports ORDER BY created_at DESC")
      .all();

    return rows.map((row) => {
      const repoRows = this.db
        .prepare<
          [string],
          ReportRepoRow
        >("SELECT * FROM report_repos WHERE report_id = ?")
        .all(row.id);

      const repositoriesData: RepositoryCommitData[] = repoRows.map((r) => ({
        repositoryPath: r.repo_path,
        repositoryName: r.repo_name,
        repositoryLink: r.repo_link,
        commits: this.getCommitsForRepo(r.id, r.commits),
        commitCount: r.commit_count,
      }));

      return this.rowToEntry(row, repositoriesData);
    });
  }

  getReportById(id: string): ReportHistoryEntry | null {
    const row = this.db
      .prepare<[string], ReportRow>("SELECT * FROM reports WHERE id = ?")
      .get(id);

    if (!row) return null;

    const repoRows = this.db
      .prepare<
        [string],
        ReportRepoRow
      >("SELECT * FROM report_repos WHERE report_id = ?")
      .all(id);

    const repositoriesData: RepositoryCommitData[] = repoRows.map((r) => ({
      repositoryPath: r.repo_path,
      repositoryName: r.repo_name,
      repositoryLink: r.repo_link,
      commits: this.getCommitsForRepo(r.id, r.commits),
      commitCount: r.commit_count,
    }));

    return this.rowToEntry(row, repositoriesData);
  }

  private getCommitsForRepo(
    repoId: number,
    legacyCommitsText: string,
  ): CommitEntry[] {
    const commitRows = this.db
      .prepare<
        [number],
        CommitRow
      >("SELECT * FROM report_commits WHERE repo_id = ? ORDER BY id ASC")
      .all(repoId);

    if (commitRows.length > 0) {
      return commitRows.map((cr) => ({
        sha: cr.sha,
        authorName: cr.author_name,
        authorEmail: cr.author_email,
        date: cr.date,
        message: cr.message,
        body: cr.body || undefined,
        url: cr.url || undefined,
      }));
    }

    // Backward compatibility: parse old git-log formatted string
    return parseGitLogString(legacyCommitsText);
  }

  addReport(entry: ReportHistoryEntry): void {
    const insertReport = this.db.prepare(`
      INSERT OR REPLACE INTO reports
        (id, file_name, file_path, created_at, author_name, reporting_month,
         since_date, until_date, repository_count, total_commits, status)
      VALUES
        (@id, @file_name, @file_path, @created_at, @author_name, @reporting_month,
         @since_date, @until_date, @repository_count, @total_commits, @status)
    `);

    const insertRepo = this.db.prepare(`
      INSERT INTO report_repos
        (report_id, repo_path, repo_name, repo_link, commits, commit_count)
      VALUES
        (@report_id, @repo_path, @repo_name, @repo_link, @commits, @commit_count)
    `);

    const insertCommit = this.db.prepare(`
      INSERT INTO report_commits
        (repo_id, sha, author_name, author_email, date, message, body, url)
      VALUES
        (@repo_id, @sha, @author_name, @author_email, @date, @message, @body, @url)
    `);

    const lastInsertId = this.db.prepare(
      "SELECT last_insert_rowid() as id",
    ) as Database.Statement<[], { id: number }>;

    const tx = this.db.transaction(() => {
      insertReport.run({
        id: entry.id,
        file_name: entry.fileName,
        file_path: entry.filePath,
        created_at: entry.createdAt,
        author_name: entry.authorName,
        reporting_month: entry.reportingMonth,
        since_date: entry.sinceDate,
        until_date: entry.untilDate ?? "",
        repository_count: entry.repositoryCount,
        total_commits: entry.totalCommits,
        status: entry.status,
      });

      for (const repo of entry.repositoriesData) {
        insertRepo.run({
          report_id: entry.id,
          repo_path: repo.repositoryPath,
          repo_name: repo.repositoryName,
          repo_link: repo.repositoryLink,
          commits: "", // no longer storing as text
          commit_count: repo.commitCount,
        });

        const repoId = lastInsertId.get()!.id;
        for (const commit of repo.commits) {
          insertCommit.run({
            repo_id: repoId,
            sha: commit.sha,
            author_name: commit.authorName,
            author_email: commit.authorEmail,
            date: commit.date,
            message: commit.message,
            body: commit.body ?? "",
            url: commit.url ?? "",
          });
        }
      }

      // Keep only the last 50 reports
      this.db
        .prepare(
          `
        DELETE FROM reports
        WHERE id NOT IN (
          SELECT id FROM reports ORDER BY created_at DESC LIMIT 50
        )
      `,
        )
        .run();
    });

    tx();
  }

  updateReport(
    id: string,
    fields: { fileName: string; filePath: string },
  ): void {
    this.db
      .prepare("UPDATE reports SET file_name = ?, file_path = ? WHERE id = ?")
      .run(fields.fileName, fields.filePath, id);
  }

  deleteReport(id: string): boolean {
    const result = this.db.prepare("DELETE FROM reports WHERE id = ?").run(id);
    return result.changes > 0;
  }

  private rowToEntry(
    row: ReportRow,
    repositoriesData: RepositoryCommitData[],
  ): ReportHistoryEntry {
    return {
      id: row.id,
      fileName: row.file_name,
      filePath: row.file_path,
      createdAt: row.created_at,
      authorName: row.author_name,
      reportingMonth: row.reporting_month,
      sinceDate: row.since_date,
      untilDate: row.until_date || undefined,
      repositoryCount: row.repository_count,
      totalCommits: row.total_commits,
      status: row.status as ReportHistoryEntry["status"],
      repositoriesData,
    };
  }
}

export const databaseService = new DatabaseService();

// ---------------------------------------------------------------------------
// Backward-compatibility helpers
// ---------------------------------------------------------------------------

/**
 * Parses a git-log formatted string (old storage format) into CommitEntry[].
 * Used only when reading legacy report_repos rows that have no report_commits children.
 */
function parseGitLogString(raw: string): CommitEntry[] {
  if (!raw.trim()) return [];

  const entries: CommitEntry[] = [];
  // Split on "commit <sha>" lines while keeping the header
  const blocks = raw.split(/(?=^commit [0-9a-f]{40}$)/m).filter(Boolean);

  for (const block of blocks) {
    const sha = block.match(/^commit ([0-9a-f]{40})/m)?.[1];
    const authorMatch = block.match(/^Author:\s+(.+?)\s+<(.+?)>/m);
    const authorName = authorMatch?.[1] ?? "";
    const authorEmail = authorMatch?.[2] ?? "";
    const date = block.match(/^Date:\s+(.+)/m)?.[1]?.trim() ?? "";

    const msgLines = block
      .split("\n")
      .filter((l) => l.startsWith("    "))
      .map((l) => l.slice(4));

    if (!sha) continue;

    entries.push({
      sha,
      authorName,
      authorEmail,
      date,
      message: msgLines[0] ?? "",
      body: msgLines.slice(1).join("\n").trim() || undefined,
    });
  }

  return entries;
}
