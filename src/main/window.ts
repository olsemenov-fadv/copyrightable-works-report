import { BrowserWindow } from "electron";
import path from "node:path";

// Declare Vite environment variables
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

/**
 * Window configuration options
 */
export interface WindowOptions {
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
}

/**
 * Creates and manages the main application window
 */
export class WindowManager {
  private mainWindow: BrowserWindow | null = null;

  /**
   * Creates the main application window
   */
  createMainWindow(options: WindowOptions = {}): BrowserWindow {
    const {
      width = 1000,
      height = 700,
      minWidth = 800,
      minHeight = 600,
    } = options;

    this.mainWindow = new BrowserWindow({
      width,
      height,
      minWidth,
      minHeight,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
      titleBarStyle: "hiddenInset",
      show: false, // Don't show until ready
    });

    this.mainWindow.setMenuBarVisibility(false);

    // Load the app
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      this.mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
      this.mainWindow.loadFile(
        path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      );
    }

    // Show window when ready to prevent visual flash
    this.mainWindow.once("ready-to-show", () => {
      this.mainWindow?.show();
    });

    // Clean up on close
    this.mainWindow.on("closed", () => {
      this.mainWindow = null;
    });

    // Open DevTools in development
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      this.mainWindow.webContents.openDevTools();
    }

    return this.mainWindow;
  }

  /**
   * Gets the main window instance
   */
  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  /**
   * Checks if the main window exists and is not destroyed
   */
  hasMainWindow(): boolean {
    return this.mainWindow !== null && !this.mainWindow.isDestroyed();
  }
}

// Export singleton instance
export const windowManager = new WindowManager();
