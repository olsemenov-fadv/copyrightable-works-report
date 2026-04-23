import { app, BrowserWindow } from "electron";
import started from "electron-squirrel-startup";
import { registerAllIpcHandlers } from "./ipc";
import { windowManager } from "./window";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Register IPC handlers before creating windows
registerAllIpcHandlers();

/**
 * Creates and shows the main application window
 */
function createWindow(): void {
  windowManager.createMainWindow();
}

// App lifecycle events
app.on("ready", createWindow);

app.on("window-all-closed", () => {
  // On macOS, apps typically stay active until explicitly quit
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On macOS, re-create a window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Security: Prevent new window creation
app.on("web-contents-created", (_event, contents) => {
  contents.setWindowOpenHandler(() => {
    return { action: "deny" };
  });
});
