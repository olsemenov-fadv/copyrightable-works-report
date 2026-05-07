import { ipcMain, dialog, shell } from "electron";
import { IpcChannels } from "../../../shared/constants";

/**
 * Registers dialog-related IPC handlers
 */
export function registerDialogHandlers(): void {
  ipcMain.handle(IpcChannels.DIALOG_SELECT_DIRECTORY, async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
      title: "Select Directory to Scan for Git Repositories",
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle(
    IpcChannels.SHELL_OPEN_EXTERNAL,
    async (_event, url: string): Promise<void> => {
      // Only allow http/https URLs to prevent arbitrary protocol abuse
      if (/^https?:\/\//i.test(url)) {
        await shell.openExternal(url);
      }
    },
  );
}
