/**
 * Roster Generator - Interactive Frontend Application
 */

const STATE = {
  year: 2026,
  month: 10,
  data: null,
  activeBrush: null,
  activeCell: null,
  role: 'guest'
};

// DOM Elements
const elements = {
  monthDisplay: document.getElementById('month-display'),
  btnPrevMonth: document.getElementById('btn-prev-month'),
  btnNextMonth: document.getElementById('btn-next-month'),
  btnJumpMonth: document.getElementById('btn-jump-month'),
  btnExportExcel: document.getElementById('btn-export-excel'),
  tableThead: document.getElementById('roster-thead'),
  tableTbody: document.getElementById('roster-tbody'),
  tableTfoot: document.getElementById('roster-tfoot'),
  kpiTotalEmp: document.getElementById('kpi-total-emp'),
  kpiEmpSub: document.getElementById('kpi-emp-sub'),
  kpiTotalOt: document.getElementById('kpi-total-ot'),
  kpiManningStatus: document.getElementById('kpi-manning-status'),
  kpiManningIcon: document.getElementById('kpi-manning-icon'),
  kpiManningSub: document.getElementById('kpi-manning-sub'),
  cellPopover: document.getElementById('cell-popover'),
  btnClearBrush: document.getElementById('btn-clear-brush'),
  toastContainer: document.getElementById('toast-container'),
  roleBadge: document.getElementById('role-badge'),
  roleText: document.getElementById('role-text'),
  btnToggleRole: document.getElementById('btn-toggle-role'),
  btnRoleIcon: document.getElementById('btn-role-icon'),
  btnRoleText: document.getElementById('btn-role-text'),
  adminPinInput: document.getElementById('admin-pin-input'),
  btnSubmitLogin: document.getElementById('btn-submit-login')
};

// ---------------- Initialization ---------------- //
document.addEventListener('DOMContentLoaded', () => {
  const savedRole = localStorage.getItem('roster_role') || 'guest';
  applyRole(savedRole);
  initEventListeners();
  loadRoster(STATE.year, STATE.month);
});

