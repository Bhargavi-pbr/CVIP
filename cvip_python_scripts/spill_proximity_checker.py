"""
=============================================================================
SPILL PROXIMITY & VIRTUAL ZONING ENGINE (CVIP MODULE)
-----------------------------------------------------------------------------
Performs spatial Euclidean proximity calculations between liquid containers
and electronic devices with visual zone overlays.
=============================================================================
"""

import math
import numpy as np

def compute_euclidean_distance(pt1, pt2):
    """
    Computes Euclidean distance between two 2D points (x1, y1) and (x2, y2):
    d = sqrt((x1 - x2)^2 + (y1 - y2)^2)
    """
    return math.hypot(pt1[0] - pt2[0], pt1[1] - pt2[1])

def evaluate_desk_safety(cup_box, laptop_box, critical_threshold=110, warning_threshold=180):
    """
    Evaluates safety status between a cup and a laptop based on bounding boxes.
    Bounding box format: [x1, y1, x2, y2]
    """
    cup_center = ((cup_box[0] + cup_box[2]) / 2, (cup_box[1] + cup_box[3]) / 2)
    laptop_center = ((laptop_box[0] + laptop_box[2]) / 2, (laptop_box[1] + laptop_box[3]) / 2)

    dist = compute_euclidean_distance(cup_center, laptop_center)

    if dist < critical_threshold:
        return {
            'status': 'CRITICAL_HAZARD',
            'distance': round(dist, 1),
            'message': f"DANGER: Liquid container within {round(dist, 1)}px of laptop!",
            'color': 'RED'
        }
    elif dist < warning_threshold:
        return {
            'status': 'WARNING',
            'distance': round(dist, 1),
            'message': f"CAUTION: Liquid container placed close ({round(dist, 1)}px) to laptop.",
            'color': 'YELLOW'
        }
    else:
        return {
            'status': 'SAFE',
            'distance': round(dist, 1),
            'message': f"SAFE: Liquid is at a safe perimeter distance ({round(dist, 1)}px).",
            'color': 'GREEN'
        }

if __name__ == "__main__":
    # Test cases
    print("--- Test Case 1: Coffee Cup right next to Laptop Keyboard ---")
    cup1 = [320, 280, 370, 330]
    laptop1 = [380, 200, 700, 480]
    print(evaluate_desk_safety(cup1, laptop1))

    print("\n--- Test Case 2: Coffee Cup placed in safe coaster zone ---")
    cup2 = [850, 100, 900, 150]
    laptop2 = [380, 200, 700, 480]
    print(evaluate_desk_safety(cup2, laptop2))
