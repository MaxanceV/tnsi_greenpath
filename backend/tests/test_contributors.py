"""Tests du workflow multi-producteurs : ajout de contributeur + modification d'étapes.

Régression n°1 : un contributeur avec scope "write" qui met à jour les étapes
d'un produit ayant déjà des étapes de l'owner provoquait un 500
(cascade delete-orphan sur Product.steps mal gérée dans update_product).

Régression n°2 : une fois le 500 corrigé, renvoyer le formulaire complet
(comme le fait le frontend : toutes les étapes chargées via GET, y compris
celles de l'owner) dupliquait les étapes des autres, faussement recréées et
attribuées au contributeur. Corrigé en utilisant l'id de chaque étape pour
distinguer "à moi" de "à quelqu'un d'autre, à ignorer".
"""

from tests.conftest import SAMPLE_PRODUCT_PAYLOAD, auth


def _invite_contributor(client, owner_token, product_id, email, scope="write"):
    r = client.post(
        f"/products/{product_id}/contributors",
        json={"user_email": email, "scope": scope},
        headers=auth(owner_token),
    )
    assert r.status_code == 201, r.text
    return r.json()


class TestContributorStepUpdate:
    def test_contributor_can_add_steps_to_product_with_existing_steps(
        self, client, entreprise_token, contributor_token
    ):
        # L'owner crée un produit avec ses propres étapes
        r = client.post("/products", json=SAMPLE_PRODUCT_PAYLOAD, headers=auth(entreprise_token))
        assert r.status_code == 201
        pid = r.json()["id"]
        owner_step_count = len(r.json()["steps"])

        # L'owner invite un contributeur en écriture
        _invite_contributor(client, entreprise_token, pid, "contributor@test.com")

        # Le contributeur ajoute ses propres étapes
        payload = {
            "name": r.json()["name"],
            "description": r.json()["description"],
            "steps": [
                {
                    "position": 10,
                    "name": "Teinture",
                    "step_type": "fabrication",
                    "weight_kg": 0.2,
                },
            ],
        }
        r2 = client.put(f"/products/{pid}", json=payload, headers=auth(contributor_token))
        assert r2.status_code == 200, r2.text
        data = r2.json()

        # Les étapes de l'owner sont conservées, celles du contributeur ajoutées
        assert len(data["steps"]) == owner_step_count + 1
        names = {s["name"] for s in data["steps"]}
        assert "Teinture" in names
        assert "Culture coton" in names

    def test_contributor_replaces_only_own_steps(
        self, client, entreprise_token, contributor_token
    ):
        r = client.post("/products", json=SAMPLE_PRODUCT_PAYLOAD, headers=auth(entreprise_token))
        pid = r.json()["id"]
        _invite_contributor(client, entreprise_token, pid, "contributor@test.com")

        first_update = {
            "name": r.json()["name"],
            "description": r.json()["description"],
            "steps": [
                {"position": 10, "name": "Teinture", "step_type": "fabrication", "weight_kg": 0.2},
            ],
        }
        client.put(f"/products/{pid}", json=first_update, headers=auth(contributor_token))

        # Le contributeur remplace sa propre étape par une autre
        second_update = {
            "name": r.json()["name"],
            "description": r.json()["description"],
            "steps": [
                {"position": 10, "name": "Séchage", "step_type": "fabrication", "weight_kg": 0.1},
            ],
        }
        r3 = client.put(f"/products/{pid}", json=second_update, headers=auth(contributor_token))
        assert r3.status_code == 200, r3.text
        names = {s["name"] for s in r3.json()["steps"]}

        # L'ancienne étape du contributeur a disparu, la nouvelle est présente,
        # les étapes de l'owner sont toujours là
        assert "Teinture" not in names
        assert "Séchage" in names
        assert "Culture coton" in names

    def test_contributor_resubmitting_full_form_does_not_duplicate_others_steps(
        self, client, entreprise_token, contributor_token
    ):
        """Reproduit le comportement réel du frontend : le formulaire charge
        TOUTES les étapes existantes (via GET) puis les renvoie telles
        quelles au PUT, avec leur id, en plus des étapes ajoutées/modifiées.
        """
        r = client.post("/products", json=SAMPLE_PRODUCT_PAYLOAD, headers=auth(entreprise_token))
        pid = r.json()["id"]
        owner_step_count = len(r.json()["steps"])
        _invite_contributor(client, entreprise_token, pid, "contributor@test.com")

        # Le contributeur charge le formulaire (GET renvoie tout, avec les id)
        existing = client.get(f"/products/{pid}", headers=auth(contributor_token)).json()["steps"]

        # Le frontend renvoie TOUT le contenu du formulaire : les étapes
        # existantes (avec leur id) + la nouvelle étape ajoutée (sans id)
        full_steps = [
            {
                "id": s["id"],
                "position": s["position"],
                "name": s["name"],
                "step_type": s["step_type"],
                "supplier": s.get("supplier"),
                "location": s.get("location"),
                "weight_kg": s["weight_kg"],
                "transport_mode": s.get("transport_mode"),
                "distance_km": s.get("distance_km"),
                "parent_positions": s.get("parent_positions", []),
                "upstream_product_id": s.get("upstream_product_id"),
                "upstream_batch_id": s.get("upstream_batch_id"),
            }
            for s in existing
        ]
        full_steps.append({
            "position": len(existing) + 1,
            "name": "Teinture",
            "step_type": "fabrication",
            "weight_kg": 0.2,
        })

        update_payload = {"name": "T-shirt test", "description": None, "steps": full_steps}
        r2 = client.put(f"/products/{pid}", json=update_payload, headers=auth(contributor_token))
        assert r2.status_code == 200, r2.text
        data = r2.json()

        # Pas de doublon : les étapes de l'owner apparaissent une seule fois
        assert len(data["steps"]) == owner_step_count + 1
        names = [s["name"] for s in data["steps"]]
        assert names.count("Culture coton") == 1
        assert names.count("Teinture") == 1
