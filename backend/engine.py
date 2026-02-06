# engine.py
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Tuple, Optional, List
import math
import json


# -----------------------------
# Core heuristics (screening-level)
# -----------------------------

def ber_to_space_heat_intensity_kwh_m2_yr(ber_band: str) -> Tuple[float, float, float]:
    """
    Heuristic annual SPACE HEATING delivered heat intensity band (kWh_th/m²·yr).
    Practical screening band (not an official BER formula).
    Returns (best, typical, worst).
    """
    b = ber_band.strip().upper()
    table = {
        "A": (20, 35, 55),
        "B": (40, 65, 90),
        "C": (70, 110, 150),
        "D": (120, 170, 230),
        "E": (180, 250, 330),
        "F": (260, 350, 460),
        "G": (350, 500, 650),
    }
    if b not in table:
        raise ValueError("BER band must be one of A, B, C, D, E, F, G.")
    return table[b]


def emitter_to_scop_range(emitters: str) -> Tuple[float, float, float]:
    """
    Simple SCOP range depending on emitters (screening).
    Returns (low, typical, high).
    """
    e = emitters.strip().lower()
    if e == "ufh":
        return (3.2, 3.6, 4.2)
    if e == "radiators":
        return (2.4, 2.9, 3.4)
    raise ValueError("emitters must be 'radiators' or 'ufh'.")


def heating_pattern_multiplier(pattern: str) -> float:
    """
    Behavioural slider applied to BER-based *space heating only*.
    """
    p = pattern.strip().lower()
    presets = {
        "rare": 0.55,     # partial / occasional heating
        "normal": 1.00,   # typical standard pattern
        "high": 1.20,     # comfort-driven / often on
    }
    if p not in presets:
        raise ValueError("heating_pattern must be 'rare', 'normal', or 'high'.")
    return presets[p]


def wood_offset_kwh_th_per_year(wood_use: str) -> float:
    """
    Delivered heat from wood stoves (kWh_th/yr), used ONLY for BER-based path.
    Bills-based already reflects real behaviour, so we don't apply this offset there.
    """
    w = wood_use.strip().lower()
    presets = {
        "none": 0.0,
        "some": 5000.0,
        "lots": 10000.0,
    }
    if w not in presets:
        raise ValueError("wood_use must be 'none', 'some', or 'lots'.")
    return presets[w]


def dhw_band_kwh_th_per_year(occupants: int) -> Tuple[float, float, float]:
    """
    Delivered DHW heat band (kWh_th/yr) as a simple per-person heuristic.
    """
    if occupants < 1:
        raise ValueError("occupants must be >= 1")
    # best/typ/worst per person
    return (700 * occupants, 900 * occupants, 1200 * occupants)


def to_payback_or_none(x: float) -> Optional[float]:
    return None if (x is None or math.isinf(x) or math.isnan(x)) else float(x)


def band_hp_costs_from_heat(
    Q_total_kwh_th: Tuple[float, float, float],
    scop_rng: Tuple[float, float, float],
    elec_price_eur_per_kwh: float,
) -> Tuple[float, float, float]:
    """
    Conservative pairing: best uses (low demand, high SCOP), worst uses (high demand, low SCOP).
    Returns HP running cost band (€/yr): (best, typical, worst).
    """
    scop_low, scop_typ, scop_high = scop_rng

    E_best = Q_total_kwh_th[0] / scop_high
    E_typ  = Q_total_kwh_th[1] / scop_typ
    E_worst= Q_total_kwh_th[2] / scop_low

    return (E_best * elec_price_eur_per_kwh,
            E_typ  * elec_price_eur_per_kwh,
            E_worst* elec_price_eur_per_kwh)


def payback_years(capex_eur: float, annual_savings_eur: float) -> float:
    return math.inf if annual_savings_eur <= 0 else capex_eur / annual_savings_eur


# -----------------------------
# Verdict + confidence helpers
# -----------------------------

VERDICT_TEXT = {
    "likely_saves": "Likely to save money",
    "borderline": "Borderline — depends on design and use",
    "unlikely_saves": "Unlikely to save money in current setup",
}

CONFIDENCE_TEXT = {
    "high": "High confidence — most realistic assumptions point to the same outcome.",
    "medium": "Medium confidence — results depend on design and how the system is used.",
    "low": "Low confidence — small changes can flip the outcome.",
}

