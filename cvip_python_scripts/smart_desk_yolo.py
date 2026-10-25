"""
=============================================================================
SMART DESK OBJECT DETECTION AND MONITORING SYSTEM (CVIP PROJECT)
Python OpenCV & YOLOv8 Implementation
-----------------------------------------------------------------------------
Features:
1. Real-time Object Detection using YOLOv8 (Laptop, Cup, Bottle, Phone, Book)
2. Euclidean Distance Spill Hazard Detector (Cup vs Laptop)
3. Desk Clutter Index (DCI) calculation based on object density & surface area
4. Study Distraction Alert (Phone in focus zone)
5. Visual annotations and HUD overlay using OpenCV
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

# Class Categories
PRODUCTIVE_CLASSES = {'laptop', 'keyboard', 'mouse', 'book', 'notebook', 'scissors'}
DISTRACTION_CLASSES = {'cell phone', 'remote'}
SPILL_CLASSES = {'cup', 'bottle', 'wine glass'}

def calculate_clutter_index(detections, frame_shape):
    """
    Desk Clutter Index (DCI) Formulation:
    DCI = w1 * (N / N_max) + w2 * (OccupiedArea / TotalArea)
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
    score = int((count_ratio * 0.45 + area_ratio * 0.55) * 100)
    
    status = "Clean"
    color = (0, 255, 0)
    if score > 65:
        status = "Messy / High Clutter"
        color = (0, 0, 255)
    elif score > 35:
        status = "Moderate"
        color = (0, 165, 255)

    return score, status, color, valid_objects

def check_spill_hazard(detections):
    """
    Calculates Euclidean distance between liquid containers and electronics.
    """
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
            dx = liq['center'][0] - tech['center'][0]
            dy = liq['center'][1] - tech['center'][1]
            dist = math.hypot(dx, dy)

            # Hazard proximity threshold
            if dist < 120:
                hazards.append({
                    'liquid': liq,
                    'tech': tech,
                    'distance': int(dist),
                    'critical': True
                })
            elif dist < 190:
                hazards.append({
                    'liquid': liq,
                    'tech': tech,
                    'distance': int(dist),
                    'critical': False
                })

    return hazards

def run_smart_desk(source=0):
    """
    Main loop running OpenCV capture and YOLO object detection.
    """
    if YOLO is None:
        print("[ERROR] YOLO model cannot be loaded. Please install ultralytics.")
        return

    print("[INFO] Loading YOLOv8n model...")
    model = YOLO("yolov8n.pt")  # Auto-downloads tiny weights (6MB)

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
            if conf < 0.40:
                continue
            coords = box.xyxy[0].cpu().numpy().astype(int)
            detections.append({'label': label, 'conf': conf, 'box': coords})

        # Process Analytics
        dci, dci_status, dci_color, obj_count = calculate_clutter_index(detections, frame.shape)
        hazards = check_spill_hazard(detections)

        # Draw Annotations
        for det in detections:
            x1, y1, x2, y2 = det['box']
            label = det['label'].lower()
            conf = int(det['conf'] * 100)

            # Color coding
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

        # Draw Spill Hazard connecting lines
        for h in hazards:
            l_pt = h['liquid']['center']
            t_pt = h['tech']['center']
            color = (0, 0, 255) if h['critical'] else (0, 200, 255)
            thickness = 3 if h['critical'] else 1

            cv2.line(frame, l_pt, t_pt, color, thickness)
            mid_x = (l_pt[0] + t_pt[0]) // 2
            mid_y = (l_pt[1] + t_pt[1]) // 2
            cv2.circle(frame, (mid_x, mid_y), 14, color, -1)
            cv2.putText(frame, f"{h['distance']}px", (mid_x - 14, mid_y + 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)

            if h['critical']:
                # Flashing warning text
                cv2.putText(frame, "CRITICAL: SPILL HAZARD NEAR TECH!", (40, 90),
                            cv2.FONT_HERSHEY_DUPLEX, 0.8, (0, 0, 255), 2)

        # HUD Overlay Banner
        hud_h, hud_w = 40, frame.shape[1]
        cv2.rectangle(frame, (0, 0), (hud_w, hud_h), (20, 24, 30), -1)
        status_txt = f"SMART DESK CVIP | Clutter: {dci}% ({dci_status}) | Objects: {obj_count} | FPS: {fps}"
        cv2.putText(frame, status_txt, (15, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, dci_color, 2)

        cv2.imshow("Smart Desk Object Detection & Monitoring System", frame)

        # Press 'q' to exit
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    run_smart_desk()
