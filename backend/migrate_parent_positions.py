"""
Migration one-shot : initialise parent_positions pour tous les produits.
- Produits lineaires (pas encore de parent_positions) : chaine sequentielle auto
- Tablette praline amande : liens de parallelisme explicites
Lancer depuis le dossier backend/ : python migrate_parent_positions.py
"""
import sqlite3
import json
import sys
from pathlib import Path

DB_PATH = Path(__file__).parent / "greenpath.db"

if not DB_PATH.exists():
    print(f"DB introuvable : {DB_PATH}")
    sys.exit(1)

db = sqlite3.connect(str(DB_PATH))

try:
    products = db.execute("SELECT id, name FROM products").fetchall()

    for product_id, product_name in products:
        steps = db.execute(
            "SELECT id, position, parent_positions FROM steps WHERE product_id = ? ORDER BY position",
            (product_id,)
        ).fetchall()

        if not steps:
            continue

        # Cas special : Tablette praline amande (DAG parallele)
        if "prali" in product_name.lower():
            parents = {1: [], 2: [], 3: [1], 4: [2], 5: [3, 4], 6: [5]}
            for step_id, pos, _ in steps:
                pp = parents.get(pos, [])
                db.execute(
                    "UPDATE steps SET parent_positions = ? WHERE id = ?",
                    (json.dumps(pp), step_id)
                )
            print(f"[DAG]    {product_name} ({len(steps)} etapes)")
            continue

        # Cas general : chaine lineaire sequentielle
        positions = [s[1] for s in steps]
        for i, (step_id, pos, current_pp) in enumerate(steps):
            if current_pp is not None:
                # Deja migre, on skip
                continue
            pp = [] if i == 0 else [positions[i - 1]]
            db.execute(
                "UPDATE steps SET parent_positions = ? WHERE id = ?",
                (json.dumps(pp), step_id)
            )
        print(f"[linear] {product_name} ({len(steps)} etapes)")

    db.commit()
    print("\nMigration OK. Relance le backend.")

except Exception as e:
    db.rollback()
    print(f"Erreur : {e}")
    raise
finally:
    db.close()