def outcome_from_savings(savings_eur: float, tol_eur: float = 100.0) -> str:
    """Classify annual savings into save/neutral/lose with a small deadband."""
    if savings_eur > tol_eur:
        return "save"
    if savings_eur < -tol_eur:
        return "lose"
    return "neutral"

def verdict_from_outcomes(outcomes: List[str]) -> str:
    """Map best/typ/worst outcomes to a verdict."""
    if all(o == "save" for o in outcomes):
        return "likely_saves"
    if all(o == "lose" for o in outcomes):
        return "unlikely_saves"
    # Anything mixed (including neutrals) is borderline
    return "borderline"

def confidence_from_outcomes(outcomes: List[str]) -> str:
    """Confidence is agreement across the band, not magnitude."""
    uniq = set(outcomes)
    if len(uniq) == 1:
        return "high"
    # Strong disagreement across band
    if "save" in uniq and "lose" in uniq:
        return "low"
    return "medium"

def adjust_confidence(base_conf: str, agree: bool) -> str:
    """Nudge confidence up/down if two independent methods agree/diverge."""
    levels = ["low", "medium", "high"]
    i = levels.index(base_conf)
    if agree and i < 2:
        return levels[i + 1]
    if (not agree) and i > 0:
        return levels[i - 1]
    return base_conf

def what_this_means(verdict: str, confidence: str) -> List[str]:
    """Short, homeowner-friendly bullets based on verdict/confidence."""
    if verdict == "likely_saves":
        return [
            "A heat pump is very likely to reduce running costs if installed and commissioned well.",
            "Focus on installer quality and system design (flow temperatures, controls, sizing).",
        ]
    if verdict == "borderline":
        bullets = [
            "A heat pump could work well, but the outcome depends strongly on design choices and how the system is used.",
            "Radiator suitability and achievable low flow temperatures are critical for good performance.",
        ]
        if confidence == "low":
            bullets.append("Because the result is sensitive, it’s worth getting a detailed heat-loss and emitter check before committing.")
        return bullets
    # unlikely_saves
    bullets = [
        "A heat pump is unlikely to reduce costs in the current setup without improvements.",
        "Insulation, airtightness, controls, or emitter upgrades typically improve the economics first.",
    ]
    if confidence == "low":
        bullets.append("Because the result is sensitive, bills-based inputs (or a survey) can reduce uncertainty.")
    return bullets

# -----------------------------
# Validation + normalization
# -----------------------------

def _require_key(d: Dict[str, Any], k: str) -> Any:
    if k not in d:
        raise ValueError(f"Missing required input: '{k}'")
    return d[k]


