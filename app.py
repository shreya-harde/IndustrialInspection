
from flask import Flask, request, jsonify, send_from_directory
from ultralytics import YOLO
from pathlib import Path
from PIL import Image, UnidentifiedImageError
import uuid

BASE_DIR = Path(__file__).resolve().parent
RESULT_DIR = BASE_DIR / "results"
RESULT_DIR.mkdir(exist_ok=True)

app = Flask(__name__)

# Pretrained YOLO model for object recognition
model = YOLO(str(BASE_DIR / "yolo26n.pt"))

@app.get("/")
def home():
    return send_from_directory(BASE_DIR, "index.html")

@app.get("/<path:filename>")
def frontend(filename):
    if filename in ("style.css", "script.js"):
        return send_from_directory(BASE_DIR, filename)
    return jsonify({"error": "File not found"}), 404

@app.get("/api/health")
def health():
    return jsonify({"status": "online", "model": "YOLO26n"})

@app.post("/api/inspect")
def inspect():
    if "image" not in request.files:
        return jsonify({"error": "Please upload an image"}), 400

    try:
        image = Image.open(request.files["image"]).convert("RGB")
        image.load()
    except (UnidentifiedImageError, OSError, ValueError):
        return jsonify({"error": "Invalid image"}), 400

    results = model.predict(image, conf=0.25, verbose=False)
    result = results[0]
    objects = []

    for box in result.boxes:
        class_id = int(box.cls[0].item())
        objects.append({
            "name": result.names[class_id],
            "confidence": round(float(box.conf[0].item()) * 100, 2),
            "box": [round(float(v), 1) for v in box.xyxy[0].tolist()]
        })

    filename = uuid.uuid4().hex + ".jpg"
    result.save(filename=str(RESULT_DIR / filename))

    return jsonify({
        "objects": objects,
        "object_count": len(objects),
        "defect_model_ready": False,
        "defect_status": "not_configured",
        "defects": [],
        "annotated_image": "/results/" + filename
    })

@app.get("/results/<path:filename>")
def result_image(filename):
    return send_from_directory(RESULT_DIR, filename)

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
