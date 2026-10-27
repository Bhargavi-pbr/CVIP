# Smart Desk Object Detection and Monitoring System
### Computer Vision and Image Processing (CVIP) Final Project (Validated & Refined)

An intelligent, real-time Computer Vision and Workspace Analytics system designed to monitor study desks, optimize productivity, and prevent hardware accidents. Built using client-side Computer Vision (TensorFlow.js COCO-SSD with WebGL acceleration), classical digital image processing pipelines (Canny, Sobel, Otsu, Gaussian with edge-clamping), and Python OpenCV / YOLOv8 suites.

---

## 📌 Project Overview
Modern workspaces are prone to clutter, study distractions (smartphones placed in active work areas), poor screen proximity, and high-risk accidents such as liquid spills over electronics (laptops, keyboards). 

This project delivers a dual-architecture solution:
1. **Interactive Full-Stack Web Application**: A web-based vision dashboard supporting live webcam monitoring, image and video file upload with continuous frame detection, preset benchmark test scenarios, an interactive CVIP pipeline breakdown studio, telemetry charts, audio alarms with debounce cooldown, and PDF audit reports.
2. **Academic Python Suite**: Standalone OpenCV and Ultralytics YOLOv8 scripts ready for local workstation or Google Colab evaluation with identical formulas.

---

## 🎯 Verified Capabilities & Model Classes

> **Academic Transparency Note:**  
> The system utilizes standard **COCO dataset (80-class)** weights (COCO-SSD MobileNetV2 and YOLOv8n). Unverified claims of detecting custom stationery (such as notebooks, pens, or pencils) have been intentionally omitted as they are not part of standard COCO classes and would require custom annotated dataset training.

### Supported COCO Target Classes:
* **Study & Work Tools:** `laptop`, `keyboard`, `mouse`, `book`, `scissors`
* **Consumables / Spill Risks:** `cup`, `bottle`, `wine glass`, `bowl`
* **Distraction Hazards:** `cell phone`, `remote`
* **User Presence:** `person`

---

## 🚀 Key Features & Methodologies

| Feature | Description | CVIP Method / Formula |
| :--- | :--- | :--- |
| **Object Detection & Classification** | Real-time localization of verified COCO classes in webcam, uploaded images, and uploaded video streams. | Single Shot MultiBox Detector (MobileNetV2 / YOLOv8) |
| **Edge-to-Edge Spill Hazard Detector** | Computes true bounding box edge separation normalized by frame diagonal, preventing resolution bias and center-distance errors. | $d_{\text{edge}} = \sqrt{\Delta x^2 + \Delta y^2}, \quad d_{\text{norm}} = \frac{d_{\text{edge}}}{\sqrt{W^2 + H^2}}$ |
| **Standardized Desk Clutter Index (DCI)** | Project-defined heuristic score ($0-100\%$, Clean / Moderate / Messy) identical in JavaScript and Python. | $\text{DCI} = 0.35 \frac{N}{8} + 0.40 \frac{\text{Area}_{\text{occ}}}{0.75 \text{Area}_{\text{desk}}} + 0.25 E_{\text{density}}$ |
| **Phone-Based Distraction Estimator** | Spatial zoning check: flags when a smartphone intersects the defined Primary Work Zone during an active session. | 2D bounding box intersection with Work Zone |
| **User Screen Proximity Estimation** | Estimates whether user is sitting at normal distance or leaning too close to display using 2D box area/height occupancy. | Bounding box scale & aspect ratio proxy |
| **Border-Safe Gaussian Smoothing** | 5x5 kernel convolution with coordinate clamping (edge replication) to eliminate dark border artifacts. | $G_\sigma(x, y) * I(x, y)$ with $\text{clamp}(x, 0, W-1)$ |
| **Video File Frame Processor** | Loads MP4/WEBM video files, offering play/pause controls and continuous frame-by-frame object inference. | HTML5 Video + `requestAnimationFrame` inference loop |
| **Audit Report & CSV Export** | Generates printable PDF-ready evaluation reports with annotated frame captures and downloadable CSV telemetry logs. | Automated DOM snapshot & CSV stream generation |

---

## 🧮 Mathematical Formulations

### 1. Standardized Desk Clutter Index (DCI)
A project-defined heuristic index designed for relative workspace clutter assessment:
$$\text{DCI} = \min\left(100, \; 100 \times \left[ 0.35 \cdot \min\left(\frac{N}{8}, 1\right) + 0.40 \cdot \frac{\sum_{i=1}^N \text{Area}(B_i)}{0.75 \cdot \text{Area}_{\text{desk}}} + 0.25 \cdot E_{\text{density}} \right]\right)$$
* **$0 - 35\%$**: Clean
* **$36 - 65\%$**: Moderate
* **$66 - 100\%$**: High Clutter / Messy

