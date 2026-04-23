import {
  registerDialogHandlers,
  registerGitHandlers,
  registerReportHandlers,
  registerConfigHandlers,
} from "./handlers";

/**
 * Registers all IPC handlers for the main process
 * Call this before creating any windows
 */
export function registerAllIpcHandlers(): void {
  registerDialogHandlers();
  registerGitHandlers();
  registerReportHandlers();
  registerConfigHandlers();
}
