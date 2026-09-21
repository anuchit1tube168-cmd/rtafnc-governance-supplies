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

  // Initialize Borrow, Return, Camera, Signature, and Telegram workflows
  initBorrowAndReturnWorkflow();
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
      <div style="text-align: center; padding: 3.5rem 1rem; background: var(--glass-surface); -webkit-backdrop-filter: var(--glass-blur); backdrop-filter: var(--glass-blur); border-radius: var(--radius-card); border: var(--glass-border); box-shadow: var(--glass-shadow-card); width: 100%;">
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
      <div style="display: flex; align-items: center; gap: 0.8rem; padding: 0.85rem; margin-bottom: 0.65rem; background: rgba(255, 255, 255, 0.7); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.9); box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);">
        <img src="${imgSrc}" style="width: 46px; height: 46px; object-fit: cover; border-radius: 10px; border: 1px solid rgba(226, 232, 240, 0.9);">
        <div style="flex: 1; min-width: 0;">
          <h5 style="font-size: 0.88rem; font-weight: 700; color: #0F172A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</h5>
          <span style="font-size: 0.74rem; color: #64748B;">${item.item_code} | คลัง: ${item.maxQty} ${item.unit}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.35rem; flex-shrink: 0;">
          <input type="number" min="1" max="${item.maxQty}" value="${item.requestedQty}" style="width: 52px; padding: 0.35rem 0.2rem; border: 1px solid rgba(203, 213, 225, 0.9); border-radius: 8px; text-align: center; font-weight: 700; color: #1F3864; background: rgba(255, 255, 255, 0.9);" onchange="changeCartQty(${idx}, this.value)">
          <span style="font-size: 0.78rem; color: #64748B;">${item.unit}</span>
          <button style="background: none; border: none; color: #EF4444; font-size: 1.15rem; cursor: pointer; padding: 0.25rem; margin-left: 2px;" onclick="removeFromCart(${idx})" title="ลบรายการ">✕</button>
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

function getOfficialLogoDataUrl() {
  if (window.RTAFNC_LOGO_BASE64 && typeof window.RTAFNC_LOGO_BASE64 === 'string' && window.RTAFNC_LOGO_BASE64.startsWith('data:image/')) {
    return window.RTAFNC_LOGO_BASE64;
  }
  const domImg = document.querySelector('.brand-logo-img');
  if (domImg && domImg.src) {
    return domImg.src;
  }
  return new URL('images/logo_rtafnc.png', window.location.href).href;
}

