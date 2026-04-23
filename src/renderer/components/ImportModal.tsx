import { FolderOpenIcon, XCircleIcon } from "./Icons";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (directory: string) => void;
  isScanning: boolean;
  selectedDirectory: string;
  onBrowse: () => void;
  scanError: string | null;
  foundCount: number;
}

export function ImportModal({
  isOpen,
  onClose,
  onImport,
  isScanning,
  selectedDirectory,
  onBrowse,
  scanError,
  foundCount,
}: ImportModalProps) {
  if (!isOpen) return null;

  const canImport = Boolean(selectedDirectory) && !isScanning;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Import Repositories</h2>
          <button className="modal-close" onClick={onClose}>
            <XCircleIcon />
          </button>
        </div>

        <div className="modal-content">
          <p className="modal-description">
            Select a folder to scan for Git repositories
          </p>

          <div className="scan-area">
            {!selectedDirectory ? (
              <div className="scan-empty" onClick={onBrowse}>
                <div className="scan-empty-icon">
                  <FolderOpenIcon />
                </div>
                <h3>Select a Directory</h3>
                <p>Click here to choose a folder to scan</p>
              </div>
            ) : (
              <div className="scan-selected">
                <div className="scan-directory">
                  <span className="scan-directory-label">
                    Selected Directory
                  </span>
                  <span className="scan-directory-path">
                    {selectedDirectory}
                  </span>
                </div>
                {foundCount > 0 && (
                  <div className="scan-result">
                    <span className="scan-result-count">{foundCount}</span>
                    <span className="scan-result-label">
                      repositories will be imported
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {scanError && (
            <div className="modal-error">
              <XCircleIcon />
              <span>{scanError}</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-outline"
            onClick={onBrowse}
            disabled={isScanning}
          >
            {selectedDirectory ? "Change" : "Browse"}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onImport(selectedDirectory)}
            disabled={!canImport}
          >
            {isScanning ? (
              <>
                <span className="spinner" />
                Scanning...
              </>
            ) : (
              "Import"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
