#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
เครื่องมือซิงค์ข้อมูลพัสดุปกครอง ๑ ๒ ๓ ระหว่างเครื่องและ Google Drive อัตโนมัติ
แผนกปกครอง วิทยาลัยพยาบาลทหารอากาศ กรมแพทย์ทหารอากาศ
"""

import os
import shutil
from datetime import datetime

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
XLSX_FILE = os.path.join(ROOT_DIR, 'พัสดุปกครอง_๑๒๓_ระบบสมบูรณ์_OBE.xlsx')
JSON_FILE = os.path.join(ROOT_DIR, 'rtafnc_one_gov_supplies_import_payload.json')
IMAGES_DIR = os.path.join(ROOT_DIR, 'images')

DRIVE_BASE = os.path.expanduser('~/Library/CloudStorage/GoogleDrive-anuchit1tube168@gmail.com/ไดรฟ์ของฉัน')
DEST_KLANG = os.path.join(DRIVE_BASE, 'คลังพัสดุnew69')
DEST_RTAFNC = os.path.join(DRIVE_BASE, 'RTAFNC_ONE_PROJECT_CLONES_2569', '04_GOVERNANCE_SUPPLIES')

def sync():
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{now_str}] เริ่มกระบวนการซิงค์ข้อมูลกับ Google Drive...")

    if not os.path.exists(DRIVE_BASE):
        print(f"❌ ไม่พบโฟลเดอร์ Google Drive: {DRIVE_BASE}")
        print("กรุณาตรวจสอบว่า Google Drive Desktop กำลังทำงานและเชื่อมต่อบัญชี anuchit1tube168@gmail.com")
        return False

    success_count = 0

    # 1. Sync to คลังพัสดุnew69
    if os.path.exists(DEST_KLANG):
        shutil.copy2(XLSX_FILE, os.path.join(DEST_KLANG, os.path.basename(XLSX_FILE)))
        shutil.copy2(JSON_FILE, os.path.join(DEST_KLANG, os.path.basename(JSON_FILE)))
        print(f"✅ ซิงค์สำเร็จ -> {DEST_KLANG}")
        success_count += 1
    else:
        print(f"⚠️ ไม่พบโฟลเดอร์ปลายทาง: {DEST_KLANG}")

    # 2. Sync to RTAFNC ONE (04_GOVERNANCE_SUPPLIES)
    if os.path.exists(DEST_RTAFNC):
        shutil.copy2(XLSX_FILE, os.path.join(DEST_RTAFNC, os.path.basename(XLSX_FILE)))
        shutil.copy2(JSON_FILE, os.path.join(DEST_RTAFNC, os.path.basename(JSON_FILE)))
        print(f"✅ ซิงค์สำเร็จ -> {DEST_RTAFNC}")
        success_count += 1
    else:
        print(f"⚠️ ไม่พบโฟลเดอร์ปลายทาง: {DEST_RTAFNC}")

    if success_count > 0:
        print(f"🎉 ซิงค์ข้อมูลกับ Google Drive เรียบร้อยแล้ว ({success_count} ปลายทาง)")
        return True
    return False

if __name__ == '__main__':
    sync()