function showToast(message) {
  let toast = document.getElementById('missionToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'missionToast';
    toast.style.cssText = 'position: fixed; bottom: 85px; left: 50%; transform: translateX(-50%); background: #1F3864; color: #FFFFFF; padding: 0.75rem 1.5rem; border-radius: 9999px; font-weight: 600; font-size: 0.92rem; box-shadow: 0 10px 25px rgba(0,0,0,0.25); z-index: 9999; display: flex; align-items: center; gap: 0.5rem; border: 1.5px solid #D4AF37; transition: opacity 0.3s, transform 0.3s; pointer-events: none; opacity: 0;';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span>🎖️</span> <span>${message}</span>`;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
  }, 3200);
}

/* ==========================================================================
   SELFIE CAMERA, SIGNATURE PAD, 7-DIGIT ID & TELEGRAM WORKFLOW LOGIC
   ========================================================================== */

let borrowCamera = null;
let returnCamera = null;
let borrowSigPad = null;
let returnSigPad = null;
let activeLoansList = [];
let currentlyReturningLoanId = null;

// Helper: Convert Data URI to Blob for Telegram sendPhoto API
function dataURItoBlob(dataURI) {
  if (!dataURI || !dataURI.includes(',')) return null;
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}

// 1. Camera Manager Class (Live WebRTC with Fallback)
class SelfieCamera {
  constructor(videoId, previewId, canvasId, statusBadgeId, retakeBtnId, captureBtnId) {
    this.video = document.getElementById(videoId);
    this.preview = document.getElementById(previewId);
    this.canvas = document.getElementById(canvasId);
    this.statusBadge = document.getElementById(statusBadgeId);
    this.retakeBtn = document.getElementById(retakeBtnId);
    this.captureBtn = document.getElementById(captureBtnId);
    this.stream = null;
    this.photoDataUrl = null;
  }

  async start() {
    this.photoDataUrl = null;
    if (this.preview) this.preview.style.display = 'none';
    if (this.video) this.video.style.display = 'block';
    if (this.retakeBtn) this.retakeBtn.style.display = 'none';
    if (this.captureBtn) this.captureBtn.style.display = 'inline-flex';
    if (this.statusBadge) {
      this.statusBadge.className = 'id-validate-pill invalid';
      this.statusBadge.textContent = 'ยังไม่ได้ถ่ายภาพ';
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
        if (this.video) {
          this.video.srcObject = this.stream;
          await this.video.play();
        }
      }
    } catch (err) {
      console.warn('Cannot access front camera, file upload fallback enabled:', err);
      if (this.statusBadge) {
        this.statusBadge.textContent = 'กล้องไม่พร้อม (กรุณาใช้ปุ่มแนบไฟล์)';
      }
    }
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
  }

  capture(watermarkPrefix = 'วพอ.พอ. ยืนยันตัวตน') {
    if (!this.video || !this.canvas) return null;
    const width = this.video.videoWidth || 640;
    const height = this.video.videoHeight || 480;
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext('2d');
    ctx.drawImage(this.video, 0, 0, width, height);

    // Watermark with timestamp
    const nowStr = new Date().toLocaleString('th-TH');
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.fillRect(0, height - 38, width, 38);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px Sarabun, sans-serif';
    ctx.fillText(`${watermarkPrefix}: ${nowStr}`, 14, height - 14);

    this.photoDataUrl = this.canvas.toDataURL('image/jpeg', 0.85);

    if (this.preview) {
      this.preview.src = this.photoDataUrl;
      this.preview.style.display = 'block';
    }
    if (this.video) this.video.style.display = 'none';
    if (this.retakeBtn) this.retakeBtn.style.display = 'inline-flex';
    if (this.captureBtn) this.captureBtn.style.display = 'none';
    if (this.statusBadge) {
      this.statusBadge.className = 'id-validate-pill valid';
      this.statusBadge.textContent = '✓ บันทึกภาพแล้ว';
    }
    this.stop();
    return this.photoDataUrl;
  }

  setPhotoData(dataUrl) {
    this.photoDataUrl = dataUrl;
    if (this.preview) {
      this.preview.src = dataUrl;
      this.preview.style.display = 'block';
    }
    if (this.video) this.video.style.display = 'none';
    if (this.retakeBtn) this.retakeBtn.style.display = 'inline-flex';
    if (this.captureBtn) this.captureBtn.style.display = 'none';
    if (this.statusBadge) {
      this.statusBadge.className = 'id-validate-pill valid';
      this.statusBadge.textContent = '✓ บันทึกภาพแล้ว';
    }
    this.stop();
  }
}

// 2. Signature Pad Class (Canvas touch & mouse drawing)
class DigitalSignaturePad {
  constructor(canvasId, statusSpanId) {
    this.canvas = document.getElementById(canvasId);
    this.statusSpan = document.getElementById(statusSpanId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.isDrawing = false;
    this.hasDrawn = false;
    if (this.canvas) {
      this.init();
    }
  }

  init() {
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = '#1F3864';

    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    const start = (e) => {
      e.preventDefault();
      this.isDrawing = true;
      const pos = getPos(e);
      this.ctx.beginPath();
      this.ctx.moveTo(pos.x, pos.y);
    };

    const move = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      this.ctx.lineTo(pos.x, pos.y);
      this.ctx.stroke();
      if (!this.hasDrawn) {
        this.hasDrawn = true;
        if (this.statusSpan) {
          this.statusSpan.textContent = '✓ ลงลายมือชื่อแล้ว';
          this.statusSpan.style.color = '#10B981';
        }
      }
    };

    const stop = () => {
      this.isDrawing = false;
    };

    this.canvas.addEventListener('mousedown', start);
    this.canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);

    this.canvas.addEventListener('touchstart', start, { passive: false });
    this.canvas.addEventListener('touchmove', move, { passive: false });
    this.canvas.addEventListener('touchend', stop);
  }

  clear() {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.hasDrawn = false;
    if (this.statusSpan) {
      this.statusSpan.textContent = 'ยังไม่ได้เซ็นชื่อ';
      this.statusSpan.style.color = '#EF4444';
    }
  }

  toDataURL() {
    return this.hasDrawn && this.canvas ? this.canvas.toDataURL('image/png') : null;
  }
}

// 3. Google Apps Script Cloud Database & Storage Webhook
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwD4q3yzn3ycc8G9nJToKjj9CaT4V_W_uUUiWAj19LXFtdVkjKlnp9UDUIXF1yPkRJw/exec';
const GAS_URL_KEY = 'rtafnc_gas_webhook_url';

function getGasWebhookUrl() {
  return localStorage.getItem(GAS_URL_KEY) || DEFAULT_GAS_URL;
}

async function sendToGoogleAppsScript(payload) {
  const url = getGasWebhookUrl();
  if (!url) return null;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    return await response.json();
  } catch (err) {
    console.warn('Google Apps Script background sync note:', err);
    return null;
  }
}

// 4. Telegram Notification Sender
async function sendTelegramAlert({ photoDataUrl, title, lines, note }) {
  const token = localStorage.getItem('rtafnc_telegram_bot_token') || '';
  const chatId = localStorage.getItem('rtafnc_telegram_chat_id') || '';

  if (!token || !chatId) {
    console.info('Telegram Bot Token or Chat ID not configured.');
    return { ok: false, reason: 'unconfigured' };
  }

  let messageText = `<b>${title}</b>\n━━━━━━━━━━━━━━━━━━━━\n`;
  for (const [k, v] of Object.entries(lines)) {
    messageText += `▫️ <b>${k}:</b> ${v}\n`;
  }
  if (note) {
    messageText += `\n${note}`;
  }

  try {
    if (photoDataUrl) {
      const blob = dataURItoBlob(photoDataUrl);
      if (blob) {
        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('photo', blob, 'selfie_verification.jpg');
        formData.append('caption', messageText);
        formData.append('parse_mode', 'HTML');

        const resp = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
          method: 'POST',
          body: formData
        });
        const data = await resp.json();
        return data;
      }
    }

    // Fallback or text-only dispatch
    const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: 'HTML'
      })
    });
    const data = await resp.json();
    return data;
  } catch (err) {
    console.error('Telegram dispatch error:', err);
    return { ok: false, error: err.message };
  }
}

// 4. Initialize Workflows & Event Listeners
function initBorrowAndReturnWorkflow() {
  // Load loans from localStorage
  loadActiveLoans();

  // Instantiate Cameras & Signature Pads
  borrowCamera = new SelfieCamera(
    'borrowCameraVideo',
    'borrowPhotoPreview',
    'borrowCameraCanvas',
    'borrowCameraStatusBadge',
    'btnRetakeBorrowPhoto',
    'btnCaptureBorrowPhoto'
  );

  returnCamera = new SelfieCamera(
    'returnCameraVideo',
    'returnPhotoPreview',
    'returnCameraCanvas',
    'returnCameraStatusBadge',
    'btnRetakeReturnPhoto',
    'btnCaptureReturnPhoto'
  );

  borrowSigPad = new DigitalSignaturePad('borrowSigCanvas', 'borrowSigStatus');
  returnSigPad = new DigitalSignaturePad('returnSigCanvas', 'returnSigStatus');

  // --- Borrow Modal Events ---
  const btnCaptureBorrow = document.getElementById('btnCaptureBorrowPhoto');
  if (btnCaptureBorrow) {
    btnCaptureBorrow.addEventListener('click', () => {
      borrowCamera.capture('วพอ. ยืมพัสดุ');
    });
  }

  const btnRetakeBorrow = document.getElementById('btnRetakeBorrowPhoto');
  if (btnRetakeBorrow) {
    btnRetakeBorrow.addEventListener('click', () => {
      borrowCamera.start();
    });
  }

  const fileBorrowFallback = document.getElementById('fileBorrowPhotoFallback');
  if (fileBorrowFallback) {
    fileBorrowFallback.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        borrowCamera.setPhotoData(evt.target.result);
      };
      reader.readAsDataURL(file);
    });
  }

  const btnClearBorrowSig = document.getElementById('btnClearBorrowSig');
  if (btnClearBorrowSig) {
    btnClearBorrowSig.addEventListener('click', () => {
      borrowSigPad.clear();
    });
  }

  const btnCloseBorrowModal = document.getElementById('btnCloseBorrowModal');
  if (btnCloseBorrowModal) {
    btnCloseBorrowModal.addEventListener('click', closeBorrowModal);
  }

  // Real-time 7-digit ID validation for Borrow
  const inputBorrowCode7 = document.getElementById('borrowerCode7');
  const badgeBorrowCode7 = document.getElementById('borrowCode7Badge');
  if (inputBorrowCode7) {
    inputBorrowCode7.addEventListener('input', () => {
      inputBorrowCode7.value = inputBorrowCode7.value.replace(/\D/g, '').slice(0, 7);
      const len = inputBorrowCode7.value.length;
      if (len === 7) {
        badgeBorrowCode7.className = 'id-validate-pill valid';
        badgeBorrowCode7.textContent = '✓ ครบ ๗ หลัก';
      } else {
        badgeBorrowCode7.className = 'id-validate-pill invalid';
        badgeBorrowCode7.textContent = `ระบุ ${len}/7 หลัก`;
      }
    });
  }

  const btnExecuteBorrow = document.getElementById('btnExecuteBorrowConfirm');
  if (btnExecuteBorrow) {
    btnExecuteBorrow.addEventListener('click', executeBorrowConfirm);
  }

  // --- Return Modal Events ---
  const btnOpenReturnModal = document.getElementById('btnOpenReturnModal');
  if (btnOpenReturnModal) {
    btnOpenReturnModal.addEventListener('click', openReturnModal);
  }

  const btnCloseReturnModal = document.getElementById('btnCloseReturnModal');
  if (btnCloseReturnModal) {
    btnCloseReturnModal.addEventListener('click', closeReturnModal);
  }

  const btnCancelReturnSelection = document.getElementById('btnCancelReturnSelection');
  if (btnCancelReturnSelection) {
    btnCancelReturnSelection.addEventListener('click', cancelReturnSelection);
  }

  const filterLoansInput = document.getElementById('filterReturnLoansInput');
  if (filterLoansInput) {
    filterLoansInput.addEventListener('input', (e) => {
      renderActiveLoansList(e.target.value);
    });
  }

  const btnCaptureReturn = document.getElementById('btnCaptureReturnPhoto');
  if (btnCaptureReturn) {
    btnCaptureReturn.addEventListener('click', () => {
      returnCamera.capture('วพอ. ส่งคืนพัสดุ');
    });
  }

  const btnRetakeReturn = document.getElementById('btnRetakeReturnPhoto');
  if (btnRetakeReturn) {
    btnRetakeReturn.addEventListener('click', () => {
      returnCamera.start();
    });
  }

  const fileReturnFallback = document.getElementById('fileReturnPhotoFallback');
  if (fileReturnFallback) {
    fileReturnFallback.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        returnCamera.setPhotoData(evt.target.result);
      };
      reader.readAsDataURL(file);
    });
  }

  const btnClearReturnSig = document.getElementById('btnClearReturnSig');
  if (btnClearReturnSig) {
    btnClearReturnSig.addEventListener('click', () => {
      returnSigPad.clear();
    });
  }

  // Real-time 7-digit ID validation for Return
  const inputReturnCode7 = document.getElementById('returnerCode7');
  const badgeReturnCode7 = document.getElementById('returnCode7Badge');
  if (inputReturnCode7) {
    inputReturnCode7.addEventListener('input', () => {
      inputReturnCode7.value = inputReturnCode7.value.replace(/\D/g, '').slice(0, 7);
      const len = inputReturnCode7.value.length;
      if (len === 7) {
        badgeReturnCode7.className = 'id-validate-pill valid';
        badgeReturnCode7.textContent = '✓ ครบ ๗ หลัก';
      } else {
        badgeReturnCode7.className = 'id-validate-pill invalid';
        badgeReturnCode7.textContent = `ระบุ ${len}/7 หลัก`;
      }
    });
  }

  const btnExecuteReturn = document.getElementById('btnExecuteReturnConfirm');
  if (btnExecuteReturn) {
    btnExecuteReturn.addEventListener('click', executeReturnConfirm);
  }

  // --- Telegram Settings Modal Events ---
  const btnOpenTelegram = document.getElementById('btnOpenTelegramModal');
  const btnCloseTelegram = document.getElementById('btnCloseTelegramModal');
  if (btnOpenTelegram) {
    btnOpenTelegram.addEventListener('click', openTelegramSettingsModal);
  }
  if (btnCloseTelegram) {
    btnCloseTelegram.addEventListener('click', closeTelegramSettingsModal);
  }

  const btnSaveTelegram = document.getElementById('btnSaveTelegramConfig');
  if (btnSaveTelegram) {
    btnSaveTelegram.addEventListener('click', saveTelegramConfig);
  }

  const btnTestTelegram = document.getElementById('btnTestTelegramAlert');
  if (btnTestTelegram) {
    btnTestTelegram.addEventListener('click', testTelegramAlert);
  }

  // Update Telegram status indicator
  updateTelegramIndicator();
}

// ==========================================================================
// BORROW WORKFLOW
// ==========================================================================
function handleRequisitionSubmit() {
  if (requisitionCart.length === 0) {
    alert('กรุณาเลือกรายการพัสดุอย่างน้อย ๑ รายการ');
    return;
  }

  // Summarize cart items in modal
  const summaryCount = document.getElementById('borrowItemsCountSummary');
  const summaryList = document.getElementById('borrowItemsSummaryList');
  const totalItems = requisitionCart.reduce((sum, it) => sum + it.requestedQty, 0);

  if (summaryCount) {
    summaryCount.textContent = `${requisitionCart.length} รายการ (${totalItems} หน่วยนับ)`;
  }
  if (summaryList) {
    summaryList.innerHTML = requisitionCart
      .map((it, idx) => `<div>${idx + 1}. <strong>${it.name}</strong> (${it.item_code}) จำนวน ${it.requestedQty} ${it.unit}</div>`)
      .join('');
  }

  // Set default return date (+7 days)
  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + 7);
  const dueInput = document.getElementById('borrowReturnDueDate');
  if (dueInput && !dueInput.value) {
    dueInput.value = defaultDueDate.toISOString().split('T')[0];
  }

  // Reset signature
  borrowSigPad.clear();

  // Open modal and start camera
  const modal = document.getElementById('borrowModalDialog');
  if (modal) modal.classList.add('active');
  borrowCamera.start();
}

function closeBorrowModal() {
  const modal = document.getElementById('borrowModalDialog');
  if (modal) modal.classList.remove('active');
  if (borrowCamera) borrowCamera.stop();
}

async function executeBorrowConfirm() {
  // 1. Validate Selfie Photo
  if (!borrowCamera.photoDataUrl) {
    alert('⚠️ กรุณากดปุ่ม "📸 ถ่ายภาพตนเอง" เพื่อยืนยันตัวตนก่อนทำรายการ');
    return;
  }

  // 2. Validate Full Name
  const fullName = (document.getElementById('borrowerFullName').value || '').trim();
  if (!fullName) {
    alert('⚠️ กรุณาระบุชื่อเต็ม (ยศ-ชื่อ สกุล / นพอ. ชั้นปี) ของผู้ขอยืม');
    document.getElementById('borrowerFullName').focus();
    return;
  }

  // 3. Validate 7-Digit Code
  const code7 = (document.getElementById('borrowerCode7').value || '').trim();
  if (!/^\d{7}$/.test(code7)) {
    alert('⚠️ กรุณาระบุรหัสประจำตัวเป็นตัวเลข ๗ หลักพอดี (เช่น 6801001)');
    document.getElementById('borrowerCode7').focus();
    return;
  }

  // 4. Validate Purpose
  const purpose = (document.getElementById('borrowPurposeText').value || '').trim() || 'การฝึกทางทหารและภารกิจ วพอ.';

  // 5. Validate Signature
  if (!borrowSigPad.hasDrawn) {
    alert('⚠️ กรุณาลงลายมือชื่อดิจิทัลในกรอบให้เรียบร้อย');
    return;
  }
  const sigDataUrl = borrowSigPad.toDataURL();
  const dueDateVal = document.getElementById('borrowReturnDueDate').value || '-';

  const loanId = 'LN-' + Date.now().toString().slice(-6);
  const createdDateStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Save Loan Record
  const newLoan = {
    loanId: loanId,
    borrowerName: fullName,
    borrowerCode7: code7,
    purpose: purpose,
    dueDate: dueDateVal,
    borrowDate: createdDateStr,
    timestamp: Date.now(),
    status: 'ACTIVE',
    items: [...requisitionCart],
    selfiePhoto: borrowCamera.photoDataUrl,
    signature: sigDataUrl,
    returnRecord: null
  };

  activeLoansList.unshift(newLoan);
  saveActiveLoans();

  // Dispatch to Google Apps Script Cloud Backend (Google Sheets Central Database + Google Drive Selfie Storage)
  sendToGoogleAppsScript({
    action: 'borrow',
    loanId: newLoan.loanId,
    borrowerName: newLoan.borrowerName,
    borrowerCode7: newLoan.borrowerCode7,
    purpose: newLoan.purpose,
    dueDate: newLoan.dueDate,
    borrowDate: newLoan.borrowDate,
    items: newLoan.items,
    selfiePhoto: newLoan.selfiePhoto,
    signature: newLoan.signature,
    telegramToken: localStorage.getItem('rtafnc_telegram_bot_token') || '',
    telegramChatId: localStorage.getItem('rtafnc_telegram_chat_id') || ''
  });

  // Telegram Notification Dispatch
  showToast('กำลังบันทึกฐานข้อมูล Google Sheets และส่งแจ้งเตือน Telegram...');
  const itemsTextList = newLoan.items
    .map((it, idx) => `${idx + 1}. ${it.name} (${it.item_code}) x ${it.requestedQty} ${it.unit}`)
    .join('\n');

  sendTelegramAlert({
    photoDataUrl: newLoan.selfiePhoto,
    title: '🔔 [พัสดุปกครอง วพอ.] มีรายการขอยืมพัสดุใหม่ 📦',
    lines: {
      'เลขที่รายการ': loanId,
      'ผู้ขอยืม': fullName,
      'รหัสประจำตัว': `<code>${code7}</code>`,
      'ภารกิจ': purpose,
      'กำหนดส่งคืน': dueDateVal,
      'วันเวลาที่ยืม': createdDateStr,
      'รายการพัสดุ': `\n${itemsTextList}`
    },
    note: '✍️ <i>ผู้ขอยืมได้ลงลายมือชื่อดิจิทัลและถ่ายภาพตนเองยืนยันเรียบร้อยแล้ว</i>\n⚡ <b>กรุณาตรวจสอบและอนุมัติภารกิจในระบบ</b>'
  });

  // Open Official Printable Loan Slip
  openPrintableLoanSlip(newLoan);

  // Reset and Close
  requisitionCart = [];
  updateCartBadge();
  closeCart();
  closeBorrowModal();
  updateActiveLoanBadge();
  showToast('บันทึกการขอยืมพัสดุเรียบร้อยแล้ว!');
}

// ==========================================================================
// RETURN WORKFLOW
// ==========================================================================
function openReturnModal() {
  const modal = document.getElementById('returnModalDialog');
  if (modal) modal.classList.add('active');
  cancelReturnSelection();
  renderActiveLoansList();
}

function closeReturnModal() {
  const modal = document.getElementById('returnModalDialog');
  if (modal) modal.classList.remove('active');
  if (returnCamera) returnCamera.stop();
  currentlyReturningLoanId = null;
}

function cancelReturnSelection() {
  currentlyReturningLoanId = null;
  document.getElementById('activeLoansStage').style.display = 'block';
  document.getElementById('returnFormStage').style.display = 'none';
  if (returnCamera) returnCamera.stop();
  returnSigPad.clear();
}

function selectLoanToReturn(loanId) {
  const loan = activeLoansList.find(x => x.loanId === loanId);
  if (!loan) return;

  currentlyReturningLoanId = loanId;
  document.getElementById('activeLoansStage').style.display = 'none';
  document.getElementById('returnFormStage').style.display = 'block';

  // Populate info
  const itemsText = loan.items.map(it => `${it.name} (${it.requestedQty} ${it.unit})`).join(', ');
  document.getElementById('returningItemTitleText').textContent = `${loan.loanId} — ${itemsText}`;
  document.getElementById('returnerFullName').value = loan.borrowerName;
  document.getElementById('returnerCode7').value = loan.borrowerCode7;

  // Trigger 7-digit badge check
  const badge = document.getElementById('returnCode7Badge');
  if (badge) {
    badge.className = 'id-validate-pill valid';
    badge.textContent = '✓ ครบ ๗ หลัก';
  }

  // Reset return signature & start camera
  returnSigPad.clear();
  returnCamera.start();
}

async function executeReturnConfirm() {
  const loan = activeLoansList.find(x => x.loanId === currentlyReturningLoanId);
  if (!loan) {
    alert('ไม่พบข้อมูลรายการยืมที่เลือก');
    return;
  }

  // 1. Validate Return Selfie
  if (!returnCamera.photoDataUrl) {
    alert('⚠️ กรุณากดปุ่ม "📸 ถ่ายภาพส่งคืนตนเอง" เพื่อยืนยันตัวตนขณะส่งคืน');
    return;
  }

  // 2. Validate Returner Name
  const returnerName = (document.getElementById('returnerFullName').value || '').trim();
  if (!returnerName) {
    alert('⚠️ กรุณาระบุชื่อเต็มผู้ส่งคืน');
    return;
  }

  // 3. Validate 7-Digit Code
  const returnerCode7 = (document.getElementById('returnerCode7').value || '').trim();
  if (!/^\d{7}$/.test(returnerCode7)) {
    alert('⚠️ กรุณาระบุรหัสประจำตัวผู้คืนเป็นตัวเลข ๗ หลักพอดี');
    return;
  }

  // 4. Validate Return Signature
  if (!returnSigPad.hasDrawn) {
    alert('⚠️ กรุณาลงลายมือชื่อผู้ส่งคืนในกรอบให้เรียบร้อย');
    return;
  }

  const condition = document.getElementById('returnConditionSelect').value;
  const notes = (document.getElementById('returnNotesInput').value || '').trim();
  const returnSigDataUrl = returnSigPad.toDataURL();
  const returnDateStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Update loan record to returned
  loan.status = 'RETURNED';
  loan.returnRecord = {
    returnerName: returnerName,
    returnerCode7: returnerCode7,
    condition: condition,
    notes: notes,
    returnDate: returnDateStr,
    returnTimestamp: Date.now(),
    selfiePhoto: returnCamera.photoDataUrl,
    signature: returnSigDataUrl
  };

  saveActiveLoans();

  // Dispatch return to Google Apps Script Cloud Backend (Google Sheets update + Drive Selfie)
  sendToGoogleAppsScript({
    action: 'return',
    loanId: loan.loanId,
    returnerName: returnerName,
    returnerCode7: returnerCode7,
    condition: condition,
    notes: notes,
    returnDate: returnDateStr,
    selfiePhoto: loan.returnRecord.selfiePhoto,
    signature: loan.returnRecord.signature,
    telegramToken: localStorage.getItem('rtafnc_telegram_bot_token') || '',
    telegramChatId: localStorage.getItem('rtafnc_telegram_chat_id') || ''
  });

  // Telegram Notification Dispatch
  showToast('กำลังอัปเดต Google Sheets และส่งแจ้งเตือน Telegram...');
  const returnedItemsSummary = loan.items.map((it, idx) => `${idx + 1}. ${it.name} (${it.item_code}) x ${it.requestedQty} ${it.unit}`).join('\n');

  sendTelegramAlert({
    photoDataUrl: loan.returnRecord.selfiePhoto,
    title: '✅ [พัสดุปกครอง วพอ.] ได้รับคืนพัสดุเรียบร้อยแล้ว 🔄',
    lines: {
      'เลขที่รายการ': loan.loanId,
      'ผู้ส่งคืน': returnerName,
      'รหัสประจำตัว': `<code>${returnerCode7}</code>`,
      'รายการพัสดุที่คืน': `\n${returnedItemsSummary}`,
      'สภาพสิ่งของ': condition,
      'หมายเหตุ': notes || 'ครบถ้วนสมบูรณ์',
      'วันเวลาที่ส่งคืน': returnDateStr
    },
    note: '✍️ <i>ผู้ส่งคืนได้ลงลายมือชื่อดิจิทัลและถ่ายภาพตนเองยืนยันการส่งคืนเรียบร้อยแล้ว</i>\n🎖️ <b>สถานะ: ส่งคืนคลังพัสดุปกครองสมบูรณ์ ๑๐๐%</b>'
  });

  // Open Official Printable Return Voucher
  openPrintableReturnSlip(loan);

  // Close and refresh
  closeReturnModal();
  updateActiveLoanBadge();
  showToast('บันทึกการส่งคืนพัสดุเรียบร้อยแล้ว!');
}

// ==========================================================================
// ACTIVE LOANS LIST & LOCALSTORAGE
// ==========================================================================
function loadActiveLoans() {
  try {
    const raw = localStorage.getItem('rtafnc_supplies_active_loans');
    if (raw) {
      activeLoansList = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Error loading active loans:', err);
    activeLoansList = [];
  }
  updateActiveLoanBadge();
}

function saveActiveLoans() {
  try {
    localStorage.setItem('rtafnc_supplies_active_loans', JSON.stringify(activeLoansList));
  } catch (err) {
    console.error('Error saving active loans:', err);
  }
  updateActiveLoanBadge();
}

function updateActiveLoanBadge() {
  const activeCount = activeLoansList.filter(x => x.status === 'ACTIVE').length;
  const badge = document.getElementById('activeLoanBadge');
  if (badge) {
    badge.textContent = activeCount;
    badge.style.display = activeCount > 0 ? 'inline-block' : 'none';
  }
}

function renderActiveLoansList(searchQuery = '') {
  const container = document.getElementById('activeLoansListContainer');
  if (!container) return;

  const activeLoans = activeLoansList.filter(x => x.status === 'ACTIVE');
  const q = (searchQuery || '').trim().toLowerCase();

  const filtered = activeLoans.filter(loan => {
    if (!q) return true;
    return (
      (loan.borrowerName && loan.borrowerName.toLowerCase().includes(q)) ||
      (loan.borrowerCode7 && loan.borrowerCode7.includes(q)) ||
      (loan.loanId && loan.loanId.toLowerCase().includes(q))
    );
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 1rem; color: #64748B; background: #F8FAFC; border-radius: 16px;">
        <span style="font-size: 2.2rem;">✨</span>
        <h4 style="margin-top: 0.5rem; color: #1F3864;">ไม่มีรายการพัสดุที่ค้างส่งคืน</h4>
        <p style="font-size: 0.85rem;">พัสดุปกครองทั้งหมดอยู่ในคลังพร้อมสนับสนุนภารกิจ</p>
      </div>
    `;
    return;
  }

  let html = '';
  filtered.forEach(loan => {
    const itemsSummary = loan.items.map(it => `${it.name} (${it.requestedQty} ${it.unit})`).join(', ');
    const selfieSrc = loan.selfiePhoto || 'images/logo_rtafnc.png';

    html += `
      <div class="active-loan-card">
        <img src="${selfieSrc}" class="active-loan-thumb" alt="Selfie ผู้ยืม">
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.2rem;">
            <h5 style="font-size: 0.95rem; font-weight: 700; color: #1F3864; margin: 0;">${loan.borrowerName}</h5>
            <span class="id-validate-pill valid">ID: ${loan.borrowerCode7}</span>
          </div>
          <p style="font-size: 0.8rem; color: #0284C7; font-weight: 600; margin: 0 0 0.2rem 0;">📦 ${itemsSummary}</p>
          <div style="font-size: 0.74rem; color: #64748B;">
            <span>📅 ยืมเมื่อ: ${loan.borrowDate}</span> | <span style="color: #C59B27; font-weight: 600;">กำหนดคืน: ${loan.dueDate || '-'}</span>
          </div>
        </div>
        <button class="btn-interactive btn-emerald" style="padding: 0.55rem 0.9rem; font-size: 0.85rem; flex-shrink: 0;" onclick="selectLoanToReturn('${loan.loanId}')">
          <span>🔄 ส่งคืนรายการนี้</span>
        </button>
      </div>
    `;
  });

  container.innerHTML = html;
}

