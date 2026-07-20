const API_URL = "https://script.google.com/macros/s/AKfycbyfXco9SQzgQBFOucTUzRd9tRX4MqsogCBLi0ANnNDOiH7KG2e6itEu3bioGUjtnbtw/exec";

async function submitMockRegistration() {
  const payload1 = {
    action: "submit_registration",
    empId: "TEST01",
    empName: "Nguyễn Văn Test Một",
    empPhone: "0901234567",
    osGender: "",
    shiftId: "CA_NGAY",
    shiftLabel: "Ca Ngày",
    selections: [
      { date: "2026-07-16", label: "16/07/2026", choice: "06:00-15:00" },
      { date: "2026-07-17", label: "17/07/2026", choice: "06:00-10:00" },
      { date: "2026-07-18", label: "18/07/2026", choice: "15:00-22:00" },
      { date: "2026-07-19", label: "19/07/2026", choice: "OFF" },
      { date: "2026-07-20", label: "20/07/2026", choice: "OFF" },
      { date: "2026-07-21", label: "21/07/2026", choice: "06:00-15:00" },
      { date: "2026-07-22", label: "22/07/2026", choice: "15:00-22:00" },
      { date: "2026-07-23", label: "23/07/2026", choice: "OFF" },
      { date: "2026-07-24", label: "24/07/2026", choice: "OFF" },
      { date: "2026-07-25", label: "25/07/2026", choice: "06:00-10:00" },
      { date: "2026-07-26", label: "26/07/2026", choice: "OFF" },
      { date: "2026-07-27", label: "27/07/2026", choice: "15:00-22:00" },
      { date: "2026-07-28", label: "28/07/2026", choice: "OFF" },
      { date: "2026-07-29", label: "29/07/2026", choice: "06:00-15:00" },
      { date: "2026-07-30", label: "30/07/2026", choice: "OFF" },
      { date: "2026-07-31", label: "31/07/2026", choice: "OFF" }
    ],
    period: "1631",
    timestamp: new Date().toISOString()
  };

  const payload2 = {
    action: "submit_registration",
    empId: "TEST02",
    empName: "Trần Thị Test Hai",
    empPhone: "0912345678",
    osGender: "",
    shiftId: "CA_TOI",
    shiftLabel: "Ca Tối",
    selections: [
      { date: "2026-07-16", label: "16/07/2026", choice: "22:00-06:00" },
      { date: "2026-07-17", label: "17/07/2026", choice: "18:00-22:00" },
      { date: "2026-07-18", label: "18/07/2026", choice: "OFF" },
      { date: "2026-07-19", label: "19/07/2026", choice: "OFF" },
      { date: "2026-07-20", label: "20/07/2026", choice: "22:00-06:00" },
      { date: "2026-07-21", label: "21/07/2026", choice: "OFF" },
      { date: "2026-07-22", label: "22/07/2026", choice: "18:00-22:00" },
      { date: "2026-07-23", label: "23/07/2026", choice: "OFF" },
      { date: "2026-07-24", label: "24/07/2026", choice: "OFF" },
      { date: "2026-07-25", label: "25/07/2026", choice: "22:00-06:00" },
      { date: "2026-07-26", label: "26/07/2026", choice: "OFF" },
      { date: "2026-07-27", label: "27/07/2026", choice: "OFF" },
      { date: "2026-07-28", label: "28/07/2026", choice: "18:00-22:00" },
      { date: "2026-07-29", label: "29/07/2026", choice: "OFF" },
      { date: "2026-07-30", label: "30/07/2026", choice: "22:00-06:00" },
      { date: "2026-07-31", label: "31/07/2026", choice: "OFF" }
    ],
    period: "1631",
    timestamp: new Date().toISOString()
  };

  for (const payload of [payload1, payload2]) {
    try {
      const resp = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      console.log(`Đã gửi đăng ký cho ${payload.empName} - Result:`, data);
    } catch (e) {
      console.error(`Lỗi khi gửi cho ${payload.empName}:`, e);
    }
  }
}

submitMockRegistration();
