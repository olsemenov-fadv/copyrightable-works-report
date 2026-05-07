import { useState, useEffect, useCallback } from "react";
import type {
  GithubUserInfo,
  GithubOrg,
  GithubRepository,
  ReportHistoryEntry,
  AppConfig,
} from "../shared/types";
import { Sidebar, type View } from "./components/Sidebar";
import { RepositoriesPanel } from "./components/RepositoriesPanel";
import { ReportDetailPanel } from "./components/ReportDetailPanel";
import { ConfigPanel } from "./components/ConfigPanel";
import { HistoryPanel } from "./components/HistoryPanel";
import { NotificationBar } from "./components/NotificationBar";

interface Notification {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function App() {
  const [activeView, setActiveView] = useState<View>("repositories");

  // GitHub state
  const [connectedGithubUser, setConnectedGithubUser] =
    useState<GithubUserInfo | null>(null);
  const [savedOrgs, setSavedOrgs] = useState<GithubOrg[]>([]);
  // Persisted active repos (saved in DB)
  const [activeRepos, setActiveRepos] = useState<GithubRepository[]>([]);
  // Available repos fetched live from GitHub (for the picker)
  const [availableRepos, setAvailableRepos] = useState<GithubRepository[]>([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshingOrgs, setIsRefreshingOrgs] = useState(false);

  // Config state
  const [config, setConfig] = useState<AppConfig>({ approver: "" });

  // Report state
  const [currentReport, setCurrentReport] = useState<ReportHistoryEntry | null>(
    null,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeletingReport, setIsDeletingReport] = useState(false);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);

  // Notification state
  const [notification, setNotification] = useState<Notification | null>(null);

  const showNotification = (
    message: string,
    actionLabel?: string,
    onAction?: () => void,
  ) => {
    setNotification({ message, actionLabel, onAction });
  };

  // ─── Load available repos from GitHub (for picker) ─────────────────────────

  const loadAvailableRepos = useCallback(async (orgs: GithubOrg[]) => {
    const selectedOrgs = orgs.filter((o) => o.selected);
    if (selectedOrgs.length === 0) {
      setAvailableRepos([]);
      return;
    }
    setIsLoadingAvailable(true);
    try {
      const ghRepos = await window.electronAPI.getGithubOrgRepos();
      setAvailableRepos(
        ghRepos.map((r) => ({
          name: r.name,
          fullName: r.full_name,
          htmlUrl: r.html_url,
          org: r.full_name.split("/")[0],
          private: r.private,
          selected: false,
        })),
      );
    } catch (err) {
      console.error("Failed to load available repos:", err);
    } finally {
      setIsLoadingAvailable(false);
    }
  }, []);