// ---------------- API Calls & Data Loading ---------------- //
async function loadRoster(year, month) {
  try {
    const res = await fetch(`/api/roster?year=${year}&month=${month}`);
    if (!res.ok) throw new Error('Gagal memuat data roster');
    const data = await res.json();
    STATE.data = data;
    STATE.year = year;
    STATE.month = month;

    renderRoster(data);
    updateKPIs(data);
    populateModalSelects(data.grid);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ---------------- Table Rendering ---------------- //
function renderRoster(data) {
  elements.monthDisplay.textContent = `${data.month_name} ${data.year}`;

  const days = data.days;
  const numDays = days.length;

  // 1. Render Table Headers (3 Rows)
  let theadHTML = `
    <tr>
      <th rowspan="3" class="sticky-col-1">No</th>
      <th rowspan="3" class="sticky-col-2">Nama Personil</th>
      <th rowspan="3" class="sticky-col-3">NRP / SN</th>
      <th rowspan="3" class="sticky-col-4">Posisi</th>
      <th colspan="${numDays}" style="background: #1e1b4b; color: #fbbf24; font-size: 0.95rem; letter-spacing: 0.05em; padding: 6px;">
        📅 ROSTER BULAN ${data.month_name.toUpperCase()} ${data.year}
      </th>
      <th colspan="5" class="summary-header">REKAP BULANAN</th>
    </tr>
    <tr>
  `;

  // Row 2: Day Short Names
  days.forEach(d => {
    theadHTML += `
      <th class="day-header ${d.is_weekend ? 'weekend' : ''}" title="${d.full_name}, ${d.day} ${data.month_name}">
        <span class="day-name">${d.short_name}</span>
      </th>
    `;
  });

  theadHTML += `
    <th class="summary-header">Total D</th>
    <th class="summary-header">Total DN</th>
    <th class="summary-header">Total N</th>
    <th class="summary-header ot-header">Lembur</th>
    <th class="summary-header">Total OFF</th>
  </tr><tr>
  `;

  // Row 3: Day Numbers
  days.forEach(d => {
    theadHTML += `
      <th class="day-header ${d.is_weekend ? 'weekend' : ''}">
        <span class="day-num">${d.day}</span>
      </th>
    `;
  });

  theadHTML += `
    <th class="summary-header" style="font-size:0.75rem;">(Hari)</th>
    <th class="summary-header" style="font-size:0.75rem;">(Hari)</th>
    <th class="summary-header" style="font-size:0.75rem;">(Hari)</th>
    <th class="summary-header ot-header" style="font-size:0.75rem;">(Jam)</th>
    <th class="summary-header" style="font-size:0.75rem;">(Hari)</th>
  </tr>
  `;

  elements.tableThead.innerHTML = theadHTML;

  // 2. Render Table Body (Employees)
  let tbodyHTML = '';
  data.grid.forEach((row, idx) => {
    const emp = row.employee;
    const summary = row.summary;
    const isCounterman = (emp.position || '').toLowerCase().includes('counterman');

    tbodyHTML += `
      <tr data-emp-id="${emp.id}">
        <td class="sticky-col-1" style="font-weight: 600; color: #94a3b8;">${emp.no || (idx + 1)}</td>
        <td class="sticky-col-2">
          <div class="emp-name">
            ${emp.name}
            <span class="emp-sub">${emp.phone || '-'}</span>
          </div>
        </td>
        <td class="sticky-col-3" style="font-family: monospace; font-size: 0.82rem; color: #cbd5e1;">${emp.sn || '-'}</td>
        <td class="sticky-col-4">
          <span class="badge-position ${isCounterman ? 'counterman' : ''}">${emp.position}</span>
        </td>
    `;

    // Days Cells
    days.forEach(d => {
      const shiftObj = row.shifts[d.day];
      const code = shiftObj ? shiftObj.code : 'OFF';
      const isOverride = shiftObj && shiftObj.is_override;
      const reason = shiftObj && shiftObj.override_reason ? shiftObj.override_reason : '';

      tbodyHTML += `
        <td class="shift-cell ${d.is_weekend ? 'weekend-col' : ''}" 
            data-emp-id="${emp.id}" 
            data-day="${d.day}" 
            data-date="${d.date}" 
            data-shift="${code}"
            title="${emp.name} • ${d.day} ${data.month_name}: ${code} (${reason || 'Siklus Reguler'})">
          <div class="shift-cell-inner cell-${code}">
            ${code}
          </div>
        </td>
      `;
    });

    // Employee Summary Cells (Right)
    tbodyHTML += `
      <td><span class="sum-chip" style="color: #34d399;">${summary.total_d}</span></td>
      <td><span class="sum-chip" style="color: #38bdf8;">${summary.total_dn}</span></td>
      <td><span class="sum-chip" style="color: #fb923c;">${summary.total_n}</span></td>
      <td><span class="sum-chip ot">${summary.total_lembur_hours} Jam</span></td>
      <td><span class="sum-chip" style="color: #f87171;">${summary.total_off}</span></td>
    </tr>
    `;
  });

  elements.tableTbody.innerHTML = tbodyHTML;

  // 3. Render Table Footer (Daily Manning & Shift Stats)
  const stats = data.daily_stats;
  const minRequired = data.overall_summary.min_standby_required || 2;

  let tfootHTML = `
    <!-- Standby Counterman Row -->
    <tr class="stat-row">
      <td colspan="4" class="sticky-col-1 stat-label" style="color: #fbbf24;">
        🛡️ Standby Counterman (D) <span style="font-size:0.75rem; opacity:0.8;">[Min. ${minRequired}]</span>
      </td>
  `;

  stats.forEach(s => {
    const isUnder = s.standby_counterman < minRequired;
    tfootHTML += `
      <td class="stat-val ${isUnder ? 'understaffed' : 'safe'}" 
          title="Tgl ${s.day}: ${s.standby_counterman} Standby Counterman ${isUnder ? '⚠️ KURANG DARI MINIMAL ' + minRequired : '✅ Cukup'}">
        ${s.standby_counterman}
      </td>
    `;
  });
  tfootHTML += `<td colspan="5"></td></tr>`;

  // Normal DN Row
  tfootHTML += `
    <tr class="stat-row">
      <td colspan="4" class="sticky-col-1 stat-label" style="color: #38bdf8;">
        ☀️ Normal Day (DN)
      </td>
  `;
  stats.forEach(s => {
    tfootHTML += `<td>${s.normal_total}</td>`;
  });
  tfootHTML += `<td colspan="5"></td></tr>`;

  // Night N Row
  tfootHTML += `
    <tr class="stat-row">
      <td colspan="4" class="sticky-col-1 stat-label" style="color: #fb923c;">
        🌙 Night Shift (N)
      </td>
  `;
  stats.forEach(s => {
    tfootHTML += `<td>${s.night_total}</td>`;
  });
  tfootHTML += `<td colspan="5"></td></tr>`;

  // Off Row
  tfootHTML += `
    <tr class="stat-row">
      <td colspan="4" class="sticky-col-1 stat-label" style="color: #f87171;">
        🏖️ Off / Libur (OFF)
      </td>
  `;
  stats.forEach(s => {
    tfootHTML += `<td>${s.off_total}</td>`;
  });
  tfootHTML += `<td colspan="5"></td></tr>`;

  // Total Working Row
  tfootHTML += `
    <tr class="stat-row" style="border-top: 2px solid rgba(255, 255, 255, 0.2);">
      <td colspan="4" class="sticky-col-1 stat-label" style="color: #ffffff; font-weight:800;">
        👥 Total Bertugas
      </td>
  `;
  stats.forEach(s => {
    tfootHTML += `<td style="color: #ffffff; font-weight: 700;">${s.total_working}</td>`;
  });
  tfootHTML += `<td colspan="5"></td></tr>`;

  elements.tableTfoot.innerHTML = tfootHTML;

  attachCellEvents();
}

// ---------------- Update Metric KPI Cards ---------------- //
function updateKPIs(data) {
  const summary = data.overall_summary;
  elements.kpiTotalEmp.textContent = `${summary.total_employees} Orang`;
  elements.kpiTotalOt.textContent = `${summary.total_overtime_hours} Jam`;

  const underCount = summary.understaffed_days_count;
  if (underCount > 0) {
    elements.kpiManningStatus.innerHTML = `<span style="color: #f87171;">⚠️ ${underCount} Hari Kurang!</span>`;
    elements.kpiManningSub.textContent = `Standby Counterman di bawah ${summary.min_standby_required} orang`;
    elements.kpiManningIcon.className = 'kpi-icon rose';
  } else {
    elements.kpiManningStatus.innerHTML = `<span style="color: #34d399;">✅ Aman & Cukup</span>`;
    elements.kpiManningSub.textContent = `Semua hari standby ≥ ${summary.min_standby_required} orang Counterman`;
    elements.kpiManningIcon.className = 'kpi-icon emerald';
  }
}

// ---------------- Role Management ---------------- //
function applyRole(role) {
  STATE.role = role;
  localStorage.setItem('roster_role', role);

  if (role === 'admin') {
    document.body.classList.remove('is-guest');
    document.body.classList.add('is-admin');
    if (elements.roleBadge) elements.roleBadge.className = 'role-badge admin';
    if (elements.roleText) elements.roleText.textContent = 'Admin (Mode Edit)';
    if (elements.btnRoleIcon) elements.btnRoleIcon.textContent = '🚪';
    if (elements.btnRoleText) elements.btnRoleText.textContent = 'Keluar Admin';
  } else {
    document.body.classList.remove('is-admin');
    document.body.classList.add('is-guest');
    if (elements.roleBadge) elements.roleBadge.className = 'role-badge guest';
    if (elements.roleText) elements.roleText.textContent = 'Guest (Hanya Lihat)';
    if (elements.btnRoleIcon) elements.btnRoleIcon.textContent = '🔐';
    if (elements.btnRoleText) elements.btnRoleText.textContent = 'Login Admin';

    // Disable brush if any
    STATE.activeBrush = null;
    document.querySelectorAll('.shift-chip').forEach(c => c.classList.remove('active-tool'));
    if (elements.btnClearBrush) elements.btnClearBrush.style.display = 'none';
    closeCellPopover();
  }
}

// ---------------- Interactive Cell Events ---------------- //
function attachCellEvents() {
  const cells = document.querySelectorAll('.shift-cell');
  cells.forEach(cell => {
    cell.addEventListener('click', (e) => {
      e.stopPropagation();

      // In Guest mode: do not allow editing
      if (STATE.role !== 'admin') {
        showToast('Mode Guest (Hanya Lihat). Silakan login Admin untuk mengedit jadwal.', 'info');
        return;
      }

      const empId = parseInt(cell.dataset.empId);
      const dateStr = cell.dataset.date;
      const currentShift = cell.dataset.shift;

      // If Quick Brush mode is active, directly paint the cell!
      if (STATE.activeBrush) {
        applyShiftToCell(empId, dateStr, STATE.activeBrush, cell);
        return;
      }

      // Otherwise, open floating shift picker popover
      openCellPopover(cell, empId, dateStr, currentShift);
    });
  });
}

// ---------------- Floating Cell Popover ---------------- //
function openCellPopover(cellElement, empId, dateStr, currentShift) {
  STATE.activeCell = { empId, dateStr, element: cellElement };

  const rect = cellElement.getBoundingClientRect();
  const popover = elements.cellPopover;

  popover.style.display = 'flex';
  popover.style.top = `${rect.bottom + window.scrollY + 4}px`;
  popover.style.left = `${rect.left + window.scrollX - 40}px`;

  // Highlight current in popover
  const btns = popover.querySelectorAll('.popover-btn');
  btns.forEach(btn => {
    if (btn.dataset.shift === currentShift) {
      btn.style.outline = '2px solid #ffffff';
    } else {
      btn.style.outline = 'none';
    }
  });
}

function closeCellPopover() {
  elements.cellPopover.style.display = 'none';
  STATE.activeCell = null;
}

document.addEventListener('click', (e) => {
  if (!elements.cellPopover.contains(e.target)) {
    closeCellPopover();
  }
});

elements.cellPopover.querySelectorAll('.popover-btn').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (STATE.role !== 'admin') return;

    const newShift = btn.dataset.shift;
    if (STATE.activeCell) {
      const { empId, dateStr, element } = STATE.activeCell;
      await applyShiftToCell(empId, dateStr, newShift, element);
      closeCellPopover();
    }
  });
});

