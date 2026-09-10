/* ==========================================================================
   RTAFNC LIGHT MISSION CONTROL JAVASCRIPT LOGIC
   ระบบบริหารจัดการพัสดุปกครอง ๑ ๒ ๓ — วิทยาลัยพยาบาลทหารอากาศ
   ========================================================================== */

let allItems = [];
let filteredItems = [];
let currentCategory = 0; // 0 = All, 1, 2, 3
let currentView = 'grid'; // 'grid' or 'table'
let requisitionCart = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  setupEventListeners();
  renderSupplyRadar();
  updateCartBadge();
});

async function loadData() {
  try {
    const res = await fetch('data.json');
    allItems = await res.json();
    filteredItems = [...allItems];
    updateKPISummaries();
    renderItems();
    renderSupplyRadar();
  } catch (err) {
    console.error('Error loading data:', err);
    document.getElementById('itemsContainer').innerHTML = `
      <div style="text-align: center; padding: 3rem; background: #FFF; border-radius: 20px; border: 1px dashed #E2E8F0;">
        <span style="font-size: 2.5rem;">⚠️</span>
        <h3 style="margin-top: 0.5rem; color: #1F3864;">เกิดข้อผิดพลาดในการโหลดข้อมูล</h3>
        <p style="color: #64748B;">${err.message}</p>
      </div>
    `;
  }
}

function updateKPISummaries() {
  const c1 = allItems.filter(x => x.category_id === 1);
  const c2 = allItems.filter(x => x.category_id === 2);
  const c3 = allItems.filter(x => x.category_id === 3);

  const totalUnits = allItems.reduce((acc, it) => acc + (it.qty || 0), 0);
  const c1Units = c1.reduce((acc, it) => acc + (it.qty || 0), 0);
  const c2Units = c2.reduce((acc, it) => acc + (it.qty || 0), 0);
  const c3Units = c3.reduce((acc, it) => acc + (it.qty || 0), 0);

  // Tab counters
  document.getElementById('badgeAll').textContent = allItems.length;
  document.getElementById('badgeCat1').textContent = c1.length;
  document.getElementById('badgeCat2').textContent = c2.length;
  document.getElementById('badgeCat3').textContent = c3.length;

  // Meter bars
  const elMeterAll = document.getElementById('meterAllFill');
  if (elMeterAll) elMeterAll.style.width = '100%';

  const elMeterC1 = document.getElementById('meterC1Fill');
  if (elMeterC1) elMeterC1.style.width = `${Math.min(100, Math.round((c1.length / 40) * 100))}%`;

  const elMeterC2 = document.getElementById('meterC2Fill');
  if (elMeterC2) elMeterC2.style.width = `${Math.min(100, Math.round((c2.length / 75) * 100))}%`;

  const elMeterC3 = document.getElementById('meterC3Fill');
  if (elMeterC3) elMeterC3.style.width = `${Math.min(100, Math.round((c3.length / 80) * 100))}%`;
}

