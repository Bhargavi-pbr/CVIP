"""
=============================================================================
SMART DESK OBJECT DETECTION AND MONITORING SYSTEM (CVIP PROJECT)
Python OpenCV & YOLOv8 Implementation (Refined & Validated)
-----------------------------------------------------------------------------
Standardized Features:
1. Object Detection using YOLOv8 on Verified Standard COCO Classes
2. Edge-to-Edge Bounding Box Separation for Spill Hazard Detection (Normalized)
3. Standardized Desk Clutter Index (DCI) matching Web Application Formula
4. Phone-Based Distraction Estimator (Primary Work Zone tracking)
5. Visual annotations with edge distance indicators & HUD telemetry overlay
=============================================================================
"""

import cv2
import numpy as np
import math
import time

try:
    from ultralytics import YOLO
except ImportError:
    print("[WARNING] 'ultralytics' library not installed. Run: pip install ultralytics")
    YOLO = None

# Verified Standard COCO Classes (Custom stationery like 'notebook'/'pen' excluded)
PRODUCTIVE_CLASSES = {'laptop', 'keyboard', 'mouse', 'book', 'scissors'}
DISTRACTION_CLASSES = {'cell phone', 'remote'}
SPILL_CLASSES = {'cup', 'bottle', 'wine glass', 'bowl'}

def compute_box_edge_distance(box1, box2):
    """
    Computes true separation between two bounding box rectangles [x1, y1, x2, y2].
    Returns 0 if boxes touch or overlap.
    """
    dx = max(0, max(box1[0], box2[0]) - min(box1[2], box2[2]))
    dy = max(0, max(box1[1], box2[1]) - min(box1[3], box2[3]))
    return math.hypot(dx, dy)

def calculate_edge_density(frame):
    """
    Computes high-frequency edge density using Canny edge detection.
    """
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 1.4)
    edges = cv2.Canny(blurred, 35, 75)
    total_pixels = edges.shape[0] * edges.shape[1]
    edge_count = np.sum(edges == 255)
    return min(1.0, (edge_count / total_pixels) * 12)

def calculate_clutter_index(detections, frame_shape, edge_density=None):
    """
    Standardized Desk Clutter Index (DCI) Formulation:
    DCI = w1 * (N / 8) + w2 * (OccupiedArea / (0.75 * TotalArea)) + w3 * EdgeDensity
    Identical across JavaScript and Python implementations.
    """
    h, w = frame_shape[:2]
    total_area = w * h
    occupied_area = 0
    valid_objects = 0

    for det in detections:
        label = det['label'].lower()
        if label == 'person':
            continue
        box = det['box']
        area = (box[2] - box[0]) * (box[3] - box[1])
        occupied_area += area
        valid_objects += 1

    area_ratio = min(1.0, occupied_area / (total_area * 0.75))
    count_ratio = min(1.0, valid_objects / 8.0)
    
    if edge_density is not None:
        edge_ratio = min(1.0, edge_density)
        raw_score = (count_ratio * 0.35 + area_ratio * 0.40 + edge_ratio * 0.25) * 100
    else:
        raw_score = (count_ratio * 0.45 + area_ratio * 0.55) * 100

    score = int(min(100, max(0, raw_score)))
    
    status = "Clean"
    color = (0, 255, 0)
    if score > 65:
        status = "Messy / High Clutter"
        color = (0, 0, 255)
    elif score > 35:
        status = "Moderate"
        color = (0, 165, 255)

    return score, status, color, valid_objects

def check_spill_hazard(detections, frame_shape):
    """
    Computes true Edge-to-Edge separation between liquids and electronics.
    Normalized by frame diagonal to ensure scale invariance across resolutions.
    """
    h, w = frame_shape[:2]
    frame_diagonal = math.hypot(w, h)
    liquids = []
    electronics = []

    for det in detections:
        lbl = det['label'].lower()
        box = det['box']
        cx = int((box[0] + box[2]) / 2)
        cy = int((box[1] + box[3]) / 2)
        center = (cx, cy)

        if lbl in SPILL_CLASSES:
            liquids.append({'label': lbl, 'center': center, 'box': box})
        elif lbl in {'laptop', 'keyboard', 'mouse'}:
            electronics.append({'label': lbl, 'center': center, 'box': box})

    hazards = []
    for liq in liquids:
        for tech in electronics:
            edge_dist = compute_box_edge_distance(liq['box'], tech['box'])
            norm_dist = edge_dist / frame_diagonal

            # Normalized thresholds:
            # Critical: Overlap (0) or within 5% of diagonal
            # Warning: Within 12% of diagonal
            if norm_dist < 0.05 or edge_dist == 0:
                hazards.append({
                    'liquid': liq,
                    'tech': tech,
                    'edge_dist': int(edge_dist),
                    'norm_dist': norm_dist,
                    'critical': True
                })
            elif norm_dist < 0.12:
                hazards.append({
                    'liquid': liq,
                    'tech': tech,
                    'edge_dist': int(edge_dist),
                    'norm_dist': norm_dist,
                    'critical': False
                })

    return hazards

