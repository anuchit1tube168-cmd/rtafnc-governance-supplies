# ระบบบริหารจัดการพัสดุปกครอง ๑ ๒ ๓ (RTAFNC Supplies Inventory)
### แผนกปกครอง วิทยาลัยพยาบาลทหารอากาศ กรมแพทย์ทหารอากาศ

[![GitHub Repository](https://img.shields.io/badge/GitHub-rtafnc--governance--supplies-blue?logo=github)](https://github.com/anuchit1tube168-cmd/rtafnc-governance-supplies)
[![Google Drive](https://img.shields.io/badge/Google%20Drive-Connected-green?logo=google-drive)](https://drive.google.com/)
[![Status](https://img.shields.io/badge/Status-VERIFIED__CURRENT-brightgreen)](#)

ระบบฐานข้อมูล บริหารจัดการ และตรวจสอบยอดคงคลังพัสดุปกครอง วพอ. ปีการศึกษา ๒๕๖๙ ครอบคลุม ๑๗๕ รายการ (๑,๙๐๔ หน่วย) พร้อมภาพถ่ายจริงของพัสดุทุกรายการ และเชื่อมต่อแบบ Two-Way กับ Google Drive / RTAFNC ONE

---

## 📌 โครงสร้างหมวดหมู่พัสดุ (๑ ๒ ๓)

| หมวดหมู่ | คำอธิบาย | จำนวนรายการ | รหัสพัสดุ | ยอดคงคลัง |
|---|---|:---:|:---:|:---:|
| **พัสดุปกครอง ๑** | เครื่องแบบ เครื่องแต่งกาย และของใช้ประจำตัว นพอ. (รองเท้า, หมวก, ผ้าพันคอ, เป้สนาม, ผ้าถุง ฯลฯ) | **๓๒** รายการ | `GOV-APP-*` | ๕๘๙ หน่วย |
| **พัสดุปกครอง ๒** | อุปกรณ์พิธีการ ศาสนพิธี และเครื่องเกียรติยศ (โต๊ะหมู่, ธงชาติ, พานพุ่มทอง, ขันเงินเบอร์ ๒-๑๑, เชิงเทียน ฯลฯ) | **๗๐** รายการ | `GOV-CER-*` | ๒๑๓ หน่วย |
| **พัสดุปกครอง ๓** | อุปกรณ์ฝึกสนาม กิจกรรม และภาชนะจัดเลี้ยง/สูทกรรม (เต็นท์, เสาเต็นท์, ชุดดับเพลิง, ถาดข้าว, แก้วน้ำ, ช้อนส้อม ฯลฯ) | **๗๓** รายการ | `GOV-OPS-*` | ๑,๑๐๒ หน่วย |
| **รวมทั้งสิ้น** | **ครบถ้วนทุกรายการ พร้อมรูปถ่ายประกอบของจริง** | **๑๗๕** รายการ | `GOV-*` | **๑,๙๐๔** หน่วย |

---

## 🚀 การเปิดใช้งานระบบเว็บแอปพลิเคชัน

### วิธีที่ ๑: รันผ่านสคริปต์ (แนะนำ)
```bash
./start_server.sh
```
ระบบจะเปิดเซิร์ฟเวอร์ที่ `http://localhost:8080` และเปิดหน้าเว็บในเบราว์เซอร์ให้อัตโนมัติ

### วิธีที่ ๒: รันผ่าน Python
```bash
python3 -m http.server 8080
```

### วิธีที่ ๓: เปิดผ่าน NPM
```bash
npm start
```

---

## ☁️ การเชื่อมต่อและซิงค์ข้อมูลกับ Google Drive

ซิงค์ฐานข้อมูล Excel และ JSON เข้า Google Drive อัตโนมัติด้วยคำสั่งเดียว:
```bash
python3 sync_google_drive.py
# หรือ
npm run sync
```

**โฟลเดอร์ Google Drive ที่เชื่อมต่อ (บัญชี anuchit1tube168@gmail.com):**
1. **`คลังพัสดุnew69`**:
   - `พัสดุปกครอง_๑๒๓_ระบบสมบูรณ์_OBE.xlsx`
   - `rtafnc_one_gov_supplies_import_payload.json`
2. **`RTAFNC_ONE_PROJECT_CLONES_2569/04_GOVERNANCE_SUPPLIES`**:
   - เชื่อมต่อกับระบบ RTAFNC ONE Master Data

---

## 🌟 ฟังก์ชันเด่นของระบบเว็บแอปพลิเคชัน

- **KPI Dashboards:** สรุปยอดคงคลังแบบ Real-time แยกตามหมวดหมู่ ๑ ๒ ๓
- **Instant Search:** ค้นหาตามชื่อสิ่งของ หรือรหัสพัสดุ แสดงผลทันที
- **View Modes:** สลับมุมมองได้ทั้งแบบ **การ์ดรูปภาพ (Grid View)** และ **ตารางข้อมูล (Table View)**
- **Image Preview Modal:** คลิกดูภาพถ่ายพัสดุจริงขนาดใหญ่ พร้อมระบุสถานที่จัดเก็บ
- **Requisition Cart:** เลือกพัสดุใส่ตะกร้า ระบุจำนวน และสั่งพิมพ์ **"ใบขอเบิก-ยืมพัสดุปกครอง วพอ."** พร้อมช่องลงนามทางการได้ทันที
- **Direct Download:** ดาวน์โหลดไฟล์ฐานข้อมูล Excel สมบูรณ์จากหน้าเว็บได้ในคลิกเดียว

---

## 📂 โครงสร้างไฟล์ในโครงการ

```
.
├── index.html                                    # หน้าเว็บหลัก Web Application
├── style.css                                     # สไตล์ชีต Responsive ธีมทหารอากาศ
├── app.js                                        # ระบบการค้นหา ตัวกรอง และใบขอเบิก
├── data.json                                     # ฐานข้อมูลพัสดุ ๑๗๕ รายการ
├── images/                                       # ภาพถ่ายพัสดุจริง ๑๗๕ ภาพ
├── พัสดุปกครอง_๑๒๓_ระบบสมบูรณ์_OBE.xlsx          # ฐานข้อมูล Excel ๕ ชีต
├── rtafnc_one_gov_supplies_import_payload.json   # JSON Data Contract สำหรับ RTAFNC ONE
├── sync_google_drive.py                          # เครื่องมือซิงค์ข้อมูล Google Drive
├── start_server.sh                               # สคริปต์เปิดเว็บเซิร์ฟเวอร์
├── build_system.py                               # สคริปต์สกัดรูปและสร้างชุดข้อมูล
└── package.json                                  # NPM Configuration
```
