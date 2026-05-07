import { useState, useCallback } from "react";
import { formatCommitDate } from "../../shared/utils/date";
import type { RepositoryCommitData } from "../../shared/types";
import {
  FileTextIcon,
  SearchIcon,
  XCircleIcon,
  CopyIcon,
  CheckIcon,
  ChevronDownIcon,
  DownloadIcon,
} from "./Icons";

interface ReportPanelProps {
  reportData: RepositoryCommitData[];
  isLoading: boolean;
  error: string | null;
  hasGenerated: boolean;
  onSaveReport?: () => void;
  isSavingReport?: boolean;
}

export function ReportPanel({
  reportData,
  isLoading,
  error,
  hasGenerated,
  onSaveReport,
  isSavingReport,
}: ReportPanelProps) {
  const [copied, setCopied] = useState(false);
  const [expandedRepos, setExpandedRepos] = useState<Set<string>>(new Set());

  const reposWithCommits = reportData.filter((r) => r.commitCount > 0);
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
    let report = "# Copyrightable Works Report\n\n";
    report += `Generated: ${formatCommitDate(new Date().toISOString())}\n\n`;

    for (const repo of reposWithCommits) {
      report += `## ${repo.repositoryName}\n`;
      if (repo.repositoryLink) {
        report += `Repository: ${repo.repositoryLink}\n`;
      }
      report += `Commits: ${repo.commitCount}\n\n`;
      report += "```\n";
      report += repo.commits
        .map(
          (c) =>
            `commit ${c.sha}\nAuthor: ${c.authorName} <${c.authorEmail}>\nDate:   ${formatCommitDate(c.date)}\n\n    ${c.message}${c.body ? `\n\n${c.body}` : ""}`,
        )
        .join("\n\n");
      report += "\n```\n\n";
    }

    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy report:", err);
    }
  }, [reposWithCommits]);

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-header-main">
          <h2 className="panel-title">Report</h2>
          <p className="panel-description">
            Your commit history across selected repositories
          </p>
        </div>
        {reposWithCommits.length > 0 && (
          <div className="panel-header-actions">
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
            {onSaveReport && (
              <button
                className="btn btn-primary btn-sm"
                onClick={onSaveReport}
                disabled={isSavingReport}
              >
                {isSavingReport ? (
                  <>
                    <div className="spinner-sm" /> Saving...
                  </>
                ) : (
                  <>
                    <DownloadIcon /> Save DOCX
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="panel-content panel-content-scroll">
        {isLoading ? (
          <div className="panel-empty">
            <div className="spinner-lg" />
            <h3>Generating report...</h3>
            <p>Fetching commits from selected repositories</p>
          </div>
        ) : error ? (
          <div className="panel-empty panel-error">
            <XCircleIcon />
            <h3>Error generating report</h3>
            <p>{error}</p>
          </div>
        ) : !hasGenerated ? (
          <div className="panel-empty">
            <FileTextIcon />
            <h3>No report yet</h3>
            <p>
              Select repositories and click "Generate Report" to see your
              commits
            </p>
          </div>
        ) : reposWithCommits.length === 0 ? (
          <div className="panel-empty">
            <SearchIcon />
            <h3>No commits found</h3>
            <p>Try selecting a different date range or more repositories</p>
          </div>
        ) : (
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
        )}
      </div>

      {reposWithCommits.length > 0 && (
        <div className="panel-footer">
          <span className="panel-footer-info">
            <strong>{totalCommits}</strong> commits in{" "}
            <strong>{reposWithCommits.length}</strong> repositories
          </span>
        </div>
      )}
    </div>
  );
}