async function applyShiftToCell(empId, dateStr, newShift, cellElement) {
  try {
    const res = await fetch('/api/cell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: empId,
        date: dateStr,
        shift: newShift,
        reason: 'Manual Edit'
      })
    });
    if (!res.ok) throw new Error('Gagal mengupdate shift');

    // Smoothly reload data to refresh live stats and calculations
    await loadRoster(STATE.year, STATE.month);
    showToast(`Shift berhasil diubah menjadi ${newShift}`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ---------------- Quick Brush Mode ---------------- //
document.querySelectorAll('.shift-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    if (STATE.role !== 'admin') {
      showToast('Kuas Cat hanya aktif untuk Admin. Silakan login Admin untuk mengedit.', 'info');
      return;
    }

    const shift = chip.dataset.shift;
    if (STATE.activeBrush === shift) {
      // Toggle off
      STATE.activeBrush = null;
      chip.classList.remove('active-tool');
      elements.btnClearBrush.style.display = 'none';
      showToast('Kuas cat dinonaktifkan', 'info');
    } else {
      document.querySelectorAll('.shift-chip').forEach(c => c.classList.remove('active-tool'));
      STATE.activeBrush = shift;
      chip.classList.add('active-tool');
      elements.btnClearBrush.style.display = 'inline-flex';
      showToast(`Kuas Cat Aktif: ${shift}. Klik sel mana saja untuk langsung mewarnai.`, 'info');
    }
  });
});

