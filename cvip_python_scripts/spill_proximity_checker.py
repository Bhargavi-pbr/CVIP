"""
=============================================================================
SPILL PROXIMITY & VIRTUAL ZONING ENGINE (CVIP MODULE)
-----------------------------------------------------------------------------
Performs spatial Edge-to-Edge bounding box separation calculations between 
liquid containers and electronic devices with resolution normalization.
=============================================================================
"""

import math

def compute_box_edge_distance(box1, box2):
    """
    Computes true minimum Euclidean distance between two bounding box rectangles.
    Bounding box format: [x1, y1, x2, y2]
    Returns 0 if rectangles intersect or touch.
    """
    dx = max(0, max(box1[0], box2[0]) - min(box1[2], box2[2]))
    dy = max(0, max(box1[1], box2[1]) - min(box1[3], box2[3]))
    return math.hypot(dx, dy)

def evaluate_desk_safety(cup_box, laptop_box, frame_width=1280, frame_height=720):
    """
    Evaluates safety status between a cup and a laptop based on bounding boxes.
    Uses Edge-to-Edge separation normalized by frame diagonal.
    """
    frame_diagonal = math.hypot(frame_width, frame_height)
    edge_dist = compute_box_edge_distance(cup_box, laptop_box)
    norm_dist = edge_dist / frame_diagonal

    # Normalized threshold rules:
    # Critical Hazard: Overlap (0px) or within 5% of diagonal
    # Caution/Warning: Within 12% of diagonal
    # Safe: Greater than 12% of diagonal
    if norm_dist < 0.05 or edge_dist == 0:
        return {
            'status': 'CRITICAL_HAZARD',
            'edge_distance_px': round(edge_dist, 1),
            'normalized_distance': round(norm_dist, 3),
            'message': f"CRITICAL: Liquid edge within {round(edge_dist, 1)}px ({(norm_dist * 100):.1f}% diagonal) of tech!",
            'color': 'RED'
        }
    elif norm_dist < 0.12:
        return {
            'status': 'WARNING',
            'edge_distance_px': round(edge_dist, 1),
            'normalized_distance': round(norm_dist, 3),
            'message': f"CAUTION: Liquid placed close ({round(edge_dist, 1)}px edge gap) to tech.",
            'color': 'YELLOW'
        }
    else:
        return {
            'status': 'SAFE',
            'edge_distance_px': round(edge_dist, 1),
            'normalized_distance': round(norm_dist, 3),
            'message': f"SAFE: Liquid at safe perimeter separation ({round(edge_dist, 1)}px gap).",
            'color': 'GREEN'
        }

if __name__ == "__main__":
    print("--- Test Case 1: Coffee Cup edge touching Laptop Keyboard ---")
    cup1 = [320, 240, 380, 300]
    laptop1 = [380, 200, 700, 480]
    print(evaluate_desk_safety(cup1, laptop1))

    print("\n--- Test Case 2: Coffee Cup placed in safe perimeter coaster zone ---")
    cup2 = [850, 100, 910, 160]
    laptop2 = [380, 200, 700, 480]
    print(evaluate_desk_safety(cup2, laptop2))
