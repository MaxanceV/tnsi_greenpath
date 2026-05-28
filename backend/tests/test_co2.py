"""Tests du service de calcul d'empreinte carbone."""

from types import SimpleNamespace

from app.services.co2 import (
    STEP_BASE_FACTORS_KG_CO2_PER_KG,
    TRANSPORT_FACTORS_KG_CO2_PER_TKM,
    co2_for_step,
    total_co2_for_product,
)


def _step(**kwargs):
    """Construit un objet Step-like (sans toucher la DB)."""
    defaults = dict(
        weight_kg=1.0,
        step_type="matiere_premiere",
        transport_mode=None,
        distance_km=None,
    )
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


class TestCO2Step:
    def test_matiere_premiere_uses_base_factor(self):
        s = _step(weight_kg=2.0, step_type="matiere_premiere")
        expected = round(2.0 * STEP_BASE_FACTORS_KG_CO2_PER_KG["matiere_premiere"], 3)
        assert co2_for_step(s) == expected

    def test_fabrication_uses_base_factor(self):
        s = _step(weight_kg=1.5, step_type="fabrication")
        expected = round(1.5 * STEP_BASE_FACTORS_KG_CO2_PER_KG["fabrication"], 3)
        assert co2_for_step(s) == expected

    def test_distribution_uses_base_factor(self):
        s = _step(weight_kg=3.0, step_type="distribution")
        expected = round(3.0 * STEP_BASE_FACTORS_KG_CO2_PER_KG["distribution"], 3)
        assert co2_for_step(s) == expected

    def test_transport_avion_per_tonne_km(self):
        # 1 t × 1000 km × 1.50 = 1500 kg CO2
        s = _step(weight_kg=1000, step_type="transport", transport_mode="avion", distance_km=1000)
        expected = 1.0 * 1000 * TRANSPORT_FACTORS_KG_CO2_PER_TKM["avion"]
        assert co2_for_step(s) == round(expected, 3)

    def test_transport_bateau_low_emissions(self):
        # 0.3 kg sur 8000 km en bateau = 0.0003 t × 8000 × 0.015 = 0.036
        s = _step(weight_kg=0.3, step_type="transport", transport_mode="bateau", distance_km=8000)
        assert co2_for_step(s) == round(0.0003 * 8000 * 0.015, 3)

    def test_transport_without_distance_falls_back_to_base(self):
        # transport sans distance → utilise base factor du type "transport" (0.0)
        s = _step(weight_kg=5.0, step_type="transport", transport_mode="camion", distance_km=None)
        assert co2_for_step(s) == 0.0

    def test_transport_mode_aucun_falls_back_to_base(self):
        # mode "aucun" → utilise base factor matière première (4.0)
        s = _step(weight_kg=2.0, step_type="matiere_premiere", transport_mode="aucun", distance_km=500)
        assert co2_for_step(s) == 2.0 * 4.0

    def test_zero_weight_returns_zero(self):
        s = _step(weight_kg=0.0, step_type="matiere_premiere")
        assert co2_for_step(s) == 0.0


class TestCO2Product:
    def test_empty_product_is_zero(self):
        product = SimpleNamespace(steps=[])
        assert total_co2_for_product(product) == 0.0

    def test_sums_all_steps(self):
        s1 = _step(weight_kg=1.0, step_type="matiere_premiere")  # 4.0
        s2 = _step(weight_kg=1.0, step_type="fabrication")  # 5.0
        s3 = _step(weight_kg=1.0, step_type="distribution")  # 0.2
        product = SimpleNamespace(steps=[s1, s2, s3])
        assert total_co2_for_product(product) == round(4.0 + 5.0 + 0.2, 3)

    def test_realistic_tshirt_supply_chain(self):
        # T-shirt 0.3 kg, supply chain réaliste
        s1 = _step(weight_kg=0.3, step_type="matiere_premiere")  # 0.3 × 4.0 = 1.2
        s2 = _step(weight_kg=0.3, step_type="transport", transport_mode="bateau", distance_km=11500)
        # 0.0003 × 11500 × 0.015 = 0.05175 → 0.052
        s3 = _step(weight_kg=0.3, step_type="fabrication")  # 0.3 × 5.0 = 1.5
        s4 = _step(weight_kg=0.3, step_type="distribution")  # 0.3 × 0.2 = 0.06
        product = SimpleNamespace(steps=[s1, s2, s3, s4])
        total = total_co2_for_product(product)
        # Vérification : entre 2.5 et 3.5 kg CO2 (ordre de grandeur réaliste)
        assert 2.5 < total < 3.5
