import { GitBranchIcon, FileTextIcon, SettingsIcon } from "./Icons";

export type View = "repositories" | "reports" | "config";

interface SidebarProps {
  activeView: View;
  onViewChange: (view: View) => void;
  repoCount: number;
  reportsCount?: number;
}

export function Sidebar({
  activeView,
  onViewChange,
  repoCount,
  reportsCount,
}: SidebarProps) {
  const navItems: {
    id: View;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: "repositories",
      label: "Repositories",
      icon: <GitBranchIcon />,
      badge: repoCount || undefined,
    },
    {
      id: "reports",
      label: "Reports",
      icon: <FileTextIcon />,
      badge: reportsCount || undefined,
    },
    { id: "config", label: "Settings", icon: <SettingsIcon /> },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-title">Copyrightable Works</h1>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeView === item.id ? "active" : ""}`}
            onClick={() => onViewChange(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {item.badge !== undefined && (
              <span className="nav-badge">{item.badge}</span>
            )}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <span className="version">v1.0.0</span>
      </div>
    </aside>
  );
}