// ==========================================================================
// Supply Readiness Radar Chart (Clean SVG Geometry)
// ==========================================================================
function renderSupplyRadar() {
  const radarSvg = document.getElementById('radarSvg');
  if (!radarSvg) return;

  // Axes:
  // 1. เครื่องแบบ นพอ. (Normalized ~ 85%)
  // 2. พิธีการ (Normalized ~ 93%)
  // 3. ฝึกสนาม (Normalized ~ 88%)
  // 4. สูทกรรม/จัดเลี้ยง (Normalized ~ 95%)
  // 5. ความพร้อมจ่าย (100%)
  const scores = [0.85, 0.93, 0.88, 0.95, 1.0];
  const numAxes = scores.length;
  const centerX = 125;
  const centerY = 100;
  const maxRadius = 75;

  let polygonPoints = [];
  for (let i = 0; i < numAxes; i++) {
    const angle = (Math.PI * 2 / numAxes) * i - Math.PI / 2;
    const r = maxRadius * scores[i];
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    polygonPoints.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  const polygonElem = document.getElementById('radarPolygon');
  if (polygonElem) {
    polygonElem.setAttribute('points', polygonPoints.join(' '));
  }
}

function setupEventListeners() {
  // Search with debounce
  const searchInput = document.getElementById('missionSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      applyFilters();
    });
  }

  // Category Tabs
  document.querySelectorAll('.mission-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mission-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = parseInt(btn.dataset.category);
      applyFilters();
    });
  });

  // View toggle
  const btnGrid = document.getElementById('btnModeGrid');
  const btnTable = document.getElementById('btnModeTable');
  if (btnGrid) btnGrid.addEventListener('click', () => setView('grid'));
  if (btnTable) btnTable.addEventListener('click', () => setView('table'));

  // Modal close
  const modalClose = document.getElementById('dialogCloseBtn');
  const modal = document.getElementById('itemModalDialog');
  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'itemModalDialog') closeModal();
    });
  }

  // Cart Drawer
  const openCartBtn = document.getElementById('btnOpenMissionCart');
  const closeCartBtn = document.getElementById('btnCloseDrawer');
  const cartOverlay = document.getElementById('drawerBackdrop');
  if (openCartBtn) openCartBtn.addEventListener('click', openCart);
  if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

  // Mobile nav buttons
  document.querySelectorAll('.nav-action-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-action-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const action = btn.dataset.action;
      if (action === 'cart') {
        openCart();
      } else if (action === 'all') {
        setCategoryFilter(0);
      } else if (action === 'cat1') {
        setCategoryFilter(1);
      } else if (action === 'cat2') {
        setCategoryFilter(2);
      } else if (action === 'cat3') {
        setCategoryFilter(3);
      }
    });
  });

  // Requisition submit
  const btnSubmit = document.getElementById('btnConfirmRequisition');
  if (btnSubmit) btnSubmit.addEventListener('click', handleRequisitionSubmit);
}

function setCategoryFilter(catId) {
  currentCategory = catId;
  document.querySelectorAll('.mission-tab-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.category) === catId);
  });
  applyFilters();
}

function setView(view) {
  currentView = view;
  const btnGrid = document.getElementById('btnModeGrid');
  const btnTable = document.getElementById('btnModeTable');
  if (btnGrid) btnGrid.classList.toggle('active', view === 'grid');
  if (btnTable) btnTable.classList.toggle('active', view === 'table');
  renderItems();
}

function applyFilters() {
  const searchInput = document.getElementById('missionSearchInput');
  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

  filteredItems = allItems.filter(item => {
    if (currentCategory !== 0 && item.category_id !== currentCategory) {
      return false;
    }
    if (query) {
      const matchName = item.name.toLowerCase().includes(query);
      const matchCode = item.item_code.toLowerCase().includes(query);
      const matchUnit = item.unit.toLowerCase().includes(query);
      const matchCat = item.category_name.toLowerCase().includes(query);
      if (!matchName && !matchCode && !matchUnit && !matchCat) {
        return false;
      }
    }
    return true;
  });

  renderItems();
}

