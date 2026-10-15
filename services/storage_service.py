"""
Storage service for persisting roster data, employees, overrides, and settings.
"""
import os
import json
from typing import Dict, List, Any, Tuple, Optional

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
STORAGE_FILE = os.path.join(DATA_DIR, "roster_store.json")

DEFAULT_EMPLOYEES = [
    {
        "id": 1,
        "no": 1,
        "name": "Yusril Irgi Wafir",
        "sn": "10001860",
        "position": "Part Analyst",
        "location": "CK BMB - Sitarum",
        "phone": "085656368384",
        "pattern_id": "regular_5_2",
        "ref_date": "2026-10-01",
        "ref_cycle_index": 3,
        "notes": "Jadwal reguler 5:2 (Sabtu-Minggu Libur)"
    },
    {
        "id": 2,
        "no": 1,
        "name": "Muhammad Riski",
        "sn": "10003005",
        "position": "Counterman",
        "location": "CK BMB - Sitarum",
        "phone": "082213902917",
        "pattern_id": "night_rotation_15",
        "ref_date": "2026-10-01",
        "ref_cycle_index": 12,
        "notes": "Rotasi malam 15 hari (5 Siang - 2 OFF - 5 Malam - 3 OFF)"
    },
    {
        "id": 3,
        "no": 2,
        "name": "Ahmad Hidayat",
        "sn": "10003599",
        "position": "Counterman",
        "location": "CK BMB - Sitarum",
        "phone": "085750973830",
        "pattern_id": "regular_5_2",
        "ref_date": "2026-10-01",
        "ref_cycle_index": 3,
        "notes": "Jadwal reguler 5:2 (Sabtu-Minggu Libur)"
    },
    {
        "id": 4,
        "no": 3,
        "name": "Syaiful Rahman",
        "sn": "7775",
        "position": "Counterman",
        "location": "CK BMB - Sitarum",
        "phone": "08125173278",
        "pattern_id": "regular_5_2",
        "ref_date": "2026-10-01",
        "ref_cycle_index": 3,
        "notes": "Jadwal reguler 5:2 (Sabtu-Minggu Libur)"
    },
    {
        "id": 5,
        "no": 4,
        "name": "Ahmad Juwaini",
        "sn": "23464",
        "position": "Counterman",
        "location": "CK BMB - Sitarum",
        "phone": "085246366410",
        "pattern_id": "regular_5_2",
        "ref_date": "2026-10-01",
        "ref_cycle_index": 0,
        "notes": "Jadwal reguler 5:2 (Selasa-Rabu Libur agar standby tetap cover)"
    }
]

from services.default_overrides import DEFAULT_OCTOBER_OVERRIDES

# Initial exact overrides matching 100% of Contoh Roster.xlsx for October 2026
DEFAULT_OVERRIDES = DEFAULT_OCTOBER_OVERRIDES

DEFAULT_SETTINGS = {
    "admin_pin": "admin123",
    "min_standby_counterman": 2,
    "overtime_hours_d": 3,
    "overtime_hours_n": 3,
    "app_title": "Aplikasi Penataan Roster Modern",
    "site_location": "CK BMB - Sitarum"
}


