import fs from "node:fs";
import path from "node:path";
import { GitRepository } from "../../shared/types";

/**
 * Service responsible for file system operations
 */
export class FileService {
  private static readonly IGNORED_DIRECTORIES = new Set([
    "node_modules",
    "vendor",
    "venv",
    ".venv",
    "__pycache__",
    "dist",
    "build",
    ".cache",
    "coverage",
    ".next",
    ".nuxt",
  ]);

  private static readonly MAX_SCAN_DEPTH = 5;

  /**
   * Scans a directory recursively to find Git repositories
   */
  async scanForRepositories(directoryPath: string): Promise<GitRepository[]> {
    const repositories: GitRepository[] = [];
    await this.scanDirectory(directoryPath, repositories, 0);
    return repositories;
  }

  /**
   * Recursively scans directories looking for .git folders
   */
  private async scanDirectory(
    dirPath: string,
    repositories: GitRepository[],
    currentDepth: number,
  ): Promise<void> {
    if (currentDepth > FileService.MAX_SCAN_DEPTH) {
      return;
    }

    try {
      const entries = await fs.promises.readdir(dirPath, {
        withFileTypes: true,
      });

      // Check if this directory is a git repository
      const hasGitFolder = entries.some(
        (entry) => entry.isDirectory() && entry.name === ".git",
      );

      if (hasGitFolder) {
        repositories.push({
          name: path.basename(dirPath),
          path: dirPath,
          selected: false,
        });
        // Don't scan subdirectories of a git repo
        return;
      }

      // Recursively scan subdirectories
      const subdirs = entries.filter((entry) => {
        if (!entry.isDirectory()) return false;
        if (entry.name.startsWith(".")) return false;
        if (FileService.IGNORED_DIRECTORIES.has(entry.name)) return false;
        return true;
      });

      // Process subdirectories in parallel for better performance
      await Promise.all(
        subdirs.map((subdir) =>
          this.scanDirectory(
            path.join(dirPath, subdir.name),
            repositories,
            currentDepth + 1,
          ),
        ),
      );
    } catch (error) {
      // Permission denied or other errors - skip this directory
      console.warn(`Could not scan directory ${dirPath}:`, error);
    }
  }
}

// Export singleton instance
export const fileService = new FileService();
