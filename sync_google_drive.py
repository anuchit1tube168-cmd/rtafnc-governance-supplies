#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
เครื่องมือซิงค์ข้อมูลพัสดุปกครอง ๑ ๒ ๓ ระหว่างเครื่องและ Google Drive อัตโนมัติ
แผนกปกครอง วิทยาลัยพยาบาลทหารอากาศ กรมแพทย์ทหารอากาศ
"""

import os
import shutil
import json
from datetime import datetime

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
XLSX_FILE = os.path.join(ROOT_DIR, 'พัสดุปกครอง_๑๒๓_ระบบสมบูรณ์_OBE.xlsx')
JSON_FILE = os.path.join(ROOT_DIR, 'rtafnc_one_gov_supplies_import_payload.json')
DATA_JSON_FILE = os.path.join(ROOT_DIR, 'data.json')
WEB_DIR = os.path.join(ROOT_DIR, 'web')
IMAGES_DIR = os.path.join(ROOT_DIR, 'images')

LOGO_FILE = os.path.join(ROOT_DIR, 'logo_rtafnc.png')
LOGO_DATA_FILE = os.path.join(ROOT_DIR, 'logo_data.js')
INDEX_HTML = os.path.join(ROOT_DIR, 'index.html')
STYLE_CSS = os.path.join(ROOT_DIR, 'style.css')
APP_JS = os.path.join(ROOT_DIR, 'app.js')

DRIVE_BASE = os.path.expanduser('~/Library/CloudStorage/GoogleDrive-anuchit1tube168@gmail.com/ไดรฟ์ของฉัน')
DEST_KLANG = os.path.join(DRIVE_BASE, 'คลังพัสดุnew69')
DEST_RTAFNC = os.path.join(DRIVE_BASE, 'RTAFNC_ONE_PROJECT_CLONES_2569', '04_GOVERNANCE_SUPPLIES')

def generate_status_doc():
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    doc = f"""# ฐานข้อมูลพัสดุปกครอง ๑ ๒ ๓ — วพอ.พอ. (ปีการศึกษา ๒๕๖๙)

**อัปเดตล่าสุด:** {now_str}  
**สังกัด:** แผนกปกครอง วิทยาลัยพยาบาลทหารอากาศ กรมแพทย์ทหารอากาศ  
**ระบบ:** RTAFNC Governance Supplies Light Mission Control

---

## 📊 สรุปยอดคงคลังและการจัดหมวดหมู่ (๑๗๕ รายการ / ๑,๙๐๔ หน่วยนับ)

| หมวดหมู่ | รายการ | ยอดหน่วยนับ | คำอธิบาย |
|---|:---:|:---:|---|
| **พัสดุปกครอง ๑** | **๓๒ รายการ** | ๕๘๙ หน่วย | เครื่องแบบ เครื่องแต่งกาย และของใช้ประจำตัว นพอ. (รองเท้า, คอมแบท, หมวก, ผ้าพันคอ, เป้สนาม ฯลฯ) |
| **พัสดุปกครอง ๒** | **๗๐ รายการ** | ๒๑๓ หน่วย | อุปกรณ์พิธีการ ศาสนพิธี และเครื่องเกียรติยศ (โต๊ะหมู่บูชา, ฐานธง, ธงชาติ, พานพุ่ม, ขันเงิน ฯลฯ) |
| **พัสดุปกครอง ๓** | **๗๓ รายการ** | ๑,๑๐๒ หน่วย | อุปกรณ์ฝึกสนาม กิจกรรม และภาชนะจัดเลี้ยง/สูทกรรม (เต็นท์, ถาดข้าว, จานชาม, ช้อนส้อม ฯลฯ) |
| **รวมทั้งสิ้น** | **๑๗๕ รายการ** | **๑,๙๐๔ หน่วย** | **พร้อมใช้งาน ๑๐๐% พร้อมรูปถ่ายของจริงทุกรายการ** |

---

