

const TOAST_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
  };
  
  
  const TOAST_COLORS = {
    [TOAST_TYPES.SUCCESS]: 'bg-green-500',
    [TOAST_TYPES.ERROR]: 'bg-red-500',
    [TOAST_TYPES.WARNING]: 'bg-yellow-500',
    [TOAST_TYPES.INFO]: 'bg-blue-500',
  };
  
 
  const TOAST_ICONS = {
    [TOAST_TYPES.SUCCESS]: '✅',
    [TOAST_TYPES.ERROR]: '❌',
    [TOAST_TYPES.WARNING]: '⚠️',
    [TOAST_TYPES.INFO]: 'ℹ️',
  };
  
  /**
   
   * @param {string} message 
   * @param {string} type 
   * @param {number} duration
   */
  export function showToast(message, type = TOAST_TYPES.INFO, duration = 3000) {
  
    const container = document.getElementById('toast-container');
    
    if (!container) {
      console.error('Toast container not found');
      return;
    }
    
   
    const toast = document.createElement('div');
    toast.className = `flex items-center p-3 mb-3 rounded-lg shadow-lg ${TOAST_COLORS[type]} text-white transform transition-all duration-300 translate-x-full`;
    toast.innerHTML = `
      <div class="mr-2 text-xl">${TOAST_ICONS[type]}</div>
      <div class="flex-1">${message}</div>
    `;
    
    
    container.appendChild(toast);
    
    
    setTimeout(() => {
      toast.classList.remove('translate-x-full');
    }, 10);
    
    
    setTimeout(() => {
      toast.classList.add('translate-x-full');
      toast.classList.add('opacity-0');
      
      
      setTimeout(() => {
        container.removeChild(toast);
      }, 300);
    }, duration);
  }
  
  
  export { TOAST_TYPES };