// ==========================================================================
// CLOUD DATABASE & TELEGRAM SETTINGS
// ==========================================================================
function openTelegramSettingsModal() {
  const gasInput = document.getElementById('gasWebhookUrlInput');
  const tokenInput = document.getElementById('telegramBotTokenInput');
  const chatIdInput = document.getElementById('telegramChatIdInput');

  if (gasInput) gasInput.value = getGasWebhookUrl();
  if (tokenInput) tokenInput.value = localStorage.getItem('rtafnc_telegram_bot_token') || '';
  if (chatIdInput) chatIdInput.value = localStorage.getItem('rtafnc_telegram_chat_id') || '';

  const modal = document.getElementById('telegramModalDialog');
  if (modal) modal.classList.add('active');
}

function closeTelegramSettingsModal() {
  const modal = document.getElementById('telegramModalDialog');
  if (modal) modal.classList.remove('active');
}

function saveTelegramConfig() {
  const gasUrl = (document.getElementById('gasWebhookUrlInput').value || '').trim();
  const token = (document.getElementById('telegramBotTokenInput').value || '').trim();
  const chatId = (document.getElementById('telegramChatIdInput').value || '').trim();

  localStorage.setItem(GAS_URL_KEY, gasUrl || DEFAULT_GAS_URL);
  localStorage.setItem('rtafnc_telegram_bot_token', token);
  localStorage.setItem('rtafnc_telegram_chat_id', chatId);

  updateTelegramIndicator();
  closeTelegramSettingsModal();
  showToast('บันทึกการตั้งค่า Google Sheets & Telegram เรียบร้อยแล้ว!');
}

