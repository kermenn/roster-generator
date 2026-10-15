"""
Data models and constants for Roster Generator.
"""
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

# Definisi Shift & Jam Lembur
SHIFTS = {
    "D": {
        "code": "D",
        "name": "Day Shift",
        "hours": "06.00 - 18.00",
        "overtime_hours": 3,
        "category": "day",
        "bg_color": "#10b981",  # Emerald Green
        "text_color": "#ffffff",
        "excel_fill": "FF92D050",
        "desc": "Standby Day Shift (+3 Jam Lembur)"
    },
    "DN": {
        "code": "DN",
        "name": "Day Normal",
        "hours": "06.00 - 15.00",
        "overtime_hours": 0,
        "category": "normal",
        "bg_color": "#0284c7",  # Sky Blue
        "text_color": "#ffffff",
        "excel_fill": "FF92D050",
        "desc": "Day Normal Shift (Reguler)"
    },
    "N": {
        "code": "N",
        "name": "Night Shift",
        "hours": "18.00 - 06.00",
        "overtime_hours": 3,
        "category": "night",
        "bg_color": "#f97316",  # Vibrant Orange
        "text_color": "#ffffff",
        "excel_fill": "FFFFC000",
        "desc": "Night Shift (+3 Jam Lembur)"
    },
    "OFF": {
        "code": "OFF",
        "name": "Libur",
        "hours": "-",
        "overtime_hours": 0,
        "category": "off",
        "bg_color": "#ef4444",  # Red
        "text_color": "#ffffff",
        "excel_fill": "FFFF0000",
        "desc": "Hari Libur / Istirahat"
    },
    "FB": {
        "code": "FB",
        "name": "Field Break",
        "hours": "-",
        "overtime_hours": 0,
        "category": "fb",
        "bg_color": "#eab308",  # Amber Yellow
        "text_color": "#000000",
        "excel_fill": "FFFFFF00",
        "desc": "Field Break / Roster Off"
    },
    "CT": {
        "code": "CT",
        "name": "Cuti",
        "hours": "-",
        "overtime_hours": 0,
        "category": "leave",
        "bg_color": "#06b6d4",  # Cyan
        "text_color": "#ffffff",
        "excel_fill": "FF00B0F0",
        "desc": "Cuti Resmi / Tahunan"
    }
}

# Pola Siklus Standar:
# 1. Reguler 5:2 (7 hari: 5 D + 2 OFF)
# 2. Night Rotation (15 hari: 5 Siang (D/DN) -> 2 OFF -> 5 Malam (N) -> 3 OFF)
PATTERNS = {
    "regular_5_2": {
        "id": "regular_5_2",
        "name": "Reguler 5:2 (5 Hari Siang + 2 OFF)",
        "cycle_length": 7,
        "sequence": ["D", "D", "D", "D", "D", "OFF", "OFF"],
        "desc": "5 hari kerja Day shift (D) diikuti 2 hari libur (OFF)"
    },
    "night_rotation_15": {
        "id": "night_rotation_15",
        "name": "Rotasi Malam 15 Hari (5 Siang - 2 OFF - 5 Malam - 3 OFF)",
        "cycle_length": 15,
        "sequence": [
            "D", "DN", "DN", "DN", "DN",   # 5 Hari Siang
            "OFF", "OFF",                   # 2 Hari OFF
            "N", "N", "N", "N", "N",        # 5 Hari Malam
            "OFF", "OFF", "OFF"             # 3 Hari OFF
        ],
        "desc": "5 hari siang, 2 hari off, 5 hari malam, dan 3 hari off berulang terus"
    }
}

INDONESIAN_DAYS = {
    0: ("SN", "Senin"),
    1: ("SL", "Selasa"),
    2: ("RB", "Rabu"),
    3: ("KM", "Kamis"),
    4: ("JM", "Jumat"),
    5: ("SB", "Sabtu"),
    6: ("MG", "Minggu")
}

INDONESIAN_MONTHS = [
    "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
]
