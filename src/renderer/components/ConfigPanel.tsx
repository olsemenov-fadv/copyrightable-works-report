import { useState } from "react";
import type { AppConfig, GithubUserInfo, GithubOrg } from "../../shared/types";
import { UserIcon, UserCheckIcon, AlertCircleIcon, CheckIcon } from "./Icons";

interface ConfigPanelProps {
  config: AppConfig;
  connectedGithubUser: GithubUserInfo | null;
  savedOrgs: GithubOrg[];
  isConnecting: boolean;
  isRefreshingOrgs: boolean;
  onSaveConfig: (config: Partial<AppConfig>) => Promise<void>;
  onSavePat: (pat: string) => Promise<void>;
  onToggleOrg: (login: string, selected: boolean) => Promise<void>;
  onRefreshOrgs: () => Promise<void>;
}

export function ConfigPanel({
  config,
  connectedGithubUser,
  savedOrgs,
  isConnecting,
  isRefreshingOrgs,
  onSaveConfig,
  onSavePat,
  onToggleOrg,
  onRefreshOrgs,
}: ConfigPanelProps) {
  const [approver, setApprover] = useState(config.approver || "");
  const [pat, setPat] = useState("");
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      await onSaveConfig({ approver });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleConnectGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pat.trim()) return;
    await onSavePat(pat.trim());
    setPat("");
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">Settings</h2>
        <p className="panel-description">Configure your report preferences</p>
      </div>

      <div className="panel-content panel-content-scroll">
        {/* Report Settings */}
        <div className="config-section">
          <h3 className="config-section-title">Report Settings</h3>
          <form onSubmit={handleSaveConfig}>
            <div className="config-card">
              <div className="config-item">
                <div className="config-icon">
                  <UserCheckIcon />
                </div>
                <div className="config-details">
                  <span className="config-label">Approver Name</span>
                  <input
                    type="text"
                    className="config-input config-input-wide"
                    placeholder="Full name of the approver"
                    value={approver}
                    onChange={(e) => setApprover(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div
              style={{
                marginTop: "0.75rem",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSavingConfig}
              >
                {isSavingConfig ? (
                  <>
                    <span className="spinner" />
                    Saving...
                  </>
                ) : (
                  "Save Settings"
                )}
              </button>
            </div>
          </form>
        </div>

        {/* GitHub Integration */}
        <div className="config-section">
          <h3 className="config-section-title">GitHub Integration</h3>

          {connectedGithubUser && (
            <div className="config-card" style={{ marginBottom: "0.75rem" }}>
              <div className="config-item">
                <div className="config-icon">
                  <CheckIcon />
                </div>
                <div className="config-details">
                  <span className="config-label">Connected Account</span>
                  <span className="config-value">
                    {connectedGithubUser.login}
                    {connectedGithubUser.name && (
                      <span
                        className="config-empty"
                        style={{ marginLeft: "0.5rem" }}
                      >
                        ({connectedGithubUser.name})
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleConnectGithub}>
            <div className="config-card">
              <div className="config-item">
                <div className="config-icon">
                  <UserIcon />
                </div>
                <div className="config-details">
                  <span className="config-label">
                    {connectedGithubUser
                      ? "Update Personal Access Token"
                      : "Personal Access Token"}
                  </span>
                  <input
                    type="password"
                    className="config-input config-input-wide"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={pat}
                    onChange={(e) => setPat(e.target.value)}
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>
            <div className="config-hint">
              <p>
                Requires <code>repo</code> and <code>read:org</code> scopes. The
                token is encrypted and stored on your device.
              </p>
            </div>
            <div
              style={{
                marginTop: "0.75rem",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isConnecting || !pat.trim()}
              >
                {isConnecting ? (
                  <>
                    <span className="spinner" />
                    Connecting...
                  </>
                ) : connectedGithubUser ? (
                  "Update Token"
                ) : (
                  "Connect GitHub"
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Organizations */}
        {connectedGithubUser && (
          <div className="config-section">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
              }}
            >
              <h3 className="config-section-title" style={{ marginBottom: 0 }}>
                Organizations
              </h3>
              <button
                className="btn btn-ghost btn-sm"
                onClick={onRefreshOrgs}
                disabled={isRefreshingOrgs}
                type="button"
              >
                {isRefreshingOrgs ? (
                  <>
                    <span className="spinner" />
                    Refreshing...
                  </>
                ) : (
                  "Refresh"
                )}
              </button>
            </div>

            {savedOrgs.length === 0 ? (
              <div className="panel-empty" style={{ minHeight: "120px" }}>
                <AlertCircleIcon />
                <p>No organizations found for this account.</p>
              </div>
            ) : (
              <div className="config-card">
                {savedOrgs.map((org, i) => (
                  <label
                    key={org.login}
                    className={`config-item${i > 0 ? " config-divider" : ""}`}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="config-icon">
                      <input
                        type="checkbox"
                        checked={org.selected}
                        onChange={(e) =>
                          onToggleOrg(org.login, e.target.checked)
                        }
                        style={{ width: "16px", height: "16px" }}
                      />
                    </div>
                    <div className="config-details">
                      <span className="config-value">{org.login}</span>
                      {org.description && (
                        <span className="config-empty">{org.description}</span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface ConfigPanelProps {
  config: AppConfig;
  connectedGithubUser: GithubUserInfo | null;
  savedOrgs: GithubOrg[];
  isConnecting: boolean;
  isRefreshingOrgs: boolean;
  onSaveConfig: (config: Partial<AppConfig>) => Promise<void>;
  onSavePat: (pat: string) => Promise<void>;
  onToggleOrg: (login: string, selected: boolean) => Promise<void>;
  onRefreshOrgs: () => Promise<void>;
}
