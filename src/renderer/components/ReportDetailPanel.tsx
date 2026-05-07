import { useState, useCallback } from "react";
import { formatCommitDate } from "../../shared/utils/date";
import type { ReportHistoryEntry } from "../../shared/types";
import {
  ArrowLeftIcon,
  CopyIcon,
  CheckIcon,
  ChevronDownIcon,
  DownloadIcon,
  TrashIcon,
} from "./Icons";

interface ReportDetailPanelProps {
  report: ReportHistoryEntry;
  approver: string;
  onBack: () => void;
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
  isExporting?: boolean;
  isDeleting?: boolean;
}

export function ReportDetailPanel({
  report,
  approver,
  onBack,
  onDelete,
  onExport,
  isExporting,
  isDeleting,
}: ReportDetailPanelProps) {
  const [copied, setCopied] = useState(false);
  const [expandedRepos, setExpandedRepos] = useState<Set<string>>(new Set());

  const reposWithCommits = report.repositoriesData.filter(
    (r) => r.commitCount > 0,
  );
  const totalCommits = reposWithCommits.reduce(
    (sum, r) => sum + r.commitCount,
    0,
  );

  const toggleExpanded = (repoName: string) => {
    setExpandedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(repoName)) {
        next.delete(repoName);
      } else {
        next.add(repoName);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedRepos(new Set(reposWithCommits.map((r) => r.repositoryName)));
  };

  const collapseAll = () => {
    setExpandedRepos(new Set());
  };

  const copyReportToClipboard = useCallback(async () => {
    let reportText = "# Copyrightable Works Report\n\n";
    reportText += `Author: ${report.authorName}\n`;
    reportText += `Generated: ${formatDate(report.createdAt)}\n`;
    reportText += `Reporting Month: ${report.reportingMonth}\n\n`;

    for (const repo of reposWithCommits) {
      reportText += `## ${repo.repositoryName}\n`;
      if (repo.repositoryLink) {
        reportText += `Repository: ${repo.repositoryLink}\n`;
      }
      reportText += `Commits: ${repo.commitCount}\n\n`;
      reportText += "```\n";
      reportText += repo.commits
        .map(
          (c) =>
            `commit ${c.sha}\nAuthor: ${c.authorName} <${c.authorEmail}>\nDate:   ${c.date}\n\n    ${c.message}${c.body ? `\n\n${c.body}` : ""}`,
        )
        .join("\n\n");
      reportText += "\n```\n\n";
    }

    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy report:", err);
    }
  }, [report, reposWithCommits]);

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

  const handleDelete = () => {
    if (
      confirm(
        `Are you sure you want to delete this report from ${report.reportingMonth}?`,
      )
    ) {
      onDelete(report.id);
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-header-main">
          <button
            className="btn btn-ghost btn-icon report-detail-back"
            onClick={onBack}
            title="Back to History"
          >
            <ArrowLeftIcon />
          </button>
          <div>
            <h2 className="panel-title">Report Details</h2>
            <p className="panel-description">{report.reportingMonth}</p>
          </div>
        </div>
        <div className="panel-header-actions">
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onExport(report.id)}
            disabled={isExporting || !approver}
            title={
              !approver
                ? "Configure approver name in settings first"
                : "Export as DOCX"
            }
          >
            {isExporting ? (
              <>
                <div className="spinner-sm" /> Exporting...
              </>
            ) : (
              <>
                <DownloadIcon /> Export DOCX
              </>
            )}
          </button>
          <button
            className="btn btn-ghost btn-icon btn-danger"
            onClick={handleDelete}
            disabled={isDeleting}
            title="Delete"
          >
            {isDeleting ? <div className="spinner-sm" /> : <TrashIcon />}
          </button>
        </div>
      </div>

      <div className="panel-content panel-content-scroll">
        {/* Report Meta Info */}
        <div className="report-detail-meta">
          <div className="report-detail-meta-row">
            <span className="report-detail-meta-label">Author</span>
            <span className="report-detail-meta-value">
              {report.authorName}
            </span>
          </div>
          <div className="report-detail-meta-row">
            <span className="report-detail-meta-label">Created</span>
            <span className="report-detail-meta-value">
              {formatDate(report.createdAt)}
            </span>
          </div>
          <div className="report-detail-meta-row">
            <span className="report-detail-meta-label">Period</span>
            <span className="report-detail-meta-value">
              {report.sinceDate
                ? report.untilDate
                  ? `${report.sinceDate} – ${report.untilDate}`
                  : `From ${report.sinceDate}`
                : "Current month"}
            </span>
          </div>
        </div>

        {/* Repositories */}
        <div className="report-detail-repos">
          <div className="report-detail-repos-header">
            <h3>Repositories ({reposWithCommits.length})</h3>
            <div className="report-detail-repos-actions">
              <button className="btn btn-ghost btn-sm" onClick={expandAll}>
                Expand All
              </button>
              <button className="btn btn-ghost btn-sm" onClick={collapseAll}>
                Collapse
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={copyReportToClipboard}
              >
                {copied ? (
                  <>
                    <CheckIcon /> Copied!
                  </>
                ) : (
                  <>
                    <CopyIcon /> Copy
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="report-list">
            {reposWithCommits.map((repo) => {
              const isExpanded = expandedRepos.has(repo.repositoryName);
              return (
                <div key={repo.repositoryName} className="report-card">
                  <button
                    className="report-card-header"
                    onClick={() => toggleExpanded(repo.repositoryName)}
                  >
                    <div className="report-card-info">
                      <span className="report-card-name">
                        {repo.repositoryName}
                      </span>
                      {repo.repositoryLink && (
                        <span className="report-card-link">
                          {repo.repositoryLink}
                        </span>
                      )}
                    </div>
                    <div className="report-card-meta">
                      <span className="report-card-badge">
                        {repo.commitCount} commits
                      </span>
                      <span
                        className={`report-card-chevron ${isExpanded ? "expanded" : ""}`}
                      >
                        <ChevronDownIcon />
                      </span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="report-card-body">
                      {repo.commits.map((commit) => (
                        <div key={commit.sha} className="commit-entry">
                          <div className="commit-header">
                            {commit.url ? (
                              <a
                                href={commit.url}
                                className="commit-sha"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  window.electronAPI.openExternal(commit.url!);
                                }}
                              >
                                {commit.sha.slice(0, 7)}
                              </a>
                            ) : (
                              <span className="commit-sha">
                                {commit.sha.slice(0, 7)}
                              </span>
                            )}
                            <span className="commit-message">
                              {commit.message}
                            </span>
                          </div>
                          <div className="commit-meta">
                            <span className="commit-author">
                              {commit.authorName}{" "}
                              <span className="commit-author-email">
                                &lt;{commit.authorEmail}&gt;
                              </span>
                            </span>
                            <span className="commit-date">
                              {formatCommitDate(commit.date)}
                            </span>
                          </div>
                          {commit.body && (
                            <pre className="commit-body">{commit.body}</pre>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="panel-footer">
        <span className="panel-footer-info">
          <strong>{totalCommits}</strong> commits in{" "}
          <strong>{reposWithCommits.length}</strong> repositories
        </span>
      </div>
    </div>
  );
}
