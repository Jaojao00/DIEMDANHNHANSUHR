// ==========================================
// TRẠNG THÁI ỨNG DỤNG (STATE)
// ==========================================
const State = {
  shifts: [
    {
      id: "06:00-10:00",
      label: "Ca Sáng",
      icon: "🌅",
      color: "#4facf7",
      colHeaders: [
        "Vị Trí Đầu Ca",
        "Vị Trí 2",
        "Vị Trí 3",
        "Vị Trí 4",
        "Vị Trí 5",
      ],
      noteColIndex: 9,
    },
    {
      id: "06:00-15:00",
      label: "Ca OS Sáng",
      icon: "🚀",
      color: "#43e97b",
      colHeaders: [
        "6h-7h (1)",
        "6h-7h (2)",
        "12h-13h (1)",
        "12h-13h (2)",
        "13h-15h",
      ],
      noteColIndex: 9,
    },
    {
      id: "15:00-22:00",
      label: "Ca Chiều",
      icon: "🌇",
      color: "#ffbd3a",
      colHeaders: [
        "13h-15h",
        "15h-17h",
        "17h-17h30",
        "17h30-18h",
        "18h-19h",
        "19h-20h",
        "21h-22h",
      ],
      noteColIndex: 11,
    },
    {
      id: "18:00-22:00",
      label: "Ca Tối",
      icon: "🌃",
      color: "#ff8c42",
      colHeaders: [
        "13h-15h",
        "15h-17h",
        "17h-17h30",
        "17h30-18h",
        "18h-19h",
        "19h-20h",
        "21h-22h",
      ],
      noteColIndex: 11,
    },
    {
      id: "22:00-06:00",
      label: "Ca Đêm",
      icon: "🌙",
      color: "#b980f0",
      colHeaders: ["Vị Trí Cố Định", "SAU GIỜ NGHỈ", "4h-6h", "Xuất Tải"],
      noteColIndex: 8,
    },
  ],
  selectedShiftId: "06:00-10:00", // Khởi tạo mặc định để tránh null
  scheduleData: [], // Dữ liệu lịch ca hiện tại
  isAdminMode: false,
  isAdminLoggedIn: false,
  scanner: null,
  isScanning: false,
  refreshTimer: null,
  apiLink:
    localStorage.getItem("agr_api_url") ||
    (typeof CONFIG !== "undefined" ? CONFIG.APPS_SCRIPT_URL : ""),
  clockTimer: null,
};

