
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

  loadSchedule: (shiftId) => {
    return new Promise(async (resolve) => {
      if (CONFIG.DEMO_MODE) {
        const key = Utils.getShiftStorageKey(shiftId);
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            const normalized = Array.isArray(parsed)
              ? parsed.map(DataManager.normalizeEmp)
              : [];
            resolve(normalized);
          } else {
            const demo = DataManager.getDemoData();
            localStorage.setItem(key, JSON.stringify(demo));
            resolve(demo.map(DataManager.normalizeEmp));
          }
        } catch (e) {
          console.error("Lỗi đọc demo data hoặc cache ca:", e);
          const demo = DataManager.getDemoData();
          resolve(demo.map(DataManager.normalizeEmp));
        }
      } else {
        // Tải từ Google Sheets
        try {
          const url = `${State.apiLink}?action=load&shiftId=${shiftId}`;
          const response = await fetch(url);
          const data = await response.json();
          const normalized = Array.isArray(data)
            ? data.map(DataManager.normalizeEmp)
            : [];
          // Cập nhật lại local cache để dự phòng
          localStorage.setItem(
            Utils.getShiftStorageKey(shiftId),
            JSON.stringify(normalized),
          );
          resolve(normalized);
        } catch (error) {
          console.error("Lỗi tải lịch từ Google Sheets:", error);
          // Fallback
          try {
            const stored = localStorage.getItem(
              Utils.getShiftStorageKey(shiftId),
            );
            if (stored) {
              const parsed = JSON.parse(stored);
              const normalized = Array.isArray(parsed)
                ? parsed.map(DataManager.normalizeEmp)
                : [];
              resolve(normalized);
            } else {
              resolve([]);
            }
          } catch (err) {
            console.error("Lỗi đọc cache local dự phòng:", err);
            resolve([]);
          }
        }
      }
    });
  },

  loadRegistrations: async (shiftId) => {
    return new Promise(async (resolve) => {
      try {
        const url = `${State.apiLink}?action=get_shift_registrations&shiftId=${shiftId}`;
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
        // Save to cache for Optimistic UI
        localStorage.setItem(`agr_reg_cache_${shiftId}`, JSON.stringify(resultObj));
        resolve(resultObj);
      } catch (error) {
        console.error("Lỗi tải danh sách đăng ký:", error);
        // Fallback to cache if available
        try {
           const cached = localStorage.getItem(`agr_reg_cache_${shiftId}`);
           if (cached) {
              resolve(JSON.parse(cached));
              return;
           }
        } catch(e) {}
        resolve({ periods: [] });
      }
    });
  },

  loadRequests: async () => {
    if (CONFIG.DEMO_MODE) {
      return JSON.parse(localStorage.getItem("agr_requests") || "[]");
    }
    try {
      const url = `${State.apiLink}?action=load_requests`;
      const response = await fetch(url);
      const data = await response.json();
      if (Array.isArray(data)) {
        // Cập nhật lại localStorage để dự phòng offline và để renderTable dùng chung logic
        // Ta có thể merge hoặc ghi đè. Tốt nhất là merge theo empId và timestamp hoặc cứ ghi đè.
        // Ghi đè bằng dữ liệu server là an toàn nhất.
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
    return new Promise(async (resolve, reject) => {
      // Lưu local cache
      localStorage.setItem(
        Utils.getShiftStorageKey(shiftId),
        JSON.stringify(data),
      );

      if (CONFIG.DEMO_MODE) {
        resolve({ success: true });
      } else {
        // Gửi lên Google Sheets
        try {
          const shift = State.shifts.find((s) => s.id === shiftId);
          const headers = shift ? [...shift.colHeaders] : [];

          const response = await fetch(State.apiLink, {
            method: "POST",
            body: JSON.stringify({
              action: "save",
              shiftId: shiftId,
              headers: headers,
              schedule: data,
            }),
          });
          const res = await response.json();
          if (res.error) reject(new Error(res.error));
          else resolve(res);
        } catch (error) {
          console.error("Lỗi lưu lịch lên Google Sheets:", error);
          reject(new Error("Lỗi kết nối đến máy chủ."));
        }
      }
    });
  },

  updateAttendance: async (shiftId, empId, phone) => {
    const searchId = empId.toLowerCase().trim();

    // 1. Try to find in local cache first for Instant response
    const localKey = Utils.getShiftStorageKey(shiftId);
    let localData = [];
    try {
      const stored = localStorage.getItem(localKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        localData = Array.isArray(parsed)
          ? parsed.map(DataManager.normalizeEmp)
          : [];
      }
    } catch (e) {}

    const empIndex = localData.findIndex(
      (e) =>
        (e.id && e.id.toString().toLowerCase().trim() === searchId) ||
        (e.stt && e.stt.toString().toLowerCase().trim() === searchId) ||
        (e.name && e.name.toString().toLowerCase().trim() === searchId),
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
      localUnassigned =
        positions.length === 0 ||
        positions.every((p) => !p || p.toLowerCase().includes("chưa"));
      localEmp = emp;

      // Update cache immediately
      localStorage.setItem(localKey, JSON.stringify(localData));

      // Firebase Relay for Admin Real-time
      if (window.FirebaseDB?.db) {
        const { collection, addDoc } = window.FirebaseDB;
        addDoc(collection(window.FirebaseDB.db, "checkins"), {
          empId: localData[empIndex].id || empId,
          shiftId: shiftId,
          status: "confirmed",
          timestamp: localData[empIndex].timestamp,
          phone: phone,
          serverTimestamp: Date.now(),
        }).catch((e) => console.error("Firebase relay error:", e));
      }
    }

    if (CONFIG.DEMO_MODE) {
      if (!localEmp)
        throw new Error("Không tìm thấy mã nhân viên trong ca này.");
      return { employeeData: localEmp, isUnassigned: localUnassigned };
    }

    // 2. Prepare background sync to Google Sheets
    const fetchPromise = fetch(State.apiLink, {
      method: "POST",
      body: JSON.stringify({
        action: "checkin",
        shiftId: shiftId,
        empId: empId,
        phone: phone,
      }),
    }).then((res) => res.json());

    // 3. Optimistic UI: Return instantly if found locally
    if (localEmp) {
      fetchPromise.catch((err) =>
        console.error("Lỗi đồng bộ ngầm điểm danh:", err),
      );
      return { employeeData: localEmp, isUnassigned: localUnassigned };
    }

    // 4. Fallback: If not found locally, wait for server response
    try {
      const res = await fetchPromise;
      if (res.error) {
        throw new Error(res.error);
      }

      const emp = DataManager.normalizeEmp(res.employee);
      const positions = emp.positions || [];
      const isUnassigned =
        positions.length === 0 ||
        positions.every((p) => !p || p.toLowerCase().includes("chưa"));

      // Update local cache with this new employee
      localData.push(emp);
      localStorage.setItem(localKey, JSON.stringify(localData));

      return { employeeData: emp, isUnassigned: isUnassigned };
    } catch (error) {
      console.error("Lỗi điểm danh qua API:", error);
      throw new Error(error.message || "Lỗi kết nối hệ thống.");
    }
  },

  // Gửi yêu cầu xin nghỉ / xin lên ca lên Google Sheets
  submitRequest: async (payload) => {
    // Lưu vào localStorage để highlight admin
    const requests = JSON.parse(localStorage.getItem("agr_requests") || "[]");
    requests.push({
      empId: payload.empId.toLowerCase().trim(),
      type: payload.type,
      date: payload.date,
      ts: Date.now(),
    });
    localStorage.setItem("agr_requests", JSON.stringify(requests));

    if (!CONFIG.DEMO_MODE) {
      try {
        const response = await fetch(State.apiLink, {
          method: "POST",
          body: JSON.stringify({
            action: "request",
            ...payload,
          }),
        });
        const res = await response.json();
        if (res.error) throw new Error(res.error);
        return res;
      } catch (error) {
        console.error("Lỗi gửi yêu cầu:", error);
        throw new Error(error.message || "Lỗi kết nối hệ thống.");
      }
    }
    return { success: true };
  },
};