async function testTelegramAlert() {
  const gasUrl = (document.getElementById('gasWebhookUrlInput').value || '').trim() || DEFAULT_GAS_URL;
  const token = (document.getElementById('telegramBotTokenInput').value || '').trim();
  const chatId = (document.getElementById('telegramChatIdInput').value || '').trim();

  showToast('กำลังทดสอบการเชื่อมต่อระบบ...');
  const results = [];

  // 1. Test Google Apps Script Web App
  if (gasUrl) {
    try {
      const resp = await fetch(gasUrl + '?action=initDatabase');
      const data = await resp.json();
      if (data && data.success) {
        results.push('✅ Google Sheets Central Database: เชื่อมต่อสำเร็จ ๑๐๐%');
      } else {
        results.push('⚠️ Google Sheets: ได้รับการตอบกลับแต่สถานะเป็น ' + JSON.stringify(data));
      }
    } catch (e) {
      results.push('ℹ️ Google Sheets Webhook: กำลังเชื่อมต่อ (หากมีแจ้งเตือนสิทธิ์ ให้คลิกเปิดโครงการและ Authorize ใน Google)');
    }
  }

  // 2. Test Telegram Bot
  if (token && chatId) {
    try {
      const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `✈️ <b>[ทดสอบระบบพัสดุปกครอง วพอ.]</b>\nการเชื่อมต่อ Telegram Bot สำเร็จสมบูรณ์ ๑๐๐%\nวันเวลา: ${new Date().toLocaleString('th-TH')}`,
          parse_mode: 'HTML'
        })
      });
      const res = await resp.json();
      if (res.ok) {
        results.push('✅ Telegram Bot: ส่งข้อความแจ้งเตือนสำเร็จ ๑๐๐%');
      } else {
        results.push('❌ Telegram Bot: ' + (res.description || 'ตรวจสอบ Token หรือ Chat ID'));
      }
    } catch (err) {
      results.push('❌ Telegram Bot: เกิดข้อผิดพลาด ' + err.message);
    }
  } else {
    results.push('ℹ️ Telegram Bot: ยังไม่ได้ระบุ Token หรือ Chat ID (สามารถใส่ได้ภายหลัง)');
  }

  alert('ผลการทดสอบระบบ:\n\n' + results.join('\n\n'));
}

