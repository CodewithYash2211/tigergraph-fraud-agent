"""Fixed CPU configurations; selection accepts train/validation only."""
from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from .evaluation import probabilities, select_threshold, metrics

SEED = 42
SELECTION_RULE = "maximum validation balanced accuracy, then average precision, then model name"


def model_candidates(include_xgboost=True):
    result = {"majority": DummyClassifier(strategy="most_frequent")}
    for weight, suffix in ((None, "unweighted"), ("balanced", "balanced")):
        result["logistic_" + suffix] = LogisticRegression(
            C=1.0, solver="liblinear", max_iter=2000, random_state=SEED, class_weight=weight)
        result["forest_" + suffix] = RandomForestClassifier(
            n_estimators=200, max_depth=12, min_samples_leaf=5, max_features="sqrt",
            class_weight=weight, random_state=SEED, n_jobs=1)
    if include_xgboost:
        from xgboost import XGBClassifier
        result["xgboost"] = XGBClassifier(
            n_estimators=200, max_depth=4, learning_rate=0.05, subsample=1.0,
            colsample_bytree=1.0, reg_lambda=1.0, objective="binary:logistic",
            eval_metric="logloss", tree_method="hist", random_state=SEED, n_jobs=1)
    return result


def train_select(X_train, y_train, X_validation, y_validation, candidates):
    """No test data accepted. No hyperparameter search or synthetic oversampling."""
    comparison, fitted = {}, {}
    for name, model in candidates.items():
        model.fit(X_train, y_train)
        p = probabilities(model, X_validation)
        threshold = select_threshold(y_validation, p)
        comparison[name] = metrics(y_validation, p, threshold)
        fitted[name] = {"model": model, "threshold": threshold, "probabilities": p}
    winner = min(comparison, key=lambda name: (
        -comparison[name]["balanced_accuracy"], -comparison[name]["average_precision"], name))
    return winner, comparison, fitted
