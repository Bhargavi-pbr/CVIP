"""
=============================================================================
CVIP IMAGE PROCESSING PIPELINE
Classical Computer Vision Algorithms for Desk Clutter Analysis
-----------------------------------------------------------------------------
Implements:
1. Grayscale Conversion (Luminance weighting)
2. Gaussian Smoothing (Noise reduction)
3. Sobel Spatial Gradient Operators
4. Canny Edge Detection (NMS + Hysteresis)
5. Otsu Automated Global Thresholding
6. Morphological Operations (Dilation & Erosion)
7. Multi-panel Matplotlib Visualization
=============================================================================
"""

import cv2
import numpy as np
import matplotlib.pyplot as plt

def process_desk_image(image_path=None):
    """
    Executes and visualizes the full CVIP transformation sequence.
    """
    if image_path is None:
        # Generate synthetic desk image matrix if none provided
        print("[INFO] Creating synthetic desk scene for CVIP demonstration...")
        img = np.ones((480, 640, 3), dtype=np.uint8) * 45
        # Wood desk mat
        cv2.rectangle(img, (80, 60), (560, 420), (30, 25, 20), -1)
        # Laptop
        cv2.rectangle(img, (200, 120), (440, 320), (120, 120, 130), -1)
        cv2.rectangle(img, (220, 140), (420, 240), (200, 100, 40), -1)
        # Coffee cup
        cv2.circle(img, (140, 200), 28, (30, 80, 200), -1)
        # Book
        cv2.rectangle(img, (460, 160), (540, 300), (40, 160, 60), -1)
    else:
        img = cv2.imread(image_path)
        if img is None:
            print(f"[ERROR] Could not load image from {image_path}")
            return

    # Step 1: Grayscale Conversion
    # Y = 0.299R + 0.587G + 0.114B
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Step 2: 5x5 Gaussian Blur
    blurred = cv2.GaussianBlur(gray, (5, 5), 1.4)

    # Step 3: Sobel Gradients
    sobel_x = cv2.Sobel(blurred, cv2.CV_64F, 1, 0, ksize=3)
    sobel_y = cv2.Sobel(blurred, cv2.CV_64F, 0, 1, ksize=3)
    grad_magnitude = np.hypot(sobel_x, sobel_y)
    grad_magnitude = np.uint8(np.clip(grad_magnitude, 0, 255))

    # Step 4: Canny Edge Detection (Non-maximum suppression & Hysteresis)
    canny_edges = cv2.Canny(blurred, threshold1=40, threshold2=110)

    # Step 5: Otsu's Thresholding (Maximizes between-class variance)
    otsu_thresh_val, otsu_binary = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    print(f"[CVIP Metric] Optimal Otsu Threshold computed: {otsu_thresh_val}")

    # Step 6: Morphological Operations
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    dilated = cv2.dilate(canny_edges, kernel, iterations=1)
    eroded = cv2.erode(dilated, kernel, iterations=1)

    # Step 7: Clutter Edge Density
    edge_density = np.sum(canny_edges == 255) / (canny_edges.shape[0] * canny_edges.shape[1])
    print(f"[CVIP Metric] Desk Clutter Edge Density: {edge_density:.4f}")

    # Multi-panel Visualization
    fig, axes = plt.subplots(2, 3, figsize=(15, 9))
    fig.suptitle("Smart Desk CVIP Image Processing Pipeline", fontsize=16, fontweight='bold')

    axes[0, 0].imshow(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    axes[0, 0].set_title("1. Original RGB Input")
    axes[0, 0].axis('off')

    axes[0, 1].imshow(gray, cmap='gray')
    axes[0, 1].set_title("2. Luminance Grayscale (BT.601)")
    axes[0, 1].axis('off')

    axes[0, 2].imshow(blurred, cmap='gray')
    axes[0, 2].set_title("3. Gaussian Blur (5x5, $\sigma=1.4$)")
    axes[0, 2].axis('off')

    axes[1, 0].imshow(grad_magnitude, cmap='inferno')
    axes[1, 0].set_title("4. Sobel Gradient Magnitude $|\nabla I|$")
    axes[1, 0].axis('off')

    axes[1, 1].imshow(canny_edges, cmap='gray')
    axes[1, 1].set_title("5. Canny Edges (NMS + Hysteresis)")
    axes[1, 1].axis('off')

    axes[1, 2].imshow(otsu_binary, cmap='gray')
    axes[1, 2].set_title(f"6. Otsu Binarization ($T^*={int(otsu_thresh_val)}$)")
    axes[1, 2].axis('off')

    plt.tight_layout()
    plt.savefig("cvip_pipeline_output.png", dpi=200)
    print("[SUCCESS] Pipeline figure saved as 'cvip_pipeline_output.png'")
    plt.show()

if __name__ == "__main__":
    process_desk_image()
