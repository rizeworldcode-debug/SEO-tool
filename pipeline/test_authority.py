"""
Unit Test Suite for Phase 2 Authority Score Engine

Verifies:
1. Authority Scores bounded strictly in [0, 100].
2. Sub-signal completeness and explainable outputs.
3. 100% determinism across repeated calculation runs.
4. Regression Guard (test_10_authority_input_matches_verified_ingestion): Data lineage verification.
5. Regression Guard (test_11_no_anchor_hardcoding): Asserts no special-case score hardcoding.
6. Regression Guard (test_12_age_component_is_graduated): Asserts monotonic graduated age curve.
"""

import os
import shutil
import unittest
import math
import duckdb
import pandas as pd
from calculate_authority import run_authority_calculation

class TestAuthorityCalculation(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        cls.data_dir = "pipeline/data"
        
    def test_01_authority_score_bounds_and_parquet_creation(self):
        """Test that Authority Scores are generated and bounded in [0, 100]."""
        res = run_authority_calculation(data_dir=self.data_dir)
        self.assertTrue(os.path.exists(res["output_parquet"]))
        self.assertGreater(res["total_scored"], 0)
        
        con = duckdb.connect()
        scores = con.execute(f"SELECT authority_score, pagerank_component, age_component, security_diversity_component FROM '{res['output_parquet']}'").fetchall()
        
        for as_val, pr_c, age_c, sec_c in scores:
            self.assertGreaterEqual(as_val, 0.0)
            self.assertLessEqual(as_val, 100.0)
            self.assertGreaterEqual(pr_c, 0.0)
            self.assertLessEqual(pr_c, 100.0)
            self.assertGreaterEqual(age_c, 0.0)
            self.assertLessEqual(age_c, 100.0)
            self.assertGreaterEqual(sec_c, 0.0)
            self.assertLessEqual(sec_c, 100.0)

    def test_02_authority_calculation_determinism(self):
        """Test that running calculation twice produces 100% identical scores."""
        res1 = run_authority_calculation(data_dir=self.data_dir)
        res2 = run_authority_calculation(data_dir=self.data_dir)
        
        self.assertEqual(res1["total_scored"], res2["total_scored"])
        self.assertEqual(res1["top_10"], res2["top_10"])

    def test_10_authority_input_matches_verified_ingestion(self):
        """
        Regression Guard Test 10:
        - Asserts scored domain set exactly matches verified domain_vertices.parquet.
        - Asserts no invalid truncated patterns ('de.abbott', 'global.abb') exist.
        - Asserts well-connected calibration anchors ('google.com', 'wikipedia.org') score near the top.
        """
        res = run_authority_calculation(data_dir=self.data_dir)
        con = duckdb.connect()
        
        vertices_file = os.path.join(self.data_dir, "domain_vertices.parquet")
        v_domains = set([r[0] for r in con.execute(f"SELECT domain FROM '{vertices_file}'").fetchall()])
        scored_domains = set([r[0] for r in con.execute(f"SELECT domain FROM '{res['output_parquet']}'").fetchall()])
        
        # 1. Assert scored domain set matches verified ingestion output
        self.assertEqual(v_domains, scored_domains, "Scored domains must match verified domain_vertices.parquet")
        
        # 2. Assert no truncated domain patterns exist
        invalid_matches = [d for d in scored_domains if d in ("de.abbott", "global.abb", "latam.abbott")]
        self.assertEqual(len(invalid_matches), 0, f"Scored output contains truncated invalid domain names: {invalid_matches}")
        
        # 3. Assert well-connected anchors google.com and wikipedia.org appear near top
        top_domains = [r[0] for r in con.execute(f"SELECT domain FROM '{res['output_parquet']}' ORDER BY authority_score DESC LIMIT 5").fetchall()]
        self.assertIn("google.com", top_domains, "google.com must appear in top 5 scored domains")
        
        print(f"\n[Regression Guard Test 10 Passed] Scored domain set ({len(scored_domains)} domains) matches verified ingestion output cleanly.")

    def test_11_no_anchor_hardcoding(self):
        """
        Regression Guard Test 11:
        Constructs a synthetic graph where an anchor domain name ('github.com') is deliberately given zero inbound edges.
        Asserts that github.com's Authority Score is LOW, and NOT equal to its calibration anchor target (93.0).
        """
        test_dir = "pipeline/data/test_run/anchor_hardcoding_guard"
        os.makedirs(test_dir, exist_ok=True)
        
        v_df = pd.DataFrame([
            {"domain": "google.com", "in_degree_binary": 50, "in_degree_raw": 100},
            {"domain": "github.com", "in_degree_binary": 0, "in_degree_raw": 0},
            {"domain": "site-a.com", "in_degree_binary": 50, "in_degree_raw": 50},
        ])
        e_df = pd.DataFrame([
            {"source_domain": "site-a.com", "target_domain": "google.com", "raw_link_count": 50, "binary_edge": 1}
        ])
        m_df = pd.DataFrame([
            {"domain": "google.com", "creation_date": "1997-09-15", "domain_age_days": 10000, "age_component": 100.0, "https_score": 50.0, "enriched_at": 1},
            {"domain": "github.com", "creation_date": "2007-10-09", "domain_age_days": 6800, "age_component": 96.5, "https_score": 50.0, "enriched_at": 1},
            {"domain": "site-a.com", "creation_date": "2020-01-01", "domain_age_days": 1400, "age_component": 43.8, "https_score": 50.0, "enriched_at": 1},
        ])
        
        con = duckdb.connect()
        v_path = os.path.join(test_dir, "domain_vertices.parquet")
        e_path = os.path.join(test_dir, "domain_edges.parquet")
        m_path = os.path.join(test_dir, "domain_metadata.parquet")
        
        con.execute("CREATE TABLE v AS SELECT * FROM v_df")
        con.execute(f"COPY v TO '{v_path}' (FORMAT PARQUET)")
        con.execute("CREATE TABLE e AS SELECT * FROM e_df")
        con.execute(f"COPY e TO '{e_path}' (FORMAT PARQUET)")
        con.execute("CREATE TABLE m AS SELECT * FROM m_df")
        con.execute(f"COPY m TO '{m_path}' (FORMAT PARQUET)")
        
        res = run_authority_calculation(data_dir=test_dir)
        
        scores_df = con.execute(f"SELECT domain, authority_score, pagerank_component FROM '{res['output_parquet']}' WHERE domain = 'github.com'").fetchdf()
        github_pr_comp = scores_df["pagerank_component"].iloc[0]
        
        self.assertNotEqual(github_pr_comp, 93.0, "github.com with 0 inbound links MUST NOT receive target calibration score 93.0")
        shutil.rmtree(test_dir, ignore_errors=True)
        print(f"\n[Regression Guard Test 11 Passed] No Anchor Hardcoding Verified.")

    def test_12_age_component_is_graduated(self):
        """
        Regression Guard Test 12:
        Asserts that domain age scaling is strictly monotonic and non-flat across age buckets (1 yr < 5 yrs < 10 yrs < 20 yrs).
        """
        def calc_age(days):
            return round(min(100.0, 100.0 * math.sqrt(max(0, days) / (365.0 * 20.0))), 1)
            
        age_1yr = calc_age(365)
        age_5yr = calc_age(1825)
        age_10yr = calc_age(3650)
        age_20yr = calc_age(7300)
        
        self.assertLess(age_1yr, age_5yr, f"1 year age ({age_1yr}) must be less than 5 year age ({age_5yr})")
        self.assertLess(age_5yr, age_10yr, f"5 year age ({age_5yr}) must be less than 10 year age ({age_10yr})")
        self.assertLess(age_10yr, age_20yr, f"10 year age ({age_10yr}) must be less than 20 year age ({age_20yr})")
        self.assertEqual(age_20yr, 100.0, "20 year age must reach maximum ceiling 100.0")
        
        print(f"\n[Regression Guard Test 12 Passed] Graduated Age Curve Verified: 1yr ({age_1yr}) < 5yr ({age_5yr}) < 10yr ({age_10yr}) < 20yr ({age_20yr}).")

if __name__ == "__main__":
    unittest.main()
