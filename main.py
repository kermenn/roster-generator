"""
FastAPI Application for Modern Roster Generator.
Provides complete API for roster calculations, pattern auto-generation,
shift swaps, leave management, and Excel import/export.
"""
import os
import io
from datetime import datetime, date
from typing import Dict, List, Optional, Any
from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from engine.models import SHIFTS, PATTERNS, INDONESIAN_MONTHS
from engine.roster_engine import RosterEngine
from services.storage_service import StorageService
from services.excel_service import ExcelService

app = FastAPI(title="Roster Generator API", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

storage = StorageService()

# ----------------- Request Models ----------------- #
class CellUpdateRequest(BaseModel):
    employee_id: int
    date: str
    shift: str
    reason: Optional[str] = "Manual Edit"

class BatchUpdateRequest(BaseModel):
    updates: List[Dict[str, Any]]

class SwapRequest(BaseModel):
    emp1_id: int
    emp2_id: int
    date: str
    reason: Optional[str] = "Tukar Shift"

class LeaveRequest(BaseModel):
    employee_id: int
    start_date: str
    end_date: str
    shift_type: str = "CT"
    reason: Optional[str] = "Cuti"

class OffRangeRequest(BaseModel):
    employee_ids: List[int]
    start_date: str
    end_date: str
    action: str = "OFF"  # "OFF", "D", "RESET"
    reason: Optional[str] = "Off Roster"
    weekdays: Optional[List[int]] = None

class GenerateYearRequest(BaseModel):
    start_year: int
    start_month: int
    end_year: int
    end_month: int

class EmployeeModel(BaseModel):
    id: Optional[int] = None
    no: Optional[int] = None
    name: str
    sn: str = ""
    position: str = "Counterman"
    location: str = "CK BMB - Sitarum"
    phone: str = ""
    pattern_id: str = "regular_5_2"
    ref_date: str = "2026-10-01"
    ref_cycle_index: int = 0
    notes: Optional[str] = ""

class SettingsModel(BaseModel):
    min_standby_counterman: int = 2
    overtime_hours_d: int = 3
    overtime_hours_n: int = 3
    app_title: str = "Aplikasi Penataan Roster Modern"
    site_location: str = "CK BMB - Sitarum"
    admin_pin: str = "admin123"

class LoginRequest(BaseModel):
    pin: str

class ChangePinRequest(BaseModel):
    old_pin: str
    new_pin: str


# ----------------- API Endpoints ----------------- #

@app.post("/api/auth/login")
def login_admin(req: LoginRequest):
    """Verify admin PIN."""
    settings = storage.get_settings()
    correct_pin = str(settings.get("admin_pin", "admin123")).strip()
    if req.pin.strip() == correct_pin:
        return {"status": "success", "role": "admin", "message": "Login Admin berhasil!"}
    raise HTTPException(status_code=401, detail="PIN Admin salah! Silakan coba lagi.")


@app.post("/api/auth/change-pin")
def change_admin_pin(req: ChangePinRequest):
    """Change the admin PIN."""
    settings = storage.get_settings()
    current_pin = str(settings.get("admin_pin", "admin123")).strip()

    if req.old_pin.strip() != current_pin:
        raise HTTPException(status_code=400, detail="PIN Lama tidak sesuai!")

    new_pin = req.new_pin.strip()
    if len(new_pin) < 4:
        raise HTTPException(status_code=400, detail="PIN Baru minimal 4 karakter!")

    settings["admin_pin"] = new_pin
    storage.save_settings(settings)
    return {"status": "success", "message": "PIN Admin berhasil diperbarui!"}


@app.get("/api/shifts")
def get_shift_definitions():
    """Return list of shift types, hours, and colors."""
    return {
        "shifts": SHIFTS,
        "patterns": PATTERNS
    }

@app.get("/api/roster")
def get_roster(year: int = 2026, month: int = 10):
    """Calculate and return full roster for the given year and month."""
    employees = storage.get_employees()
    overrides = storage.get_overrides()
    settings = storage.get_settings()
    min_sb = settings.get("min_standby_counterman", 2)

    roster_data = RosterEngine.calculate_monthly_roster(
        year=year,
        month=month,
        employees=employees,
        overrides=overrides,
        min_standby_counterman=min_sb
    )

    roster_data["shifts"] = SHIFTS
    roster_data["patterns"] = PATTERNS
    roster_data["settings"] = settings
    return roster_data

@app.post("/api/cell")
def update_cell(req: CellUpdateRequest):
    """Update a single cell shift value."""
    storage.set_cell_override(req.employee_id, req.date, req.shift.upper(), req.reason)
    return {"status": "success", "message": "Shift berhasil diupdate"}

@app.post("/api/batch")
def update_batch(req: BatchUpdateRequest):
    """Batch update multiple cell shift values."""
    storage.set_batch_overrides(req.updates)
    return {"status": "success", "count": len(req.updates)}

@app.post("/api/swap")
def swap_shifts(req: SwapRequest):
    """Swap shifts between two employees on a given date."""
    try:
        s1, s2 = storage.swap_shifts(req.emp1_id, req.emp2_id, req.date, req.reason or "Tukar Shift")
        return {
            "status": "success",
            "message": f"Shift berhasil ditukar: {s1} <-> {s2}",
            "shift1": s1,
            "shift2": s2
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/leave")
def apply_leave(req: LeaveRequest):
    """Apply leave or field break across a date range."""
    count = storage.set_leave_range(
        emp_id=req.employee_id,
        start_date=req.start_date,
        end_date=req.end_date,
        shift_type=req.shift_type.upper(),
        reason=req.reason or "Cuti/FB"
    )
    return {
        "status": "success",
        "message": f"Berhasil menerapkan {req.shift_type} selama {count} hari"
    }

@app.post("/api/schedule/off-range")
def set_off_range(req: OffRangeRequest):
    """
    Apply OFF (or D / RESET) across a date range for specified non-night shift employees.
    Automatically excludes night-shift rotation employees to protect their cycle.
    """
    try:
        count = storage.apply_off_range(
            emp_ids=req.employee_ids,
            start_date=req.start_date,
            end_date=req.end_date,
            action=req.action,
            reason=req.reason or "Off Roster",
            weekdays=req.weekdays
        )
        return {
            "status": "success",
            "message": f"Berhasil memperbarui {count} jadwal shift",
            "count": count
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/generate-year")
def generate_annual(req: GenerateYearRequest):
    """
    Auto-generates and locks in cycle projections across the specified months
    (e.g., from current month to December or next year).
    """
    employees = storage.get_employees()
    new_overrides = RosterEngine.generate_annual_overrides(
        employees=employees,
        start_year=req.start_year,
        start_month=req.start_month,
        end_year=req.end_year,
        end_month=req.end_month
    )
    # Merge with existing overrides
    current_overrides = storage.get_overrides()
    current_overrides.update(new_overrides)
    storage.save_overrides(current_overrides)

    return {
        "status": "success",
        "message": f"Berhasil men-generate jadwal dari {req.start_month}/{req.start_year} sampai {req.end_month}/{req.end_year}",
        "generated_count": len(new_overrides)
    }

@app.get("/api/employees")
def get_employees():
    return storage.get_employees()

@app.post("/api/employee")
def save_employee(emp: EmployeeModel):
    employees = storage.get_employees()
    emp_dict = emp.model_dump()

    if emp.id:
        # Edit existing
        for idx, e in enumerate(employees):
            if e["id"] == emp.id:
                employees[idx] = emp_dict
                break
    else:
        # Create new
        new_id = max([e["id"] for e in employees], default=0) + 1
        emp_dict["id"] = new_id
        emp_dict["no"] = len(employees) + 1
        employees.append(emp_dict)

    storage.save_employees(employees)
    return {"status": "success", "employee": emp_dict}

@app.delete("/api/employee/{emp_id}")
def delete_employee(emp_id: int):
    employees = storage.get_employees()
    employees = [e for e in employees if e["id"] != emp_id]
    # Re-number
    for idx, e in enumerate(employees):
        e["no"] = idx + 1
    storage.save_employees(employees)

    # Clean up overrides belonging to this employee
    overrides = storage.get_overrides()
    cleaned = {k: v for k, v in overrides.items() if not k.startswith(f"{emp_id}:")}
    storage.save_overrides(cleaned)

    return {"status": "success", "message": "Karyawan berhasil dihapus"}

@app.get("/api/settings")
def get_settings():
    return storage.get_settings()

@app.post("/api/settings")
def save_settings(settings: SettingsModel):
    storage.save_settings(settings.model_dump())
    return {"status": "success", "settings": settings.model_dump()}

@app.post("/api/reset-sample")
def reset_to_sample():
    """Reset all data back to the default sample roster data from Contoh Roster.xlsx."""
    from services.storage_service import DEFAULT_EMPLOYEES, DEFAULT_OVERRIDES, DEFAULT_SETTINGS
    storage.save_all({
        "employees": DEFAULT_EMPLOYEES,
        "overrides": DEFAULT_OVERRIDES,
        "settings": DEFAULT_SETTINGS
    })
    return {"status": "success", "message": "Data berhasil direset ke contoh awal"}

@app.get("/api/export-excel")
def export_excel(year: int = 2026, month: int = 10):
    """Export the active roster as an Excel file matching the official format."""
    employees = storage.get_employees()
    overrides = storage.get_overrides()
    settings = storage.get_settings()
    min_sb = settings.get("min_standby_counterman", 2)

    excel_io = ExcelService.export_monthly_excel(
        year=year,
        month=month,
        employees=employees,
        overrides=overrides,
        min_standby_counterman=min_sb
    )

    filename = f"Roster_{INDONESIAN_MONTHS[month]}_{year}.xlsx"
    return StreamingResponse(
        excel_io,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@app.post("/api/import-excel")
async def import_excel(file: UploadFile = File(...)):
    """Import an uploaded Excel file."""
    content = await file.read()
    res = ExcelService.import_excel_roster(content)

    if res["employees"]:
        storage.save_employees(res["employees"])

    return {
        "status": "success",
        "message": f"Berhasil mengimpor {len(res['employees'])} data karyawan dari Excel",
        "employees_count": len(res["employees"])
    }

# ----------------- Serve Static Files ----------------- #
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
