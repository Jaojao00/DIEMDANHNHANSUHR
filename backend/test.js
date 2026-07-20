function testGetShift() {
  var shiftSearch = '06:00-15:00';
  var regSs = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var allSheets = regSs.getSheets();
  var periods = [];
  
  for (var s = 0; s < allSheets.length; s++) {
    var sheet = allSheets[s];
    var sName = sheet.getName();
    if (sName.indexOf('Ca_') === 0 || sName === 'CONFIG' || sName === 'AdminLogs' || sName === 'ChangeRequests') continue;
    
    var vals = sheet.getDataRange().getValues();
    if (vals.length === 0) continue;
    var headersList = vals[0];
    
    if (headersList.length >= 7 && (headersList[5] === 'Ca' || headersList[5] === 'Shift') && (headersList[1] === 'Mã NV' || headersList[1] === 'MÃ NV' || headersList[1] === 'M NV')) {
      var sShiftId = '';
      if (vals.length > 1 && vals[1][5]) {
         sShiftId = vals[1][5];
      }
      if (sShiftId === shiftSearch) {
         periods.push({ id: sName, rowCount: vals.length });
      }
    }
  }
  console.log(JSON.stringify(periods));
}
