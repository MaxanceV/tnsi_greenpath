"""Tests de la pseudo-blockchain locale (hashes chaînés SHA-256)."""

from types import SimpleNamespace

from app.services.blockchain import (
    GENESIS_HASH,
    anchor,
    assign_hashes,
    compute_chain,
    verify_chain,
)


def _step(position=1, name="X", weight_kg=1.0, step_type="matiere_premiere",
          supplier=None, location=None, transport_mode=None, distance_km=None, hash=None):
    return SimpleNamespace(
        position=position,
        name=name,
        weight_kg=weight_kg,
        step_type=step_type,
        supplier=supplier,
        location=location,
        transport_mode=transport_mode,
        distance_km=distance_km,
        hash=hash,
    )


class TestAnchor:
    def test_anchor_is_deterministic(self):
        h1 = anchor("payload-X", GENESIS_HASH)
        h2 = anchor("payload-X", GENESIS_HASH)
        assert h1 == h2

    def test_anchor_changes_with_payload(self):
        h1 = anchor("payload-A", GENESIS_HASH)
        h2 = anchor("payload-B", GENESIS_HASH)
        assert h1 != h2

    def test_anchor_changes_with_previous_hash(self):
        h1 = anchor("payload-X", "prev1")
        h2 = anchor("payload-X", "prev2")
        assert h1 != h2

    def test_anchor_returns_sha256_hex(self):
        h = anchor("anything", GENESIS_HASH)
        assert len(h) == 64
        assert all(c in "0123456789abcdef" for c in h)


class TestChain:
    def test_empty_chain(self):
        assert compute_chain([]) == []

    def test_chain_length_matches_steps(self):
        steps = [_step(position=i) for i in range(1, 4)]
        chain = compute_chain(steps)
        assert len(chain) == 3

    def test_chain_is_ordered_by_position(self):
        # Steps fournis dans le désordre → chain ordonnée par position
        s1 = _step(position=1, name="A")
        s2 = _step(position=2, name="B")
        s3 = _step(position=3, name="C")
        chain_forward = compute_chain([s1, s2, s3])
        chain_shuffled = compute_chain([s3, s1, s2])
        assert chain_forward == chain_shuffled

    def test_modifying_step_invalidates_subsequent_hashes(self):
        s1 = _step(position=1, name="Original")
        s2 = _step(position=2, name="Second")
        s3 = _step(position=3, name="Third")
        before = compute_chain([s1, s2, s3])

        s2_modified = _step(position=2, name="MODIFIED")
        after = compute_chain([s1, s2_modified, s3])

        assert before[0] == after[0]  # étape 1 inchangée
        assert before[1] != after[1]  # étape 2 modifiée
        assert before[2] != after[2]  # étape 3 invalidée par effet domino


class TestVerifyChain:
    def test_valid_chain(self):
        s1 = _step(position=1)
        s2 = _step(position=2)
        assign_hashes([s1, s2])
        assert verify_chain([s1, s2]) is True

    def test_tampered_step_breaks_verification(self):
        s1 = _step(position=1)
        s2 = _step(position=2, name="Original")
        assign_hashes([s1, s2])
        # On modifie le contenu de s2 mais pas son hash → la chain doit se casser
        s2.name = "FALSIFIED"
        assert verify_chain([s1, s2]) is False

    def test_verify_on_empty_list(self):
        assert verify_chain([]) is True


class TestAssignHashes:
    def test_assigns_hash_to_each_step(self):
        s1 = _step(position=1)
        s2 = _step(position=2)
        assert s1.hash is None
        assert s2.hash is None
        assign_hashes([s1, s2])
        assert s1.hash is not None
        assert s2.hash is not None
        assert len(s1.hash) == 64

    def test_assign_is_idempotent(self):
        s1 = _step(position=1)
        assign_hashes([s1])
        h1 = s1.hash
        assign_hashes([s1])
        assert s1.hash == h1
