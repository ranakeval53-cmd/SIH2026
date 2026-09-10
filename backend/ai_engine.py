"""
ai_engine.py — RailOpt AI Intelligence & Prioritization Layer
=============================================================
Implements:
1. AssetIntelligenceModel: Machine Learning failure risk predictor using Scikit-Learn
   trained on asset degradation, overdue days, GMT accumulated, defect severity, and speed restrictions.
2. DynamicPriorityEngine: Explainable multi-factor scoring (0 to 100) combining:
   - Safety Criticality (40%)
   - Operational & Speed Impact (25%)
   - Urgency & Overdue Penalty (20%)
   - Route Traffic & Corridor Density (15%)
3. Explainability Generator: Detailed factor breakdowns for human railway planners.
"""

import math
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler


class AssetIntelligenceModel:
    """
    Predicts probability of catastrophic asset failure and asset health index.
    Trained on operational railway maintenance indicators.
    """

    def __init__(self):
        self.clf = RandomForestClassifier(n_estimators=50, max_depth=4, random_state=42)
        self.reg = GradientBoostingRegressor(n_estimators=50, max_depth=3, random_state=42)
        self.scaler = StandardScaler()
        self.is_fitted = False
        self._train_baseline_model()

    def _generate_synthetic_training_data(self) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Generates domain-grounded training samples reflecting Indian Railways RDSO maintenance criteria:
        Features: [safety_criticality, asset_degradation_score, urgency_days_overdue, gmt_accumulated, speed_restriction_penalty]
        Target 1: binary failure risk within 7 days (0 or 1)
        Target 2: Asset Health Index (0 to 100, where 100 is pristine and 0 is failed)
        """
        np.random.seed(42)
        n_samples = 400

        # Feature distributions
        safety_crit = np.random.uniform(5.0, 10.0, n_samples)
        degrad_score = np.random.uniform(4.0, 10.0, n_samples)
        overdue_days = np.random.exponential(scale=7.0, size=n_samples)
        gmt = np.random.uniform(30.0, 95.0, n_samples)
        sr_penalty = np.random.choice([0, 15, 20, 30, 45, 60], size=n_samples, p=[0.25, 0.15, 0.2, 0.2, 0.1, 0.1])

        X = np.column_stack([safety_crit, degrad_score, overdue_days, gmt, sr_penalty])

        # Latent risk formula based on railway physics
        risk_score = (
            (safety_crit / 10.0) * 0.35 +
            (degrad_score / 10.0) * 0.30 +
            (np.clip(overdue_days / 20.0, 0, 1.0)) * 0.20 +
            (gmt / 100.0) * 0.10 +
            (sr_penalty > 0).astype(float) * 0.05
        )

        # High risk threshold
        y_class = (risk_score + np.random.normal(0, 0.04, n_samples) > 0.65).astype(int)
        
        # Health index (100 = brand new, < 40 = critical breakdown risk)
        y_health = np.clip(100.0 - (risk_score * 85.0 + np.random.normal(0, 3, n_samples)), 5.0, 98.0)

        return X, y_class, y_health

    def _train_baseline_model(self):
        """Fits the baseline ML models."""
        X, y_class, y_health = self._generate_synthetic_training_data()
        self.scaler.fit(X)
        X_scaled = self.scaler.transform(X)
        self.clf.fit(X_scaled, y_class)
        self.reg.fit(X_scaled, y_health)
        self.is_fitted = True

    def predict_task_risk(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """
        Computes failure risk probability, asset health index, and risk category for a task.
        """
        sc = float(task.get("safety_criticality") or 7.0)
        ads = float(task.get("asset_degradation_score") or 7.0)
        days = float(task.get("urgency_days_overdue") or 0.0)
        gmt = float(task.get("gmt_accumulated") or 60.0)
        sr = float(task.get("speed_restriction_if_deferred_kmh") or 0.0)
        sr_penalty = 100.0 - sr if sr > 0 else 0.0

        features = np.array([[sc, ads, days, gmt, sr_penalty]])
        features_scaled = self.scaler.transform(features)

        prob_failure = float(self.clf.predict_proba(features_scaled)[0][1])
        health_index = float(np.clip(self.reg.predict(features_scaled)[0], 5.0, 99.0))

        if prob_failure >= 0.70 or sc >= 9.5:
            risk_tier = "CRITICAL"
            color = "#ef4444"
        elif prob_failure >= 0.45 or sc >= 8.5:
            risk_tier = "HIGH"
            color = "#f97316"
        elif prob_failure >= 0.25 or sc >= 7.0:
            risk_tier = "MEDIUM"
            color = "#eab308"
        else:
            risk_tier = "LOW"
            color = "#22c55e"

        return {
            "failure_probability": round(prob_failure, 3),
            "asset_health_index": round(health_index, 1),
            "risk_tier": risk_tier,
            "badge_color": color
        }


class DynamicPriorityEngine:
    """
    Computes explainable multi-factor dynamic priority scores (0-100) for maintenance blocks.
    Weights:
    - Safety Criticality: 40%
    - Operational Impact & Speed Restriction: 25%
    - Urgency & Overdue Penalty: 20%
    - Network Density & Traffic Criticality: 15%
    """

    def __init__(self, ai_model: Optional[AssetIntelligenceModel] = None):
        self.ai_model = ai_model or AssetIntelligenceModel()

    def score_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Calculates multi-dimensional priority score with full explainability."""
        sc = float(task.get("safety_criticality") or 7.0)
        ads = float(task.get("asset_degradation_score") or 7.0)
        overdue = float(task.get("urgency_days_overdue") or 0.0)
        sr_kmh = task.get("speed_restriction_if_deferred_kmh")
        gmt = float(task.get("gmt_accumulated") or 60.0)
        horizon = str(task.get("horizon") or "DAILY").upper()
        dept = str(task.get("department") or "TMS").upper()
        line = str(task.get("track_line") or "UP").upper()

        # 1. Safety Component (Max 40 points)
        # Combined safety criticality and physical asset degradation
        safety_pts = round(((sc / 10.0) * 0.65 + (ads / 10.0) * 0.35) * 40.0, 1)

        # 2. Operational Impact Component (Max 25 points)
        # Speed restrictions on busy trunk line cause cascading timetable detentions
        op_pts = 0.0
        if sr_kmh is not None and str(sr_kmh).strip().lower() not in ("none", ""):
            sr_val = float(sr_kmh)
            if sr_val <= 30.0:
                op_pts += 25.0  # Severe speed penalty: down to 20-30 km/h
            elif sr_val <= 50.0:
                op_pts += 18.0
            else:
                op_pts += 12.0
        else:
            # Baseline operational penalty depending on traffic block requirement
            if task.get("requires_traffic_block"):
                op_pts += 10.0
            if task.get("requires_power_block"):
                op_pts += 5.0
        op_pts = min(25.0, op_pts)

        # 3. Urgency & Overdue Component (Max 20 points)
        # Penalizes overdue days past maintenance schedule
        urgency_pts = min(20.0, round((min(overdue, 20.0) / 20.0) * 16.0 + (4.0 if horizon == "DAILY" else 2.0), 1))

        # 4. Route Density & Strategic Corridor Component (Max 15 points)
        # Trunk routes with high GMT and UP/DN trunk lines carry Rajdhanis and Vande Bharats
        density_factor = min(gmt / 100.0, 1.0)
        line_multiplier = 1.0 if line in ("UP", "DN") else 0.8
        density_pts = round(density_factor * 15.0 * line_multiplier, 1)

        total_score = round(min(100.0, max(10.0, safety_pts + op_pts + urgency_pts + density_pts)), 1)

        # ML Risk Model
        ml_prediction = self.ai_model.predict_task_risk(task)

        # Category classification
        if total_score >= 85.0:
            priority_level = "EMERGENCY_CRITICAL"
            rank_badge = "P1"
        elif total_score >= 70.0:
            priority_level = "HIGH_PRIORITY"
            rank_badge = "P2"
        elif total_score >= 50.0:
            priority_level = "MEDIUM_PRIORITY"
            rank_badge = "P3"
        else:
            priority_level = "LOW_PRIORITY"
            rank_badge = "P4"

        # Explainability text
        reasons = []
        if sc >= 9.0:
            reasons.append(f"Severe safety hazard ({sc}/10.0)")
        if sr_kmh and float(sr_kmh) <= 30.0:
            reasons.append(f"Imposes severe {sr_kmh} km/h speed ceiling on trunk corridor")
        if overdue >= 7:
            reasons.append(f"{int(overdue)} days overdue beyond scheduled maintenance window")
        if gmt >= 70.0:
            reasons.append(f"High traffic density corridor ({gmt} GMT)")
        if not reasons:
            reasons.append("Standard periodic preventive maintenance")

        return {
            "task_id": task.get("task_id"),
            "priority_score": total_score,
            "priority_level": priority_level,
            "rank_badge": rank_badge,
            "breakdown": {
                "safety_points": safety_pts,
                "operational_impact_points": round(op_pts, 1),
                "urgency_points": urgency_pts,
                "density_points": density_pts,
                "max_points": 100
            },
            "ml_risk": ml_prediction,
            "primary_rationale": "; ".join(reasons)
        }

    def prioritize_all_tasks(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Scores and ranks all tasks in descending order of AI priority score."""
        scored_tasks = []
        for t in tasks:
            analysis = self.score_task(t)
            merged = dict(t)
            merged.update(analysis)
            scored_tasks.append(merged)

        # Rank descending
        scored_tasks.sort(key=lambda x: x["priority_score"], reverse=True)
        for idx, t in enumerate(scored_tasks, 1):
            t["ai_rank"] = idx
        return scored_tasks
