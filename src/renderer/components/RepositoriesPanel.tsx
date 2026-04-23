import type { GitRepository } from "../../shared/types";
import {
  FolderIcon,
  SearchIcon,
  XCircleIcon,
  CheckIcon,
  TrashIcon,
  PlusIcon,
} from "./Icons";

interface RepositoriesPanelProps {
  repositories: GitRepository[];
  isLoading: boolean;
  error: string | null;
  hasScanned: boolean;
  onToggleSelection: (index: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onGenerateReport: () => void;
  isGeneratingReport: boolean;
  onImport: () => void;
  onRemoveRepository: (index: number) => void;
}

export function RepositoriesPanel({
  repositories,
  isLoading,
  error,
  hasScanned,
  onToggleSelection,
  onSelectAll,
  onDeselectAll,
  onGenerateReport,
  isGeneratingReport,
  onImport,
  onRemoveRepository,
}: RepositoriesPanelProps) {
  const selectedCount = repositories.filter((r) => r.selected).length;
  const canGenerate = selectedCount > 0 && !isGeneratingReport;

  const handleRemove = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    onRemoveRepository(index);
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-header-main">
          <h2 className="panel-title">Repositories</h2>
          <p className="panel-description">
            Select the repositories to include in your report
          </p>
        </div>
        <div className="panel-header-actions">
          <button className="btn btn-outline btn-sm" onClick={onImport}>
            <PlusIcon />
            Import
          </button>
          {repositories.length > 0 && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={onSelectAll}>
                Select All
              </button>
              <button className="btn btn-ghost btn-sm" onClick={onDeselectAll}>
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      <div className="panel-content panel-content-scroll">
        {isLoading ? (
          <div className="panel-empty">
            <div className="spinner-lg" />
            <h3>Scanning repositories...</h3>
            <p>This may take a moment depending on the directory size</p>
          </div>
        ) : error ? (
          <div className="panel-empty panel-error">
            <XCircleIcon />
            <h3>Error scanning directory</h3>
            <p>{error}</p>
          </div>
        ) : !hasScanned ? (
          <div className="panel-empty">
            <FolderIcon />
            <h3>No repositories yet</h3>
            <p>
              Click the "Import" button to scan a directory and find
              repositories
            </p>
          </div>
        ) : repositories.length === 0 ? (
          <div className="panel-empty">
            <SearchIcon />
            <h3>No repositories found</h3>
            <p>
              Try selecting a different directory or scanning a parent folder
            </p>
          </div>
        ) : (
          <div className="repo-grid">
            {repositories.map((repo, index) => (
              <div
                key={repo.path}
                className={`repo-card ${repo.selected ? "selected" : ""}`}
              >
                <button
                  className="repo-card-main"
                  onClick={() => onToggleSelection(index)}
                >
                  <div className="repo-card-check">
                    {repo.selected && <CheckIcon />}
                  </div>
                  <div className="repo-card-content">
                    <span className="repo-card-name">{repo.name}</span>
                    <span className="repo-card-path">{repo.path}</span>
                  </div>
                </button>
                <button
                  className="repo-card-remove"
                  onClick={(e) => handleRemove(e, index)}
                  title="Remove repository"
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {repositories.length > 0 && (
        <div className="panel-footer">
          <span className="panel-footer-info">
            {selectedCount} of {repositories.length} selected
          </span>
          <button
            className="btn btn-primary"
            onClick={onGenerateReport}
            disabled={!canGenerate}
          >
            {isGeneratingReport ? (
              <>
                <span className="spinner" />
                Generating...
              </>
            ) : (
              "Generate Report"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