### 2. Edge-to-Edge Normalized Spill Hazard Metric
Measures true separation between bounding box rectangles $A$ (liquid) and $B$ (tech):
$$\Delta x = \max\left(0, \; \max(x_{1A}, x_{1B}) - \min(x_{2A}, x_{2B})\right)$$
$$\Delta y = \max\left(0, \; \max(y_{1A}, y_{1B}) - \min(y_{2A}, y_{2B})\right)$$
$$d_{\text{edge}} = \sqrt{\Delta x^2 + \Delta y^2}, \quad d_{\text{norm}} = \frac{d_{\text{edge}}}{\sqrt{W^2 + H^2}}$$
* **Critical Hazard Alert:** $d_{\text{edge}} = 0$ (touching/intersecting) OR $d_{\text{norm}} < 0.05$ (within $5\%$ of frame diagonal).
* **Caution Warning:** $d_{\text{norm}} < 0.12$ (within $12\%$ of frame diagonal).
* **Safe:** $d_{\text{norm}} \ge 0.12$.

*(Note: Pixel distance is an image-plane proxy metric; physical metric distance in cm requires camera intrinsic calibration).*

### 3. Luminance Grayscale Conversion (ITU-R BT.601)
$$Y = 0.299 \cdot R + 0.587 \cdot G + 0.114 \cdot B$$

### 4. Gaussian Kernel Smoothing with Edge Replication
$$G_\sigma(x, y) = \frac{1}{2\pi\sigma^2} \exp\left(-\frac{x^2 + y^2}{2\sigma^2}\right)$$
Coordinates outside image boundaries $[0, W-1] \times [0, H-1]$ are clamped to the nearest edge pixel, eliminating artificial dark border artifacts.

---

## 📂 Project Structure

```
CVIP/
├── index.html                     # Main interactive web application dashboard
├── css/
│   └── styles.css                 # Dark glassmorphism futuristic styling
├── js/
│   ├── app.js                     # Application controller, video loop, charts
│   ├── detector.js                # COCO-SSD detection & visual annotation engine
│   ├── imageProcessor.js          # Canny, Sobel, Otsu, Gaussian with edge clamping
│   ├── deskAnalytics.js           # Standardized DCI, Edge Proximity, Distraction
│   ├── sampleScenarios.js         # Verified benchmark preset desk generators
│   └── audioAlert.js              # Web Audio API alarm with cooldown debounce
├── server.js                      # Zero-dependency local Node.js HTTP server
├── start_website.bat              # 1-Click Windows Launcher
├── start_website.ps1              # 1-Click PowerShell Launcher
├── package.json                   # Project metadata
├── cvip_python_scripts/           # Academic Python CVIP Codebase
│   ├── smart_desk_yolo.py         # OpenCV + YOLOv8 real-time detection script
│   ├── image_processing_pipeline.py # Classical CVIP Matplotlib visualizer
│   ├── spill_proximity_checker.py # Edge-to-edge proximity & hazard tester
│   ├── Smart_Desk_CVIP_Colab.ipynb # Google Colab Ready Jupyter Notebook
│   └── requirements.txt           # Python library requirements
├── README.md                      # Comprehensive project documentation
└── VIVA_QUESTIONS.md              # 25 Viva Examination Questions & Answers
```

---

## 💻 Quick Start: Running the Website

### Option 1: 1-Click Windows Launcher
Double-click **`start_website.bat`**. It starts the local HTTP server and automatically opens `http://localhost:3000` in your default browser.

### Option 2: Using Node.js
```bash
node server.js
```
Then visit [http://localhost:3000](http://localhost:3000).

### Option 3: Direct Browser Launch
Double-click `index.html` to open it directly in Chrome, Edge, or Firefox.

---

## 🐍 Running the Python CVIP Scripts

1. Navigate to the `cvip_python_scripts` directory:
   ```bash
   cd cvip_python_scripts
   pip install -r requirements.txt
   ```
2. Run the YOLOv8 Smart Desk Monitor:
   ```bash
   python smart_desk_yolo.py
   ```
3. Run the Image Processing Pipeline Visualizer:
   ```bash
   python image_processing_pipeline.py
   ```
4. Or open **`Smart_Desk_CVIP_Colab.ipynb`** in [Google Colab](https://colab.research.google.com) for 1-click execution with free GPU!