def validate_and_normalize_inputs(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate web-form style inputs and normalize types/strings.
    Returns a new dict with normalized values.
    """
    out: Dict[str, Any] = {}

    ber = str(_require_key(inputs, "ber_band")).strip().upper()
    if ber not in {"A","B","C","D","E","F","G"}:
        raise ValueError("ber_band must be one of A, B, C, D, E, F, G.")
    out["ber_band"] = ber

    area = float(_require_key(inputs, "floor_area_m2"))
    if not (20 <= area <= 1000):
        raise ValueError("floor_area_m2 must be between 20 and 1000.")
    out["floor_area_m2"] = area

    emitters = str(_require_key(inputs, "emitters")).strip().lower()
    if emitters not in {"radiators", "ufh"}:
        raise ValueError("emitters must be 'radiators' or 'ufh'.")
    out["emitters"] = emitters

    pattern = str(_require_key(inputs, "heating_pattern")).strip().lower()
    if pattern not in {"rare", "normal", "high"}:
        raise ValueError("heating_pattern must be 'rare', 'normal', or 'high'.")
    out["heating_pattern"] = pattern

    wood_use = str(_require_key(inputs, "wood_use")).strip().lower()
    if wood_use not in {"none", "some", "lots"}:
        raise ValueError("wood_use must be 'none', 'some', or 'lots'.")
    out["wood_use"] = wood_use

    occupants = int(float(_require_key(inputs, "occupants")))
    if not (1 <= occupants <= 20):
        raise ValueError("occupants must be between 1 and 20.")
    out["occupants"] = occupants

    fuel_type = str(_require_key(inputs, "fuel_type")).strip().lower()
    if fuel_type not in {"gas", "kerosene"}:
        raise ValueError("fuel_type must be 'gas' or 'kerosene'.")
    out["fuel_type"] = fuel_type

    fuel_price = float(_require_key(inputs, "fuel_price_eur_per_unit"))
    if not (0.0 <= fuel_price <= 5.0):
        raise ValueError("fuel_price_eur_per_unit looks out of range.")
    out["fuel_price_eur_per_unit"] = fuel_price

    elec_price = float(_require_key(inputs, "electricity_price_eur_per_kwh"))
    if not (0.0 <= elec_price <= 5.0):
        raise ValueError("electricity_price_eur_per_kwh looks out of range.")
    out["electricity_price_eur_per_kwh"] = elec_price

    boiler_eff = float(_require_key(inputs, "boiler_efficiency"))
    if not (0.5 <= boiler_eff <= 1.0):
        raise ValueError("boiler_efficiency must be between 0.5 and 1.0.")
    out["boiler_efficiency"] = boiler_eff

    hp_quote = float(_require_key(inputs, "hp_quote_eur"))
    if not (0 <= hp_quote <= 100000):
        raise ValueError("hp_quote_eur looks out of range.")
    out["hp_quote_eur"] = hp_quote

    grant_applied = bool(inputs.get("grant_applied", True))
    out["grant_applied"] = grant_applied

    grant_value = float(inputs.get("grant_value_eur", 6500.0 if grant_applied else 0.0))
    if grant_value < 0:
        raise ValueError("grant_value_eur must be >= 0.")
    out["grant_value_eur"] = grant_value

    # Bills anchor (optional)
    bill_mode = inputs.get("bill_mode", "none")  # 'annual_fuel_use' | 'annual_spend' | 'none'
    if bill_mode not in {"annual_fuel_use", "annual_spend", "none"}:
        raise ValueError("bill_mode must be 'annual_fuel_use', 'annual_spend', or 'none'.")
    out["bill_mode"] = bill_mode

    annual_fuel_use = inputs.get("annual_fuel_use")
    annual_spend = inputs.get("annual_spend_eur")

    if bill_mode == "annual_fuel_use":
        if annual_fuel_use is None:
            raise ValueError("annual_fuel_use is required when bill_mode='annual_fuel_use'.")
        out["annual_fuel_use"] = float(annual_fuel_use)
        out["annual_spend_eur"] = None
    elif bill_mode == "annual_spend":
        if annual_spend is None:
            raise ValueError("annual_spend_eur is required when bill_mode='annual_spend'.")
        out["annual_spend_eur"] = float(annual_spend)
        out["annual_fuel_use"] = None
    else:
        out["annual_fuel_use"] = None
        out["annual_spend_eur"] = None

    return out


# -----------------------------
# Analysis engine
# -----------------------------

def run_analysis(raw_inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Website-ready engine function.
    - No input() calls
    - No prints
    - Returns a report dict suitable for JSON + PDF generation
    """
    inputs = validate_and_normalize_inputs(raw_inputs)

    ber = inputs["ber_band"]
    area = inputs["floor_area_m2"]
    emitters = inputs["emitters"]
    pattern = inputs["heating_pattern"]
    wood_use = inputs["wood_use"]
    occupants = inputs["occupants"]
    fuel_type = inputs["fuel_type"]
    fuel_price = inputs["fuel_price_eur_per_unit"]
    elec_price = inputs["electricity_price_eur_per_kwh"]
    boiler_eff = inputs["boiler_efficiency"]
    hp_quote = inputs["hp_quote_eur"]
    grant_applied = inputs["grant_applied"]
    grant_value = inputs["grant_value_eur"]

    capex = max(0.0, hp_quote - (grant_value if grant_applied else 0.0))

    # Assumptions
    scop_rng = emitter_to_scop_range(emitters)
    pattern_mult = heating_pattern_multiplier(pattern)
    dhw_band = dhw_band_kwh_th_per_year(occupants)
    ber_intensity = ber_to_space_heat_intensity_kwh_m2_yr(ber)
    wood_kwh = wood_offset_kwh_th_per_year(wood_use)

    # -------------------------
    # Path B: BER-based (always available)
    # -------------------------
    # Space heating basis from BER, then behaviour multiplier
    Qspace_ber = tuple(i * area * pattern_mult for i in ber_intensity)  # (best,typ,worst)

    # Apply wood as an offset to *space heating only* (BER-based path)
    Qspace_ber_after_wood = tuple(max(0.0, q - wood_kwh) for q in Qspace_ber)

    # Total delivered heat basis = space(after wood) + DHW
    Q_total_ber = (
        Qspace_ber_after_wood[0] + dhw_band[0],
        Qspace_ber_after_wood[1] + dhw_band[1],
        Qspace_ber_after_wood[2] + dhw_band[2],
    )

    # Current cost estimate from BER-based heat
    if fuel_type == "kerosene":
        # litres = (fuel_kWh) / 10 where fuel_kWh = delivered/eff
        litres = tuple((Q_total_ber[i] / boiler_eff) / 10.0 for i in range(3))
        Ccur_ber = tuple(litres[i] * fuel_price for i in range(3))
        fuel_unit = "L"
    else:
        gas_kwh = tuple((Q_total_ber[i] / boiler_eff) for i in range(3))
        Ccur_ber = tuple(gas_kwh[i] * fuel_price for i in range(3))
        fuel_unit = "kWh"

    Chp_ber = band_hp_costs_from_heat(Q_total_ber, scop_rng, elec_price)
    savings_ber = tuple(Ccur_ber[i] - Chp_ber[i] for i in range(3))
    payback_ber = tuple(payback_years(capex, savings_ber[i]) for i in range(3))

    # -------------------------
    # Path A: Bills-based (optional)
    # -------------------------
    bill_mode = inputs["bill_mode"]
    bills_available = bill_mode != "none"
    Q_total_bill: Optional[Tuple[float, float, float]] = None
    Ccur_bill: Optional[Tuple[float, float, float]] = None
    Chp_bill: Optional[Tuple[float, float, float]] = None
    savings_bill: Optional[Tuple[float, float, float]] = None
    payback_bill: Optional[Tuple[float, float, float]] = None
    anchor: Dict[str, Any] = {"mode": None, "annual_units": None, "annual_spend_eur": None}

    if bills_available:
        if fuel_type == "kerosene":
            kwh_per_unit = 10.0
            unit_name = "L"
        else:
            kwh_per_unit = 1.0
            unit_name = "kWh"

        if bill_mode == "annual_fuel_use":
            annual_units = float(inputs["annual_fuel_use"])
            if annual_units < 0:
                raise ValueError("annual_fuel_use must be >= 0.")
            annual_spend = annual_units * fuel_price
            anchor = {"mode": "annual_fuel_use", "annual_units": annual_units, "annual_spend_eur": None}

        else:
            annual_spend = float(inputs["annual_spend_eur"])
            if annual_spend < 0:
                raise ValueError("annual_spend_eur must be >= 0.")
            annual_units = annual_spend / fuel_price if fuel_price > 0 else 0.0
            anchor = {"mode": "annual_spend", "annual_units": None, "annual_spend_eur": annual_spend}

        # Delivered heat inferred from paid fuel (this already reflects wood/behaviour in reality)
        fuel_kwh = annual_units * kwh_per_unit
        Q_paid_delivered = fuel_kwh * boiler_eff

        # Add DHW band (we assume the paid fuel also covers DHW unless the user used separate systems)
        # Keep it simple: DHW included in the same total basis (screening).
        Q_total_bill = (
            0.85 * Q_paid_delivered + dhw_band[0],
            1.00 * Q_paid_delivered + dhw_band[1],
            1.15 * Q_paid_delivered + dhw_band[2],
        )

        # Current cost band around the bill estimate
        Ccur_bill = (0.9 * annual_spend, annual_spend, 1.1 * annual_spend)

        Chp_bill = band_hp_costs_from_heat(Q_total_bill, scop_rng, elec_price)
        savings_bill = tuple(Ccur_bill[i] - Chp_bill[i] for i in range(3))
        payback_bill = tuple(payback_years(capex, savings_bill[i]) for i in range(3))

    # -------------------------
    # Verdict + key drivers (verdict-first product layer)
    # -------------------------

    # Pick primary method: bills-based if provided, else BER-based
    if bills_available and savings_bill:
        primary_label = "bills_based"
        savings_primary = savings_bill
        payback_primary = payback_bill
    else:
        primary_label = "ber_based"
        savings_primary = savings_ber
        payback_primary = payback_ber

    outcomes_primary = [outcome_from_savings(s) for s in savings_primary]
    verdict = verdict_from_outcomes(outcomes_primary)
    confidence = confidence_from_outcomes(outcomes_primary)

    # If bills are available, cross-check against BER-based and adjust confidence
    consistency = "unknown"
    notes: List[str] = []
    if bills_available and savings_bill:
        outcomes_ber = [outcome_from_savings(s) for s in savings_ber]
        verdict_ber = verdict_from_outcomes(outcomes_ber)

        outcomes_bill = [outcome_from_savings(s) for s in savings_bill]
        verdict_bill = verdict_from_outcomes(outcomes_bill)

        agree = (verdict_ber == verdict_bill)
        confidence = adjust_confidence(confidence, agree=agree)

        if agree:
            consistency = "aligns"
        else:
            consistency = "diverges"
            notes.append("Bills-based and BER-based estimates disagree; partial heating and secondary heat sources may dominate the real outcome.")

        # Helpful nudges for interpretation
        if wood_use in {"lots"}:
            notes.append("High wood use can make payback uncertain unless wood is displaced by the heat pump.")
        if pattern == "rare":
            notes.append("Rare heating reduces potential running-cost savings even if comfort benefits exist.")
    else:
        consistency = "unknown"
        notes.append("Bills not provided; BER-based method used as the primary estimate.")

    # Typical figures (based on primary method)
    typ_savings = float(savings_primary[1])
    typ_payback = float(payback_primary[1]) if payback_primary else math.inf

    # Key drivers (short, human-readable)
    key_drivers: List[str] = []

    # price ratio driver
    if fuel_type == "gas":
        if elec_price >= 3.0 * fuel_price:
            key_drivers.append("electricity much higher than gas price")
        elif elec_price >= 2.0 * fuel_price:
            key_drivers.append("electricity higher than gas price")
    else:
        eff_eur_per_kwh_th = (fuel_price / 10.0) / max(1e-6, boiler_eff)
        if elec_price >= 2.5 * eff_eur_per_kwh_th:
            key_drivers.append("electricity much higher than oil-delivered cost")
        elif elec_price >= 1.8 * eff_eur_per_kwh_th:
            key_drivers.append("electricity higher than oil-delivered cost")

    if emitters == "radiators":
        key_drivers.append("radiator system lowers seasonal COP vs UFH")
    if pattern == "rare":
        key_drivers.append("heating rarely on reduces potential savings")
    if grant_applied:
        key_drivers.append("grant reduces upfront cost")
    if ber in {"E","F","G"}:
        key_drivers.append("lower BER increases heat demand")
    if ber in {"A","B"}:
        key_drivers.append("higher BER reduces heat demand (can reduce savings potential)")
    if wood_use in {"some","lots"} and not bills_available:
        key_drivers.append("wood heating assumed to offset space heat in BER-based estimate")

    # Decision text blocks (the "product")
    verdict_text = VERDICT_TEXT[verdict]
    confidence_text = CONFIDENCE_TEXT[confidence]
    decision_summary = what_this_means(verdict, confidence)

    recommendations: List[Dict[str, Any]] = []
    if verdict == "likely_saves":
        recommendations.append({
            "title": "Next steps",
            "bullets": [
                "Ask installer for expected seasonal performance (SCOP) at your emitter temperatures.",
                "Confirm radiators/UFH can run at lower flow temperatures (better efficiency).",
                "Check if a smart tariff or day/night plan could reduce electricity cost."
            ]
        })
    elif verdict == "borderline":
        recommendations.append({
            "title": "How to improve the economics",
            "bullets": [
                "Reduce required flow temperature (radiator upgrades / weather compensation) to increase SCOP.",
                "Prioritise insulation/air-tightness improvements before or alongside a heat pump.",
                "Consider electricity tariff optimisation (night rates / smart tariffs)."
            ]
        })
    else:
        recommendations.append({
            "title": "If your goal is savings",
            "bullets": [
                "A heat pump may not reduce running costs under typical assumptions at current prices.",
                "Insulation/controls upgrades can be higher-return first steps.",
                "A heat pump can still be worthwhile for comfort, carbon, and automation—separate from payback."
            ]
        })

    # Build report
    report: Dict[str, Any] = {
        "meta": {
            "tool_version": "engine_v1",
            "currency": "EUR",
            "generated_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        },
        "inputs": {
            "ber_band": ber,
            "floor_area_m2": area,
            "emitters": emitters,
            "heating_pattern": pattern,
            "wood_use": wood_use,
            "occupants": occupants,
            "fuel_type": fuel_type,
            "fuel_price_eur_per_unit": fuel_price,
            "fuel_unit": fuel_unit,
            "electricity_price_eur_per_kwh": elec_price,
            "boiler_efficiency": boiler_eff,
            "hp_quote_eur": hp_quote,
            "grant_applied": grant_applied,
            "grant_value_eur": grant_value if grant_applied else 0.0,
            "hp_capex_eur": capex,
            "bill_mode": bill_mode,
        },
        "assumptions": {
            "oil_kwh_per_litre": 10.0,
            "dhw_kwh_th_per_person_band": [700, 900, 1200],
            "dhw_kwh_th_per_year_band": list(dhw_band),
            "scop_range": list(scop_rng),
            "ber_space_heat_intensity_kwh_th_per_m2_band": list(ber_intensity),
            "heating_pattern_multiplier": pattern_mult,
            "wood_offset_kwh_th_per_year": wood_kwh if bill_mode == "none" else 0.0,
            "notes": [
                "This is a screening model using annual energy balance and uncertainty bands.",
                "BER-based method uses standardised assumptions adjusted by a simple heating-pattern slider.",
                "Bills-based method anchors to annual spend/use (preferred when available).",
            ],
        },
        "results": {
            "ber_based": {
                "best": {
                    "heat_kwh_th": Q_total_ber[0],
                    "current_cost_eur": Ccur_ber[0],
                    "hp_cost_eur": Chp_ber[0],
                    "savings_eur": savings_ber[0],
                    "payback_years": to_payback_or_none(payback_ber[0]),
                },
                "typical": {
                    "heat_kwh_th": Q_total_ber[1],
                    "current_cost_eur": Ccur_ber[1],
                    "hp_cost_eur": Chp_ber[1],
                    "savings_eur": savings_ber[1],
                    "payback_years": to_payback_or_none(payback_ber[1]),
                },
                "worst": {
                    "heat_kwh_th": Q_total_ber[2],
                    "current_cost_eur": Ccur_ber[2],
                    "hp_cost_eur": Chp_ber[2],
                    "savings_eur": savings_ber[2],
                    "payback_years": to_payback_or_none(payback_ber[2]),
                },
            },
            "bills_based": {
                "available": bills_available,
                "anchor": anchor,
            },
        },
        
"decision": {
    "primary_method": primary_label,
    "verdict": verdict,
    "verdict_text": verdict_text,
    "confidence_level": confidence,
    "confidence_text": confidence_text,
    "what_this_means": decision_summary,
    "typical_savings_eur": float(typ_savings),
    "typical_payback_years": to_payback_or_none(float(typ_payback)),
    "key_drivers": key_drivers,
},
"cross_check": {
    "consistency": consistency,
    "notes": notes,
},
        "recommendations": recommendations,
        "disclaimer": "Screening estimate only. Not a substitute for a detailed design survey.",
    }

    if bills_available and Q_total_bill and Ccur_bill and Chp_bill and savings_bill and payback_bill:
        report["results"]["bills_based"].update({
            "best": {
                "heat_kwh_th": Q_total_bill[0],
                "current_cost_eur": Ccur_bill[0],
                "hp_cost_eur": Chp_bill[0],
                "savings_eur": savings_bill[0],
                "payback_years": to_payback_or_none(payback_bill[0]),
            },
            "typical": {
                "heat_kwh_th": Q_total_bill[1],
                "current_cost_eur": Ccur_bill[1],
                "hp_cost_eur": Chp_bill[1],
                "savings_eur": savings_bill[1],
                "payback_years": to_payback_or_none(payback_bill[1]),
            },
            "worst": {
                "heat_kwh_th": Q_total_bill[2],
                "current_cost_eur": Ccur_bill[2],
                "hp_cost_eur": Chp_bill[2],
                "savings_eur": savings_bill[2],
                "payback_years": to_payback_or_none(payback_bill[2]),
            },
        })

    return report


def write_report_json(report: Dict[str, Any], out_path: str | Path = "report.json") -> Path:
    out = Path(out_path)
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return out
