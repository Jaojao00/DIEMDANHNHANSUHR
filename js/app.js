// ENTRY POINT ỨNG DỤNG AGARI HR (APP.JS - V78)
const App = {
  clockTimer: null,

  init() {
    this.startRealtimeClock();
    this.initServiceWorker();
    this.initTheme();
    this.bindGlobalEvents();

    // Khởi tạo các module con
    FirebaseService.init();
    EmployeeModule.init();
    AdminCore.init();
    AdminUI.init();
    AdminSalary.init();
    AdminBooking.init();
    AdminRequests.init();
    AdminRegistration.init();
    AdminManager.init();
    RegApp.init();

    // Tải dữ liệu ban đầu cho ca mặc định
    DataManager.loadRoster(CONFIG.SHIFTS[0].id);

    console.log(`[Agari HR] Ứng dụng đã khởi chạy thành công phiên bản ${CONFIG.VERSION}`);
  },

  /**
   * Đồng hồ thời gian thực hiển thị chuẩn múi giờ Asia/Ho_Chi_Minh
   */
  startRealtimeClock() {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('vi-VN', {
        timeZone: CONFIG.TIMEZONE,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const dateStr = now.toLocaleDateString('vi-VN', {
        timeZone: CONFIG.TIMEZONE,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const clockEl = document.getElementById('realtimeClockDisplay');
      const dateEl = document.getElementById('realtimeDateDisplay');

      if (clockEl) clockEl.textContent = timeStr;
      if (dateEl) dateEl.textContent = dateStr;
    };

    updateTime();
    this.clockTimer = setInterval(updateTime, 1000);
  },

  /**
   * Khởi tạo Service Worker quản lý offline cache (PWA)
   */
  initServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('./sw.js')
          .then((reg) => {
            console.log('[PWA] Service Worker registered:', reg.scope);
          })
          .catch((err) => {
            console.warn('[PWA] Service Worker registration failed:', err);
          });
      });
    }
  },

  /**
   * Logic Theme tự động thay đổi theo tháng (Tháng 10: Autumn Gold, Tháng 11: Late Autumn)
   */
  initTheme() {
    const currentMonth = new Date().getMonth() + 1; // 10 hoặc 11
    const body = document.body;
    if (currentMonth === 10) {
      body.classList.add('theme-autumn-gold');
    } else if (currentMonth === 11) {
      body.classList.add('theme-late-autumn');
    }
  },

  bindGlobalEvents() {
    // Nút mở các modal
    document.querySelectorAll('[data-open-modal]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const modalId = e.currentTarget.dataset.openModal;
        this.openModal(modalId);
      });
    });

    // Nút đóng modal
    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const modalId = e.currentTarget.dataset.closeModal;
        this.closeModal(modalId);
      });
    });

    // Bấm phím ESC để đóng modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const activeModals = document.querySelectorAll('.custom-modal-backdrop.active');
        activeModals.forEach((m) => m.classList.remove('active'));
      }
    });

    // Chuyển đổi giữa Chế độ Nhân viên và Admin Portal
    const btnSwitchToAdmin = document.getElementById('btnSwitchToAdmin');
    const btnSwitchToEmployee = document.getElementById('btnSwitchToEmployee');

    if (btnSwitchToAdmin) {
      btnSwitchToAdmin.addEventListener('click', () => {
        document.getElementById('viewEmployeePortal')?.classList.add('hidden');
        document.getElementById('viewAdminPortal')?.classList.remove('hidden');
        AdminCore.checkSession();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    if (btnSwitchToEmployee) {
      btnSwitchToEmployee.addEventListener('click', () => {
        document.getElementById('viewAdminPortal')?.classList.add('hidden');
        document.getElementById('viewEmployeePortal')?.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }
};

// Khởi chạy khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

if (typeof window !== 'undefined') {
  window.App = App;
}
