import { FolderOpenIcon } from "./Icons";

interface ScanPanelProps {
  selectedDirectory: string;
  isScanning: boolean;
  repositoryCount: number;
  onBrowse: () => void;
  onScan: () => void;
}

export function ScanPanel({
  selectedDirectory,
  isScanning,
  repositoryCount,
  onBrowse,
  onScan,
}: ScanPanelProps) {
  const canScan = Boolean(selectedDirectory) && !isScanning;

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">Scan Directory</h2>
        <p className="panel-description">
          Select a folder to scan for Git repositories containing your commits
        </p>
      </div>

      <div className="panel-content">
        <div className="scan-area">
          {!selectedDirectory ? (
            <div className="scan-empty" onClick={onBrowse}>
              <div className="scan-empty-icon">
                <FolderOpenIcon />
              </div>
              <h3>Select a Directory</h3>
              <p>Click here or use the button below to choose a folder</p>
            </div>
          ) : (
            <div className="scan-selected">
              <div className="scan-directory">
                <span className="scan-directory-label">Selected Directory</span>
                <span className="scan-directory-path">{selectedDirectory}</span>
              </div>
              {repositoryCount > 0 && (
                <div className="scan-result">
                  <span className="scan-result-count">{repositoryCount}</span>
                  <span className="scan-result-label">repositories found</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="scan-actions">
          <button
            className="btn btn-outline"
            onClick={onBrowse}
            disabled={isScanning}
          >
            {selectedDirectory ? "Change Directory" : "Browse"}
          </button>
          <button
            className="btn btn-primary"
            onClick={onScan}
            disabled={!canScan}
          >
            {isScanning ? (
              <>
                <span className="spinner" />
                Scanning...
              </>
            ) : (
              "Start Scan"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
