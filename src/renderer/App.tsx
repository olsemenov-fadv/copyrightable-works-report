import { useState, useEffect, useCallback } from "react";
import type {
  GitRepository,
  GitUserConfig,
  ReportHistoryEntry,
  ExportFormat,
} from "../shared/types";
import { Sidebar, type View } from "./components/Sidebar";
import { RepositoriesPanel } from "./components/RepositoriesPanel";
import { ReportDetailPanel } from "./components/ReportDetailPanel";
import { ConfigPanel } from "./components/ConfigPanel";
import { HistoryPanel } from "./components/HistoryPanel";
import { NotificationBar } from "./components/NotificationBar";
import { ImportModal } from "./components/ImportModal";

export function App() {
  const [activeView, setActiveView] = useState<View>("repositories");
  const [selectedDirectory, setSelectedDirectory] = useState("");
  const [repositories, setRepositories] = useState<GitRepository[]>([]);
  const [gitUserConfig, setGitUserConfig] = useState<GitUserConfig | null>(
    null,
  );
  const [isScanning, setIsScanning] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);
  const [reportGeneratedTrigger, setReportGeneratedTrigger] = useState(0);
  const [approver, setApprover] = useState("");
  const [showApproverNotification, setShowApproverNotification] =
    useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [foundRepoCount, setFoundRepoCount] = useState(0);
  const [selectedReportDetail, setSelectedReportDetail] =
    useState<ReportHistoryEntry | null>(null);
  const [isExportingReport, setIsExportingReport] = useState(false);
  const [isDeletingReport, setIsDeletingReport] = useState(false);
  const [sinceDate, setSinceDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}-01`;
  });

  const selectedRepositories = repositories.filter((repo) => repo.selected);

  // Load config on startup
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await window.electronAPI.getConfig();
        setApprover(config.approver || "");
        if (config.approver) {
          setShowApproverNotification(false);
        }
        // Load saved repositories
        if (config.repositories && config.repositories.length > 0) {
          const loadedRepos: GitRepository[] = config.repositories.map((r) => ({
            name: r.name,
            path: r.path,
            selected: false,
          }));
          setRepositories(loadedRepos);
          setHasScanned(true);
        }
      } catch (error) {
        console.error("Failed to load config:", error);
      }
    };
    loadConfig();
  }, []);

  useEffect(() => {
    const loadGitConfig = async () => {
      try {
        const config = await window.electronAPI.getUserConfig();
        setGitUserConfig(config);
      } catch (error) {
        console.error("Failed to load git user config:", error);
      }
    };
    loadGitConfig();
  }, []);

  // Load history count on mount
  useEffect(() => {
    const loadHistoryCount = async () => {
      try {
        const history = await window.electronAPI.getReportHistory();
        setHistoryCount(history.entries.length);
      } catch (error) {
        console.error("Failed to load history count:", error);
      }
    };
    loadHistoryCount();
  }, [reportGeneratedTrigger]);

  const handleApproverChange = useCallback(async (newApprover: string) => {
    setApprover(newApprover);
    if (newApprover) {
      setShowApproverNotification(false);
    }
    try {
      const config = await window.electronAPI.getConfig();
      await window.electronAPI.saveConfig({ ...config, approver: newApprover });
    } catch (error) {
      console.error("Failed to save config:", error);
    }
  }, []);

  const saveRepositoriesToConfig = useCallback(
    async (repos: GitRepository[]) => {
      try {
        const config = await window.electronAPI.getConfig();
        await window.electronAPI.saveConfig({
          ...config,
          repositories: repos.map((r) => ({ name: r.name, path: r.path })),
        });
      } catch (error) {
        console.error("Failed to save repositories:", error);
      }
    },
    [],
  );

  const handleBrowse = useCallback(async () => {
    try {
      const selected = await window.electronAPI.selectDirectory();
      if (selected) {
        setSelectedDirectory(selected);
        setScanError(null);
        setFoundRepoCount(0);

        // Auto-scan when directory is selected
        setIsScanning(true);
        try {
          const repos = await window.electronAPI.scanForRepositories(selected);
          setFoundRepoCount(repos.length);
        } catch (error) {
          console.error("Error scanning repositories:", error);
          setScanError(
            error instanceof Error ? error.message : "Unknown error occurred",
          );
        } finally {
          setIsScanning(false);
        }
      }
    } catch (error) {
      console.error("Error selecting directory:", error);
    }
  }, []);

  const handleImport = useCallback(
    async (directory: string) => {
      if (!directory) return;

      setIsScanning(true);
      setScanError(null);

      try {
        const newRepos =
          await window.electronAPI.scanForRepositories(directory);

        // Merge with existing repositories (avoid duplicates by path)
        setRepositories((prev) => {
          const existingPaths = new Set(prev.map((r) => r.path));
          const uniqueNewRepos = newRepos.filter(
            (r) => !existingPaths.has(r.path),
          );
          const merged = [...prev, ...uniqueNewRepos];

          // Save to config
          saveRepositoriesToConfig(merged);

          return merged;
        });

        setHasScanned(true);
        setIsImportModalOpen(false);
        setSelectedDirectory("");
        setFoundRepoCount(0);
      } catch (error) {
        console.error("Error importing repositories:", error);
        setScanError(
          error instanceof Error ? error.message : "Unknown error occurred",
        );
      } finally {
        setIsScanning(false);
      }
    },
    [saveRepositoriesToConfig],
  );

  const handleRemoveRepository = useCallback(
    (index: number) => {
      setRepositories((prev) => {
        const updated = prev.filter((_, i) => i !== index);
        saveRepositoriesToConfig(updated);
        return updated;
      });
    },
    [saveRepositoriesToConfig],
  );

  const handleOpenImportModal = useCallback(() => {
    setSelectedDirectory("");
    setScanError(null);
    setFoundRepoCount(0);
    setIsImportModalOpen(true);
  }, []);

  const handleCloseImportModal = useCallback(() => {
    setIsImportModalOpen(false);
    setSelectedDirectory("");
    setScanError(null);
    setFoundRepoCount(0);
  }, []);

  const formatDateForGit = (dateString: string): string => {
    const [year, month, day] = dateString.split("-");
    return `${day}.${month}.${year}`;
  };

  const handleGenerateReport = useCallback(async () => {
    if (selectedRepositories.length === 0 || !gitUserConfig) return;

    setIsGeneratingReport(true);

    try {
      const data = await window.electronAPI.getReport({
        author: gitUserConfig.name,
        authorEmail: gitUserConfig.email,
        repositoriesPaths: selectedRepositories.map((repo) => repo.path),
        sinceDate: formatDateForGit(sinceDate),
      });

      // Add to history immediately
      const historyEntry = await window.electronAPI.addReportToHistory({
        fullName: gitUserConfig.name,
        sinceDate: sinceDate,
        repositoriesData: data,
      });

      // Trigger history reload
      setReportGeneratedTrigger((prev) => prev + 1);

      // Navigate to the report detail view
      setSelectedReportDetail(historyEntry);
      setActiveView("reports");
    } catch (error) {
      console.error("Error generating report:", error);
    } finally {
      setIsGeneratingReport(false);
    }
  }, [selectedRepositories, gitUserConfig, sinceDate]);

  const handleSelectReportDetail = useCallback((report: ReportHistoryEntry) => {
    setSelectedReportDetail(report);
  }, []);

  const handleBackFromDetail = useCallback(() => {
    setSelectedReportDetail(null);
  }, []);

  const handleExportReport = useCallback(
    async (id: string, format: ExportFormat) => {
      setIsExportingReport(true);
      try {
        await window.electronAPI.exportReport({
          id,
          format,
          approver,
        });
      } catch (error) {
        console.error("Error exporting report:", error);
        alert(
          error instanceof Error ? error.message : "Failed to export report",
        );
      } finally {
        setIsExportingReport(false);
      }
    },
    [approver],
  );

  const handleDeleteReportDetail = useCallback(async (id: string) => {
    setIsDeletingReport(true);
    try {
      await window.electronAPI.deleteReport(id);
      setSelectedReportDetail(null);
      setReportGeneratedTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error deleting report:", error);
    } finally {
      setIsDeletingReport(false);
    }
  }, []);

  const handleViewChange = useCallback((view: View) => {
    // Reset selected report detail when navigating away from reports
    if (view !== "reports") {
      setSelectedReportDetail(null);
    }
    setActiveView(view);
  }, []);

  const handleToggleSelection = useCallback((index: number) => {
    setRepositories((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        selected: !updated[index].selected,
      };
      return updated;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setRepositories((prev) =>
      prev.map((repo) => ({ ...repo, selected: true })),
    );
  }, []);

  const handleDeselectAll = useCallback(() => {
    setRepositories((prev) =>
      prev.map((repo) => ({ ...repo, selected: false })),
    );
  }, []);

  const renderActiveView = () => {
    switch (activeView) {
      case "repositories":
        return (
          <RepositoriesPanel
            repositories={repositories}
            isLoading={isScanning}
            error={scanError}
            hasScanned={hasScanned}
            onToggleSelection={handleToggleSelection}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onGenerateReport={handleGenerateReport}
            isGeneratingReport={isGeneratingReport}
            onImport={handleOpenImportModal}
            onRemoveRepository={handleRemoveRepository}
          />
        );
      case "reports":
        if (selectedReportDetail) {
          return (
            <ReportDetailPanel
              report={selectedReportDetail}
              approver={approver}
              onBack={handleBackFromDetail}
              onDelete={handleDeleteReportDetail}
              onExport={handleExportReport}
              isExporting={isExportingReport}
              isDeleting={isDeletingReport}
            />
          );
        }
        return (
          <HistoryPanel
            refreshTrigger={reportGeneratedTrigger}
            onSelectReport={handleSelectReportDetail}
          />
        );
      case "config":
        return (
          <ConfigPanel
            gitConfig={gitUserConfig}
            sinceDate={sinceDate}
            approver={approver}
            onSinceDateChange={setSinceDate}
            onApproverChange={handleApproverChange}
          />
        );
    }
  };

  return (
    <div className="app-layout">
      <Sidebar
        activeView={activeView}
        onViewChange={handleViewChange}
        repoCount={repositories.length}
        reportsCount={historyCount}
      />
      <main className="main-area">
        {!approver && showApproverNotification && (
          <NotificationBar
            message="Approver name is not configured. Reports require an approver name."
            actionLabel="Go to Settings"
            onAction={() => setActiveView("config")}
            onDismiss={() => setShowApproverNotification(false)}
          />
        )}
        {renderActiveView()}
      </main>
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={handleCloseImportModal}
        onImport={handleImport}
        isScanning={isScanning}
        selectedDirectory={selectedDirectory}
        onBrowse={handleBrowse}
        scanError={scanError}
        foundCount={foundRepoCount}
      />
    </div>
  );
}
