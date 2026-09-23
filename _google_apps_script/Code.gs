/**
 * ==========================================================================
 * ระบบบริหารจัดการพัสดุปกครอง ๑ ๒ ๓ — วิทยาลัยพยาบาลทหารอากาศ
 * Google Apps Script Cloud Backend & Database Service
 * รองรับ: Google Sheets ฐานข้อมูลกลาง + บันทึกภาพ Selfie ลง Google Drive + แจ้งเตือน Telegram
 * ==========================================================================
 */

// ค่าคอนฟิกเริ่มต้น (สามารถแก้ไขได้ที่แผ่นงาน "ตั้งค่าระบบ")
var SPREADSHEET_ID = "1IKLmbe_JqEacmTF6Mkl0tuB3eHJhTGdyW-p7cICAptI";

var DEFAULT_CONFIG = {
  SPREADSHEET_ID: "1IKLmbe_JqEacmTF6Mkl0tuB3eHJhTGdyW-p7cICAptI",
  TELEGRAM_BOT_TOKEN: "", // ใส่ Token ได้ที่หน้าเว็บ หรือชีตตั้งค่า
  TELEGRAM_CHAT_ID: "",   // ใส่ Chat ID ได้ที่หน้าเว็บ หรือชีตตั้งค่า
  DRIVE_FOLDER_NAME: "ภาพถ่ายยืนยันตัวตน_พัสดุปกครอง"
};

/**
 * ดึงออบเจ็กต์ Google Sheet
 */
function getSpreadsheet() {
  if (SPREADSHEET_ID) {
    try {
      return SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch (e) {
      Logger.log("Error opening spreadsheet by ID: " + e);
    }
  }
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    Logger.log("Error getting active spreadsheet: " + e);
    return null;
  }
}

/**
 * ฟังก์ชันหลักรับคำขอผ่าน HTTP GET (Web App / API)
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";
  
  // ให้บริการแบบ JSON API
  if (action === "getActiveLoans") {
    return createJsonResponse(getActiveLoans());
  } else if (action === "initDatabase") {
    var res = setupDatabase();
    return createJsonResponse(res);
  }
  
  // หน้าเว็บ Web App แสดงสถานะระบบ
  var output = HtmlService.createHtmlOutput(
    '<div style="font-family: Sarabun, sans-serif; padding: 30px; text-align: center;">' +
    '<h2 style="color: #1F3864;">✈️ วิทยาลัยพยาบาลทหารอากาศ กรมแพทย์ทหารอากาศ</h2>' +
    '<h3>ระบบ API ฐานข้อมูลกลางพัสดุปกครอง ๑ ๒ ๓ (Active & Online)</h3>' +
    '<p style="color: #10B981; font-weight: bold;">✓ เซิร์ฟเวอร์ Google Apps Script เชื่อมต่อ Google Sheets และ Telegram เรียบร้อยแล้ว</p>' +
    '<p>เชื่อมต่อกับหน้าเว็บ: <a href="https://anuchit1tube168-cmd.github.io/rtafnc-governance-supplies/" target="_blank">https://anuchit1tube168-cmd.github.io/rtafnc-governance-supplies/</a></p>' +
    '</div>'
  );
  output.setTitle("ระบบพัสดุปกครอง วพอ. Backend API");
  return output;
}

/**
 * ฟังก์ชันหลักรับคำขอผ่าน HTTP POST (บันทึกการยืม-คืน & รูปถ่าย Selfie)
 */
