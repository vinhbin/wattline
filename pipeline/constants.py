"""Field maps, excluded fields, and verified anchor numbers for the emPOWER
ingest. Data only — the tested logic lives in pipeline/empower.py.

Correctness rules (CLAUDE.md / docs/decision-log.md):
  D-002  population = Power_Dependent_Devices_DME only; never sum device fields.
  D-003  exclude Power_De_1 / Power_Dependent_Card_Dvcs_5yrs (implanted cardiac).
  D-004  suppressed cells (published 11) are the interval [1, 11].
  D-005  conserve against the state anchor 92,233 (containment, not equality).
"""

# --- population (D-002) --------------------------------------------------
POP_FIELD = "Power_Dependent_Devices_DME"

# --- device field -> canonical key (keys match data/device_runtimes.json) --
DEVICE_FIELD_MAP = {
    "Ventilators_13mo": "ventilator",
    "BiPAPs_13mo": "bipap",
    "O2_Concentrators_36mo": "oxygen_concentrator",
    "IV_Infusion_Pumps_13mo": "iv_pump",
    "Enteral_Feeding_13mo": "enteral_feeding",
    "AtHome_Dialysis_3mo": "home_dialysis",
    "Power_Wheelchairs_Scooters_13mo": "power_wheelchair",
    "Electric_Beds_13mo": "electric_bed",
}

# --- fields that must never enter device_mix -----------------------------
# D-003 cardiac (internal batteries, do not fail on grid loss) + the
# overlapping-union combo fields (CLAUDE rule 3, never sum).
EXCLUDED_FIELDS = frozenset({
    "Power_De_1",
    "Power_Dependent_Card_Dvcs_5yrs",
    "Facility_ESRD_Dialysis_Any_DME",
    "O2_Services_Any_DME",
    "Home_Health_Services_Any_DME",
    "AtHome_Hospice_Any_DME",
    "Any_Healthcare_Srvc_Any_DME",
    "Vents_13mo_BiPAPs_13mo_O2_Conc_",
})

# --- suppression (D-004) -------------------------------------------------
SUPPRESSED_VALUE = 11  # a published 11 means the true value is in [1, 11]

# --- verified anchors (mirror scripts/fetch_empower.py) ------------------
STATE_ANCHOR = 92233        # emPOWER layer 3, Georgia
ZIP_SUM = 92567             # sum of published ZIP values (suppression-inflated)
SUPPRESSED_COUNT = 67       # ZIPs whose population cell is suppressed
FEATURE_COUNT = 711         # Georgia ZIPs in emPOWER
# treating each suppressed cell as [1, 11]: low = ZIP_SUM - 67*10
SUPPRESSION_BAND = (91897, 92567)

# --- CRS guard (D-001) ---------------------------------------------------
# Loose Georgia lon/lat box; a 3857 leak lands coords in the millions.
GA_BBOX = (-86.0, 30.2, -80.5, 35.2)  # (minx, miny, maxx, maxy)
