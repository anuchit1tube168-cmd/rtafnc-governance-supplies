let allItems = [];
let filteredItems = [];
let currentCategory = 0; // 0 = All, 1, 2, 3
let currentView = 'grid'; // 'grid' or 'table'
let requisitionCart = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  setupEventListeners();
  updateCartBadge();
});

async function loadData() {
  try {
    const res = await fetch('data.json');
    allItems = await res.json();
    filteredItems = [...allItems];
    updateKPIs();
    renderItems();
  } catch (err) {
    console.error('Error loading data:', err);
    document.getElementById('itemsContainer').innerHTML = `
      <div class="empty-state">
        <h3>เกิดข้อผิดพลาดในการโหลดข้อมูล</h3>
        <p>${err.message}</p>
      </div>
    `;
  }
}

function updateKPIs() {
  const c1 = allItems.filter(x => x.category_id === 1);
  const c2 = allItems.filter(x => x.category_id === 2);
  const c3 = allItems.filter(x => x.category_id === 3);

  document.getElementById('kpiTotalCount').textContent = allItems.length;
  document.getElementById('kpiCat1Count').textContent = c1.length;
  document.getElementById('kpiCat2Count').textContent = c2.length;
  document.getElementById('kpiCat3Count').textContent = c3.length;
  
  document.getElementById('badgeAll').textContent = allItems.length;
  document.getElementById('badgeCat1').textContent = c1.length;
  document.getElementById('badgeCat2').textContent = c2.length;
  document.getElementById('badgeCat3').textContent = c3.length;
}

function setupEventListeners() {
  // Search input
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', (e) => {
    applyFilters();
  });

  // Category Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = parseInt(btn.dataset.category);
      applyFilters();
    });
  });

  // View toggle
  document.getElementById('btnViewGrid').addEventListener('click', () => {
    setView('grid');
  });
  document.getElementById('btnViewTable').addEventListener('click', () => {
    setView('table');
  });

  // Modal close
  document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
  document.getElementById('itemModal').addEventListener('click', (e) => {
    if (e.target.id === 'itemModal') closeModal();
  });

  // Cart Drawer toggle
  document.getElementById('btnOpenCart').addEventListener('click', openCart);
  document.getElementById('btnCloseCart').addEventListener('click', closeCart);
  document.getElementById('cartOverlay').addEventListener('click', closeCart);

  // Submit Requisition
  document.getElementById('btnSubmitRequisition').addEventListener('click', handleRequisitionSubmit);
}

function setView(view) {
  currentView = view;
  document.getElementById('btnViewGrid').classList.toggle('active', view === 'grid');
  document.getElementById('btnViewTable').classList.toggle('active', view === 'table');
  renderItems();
}

