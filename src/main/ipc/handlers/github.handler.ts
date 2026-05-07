import { ipcMain } from "electron";
import { IpcChannels } from "../../../shared/constants";
import type {
  GithubUserInfo,
  GithubOrg,
  GithubRepo,
  GithubRepository,
  GithubGetReportParams,
  RepositoryCommitData,
} from "../../../shared/types";
import { databaseService } from "../../services/database.service";
import { githubService } from "../../services/github.service";

/**
 * Registers GitHub-related IPC handlers.
 *
 * The PAT is never returned to the renderer. It lives exclusively in the main
 * process (encrypted in the database). The renderer can only write it once via
 * GITHUB_SAVE_PAT and observe derived state (user info, orgs).
 */
export function registerGithubHandlers(): void {
  // Validate PAT, encrypt+store, fetch+save orgs → return { user, orgs }
  ipcMain.handle(
    IpcChannels.GITHUB_SAVE_PAT,
    async (
      _event,
      pat: string,
    ): Promise<{ user: GithubUserInfo; orgs: GithubOrg[] }> => {
      if (!pat || typeof pat !== "string") {
        throw new Error("PAT must be a non-empty string");
      }

      // Validate the token and get user info
      const user = await githubService.getAuthenticatedUser(pat);

      // Encrypt & persist
      databaseService.setPat(pat);

      // Cache user info in config table
      databaseService.setConfigValue("github_user", JSON.stringify(user));

      // Fetch and cache organizations
      const orgs = await githubService.getOrganizations(pat);
      databaseService.saveOrgs(orgs);

      return { user, orgs };
    },
  );

  // Return cached user info from DB — no API call
  ipcMain.handle(
    IpcChannels.GITHUB_GET_CONNECTED_USER,
    (): GithubUserInfo | null => {
      const raw = databaseService.getConfigValue("github_user");
      if (!raw) return null;
      try {
        return JSON.parse(raw) as GithubUserInfo;
      } catch {
        return null;
      }
    },
  );

  // Return cached orgs from DB — no API call
  ipcMain.handle(IpcChannels.GITHUB_GET_SAVED_ORGS, (): GithubOrg[] => {
    return databaseService.getOrgs();
  });

  // Re-fetch orgs from API, overwrite DB (preserving selection state), return new list
  ipcMain.handle(
    IpcChannels.GITHUB_REFRESH_ORGS,
    async (): Promise<GithubOrg[]> => {
      const pat = databaseService.getPat();
      if (!pat) throw new Error("No GitHub PAT configured");

      const orgs = await githubService.getOrganizations(pat);
      databaseService.saveOrgs(orgs);
      return databaseService.getOrgs(); // returned with preserved selection state
    },
  );

  // Toggle selected flag for one org
  ipcMain.handle(
    IpcChannels.GITHUB_SAVE_ORG_SELECTION,
    (_event, login: string, selected: boolean): void => {
      databaseService.setOrgSelected(login, selected);
    },
  );

  // Fetch repos live from API for all DB-selected orgs
  ipcMain.handle(
    IpcChannels.GITHUB_GET_ORG_REPOS,
    async (): Promise<GithubRepo[]> => {
      const pat = databaseService.getPat();
      if (!pat) throw new Error("No GitHub PAT configured");

      const selectedOrgs = databaseService.getSelectedOrgLogins();
      if (selectedOrgs.length === 0) return [];

      const repoArrays = await Promise.all(
        selectedOrgs.map((org) => githubService.getOrgRepos(pat, org)),
      );

      return repoArrays.flat();
    },
  );

  // Fetch commit data for selected repos via GitHub API
  ipcMain.handle(
    IpcChannels.GITHUB_GET_REPORT,
    async (
      _event,
      params: GithubGetReportParams,
    ): Promise<RepositoryCommitData[]> => {
      const pat = databaseService.getPat();
      if (!pat) throw new Error("No GitHub PAT configured");

      return githubService.getRepositoriesData(
        pat,
        params.repositoryFullNames,
        params.authorLogin,
        params.sinceDate,
        params.untilDate,
      );
    },
  );

  // Return persisted active repos from DB
  ipcMain.handle(
    IpcChannels.GITHUB_GET_ACTIVE_REPOS,
    (): GithubRepository[] => {
      return databaseService.getActiveRepos();
    },
  );

  // Add a repo to the persisted active list
  ipcMain.handle(
    IpcChannels.GITHUB_ADD_ACTIVE_REPO,
    (_event, repo: GithubRepository): void => {
      databaseService.addActiveRepo(repo);
    },
  );

  // Remove a repo from the persisted active list
  ipcMain.handle(
    IpcChannels.GITHUB_REMOVE_ACTIVE_REPO,
    (_event, fullName: string): void => {
      databaseService.removeActiveRepo(fullName);
    },
  );
}
