import { useEffect } from 'react';
import AppIcon from './AppIcon';
import './NotificationsCenter.css';

const SEVERITY_LABELS = {
  critical: 'Urgente',
  warning: 'Atención',
  info: 'Información',
};

export default function NotificationsCenter({
  open,
  notifications = [],
  reviewedIds = [],
  loading = false,
  error = '',
  onClose,
  onRefresh,
  onMarkAllReviewed,
  onSelect,
}) {
  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose?.();
      }
    }

    window.document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const reviewed = new Set(reviewedIds);
  const newCount = notifications.filter(
    (notification) => !reviewed.has(notification.id)
  ).length;

  return (
    <div
      className="notifications-center-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <aside
        className="notifications-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notifications-center-title"
      >
        <header className="notifications-center-header">
          <div>
            <span>Centro de actividad</span>
            <h3 id="notifications-center-title">Notificaciones</h3>
            <p>
              {notifications.length === 0
                ? 'No hay asuntos pendientes.'
                : `${notifications.length} asunto${
                    notifications.length === 1 ? '' : 's'
                  } pendiente${notifications.length === 1 ? '' : 's'}`}
              {newCount > 0
                ? ` · ${newCount} nuevo${newCount === 1 ? '' : 's'}`
                : ''}
            </p>
          </div>

          <div className="notifications-center-header-actions">
            <button
              type="button"
              className="notifications-refresh-button"
              onClick={onRefresh}
              disabled={loading}
              aria-label="Actualizar notificaciones"
              title="Actualizar"
            >
              <AppIcon name="arrow" size={17} />
            </button>

            <button
              type="button"
              className="notifications-close-button"
              onClick={onClose}
              aria-label="Cerrar notificaciones"
            >
              <AppIcon name="close" size={18} />
            </button>
          </div>
        </header>

        {newCount > 0 && (
          <button
            type="button"
            className="notifications-mark-reviewed"
            onClick={onMarkAllReviewed}
          >
            Marcar todas como revisadas
          </button>
        )}

        <div className="notifications-center-content" aria-live="polite">
          {loading && notifications.length === 0 ? (
            <div className="notifications-center-state">
              <span className="notifications-loading-dot" />
              Revisando cotizaciones, pagos y documentos...
            </div>
          ) : error && notifications.length === 0 ? (
            <div className="notifications-center-state is-error">
              <strong>No se pudieron cargar las notificaciones.</strong>
              <span>{error}</span>
              <button type="button" onClick={onRefresh}>
                Reintentar
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="notifications-center-state is-empty">
              <AppIcon name="bell" size={28} />
              <strong>Todo está al día</strong>
              <span>
                Aquí aparecerán seguimientos, cobros, eventos próximos y
                documentos pendientes.
              </span>
            </div>
          ) : (
            <div className="notifications-list">
              {notifications.map((notification) => {
                const isNew = !reviewed.has(notification.id);
                const actionLabel = notification.action?.label || 'Abrir';

                return (
                  <article
                    key={notification.id}
                    className={`notification-card severity-${
                      notification.severity || 'info'
                    } ${isNew ? 'is-new' : ''}`}
                  >
                    <div className="notification-card-icon">
                      <AppIcon
                        name={notification.icon || 'bell'}
                        size={18}
                      />
                    </div>

                    <div className="notification-card-body">
                      <div className="notification-card-heading">
                        <span>
                          {SEVERITY_LABELS[notification.severity] ||
                            SEVERITY_LABELS.info}
                        </span>
                        {isNew && <i aria-label="Nueva" />}
                      </div>

                      <h4>{notification.title}</h4>
                      <p>{notification.description}</p>

                      <div className="notification-card-footer">
                        {notification.meta && (
                          <small>{notification.meta}</small>
                        )}

                        {notification.action && (
                          <button
                            type="button"
                            onClick={() => onSelect?.(notification)}
                          >
                            {actionLabel}
                            <AppIcon name="chevron" size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {error && notifications.length > 0 && (
          <div className="notifications-inline-error">
            No se pudo actualizar todo: {error}
          </div>
        )}
      </aside>
    </div>
  );
}