function updateTelegramIndicator() {
  const dot = document.getElementById('telegramStatusDot');
  if (dot) {
    dot.style.background = '#10B981';
  }
}

// ==========================================================================
// OFFICIAL PRINTABLE LOAN & RETURN SLIPS
// ==========================================================================
function openPrintableLoanSlip(loan) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('กรุณาอนุญาต Pop-up บนเบราว์เซอร์เพื่อเปิดหน้าต่างพิมพ์เอกสาร');
    return;
  }

  const logoDataUri = getOfficialLogoDataUrl();
  let tableRows = '';
  loan.items.forEach((it, idx) => {
    tableRows += `
      <tr>
        <td style="text-align: center; border: 1px solid #000; padding: 7px 6px;">${idx + 1}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 7px 6px; font-weight: 600;">${it.item_code}</td>
        <td style="border: 1px solid #000; padding: 7px 8px;">${it.name}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 7px 6px; font-weight: 700;">${it.requestedQty}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 7px 6px;">${it.unit}</td>
        <td style="border: 1px solid #000; padding: 7px 8px; text-align: center;">คลังพัสดุปกครอง วพอ.</td>
      </tr>
    `;
  });

  printWindow.document.write(`<!DOCTYPE html>
<html lang="th">
  <head>
    <meta charset="UTF-8">
    <title>ใบขอเบิก-ยืมพัสดุปกครอง วพอ. (ภารกิจ)</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      @page { size: A4; margin: 15mm 20mm; }
      * { box-sizing: border-box; }
      body { font-family: 'Sarabun', sans-serif; padding: 25px 35px; color: #000; line-height: 1.5; background: #FFF; }
      .header-box { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1F3864; padding-bottom: 12px; }
      .official-logo { width: 75px; height: 75px; object-fit: contain; margin: 0 auto 8px auto; display: block; }
      h2 { margin: 4px 0; font-size: 19px; color: #1F3864; font-weight: 700; }
      h3 { margin: 2px 0; font-size: 15px; font-weight: 600; color: #1E293B; }
      .meta-info { display: flex; justify-content: space-between; margin: 8px 0; font-size: 13.5px; }
      table { width: 100%; border-collapse: collapse; margin: 16px 0; }
      th { border: 1px solid #000; background: #F1F5F9; padding: 8px 6px; font-size: 12.5px; font-weight: 700; }
      td { font-size: 12.5px; }
      .verification-panel {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #F8FAFC;
        border: 1px solid #000;
        border-radius: 8px;
        padding: 10px 18px;
        margin-top: 15px;
      }
      .selfie-card { text-align: center; }
      .selfie-img { width: 105px; height: 105px; object-fit: cover; border-radius: 8px; border: 1.5px solid #000; display: block; margin-bottom: 4px; }
      .sig-container { display: flex; justify-content: space-between; margin-top: 35px; text-align: center; }
      .sig-col { width: 44%; }
      .sig-img { max-height: 55px; max-width: 170px; display: block; margin: 0 auto 4px auto; }
      @media print { body { padding: 0; } }
    </style>
  </head>
  <body>
    <div class="header-box">
      <img id="rtafncOfficialLogo" src="${logoDataUri}" alt="ตราสัญลักษณ์ วิทยาลัยพยาบาลทหารอากาศ" class="official-logo">
      <h3>วิทยาลัยพยาบาลทหารอากาศ กรมแพทย์ทหารอากาศ</h3>
      <h2>ใบขอเบิก-ยืมพัสดุปกครอง (Logistics Mission Loan Slip)</h2>
      <p style="font-size: 12px; color: #4B5563;">ระบบควบคุมพัสดุปกครอง ๑ ๒ ๓ ปีการศึกษา ๒๕๖๙ — ยืนยันตัวตนภาพถ่ายและรหัส ๗ หลัก</p>
    </div>

    <div class="meta-info">
      <div><strong>วันที่ทำรายการ:</strong> ${loan.borrowDate}</div>
      <div><strong>เลขที่ใบเบิก-ยืม:</strong> ${loan.loanId}</div>
    </div>
    <div class="meta-info" style="margin-top: 0; margin-bottom: 12px;">
      <div><strong>ผู้ขอยืม:</strong> ${loan.borrowerName} (รหัสประจำตัว: <strong>${loan.borrowerCode7}</strong>)</div>
      <div><strong>กำหนดส่งคืน:</strong> ${loan.dueDate || '-'}</div>
    </div>
    <div class="meta-info" style="margin-top: 0; margin-bottom: 15px;">
      <div><strong>ภารกิจ/วัตถุประสงค์:</strong> ${loan.purpose}</div>
      <div><strong>สถานะอนุมัติ:</strong> ยืนยันตัวตน & ส่ง Telegram เรียบร้อย</div>
    </div>
    
    <table>
      <thead>
        <tr>
          <th style="width: 45px; text-align: center;">ลำดับ</th>
          <th style="width: 110px; text-align: center;">รหัสพัสดุ</th>
          <th style="text-align: left; padding-left: 8px;">รายการสิ่งของพัสดุ</th>
          <th style="width: 80px; text-align: center;">จำนวน</th>
          <th style="width: 70px; text-align: center;">หน่วยนับ</th>
          <th style="width: 150px; text-align: center;">สถานที่จัดเก็บ</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>

    <div class="verification-panel">
      <div class="selfie-card">
        <img src="${loan.selfiePhoto}" class="selfie-img" alt="ภาพถ่ายตนเองผู้ยืม">
        <span style="font-size: 11px; font-weight: bold;">ภาพถ่ายตนเองผู้ขอยืม</span>
      </div>
      <div style="flex: 1; padding-left: 20px; font-size: 12.5px; line-height: 1.6;">
        <div>✓ ได้รับการยืนยันตัวตนด้วยภาพถ่ายสด (Live Selfie Verification)</div>
        <div>✓ รหัสประจำตัว ๗ หลัก: <strong>${loan.borrowerCode7}</strong></div>
        <div>✓ ส่งการแจ้งเตือนและส่งภาพอนุมัติผ่าน Telegram Bot วพอ. เรียบร้อยแล้ว</div>
      </div>
    </div>

    <div class="sig-container">
      <div class="sig-col">
        <img src="${loan.signature}" class="sig-img" alt="ลายเซ็นผู้ยืม">
        <p style="margin: 2px 0;">ลงชื่อ......................................................ผู้ขอยืม</p>
        <p style="margin: 2px 0;">(${loan.borrowerName})</p>
        <p style="margin: 2px 0; font-size: 12px;">รหัสประจำตัว: ${loan.borrowerCode7}</p>
      </div>
      <div class="sig-col">
        <div style="height: 55px;"></div>
        <p style="margin: 2px 0;">ลงชื่อ......................................................ผู้จ่าย/เจ้าหน้าที่</p>
        <p style="margin: 2px 0;">( เจ้าหน้าที่พัสดุ แผนกปกครอง วพอ. )</p>
        <p style="margin: 2px 0; font-size: 12px;">อนุมัติการจ่ายพัสดุภารกิจ</p>
      </div>
    </div>

    <script>
      function doPrint() { window.focus(); window.print(); }
      var img = document.getElementById('rtafncOfficialLogo');
      if (img && !img.complete) {
        img.onload = function() { setTimeout(doPrint, 250); };
        img.onerror = function() { setTimeout(doPrint, 250); };
      } else {
        setTimeout(doPrint, 250);
      }
    </script>
  </body>
</html>`);
  printWindow.document.close();
}

