/**
 * IPC Channel names for communication between main and renderer processes
 * Using a centralized location prevents typos and makes refactoring easier
 */
export const IpcChannels = {
  // Dialog channels
  DIALOG_SELECT_DIRECTORY: "dialog:selectDirectory",

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
} as const;

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels];
