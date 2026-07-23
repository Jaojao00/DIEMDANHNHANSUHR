// ==========================================
// TIỆN ÍCH (UTILITIES)
// ==========================================
const Utils = {
  audioCtx: null,
  initAudio: function() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  },
  playTone: function(freq, type, duration, vol=0.1) {
    try {
      this.initAudio();
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch(e) {}
  },
  playSuccessSound: function() {
    this.playTone(523.25, 'sine', 0.1, 0.1); 
    setTimeout(() => this.playTone(659.25, 'sine', 0.3, 0.1), 100); 
    setTimeout(() => this.playTone(783.99, 'sine', 0.6, 0.1), 200); 
  },
  playErrorSound: function() {
    this.playTone(200, 'sawtooth', 0.2, 0.1);
    setTimeout(() => this.playTone(150, 'sawtooth', 0.4, 0.1), 150);
  },
  playClickSound: function() {
    this.playTone(800, 'sine', 0.05, 0.02);
  },
  fireConfetti: function() {
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']
      });
    }
  },

  formatDate: (date = new Date()) => {
    const days = [
      "Chủ Nhật",
      "Thứ 2",
      "Thứ 3",
      "Thứ 4",
      "Thứ 5",
      "Thứ 6",
      "Thứ 7",
    ];
    return `${days[date.getDay()]}, ${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`;
  },
  formatTime: (date = new Date()) => {
    return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;
  },
  showToast: (message, type = "success") => {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    let icon = "✓";
    if (type === "error") {
      icon = "⚠️";
      Utils.playErrorSound();
    }
    if (type === "warning") icon = "ℹ️";

    toast.innerHTML = `<span style="font-size:16px">${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("removing");
      toast.addEventListener("animationend", () => toast.remove());
    }, CONFIG.TOAST_DURATION || 3000);
  },

  showGenericSuccessModal: (title, message, icon = "🎉") => {
    if (typeof ModalManager !== 'undefined') {
      ModalManager.showModal('success', { title, message }, { icon });
    }
    Utils.playSuccessSound();
    Utils.fireConfetti();
  },

  showGenericAlertModal: (title, message, icon = "⚠️") => {
    if (typeof ModalManager !== 'undefined') {
      ModalManager.showModal('alert', { title, message }, { icon, titleColor: '#ff9800' });
    }
  },

  closeGenericModals: () => {
    if (typeof ModalManager !== 'undefined') {
      ModalManager.closeModal();
    }
  },

  getShiftStorageKey: (shiftId) => `agr_schedule_${shiftId}`,
  isWithinTimeWindow: (shiftId) => {
    const scheduleDateStr = localStorage.getItem("agr_schedule_date");
    const scheduleDate = scheduleDateStr
      ? new Date(scheduleDateStr)
      : new Date();
    scheduleDate.setHours(0, 0, 0, 0);

    const now = new Date();
    let isAllowed = true;
    let isOver = false;
    let startStr = "";
    let endStr = "";

    let start = new Date(scheduleDate);
    let end = new Date(scheduleDate);

    if (shiftId === "18:00-22:00") {
      // Ca Tối: 10h - 14h cùng ngày
      start.setHours(10, 0, 0);
      end.setHours(14, 0, 0);
      startStr = "10h00";
      endStr = "14h00";
    } else if (shiftId === "22:00-06:00") {
      // Ca Đêm: 14h - 18h cùng ngày
      start.setHours(14, 0, 0);
      end.setHours(18, 0, 0);
      startStr = "14h00";
      endStr = "18h00";
    } else if (shiftId === "15:00-22:00") {
      // Ca Chiều: 9h - 12h cùng ngày
      start.setHours(9, 0, 0);
      end.setHours(12, 0, 0);
      startStr = "09h00";
      endStr = "12h00";
    } else if (shiftId === "06:00-10:00" || shiftId === "06:00-15:00") {
      // Ca Sáng & OS Sáng: trước 19h ngày hôm trước
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(19, 0, 0);
      startStr = "00h00 hôm trước";
      endStr = "19h00 hôm trước";
    } else {
      start.setHours(0, 0, 0);
      end.setHours(23, 59, 59);
      startStr = "00h00";
      endStr = "23h59";
    }

    isAllowed = now >= start && now <= end;
    isOver = now > end;

    return {
      isAllowed: isAllowed,
      isOver: isOver,
      startStr: startStr,
      endStr: endStr,
    };
  },
};


// Attach Utils to window
window.Utils = Utils;

Utils.getActualSheetName = function(shiftId) {
  return shiftId;
};