  // ─── Initialization ────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      try {
        const [user, orgs, cfg, active] = await Promise.all([
          window.electronAPI.getConnectedGithubUser(),
          window.electronAPI.getSavedGithubOrgs(),
          window.electronAPI.getConfig(),
          window.electronAPI.getActiveRepos(),
        ]);
        setConnectedGithubUser(user);
        setSavedOrgs(orgs);
        setConfig(cfg);
        setActiveRepos(active);
        if (user && orgs.some((o) => o.selected)) {
          loadAvailableRepos(orgs);
        }
      } catch (err) {
        console.error("Initialization error:", err);
      }
    };
    init();
  }, [loadAvailableRepos]);

  // ─── GitHub / Org handlers ─────────────────────────────────────────────────

  const handleSavePat = useCallback(
    async (pat: string) => {
      setIsConnecting(true);
      try {
        const { user, orgs } = await window.electronAPI.saveGithubPat(pat);
        setConnectedGithubUser(user);
        setSavedOrgs(orgs);
        showNotification(`Connected as ${user.login}`);
        loadAvailableRepos(orgs);
      } catch (err) {
        console.error("Failed to save PAT:", err);
        showNotification(
          err instanceof Error ? err.message : "Failed to connect to GitHub.",
        );
      } finally {
        setIsConnecting(false);
      }
    },
    [loadAvailableRepos],
  );

  const handleToggleOrg = useCallback(
    async (login: string, selected: boolean) => {
      const updatedOrgs = savedOrgs.map((o) =>
        o.login === login ? { ...o, selected } : o,
      );
      setSavedOrgs(updatedOrgs);
      try {
        await window.electronAPI.saveGithubOrgSelection(login, selected);
        loadAvailableRepos(updatedOrgs);
      } catch (err) {
        console.error("Failed to save org selection:", err);
        setSavedOrgs(savedOrgs);
      }
    },
    [savedOrgs, loadAvailableRepos],
  );

  const handleRefreshOrgs = useCallback(async () => {
    setIsRefreshingOrgs(true);
    try {
      const orgs = await window.electronAPI.refreshGithubOrgs();
      setSavedOrgs(orgs);
      loadAvailableRepos(orgs);
      showNotification("Organizations refreshed.");
    } catch (err) {
      console.error("Failed to refresh orgs:", err);
      showNotification("Failed to refresh organizations.");
    } finally {
      setIsRefreshingOrgs(false);
    }
  }, [loadAvailableRepos]);

  // ─── Active repo handlers ──────────────────────────────────────────────────

  const handleAddActiveRepo = useCallback(async (repo: GithubRepository) => {
    try {
      await window.electronAPI.addActiveRepo(repo);
      setActiveRepos((prev) => {
        if (prev.some((r) => r.fullName === repo.fullName)) return prev;
        return [...prev, { ...repo, selected: true }];
      });
    } catch (err) {
      console.error("Failed to add active repo:", err);
      showNotification("Failed to add repository.");
    }
  }, []);

  const handleRemoveActiveRepo = useCallback(async (fullName: string) => {
    try {
      await window.electronAPI.removeActiveRepo(fullName);
      setActiveRepos((prev) => prev.filter((r) => r.fullName !== fullName));
    } catch (err) {
      console.error("Failed to remove active repo:", err);
      showNotification("Failed to remove repository.");
    }
  }, []);

  // ─── Config handler ────────────────────────────────────────────────────────

  const handleSaveConfig = useCallback(async (updates: Partial<AppConfig>) => {
    try {
      const updated = await window.electronAPI.saveConfig(updates);
      setConfig(updated);
      showNotification("Settings saved.");
    } catch (err) {
      console.error("Failed to save config:", err);
      showNotification("Failed to save settings.");
    }
  }, []);

  // ─── Report generation (from all active repos) ─────────────────────────────

  const handleGenerateReport = useCallback(
    async (sinceDate?: string, untilDate?: string) => {
      if (!connectedGithubUser) {
        showNotification(
          "Connect your GitHub account in Settings first.",
          "Go to Settings",
          () => setActiveView("config"),
        );
        return;
      }
      if (activeRepos.length === 0) {
        showNotification("Add at least one repository to generate a report.");
        return;
      }

      setIsGenerating(true);
      try {
        const repositoriesData = await window.electronAPI.getGithubReport({
          authorLogin: connectedGithubUser.login,
          repositoryFullNames: activeRepos.map((r) => r.fullName),
          sinceDate,
          untilDate,
        });

        const effectiveSinceDate =
          sinceDate ||
          new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            .toISOString()
            .slice(0, 10);

        const historyEntry = await window.electronAPI.addReportToHistory({
          fullName: connectedGithubUser.name || connectedGithubUser.login,
          sinceDate: effectiveSinceDate,
          untilDate,
          repositoriesData,
        });

        setCurrentReport(historyEntry);
        setHistoryRefreshTrigger((n) => n + 1);
        setActiveView("reports");
      } catch (err) {
        console.error("Failed to generate report:", err);
        showNotification(
          err instanceof Error ? err.message : "Failed to generate report.",
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [connectedGithubUser, activeRepos],
  );

  // ─── Report detail handlers ─────────────────────────────────────────────

  const handleSelectReport = useCallback((report: ReportHistoryEntry) => {
    setCurrentReport(report);
  }, []);

  const handleExportReport = useCallback(
    async (id: string) => {
      setIsExporting(true);
      try {
        const ok = await window.electronAPI.exportReport({
          id,
          approver: config.approver,
        });
        if (!ok) showNotification("Export failed.");
      } catch (err) {
        console.error("Export error:", err);
        showNotification(err instanceof Error ? err.message : "Export failed.");
      } finally {
        setIsExporting(false);
      }
    },
    [config.approver],
  );

  const handleDeleteReport = useCallback(
    async (id: string) => {
      setIsDeletingReport(true);
      try {
        await window.electronAPI.deleteReport(id);
        setHistoryRefreshTrigger((n) => n + 1);
        if (currentReport?.id === id) {
          setCurrentReport(null);
        }
      } catch (err) {
        console.error("Delete error:", err);
        showNotification("Failed to delete report.");
      } finally {
        setIsDeletingReport(false);
      }
    },
    [currentReport],
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  const hasOrgsConfigured = savedOrgs.some((o) => o.selected);

  return (
    <div className="app-layout">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        repoCount={activeRepos.length}
      />

      <div className="main-area">
        {notification && (
          <NotificationBar
            message={notification.message}
            actionLabel={notification.actionLabel}
            onAction={notification.onAction}
            onDismiss={() => setNotification(null)}
          />
        )}

        {activeView === "repositories" && (
          <RepositoriesPanel
            activeRepos={activeRepos}
            availableRepos={availableRepos}
            isLoadingAvailable={isLoadingAvailable}
            hasOrgsConfigured={hasOrgsConfigured}
            isGenerating={isGenerating}
            canGenerate={activeRepos.length > 0 && !!connectedGithubUser}
            onAddRepo={handleAddActiveRepo}
            onRemoveRepo={handleRemoveActiveRepo}
            onGenerateReport={handleGenerateReport}
          />
        )}

        {activeView === "reports" && !currentReport && (
          <HistoryPanel
            refreshTrigger={historyRefreshTrigger}
            onSelectReport={handleSelectReport}
          />
        )}

        {activeView === "reports" && currentReport && (
          <ReportDetailPanel
            report={currentReport}
            approver={config.approver}
            onBack={() => setCurrentReport(null)}
            onDelete={handleDeleteReport}
            onExport={handleExportReport}
            isExporting={isExporting}
            isDeleting={isDeletingReport}
          />
        )}

        {activeView === "config" && (
          <ConfigPanel
            config={config}
            connectedGithubUser={connectedGithubUser}
            savedOrgs={savedOrgs}
            isConnecting={isConnecting}
            isRefreshingOrgs={isRefreshingOrgs}
            onSaveConfig={handleSaveConfig}
            onSavePat={handleSavePat}
            onToggleOrg={handleToggleOrg}
            onRefreshOrgs={handleRefreshOrgs}
          />
        )}
      </div>
    </div>
  );
}

interface Notification {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}
