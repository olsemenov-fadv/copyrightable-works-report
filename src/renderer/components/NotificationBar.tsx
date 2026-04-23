import { XCircleIcon } from "./Icons";

interface NotificationBarProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}

export function NotificationBar({
  message,
  actionLabel,
  onAction,
  onDismiss,
}: NotificationBarProps) {
  return (
    <div className="notification-bar">
      <span className="notification-message">{message}</span>
      <div className="notification-actions">
        {actionLabel && onAction && (
          <button className="notification-link" onClick={onAction}>
            {actionLabel}
          </button>
        )}
        {onDismiss && (
          <button
            className="notification-dismiss"
            onClick={onDismiss}
            title="Dismiss"
          >
            <XCircleIcon />
          </button>
        )}
      </div>
    </div>
  );
}