// ==========================================
// XỬ LÝ DỮ LIỆU (DATA LAYER)
// ==========================================
const DataManager = {
  // Demo dữ liệu ban đầu nếu chưa có
  getDemoData: () => {
    return Array.from({ length: 35 }, (_, i) => ({
      stt: i + 1,
      id: `OPS${100000 + Math.floor(Math.random() * 900000)}`,
      name: `Nhân viên Demo ${i + 1}`,
      dinhDanh: `A-O${Math.floor(Math.random() * 9) + 1}`,
      viTri1:
        Math.random() > 0.5
          ? `Chute ${Math.floor(Math.random() * 50)}`
          : "Chưa xếp",
      viTri2:
        Math.random() > 0.5
          ? `Chute ${Math.floor(Math.random() * 50)}`
          : "Chưa xếp",
      viTri3: `OR${Math.floor(Math.random() * 20)}`,
      status: Math.random() > 0.8 ? "confirmed" : "pending",
      timestamp: Math.random() > 0.8 ? "22:15:00" : "",
    }));
  },

  // Chuẩn hóa đối tượng nhân viên (chuyển tất cả field số thành chuỗi)
  normalizeEmp: (emp) => {
    // Nếu đã có positions[], chuẩn hóa từng phần tử
    let positions = emp.positions;
    if (!positions) {
      // Tương thích ngược: đọc từ viTri1-7 + xuatTai
      positions = [
        emp.viTri1 || "",
        emp.viTri2 || "",
        emp.viTri3 || "",
        emp.xuatTai || "",
        emp.viTri4 || "",
        emp.viTri5 || "",
        emp.viTri6 || "",
        emp.viTri7 || "",
      ];
      while (positions.length > 0 && positions[positions.length - 1] === "")
        positions.pop();
    }
    return {
      ...emp,
      stt: String(emp.stt || ""),
      id: String(emp.id || ""),
      name: String(emp.name || ""),
      dinhDanh: String(emp.dinhDanh || ""),
      positions: positions.map(String),
      note: String(emp.note || ""),
      status: String(emp.status || "pending"),
      timestamp: String(emp.timestamp || ""),
      phone: String(emp.phone || ""),
    };
  },

  loadSchedule: async (shiftId) => {
    if (CONFIG.DEMO_MODE) {
      const key = Utils.getShiftStorageKey(shiftId);
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          const normalized = Array.isArray(parsed)
            ? parsed.map(DataManager.normalizeEmp)
            : [];
          return normalized;
        } else {
          const demo = DataManager.getDemoData();
          localStorage.setItem(key, JSON.stringify(demo));
          return demo.map(DataManager.normalizeEmp);
        }
      } catch (e) {
        const demo = DataManager.getDemoData();
        return demo.map(DataManager.normalizeEmp);
      }
    }

    // 1. Tải từ Firebase (Rosters) nếu có
    if (window.FirestoreService) {
      try {
        const rosterData = await window.FirestoreService.loadRoster(shiftId);
        if (rosterData.success && rosterData.schedule && rosterData.schedule.length > 0) {
          const normalized = rosterData.schedule.map(DataManager.normalizeEmp);
          localStorage.setItem(Utils.getShiftStorageKey(shiftId), JSON.stringify(normalized));
          return normalized;
        }
      } catch (err) {
        console.warn("Lỗi tải lịch từ Firebase:", err);
      }
    }

    // 2. Tải từ Google Sheets (Fallback)
    try {
      const url = `${State.apiLink}?action=load&shiftId=${shiftId}`;
      const response = await fetch(url);
      const data = await response.json();
      const normalized = Array.isArray(data)
        ? data.map(DataManager.normalizeEmp)
        : [];
      localStorage.setItem(
        Utils.getShiftStorageKey(shiftId),
        JSON.stringify(normalized)
      );
      
      // Background sync qua Firebase để lần sau load nhanh hơn
      if (window.FirestoreService && normalized.length > 0) {
        window.FirestoreService.saveRoster(shiftId, normalized).catch(()=>{});
      }
      
      return normalized;
    } catch (error) {
      console.error("Lỗi tải lịch từ Google Sheets:", error);
      // 3. Tải từ Local Cache (Offline fallback)
      try {
        const stored = localStorage.getItem(Utils.getShiftStorageKey(shiftId));
        if (stored) {
          const parsed = JSON.parse(stored);
          return Array.isArray(parsed) ? parsed.map(DataManager.normalizeEmp) : [];
        }
      } catch (err) {}
      return [];
    }
  },

  loadRegistrations: async (shiftId) => {
    // Sử dụng chung logic Firestore-first từ regAPI nếu có
    if (window.RegAPI && window.RegAPI.getRegistrations) {
       // getRegistrations hiện tại query theo empId, admin cần query theo shiftId.
       // Sử dụng FirestoreService.getShiftRegistrations
    }

    if (window.FirestoreService) {
      try {
         const result = await window.FirestoreService.getShiftRegistrations(shiftId);
         if (result.periods && result.periods.length > 0) {
            localStorage.setItem(`agr_reg_cache_${shiftId}`, JSON.stringify(result));
            return result;
         }
      } catch (e) {
         console.warn("Lỗi tải danh sách đăng ký từ Firebase:", e);
      }
    }

    try {
      const url = `${State.apiLink}?action=get_shift_registrations&shiftId=${encodeURIComponent(shiftId)}&adminToken=${localStorage.getItem("agr_admin_token")}`;
      const response = await fetch(url);
      const json = await response.json();
      let resultObj = { periods: [] };
      if (json.periods && Array.isArray(json.periods)) {
        resultObj = json;
      } else if (json.data && Array.isArray(json.data)) {
        resultObj = {
          periods: [
            {
              id: "current",
              name: "Kỳ hiện tại",
              headers: json.headers || [],
              data: json.data,
            },
          ],
        };
      }
      localStorage.setItem(`agr_reg_cache_${shiftId}`, JSON.stringify(resultObj));
      return resultObj;
    } catch (error) {
      console.error("Lỗi tải danh sách đăng ký:", error);
      try {
          const cached = localStorage.getItem(`agr_reg_cache_${shiftId}`);
          if (cached) return JSON.parse(cached);
      } catch(e) {}
      return { periods: [] };
    }
  },

  loadRequests: async () => {
    if (CONFIG.DEMO_MODE) {
      return JSON.parse(localStorage.getItem("agr_requests") || "[]");
    }

    // 1. Tải từ Firebase (Primary)
    if (window.FirestoreService) {
      try {
        const fbReq = await window.FirestoreService.loadRequests();
        if (fbReq.success) {
           localStorage.setItem("agr_requests", JSON.stringify(fbReq.requests));
           return fbReq.requests;
        }
      } catch (e) {
        console.warn("Lỗi tải danh sách request từ Firebase:", e);
      }
    }

    // 2. Tải từ GAS (Fallback)
    try {
      const url = `${State.apiLink}?action=load_requests`;
      const response = await fetch(url);
      const data = await response.json();
      if (Array.isArray(data)) {
        localStorage.setItem("agr_requests", JSON.stringify(data));
        return data;
      }
      return [];
    } catch (error) {
      console.error("Lỗi tải danh sách request từ Google Sheets:", error);
      try {
        return JSON.parse(localStorage.getItem("agr_requests") || "[]");
      } catch (e) {
        return [];
      }
    }
  },

  saveSchedule: async (shiftId, data) => {
    localStorage.setItem(Utils.getShiftStorageKey(shiftId), JSON.stringify(data));
    if (CONFIG.DEMO_MODE) return { success: true };

    // 1. Lưu vào Firebase (Primary)
    if (window.FirestoreService) {
      try {
        await window.FirestoreService.saveRoster(shiftId, data);
      } catch (e) {
        console.warn("Lỗi lưu lịch vào Firebase:", e);
      }
    }

    // 2. Lưu vào Google Sheets (Sync)
    try {
      const shift = State.shifts.find((s) => s.id === shiftId);
      const headers = shift ? [...shift.colHeaders] : [];
      const response = await fetch(State.apiLink, {
        method: "POST",
        body: JSON.stringify({ action: "save", shiftId, headers, schedule: data }),
      });
      const res = await response.json();
      if (res.error) throw new Error(res.error);
      return res;
    } catch (error) {
      console.error("Lỗi lưu lịch lên Google Sheets:", error);
      throw new Error("Lỗi kết nối đến máy chủ.");
    }
  },

  updateAttendance: async (shiftId, empId, phone) => {
    const searchId = empId.toLowerCase().trim();

    // 1. Load data local
    const localKey = Utils.getShiftStorageKey(shiftId);
    let localData = [];
    try {
      const stored = localStorage.getItem(localKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        localData = Array.isArray(parsed) ? parsed.map(DataManager.normalizeEmp) : [];
      }
    } catch (e) {}

    const empIndex = localData.findIndex(
      (e) => (e.id || "").toLowerCase().trim() === searchId || 
             (e.stt || "").toLowerCase().trim() === searchId ||
             (e.name || "").toLowerCase().trim() === searchId
    );

    let localEmp = null;
    let localUnassigned = false;

    if (empIndex >= 0) {
      if (localData[empIndex].status === "confirmed") {
        throw new Error("Nhân viên này đã điểm danh rồi!");
      }

      localData[empIndex].status = "confirmed";
      localData[empIndex].timestamp = Utils.formatTime();
      localData[empIndex].phone = phone;

      const emp = DataManager.normalizeEmp(localData[empIndex]);
      const positions = emp.positions || [];
      localUnassigned = positions.length === 0 || positions.every((p) => !p || p.toLowerCase().includes("chưa"));
      localEmp = emp;

      // Update cache
      localStorage.setItem(localKey, JSON.stringify(localData));

      // Push to Firebase (Primary) via FirestoreService
      if (window.FirestoreService) {
        window.FirestoreService.checkin(shiftId, localData[empIndex].id || empId, phone).catch(()=>{});
        // Đồng thời cập nhật roster để lưu trạng thái "confirmed"
        window.FirestoreService.saveRoster(shiftId, localData).catch(()=>{});
      }
    }

    if (CONFIG.DEMO_MODE) {
      if (!localEmp) throw new Error("Không tìm thấy mã nhân viên trong ca này.");
      return { employeeData: localEmp, isUnassigned: localUnassigned };
    }

    // Sync to GAS in background
    const bgSync = fetch(State.apiLink, {
      method: "POST",
      body: JSON.stringify({ action: "checkin", shiftId, empId, phone }),
    }).then((res) => res.json()).catch((err) => console.warn("Lỗi đồng bộ ngầm điểm danh:", err));

    // Return instant local success
    if (localEmp) {
      return { employeeData: localEmp, isUnassigned: localUnassigned };
    }

    // Fallback if not found locally
    try {
      const res = await bgSync;
      if (res && res.error) throw new Error(res.error);
      if (!res) throw new Error("Không phản hồi từ máy chủ");

      const emp = DataManager.normalizeEmp(res.employee);
      const positions = emp.positions || [];
      const isUnassigned = positions.length === 0 || positions.every((p) => !p || p.toLowerCase().includes("chưa"));
      
      localData.push(emp);
      localStorage.setItem(localKey, JSON.stringify(localData));

      if (window.FirestoreService) {
        window.FirestoreService.checkin(shiftId, emp.id || empId, phone).catch(()=>{});
        window.FirestoreService.saveRoster(shiftId, localData).catch(()=>{});
      }

      return { employeeData: emp, isUnassigned };
    } catch (error) {
      console.error("Lỗi điểm danh:", error);
      throw new Error(error.message || "Lỗi kết nối hệ thống.");
    }
  },

  submitRequest: async (payload) => {
    // 1. Lưu local cache
    const requests = JSON.parse(localStorage.getItem("agr_requests") || "[]");
    requests.push({
      empId: payload.empId.toLowerCase().trim(),
      type: payload.type,
      date: payload.date,
      ts: Date.now(),
    });
    localStorage.setItem("agr_requests", JSON.stringify(requests));

    if (CONFIG.DEMO_MODE) return { success: true };

    // 2. Lưu vào Firebase (Primary)
    if (window.FirestoreService) {
      try {
        const fbRes = await window.FirestoreService.submitRequest(payload);
        if (fbRes.success) {
           // Sync GAS background
           fetch(State.apiLink, {
              method: "POST",
              body: JSON.stringify({ action: "request", ...payload }),
           }).catch(()=>{});
           return fbRes;
        }
      } catch (e) {
        console.warn("Firebase submitRequest error:", e);
      }
    }

    // 3. Lưu vào GAS (Fallback)
    try {
      const response = await fetch(State.apiLink, {
        method: "POST",
        body: JSON.stringify({ action: "request", ...payload }),
      });
      const res = await response.json();
      if (res.error) throw new Error(res.error);
      return res;
    } catch (error) {
      console.error("Lỗi gửi yêu cầu:", error);
      throw new Error(error.message || "Lỗi kết nối hệ thống.");
    }
  },
};
