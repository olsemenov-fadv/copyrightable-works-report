import { useState, useEffect } from "react";
import type { GitUserConfig } from "../../shared/types";
import { UserIcon, MailIcon, CalendarIcon, UserCheckIcon } from "./Icons";

interface ConfigPanelProps {
  gitConfig: GitUserConfig | null;
  sinceDate: string;
  approver: string;
  onSinceDateChange: (date: string) => void;
  onApproverChange: (approver: string) => void;
}

export function ConfigPanel({
  gitConfig,
  sinceDate,
  approver,
  onSinceDateChange,
  onApproverChange,
}: ConfigPanelProps) {
  const [localApprover, setLocalApprover] = useState(approver);

  useEffect(() => {
    setLocalApprover(approver);
  }, [approver]);

  const handleApproverBlur = () => {
    if (localApprover !== approver) {
      onApproverChange(localApprover);
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">Settings</h2>
        <p className="panel-description">
          Configure your Git identity and default options
        </p>
      </div>

      <div className="panel-content">
        <div className="config-section">
          <h3 className="config-section-title">Git Identity</h3>
          <p className="config-section-description">
            These values are read from your global Git configuration
          </p>

          <div className="config-card">
            <div className="config-item">
              <div className="config-icon">
                <UserIcon />
              </div>
              <div className="config-details">
                <span className="config-label">Author Name</span>
                <span className="config-value">
                  {gitConfig?.name || (
                    <span className="config-empty">Not configured</span>
                  )}
                </span>
              </div>
            </div>

            <div className="config-divider" />

            <div className="config-item">
              <div className="config-icon">
                <MailIcon />
              </div>
              <div className="config-details">
                <span className="config-label">Email Address</span>
                <span className="config-value">
                  {gitConfig?.email || (
                    <span className="config-empty">Not configured</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {!gitConfig?.name && !gitConfig?.email && (
            <div className="config-hint">
              <p>
                To set your Git identity, run these commands in your terminal:
              </p>
              <code className="config-code">
                git config --global user.name "Your Name"
                <br />
                git config --global user.email "your@email.com"
              </code>
            </div>
          )}
        </div>

        <div className="config-section">
          <h3 className="config-section-title">Report Options</h3>
          <p className="config-section-description">
            Configure default options for generating reports
          </p>

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
                  placeholder="Enter approver name for reports"
                  value={localApprover}
                  onChange={(e) => setLocalApprover(e.target.value)}
                  onBlur={handleApproverBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleApproverBlur();
                    }
                  }}
                />
              </div>
            </div>

            <div className="config-divider" />

            <div className="config-item">
              <div className="config-icon">
                <CalendarIcon />
              </div>
              <div className="config-details">
                <span className="config-label">Default Start Date</span>
                <input
                  type="date"
                  className="config-input"
                  value={sinceDate}
                  onChange={(e) => onSinceDateChange(e.target.value)}
                />
              </div>
            </div>
          </div>

          {!approver && (
            <div className="config-hint config-hint-warning">
              <p>
                ⚠️ The approver name is required for generating reports. Please
                enter the name of the person who will approve your work.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