elements.btnClearBrush.addEventListener('click', () => {
  STATE.activeBrush = null;
  document.querySelectorAll('.shift-chip').forEach(c => c.classList.remove('active-tool'));
  elements.btnClearBrush.style.display = 'none';
  showToast('Kuas cat dinonaktifkan', 'info');
});

// ---------------- Month Navigation ---------------- //
elements.btnPrevMonth.addEventListener('click', () => {
  let y = STATE.year;
  let m = STATE.month - 1;
  if (m < 1) { m = 12; y--; }
  loadRoster(y, m);
});

elements.btnNextMonth.addEventListener('click', () => {
  let y = STATE.year;
  let m = STATE.month + 1;
  if (m > 12) { m = 1; y++; }
  loadRoster(y, m);
});

elements.btnJumpMonth.addEventListener('click', () => {
  const chosen = prompt('Masukkan Bulan dan Tahun (format: MM-YYYY, contoh: 10-2026 atau 11-2026):', `${STATE.month}-${STATE.year}`);
  if (chosen) {
    const parts = chosen.split('-');
    if (parts.length === 2) {
      const m = parseInt(parts[0]);
      const y = parseInt(parts[1]);
      if (m >= 1 && m <= 12 && y >= 2020 && y <= 2035) {
        loadRoster(y, m);
      } else {
        showToast('Format bulan/tahun tidak valid', 'warning');
      }
    }
  }
});

// ---------------- Excel Export ---------------- //
elements.btnExportExcel.addEventListener('click', () => {
  showToast(`Mempersiapkan download Excel ${STATE.data.month_name} ${STATE.year}...`, 'info');
  window.location.href = `/api/export-excel?year=${STATE.year}&month=${STATE.month}`;
});

