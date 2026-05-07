/**
 * IPC Channel names for communication between main and renderer processes
 * Using a centralized location prevents typos and makes refactoring easier
 */
export const IpcChannels = {
  // Dialog channels
  DIALOG_SELECT_DIRECTORY: "dialog:selectDirectory",
  SHELL_OPEN_EXTERNAL: "shell:openExternal",

  // Git channels
  GIT_SCAN_REPOSITORIES: "git:scanRepositories",
  GIT_GET_REPORT: "git:getReport",
  GIT_GET_USER_CONFIG: "git:getUserConfig",

  // Report channels
  REPORT_GENERATE_AND_SAVE: "report:generateAndSave",
  REPORT_ADD_TO_HISTORY: "report:addToHistory",
  REPORT_GET_BY_ID: "report:getById",
  REPORT_CREATE_DOCUMENT: "report:createDocument",
  REPORT_GET_HISTORY: "report:getHistory",
  REPORT_DOWNLOAD: "report:download",
  REPORT_EXPORT: "report:export",
  REPORT_DELETE: "report:delete",

  // Config channels
  CONFIG_GET: "config:get",
  CONFIG_SAVE: "config:save",

  // GitHub channels
  /** Validate PAT, encrypt+store, fetch+cache orgs → returns { user, orgs } */
  GITHUB_SAVE_PAT: "github:savePat",
  /** Read cached user info from DB (no API call) */
  GITHUB_GET_CONNECTED_USER: "github:getConnectedUser",
  /** Read orgs from DB (no API call) */
  GITHUB_GET_SAVED_ORGS: "github:getSavedOrgs",
  /** Re-fetch orgs from API, overwrite DB, return new list */
  GITHUB_REFRESH_ORGS: "github:refreshOrgs",
  /** Toggle selected flag for one org in DB */
  GITHUB_SAVE_ORG_SELECTION: "github:saveOrgSelection",
  /** Fetch repos live from API for all DB-selected orgs */
  GITHUB_GET_ORG_REPOS: "github:getOrgRepos",
  /** Fetch commit data for selected repos via GitHub API */
  GITHUB_GET_REPORT: "github:getReport",
  /** Get persisted active repos from DB */
  GITHUB_GET_ACTIVE_REPOS: "github:getActiveRepos",
  /** Add a repo to the persisted active list */
  GITHUB_ADD_ACTIVE_REPO: "github:addActiveRepo",
  /** Remove a repo from the persisted active list */
  GITHUB_REMOVE_ACTIVE_REPO: "github:removeActiveRepo",
} as const;

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels];
