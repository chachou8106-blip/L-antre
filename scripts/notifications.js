// Gestion des notifications dans l'application

/**
 * Affiche une notification temporaire à l'écran
 * @param {string} message - Le message à afficher
 * @param {string} type - Le type de notification (success, error, info)
 */
function showNotification(message, type = 'info') {
  // Créer l'élément de notification
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
    <span>${message}</span>
  `;
  
  // Ajouter la notification au body
  document.body.appendChild(notification);
  
  // Supprimer la notification après 5 secondes
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 500);
  }, 5000);
}

// Ajouter les styles pour les notifications si ce n'est pas déjà fait
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
  .notification {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background-color: #2d2d2d;
    color: #e0e0e0;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: 350px;
    animation: slideIn 0.3s ease-out;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }
  
  .notification.success {
    border-left: 4px solid #4caf50;
  }
  
  .notification.error {
    border-left: 4px solid #f44336;
  }
  
  .notification.info {
    border-left: 4px solid #2196f3;
  }
  
  .notification.fade-out {
    opacity: 0;
    transform: translateX(120%);
    transition: all 0.5s ease-out;
  }
  
  @keyframes slideIn {
    from {
      transform: translateX(120%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(notificationStyles);

// Exporter la fonction pour les autres scripts
window.showNotification = showNotification;
