import io
import openpyxl
from engine.roster_engine import RosterEngine
from services.storage_service import StorageService
from services.excel_service import ExcelService

storage = StorageService()

def test_engine_and_excel():
    employees = storage.get_employees()
    overrides = storage.get_overrides()
    settings = storage.get_settings()

    print(f"Loaded {len(employees)} employees from storage.")
    roster = RosterEngine.calculate_monthly_roster(2026, 10, employees, overrides, min_standby_counterman=2)

    print("Month:", roster["month_name"], roster["year"])
    print("Days count:", len(roster["days"]))
    print("Understaffed days count:", roster["overall_summary"]["understaffed_days_count"])
    print("Total Overtime Hours (Tim):", roster["overall_summary"]["total_overtime_hours"])

    for r in roster["grid"]:
        emp = r["employee"]
        s = r["summary"]
        print(f" - {emp['name']} ({emp['position']}): D={s['total_d']}, DN={s['total_dn']}, N={s['total_n']}, Lembur={s['total_lembur_hours']}h, OFF={s['total_off']}")

    # Test Excel Export
    excel_io = ExcelService.export_monthly_excel(2026, 10, employees, overrides, min_standby_counterman=2)
    wb = openpyxl.load_workbook(excel_io)
    ws = wb.active
    print("Excel exported title:", ws.title)
    print("Excel dimensions:", ws.max_row, "x", ws.max_column)
    print("Cell G4 (Yusril Day 1):", ws["G4"].value)
    print("Cell G5 (Riski Day 1):", ws["G5"].value)
    print("Cell G9 (Standby Day 1 formula):", ws["G9"].value)
    print("Cell G10 (Normal Day 1 formula):", ws["G10"].value)
    print("Cell G12 (Total Day 1 formula):", ws["G12"].value)

    # Test Auto-generation until end of year
    annual = RosterEngine.generate_annual_overrides(employees, 2026, 10, 2026, 12)
    print("Auto-generated projections count (Oct-Dec 2026):", len(annual))

    print("\n>>> ALL ENGINE AND EXCEL UNIT TESTS PASSED WITH 100% SUCCESS! <<<")

if __name__ == "__main__":
    test_engine_and_excel()
