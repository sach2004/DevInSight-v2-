/**
 * Simple toast notification utility
 */

// Toast types
const TOAST_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
  };
  
  // Toast type to color mapping
  const TOAST_COLORS = {
    [TOAST_TYPES.SUCCESS]: 'bg-green-500',
    [TOAST_TYPES.ERROR]: 'bg-red-500',
    [TOAST_TYPES.WARNING]: 'bg-yellow-500',
    [TOAST_TYPES.INFO]: 'bg-blue-500',
  };
  
  // Toast icons
  const TOAST_ICONS = {
    [TOAST_TYPES.SUCCESS]: '✅',
    [TOAST_TYPES.ERROR]: '❌',
    [TOAST_TYPES.WARNING]: '⚠️',
    [TOAST_TYPES.INFO]: 'ℹ️',
  };
  
  /**
   * Show a toast notification
   * @param {string} message - Toast message
   * @param {string} type - Toast type (success, error, warning, info)
   * @param {number} duration - Duration in milliseconds
   */
  export function showToast(message, type = TOAST_TYPES.INFO, duration = 3000) {
    // Get toast container
    const container = document.getElementById('toast-container');
    
    if (!container) {
      console.error('Toast container not found');
      return;
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `flex items-center p-3 mb-3 rounded-lg shadow-lg ${TOAST_COLORS[type]} text-white transform transition-all duration-300 translate-x-full`;
    toast.innerHTML = `
      <div class="mr-2 text-xl">${TOAST_ICONS[type]}</div>
      <div class="flex-1">${message}</div>
    `;
    
    // Add to container
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
      toast.classList.remove('translate-x-full');
    }, 10);
    
    // Auto-remove after duration
    setTimeout(() => {
      toast.classList.add('translate-x-full');
      toast.classList.add('opacity-0');
      
      // Remove from DOM after animation
      setTimeout(() => {
        container.removeChild(toast);
      }, 300);
    }, duration);
  }
  
  // Export toast types and function
  export { TOAST_TYPES };