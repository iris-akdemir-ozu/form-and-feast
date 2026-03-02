"""
Injury Hazard Scorer
=====================
Computes a 0-99% Estimated Stress Risk score for each detected movement flag.

Mathematical approach:
  1. Each injury type has an "Anatomic Severity Weight" (0-100) — not a literal
     probability of acute injury, but a measure of how directly the compensation
     pattern loads vulnerable connective tissue structures.
  2. Multipliers (neuromuscular fatigue, absolute load, chronic overuse) scale
     the raw hazard score.
  3. The raw hazard is passed through a sigmoid function to produce a clean
     0-99.9% probability curve — no score can exceed 100%.

Clinical framing:
  Output is labeled "Estimated Stress Risk" or "Injury Hazard Score", NOT
  "probability of ACL tear on this rep." This aligns with sports science
  epidemiology which measures injury risk in incidences per 1000 hours,
  not per-rep probability.
"""

import math


# ── Anatomic Severity Weights (0-100) ─────────────────────────────────────────
# Represents how directly this compensation pattern loads vulnerable structures.
# High = direct connective tissue stress. Low = inefficient force transfer only.
SEVERITY_WEIGHT = {
    "knee valgus":           65,   # directly loads ACL, MCL, meniscus
    "lumbar rounding":       70,   # direct disc compression under axial load
    "butt wink":             60,   # lumbar flexion at end range under load
    "forward lean":          45,   # anterior knee shear + mild disc stress
    "heel lift":             40,   # achilles + patellar tracking deviation
    "shoulder impingement":  55,   # supraspinatus impingement zone loading
    "elbow flare":           20,   # mostly inefficient, low acute risk
    "hyperextension":        60,   # joint capsule + cruciate stress
    "cervical strain":       55,   # facet joint compression
    "hip shift":             50,   # SIJ + labrum asymmetric loading
    "chest collapse":        60,   # glenohumeral anterior capsule stress
    "default":               30,   # unrecognized — conservative baseline
}

STRUCTURES_AT_RISK = {
    "knee valgus":           "ACL, medial meniscus, MCL",
    "lumbar rounding":       "L4-L5 and L5-S1 intervertebral discs",
    "butt wink":             "lumbar spine, SI joint",
    "forward lean":          "patellar tendon, L3-L4 disc",
    "heel lift":             "Achilles tendon, patellar tracking",
    "shoulder impingement":  "supraspinatus tendon, subacromial bursa",
    "elbow flare":           "medial epicondyle, ulnar collateral ligament",
    "hyperextension":        "joint capsule, cruciate ligaments",
    "cervical strain":       "C5-C6 facet joints, upper trapezius",
    "hip shift":             "SI joint, hip labrum, IT band",
    "chest collapse":        "glenohumeral joint, anterior deltoid",
    "default":               "surrounding soft tissue",
}


def _sigmoid(x: float) -> float:
    """
    Standard logistic sigmoid: maps any real number to (0, 1).
    We use a scaled input so that a raw hazard of 1.0 maps to ~73%,
    and the curve reaches ~95% only at extreme hazard values (>2.5).
    This prevents runaway multiplication from producing nonsense scores.
    """
    return 1 / (1 + math.exp(-2.5 * (x - 1)))


def _match_severity(issue: str) -> tuple:
    """Fuzzy match issue string to known pattern."""
    issue_lower = issue.lower()
    for key in SEVERITY_WEIGHT:
        if key in issue_lower or any(w in issue_lower for w in key.split()):
            return key, SEVERITY_WEIGHT[key]
    return "default", SEVERITY_WEIGHT["default"]


