"""
Roster calculation and pattern generation engine.
"""
import calendar
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from engine.models import SHIFTS, PATTERNS, INDONESIAN_DAYS, INDONESIAN_MONTHS

class RosterEngine:
    @staticmethod
    def get_month_days(year: int, month: int) -> List[Dict[str, Any]]:
        """Return list of day details for the specified year and month."""
        num_days = calendar.monthrange(year, month)[1]
        days = []
        for d in range(1, num_days + 1):
            dt = date(year, month, d)
            weekday_num = dt.weekday()  # 0=Monday, 6=Sunday
            short_day, long_day = INDONESIAN_DAYS[weekday_num]
            is_weekend = weekday_num in (5, 6)
            days.append({
                "day": d,
                "date": dt.isoformat(),
                "day_of_week": weekday_num,
                "short_name": short_day,
                "full_name": long_day,
                "is_weekend": is_weekend
            })
        return days

    @staticmethod
    def project_shift_for_date(
        dt: date,
        pattern_id: str,
        custom_sequence: Optional[List[str]],
        ref_date: date,
        ref_cycle_index: int
    ) -> str:
        """
        Projects an employee's shift for any given date using their cycle pattern.
        ref_date: The anchor date when the employee was at ref_cycle_index.
        ref_cycle_index: 0-indexed position in the sequence on ref_date.
        """
        if custom_sequence and len(custom_sequence) > 0:
            seq = custom_sequence
        elif pattern_id in PATTERNS:
            seq = PATTERNS[pattern_id]["sequence"]
        else:
            seq = PATTERNS["regular_5_2"]["sequence"]

        cycle_len = len(seq)
        days_diff = (dt - ref_date).days
        cycle_idx = (ref_cycle_index + days_diff) % cycle_len
        return seq[cycle_idx]

    @staticmethod
    def get_effective_shift(
        employee_id: int,
        dt: date,
        employee: Dict[str, Any],
        overrides: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculates the effective shift for an employee on a given date.
        Checks overrides first (swaps, manual edits, leaves).
        If not overridden, calculates using the employee's rotation pattern.
        """
        date_str = dt.isoformat()
        override_key = f"{employee_id}:{date_str}"

        is_override = False
        override_reason = None
        shift_code = None

        if override_key in overrides:
            shift_info = overrides[override_key]
            if isinstance(shift_info, dict):
                shift_code = shift_info.get("shift", "OFF")
                override_reason = shift_info.get("reason", "Manual")
            else:
                shift_code = str(shift_info)
                override_reason = "Manual"
            is_override = True
        else:
            # Hitung dari pola rotasi
            pattern_id = employee.get("pattern_id", "regular_5_2")
            custom_seq = employee.get("custom_sequence", None)
            ref_date_str = employee.get("ref_date", "2026-10-01")
            ref_idx = int(employee.get("ref_cycle_index", 0))

            try:
                ref_dt = date.fromisoformat(ref_date_str)
            except Exception:
                ref_dt = date(2026, 10, 1)

            shift_code = RosterEngine.project_shift_for_date(
                dt=dt,
                pattern_id=pattern_id,
                custom_sequence=custom_seq,
                ref_date=ref_dt,
                ref_cycle_index=ref_idx
            )

        # Normalisasi shift code
        shift_code = shift_code.upper().strip() if shift_code else "OFF"
        if shift_code not in SHIFTS:
            # Fallback
            shift_meta = {
                "code": shift_code,
                "name": shift_code,
                "hours": "-",
                "overtime_hours": 0,
                "category": "custom",
                "bg_color": "#64748b",
                "text_color": "#ffffff",
                "excel_fill": "FFCCCCCC"
            }
        else:
            shift_meta = SHIFTS[shift_code]

        return {
            "code": shift_code,
            "meta": shift_meta,
            "is_override": is_override,
            "override_reason": override_reason
        }

    @staticmethod
    def calculate_monthly_roster(
        year: int,
        month: int,
        employees: List[Dict[str, Any]],
        overrides: Dict[str, Any],
        min_standby_counterman: int = 2
    ) -> Dict[str, Any]:
        """
        Calculates the entire roster for the given month, including:
        - Grid matrix of shifts per employee per day
        - Daily manning summaries (Standby D, Normal DN, Night N, Off, Cuti, FB)
        - Standby alert warnings (if Standby Counterman < min_standby_counterman)
        - Employee summaries (Total D, DN, N, OFF, FB, CT, Jam Lembur, Hari Kerja)
        """
        days = RosterEngine.get_month_days(year, month)
        grid = []
        daily_stats = {d["day"]: {
            "day": d["day"],
            "date": d["date"],
            "standby_counterman": 0,
            "standby_total": 0,
            "normal_total": 0,
            "night_total": 0,
            "off_total": 0,
            "fb_total": 0,
            "leave_total": 0,
            "total_working": 0,
            "is_understaffed": False,
            "warning_message": None
        } for d in days}

        # Evaluasi shift setiap karyawan per hari
        for emp in employees:
            emp_id = emp["id"]
            emp_row = {
                "employee": emp,
                "shifts": {},
                "summary": {
                    "total_d": 0,
                    "total_dn": 0,
                    "total_n": 0,
                    "total_off": 0,
                    "total_fb": 0,
                    "total_ct": 0,
                    "total_lembur_hours": 0,
                    "total_working_days": 0
                }
            }

            for d in days:
                day_num = d["day"]
                dt = date(year, month, day_num)
                shift_res = RosterEngine.get_effective_shift(emp_id, dt, emp, overrides)
                code = shift_res["code"]
                emp_row["shifts"][day_num] = shift_res

                # Akumulasi ringkasan per karyawan
                if code == "D":
                    emp_row["summary"]["total_d"] += 1
                    emp_row["summary"]["total_lembur_hours"] += 3
                    emp_row["summary"]["total_working_days"] += 1
                elif code == "DN":
                    emp_row["summary"]["total_dn"] += 1
                    emp_row["summary"]["total_working_days"] += 1
                elif code == "N":
                    emp_row["summary"]["total_n"] += 1
                    emp_row["summary"]["total_lembur_hours"] += 3
                    emp_row["summary"]["total_working_days"] += 1
                elif code == "OFF":
                    emp_row["summary"]["total_off"] += 1
                elif code == "FB":
                    emp_row["summary"]["total_fb"] += 1
                elif code == "CT":
                    emp_row["summary"]["total_ct"] += 1

                # Akumulasi statistik harian tim
                d_stat = daily_stats[day_num]
                pos = str(emp.get("position", "")).lower()
                is_counterman = "counterman" in pos

                if code == "D":
                    d_stat["standby_total"] += 1
                    d_stat["total_working"] += 1
                    if is_counterman:
                        d_stat["standby_counterman"] += 1
                elif code == "DN":
                    d_stat["normal_total"] += 1
                    d_stat["total_working"] += 1
                elif code == "N":
                    d_stat["night_total"] += 1
                    d_stat["total_working"] += 1
                elif code == "OFF":
                    d_stat["off_total"] += 1
                elif code == "FB":
                    d_stat["fb_total"] += 1
                elif code == "CT":
                    d_stat["leave_total"] += 1

            grid.append(emp_row)

        # Evaluasi manning warnings
        for d in days:
            day_num = d["day"]
            d_stat = daily_stats[day_num]
            sb_count = d_stat["standby_counterman"]
            if sb_count < min_standby_counterman:
                d_stat["is_understaffed"] = True
                d_stat["warning_message"] = (
                    f"Peringatan: Standby Counterman hanya {sb_count} orang! "
                    f"(Minimal {min_standby_counterman} orang)"
                )

        month_name = INDONESIAN_MONTHS[month]
        total_overtime_all = sum(r["summary"]["total_lembur_hours"] for r in grid)
        understaffed_days_count = sum(1 for d in daily_stats.values() if d["is_understaffed"])

        return {
            "year": year,
            "month": month,
            "month_name": month_name,
            "days": days,
            "grid": grid,
            "daily_stats": list(daily_stats.values()),
            "overall_summary": {
                "total_employees": len(employees),
                "total_overtime_hours": total_overtime_all,
                "understaffed_days_count": understaffed_days_count,
                "min_standby_required": min_standby_counterman
            }
        }

    @staticmethod
    def generate_annual_overrides(
        employees: List[Dict[str, Any]],
        start_year: int,
        start_month: int,
        end_year: int,
        end_month: int
    ) -> Dict[str, Any]:
        """
        Bake / generate cycle projections into explicit records from start to end month.
        Useful when the user wants to lock in baseline projections up to end of year.
        """
        generated = {}
        curr_dt = date(start_year, start_month, 1)
        end_day = calendar.monthrange(end_year, end_month)[1]
        target_end_dt = date(end_year, end_month, end_day)

        while curr_dt <= target_end_dt:
            for emp in employees:
                emp_id = emp["id"]
                shift_res = RosterEngine.get_effective_shift(emp_id, curr_dt, emp, overrides={})
                key = f"{emp_id}:{curr_dt.isoformat()}"
                generated[key] = {
                    "shift": shift_res["code"],
                    "reason": "Auto-Generated Cycle"
                }
            curr_dt += timedelta(days=1)

        return generated
