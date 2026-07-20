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
    
    container.innerHTML = ''; 

    const titleColor = config.titleColor || (type === 'success' ? '#00e676' : type === 'reject' ? '#ff5c5c' : '#fff');
    const icon = config.icon || (type === 'success' ? '🎉' : type === 'reject' ? '❌' : 'ℹ️');

    // Button style
    const btnStyle = config.btnStyle || (type === 'success' ? 'background: linear-gradient(135deg, #ff7e5f, #feb47b); border: none; color: white;' : 'background: #333; color: white;');

    const modalHTML = `
      <div class="modal-overlay" id="dynamicModalOverlay" style="display: flex; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 10000; padding: 20px;">
        <div class="modal request-${type}-modal" id="dynamicModal" style="background: #151928; border-radius: 16px; max-width: 460px; width: 100%; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column;">
          <div class="modal-body" style="padding: 24px; text-align: center; position: relative;">
            
            <!-- Refresh Icon at top left (Optional) -->
            <div style="position: absolute; top: 16px; left: 16px; background: rgba(255,255,255,0.1); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer;" onclick="ModalManager.closeModal()">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.21l5.67-5.67"/></svg>
            </div>

            <div style="font-size: 56px; margin-bottom: 16px; animation: confirmPop 0.4s cubic-bezier(0.34,1.56,0.64,1);">
              ${icon}
            </div>
            
            <h3 style="margin-bottom: 12px; font-size: 20px; font-weight: 800; color: ${titleColor}; letter-spacing: 0.5px;">
              ${(data.title || 'THÔNG BÁO').toUpperCase()}
            </h3>
            
            ${data.message ? `<p style="margin-bottom: 12px; font-size: 14px; color: #fff; line-height: 1.5;">${data.message}</p>` : ''}
            
            ${data.warning ? `<p style="margin-bottom: 24px; font-size: 13px; color: #ffbe00; font-weight: 600; text-align: center; line-height: 1.5;">${data.warning}</p>` : ''}
            
            ${data.details ? ModalManager.renderDetails(data.details) : ''}
            
            <button class="btn btn-full btn-xl" id="dynamicModalCloseBtn" style="width: 100%; margin-top: 16px; padding: 14px; border-radius: 8px; font-weight: bold; font-size: 15px; cursor: pointer; transition: transform 0.2s; ${btnStyle}">
              ${config.btnText || '✓ Đóng và về trang chủ'}
            </button>
          </div>
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
    let html = '<div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); padding: 14px; border-radius: 8px; text-align: left; margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px;">';
    details.forEach(item => {
      const valueColor = item.isHighlight ? '#ffbe00' : (item.valueColor || '#fff');
      const valueWeight = item.isHighlight ? '700' : '500';
      
      if (item.isLongText) {
        html += `
          <div style="display:flex; flex-direction:column; gap:4px; font-size:12px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 6px;">
            <span style="color:#aaa">${item.label}</span>
            <span style="color:${valueColor}; background:rgba(0,0,0,0.2); padding:6px 8px; border-radius:4px; margin-top:2px;">${item.value}</span>
          </div>
        `;
      } else {
        html += `
          <div style="display:flex; justify-content:space-between; font-size:12px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 6px;">
            <span style="color:#aaa">${item.label}</span>
            <span style="color:${valueColor}; font-weight:${valueWeight};">${item.value}</span>
          </div>
        `;
      }
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
