from flask import Flask, request, jsonify
from ultralytics import YOLO
from segment_anything import sam_model_registry, SamPredictor
from PIL import Image, ImageOps
import numpy as np
import torch
import io
import gc

app = Flask(__name__)

# =========================
# 모델 경로
# =========================
YOLO_MODEL_PATH = "/app/20260429bests.pt"
SAM_CHECKPOINT_PATH = "/app/sam_vit_b.pth"

# =========================
# 설정값
# =========================
MAX_IMAGE_SIZE = 768
YOLO_CONF = 0.35
YOLO_IOU = 0.5
YOLO_IMGSZ = 768

# =========================
# 디바이스 설정
# =========================
device = "cuda" if torch.cuda.is_available() else "cpu"

# =========================
# YOLO 모델 로드
# =========================
yolo_model = YOLO(YOLO_MODEL_PATH)

# =========================
# SAM 모델 로드
# =========================
sam = sam_model_registry["vit_b"](checkpoint=SAM_CHECKPOINT_PATH)
sam.to(device=device)
sam.eval()

sam_predictor = SamPredictor(sam)

print("✅ YOLO + SAM 모델 로드 완료")
print(f"✅ device={device}")
print(f"✅ YOLO_CONF={YOLO_CONF}")
print(f"✅ YOLO_IOU={YOLO_IOU}")
print(f"✅ YOLO_IMGSZ={YOLO_IMGSZ}")
print(f"✅ MAX_IMAGE_SIZE={MAX_IMAGE_SIZE}")
print("✅ YOLO class names:", yolo_model.names)


@app.route("/", methods=["GET"])
def home():
    return "AI 서버 정상 작동중"


def resize_image_for_inference(img: Image.Image):
    """
    큰 이미지를 YOLO/SAM 추론용으로 축소한다.
    scale은 resized / original 비율이다.
    """
    orig_w, orig_h = img.size

    scale = min(
        MAX_IMAGE_SIZE / orig_w,
        MAX_IMAGE_SIZE / orig_h,
        1.0
    )

    if scale < 1.0:
        new_w = int(orig_w * scale)
        new_h = int(orig_h * scale)
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    return img, scale, orig_w, orig_h


@app.route("/detect", methods=["POST"])
def detect():
    try:
        if "image" not in request.files:
            return jsonify({"error": "image 파일이 없습니다."}), 400

        file = request.files["image"]

        # =========================
        # 이미지 읽기 + 회전 보정
        # =========================
        img = Image.open(io.BytesIO(file.read())).convert("RGB")
        img = ImageOps.exif_transpose(img)

        # =========================
        # 이미지 리사이즈
        # =========================
        img, scale, orig_w, orig_h = resize_image_for_inference(img)

        image_np = np.array(img)
        image_height, image_width = image_np.shape[:2]
        image_area = image_height * image_width

        print(
            f"📷 image: original=({orig_w}x{orig_h}), "
            f"processed=({image_width}x{image_height}), scale={scale:.4f}"
        )

        # =========================
        # 1. YOLO 탐지
        # =========================
        with torch.no_grad():
            results = yolo_model.predict(
                source=image_np,
                conf=YOLO_CONF,
                iou=YOLO_IOU,
                imgsz=YOLO_IMGSZ,
                verbose=False
            )

        detections = []

        # YOLO 탐지 결과 확인
        has_boxes = False
        for r in results:
            if r.boxes is not None and len(r.boxes) > 0:
                has_boxes = True
                break

        if not has_boxes:
            print("⚠️ YOLO 탐지 결과 없음")

            return jsonify({
                "status": "success",
                "count": 0,
                "detections": [],
                "message": "confidence 기준을 넘는 하자가 탐지되지 않았습니다.",
                "image_info": {
                    "original_width": orig_w,
                    "original_height": orig_h,
                    "processed_width": image_width,
                    "processed_height": image_height,
                    "scale": round(scale, 4)
                }
            })

        # =========================
        # 2. SAM 이미지 세팅
        # =========================
        with torch.no_grad():
            sam_predictor.set_image(image_np)

        # =========================
        # 3. YOLO bbox → SAM mask
        # =========================
        for r in results:
            for box in r.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()

                class_id = int(box.cls[0])
                label_name = yolo_model.names[class_id]
                confidence = float(box.conf[0])

                print("🔎 DETECTION:", {
                    "class_id": class_id,
                    "label": label_name,
                    "confidence": round(confidence, 4),
                    "bbox_resized": [int(x1), int(y1), int(x2), int(y2)]
                })

                bbox_for_sam = np.array([x1, y1, x2, y2])

                segmentation_applied = False
                mask_area_resized = 0
                mask_area_original = 0
                area_ratio = 0.0

                try:
                    with torch.no_grad():
                        masks, scores, logits = sam_predictor.predict(
                            box=bbox_for_sam,
                            multimask_output=False
                        )

                    mask = masks[0]

                    # 리사이즈 이미지 기준 mask 면적
                    mask_area_resized = int(np.sum(mask))

                    # 원본 이미지 기준 추정 mask 면적
                    if scale > 0:
                        mask_area_original = int(mask_area_resized / (scale * scale))
                    else:
                        mask_area_original = mask_area_resized

                    area_ratio = float(mask_area_resized / image_area) if image_area > 0 else 0.0
                    segmentation_applied = True

                except Exception as sam_error:
                    print(f"⚠️ SAM segmentation 실패: {sam_error}")
                    segmentation_applied = False
                    mask_area_resized = 0
                    mask_area_original = 0
                    area_ratio = 0.0

                # 원본 이미지 좌표 기준 bbox 복원
                if scale > 0:
                    original_bbox = [
                        int(x1 / scale),
                        int(y1 / scale),
                        int(x2 / scale),
                        int(y2 / scale)
                    ]
                else:
                    original_bbox = [int(x1), int(y1), int(x2), int(y2)]

                detections.append({
                    "label": label_name,
                    "confidence": round(confidence, 4),
                    "bbox": original_bbox,
                    "area_ratio": round(area_ratio, 4),
                    "mask_area": mask_area_original,
                    "mask_area_resized": mask_area_resized,
                    "segmentation_applied": segmentation_applied
                })

        response = {
            "status": "success",
            "count": len(detections),
            "detections": detections,
            "image_info": {
                "original_width": orig_w,
                "original_height": orig_h,
                "processed_width": image_width,
                "processed_height": image_height,
                "scale": round(scale, 4)
            }
        }

        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        return jsonify(response)

    except Exception as e:
        print(f"❌ detect 전체 실패: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)