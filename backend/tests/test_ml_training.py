import inspect
import unittest
from dataclasses import FrozenInstanceError
import numpy as np
from scipy.sparse import csr_matrix

from ml.training import model_candidates, train_select
from ml.evaluation import FrozenThreshold, select_threshold, metrics, probabilities


class TrainingTests(unittest.TestCase):
    def test_deterministic_configuration(self):
        a, b = model_candidates(), model_candidates()
        self.assertEqual(list(a), list(b))
        for name in a:
            self.assertEqual(a[name].get_params(), b[name].get_params())

    def test_all_models_probability_shape_range_and_determinism(self):
        X = csr_matrix(np.array([[0, 0], [0, 1], [1, 0], [1, 1]] * 4, dtype=float))
        y = np.array([0, 0, 1, 1] * 4)
        first, second = model_candidates(), model_candidates()
        for name, model in first.items():
            with self.subTest(name=name):
                model.fit(X, y)
                second[name].fit(X, y)
                p = probabilities(model, X)
                self.assertEqual(p.shape, (16,))
                self.assertTrue(((p >= 0) & (p <= 1)).all())
                np.testing.assert_array_equal(p, probabilities(second[name], X))

    def test_threshold_uses_validation_not_default_half(self):
        rule = select_threshold([0, 0, 1, 1], [0.60, 0.70, 0.80, 0.90])
        self.assertEqual(rule.value, 0.80)
        np.testing.assert_array_equal(rule.predict([0.79, 0.80]), [0, 1])

    def test_threshold_is_frozen_across_test_evaluation(self):
        threshold = select_threshold([0, 0, 1, 1], [0.60, 0.70, 0.80, 0.90])
        original = threshold.value
        metrics([1, 0], [0.2, 0.95], threshold)
        self.assertEqual(threshold.value, original)
        with self.assertRaises(FrozenInstanceError):
            threshold.value = 0.5

    def test_selection_interface_cannot_receive_test_data(self):
        self.assertEqual(list(inspect.signature(train_select).parameters),
                         ["X_train", "y_train", "X_validation", "y_validation", "candidates"])
        with self.assertRaises(TypeError):
            train_select(None, None, None, None, {}, X_test="forbidden")

    def test_training_never_fits_validation(self):
        X_train = csr_matrix([[0.0], [1.0], [0.0], [1.0]])
        X_val = csr_matrix([[100.0], [200.0]])
        from sklearn.dummy import DummyClassifier
        from unittest.mock import patch
        candidate = DummyClassifier(strategy="most_frequent")
        with patch.object(candidate, "fit", wraps=candidate.fit) as fitted:
            train_select(X_train, [0, 1, 0, 1], X_val, [0, 1], {"baseline": candidate})
            self.assertIs(fitted.call_args.args[0], X_train)
            self.assertEqual(fitted.call_count, 1)

    def test_known_confusion_and_prevalence(self):
        result = metrics([0, 0, 1, 1], [0.1, 0.9, 0.8, 0.2], FrozenThreshold(0.5))
        self.assertEqual(result["confusion_matrix"], [[1, 1], [1, 1]])
        self.assertEqual(result["fraud_prevalence"], 0.5)
        self.assertEqual(result["alert_rate"], 0.5)


if __name__ == "__main__":
    unittest.main()
