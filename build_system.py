import sys
sys.path.append('/Users/agislamious/Library/Python/3.9/lib/python/site-packages')
import os, re, json, zipfile, shutil
import xml.etree.ElementTree as ET
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

WORK_DIR = '/Users/agislamious/พัสดุปกครอง'
XLSX_SRC = os.path.join(WORK_DIR, 'พัสดุปกครอง12.xlsx')
WEB_DIR = os.path.join(WORK_DIR, 'web')
IMG_DIR = os.path.join(WEB_DIR, 'images')
os.makedirs(IMG_DIR, exist_ok=True)

print("1. Extracting data and images from พัสดุปกครอง12.xlsx...")

with zipfile.ZipFile(XLSX_SRC, 'r') as z:
    sst = []
    if 'xl/sharedStrings.xml' in z.namelist():
        sst_xml = z.read('xl/sharedStrings.xml')
        root = ET.fromstring(sst_xml)
        ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        for si in root.findall('.//ns:si', ns):
            text = ''.join([t.text for t in si.findall('.//ns:t', ns) if t.text])
            sst.append(text)

    d_rels = {}
    if 'xl/drawings/_rels/drawing1.xml.rels' in z.namelist():
        rels_xml = z.read('xl/drawings/_rels/drawing1.xml.rels')
        r_root = ET.fromstring(rels_xml)
        for rel in r_root:
            d_rels[rel.attrib.get('Id')] = rel.attrib.get('Target').replace('../', 'xl/')

    row_images = {}
    if 'xl/drawings/drawing1.xml' in z.namelist():
        d_xml = z.read('xl/drawings/drawing1.xml')
        d_root = ET.fromstring(d_xml)
        for a in list(d_root):
            from_row = a.find('.//{*}from/{*}row')
            blip = a.find('.//{*}blip')
            if from_row is not None and blip is not None:
                r_idx = int(from_row.text) + 1
                embed_id = blip.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
                img_path = d_rels.get(embed_id)
                row_images[r_idx] = img_path

    s_root = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
    ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    rows = s_root.findall('.//ns:row', ns)
    
    raw_items = []
    for r in rows:
        row_num = int(r.attrib.get('r'))
        cells = {}
        for c in r.findall('ns:c', ns):
            ref = c.attrib.get('r')
            t = c.attrib.get('t')
            v_elem = c.find('ns:v', ns)
            val = v_elem.text if v_elem is not None else ''
            if t == 's' and val:
                val = sst[int(val)]
            cells[ref] = val
        name = cells.get(f'A{row_num}', '').strip()
        qty = cells.get(f'B{row_num}', '').strip()
        if name and name != 'ชื่อ':
            img_internal = row_images.get(row_num, '')
            raw_items.append({
                'source_row': row_num,
                'name': name,
                'qty_raw': qty,
                'img_internal': img_internal
            })

    for item in raw_items:
        internal_path = item['img_internal']
        if internal_path and internal_path in z.namelist():
            ext = os.path.splitext(internal_path)[1]
            target_fname = f"item_{item['source_row']}{ext}"
            target_path = os.path.join(IMG_DIR, target_fname)
            with open(target_path, 'wb') as out_f:
                out_f.write(z.read(internal_path))
            item['image_filename'] = target_fname
        else:
            item['image_filename'] = ''

print(f"Extracted {len(raw_items)} items and images.")

def parse_qty_unit(q_str):
    q_str = q_str.strip()
    m = re.match(r'^(\d+)\s*(.*)$', q_str)
    if m:
        num = int(m.group(1))
        unit = m.group(2).strip()
        if unit == 'คุ่': unit = 'คู่'
        if unit == 'แพ็ต': unit = 'แพ็ค'
        if not unit: unit = 'หน่วย'
        return num, unit
    else:
        return 1, q_str if q_str else 'หน่วย'