def score_injury_flags(
    current_flags:      list,
    set_number:         int,
    intensity_score:    int,
    past_session_flags: list = None
) -> list:
    """
    Enriches each injury flag with:
      - hazard_score     raw pre-sigmoid score (for transparency)
      - risk_score       0-99 sigmoid-mapped Estimated Stress Risk
      - risk_level       "low" | "moderate" | "high" | "critical"
      - structures_at_risk
      - compounding      True if pattern detected in past sessions
      - reasoning        Full XAI explanation of score derivation
    """
    if not current_flags:
        return []

    past_issues = [f.lower() for f in (past_session_flags or [])]
    scored = []

    for flag in current_flags:
        issue    = flag.get("issue", "")
        severity = flag.get("severity", "moderate")

        matched_key, base_weight = _match_severity(issue)

        # ── Multiplier 1: Neuromuscular Fatigue (set number) ─────────────────
        # Form breakdown under fatigue is exponentially more dangerous than
        # form breakdown while fresh. Caps at set 4+.
        # Set 1 → 1.0, Set 2 → 1.25, Set 3 → 1.5, Set 4+ → 1.75
        fatigue_multiplier = min(1.0 + (set_number - 1) * 0.25, 1.75)

        # ── Multiplier 2: Absolute Load (intensity score) ─────────────────────
        # Knee valgus on air squats = mobility issue.
        # Knee valgus on 1RM = emergency.
        # Scales 0.7 (intensity 1) → 1.3 (intensity 10)
        load_multiplier = 0.7 + (intensity_score / 10) * 0.6

        # ── Multiplier 3: Chronic Overuse (history factor) ────────────────────
        # Connective tissues fail after repetitive micro-trauma.
        # If this appeared in past sessions, tissues are already stressed.
        appeared_before  = any(
            matched_key in p or matched_key.split()[0] in p
            for p in past_issues
        )
        overuse_multiplier = 1.35 if appeared_before else 1.0

        # ── Nova severity nudge ───────────────────────────────────────────────
        severity_nudge = {"low": 0.85, "moderate": 1.0, "high": 1.15}.get(severity, 1.0)

        # ── Raw hazard score (normalized to ~1.0 baseline) ────────────────────
        # base_weight is 0-100; divide by 100 to get 0-1 baseline hazard
        raw_hazard = (base_weight / 100) * fatigue_multiplier * load_multiplier * overuse_multiplier * severity_nudge

        # ── Sigmoid mapping → clean 0-99% probability curve ──────────────────
        risk_pct   = _sigmoid(raw_hazard)
        risk_score = min(99, round(risk_pct * 100))

        # ── Risk level thresholds ─────────────────────────────────────────────
        if risk_score >= 75:   risk_level = "critical"
        elif risk_score >= 55: risk_level = "high"
        elif risk_score >= 35: risk_level = "moderate"
        else:                  risk_level = "low"

        # ── XAI Reasoning string ──────────────────────────────────────────────
        structures  = STRUCTURES_AT_RISK.get(matched_key, STRUCTURES_AT_RISK["default"])
        history_note = (
            " This pattern has appeared in previous sessions — connective tissue "
            "micro-trauma may already be accumulating (chronic overuse factor: ×1.35)."
            if appeared_before else ""
        )
        set_note = (
            f" Detected on set {set_number} — neuromuscular fatigue increases "
            f"injury risk exponentially under continued load (fatigue factor: ×{fatigue_multiplier})."
            if set_number > 1 else ""
        )
        reasoning = (
            f"Anatomic severity weight for {matched_key}: {base_weight}/100 "
            f"(direct loading of {structures}). "
            f"Scaled by absolute load at intensity {intensity_score}/10 "
            f"(load factor: ×{round(load_multiplier, 2)}){set_note}{history_note} "
            f"Raw hazard score: {round(raw_hazard, 3)} → sigmoid-mapped to "
            f"{risk_score}% Estimated Stress Risk. "
            f"{'Immediate load reduction recommended.' if risk_score >= 55 else 'Monitor closely.'}"
        )

        scored.append({
            **flag,
            "risk_score":         risk_score,
            "raw_hazard":         round(raw_hazard, 3),
            "risk_level":         risk_level,
            "structures_at_risk": structures,
            "compounding":        appeared_before or set_number > 1,
            "chronic":            appeared_before,
            "reasoning":          reasoning,
            "fatigue_factor":     round(fatigue_multiplier, 2),
            "load_factor":        round(load_multiplier, 2),
            "overuse_factor":     round(overuse_multiplier, 2),
        })

    scored.sort(key=lambda x: x["risk_score"], reverse=True)
    return scored


def get_session_risk_summary(all_scored_flags: list) -> dict:
    """
    Aggregate all scored flags from a full session into a top-level summary.
    Uses sigmoid-mapped scores so averaging is mathematically valid.
    """
    if not all_scored_flags:
        return {
            "overall_risk_score": 0,
            "overall_risk_level": "none",
            "top_concern":        None,
            "recommendation":     "No injury flags detected this session. Excellent movement quality."
        }

    scores    = [f["risk_score"] for f in all_scored_flags]
    top_flag  = max(all_scored_flags, key=lambda x: x["risk_score"])
    avg_score = round(sum(scores) / len(scores))

    # Use the peak score weighted against average — peak matters more for safety
    overall = min(99, round(avg_score * 0.4 + top_flag["risk_score"] * 0.6))

    if overall >= 75:
        level = "critical"
        rec   = (f"Stop training immediately. {top_flag['issue'].capitalize()} "
                 f"poses critical stress risk ({top_flag['risk_score']}%). "
                 f"Rest and address mobility before next session.")
    elif overall >= 55:
        level = "high"
        rec   = (f"Reduce load significantly. {top_flag['issue'].capitalize()} "
                 f"detected at high hazard level. Consider ending this session early.")
    elif overall >= 35:
        level = "moderate"
        rec   = (f"Proceed with caution. Focus on correcting {top_flag['issue']} "
                 f"before your next set. Consider a deload.")
    else:
        level = "low"
        rec   = "Minor compensations detected. Stay mindful of form but safe to continue."

    return {
        "overall_risk_score": overall,
        "overall_risk_level": level,
        "top_concern":        top_flag["issue"],
        "recommendation":     rec,
    }