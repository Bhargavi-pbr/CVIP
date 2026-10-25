# Smart Desk Object Detection and Monitoring System
### Computer Vision and Image Processing (CVIP) Final Project

An intelligent, real-time Computer Vision and Workspace Analytics system designed to monitor study desks, optimize productivity, and prevent hardware accidents. Built using modern client-side Computer Vision (TensorFlow.js COCO-SSD with WebGL acceleration), classical digital image processing pipelines (Canny, Sobel, Otsu, Gaussian), and Python OpenCV / YOLOv8 suites.

---

## 📌 Project Overview
Modern workspaces are prone to clutter, study distractions (e.g. smartphones), poor ergonomic posture, and high-risk accidents such as liquid spills over expensive electronics (laptops, mechanical keyboards). 

This project delivers a dual-architecture solution:
1. **Interactive Full-Stack Web Application**: A web-based vision dashboard supporting live webcam monitoring, image/video upload, preset test scenarios, interactive CVIP pipeline breakdown, real-time charts, audio alarms, and PDF audit reports.
2. **Academic Python Suite**: Standalone OpenCV and Ultralytics YOLOv8 scripts ready for local workstation or Google Colab evaluation.

---

## 🚀 Key Features

| Feature | Description | CVIP Method / Formula |
| :--- | :--- | :--- |
| **Object Detection & Classification** | Detects laptops, books, smartphones, cups, mice, keyboards, scissors, and humans in real-time. | Single Shot MultiBox Detector (MobileNetV2 / YOLOv8) |
| **Spill Hazard Warning Engine** | Computes Euclidean distance between liquid containers (cup, bottle) and electronics (laptop, keyboard). Triggers audio-visual alarm if distance < 110px. | $d = \sqrt{(x_{\text{liq}} - x_{\text{tech}})^2 + (y_{\text{liq}} - y_{\text{tech}})^2}$ |
| **Desk Clutter Index (DCI)** | Computes real-time clutter rating ($0-100\%$, Clean / Moderate / Messy) using object counts, bounding box surface coverage, and edge density. | $\text{DCI} = w_1 \frac{N}{N_{\max}} + w_2 \frac{\text{Area}_{\text{occ}}}{\text{Area}_{\text{desk}}} + w_3 E_{\text{density}}$ |
| **Distraction & Study Focus Tracker** | Flags smartphone presence in active work zones, tracking focus score and distracted time. | Spatial intersection & classification tracking |
| **CVIP Pipeline Studio** | Interactive 8-step visualizer for Grayscale, Gaussian Blur, Sobel derivatives, Canny Edges, Otsu Binarization, and HSV masks. | Classical Image Processing convolution & morphology |
| **Ergonomics & Screen Distance** | Evaluates posture and leaning distance based on person bounding box aspect ratio and scale. | Geometric bounding box ratio analysis |
| **Audit Report & CSV Export** | Generates print/PDF-ready evaluation reports with annotated frame captures and downloadable CSV telemetry logs. | Automated DOM snapshot & CSV stream generation |

---

## 🧮 Mathematical Formulations

### 1. Luminance Grayscale Conversion (ITU-R BT.601)
$$Y = 0.299 \cdot R + 0.587 \cdot G + 0.114 \cdot B$$

### 2. 2D Gaussian Kernel Smoothing
$$G_\sigma(x, y) = \frac{1}{2\pi\sigma^2} \exp\left(-\frac{x^2 + y^2}{2\sigma^2}\right)$$

### 3. Spatial Gradient Magnitude (Sobel Operators)
$$|\nabla I| = \sqrt{G_x^2 + G_y^2}, \quad \theta = \arctan2(G_y, G_x)$$

### 4. Otsu's Optimal Between-Class Variance Threshold
$$T^* = \arg\max_T \sigma_B^2(T) = \arg\max_T \left[ w_0(T) w_1(T) (\mu_0(T) - \mu_1(T))^2 \right]$$

### 5. Intersection over Union (IoU)
$$\text{IoU}(B_{\text{pred}}, B_{\text{gt}}) = \frac{\text{Area}(B_{\text{pred}} \cap B_{\text{gt}})}{\text{Area}(B_{\text{pred}} \cup B_{\text{gt}})}$$

---

## 📂 Project Structure

```
CVIP/
├── index.html                     # Main interactive web application dashboard
├── css/
│   └── styles.css                 # Dark glassmorphism futuristic styling
├── js/
│   ├── app.js                     # Application controller, charts, and loop
│   ├── detector.js                # COCO-SSD detection & visual annotation engine
│   ├── imageProcessor.js          # Classical CVIP algorithms in pure JavaScript
│   ├── deskAnalytics.js           # DCI, Spill Hazard, and Focus scoring engine
│   ├── sampleScenarios.js         # Realistic synthetic desk test generators
│   └── audioAlert.js              # Web Audio API synthetic alarm & tone generator
├── server.js                      # Zero-dependency local Node.js HTTP server
├── start_website.bat              # 1-Click Windows Launcher
├── start_website.ps1              # 1-Click PowerShell Launcher
├── package.json                   # Project metadata
├── cvip_python_scripts/           # Academic Python CVIP Codebase
│   ├── smart_desk_yolo.py         # OpenCV + YOLOv8 real-time detection script
│   ├── image_processing_pipeline.py # Grayscale, Gaussian, Sobel, Canny, Otsu visualizer
│   ├── spill_proximity_checker.py # Euclidean proximity & hazard threshold tester
│   ├── Smart_Desk_CVIP_Colab.ipynb # Google Colab Ready Jupyter Notebook
│   └── requirements.txt           # Python library requirements
├── README.md                      # Comprehensive project documentation
└── VIVA_QUESTIONS.md              # Top 25 Viva Examination Questions & Answers
```

---

## 💻 Quick Start: Running the Website

### Option 1: 1-Click Launcher (Recommended for Windows)
Simply **double-click** `start_website.bat`.
- It automatically starts the local HTTP server and opens your default browser at `http://localhost:3000`.

### Option 2: Using Node.js
In your terminal, navigate to the project directory and run:
```bash
node server.js
```
Then open [http://localhost:3000](http://localhost:3000) in Chrome, Edge, or Firefox.

### Option 3: Direct Browser Launch
Double-click `index.html` to open it directly in any modern web browser.

---

## 🐍 Running the Python CVIP Scripts

### Local Workstation:
1. Navigate to the `cvip_python_scripts` directory:
   ```bash
   cd cvip_python_scripts
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the YOLOv8 Smart Desk Monitor:
   ```bash
   python smart_desk_yolo.py
   ```
4. Run the Image Processing Pipeline Visualizer:
   ```bash
   python image_processing_pipeline.py
   ```

### Google Colab:
1. Open [Google Colab](https://colab.research.google.com).
2. Upload `cvip_python_scripts/Smart_Desk_CVIP_Colab.ipynb`.
3. Select **Runtime > Run All** for single-click execution with free GPU!

---

## 🎓 Academic Evaluation & Defense
For viva examination and project defense questions, consult `VIVA_QUESTIONS.md`, which contains 25 detailed questions and answers covering Object Detection architectures, Canny edge detection, Otsu thresholding, IoU, and hazard proximity algorithms.