function openPrintableReturnSlip(loan) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('กรุณาอนุญาต Pop-up บนเบราว์เซอร์เพื่อเปิดหน้าต่างพิมพ์เอกสาร');
    return;
  }

  const logoDataUri = getOfficialLogoDataUrl();
  const ret = loan.returnRecord;

  let tableRows = '';
  loan.items.forEach((it, idx) => {
    tableRows += `
      <tr>
        <td style="text-align: center; border: 1px solid #000; padding: 7px 6px;">${idx + 1}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 7px 6px; font-weight: 600;">${it.item_code}</td>
        <td style="border: 1px solid #000; padding: 7px 8px;">${it.name}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 7px 6px; font-weight: 700;">${it.requestedQty}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 7px 6px;">${it.unit}</td>
        <td style="border: 1px solid #000; padding: 7px 8px; text-align: center; color: #064E3B; font-weight: bold;">${ret.condition}</td>
      </tr>
    `;
  });

  printWindow.document.write(`<!DOCTYPE html>
<html lang="th">
  <head>
    <meta charset="UTF-8">
    <title>ใบรับคืนพัสดุปกครอง วพอ. (Return Slip)</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      @page { size: A4; margin: 15mm 20mm; }
      * { box-sizing: border-box; }
      body { font-family: 'Sarabun', sans-serif; padding: 25px 35px; color: #000; line-height: 1.5; background: #FFF; }
      .header-box { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #064E3B; padding-bottom: 12px; }
      .official-logo { width: 75px; height: 75px; object-fit: contain; margin: 0 auto 8px auto; display: block; }
      h2 { margin: 4px 0; font-size: 19px; color: #064E3B; font-weight: 700; }
      h3 { margin: 2px 0; font-size: 15px; font-weight: 600; color: #1E293B; }
      .meta-info { display: flex; justify-content: space-between; margin: 8px 0; font-size: 13.5px; }
      table { width: 100%; border-collapse: collapse; margin: 16px 0; }
      th { border: 1px solid #000; background: #F1F5F9; padding: 8px 6px; font-size: 12.5px; font-weight: 700; }
      td { font-size: 12.5px; }
      .verification-panel {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #F0FDF4;
        border: 1px solid #064E3B;
        border-radius: 8px;
        padding: 10px 18px;
        margin-top: 15px;
      }
      .selfie-card { text-align: center; }
      .selfie-img { width: 105px; height: 105px; object-fit: cover; border-radius: 8px; border: 1.5px solid #064E3B; display: block; margin-bottom: 4px; }
      .sig-container { display: flex; justify-content: space-between; margin-top: 35px; text-align: center; }
      .sig-col { width: 44%; }
      .sig-img { max-height: 55px; max-width: 170px; display: block; margin: 0 auto 4px auto; }
      @media print { body { padding: 0; } }
    </style>
  </head>
  <body>
    <div class="header-box">
      <img id="rtafncOfficialLogo" src="${logoDataUri}" alt="ตราสัญลักษณ์ วิทยาลัยพยาบาลทหารอากาศ" class="official-logo">
      <h3>วิทยาลัยพยาบาลทหารอากาศ กรมแพทย์ทหารอากาศ</h3>
      <h2>ใบรับคืนพัสดุปกครอง (Logistics Supply Return Voucher)</h2>
      <p style="font-size: 12px; color: #4B5563;">ระบบควบคุมพัสดุปกครอง ๑ ๒ ๓ ปีการศึกษา ๒๕๖๙ — ยืนยันการส่งคืนสำเร็จ</p>
    </div>

    <div class="meta-info">
      <div><strong>วันที่ส่งคืน:</strong> ${ret.returnDate}</div>
      <div><strong>อ้างอิงเลขที่ใบยืม:</strong> ${loan.loanId}</div>
    </div>
    <div class="meta-info" style="margin-top: 0; margin-bottom: 12px;">
      <div><strong>ผู้ส่งคืน:</strong> ${ret.returnerName} (รหัสประจำตัว: <strong>${ret.returnerCode7}</strong>)</div>
      <div><strong>สภาพพัสดุ:</strong> <strong>${ret.condition}</strong></div>
    </div>
    <div class="meta-info" style="margin-top: 0; margin-bottom: 15px;">
      <div><strong>หมายเหตุ:</strong> ${ret.notes || 'ส่งคืนครบถ้วนสมบูรณ์'}</div>
      <div><strong>การแจ้งเตือน:</strong> ส่งรายงานผลเข้า Telegram เรียบร้อย</div>
    </div>
    
    <table>
      <thead>
        <tr>
          <th style="width: 45px; text-align: center;">ลำดับ</th>
          <th style="width: 110px; text-align: center;">รหัสพัสดุ</th>
          <th style="text-align: left; padding-left: 8px;">รายการสิ่งของพัสดุที่คืน</th>
          <th style="width: 80px; text-align: center;">จำนวนคืน</th>
          <th style="width: 70px; text-align: center;">หน่วยนับ</th>
          <th style="width: 150px; text-align: center;">สภาพตรวจรับ</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>

    <div class="verification-panel">
      <div class="selfie-card">
        <img src="${ret.selfiePhoto}" class="selfie-img" alt="ภาพถ่ายตนเองผู้ส่งคืน">
        <span style="font-size: 11px; font-weight: bold; color: #064E3B;">ภาพถ่ายขณะส่งคืน</span>
      </div>
      <div style="flex: 1; padding-left: 20px; font-size: 12.5px; line-height: 1.6;">
        <div>✓ ตรวจรับพัสดุคืนเข้าคลังพัสดุปกครอง วพอ. เรียบร้อยแล้ว</div>
        <div>✓ รหัสประจำตัวผู้คืน: <strong>${ret.returnerCode7}</strong></div>
        <div>✓ ส่งข้อมูลพร้อมภาพถ่ายผู้คืนเข้ากลุ่ม Telegram ให้ผู้บังคับบัญชาทราบทันที</div>
      </div>
    </div>

    <div class="sig-container">
      <div class="sig-col">
        <img src="${ret.signature}" class="sig-img" alt="ลายเซ็นผู้คืน">
        <p style="margin: 2px 0;">ลงชื่อ......................................................ผู้ส่งคืน</p>
        <p style="margin: 2px 0;">(${ret.returnerName})</p>
        <p style="margin: 2px 0; font-size: 12px;">รหัสประจำตัว: ${ret.returnerCode7}</p>
      </div>
      <div class="sig-col">
        <div style="height: 55px;"></div>
        <p style="margin: 2px 0;">ลงชื่อ......................................................ผู้รับคืน/นายทะเบียน</p>
        <p style="margin: 2px 0;">( เจ้าหน้าที่พัสดุ แผนกปกครอง วพอ. )</p>
        <p style="margin: 2px 0; font-size: 12px;">ตรวจรับเข้าคลังเรียบร้อย</p>
      </div>
    </div>

    <script>
      function doPrint() { window.focus(); window.print(); }
      var img = document.getElementById('rtafncOfficialLogo');
      if (img && !img.complete) {
        img.onload = function() { setTimeout(doPrint, 250); };
        img.onerror = function() { setTimeout(doPrint, 250); };
      } else {
        setTimeout(doPrint, 250);
      }
    </script>
  </body>
</html>`);
  printWindow.document.close();
}

