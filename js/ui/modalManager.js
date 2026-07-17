const ModalManager = {
  // Container logic
  getContainer: () => {
    let container = document.getElementById('modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'modal-container';
      document.body.appendChild(container);
    }
    return container;
  },

  // Generic modal creator
  showModal: (type, data, config = {}) => {
    const container = ModalManager.getContainer();
    
    // Clear previous modals if they are generic ones (or just stack them)
    // For now, let's just clear the container or append
    container.innerHTML = ''; 

    const modalHTML = `
      <div class="modal request-${type}-modal modal-responsive" id="dynamicModal" style="display: flex;">
        <div class="modal-body" style="padding: 24px; text-align: center;">
          <div style="font-size: 56px; margin-bottom: 16px;">
            ${config.icon || (type === 'success' ? '🎉' : type === 'reject' ? '❌' : 'ℹ️')}
          </div>
          <h3 style="margin-bottom: 12px; color: ${config.titleColor || (type === 'success' ? '#00e676' : type === 'reject' ? '#ff5c5c' : '#fff')};">
            ${data.title || 'Thông báo'}
          </h3>
          <p style="margin-bottom: 24px; opacity: 0.8; line-height: 1.5;">
            ${data.message || ''}
          </p>
          ${data.details ? ModalManager.renderDetails(data.details) : ''}
          <button class="btn primary-btn" id="dynamicModalCloseBtn" style="width: 100%; margin-top: 16px;">
            ${config.btnText || 'Đóng'}
          </button>
        </div>
      </div>
    `;

    container.innerHTML = modalHTML;

    // Attach event listener to close
    document.getElementById('dynamicModalCloseBtn').addEventListener('click', () => {
      ModalManager.closeModal();
      if (typeof config.onClose === 'function') {
        config.onClose();
      }
    });
  },

  renderDetails: (details) => {
    if (!details || details.length === 0) return '';
    let html = '<div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; text-align: left; margin-bottom: 20px;">';
    details.forEach(item => {
      html += `
        <div class="req-detail-row">
          <span>${item.label}</span>
          <span class="mono-text">${item.value}</span>
        </div>
      `;
    });
    html += '</div>';
    return html;
  },

  closeModal: () => {
    const container = document.getElementById('modal-container');
    if (container) {
      container.innerHTML = '';
    }
  }
};
