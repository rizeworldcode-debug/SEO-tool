"""
Unit Test Suite for Phase 3 Page Score Engine (pipeline/test_page.py)

Verifies:
1. Page Scores bounded strictly in [0, 100].
2. Path depth decay & query param penalty math.
3. Homepage vs deep URL decay (deep URL < homepage).
4. Data Lineage Guard (test_03_page_score_data_lineage_guard): Asserts error raised on missing dataset.
"""

import os
import unittest
import duckdb
from calculate_page import calculate_page_score

class TestPageScoreCalculation(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        cls.data_dir = "pipeline/data"
        
    def test_01_page_score_bounds(self):
        """Test that Page Scores are generated and bounded in [0, 100]."""
        res = calculate_page_score(url="https://google.com/search/docs", data_dir=self.data_dir)
        self.assertGreaterEqual(res["page_score"], 0.0)
        self.assertLessEqual(res["page_score"], 100.0)
        self.assertEqual(res["domain"], "google.com")

    def test_02_homepage_vs_deep_url_decay(self):
        """
        Validation Test:
        Asserts that a deep, multi-param URL scores meaningfully lower than its domain homepage.
        """
        res_home = calculate_page_score(url="https://google.com/", data_dir=self.data_dir)
        res_deep = calculate_page_score(url="https://google.com/a/b/c/d/deep-page.html?ref=1&utm=2", data_dir=self.data_dir)
        
        self.assertGreater(res_home["page_score"], res_deep["page_score"], "Homepage score must be strictly higher than deep URL score")
        self.assertGreater(res_home["page_score"] - res_deep["page_score"], 20.0, "Deep URL penalty must be meaningful (> 20 point drop)")
        print(f"\n[Validation Test 02 Passed] Homepage ({res_home['page_score']}) > Deep URL ({res_deep['page_score']}).")

    def test_03_page_score_data_lineage_guard(self):
        """
        Regression Guard Test:
        Asserts FileNotFoundError is raised if domain_authority_scores.parquet is missing.
        """
        with self.assertRaises(FileNotFoundError):
            calculate_page_score(url="https://google.com/", data_dir="invalid/non_existent_path")
        print("\n[Regression Guard Test 03 Passed] Data Lineage Guard verified.")

    def test_04_query_param_penalty(self):
        """Test that query parameters apply expected penalty factor."""
        res_clean = calculate_page_score(url="https://wikipedia.org/wiki/Main_Page", data_dir=self.data_dir)
        res_param = calculate_page_score(url="https://wikipedia.org/wiki/Main_Page?action=history&oldid=123", data_dir=self.data_dir)
        
        self.assertGreater(res_clean["page_score"], res_param["page_score"], "Clean URL must score higher than parameterized URL")

if __name__ == "__main__":
    unittest.main()
