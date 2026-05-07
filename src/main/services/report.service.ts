import {
  BorderStyle,
  ExternalHyperlink,
  Paragraph,
  patchDocument,
  PatchType,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlignTable,
  WidthType,
} from "docx";
import {
  readFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  unlinkSync,
} from "fs";
import { databaseService } from "./database.service";
import path from "node:path";
import { app } from "electron";
import type {
  GenerateReportParams,
  AddReportToHistoryParams,
  ReportHistoryEntry,
  ReportHistory,
} from "../../shared/types/report.types";
import type { CommitEntry } from "../../shared/types/git.types";
import { formatCommitDate } from "../../shared/utils/date";
import { fileURLToPath } from "node:url";

/**
 * Service responsible for generating DOCX reports from repository commit data
 */
export class ReportService {
  private readonly tableConfig = {
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [(1.32 / 6.5) * 100, (5.18 / 6.5) * 100],
    borderStyle: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
    headerCell: {
      shading: {
        color: "f2f2f2",
        fill: "f2f2f2",
        type: ShadingType.SOLID,
      },
    },
    cellConfig: {
      verticalAlign: VerticalAlignTable.TOP,
      margins: {
        left: 100,
        right: 100,
      },
    },
  };

  private _templatePath: string | null = null;
  private _reportsDir: string | null = null;