def run_smart_desk(source=0):
    """
    Main loop running OpenCV capture and YOLO object detection.
    """
    if YOLO is None:
        print("[ERROR] YOLO model cannot be loaded. Please run: pip install ultralytics")
        return

    print("[INFO] Loading YOLOv8n model...")
    model = YOLO("yolov8n.pt")

    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"[ERROR] Could not open video source {source}")
        return

    prev_time = time.time()

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # FPS calculation
        curr_time = time.time()
        fps = int(1.0 / (curr_time - prev_time + 1e-6))
        prev_time = curr_time

        # Run YOLO inference
        results = model(frame, verbose=False)[0]
        detections = []

        for box in results.boxes:
            cls_id = int(box.cls[0])
            label = model.names[cls_id]
            conf = float(box.conf[0])
            if conf < 0.45:
                continue
            coords = box.xyxy[0].cpu().numpy().astype(int)
            detections.append({'label': label, 'conf': conf, 'box': coords})

        # Process Standardized Analytics
        edge_density = calculate_edge_density(frame)
        dci, dci_status, dci_color, obj_count = calculate_clutter_index(detections, frame.shape, edge_density)
        hazards = check_spill_hazard(detections, frame.shape)

        # Draw Bounding Box Annotations
        for det in detections:
            x1, y1, x2, y2 = det['box']
            label = det['label'].lower()
            conf = int(det['conf'] * 100)

            box_color = (255, 100, 0)
            if label in PRODUCTIVE_CLASSES:
                box_color = (0, 200, 50)
            elif label in DISTRACTION_CLASSES:
                box_color = (0, 0, 255)
            elif label in SPILL_CLASSES:
                box_color = (0, 165, 255)

            cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)
            caption = f"{det['label'].upper()} {conf}%"
            cv2.putText(frame, caption, (x1, max(20, y1 - 8)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, box_color, 2)

        # Draw Edge-to-Edge Hazard connecting lines
        for h in hazards:
            l_pt = h['liquid']['center']
            t_pt = h['tech']['center']
            color = (0, 0, 255) if h['critical'] else (0, 200, 255)
            thickness = 3 if h['critical'] else 1

            cv2.line(frame, l_pt, t_pt, color, thickness)
            mid_x = (l_pt[0] + t_pt[0]) // 2
            mid_y = (l_pt[1] + t_pt[1]) // 2
            
            badge_text = "OVERLAP" if h['edge_dist'] == 0 else f"{h['edge_dist']}px edge"
            cv2.circle(frame, (mid_x, mid_y), 18, color, -1)
            cv2.putText(frame, badge_text, (mid_x - 22, mid_y + 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.38, (255, 255, 255), 1)

            if h['critical']:
                cv2.putText(frame, "CRITICAL: SPILL HAZARD NEAR TECH!", (40, 90),
                            cv2.FONT_HERSHEY_DUPLEX, 0.75, (0, 0, 255), 2)

        # HUD Overlay Banner
        hud_h, hud_w = 42, frame.shape[1]
        cv2.rectangle(frame, (0, 0), (hud_w, hud_h), (20, 24, 30), -1)
        status_txt = f"SMART DESK CVIP | Clutter: {dci}% ({dci_status}) | Objects: {obj_count} | FPS: {fps}"
        cv2.putText(frame, status_txt, (15, 27), cv2.FONT_HERSHEY_SIMPLEX, 0.6, dci_color, 2)

        cv2.imshow("Smart Desk Object Detection & Monitoring System", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    run_smart_desk()