function renderItems() {
  const container = document.getElementById('itemsContainer');
  const countLabel = document.getElementById('activeFilterCount');
  if (countLabel) {
    countLabel.textContent = `แสดง ${filteredItems.length} รายการ (จากทั้งหมด ${allItems.length})`;
  }

  if (filteredItems.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3.5rem 1rem; background: #FFF; border-radius: 20px; border: 1px dashed #E2E8F0; width: 100%;">
        <span style="font-size: 2.8rem;">🔍</span>
        <h3 style="margin-top: 0.6rem; color: #1F3864; font-size: 1.15rem;">ไม่พบรายการพัสดุตามเงื่อนไข</h3>
        <p style="color: #64748B; font-size: 0.9rem;">ลองค้นหาด้วยคำสำคัญอื่น หรือเลือกหมวดหมู่อื่นด้านบน</p>
      </div>
    `;
    return;
  }

  if (currentView === 'grid') {
    renderGridView(container);
  } else {
    renderTableView(container);
  }
}

function renderGridView(container) {
  let html = '<div class="mission-cards-grid">';
  
  filteredItems.forEach(item => {
    const chipClass = `chip-cat${item.category_id}`;
    const imgSrc = item.image ? `images/${item.image}` : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="%2394A3B8" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';

    html += `
      <div class="mission-card">
        <div class="card-visual-port" onclick="openModal(${item.id})">
          <img src="${imgSrc}" alt="${item.name}" class="card-photo" loading="lazy" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2394A3B8%22 stroke-width=%221.5%22><rect x=%223%22 y=%223%22 width=%2218%22 height=%2218%22 rx=%222%22/><circle cx=%228.5%22 cy=%228.5%22 r=%221.5%22/><polyline points=%2221 15 16 10 5 21%22/></svg>'">
          <span class="category-badge-chip ${chipClass}">${item.category_name}</span>
        </div>
        <div class="card-content-area">
          <span class="code-indicator">${item.item_code}</span>
          <h3 class="item-heading" title="${item.name}">${item.name}</h3>
          <div class="stock-meter-row">
            <div>
              <span class="stock-figure">${item.qty}</span>
              <span class="stock-unit">${item.unit}</span>
            </div>
            <span style="font-size: 0.78rem; color: #10B981; font-weight: 700;">✓ ${item.status}</span>
          </div>
          <div class="card-btn-dock">
            <button class="btn-request" onclick="addToCart(${item.id})">
              <span>+</span> ขอเบิกภารกิจ
            </button>
            <button class="btn-inspect" onclick="openModal(${item.id})" title="ดูภาพขยายและรายละเอียด">
              🔍
            </button>
          </div>
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

function renderTableView(container) {
  let html = `
    <div class="table-mission-card">
      <table class="mission-data-table">
        <thead>
          <tr>
            <th style="width: 65px; text-align: center;">รูปภาพ</th>
            <th style="width: 130px;">รหัสพัสดุ</th>
            <th>รายการสิ่งของ</th>
            <th style="width: 175px;">หมวดหมู่ภารกิจ</th>
            <th style="width: 90px; text-align: right;">คงเหลือ</th>
            <th style="width: 80px; text-align: center;">หน่วย</th>
            <th style="width: 110px; text-align: center;">สถานะ</th>
            <th style="width: 115px; text-align: center;">ขอเบิก</th>
          </tr>
        </thead>
        <tbody>
  `;

  filteredItems.forEach(item => {
    const imgSrc = item.image ? `images/${item.image}` : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="%2394A3B8" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>';

    html += `
      <tr>
        <td style="text-align: center;">
          <img src="${imgSrc}" class="table-thumb-box" onclick="openModal(${item.id})" loading="lazy">
        </td>
        <td><strong style="color: #1F3864;">${item.item_code}</strong></td>
        <td>
          <span style="font-weight: 700; color: #0F172A; cursor: pointer;" onclick="openModal(${item.id})">${item.name}</span>
          <div style="font-size: 0.76rem; color: #64748B;">สถานที่: ${item.location}</div>
        </td>
        <td><span class="category-badge-chip chip-cat${item.category_id}" style="position: static; font-size: 0.72rem; padding: 2px 7px;">${item.category_name}</span></td>
        <td style="text-align: right; font-weight: 700; font-size: 1.1rem; color: #1F3864;">${item.qty}</td>
        <td style="text-align: center; color: #64748B;">${item.unit}</td>
        <td style="text-align: center;"><span style="color: #10B981; font-weight: 700; font-size: 0.82rem;">${item.status}</span></td>
        <td style="text-align: center;">
          <button class="btn-request" style="min-height: 32px; padding: 0 0.65rem; font-size: 0.8rem;" onclick="addToCart(${item.id})">
            + ขอเบิก
          </button>
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;
  container.innerHTML = html;
}

// Modal inspection
function openModal(id) {
  const item = allItems.find(x => x.id === id);
  if (!item) return;

  const imgSrc = item.image ? `images/${item.image}` : '';
  const imgWrapper = document.getElementById('dialogImageStage');
  if (imgSrc) {
    imgWrapper.innerHTML = `<img src="${imgSrc}" alt="${item.name}">`;
    imgWrapper.style.display = 'flex';
  } else {
    imgWrapper.style.display = 'none';
  }

  document.getElementById('dialogCodeBadge').textContent = item.item_code;
  document.getElementById('dialogItemTitle').textContent = item.name;
  document.getElementById('dialogCategoryDesc').textContent = `${item.category_name} — ${item.category_desc}`;
  document.getElementById('dialogStockQty').textContent = `${item.qty} ${item.unit}`;
  document.getElementById('dialogLocationText').textContent = item.location;
  document.getElementById('dialogReadyStatus').textContent = item.status;

  const addBtn = document.getElementById('dialogAddToCartBtn');
  if (addBtn) {
    addBtn.onclick = () => {
      addToCart(item.id);
      closeModal();
    };
  }

  document.getElementById('itemModalDialog').classList.add('active');
}

function closeModal() {
  const modal = document.getElementById('itemModalDialog');
  if (modal) modal.classList.remove('active');
}

// Requisition Cart
function addToCart(id) {
  const item = allItems.find(x => x.id === id);
  if (!item) return;

  const existing = requisitionCart.find(x => x.id === id);
  if (existing) {
    if (existing.requestedQty < item.qty) {
      existing.requestedQty += 1;
    }
  } else {
    requisitionCart.push({
      id: item.id,
      item_code: item.item_code,
      name: item.name,
      unit: item.unit,
      maxQty: item.qty,
      requestedQty: 1,
      image: item.image
    });
  }

  updateCartBadge();
  renderCartItems();
  openCart();
}

function updateCartBadge() {
  const totalItems = requisitionCart.reduce((sum, it) => sum + it.requestedQty, 0);
  const badge = document.getElementById('cartCounterPill');
  if (badge) badge.textContent = totalItems;
  const mobileBadge = document.getElementById('mobileCartCounter');
  if (mobileBadge) mobileBadge.textContent = totalItems;
}

function renderCartItems() {
  const container = document.getElementById('cartScrollContainer');
  if (!container) return;

  if (requisitionCart.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 1rem; color: #64748B;">
        <span style="font-size: 2.5rem;">📋</span>
        <h4 style="margin-top: 0.5rem; color: #1F3864;">ยังไม่มีรายการในภารกิจเบิก-ยืม</h4>
        <p style="font-size: 0.85rem;">กดปุ่ม "+ ขอเบิกภารกิจ" ที่พัสดุเพื่อเลือกรายการ</p>
      </div>
    `;
    return;
  }

  let html = '';
  requisitionCart.forEach((item, idx) => {
    const imgSrc = item.image ? `images/${item.image}` : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%2394A3B8" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>';

    html += `
      <div style="display: flex; align-items: center; gap: 0.8rem; padding: 0.8rem 0; border-bottom: 1px solid #E2E8F0;">
        <img src="${imgSrc}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 8px; border: 1px solid #E2E8F0;">
        <div style="flex: 1;">
          <h5 style="font-size: 0.9rem; font-weight: 700; color: #0F172A;">${item.name}</h5>
          <span style="font-size: 0.76rem; color: #64748B;">${item.item_code} | มีในคลัง ${item.maxQty} ${item.unit}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.35rem;">
          <input type="number" min="1" max="${item.maxQty}" value="${item.requestedQty}" style="width: 55px; padding: 0.35rem; border: 1px solid #CBD5E1; border-radius: 6px; text-align: center; font-weight: 700; color: #1F3864;" onchange="changeCartQty(${idx}, this.value)">
          <span style="font-size: 0.8rem; color: #64748B;">${item.unit}</span>
          <button style="background: none; border: none; color: #EF4444; font-size: 1.15rem; cursor: pointer; padding: 0.25rem;" onclick="removeFromCart(${idx})" title="ลบรายการ">✕</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function changeCartQty(index, newQty) {
  const val = parseInt(newQty) || 1;
  const item = requisitionCart[index];
  if (val > item.maxQty) {
    item.requestedQty = item.maxQty;
  } else if (val < 1) {
    item.requestedQty = 1;
  } else {
    item.requestedQty = val;
  }
  updateCartBadge();
  renderCartItems();
}

function removeFromCart(index) {
  requisitionCart.splice(index, 1);
  updateCartBadge();
  renderCartItems();
}

function openCart() {
  const drawer = document.getElementById('missionCartDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  if (drawer) drawer.classList.add('active');
  if (backdrop) backdrop.classList.add('active');
  renderCartItems();
}

function closeCart() {
  const drawer = document.getElementById('missionCartDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  if (drawer) drawer.classList.remove('active');
  if (backdrop) backdrop.classList.remove('active');
}

function handleRequisitionSubmit() {
  if (requisitionCart.length === 0) {
    alert('กรุณาเลือกรายการพัสดุอย่างน้อย ๑ รายการ');
    return;
  }

  const requesterName = prompt('ระบุชื่อผู้ขอเบิก-ยืมภารกิจ (ยศ-ชื่อ สกุล / นพอ. ชั้นปี):', 'นพอ. ชั้นปีที่ ๓');
  if (!requesterName) return;

  const missionTitle = prompt('ระบุภารกิจหรือวัตถุประสงค์ในการเบิกใช้งาน:', 'การฝึกทางทหาร / พิธีการโรงเรียน');
  if (!missionTitle) return;

  const printWindow = window.open('', '_blank');
  const dateStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  
  let tableRows = '';
  requisitionCart.forEach((it, idx) => {
    tableRows += `
      <tr>
        <td style="text-align: center; border: 1px solid #000; padding: 6px;">${idx + 1}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 6px;">${it.item_code}</td>
        <td style="border: 1px solid #000; padding: 6px;">${it.name}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 6px; font-weight: bold;">${it.requestedQty}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 6px;">${it.unit}</td>
        <td style="border: 1px solid #000; padding: 6px;">คลังพัสดุปกครอง วพอ.</td>
      </tr>
    `;
  });

  printWindow.document.write(`
    <html>
      <head>
        <title>ใบขอเบิก-ยืมพัสดุปกครอง วพอ. (ภารกิจ)</title>
        <style>
          body { font-family: 'Sarabun', -apple-system, sans-serif; padding: 40px; color: #000; line-height: 1.5; }
          .header-box { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #000; padding-bottom: 15px; }
          h2, h3 { margin: 4px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { border: 1px solid #000; background: #EFEFEF; padding: 8px; font-size: 13px; }
          td { font-size: 13px; }
          .sig-container { display: flex; justify-content: space-between; margin-top: 55px; text-align: center; }
          .sig-col { width: 42%; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <img src="images/logo_rtafnc.png" alt="ตราสัญลักษณ์ วพอ." style="width: 72px; height: 72px; object-fit: contain; margin-bottom: 8px;">
          <h3 style="margin: 3px 0; font-size: 15px;">วิทยาลัยพยาบาลทหารอากาศ กรมแพทย์ทหารอากาศ</h3>
          <h2 style="margin: 4px 0; font-size: 19px; color: #1F3864;">ใบขอเบิก-ยืมพัสดุปกครอง (Logistics Mission Slip)</h2>
          <p style="font-size: 13px; margin-top: 4px; color: #4B5563;">ระบบควบคุมพัสดุปกครอง ๑ ๒ ๓ ปีการศึกษา ๒๕๖๙</p>
        </div>

        <p><strong>วันที่ทำรายการ:</strong> ${dateStr} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>เลขที่ใบเบิก:</strong> REQ-${Date.now().toString().slice(-6)}</p>
        <p><strong>ผู้ขอเบิก:</strong> ${requesterName} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>ภารกิจ/วัตถุประสงค์:</strong> ${missionTitle}</p>
        
        <table>
          <thead>
            <tr>
              <th style="width: 50px;">ลำดับ</th>
              <th style="width: 120px;">รหัสพัสดุ</th>
              <th>รายการสิ่งของพัสดุ</th>
              <th style="width: 80px;">จำนวนเบิก</th>
              <th style="width: 80px;">หน่วยนับ</th>
              <th style="width: 160px;">สถานที่จัดเก็บ</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="sig-container">
          <div class="sig-col">
            <p>ลงชื่อ......................................................ผู้ขอเบิก</p>
            <p>(${requesterName})</p>
            <p>วันที่ ......./......./.......</p>
          </div>
          <div class="sig-col">
            <p>ลงชื่อ......................................................ผู้จ่าย/นายทะเบียน</p>
            <p>( เจ้าหน้าที่พัสดุ แผนกปกครอง วพอ. )</p>
            <p>วันที่ ......./......./.......</p>
          </div>
        </div>

        <script>
          window.print();
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();

  alert('ส่งรายการขอเบิกเรียบร้อยแล้ว! เอกสารพร้อมพิมพ์ทันที');
  requisitionCart = [];
  updateCartBadge();
  closeCart();
}