class StorageService:
    def __init__(self):
        os.makedirs(DATA_DIR, exist_ok=True)
        if not os.path.exists(STORAGE_FILE):
            self.save_all({
                "employees": DEFAULT_EMPLOYEES,
                "overrides": DEFAULT_OVERRIDES,
                "settings": DEFAULT_SETTINGS
            })

    def load_all(self) -> Dict[str, Any]:
        try:
            with open(STORAGE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data
        except Exception:
            return {
                "employees": DEFAULT_EMPLOYEES,
                "overrides": DEFAULT_OVERRIDES,
                "settings": DEFAULT_SETTINGS
            }

    def save_all(self, data: Dict[str, Any]) -> None:
        with open(STORAGE_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def get_employees(self) -> List[Dict[str, Any]]:
        return self.load_all().get("employees", [])

    def save_employees(self, employees: List[Dict[str, Any]]) -> None:
        data = self.load_all()
        data["employees"] = employees
        self.save_all(data)

    def get_overrides(self) -> Dict[str, Any]:
        return self.load_all().get("overrides", {})

    def save_overrides(self, overrides: Dict[str, Any]) -> None:
        data = self.load_all()
        data["overrides"] = overrides
        self.save_all(data)

    def set_cell_override(self, emp_id: int, date_str: str, shift: str, reason: str = "Manual") -> None:
        data = self.load_all()
        key = f"{emp_id}:{date_str}"
        data["overrides"][key] = {"shift": shift, "reason": reason}
        self.save_all(data)

    def set_batch_overrides(self, updates: List[Dict[str, Any]]) -> None:
        data = self.load_all()
        for u in updates:
            key = f"{u['employee_id']}:{u['date']}"
            data["overrides"][key] = {
                "shift": u["shift"],
                "reason": u.get("reason", "Batch Update")
            }
        self.save_all(data)

    def swap_shifts(self, emp1_id: int, emp2_id: int, date_str: str, reason: str = "Tukar Shift") -> Tuple[str, str]:
        """Swap shifts between two employees for a given date."""
        data = self.load_all()
        from engine.roster_engine import RosterEngine
        from datetime import date

        dt = date.fromisoformat(date_str)
        emp1 = next((e for e in data["employees"] if e["id"] == emp1_id), None)
        emp2 = next((e for e in data["employees"] if e["id"] == emp2_id), None)

        if not emp1 or not emp2:
            raise ValueError("Karyawan tidak ditemukan")

        shift1 = RosterEngine.get_effective_shift(emp1_id, dt, emp1, data["overrides"])["code"]
        shift2 = RosterEngine.get_effective_shift(emp2_id, dt, emp2, data["overrides"])["code"]

        data["overrides"][f"{emp1_id}:{date_str}"] = {
            "shift": shift2,
            "reason": f"{reason} dengan {emp2['name']}"
        }
        data["overrides"][f"{emp2_id}:{date_str}"] = {
            "shift": shift1,
            "reason": f"{reason} dengan {emp1['name']}"
        }

        self.save_all(data)
        return shift1, shift2

    def set_leave_range(self, emp_id: int, start_date: str, end_date: str, shift_type: str, reason: str) -> int:
        """Apply leave or field break across a date range."""
        from datetime import date, timedelta
        data = self.load_all()
        dt_start = date.fromisoformat(start_date)
        dt_end = date.fromisoformat(end_date)

        curr = dt_start
        count = 0
        while curr <= dt_end:
            data["overrides"][f"{emp_id}:{curr.isoformat()}"] = {
                "shift": shift_type,
                "reason": reason
            }
            curr += timedelta(days=1)
            count += 1

        self.save_all(data)
        return count

    def apply_off_range(
        self,
        emp_ids: List[int],
        start_date: str,
        end_date: str,
        action: str = "OFF",
        reason: str = "Off Roster",
        weekdays: Optional[List[int]] = None
    ) -> int:
        """
        Apply OFF, D, or RESET across a date range for specified employees.
        Automatically protects night-shift personnel (never changes their 15-day cycle).
        """
        from datetime import date, timedelta
        data = self.load_all()
        employees = data.get("employees", [])

        # Filter out night shift employees
        valid_emp_ids = []
        for emp in employees:
            if emp["id"] in emp_ids or -1 in emp_ids:
                if emp.get("pattern_id") != "night_rotation_15":
                    valid_emp_ids.append(emp["id"])

        dt_start = date.fromisoformat(start_date)
        dt_end = date.fromisoformat(end_date)
        if dt_start > dt_end:
            raise ValueError("Tanggal Mulai tidak boleh lebih besar dari Tanggal Selesai")

        count = 0
        curr = dt_start
        while curr <= dt_end:
            if weekdays is None or len(weekdays) == 0 or curr.weekday() in weekdays:
                for emp_id in valid_emp_ids:
                    key = f"{emp_id}:{curr.isoformat()}"
                    if action == "RESET":
                        if key in data["overrides"]:
                            del data["overrides"][key]
                            count += 1
                    else:
                        shift_val = "OFF" if action == "OFF" else action.upper()
                        data["overrides"][key] = {
                            "shift": shift_val,
                            "reason": reason
                        }
                        count += 1
            curr += timedelta(days=1)

        self.save_all(data)
        return count

    def get_settings(self) -> Dict[str, Any]:
        return self.load_all().get("settings", DEFAULT_SETTINGS)

    def save_settings(self, settings: Dict[str, Any]) -> None:
        data = self.load_all()
        data["settings"] = settings
        self.save_all(data)