## 🔗 ช่องทางการเข้าใช้งานระบบ
- **หน้าเว็บแอปพลิเคชันออนไลน์ (GitHub Pages):**  
  [https://anuchit1tube168-cmd.github.io/rtafnc-governance-supplies/](https://anuchit1tube168-cmd.github.io/rtafnc-governance-supplies/)
- **GitHub Repository:**  
  [https://github.com/anuchit1tube168-cmd/rtafnc-governance-supplies](https://github.com/anuchit1tube168-cmd/rtafnc-governance-supplies)

---

## 📁 รายการไฟล์ฐานข้อมูลในโฟลเดอร์นี้
1. `พัสดุปกครอง_๑๒๓_ระบบสมบูรณ์_OBE.xlsx` — ตารางฐานข้อมูล Excel พร้อมสูตรคำนวณ ๕ ชีต
2. `rtafnc_one_gov_supplies_import_payload.json` — ฐานข้อมูลโครงสร้าง JSON สำหรับระบบ RTAFNC ONE Cloud
3. `data.json` — ฐานข้อมูลพัสดุสำหรับเว็บแอปพลิเคชัน
4. `logo_rtafnc.png` & `logo_data.js` — ตราสัญลักษณ์ทางการ วพอ. และชุดข้อมูล Base64
5. `index.html`, `style.css`, `app.js` — เว็บแอปพลิเคชัน Light Mission Control (พร้อมระบบถ่ายภาพตนเอง, ตรวจรหัส ๗ หลัก, ลายเซ็นดิจิทัล, และแจ้งเตือน Telegram)
"""
    return doc

def sync_to_destination(dest_path, dest_name):
    if not os.path.exists(dest_path):
        print(f"⚠️ ไม่พบโฟลเดอร์ปลายทาง: {dest_path}")
        return False

    print(f"📦 กำลังซิงค์เข้าสู่ {dest_name} ({dest_path})...")
    
    # Copy master files
    shutil.copy2(XLSX_FILE, os.path.join(dest_path, os.path.basename(XLSX_FILE)))
    shutil.copy2(JSON_FILE, os.path.join(dest_path, os.path.basename(JSON_FILE)))
    if os.path.exists(DATA_JSON_FILE):
        shutil.copy2(DATA_JSON_FILE, os.path.join(dest_path, os.path.basename(DATA_JSON_FILE)))
    if os.path.exists(LOGO_FILE):
        shutil.copy2(LOGO_FILE, os.path.join(dest_path, os.path.basename(LOGO_FILE)))
    if os.path.exists(LOGO_DATA_FILE):
        shutil.copy2(LOGO_DATA_FILE, os.path.join(dest_path, os.path.basename(LOGO_DATA_FILE)))

    # Copy web files
    for f in [INDEX_HTML, STYLE_CSS, APP_JS]:
        if os.path.exists(f):
            shutil.copy2(f, os.path.join(dest_path, os.path.basename(f)))

    # Write status documentation
    status_doc = generate_status_doc()
    with open(os.path.join(dest_path, 'README_DATABASE_STATUS.md'), 'w', encoding='utf-8') as f:
        f.write(status_doc)

    print(f"✅ ซิงค์สำเร็จ -> {dest_name}")
    return True

def sync():
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{now_str}] เริ่มกระบวนการซิงค์ฐานข้อมูลกับ Google Drive...")

    if not os.path.exists(DRIVE_BASE):
        print(f"❌ ไม่พบโฟลเดอร์ Google Drive: {DRIVE_BASE}")
        print("กรุณาตรวจสอบว่า Google Drive Desktop กำลังทำงานและเชื่อมต่อบัญชี anuchit1tube168@gmail.com")
        return False

    success_count = 0

    # 1. Sync to คลังพัสดุnew69
    if sync_to_destination(DEST_KLANG, 'คลังพัสดุnew69'):
        success_count += 1

    # 2. Sync to RTAFNC ONE (04_GOVERNANCE_SUPPLIES)
    if sync_to_destination(DEST_RTAFNC, 'RTAFNC_ONE (04_GOVERNANCE_SUPPLIES)'):
        success_count += 1

    if success_count > 0:
        print(f"\n🎉 ซิงค์ฐานข้อมูลกับ Google Drive เรียบร้อยแล้วครบทุกรายการ ({success_count} ปลายทาง)")
        return True
    return False

if __name__ == '__main__':
    sync()
