import os

import torch
from flask import Flask, jsonify, request
from transformers import AutoModelForSequenceClassification, AutoTokenizer

app = Flask(__name__)

MODEL_NAME = os.getenv("MODERATION_MODEL_NAME", "jinkyeongk/kcELECTRA-toxic-detector")
THRESHOLD = float(os.getenv("MODERATION_THRESHOLD", "0.85"))
TOXIC_LABEL_ID = int(os.getenv("MODERATION_TOXIC_LABEL_ID", "1"))
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

print(f"Loading moderation model: {MODEL_NAME}")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
model.to(DEVICE)
model.eval()
print(f"Moderation model ready: device={DEVICE}, threshold={THRESHOLD}")


@app.get("/")
def health():
    return jsonify({"status": "ok", "model": MODEL_NAME, "threshold": THRESHOLD})


@app.post("/moderate")
def moderate():
    payload = request.get_json(silent=True) or {}
    text = str(payload.get("text") or "").strip()
    if not text:
        return jsonify({"error": "text is required"}), 400

    encoded = tokenizer(text[:5000], return_tensors="pt", truncation=True, max_length=256)
    encoded = {key: value.to(DEVICE) for key, value in encoded.items()}

    with torch.no_grad():
        probabilities = torch.softmax(model(**encoded).logits[0], dim=-1)

    if TOXIC_LABEL_ID < 0 or TOXIC_LABEL_ID >= probabilities.shape[0]:
        return jsonify({"error": "invalid toxic label id"}), 500

    score = float(probabilities[TOXIC_LABEL_ID].item())
    predicted_id = int(torch.argmax(probabilities).item())
    return jsonify({
        "toxic": score >= THRESHOLD,
        "score": round(score, 6),
        "threshold": THRESHOLD,
        "label": model.config.id2label.get(predicted_id, str(predicted_id)),
        "model": MODEL_NAME,
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