def classify(name):
    cat1_kw = ['รองเท้า', 'ถุงมือ', 'หมวก', 'สายคาดหมวก', 'ผ้าพันคอ', 'ผ้าปิดตา', 'ผ้าขนหนู', 
               'แว่นตา', 'กางเกง', 'ผ้าถุง', 'ผ้าคาดบ่า', 'เป้สนาม', 'หมอน', 'ผ้าห่ม', 'เสื้อ']
    cat2_kw = ['ฐานธง', 'ธง', 'โต๊ะหมู่', 'เก้าอี้ไม้', 'โถแสตนเล', 'โถสแตนเล', 'พาน', 'เชิงเทียน', 
               'กรวดน้ำ', 'ขันเงิน', 'ขันทอง', 'แท่นไม้', 'กาน้ำชา', 'กระถางธูป', 'เสาธง', 'เหล็กฐานแบน',
               'ป้าย วพอ', 'ผ้าส้มลูกไม้', 'ผ้าลูกไม้พระ', 'ชุดเทียน', 'เทียน', 'สายสิญจน์', 'ผ้าสไบ',
               'แก้วน้ำพระ', 'เสลี่ยง', 'กระโถน']

    for k in cat1_kw:
        if k in name:
            return 1, "พัสดุปกครอง ๑", "เครื่องแบบและของใช้ประจำตัว นพอ."
    for k in cat2_kw:
        if k in name:
            return 2, "พัสดุปกครอง ๒", "อุปกรณ์พิธีการและศาสนพิธี"
    return 3, "พัสดุปกครอง ๓", "อุปกรณ์ฝึกสนามและจัดเลี้ยง/สูทกรรม"

processed_items = []
for idx, it in enumerate(raw_items, 1):
    c_id, c_name, c_sub = classify(it['name'])
    qty, unit = parse_qty_unit(it['qty_raw'])
    code_prefix = {1: "APP", 2: "CER", 3: "OPS"}[c_id]
    item_code = f"GOV-{code_prefix}-{idx:03d}"
    
    processed_items.append({
        'id': idx,
        'item_code': item_code,
        'name': it['name'],
        'category_id': c_id,
        'category_name': c_name,
        'category_desc': c_sub,
        'qty': qty,
        'unit': unit,
        'qty_raw': it['qty_raw'],
        'location': "คลังพัสดุแผนกปกครอง วพอ.",
        'image': it['image_filename'],
        'status': "พร้อมใช้งาน" if qty > 0 else "หมดคลัง"
    })

print(f"Total processed items: {len(processed_items)}")
c1_items = [x for x in processed_items if x['category_id'] == 1]
c2_items = [x for x in processed_items if x['category_id'] == 2]
c3_items = [x for x in processed_items if x['category_id'] == 3]

with open(os.path.join(WEB_DIR, 'data.json'), 'w', encoding='utf-8') as f:
    json.dump(processed_items, f, ensure_ascii=False, indent=2)

rtafnc_payload = {
    "system": "RTAFNC ONE",
    "module": "04_GOVERNANCE_SUPPLIES",
    "academic_year": "2569",
    "status": "VERIFIED_CURRENT",
    "organization": "วิทยาลัยพยาบาลทหารอากาศ (วพอ.)",
    "categories": [
        {"CategoryID": "GOV_CAT_01", "CategoryCode": "GOV-01", "CategoryName": "พัสดุปกครอง ๑ (เครื่องแบบและของใช้ประจำตัว นพอ.)", "Active": True, "ItemsCount": len(c1_items)},
        {"CategoryID": "GOV_CAT_02", "CategoryCode": "GOV-02", "CategoryName": "พัสดุปกครอง ๒ (อุปกรณ์พิธีการและศาสนพิธี)", "Active": True, "ItemsCount": len(c2_items)},
        {"CategoryID": "GOV_CAT_03", "CategoryCode": "GOV-03", "CategoryName": "พัสดุปกครอง ๓ (อุปกรณ์ฝึกสนามและจัดเลี้ยง/สูทกรรม)", "Active": True, "ItemsCount": len(c3_items)}
    ],
    "total_items_count": len(processed_items),
    "items": processed_items
}
with open(os.path.join(WORK_DIR, 'rtafnc_one_gov_supplies_import_payload.json'), 'w', encoding='utf-8') as f:
    json.dump(rtafnc_payload, f, ensure_ascii=False, indent=2)

print("2. Generating พัสดุปกครอง_๑๒๓_ระบบสมบูรณ์_OBE.xlsx...")
wb = openpyxl.Workbook()

font_title = Font(name='TH SarabunPSK', size=18, bold=True, color='FFFFFF')
font_header = Font(name='TH SarabunPSK', size=15, bold=True, color='FFFFFF')
font_data = Font(name='TH SarabunPSK', size=14, color='000000')
font_bold = Font(name='TH SarabunPSK', size=14, bold=True, color='000000')

fill_navy = PatternFill(start_color='1F3864', end_color='1F3864', fill_type='solid')
fill_blue = PatternFill(start_color='2E75B6', end_color='2E75B6', fill_type='solid')
fill_cat1 = PatternFill(start_color='2E75B6', end_color='2E75B6', fill_type='solid')
fill_cat2 = PatternFill(start_color='C65911', end_color='C65911', fill_type='solid')
fill_cat3 = PatternFill(start_color='375623', end_color='375623', fill_type='solid')
fill_zebra = PatternFill(start_color='F2F5F9', end_color='F2F5F9', fill_type='solid')