function doPost(e) {
  try {
    var postData = "";
    if (e && e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
    } else if (e && e.parameter && e.parameter.payload) {
      postData = JSON.parse(e.parameter.payload);
    } else {
      return createJsonResponse({ success: false, error: "No payload received" });
    }

    var action = postData.action || "";

    if (action === "borrow") {
      var borrowResult = handleBorrowRecord(postData);
      return createJsonResponse(borrowResult);
    } else if (action === "approve") {
      var approveResult = handleApproveRecord(postData);
      return createJsonResponse(approveResult);
    } else if (action === "return") {
      var returnResult = handleReturnRecord(postData);
      return createJsonResponse(returnResult);
    } else if (action === "testTelegram") {
      var testResult = testTelegramMessage(postData.token, postData.chatId);
      return createJsonResponse(testResult);
    } else {
      return createJsonResponse({ success: false, error: "Unknown action: " + action });
    }
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * จัดการบันทึกการขอยืมพัสดุลง Google Sheet + เซฟรูป Selfie ลง Google Drive + ส่ง Telegram
 */
function handleBorrowRecord(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("ประวัติการยืม_คืน");
  if (!sheet) {
    setupDatabase();
    sheet = ss.getSheetByName("ประวัติการยืม_คืน");
  }

  // 1. บันทึกรูปถ่าย Selfie ลง Google Drive
  var photoUrl = "";
  if (data.selfiePhoto) {
    try {
      photoUrl = saveSelfieToDrive(data.selfiePhoto, "BORROW_" + data.borrowerCode7 + "_" + data.loanId + ".jpg");
    } catch (e) {
      Logger.log("Error saving photo to drive: " + e);
    }
  }

  // 2. แปลงรายการพัสดุเป็นข้อความ
  var itemsStr = "";
  var totalUnits = 0;
  if (data.items && data.items.length) {
    itemsStr = data.items.map(function(it, idx) {
      totalUnits += (it.requestedQty || 1);
      return (idx + 1) + ". " + it.name + " (" + it.item_code + ") จำนวน " + it.requestedQty + " " + it.unit;
    }).join("\n");
  }

  // 3. เพิ่มแถวลง Google Sheet
  var rowData = [
    data.borrowDate || new Date().toLocaleString("th-TH"),
    data.loanId,
    "รออนุมัติ", // สถานะ
    data.borrowerName,
    "'" + data.borrowerCode7,
    data.purpose || "การฝึกทางทหารและภารกิจ วพอ.",
    data.dueDate || "-",
    itemsStr,
    totalUnits,
    photoUrl,
    "", // วันที่คืน
    "", // ผู้ส่งคืน
    "", // รหัสผู้คืน
    "", // สภาพ
    ""  // หมายเหตุคืน
  ];

  sheet.appendRow(rowData);

  // 4. ส่งแจ้งเตือน Telegram ผ่านเซิร์ฟเวอร์ Google
  var token = data.telegramToken || getSettingValue("TELEGRAM_BOT_TOKEN") || DEFAULT_CONFIG.TELEGRAM_BOT_TOKEN;
  var chatId = data.telegramChatId || getSettingValue("TELEGRAM_CHAT_ID") || DEFAULT_CONFIG.TELEGRAM_CHAT_ID;

  if (token && chatId) {
    var caption = "🔔 <b>[พัสดุปกครอง วพอ.] มีรายการขอยืมพัสดุใหม่ 📦</b>\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "▫️ <b>เลขที่รายการ:</b> " + data.loanId + "\n" +
      "▫️ <b>ผู้ขอยืม:</b> " + data.borrowerName + "\n" +
      "▫️ <b>รหัสประจำตัว:</b> <code>" + data.borrowerCode7 + "</code>\n" +
      "▫️ <b>ภารกิจ:</b> " + (data.purpose || "-") + "\n" +
      "▫️ <b>กำหนดส่งคืน:</b> " + (data.dueDate || "-") + "\n" +
      "▫️ <b>วันเวลาที่ยืม:</b> " + (data.borrowDate || new Date().toLocaleString("th-TH")) + "\n" +
      "▫️ <b>รายการพัสดุ:</b>\n" + itemsStr + "\n\n" +
      "✍️ <i>ผู้ขอยืมได้ลงลายมือชื่อดิจิทัลและถ่ายภาพตนเองยืนยันเรียบร้อยแล้ว</i>\n" +
      "⚡ <b>กรุณาตรวจสอบและอนุมัติในระบบ</b>";

    sendTelegramApi(token, chatId, data.selfiePhoto, caption);
  }

  return {
    success: true,
    loanId: data.loanId,
    photoUrl: photoUrl
  };
}

/**
 * อัปเดตคำขอยืมเป็นอนุมัติแล้ว
 */
function handleApproveRecord(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("ประวัติการยืม_คืน");
  if (!sheet) return { success: false, error: "Sheet not found" };

  var values = sheet.getDataRange().getValues();
  for (var r = 1; r < values.length; r++) {
    if (values[r][1] == data.loanId) {
      if (values[r][2] !== "รออนุมัติ") {
        return { success: false, error: "Loan is not pending approval: " + data.loanId };
      }
      sheet.getRange(r + 1, 3).setValue("กำลังยืม");
      return { success: true, loanId: data.loanId };
    }
  }

  return { success: false, error: "Loan ID not found: " + data.loanId };
}

/**
 * จัดการบันทึกการส่งคืนพัสดุ อัปเดตสถานะใน Google Sheet + ส่ง Telegram
 */
function handleReturnRecord(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("ประวัติการยืม_คืน");
  if (!sheet) return { success: false, error: "Sheet not found" };

  var values = sheet.getDataRange().getValues();
  var targetRow = -1;

  for (var r = 1; r < values.length; r++) {
    if (values[r][1] == data.loanId) {
      targetRow = r + 1; // 1-indexed
      break;
    }
  }

  if (targetRow === -1) {
    return { success: false, error: "Loan ID not found: " + data.loanId };
  }

  // เซฟรูป Selfie ตอนคืน
  var returnPhotoUrl = "";
  if (data.selfiePhoto) {
    try {
      returnPhotoUrl = saveSelfieToDrive(data.selfiePhoto, "RETURN_" + data.returnerCode7 + "_" + data.loanId + ".jpg");
    } catch (e) {
      Logger.log("Error saving return photo: " + e);
    }
  }

  // อัปเดตคอลัมน์สถานะและข้อมูลคืน
  sheet.getRange(targetRow, 3).setValue("คืนแล้ว"); // สถานะ
  sheet.getRange(targetRow, 11).setValue(data.returnDate || new Date().toLocaleString("th-TH")); // วันที่คืน
  sheet.getRange(targetRow, 12).setValue(data.returnerName); // ผู้ส่งคืน
  sheet.getRange(targetRow, 13).setValue("'" + data.returnerCode7); // รหัสผู้คืน
  sheet.getRange(targetRow, 14).setValue(data.condition || "สมบูรณ์ ๑๐๐%"); // สภาพ
  sheet.getRange(targetRow, 15).setValue(data.notes || "ส่งคืนครบถ้วน"); // หมายเหตุ

  // ส่งแจ้งเตือน Telegram
  var token = data.telegramToken || getSettingValue("TELEGRAM_BOT_TOKEN") || DEFAULT_CONFIG.TELEGRAM_BOT_TOKEN;
  var chatId = data.telegramChatId || getSettingValue("TELEGRAM_CHAT_ID") || DEFAULT_CONFIG.TELEGRAM_CHAT_ID;

  if (token && chatId) {
    var caption = "✅ <b>[พัสดุปกครอง วพอ.] ได้รับคืนพัสดุเรียบร้อยแล้ว 🔄</b>\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "▫️ <b>เลขที่รายการ:</b> " + data.loanId + "\n" +
      "▫️ <b>ผู้ส่งคืน:</b> " + data.returnerName + "\n" +
      "▫️ <b>รหัสประจำตัว:</b> <code>" + data.returnerCode7 + "</code>\n" +
      "▫️ <b>สภาพสิ่งของ:</b> " + (data.condition || "สมบูรณ์ ๑๐๐%") + "\n" +
      "▫️ <b>หมายเหตุ:</b> " + (data.notes || "ส่งคืนครบถ้วนสมบูรณ์") + "\n" +
      "▫️ <b>วันเวลาที่ส่งคืน:</b> " + (data.returnDate || new Date().toLocaleString("th-TH")) + "\n\n" +
      "✍️ <i>ผู้ส่งคืนได้ลงลายมือชื่อดิจิทัลและถ่ายภาพตนเองยืนยันการคืนเรียบร้อยแล้ว</i>\n" +
      "🎖️ <b>สถานะ: นำเข้าคลังพัสดุปกครองสมบูรณ์ ๑๐๐%</b>";

    sendTelegramApi(token, chatId, data.selfiePhoto, caption);
  }

  return { success: true, loanId: data.loanId, returnPhotoUrl: returnPhotoUrl };
}

/**
 * ดึงรายการที่กำลังถูกยืมอยู่ทั้งหมดจาก Google Sheet
 */
function getActiveLoans() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("ประวัติการยืม_คืน");
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  var loans = [];

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    if (row[2] === "กำลังยืม") {
      loans.push({
        loanId: row[1],
        borrowDate: row[0],
        borrowerName: row[3],
        borrowerCode7: String(row[4]).replace(/'/g, ""),
        purpose: row[5],
        dueDate: row[6],
        itemsText: row[7],
        totalUnits: row[8],
        photoUrl: row[9]
      });
    }
  }

  return loans;
}

/**
 * ส่งภาพถ่ายและข้อความผ่าน Telegram Bot API
 */
function sendTelegramApi(token, chatId, base64Photo, captionHtml) {
  try {
    if (base64Photo && base64Photo.indexOf(",") > -1) {
      var split = base64Photo.split(",");
      var contentType = split[0].split(":")[1].split(";")[0];
      var bytes = Utilities.base64Decode(split[1]);
      var blob = Utilities.newBlob(bytes, contentType, "selfie_verification.jpg");

      var payload = {
        chat_id: chatId,
        caption: captionHtml,
        parse_mode: "HTML",
        photo: blob
      };

      var options = {
        method: "post",
        payload: payload,
        muteHttpExceptions: true
      };

      var resp = UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/sendPhoto", options);
      return JSON.parse(resp.getContentText());
    } else {
      var payload = {
        chat_id: chatId,
        text: captionHtml,
        parse_mode: "HTML"
      };

      var options = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      var resp = UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/sendMessage", options);
      return JSON.parse(resp.getContentText());
    }
  } catch (err) {
    Logger.log("Telegram Error: " + err);
    return { ok: false, error: err.toString() };
  }
}

/**
 * ทดสอบการเชื่อมต่อ Telegram Bot
 */
function testTelegramMessage(token, chatId) {
  try {
    var text = "✈️ <b>[ทดสอบระบบพัสดุปกครอง วพอ.]</b>\n" +
      "การเชื่อมต่อ Google Apps Script เข้ากับ Telegram Bot สำเร็จ ๑๐๐%\n" +
      "วันเวลา: " + new Date().toLocaleString("th-TH");

    var payload = {
      chat_id: chatId,
      text: text,
      parse_mode: "HTML"
    };

    var options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    var resp = UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/sendMessage", options);
    return JSON.parse(resp.getContentText());
  } catch (e) {
    return { ok: false, error: e.toString() };
  }
}

/**
 * เซฟรูปภาพ Base64 เป็นไฟล์ JPG ลงโฟลเดอร์ Google Drive
 */
function saveSelfieToDrive(base64Data, filename) {
  var folders = DriveApp.getFoldersByName(DEFAULT_CONFIG.DRIVE_FOLDER_NAME);
  var folder;
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(DEFAULT_CONFIG.DRIVE_FOLDER_NAME);
  }

  var split = base64Data.split(",");
  var contentType = split[0].split(":")[1].split(";")[0];
  var bytes = Utilities.base64Decode(split[1]);
  var blob = Utilities.newBlob(bytes, contentType, filename);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

/**
 * สร้างหรือตั้งค่าแผ่นงาน Google Sheets อัตโนมัติ
 */
function setupDatabase() {
  var ss = getSpreadsheet();

  // 1. แผ่นงาน ประวัติการยืม_คืน
  var historySheet = ss.getSheetByName("ประวัติการยืม_คืน");
  if (!historySheet) {
    historySheet = ss.insertSheet("ประวัติการยืม_คืน");
    var headers = [
      "วันเวลาทำรายการ", "รหัสใบยืม", "สถานะ", "ชื่อผู้ขอยืม", "รหัสประจำตัว",
      "ภารกิจ/วัตถุประสงค์", "กำหนดส่งคืน", "รายการพัสดุ", "จำนวนรวม", "ลิงก์รูปถ่ายยืม",
      "วันเวลาที่ส่งคืน", "ชื่อผู้ส่งคืน", "รหัสผู้ส่งคืน", "สภาพพัสดุ", "หมายเหตุการคืน"
    ];
    historySheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    historySheet.getRange(1, 1, 1, headers.length).setBackground("#1F3864").setFontColor("#FFFFFF").setFontWeight("bold");
    historySheet.setFrozenRows(1);
  }

  // 2. แผ่นงาน ตั้งค่าระบบ
  var configSheet = ss.getSheetByName("ตั้งค่าระบบ");
  if (!configSheet) {
    configSheet = ss.insertSheet("ตั้งค่าระบบ");
    configSheet.appendRow(["KEY", "VALUE", "คำอธิบาย"]);
    configSheet.appendRow(["TELEGRAM_BOT_TOKEN", DEFAULT_CONFIG.TELEGRAM_BOT_TOKEN, "โทเค็นของบอท Telegram จาก @BotFather"]);
    configSheet.appendRow(["TELEGRAM_CHAT_ID", DEFAULT_CONFIG.TELEGRAM_CHAT_ID, "Chat ID ของกลุ่มหรือบัญชีผู้รับ"]);
    configSheet.getRange(1, 1, 1, 3).setBackground("#0284C7").setFontColor("#FFFFFF").setFontWeight("bold");
    configSheet.setFrozenRows(1);
  }

  return { success: true, message: "Database initialized successfully" };
}

/**
 * ดึงค่าคอนฟิกจากแผ่นงานตั้งค่าระบบ
 */
function getSettingValue(key) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("ตั้งค่าระบบ");
    if (!sheet) return "";
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === key) return data[i][1];
    }
  } catch (e) {}
  return "";
}

/**
 * ตัวช่วยสร้างผลลัพธ์ JSON ส่งกลับเบราว์เซอร์
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
