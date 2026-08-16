// Notifications éphémères de L'Antre.
// Le message peut contenir du texte venu d'une source externe : il est donc
// inséré via textContent, jamais via innerHTML.

const ICONS = {
  success: 'check-circle',
  error: 'exclamation-circle',
  warning: 'exclamation-triangle',
  info: 'info-circle'
};

let notificationHost = null;

function ensureHost() {
  if (notificationHost && document.body.contains(notificationHost)) return notificationHost;
  notificationHost = document.createElement('div');
  notificationHost.className = 'notification-host';
  notificationHost.setAttribute('role', 'status');
  notificationHost.setAttribute('aria-live', 'polite');
  document.body.appendChild(notificationHost);
  return notificationHost;
}

/**
 * Affiche une notification temporaire.
 * @param {string} message texte affiché
 * @param {'success'|'error'|'warning'|'info'} type
 */
function showNotification(message, type = 'info') {
  const host = ensureHost();

  const notification = document.createElement('div');
  notification.className = `notification ${type}`;

  const icon = document.createElement('i');
  icon.className = `fas fa-${ICONS[type] || ICONS.info}`;
  icon.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.textContent = message;

  notification.append(icon, label);
  host.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 500);
  }, 5000);

  return notification;
}

if (typeof window !== 'undefined') window.showNotification = showNotification;