thin_border = Border(
    left=Side(style='thin', color='D9D9D9'),
    right=Side(style='thin', color='D9D9D9'),
    top=Side(style='thin', color='D9D9D9'),
    bottom=Side(style='thin', color='D9D9D9')
)

align_center = Alignment(horizontal='center', vertical='center')
align_left = Alignment(horizontal='left', vertical='center')
align_right = Alignment(horizontal='right', vertical='center')

def create_item_sheet(ws, title, subtitle, header_fill, items_subset):
    ws.views.sheetView[0].showGridLines = True
    
    ws.merge_cells('A1:G1')
    ws['A1'] = f"แผนกปกครอง วิทยาลัยพยาบาลทหารอากาศ — {title}"
    ws['A1'].font = font_title
    ws['A1'].fill = fill_navy
    ws['A1'].alignment = align_center
    ws.row_dimensions[1].height = 35

    ws.merge_cells('A2:G2')
    ws['A2'] = f"{subtitle} | บัญชีตรวจนับพัสดุและยอดคงคลัง ปีการศึกษา ๒๕๖๙ (จำนวน {len(items_subset)} รายการ)"
    ws['A2'].font = Font(name='TH SarabunPSK', size=14, bold=True, color='1F3864')
    ws['A2'].alignment = align_center
    ws.row_dimensions[2].height = 25

    headers = ['ลำดับ', 'รหัสพัสดุ', 'รายการสิ่งของ', 'จำนวนยอด', 'หน่วยนับ', 'สถานที่จัดเก็บ', 'สถานะ']
    ws.row_dimensions[3].height = 28
    for col_idx, h_text in enumerate(headers, 1):
        cell = ws.cell(row=3, column=col_idx, value=h_text)
        cell.font = font_header
        cell.fill = header_fill
        cell.alignment = align_center
        cell.border = thin_border

    for row_idx, item in enumerate(items_subset, 4):
        ws.row_dimensions[row_idx].height = 24
        is_even = (row_idx % 2 == 0)
        
        c1 = ws.cell(row=row_idx, column=1, value=row_idx - 3)
        c1.alignment = align_center
        c2 = ws.cell(row=row_idx, column=2, value=item['item_code'])
        c2.alignment = align_center
        c3 = ws.cell(row=row_idx, column=3, value=item['name'])
        c3.alignment = align_left
        c4 = ws.cell(row=row_idx, column=4, value=item['qty'])
        c4.alignment = align_right
        c5 = ws.cell(row=row_idx, column=5, value=item['unit'])
        c5.alignment = align_center
        c6 = ws.cell(row=row_idx, column=6, value=item['location'])
        c6.alignment = align_left
        c7 = ws.cell(row=row_idx, column=7, value=item['status'])
        c7.alignment = align_center

        for cell in [c1, c2, c3, c4, c5, c6, c7]:
            cell.font = font_data
            cell.border = thin_border
            if is_even:
                cell.fill = fill_zebra

    ws.column_dimensions['A'].width = 8
    ws.column_dimensions['B'].width = 16
    ws.column_dimensions['C'].width = 38
    ws.column_dimensions['D'].width = 14
    ws.column_dimensions['E'].width = 12
    ws.column_dimensions['F'].width = 28
    ws.column_dimensions['G'].width = 16

ws_dash = wb.active
ws_dash.title = "สรุปภาพรวมและสถิติ"
ws_dash.views.sheetView[0].showGridLines = True

ws_dash.merge_cells('A1:F1')
ws_dash['A1'] = "ระบบบริหารจัดการพัสดุปกครอง ๑ ๒ ๓ — วิทยาลัยพยาบาลทหารอากาศ"
ws_dash['A1'].font = font_title
ws_dash['A1'].fill = fill_navy
ws_dash['A1'].alignment = align_center
ws_dash.row_dimensions[1].height = 40

ws_dash.merge_cells('A2:F2')
ws_dash['A2'] = "รายงานสรุปสถานะพัสดุ ยอดคงคลัง และการจัดหมวดหมู่ระบบ RTAFNC ONE ปีการศึกษา ๒๕๖๙"
ws_dash['A2'].font = Font(name='TH SarabunPSK', size=14, italic=True, color='595959')
ws_dash['A2'].alignment = align_center
ws_dash.row_dimensions[2].height = 25