function applyFilters() {
  const query = document.getElementById('searchInput').value.trim().toLowerCase();

  filteredItems = allItems.filter(item => {
    // Category filter
    if (currentCategory !== 0 && item.category_id !== currentCategory) {
      return false;
    }
    // Search query filter
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
  const countLabel = document.getElementById('resultCountLabel');
  countLabel.textContent = `แสดง ${filteredItems.length} รายการ จากทั้งหมด ${allItems.length} รายการ`;

  if (filteredItems.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span style="font-size: 2.5rem;">🔍</span>
        <h3 style="margin-top: 0.5rem;">ไม่พบรายการพัสดุที่ตรงกับเงื่อนไข</h3>
        <p>ลองค้นหาด้วยคำสำคัญอื่น หรือเปลี่ยนหมวดหมู่</p>
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
  let html = '<div class="items-grid">';
  
  filteredItems.forEach(item => {
    const tagClass = `tag-cat${item.category_id}`;
    const imgSrc = item.image ? `images/${item.image}` : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="%2394A3B8" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';

    html += `
      <div class="item-card">
        <div class="card-img-container" onclick="openModal(${item.id})">
          <img src="${imgSrc}" alt="${item.name}" class="card-img" loading="lazy" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2394A3B8%22 stroke-width=%221.5%22><rect x=%223%22 y=%223%22 width=%2218%22 height=%2218%22 rx=%222%22/><circle cx=%228.5%22 cy=%228.5%22 r=%221.5%22/><polyline points=%2221 15 16 10 5 21%22/></svg>'">
          <span class="category-tag ${tagClass}">${item.category_name}</span>
        </div>
        <div class="card-body">
          <span class="item-code">${item.item_code}</span>
          <h3 class="item-title" title="${item.name}">${item.name}</h3>
          <div class="stock-info">
            <div>
              <span class="qty-badge">${item.qty}</span>
              <span class="unit-label">${item.unit}</span>
            </div>
            <span style="font-size: 0.78rem; color: #10B981; font-weight: 600;">✓ ${item.status}</span>
          </div>
          <div class="card-actions">
            <button class="btn-borrow" onclick="addToCart(${item.id})">
              + ขอเบิก-ยืม
            </button>
            <button class="btn-zoom" onclick="openModal(${item.id})" title="ดูภาพขยาย">
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
    <div class="items-table-container">
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 60px;">รูป</th>
            <th style="width: 130px;">รหัสพัสดุ</th>
            <th>รายการสิ่งของ</th>
            <th style="width: 170px;">หมวดหมู่</th>
            <th style="width: 90px; text-align: right;">คงเหลือ</th>
            <th style="width: 80px; text-align: center;">หน่วย</th>
            <th style="width: 110px; text-align: center;">สถานะ</th>
            <th style="width: 110px; text-align: center;">การดำเนินการ</th>
          </tr>
        </thead>
        <tbody>
  `;

  filteredItems.forEach(item => {
    const imgSrc = item.image ? `images/${item.image}` : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="%2394A3B8" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>';

    html += `
      <tr>
        <td>
          <img src="${imgSrc}" class="table-thumb" onclick="openModal(${item.id})" loading="lazy">
        </td>
        <td><strong>${item.item_code}</strong></td>
        <td>
          <span style="font-weight: 600; cursor: pointer;" onclick="openModal(${item.id})">${item.name}</span>
          <div style="font-size: 0.76rem; color: #64748B;">สถานที่: ${item.location}</div>
        </td>
        <td><span class="category-tag tag-cat${item.category_id}" style="position: static;">${item.category_name}</span></td>
        <td style="text-align: right; font-weight: bold; font-size: 1.05rem; color: var(--primary);">${item.qty}</td>
        <td style="text-align: center; color: var(--text-muted);">${item.unit}</td>
        <td style="text-align: center;"><span style="color: #10B981; font-weight: 600; font-size: 0.82rem;">${item.status}</span></td>
        <td style="text-align: center;">
          <button class="btn-borrow" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="addToCart(${item.id})">
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

// Modal logic
function openModal(id) {
  const item = allItems.find(x => x.id === id);
  if (!item) return;

  const imgSrc = item.image ? `images/${item.image}` : '';
  const imgWrapper = document.getElementById('modalImgWrapper');
  if (imgSrc) {
    imgWrapper.innerHTML = `<img src="${imgSrc}" alt="${item.name}">`;
    imgWrapper.style.display = 'flex';
  } else {
    imgWrapper.style.display = 'none';
  }

  document.getElementById('modalItemCode').textContent = item.item_code;
  document.getElementById('modalItemName').textContent = item.name;
  document.getElementById('modalCategory').textContent = `${item.category_name} (${item.category_desc})`;
  document.getElementById('modalQty').textContent = `${item.qty} ${item.unit}`;
  document.getElementById('modalLocation').textContent = item.location;
  document.getElementById('modalStatus').textContent = item.status;

  const addBtn = document.getElementById('modalAddToCartBtn');
  addBtn.onclick = () => {
    addToCart(item.id);
    closeModal();
  };

  document.getElementById('itemModal').classList.add('active');
}

function closeModal() {
  document.getElementById('itemModal').classList.remove('active');
}

// Cart logic
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
  document.getElementById('cartBadge').textContent = totalItems;
}

function renderCartItems() {
  const container = document.getElementById('cartItemsList');
  if (requisitionCart.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="margin-top: 2rem;">
        <span style="font-size: 2.5rem;">📋</span>
        <h4 style="margin-top: 0.5rem;">ยังไม่มีรายการในใบเบิก-ยืม</h4>
        <p style="font-size: 0.85rem;">กดปุ่ม "+ ขอเบิก-ยืม" ที่การ์ดพัสดุเพื่อเลือกรายการ</p>
      </div>
    `;
    return;
  }

  let html = '';
  requisitionCart.forEach((item, idx) => {
    const imgSrc = item.image ? `images/${item.image}` : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%2394A3B8" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>';

    html += `
      <div class="cart-item-row">
        <img src="${imgSrc}" class="cart-item-img">
        <div class="cart-item-details">
          <h5>${item.name}</h5>
          <span>${item.item_code} | สูงสุด ${item.maxQty} ${item.unit}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.3rem;">
          <input type="number" min="1" max="${item.maxQty}" value="${item.requestedQty}" class="cart-qty-input" onchange="changeCartQty(${idx}, this.value)">
          <span style="font-size: 0.8rem; color: #64748B;">${item.unit}</span>
          <button style="background: none; border: none; color: #EF4444; font-size: 1.1rem; cursor: pointer; padding: 0.2rem;" onclick="removeFromCart(${idx})" title="ลบรายการ">✕</button>
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
  document.getElementById('cartDrawer').classList.add('active');
  document.getElementById('cartOverlay').classList.add('active');
  renderCartItems();
}

function closeCart() {
  document.getElementById('cartDrawer').classList.remove('active');
  document.getElementById('cartOverlay').classList.remove('active');
}

function handleRequisitionSubmit() {
  if (requisitionCart.length === 0) {
    alert('กรุณาเลือกรายการพัสดุอย่างน้อย 1 รายการ');
    return;
  }

  const requesterName = prompt('ระบุชื่อผู้ขอเบิก-ยืม (ยศ-ชื่อ สกุล / ชั้นปี):', 'นพอ. ชั้นปีที่ ๓');
  if (!requesterName) return;

  const purpose = prompt('วัตถุประสงค์ในการเบิก-ยืม:', 'งานพิธีการ / การฝึกทางทหาร');
  if (!purpose) return;

  // Generate voucher preview window
  const printWindow = window.open('', '_blank');
  const dateStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  
  let tableRows = '';
  requisitionCart.forEach((it, idx) => {
    tableRows += `
      <tr>
        <td style="text-align: center; border: 1px solid #000; padding: 6px;">${idx + 1}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 6px;">${it.item_code}</td>
        <td style="border: 1px solid #000; padding: 6px;">${it.name}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 6px;">${it.requestedQty}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 6px;">${it.unit}</td>
        <td style="border: 1px solid #000; padding: 6px;">คลังพัสดุปกครอง วพอ.</td>
      </tr>
    `;
  });

  printWindow.document.write(`
    <html>
      <head>
        <title>ใบเบิก-ยืมพัสดุปกครอง วพอ.</title>
        <style>
          body { font-family: 'Sarabun', -apple-system, sans-serif; padding: 40px; }
          h2, h3 { text-align: center; margin: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { border: 1px solid #000; background: #EEE; padding: 8px; font-size: 14px; }
          td { font-size: 13px; }
          .sig-row { display: flex; justify-content: space-between; margin-top: 50px; text-align: center; }
          .sig-box { width: 40%; }
        </style>
      </head>
      <body>
        <h3>วิทยาลัยพยาบาลทหารอากาศ กรมแพทย์ทหารอากาศ</h3>
        <h2>ใบขอเบิก - ยืมพัสดุปกครอง ปีการศึกษา ๒๕๖๙</h2>
        <p style="margin-top: 20px;"><strong>วันที่ทำรายการ:</strong> ${dateStr}</p>
        <p><strong>ผู้ขอเบิก:</strong> ${requesterName} &nbsp;&nbsp;&nbsp;&nbsp; <strong>วัตถุประสงค์:</strong> ${purpose}</p>
        
        <table>
          <thead>
            <tr>
              <th style="width: 50px;">ลำดับ</th>
              <th style="width: 120px;">รหัสพัสดุ</th>
              <th>รายการสิ่งของ</th>
              <th style="width: 80px;">จำนวน</th>
              <th style="width: 80px;">หน่วยนับ</th>
              <th style="width: 150px;">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="sig-row">
          <div class="sig-box">
            <p>ลงชื่อ......................................................ผู้ขอเบิก</p>
            <p>(${requesterName})</p>
            <p>วันที่ ......./......./.......</p>
          </div>
          <div class="sig-box">
            <p>ลงชื่อ......................................................นายทะเบียน/ผู้จ่าย</p>
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

  alert('สร้างใบขอเบิก-ยืมพัสดุเรียบร้อยแล้ว!');
  requisitionCart = [];
  updateCartBadge();
  closeCart();
}