// ---------------- Modals Management ---------------- //
function initEventListeners() {
  // Role Toggle & Login Handling
  if (elements.btnToggleRole) {
    elements.btnToggleRole.addEventListener('click', () => {
      if (STATE.role === 'admin') {
        applyRole('guest');
        showToast('Beralih ke Mode Guest (Hanya Lihat)', 'info');
      } else {
        openModal('modal-login');
        if (elements.adminPinInput) {
          elements.adminPinInput.value = '';
          setTimeout(() => elements.adminPinInput.focus(), 150);
        }
      }
    });
  }

  if (elements.btnSubmitLogin) {
    elements.btnSubmitLogin.addEventListener('click', handleLoginSubmit);
  }
  if (elements.adminPinInput) {
    elements.adminPinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleLoginSubmit();
    });
  }

  // Open Modals
  document.getElementById('btn-open-swap').addEventListener('click', () => openModal('modal-swap'));
  document.getElementById('btn-open-leave').addEventListener('click', () => openModal('modal-leave'));
  document.getElementById('btn-open-generate').addEventListener('click', () => openModal('modal-generate'));
  document.getElementById('btn-open-employees').addEventListener('click', () => {
    openModal('modal-employees');
    renderEmployeeList();
  });

  const btnOpenOffSchedule = document.getElementById('btn-open-off-schedule');
  if (btnOpenOffSchedule) {
    btnOpenOffSchedule.addEventListener('click', () => {
      openModal('modal-off-schedule');
      const y = STATE.year;
      const m = String(STATE.month).padStart(2, '0');
      const startInput = document.getElementById('off-start-date');
      const endInput = document.getElementById('off-end-date');
      if (startInput) startInput.value = `${y}-${m}-01`;
      if (endInput) {
        const lastDay = (STATE.data && STATE.data.days) ? STATE.data.days.length : 30;
        endInput.value = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
      }
      document.querySelectorAll('.off-weekday').forEach(cb => cb.checked = false);
      renderOffSummary();
    });
  }

  const btnSubmitOffSchedule = document.getElementById('btn-submit-off-schedule');
  if (btnSubmitOffSchedule) {
    btnSubmitOffSchedule.addEventListener('click', handleOffScheduleSubmit);
  }

  const btnOpenChangePin = document.getElementById('btn-open-change-pin');
  if (btnOpenChangePin) {
    btnOpenChangePin.addEventListener('click', () => {
      openModal('modal-change-pin');
      const oldInput = document.getElementById('change-pin-old');
      if (oldInput) {
        oldInput.value = '';
        const nInput = document.getElementById('change-pin-new');
        const cInput = document.getElementById('change-pin-confirm');
        if (nInput) nInput.value = '';
        if (cInput) cInput.value = '';
        setTimeout(() => oldInput.focus(), 150);
      }
    });
  }

  const btnSubmitChangePin = document.getElementById('btn-submit-change-pin');
  if (btnSubmitChangePin) {
    btnSubmitChangePin.addEventListener('click', handleChangePinSubmit);
  }
  const confirmPinInput = document.getElementById('change-pin-confirm');
  if (confirmPinInput) {
    confirmPinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleChangePinSubmit();
    });
  }

  // Close Modals via buttons
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.close;
      closeModal(modalId);
    });
  });

  // Close on outside click
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });

  // Submit Shift Swap
  document.getElementById('btn-submit-swap').addEventListener('click', handleSwapSubmit);

  // Submit Leave / Field Break
  document.getElementById('btn-submit-leave').addEventListener('click', handleLeaveSubmit);

  // Submit Auto-Generate Multi-Month
  document.getElementById('btn-submit-generate').addEventListener('click', handleGenerateSubmit);

  // Add Employee Form Toggles & Submit
  const btnAddEmpForm = document.getElementById('btn-add-emp-form');
  const addEmpForm = document.getElementById('add-emp-form');
  const btnCancelAddEmp = document.getElementById('btn-cancel-add-emp');
  const btnSaveNewEmp = document.getElementById('btn-save-new-emp');

  if (btnAddEmpForm && addEmpForm) {
    btnAddEmpForm.addEventListener('click', () => {
      const isHidden = addEmpForm.style.display === 'none' || !addEmpForm.style.display;
      addEmpForm.style.display = isHidden ? 'block' : 'none';
      if (isHidden) {
        const nameInput = document.getElementById('new-emp-name');
        if (nameInput) setTimeout(() => nameInput.focus(), 100);
      }
    });
  }

  if (btnCancelAddEmp && addEmpForm) {
    btnCancelAddEmp.addEventListener('click', () => {
      addEmpForm.style.display = 'none';
    });
  }

  if (btnSaveNewEmp) {
    btnSaveNewEmp.addEventListener('click', async () => {
      const name = (document.getElementById('new-emp-name')?.value || '').trim();
      const sn = (document.getElementById('new-emp-sn')?.value || '').trim();
      const position = document.getElementById('new-emp-position')?.value || 'Counterman';
      const patternId = document.getElementById('new-emp-pattern')?.value || 'regular_5_2';

      if (!name) {
        showToast('Nama personil wajib diisi!', 'warning');
        return;
      }

      try {
        const res = await fetch('/api/employee', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            sn,
            position,
            pattern_id: patternId,
            location: 'CK BMB - Sitarum',
            ref_date: `${STATE.year}-${String(STATE.month).padStart(2, '0')}-01`,
            ref_cycle_index: 0
          })
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.detail || 'Gagal menambahkan personil');

        showToast(`Personil ${name} berhasil ditambahkan!`, 'success');
        document.getElementById('new-emp-name').value = '';
        document.getElementById('new-emp-sn').value = '';
        if (addEmpForm) addEmpForm.style.display = 'none';
        await loadRoster(STATE.year, STATE.month);
        renderEmployeeList();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Reset Sample Data
  document.getElementById('btn-reset-sample').addEventListener('click', async () => {
    if (confirm('Yakin ingin mereset seluruh data ke contoh awal file Excel?')) {
      const res = await fetch('/api/reset-sample', { method: 'POST' });
      if (res.ok) {
        closeModal('modal-employees');
        await loadRoster(STATE.year, STATE.month);
        showToast('Data berhasil direset ke contoh awal', 'success');
      }
    }
  });

  // Swap Date preview listener
  const swapDateInput = document.getElementById('swap-date');
  swapDateInput.value = `${STATE.year}-${String(STATE.month).padStart(2, '0')}-01`;
  swapDateInput.addEventListener('change', updateSwapPreview);
  document.getElementById('swap-emp1').addEventListener('change', updateSwapPreview);
  document.getElementById('swap-emp2').addEventListener('change', updateSwapPreview);
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

function populateModalSelects(grid) {
  const emp1Select = document.getElementById('swap-emp1');
  const emp2Select = document.getElementById('swap-emp2');
  const leaveEmpSelect = document.getElementById('leave-emp');

  emp1Select.innerHTML = '';
  emp2Select.innerHTML = '';
  leaveEmpSelect.innerHTML = '';

  grid.forEach((row, idx) => {
    const emp = row.employee;
    const opt1 = new Option(`${emp.name} (${emp.position})`, emp.id);
    const opt2 = new Option(`${emp.name} (${emp.position})`, emp.id);
    const opt3 = new Option(`${emp.name} (${emp.position})`, emp.id);

    emp1Select.add(opt1);
    emp2Select.add(opt2);
    leaveEmpSelect.add(opt3);
  });

  if (emp2Select.options.length > 1) {
    emp2Select.selectedIndex = 1;
  }

  // Populate off-emp-select (Non-night shift personnel only)
  const offEmpSelect = document.getElementById('off-emp-select');
  if (offEmpSelect) {
    offEmpSelect.innerHTML = '';
    offEmpSelect.add(new Option('👥 Semua Teman Shift Siang Sekaligus', 'all'));
    grid.forEach(row => {
      const emp = row.employee;
      if (emp.pattern_id !== 'night_rotation_15') {
        offEmpSelect.add(new Option(`${emp.name} (${emp.position})`, emp.id));
      }
    });
  }

  // Set default dates for leave modal
  const defaultDateStr = `${STATE.year}-${String(STATE.month).padStart(2, '0')}-01`;
  document.getElementById('leave-start-date').value = defaultDateStr;
  document.getElementById('leave-end-date').value = defaultDateStr;

  updateSwapPreview();
}

function updateSwapPreview() {
  if (!STATE.data) return;
  const dateStr = document.getElementById('swap-date').value;
  const emp1Id = parseInt(document.getElementById('swap-emp1').value);
  const emp2Id = parseInt(document.getElementById('swap-emp2').value);

  if (!dateStr || !emp1Id || !emp2Id) return;

  const dt = new Date(dateStr);
  const day = dt.getDate();

  const r1 = STATE.data.grid.find(g => g.employee.id === emp1Id);
  const r2 = STATE.data.grid.find(g => g.employee.id === emp2Id);

  const s1 = r1 && r1.shifts[day] ? r1.shifts[day].code : '?';
  const s2 = r2 && r2.shifts[day] ? r2.shifts[day].code : '?';

  document.getElementById('swap-preview1').textContent = `Shift saat ini: ${s1}`;
  document.getElementById('swap-preview2').textContent = `Shift saat ini: ${s2}`;
}

async function handleLoginSubmit() {
  const pin = (elements.adminPinInput ? elements.adminPinInput.value : '').trim();
  if (!pin) {
    showToast('Silakan masukkan PIN Admin', 'warning');
    return;
  }
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.detail || 'PIN Admin salah!');

    applyRole('admin');
    closeModal('modal-login');
    showToast('Login Berhasil! Mode Admin Aktif (Fitur edit & kelola jadwal terbuka)', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleChangePinSubmit() {
  const oldPin = (document.getElementById('change-pin-old')?.value || '').trim();
  const newPin = (document.getElementById('change-pin-new')?.value || '').trim();
  const confirmPin = (document.getElementById('change-pin-confirm')?.value || '').trim();

  if (!oldPin) {
    showToast('Silakan masukkan PIN lama saat ini!', 'warning');
    return;
  }
  if (!newPin || newPin.length < 4) {
    showToast('PIN baru minimal harus 4 karakter!', 'warning');
    return;
  }
  if (newPin !== confirmPin) {
    showToast('Konfirmasi PIN baru tidak cocok!', 'warning');
    return;
  }

  try {
    const res = await fetch('/api/auth/change-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ old_pin: oldPin, new_pin: newPin })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.detail || 'Gagal mengubah PIN');

    closeModal('modal-change-pin');
    showToast('PIN Admin berhasil diperbarui!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderOffSummary() {
  if (!STATE.data || !STATE.data.grid) return;
  const container = document.getElementById('off-summary-container');
  const monthLabel = document.getElementById('off-month-label');
  if (monthLabel) monthLabel.textContent = `${STATE.data.month_name} ${STATE.year}`;
  if (!container) return;

  container.innerHTML = '';
  const nonNight = STATE.data.grid.filter(r => r.employee.pattern_id !== 'night_rotation_15');

  nonNight.forEach(r => {
    const emp = r.employee;
    const s = r.summary;
    const offDays = [];
    for (const dayNum in r.shifts) {
      if (r.shifts[dayNum].code === 'OFF') {
        offDays.push(dayNum);
      }
    }
    const daysListStr = offDays.length > 0 ? `Tgl: ${offDays.join(', ')}` : 'Belum ada hari OFF';

    const rowDiv = document.createElement('div');
    rowDiv.style.cssText = 'display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.06); padding:4px 0;';
    rowDiv.innerHTML = `
      <div>
        <b style="color:#e2e8f0;">${emp.name}</b> <span style="font-size:0.75rem; color:#94a3b8;">(${emp.position})</span>
        <div style="font-size:0.72rem; color:#fca5a5;">${daysListStr}</div>
      </div>
      <div style="text-align:right;">
        <span style="background:rgba(239,68,68,0.2); color:#f87171; border:1px solid rgba(239,68,68,0.3); padding:2px 6px; border-radius:4px; font-weight:600; font-size:0.75rem;">
          ${s.total_off} Hari OFF
        </span>
      </div>
    `;
    container.appendChild(rowDiv);
  });
}

async function handleOffScheduleSubmit() {
  const empVal = document.getElementById('off-emp-select').value;
  const startDate = document.getElementById('off-start-date').value;
  const endDate = document.getElementById('off-end-date').value;
  const action = document.getElementById('off-action-select').value;
  const reason = (document.getElementById('off-reason-input').value || '').trim();

  if (!startDate || !endDate) {
    showToast('Harap pilih Tanggal Mulai dan Tanggal Selesai!', 'warning');
    return;
  }

  let employeeIds = [];
  if (empVal === 'all') {
    employeeIds = STATE.data.grid
      .filter(r => r.employee.pattern_id !== 'night_rotation_15')
      .map(r => r.employee.id);
  } else {
    employeeIds = [parseInt(empVal)];
  }

  const checkedWeekdays = [];
  document.querySelectorAll('.off-weekday:checked').forEach(cb => {
    checkedWeekdays.push(parseInt(cb.value));
  });

  try {
    const res = await fetch('/api/schedule/off-range', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_ids: employeeIds,
        start_date: startDate,
        end_date: endDate,
        action: action,
        reason: reason || (action === 'OFF' ? 'Off Roster' : 'Hari Kerja Standby'),
        weekdays: checkedWeekdays.length > 0 ? checkedWeekdays : null
      })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.detail || 'Gagal mengatur jadwal OFF');

    closeModal('modal-off-schedule');
    showToast(`Jadwal OFF berhasil diperbarui (${result.count} hari shift disesuaikan)`, 'success');
    await loadRoster(STATE.year, STATE.month);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleSwapSubmit() {
  const dateStr = document.getElementById('swap-date').value;
  const emp1Id = parseInt(document.getElementById('swap-emp1').value);
  const emp2Id = parseInt(document.getElementById('swap-emp2').value);
  const reason = document.getElementById('swap-reason').value;

  if (emp1Id === emp2Id) {
    showToast('Pilih dua karyawan yang berbeda untuk bertukar shift', 'warning');
    return;
  }

  try {
    const res = await fetch('/api/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emp1_id: emp1Id,
        emp2_id: emp2Id,
        date: dateStr,
        reason: reason || 'Tukar Shift'
      })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.detail || 'Gagal bertukar shift');

    closeModal('modal-swap');
    await loadRoster(STATE.year, STATE.month);
    showToast(result.message, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleLeaveSubmit() {
  const empId = parseInt(document.getElementById('leave-emp').value);
  const startDate = document.getElementById('leave-start-date').value;
  const endDate = document.getElementById('leave-end-date').value;
  const shiftType = document.getElementById('leave-type').value;
  const reason = document.getElementById('leave-reason').value;

  if (!startDate || !endDate) {
    showToast('Lengkapi tanggal mulai dan selesai', 'warning');
    return;
  }

  try {
    const res = await fetch('/api/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: empId,
        start_date: startDate,
        end_date: endDate,
        shift_type: shiftType,
        reason: reason || 'Cuti/FB'
      })
    });
    const result = await res.json();
    if (!res.ok) throw new Error('Gagal menerapkan jadwal izin/cuti');

    closeModal('modal-leave');
    await loadRoster(STATE.year, STATE.month);
    showToast(result.message, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleGenerateSubmit() {
  const startMonth = parseInt(document.getElementById('gen-start-month').value);
  const endMonth = parseInt(document.getElementById('gen-end-month').value);

  showToast('Memproyeksikan jadwal siklus otomatis...', 'info');

  try {
    const res = await fetch('/api/generate-year', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_year: 2026,
        start_month: startMonth,
        end_year: 2026,
        end_month: endMonth
      })
    });
    const result = await res.json();
    if (!res.ok) throw new Error('Gagal generate jadwal');

    closeModal('modal-generate');
    await loadRoster(STATE.year, STATE.month);
    showToast(`Sukses! ${result.generated_count} sel shift berhasil diproyeksikan otomatis.`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ---------------- Employee Management Modal ---------------- //
function renderEmployeeList() {
  if (!STATE.data) return;
  const container = document.getElementById('emp-list-container');
  if (!container) return;
  container.innerHTML = '';

  const employees = STATE.data.grid.map(r => r.employee);
  employees.forEach(emp => {
    const isNight = emp.pattern_id === 'night_rotation_15';

    const card = document.createElement('div');
    card.style.cssText = 'background: #1f2937; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; gap: 10px;';
    card.innerHTML = `
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 700; color: #fff; display: flex; align-items: center; gap: 8px;">
          <span>${emp.name}</span>
          <span style="font-size:0.75rem; color:#94a3b8; font-weight: 400;">(${emp.position})</span>
        </div>
        <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
          NRP: ${emp.sn || '-'} • Pola: <b style="color: ${isNight ? '#fb923c' : '#34d399'};">${isNight ? 'Rotasi Malam (15 Hari)' : 'Reguler (5:2)'}</b>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
        <span class="badge-position ${isNight ? '' : 'counterman'}">${isNight ? 'Shift Malam' : 'Shift Siang'}</span>
        <button class="btn-delete-emp" data-id="${emp.id}" data-name="${emp.name}" title="Hapus ${emp.name}" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); color: #fca5a5; padding: 5px 9px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: all 0.2s;">
          <span>🗑️</span> Hapus
        </button>
      </div>
    `;
    container.appendChild(card);
  });

  // Attach delete events
  container.querySelectorAll('.btn-delete-emp').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const empId = parseInt(btn.dataset.id);
      const empName = btn.dataset.name;
      if (confirm(`Yakin ingin menghapus ${empName} dari daftar karyawan dan roster? Jadwal terkait juga akan dihapus.`)) {
        try {
          const res = await fetch(`/api/employee/${empId}`, { method: 'DELETE' });
          const resData = await res.json();
          if (!res.ok) throw new Error(resData.detail || 'Gagal menghapus karyawan');
          showToast(`Karyawan ${empName} berhasil dihapus!`, 'success');
          await loadRoster(STATE.year, STATE.month);
          renderEmployeeList();
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    });
  });
}

// ---------------- Toast Notifications ---------------- //
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'warning') icon = '⚠️';
  if (type === 'error') icon = '❌';

  toast.innerHTML = `<span>${icon}</span> <div>${message}</div>`;
  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
