import { useState, useMemo } from "react";
import type { GithubRepository } from "../../shared/types";
import {
  SettingsIcon,
  AlertCircleIcon,
  CheckIcon,
  SearchIcon,
  PlusIcon,
  TrashIcon,
  GitBranchIcon,
  XCircleIcon,
} from "./Icons";

interface RepositoriesPanelProps {
  activeRepos: GithubRepository[];
  availableRepos: GithubRepository[];
  isLoadingAvailable: boolean;
  hasOrgsConfigured: boolean;
  isGenerating: boolean;
  canGenerate: boolean;
  onAddRepo: (repo: GithubRepository) => void;
  onRemoveRepo: (fullName: string) => void;
  onGenerateReport: () => void;
}

export function RepositoriesPanel({
  activeRepos,
  availableRepos,
  isLoadingAvailable,
  hasOrgsConfigured,
  isGenerating,
  canGenerate,
  onAddRepo,
  onRemoveRepo,
  onGenerateReport,
}: RepositoriesPanelProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");

  const activeSet = useMemo(
    () => new Set(activeRepos.map((r) => r.fullName)),
    [activeRepos],
  );

  const filteredAvailable = useMemo(() => {
    const q = search.trim().toLowerCase();
    return availableRepos.filter((r) => {
      if (activeSet.has(r.fullName)) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.fullName.toLowerCase().includes(q)
      );
    });
  }, [availableRepos, activeSet, search]);

  if (!hasOrgsConfigured) {
    return (
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Repositories</h2>
          <p className="panel-description">Manage repositories for reports</p>
        </div>
        <div className="panel-content">
          <div className="panel-empty">
            <SettingsIcon />
            <h3>No Organizations Configured</h3>
            <p>
              Go to <strong>Settings</strong>, connect your GitHub account, then
              select the organizations to load repositories from.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-header-main">
          <h2 className="panel-title">Repositories</h2>
          <p className="panel-description">
            {activeRepos.length === 0
              ? "Add repositories to include in your reports"
              : `${activeRepos.length} active ${activeRepos.length === 1 ? "repository" : "repositories"}`}
          </p>
        </div>
        <div className="panel-header-actions">
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              setPickerOpen((v) => !v);
              setSearch("");
            }}
          >
            <PlusIcon />
            Add Repositories
          </button>
        </div>
      </div>

      {/* ── Picker ──────────────────────────────────────────────────────────── */}
      {pickerOpen && (
        <div className="repo-picker">
          <div className="repo-picker-header">
            <div className="repo-search">
              <SearchIcon />
              <input
                type="text"
                className="repo-search-input"
                placeholder="Search available repositories…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            <button
              className="btn btn-ghost btn-sm btn-icon"
              onClick={() => setPickerOpen(false)}
              title="Close"
            >
              <XCircleIcon />
            </button>
          </div>

          <div className="repo-picker-list">
            {isLoadingAvailable ? (
              <div className="repo-picker-empty">
                <div className="spinner" />
                Loading…
              </div>
            ) : filteredAvailable.length === 0 ? (
              <div className="repo-picker-empty">
                {search
                  ? `No results for "${search}"`
                  : availableRepos.length === 0
                    ? "No repositories found in selected organizations"
                    : "All available repositories are already active"}
              </div>
            ) : (
              filteredAvailable.map((repo) => (
                <button
                  key={repo.fullName}
                  className="repo-picker-item"
                  onClick={() => {
                    onAddRepo(repo);
                  }}
                >
                  <div className="repo-picker-item-icon">
                    <GitBranchIcon />
                  </div>
                  <div className="repo-picker-item-info">
                    <span className="repo-picker-item-name">{repo.name}</span>
                    <span className="repo-picker-item-org">{repo.org}</span>
                  </div>
                  <div className="repo-picker-item-add">
                    <PlusIcon />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Active repos list ─────────────────────────────────────────────── */}
      <div className="panel-content panel-content-scroll">
        {activeRepos.length === 0 ? (
          <div className="panel-empty">
            <AlertCircleIcon />
            <h3>No Active Repositories</h3>
            <p>
              Click <strong>Add Repositories</strong> to select repositories for
              your reports.
            </p>
          </div>
        ) : (
          <div className="active-repo-list">
            {activeRepos.map((repo) => (
              <div key={repo.fullName} className="active-repo-item">
                <div className="active-repo-item-icon">
                  <CheckIcon />
                </div>
                <div className="active-repo-item-info">
                  <span className="active-repo-item-name">{repo.name}</span>
                  <span className="active-repo-item-org">
                    {repo.org} &middot; {repo.private ? "Private" : "Public"}
                  </span>
                </div>
                <button
                  className="btn btn-ghost btn-sm btn-icon btn-danger"
                  onClick={() => onRemoveRepo(repo.fullName)}
                  title="Remove"
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel-footer">
        <span className="panel-footer-info">
          {activeRepos.length > 0 ? (
            <>
              Report will include{" "}
              <strong>{activeRepos.length}</strong>{" "}
              {activeRepos.length === 1 ? "repository" : "repositories"}
            </>
          ) : (
            "No active repositories"
          )}
        </span>
        <button
          className="btn btn-primary"
          onClick={onGenerateReport}
          disabled={!canGenerate || isGenerating}
        >
          {isGenerating ? (
            <>
              <span className="spinner" />
              Generating...
            </>
          ) : (
            "Generate Report"
          )}
        </button>
      </div>
    </div>
  );
}


