import json
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# ── 1. Load data ──────────────────────────────────────────────────────────────
with open("data.json") as f:
    data = json.load(f)

texts = [d["text"] for d in data]
labels = [1 if d["label"] == "urgent" else 0 for d in data]

# ── 2. Split ──────────────────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    texts, labels, test_size=0.2, random_state=42, stratify=labels
)

# ── 3. Train ──────────────────────────────────────────────────────────────────
vectorizer = TfidfVectorizer(max_features=3000, ngram_range=(1, 2))
X_train_vec = vectorizer.fit_transform(X_train)
X_test_vec = vectorizer.transform(X_test)

model = LogisticRegression(class_weight="balanced", max_iter=1000)
model.fit(X_train_vec, y_train)

# ── 4. Evaluate ───────────────────────────────────────────────────────────────
y_pred = model.predict(X_test_vec)
print(classification_report(y_test, y_pred, target_names=["non_urgent", "urgent"]))

# ── 5. Export weights to JSON ─────────────────────────────────────────────────
export = {
    "vocabulary": {k: int(v) for k, v in vectorizer.vocabulary_.items()},          # word → index
    "idf": vectorizer.idf_.tolist(),               # idf weights
    "coef": model.coef_[0].tolist(),               # LR weights
    "intercept": model.intercept_[0],              # LR bias
    "ngram_range": list(vectorizer.ngram_range)
}

with open("model.json", "w") as f:
    json.dump(export, f)

print("Saved model.json")


# ── 6. Test on fresh data ─────────────────────────────────────────────────────
test_notifications = [
    "Your bank account has been locked due to suspicious activity",
    "Check out our summer sale — 50% off everything!",
    "Low battery: 5% remaining",
    "John liked your photo",
    "ALERT: Unauthorized login attempt on your Google account",
    "Your Amazon order has shipped"
]

test_vec = vectorizer.transform(test_notifications)
predictions = model.predict(test_vec)

for text, pred in zip(test_notifications, predictions):
    label = "URGENT" if pred == 1 else "non_urgent"
    print(f"{label}: {text}")