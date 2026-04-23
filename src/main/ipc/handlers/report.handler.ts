import { ipcMain, dialog, shell } from "electron";
import { writeFileSync } from "fs";
import { IpcChannels } from "../../../shared/constants";
import type {
  GenerateReportParams,
  AddReportToHistoryParams,
  ReportHistoryEntry,
  ReportHistory,
  ExportReportParams,
} from "../../../shared/types";
import { reportService } from "../../services";

/**
 * Registers Report-related IPC handlers
 */
export function registerReportHandlers(): void {
  // Generate and save a report
  ipcMain.handle(
    IpcChannels.REPORT_GENERATE_AND_SAVE,
    async (
      _event,
      params: GenerateReportParams,
    ): Promise<ReportHistoryEntry> => {
      try {
        return await reportService.generateAndSaveReport(params);
      } catch (error) {
        console.error("Error generating report:", error);
        throw error;
      }
    },
  );

  // Add report to history (without generating DOCX)
  ipcMain.handle(
    IpcChannels.REPORT_ADD_TO_HISTORY,
    (_event, params: AddReportToHistoryParams): ReportHistoryEntry => {
      try {
        return reportService.addReportToHistory(params);
      } catch (error) {
        console.error("Error adding report to history:", error);
        throw error;
      }
    },
  );

  // Get report by ID
  ipcMain.handle(
    IpcChannels.REPORT_GET_BY_ID,
    (_event, id: string): ReportHistoryEntry | null => {
      try {
        return reportService.getReportById(id);
      } catch (error) {
        console.error("Error getting report:", error);
        throw error;
      }
    },
  );

  // Create DOCX document for existing report
  ipcMain.handle(
    IpcChannels.REPORT_CREATE_DOCUMENT,
    async (
      _event,
      id: string,
      approver?: string,
    ): Promise<ReportHistoryEntry | null> => {
      try {
        return await reportService.createDocumentForReport(id, approver);
      } catch (error) {
        console.error("Error creating document:", error);
        throw error;
      }
    },
  );

  // Get report history
  ipcMain.handle(
    IpcChannels.REPORT_GET_HISTORY,
    async (): Promise<ReportHistory> => {
      try {
        return reportService.getHistory();
      } catch (error) {
        console.error("Error getting report history:", error);
        throw error;
      }
    },
  );

  // Download (save as) a report
  ipcMain.handle(
    IpcChannels.REPORT_DOWNLOAD,
    async (_event, filePath: string, fileName: string): Promise<boolean> => {
      try {
        const fileBuffer = reportService.getReportFile(filePath);
        if (!fileBuffer) {
          throw new Error("Report file not found");
        }

        const result = await dialog.showSaveDialog({
          title: "Save Report",
          defaultPath: fileName,
          filters: [
            { name: "Word Documents", extensions: ["docx"] },
            { name: "All Files", extensions: ["*"] },
          ],
        });

        if (result.canceled || !result.filePath) {
          return false;
        }

        writeFileSync(result.filePath, fileBuffer);

        // Open the file location in file explorer
        shell.showItemInFolder(result.filePath);

        return true;
      } catch (error) {
        console.error("Error downloading report:", error);
        throw error;
      }
    },
  );

  // Export a report (generate and save with dialog)
  ipcMain.handle(
    IpcChannels.REPORT_EXPORT,
    async (_event, params: ExportReportParams): Promise<boolean> => {
      try {
        const entry = reportService.getReportById(params.id);
        if (!entry) {
          throw new Error("Report not found");
        }

        const isPdf = params.format === "pdf";
        const extension = isPdf ? "pdf" : "docx";
        const filterName = isPdf ? "PDF Documents" : "Word Documents";

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const nameSuffix = entry.authorName.trim().replaceAll(/\s+/g, "_");
        const defaultFileName = `${year}.${month}_${nameSuffix}.${extension}`;

        const result = await dialog.showSaveDialog({
          title: `Export Report as ${extension.toUpperCase()}`,
          defaultPath: defaultFileName,
          filters: [
            { name: filterName, extensions: [extension] },
            { name: "All Files", extensions: ["*"] },
          ],
        });

        if (result.canceled || !result.filePath) {
          return false;
        }

        const reportParams = {
          fullName: entry.authorName,
          approver: params.approver,
          repositoriesData: entry.repositoriesData,
        };

        // Generate the document buffer based on format
        const buffer = isPdf
          ? await reportService.generatePdfReport(reportParams)
          : await reportService.generateReport(reportParams);

        writeFileSync(result.filePath, buffer);

        // Open the file location in file explorer
        shell.showItemInFolder(result.filePath);

        return true;
      } catch (error) {
        console.error("Error exporting report:", error);
        throw error;
      }
    },
  );

  // Delete a report
  ipcMain.handle(
    IpcChannels.REPORT_DELETE,
    async (_event, id: string): Promise<boolean> => {
      try {
        return reportService.deleteReport(id);
      } catch (error) {
        console.error("Error deleting report:", error);
        throw error;
      }
    },
  );
}