  private get templatePath(): string {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, "template.docx");
    } else {
      return path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../assets/template.docx",
      );
    }
  }

  private get reportsDir(): string {
    if (!this._reportsDir) {
      this._reportsDir = path.join(app.getPath("userData"), "reports");
      // Ensure reports directory exists
      if (!existsSync(this._reportsDir)) {
        mkdirSync(this._reportsDir, { recursive: true });
      }
    }
    return this._reportsDir;
  }

  /**
   * Generates a DOCX report from repository commit data
   */
  async generateReport(params: GenerateReportParams): Promise<Buffer> {
    const updatedTemplate = await this.updateReport(params);
    return updatedTemplate;
  }

  /**
   * Adds a report to history immediately (without generating DOCX)
   */
  addReportToHistory(params: AddReportToHistoryParams): ReportHistoryEntry {
    const timestamp = new Date();

    // Calculate total commits
    const totalCommits = params.repositoriesData.reduce(
      (sum, repo) => sum + repo.commitCount,
      0,
    );

    // Create history entry with status based on commits
    const historyEntry: ReportHistoryEntry = {
      id: Date.now().toString(),
      fileName: "",
      filePath: "",
      createdAt: timestamp.toISOString(),
      authorName: params.fullName,
      reportingMonth: this.getReportingMonth(),
      sinceDate: params.sinceDate,
      untilDate: params.untilDate,
      repositoryCount: params.repositoriesData.filter((r) => r.commitCount > 0)
        .length,
      totalCommits,
      status: totalCommits > 0 ? "has-commits" : "no-commits",
      repositoriesData: params.repositoriesData,
    };

    // Add to history
    databaseService.addReport(historyEntry);

    return historyEntry;
  }

  /**
   * Gets a report by its ID
   */
  getReportById(id: string): ReportHistoryEntry | null {
    return databaseService.getReportById(id);
  }

  /**
   * Creates a DOCX document for an existing history entry
   */
  async createDocumentForReport(
    id: string,
    approver?: string,
  ): Promise<ReportHistoryEntry | null> {
    const entry = databaseService.getReportById(id);
    if (!entry) return null;

    const docxBuffer = await this.generateReport({
      fullName: entry.authorName,
      approver,
      repositoriesData: entry.repositoriesData,
    });

    const fileName = this.generateFileName(entry.authorName);
    const filePath = path.join(this.reportsDir, fileName);

    // Save the file
    writeFileSync(filePath, docxBuffer);

    // Update the entry in DB
    databaseService.updateReport(id, { fileName, filePath });

    return { ...entry, fileName, filePath };
  }

  /**
   * Generates a report, saves it to disk, and adds it to history
   */
  async generateAndSaveReport(
    params: GenerateReportParams,
  ): Promise<ReportHistoryEntry> {
    const docxBuffer = await this.generateReport(params);

    const fileName = this.generateFileName(params.fullName);
    const filePath = path.join(this.reportsDir, fileName);

    // Save the file
    writeFileSync(filePath, docxBuffer);

    // Calculate total commits
    const totalCommits = params.repositoriesData.reduce(
      (sum, repo) => sum + repo.commitCount,
      0,
    );

    // Create history entry
    const historyEntry: ReportHistoryEntry = {
      id: Date.now().toString(),
      fileName,
      filePath,
      createdAt: new Date().toISOString(),
      authorName: params.fullName,
      reportingMonth: this.getReportingMonth(),
      sinceDate: "",
      repositoryCount: params.repositoriesData.filter((r) => r.commitCount > 0)
        .length,
      totalCommits,
      status: totalCommits > 0 ? "has-commits" : "no-commits",
      repositoriesData: params.repositoriesData,
    };

    // Add to history
    databaseService.addReport(historyEntry);

    return historyEntry;
  }

  /**
   * Generates a filename in the format YYYY.MM_FirstName_LastName.docx
   */
  private generateFileName(fullName: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const nameSuffix = fullName.trim().replaceAll(/\s+/g, "_");
    return `${year}.${month}_${nameSuffix}.docx`;
  }

  /**
   * Gets the current reporting month string
   */
  private getReportingMonth(): string {
    const now = new Date();
    return `${now.toLocaleString("en-US", { month: "long" })} ${now.getFullYear()}`;
  }

  /**
   * Retrieves all report history entries
   */
  getHistory(): ReportHistory {
    try {
      return { entries: databaseService.getReports() };
    } catch (error) {
      console.error("Error reading report history:", error);
      return { entries: [] };
    }
  }

  /**
   * Gets a report file by its path
   */
  getReportFile(filePath: string): Buffer | null {
    if (!existsSync(filePath)) {
      return null;
    }

    return readFileSync(filePath);
  }

  /**
   * Deletes a report from history and disk
   */
  deleteReport(id: string): boolean {
    const entry = databaseService.getReportById(id);
    if (!entry) return false;

    // Delete the DOCX file if it exists
    if (entry.filePath && existsSync(entry.filePath)) {
      unlinkSync(entry.filePath);
    }

    return databaseService.deleteReport(id);
  }

  /**
   * Updates the report template with the provided data
   */
  private updateReport(params: GenerateReportParams): Promise<Buffer> {
    const repositoriesData = params.repositoriesData.map((repo) => ({
      repositoryLink: repo.repositoryLink,
      commitsLog: this.formatCommitsAsGitLog(repo.commits),
    }));

    const document = patchDocument({
      outputType: "nodebuffer",
      data: readFileSync(this.templatePath),
      keepOriginalStyles: true,
      patches: {
        employeeName: {
          type: PatchType.PARAGRAPH,
          children: [new TextRun(this.sanitizeForDocx(params.fullName))],
        },
        approver: {
          type: PatchType.PARAGRAPH,
          children: [new TextRun(this.sanitizeForDocx(params.approver || ""))],
        },
        reportingMonth: {
          type: PatchType.PARAGRAPH,
          children: [new TextRun(this.getReportingMonth())],
        },
        table: {
          type: PatchType.DOCUMENT,
          children: this.generateCommitsTables(repositoriesData),
        },
      },
    });

    return document;
  }

  /**
   * Converts CommitEntry[] to git-log formatted string for DOCX document generation
   */
  private formatCommitsAsGitLog(commits: CommitEntry[]): string {
    return commits
      .map((c) => {
        const lines = [
          `commit ${c.sha}`,
          `Author: ${c.authorName} <${c.authorEmail}>`,
          `Date:   ${formatCommitDate(c.date)}`,
          "",
          `    ${c.message}`,
        ];
        if (c.body) {
          lines.push("", c.body);
        }
        return lines.join("\n");
      })
      .join("\n\n");
  }

  /**
   * Generates tables for all repositories with commits
   */
  private generateCommitsTables(
    repositoriesData: { repositoryLink: string; commitsLog: string }[],
  ) {
    return repositoriesData
      .filter((entry) => !!entry.commitsLog)
      .flatMap((entry) =>
        this.createRepositoryEntry(entry.repositoryLink, entry.commitsLog),
      );
  }

  /**
   * Creates a table entry for a single repository
   */
  private createRepositoryEntry(
    repositoryLink: string,
    commits: string,
  ): Array<Table | Paragraph> {
    const borderStyle = this.tableConfig.borderStyle;

    const table = new Table({
      width: this.tableConfig.width,
      columnWidths: this.tableConfig.columnWidths,
      margins: { left: 0 },
      layout: TableLayoutType.FIXED,
      borders: {
        top: borderStyle,
        bottom: borderStyle,
        left: borderStyle,
        right: borderStyle,
        insideHorizontal: borderStyle,
        insideVertical: borderStyle,
      },
      rows: [
        this.getRepositoryLinkRow(repositoryLink),
        this.getCommitsRow(commits),
      ],
    });

    return [table, new Paragraph("")];
  }

  /**
   * Creates the repository link row
   */
  private getRepositoryLinkRow(repositoryLink: string): TableRow {
    const sanitizedLink = this.sanitizeForDocx(repositoryLink);
    return new TableRow({
      children: [
        this.headerCell("Repository Link"),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new ExternalHyperlink({
                  children: [
                    new TextRun({
                      text: sanitizedLink,
                      style: "Hyperlink",
                      color: "0000FF",
                      underline: {
                        color: "0000FF",
                      },
                    }),
                  ],
                  link: repositoryLink,
                }),
              ],
            }),
          ],
          ...this.tableConfig.cellConfig,
        }),
      ],
    });
  }

  private sanitizeForDocx(text: string): string {
    let sanitized = text.replace(/\uFFFD/g, "");
    sanitized = sanitized.replace(/[\uD800-\uDFFF]/g, "");

    // eslint-disable-next-line no-control-regex
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

    sanitized = sanitized.replace(/[\uFFFE\uFFFF]/g, "");

    return sanitized;
  }

  /**
   * Creates the commits row with formatted commit messages
   */
  private getCommitsRow(commits: string): TableRow {
    const [firstLine, ...restLines] = commits.split("\n");

    const formattedCommits = [
      new TextRun({ text: this.sanitizeForDocx(firstLine) }),
      ...restLines.map(
        (line) => new TextRun({ break: 1, text: this.sanitizeForDocx(line) }),
      ),
    ];

    return new TableRow({
      children: [
        this.headerCell("Commits"),
        new TableCell({
          children: [
            new Paragraph({
              children: formattedCommits,
            }),
          ],
          ...this.tableConfig.cellConfig,
        }),
      ],
    });
  }

  /**
   * Creates a header cell with bold text and shading
   */
  private headerCell(text: string): TableCell {
    return new TableCell({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text,
              bold: true,
            }),
          ],
        }),
      ],
      ...this.tableConfig.cellConfig,
      shading: this.tableConfig.headerCell.shading,
    });
  }
}

// Export singleton instance
export const reportService = new ReportService();