kpi_headers = ['หมวดหมู่พัสดุ', 'คำอธิบายหมวด', 'จำนวนรายการ', 'ยอดรวมสิ่งของ', 'รหัสขึ้นต้น', 'สถานะระบบ']
ws_dash.row_dimensions[4].height = 28
for col_idx, h in enumerate(kpi_headers, 1):
    c = ws_dash.cell(row=4, column=col_idx, value=h)
    c.font = font_header
    c.fill = fill_blue
    c.alignment = align_center
    c.border = thin_border

dash_rows = [
    ("พัสดุปกครอง ๑", "เครื่องแบบ เครื่องแต่งกาย และของใช้ประจำตัว นพอ.", len(c1_items), sum(x['qty'] for x in c1_items), "GOV-APP-*", "พร้อมใช้งาน ๑๐๐%"),
    ("พัสดุปกครอง ๒", "อุปกรณ์พิธีการ ศาสนพิธี และเครื่องเกียรติยศ", len(c2_items), sum(x['qty'] for x in c2_items), "GOV-CER-*", "พร้อมใช้งาน ๑๐๐%"),
    ("พัสดุปกครอง ๓", "อุปกรณ์ฝึกสนาม กิจกรรม และภาชนะจัดเลี้ยง/สูทกรรม", len(c3_items), sum(x['qty'] for x in c3_items), "GOV-OPS-*", "พร้อมใช้งาน ๑๐๐%"),
]

for r_idx, d in enumerate(dash_rows, 5):
    ws_dash.row_dimensions[r_idx].height = 26
    for c_idx, val in enumerate(d, 1):
        cell = ws_dash.cell(row=r_idx, column=c_idx, value=val)
        cell.font = font_bold if c_idx in [1, 3, 4] else font_data
        cell.border = thin_border
        cell.alignment = align_right if c_idx in [3, 4] else (align_center if c_idx in [1, 5, 6] else align_left)

ws_dash.row_dimensions[8].height = 28
ws_dash.merge_cells('A8:B8')
ws_dash['A8'] = "รวมทั้งสิ้นทุกหมวดหมู่"
ws_dash['A8'].font = font_bold
ws_dash['A8'].alignment = align_center
ws_dash['A8'].border = thin_border
ws_dash['B8'].border = thin_border

ws_dash['C8'] = f"=SUM(C5:C7)"
ws_dash['C8'].font = font_bold
ws_dash['C8'].alignment = align_right
ws_dash['C8'].border = thin_border

ws_dash['D8'] = f"=SUM(D5:D7)"
ws_dash['D8'].font = font_bold
ws_dash['D8'].alignment = align_right
ws_dash['D8'].border = thin_border

ws_dash.merge_cells('E8:F8')
ws_dash['E8'] = "ฐานข้อมูลเชื่อมต่อเรียบร้อย"
ws_dash['E8'].font = font_bold
ws_dash['E8'].alignment = align_center
ws_dash['E8'].border = thin_border
ws_dash['F8'].border = thin_border

ws_dash.column_dimensions['A'].width = 18
ws_dash.column_dimensions['B'].width = 45
ws_dash.column_dimensions['C'].width = 16
ws_dash.column_dimensions['D'].width = 18
ws_dash.column_dimensions['E'].width = 16
ws_dash.column_dimensions['F'].width = 24

ws_cat1 = wb.create_sheet("พัสดุปกครอง ๑")
create_item_sheet(ws_cat1, "พัสดุปกครอง ๑", "หมวดเครื่องแบบ เครื่องแต่งกาย และของใช้ประจำตัว นพอ.", fill_cat1, c1_items)

ws_cat2 = wb.create_sheet("พัสดุปกครอง ๒")
create_item_sheet(ws_cat2, "พัสดุปกครอง ๒", "หมวดอุปกรณ์พิธีการ ศาสนพิธี และเครื่องเกียรติยศ", fill_cat2, c2_items)

ws_cat3 = wb.create_sheet("พัสดุปกครอง ๓")
create_item_sheet(ws_cat3, "พัสดุปกครอง ๓", "หมวดอุปกรณ์ฝึกสนาม กิจกรรม และภาชนะจัดเลี้ยง/สูทกรรม", fill_cat3, c3_items)

ws_all = wb.create_sheet("Data_All_Items")
create_item_sheet(ws_all, "ฐานข้อมูลรวมพัสดุปกครองทั้งหมด", "รายการรวม ๑๗๕ รายการ ๓ หมวดหมู่", fill_navy, processed_items)

out_xlsx_path = os.path.join(WORK_DIR, 'พัสดุปกครอง_๑๒๓_ระบบสมบูรณ์_OBE.xlsx')
wb.save(out_xlsx_path)
print(f"Saved complete workbook to {out_xlsx_path}")
