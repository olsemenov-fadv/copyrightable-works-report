import { useState, useEffect, useCallback } from "react";
import type { ReportHistoryEntry } from "../../shared/types";
import {
  FileTextIcon,
  TrashIcon,
  ClockIcon,
  XCircleIcon,
  ChevronRightIcon,
  CheckIcon,
} from "./Icons";

interface HistoryPanelProps {
  refreshTrigger?: number;
  onSelectReport?: (report: ReportHistoryEntry) => void;
}

export function HistoryPanel({
  refreshTrigger,
  onSelectReport,
}: HistoryPanelProps) {
  const [history, setHistory] = useState<ReportHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.getReportHistory();
      setHistory(result.entries);
    } catch (err) {
      console.error("Failed to load history:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, refreshTrigger]);

  const handleDelete = async (entry: ReportHistoryEntry) => {
    if (!confirm(`Are you sure you want to delete "${entry.fileName}"?`)) {
      return;
    }

    setDeletingId(entry.id);
    try {
      await window.electronAPI.deleteReport(entry.id);
      setHistory((prev) => prev.filter((e) => e.id !== entry.id));
    } catch (err) {
      console.error("Failed to delete report:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-header-main">
          <h2 className="panel-title">Reports</h2>
          <p className="panel-description">
            Previously generated reports available for download
          </p>
        </div>
        {history.length > 0 && (
          <div className="panel-header-actions">
            <button className="btn btn-ghost btn-sm" onClick={loadHistory}>
              Refresh
            </button>
          </div>
        )}
      </div>

      <div className="panel-content panel-content-scroll">
        {isLoading ? (
          <div className="panel-empty">
            <div className="spinner-lg" />
            <h3>Loading history...</h3>
          </div>
        ) : error ? (
          <div className="panel-empty panel-error">
            <XCircleIcon />
            <h3>Error loading history</h3>
            <p>{error}</p>
          </div>
        ) : history.length === 0 ? (
          <div className="panel-empty">
            <ClockIcon />
            <h3>No reports yet</h3>
            <p>Generate a report from the Report panel to see it here</p>
          </div>
        ) : (
          <div className="history-list">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="history-card history-card-clickable"
                onClick={() => onSelectReport?.(entry)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    onSelectReport?.(entry);
                  }
                }}
              >
                <div className="history-card-icon">
                  <FileTextIcon />
                </div>
                <div className="history-card-content">
                  <div className="history-card-header">
                    <span className="history-card-title">
                      {entry.reportingMonth}
                    </span>
                    <span className="history-card-date">
                      {formatDate(entry.createdAt)}
                    </span>
                  </div>
                  <div className="history-card-meta">
                    <span className="history-card-author">
                      {entry.authorName}
                    </span>
                    <span className="history-card-separator">•</span>
                    <span>{entry.repositoryCount} repos</span>
                    <span className="history-card-separator">•</span>
                    <span
                      className={`history-card-status ${entry.status === "has-commits" ? "status-has-commits" : "status-no-commits"}`}
                    >
                      {entry.status === "has-commits" ? (
                        <>
                          <CheckIcon /> {entry.totalCommits} commits
                        </>
                      ) : (
                        <>
                          <ClockIcon /> No commits
                        </>
                      )}
                    </span>
                  </div>
                </div>
                <div className="history-card-actions">
                  <button
                    className="btn btn-ghost btn-icon btn-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(entry);
                    }}
                    disabled={deletingId === entry.id}
                    title="Delete"
                  >
                    {deletingId === entry.id ? (
                      <div className="spinner-sm" />
                    ) : (
                      <TrashIcon />
                    )}
                  </button>
                  <span className="history-card-arrow">
                    <ChevronRightIcon />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="panel-footer">
          <span className="panel-footer-info">
            <strong>{history.length}</strong> report
            {history.length !== 1 ? "s" : ""} in history
          </span>
        </div>
      )}
    </div>
  );
}
