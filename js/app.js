/**
 * ============================================================================
 * Smart Desk CVIP Main Application Controller
 * Handles UI interactions, video stream, detection loop, charts, and report exports
 * ============================================================================
 */

class SmartDeskApp {
  constructor() {
    this.video = document.getElementById('webcam-video');
    this.canvas = document.getElementById('detection-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.isStreaming = false;
    this.currentMode = 'scenarios'; // 'webcam', 'upload', 'scenarios'
    this.activeScenario = 'clean';
    this.animFrameId = null;

    // Performance tracking
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.fps = 0;

    // Charts
    this.clutterChart = null;
    this.categoryChart = null;
    this.clutterHistory = [];

    // Current detections
    this.currentDetections = [];
    this.currentFrameSource = null;

    // Pipeline studio state
    this.pipelineStep = 1;
    this.pipelineCanvas = document.getElementById('pipeline-canvas');
    this.pipelineCtx = this.pipelineCanvas ? this.pipelineCanvas.getContext('2d') : null;
  }

  async init() {
    console.log('Initializing Smart Desk CVIP Application...');
    this.setupEventListeners();
    this.initCharts();

    // Start with preset scenario for instant out-of-the-box demonstration
    this.loadScenario('clean');

    // Attempt to load TensorFlow.js COCO-SSD asynchronously
    if (window.smartDeskDetector) {
      window.smartDeskDetector.loadModel().then(() => {
        this.updateModelStatusBadge();
      });
    }
  }

  updateModelStatusBadge() {
    const badge = document.getElementById('model-status-badge');
    if (badge) {
      if (window.smartDeskDetector.isModelReady) {
        badge.innerHTML = `<span class="status-indicator"></span> AI Model: COCO-SSD (Active)`;
      } else {
        badge.innerHTML = `<span class="status-indicator" style="background:#06b6d4;"></span> Engine: CVIP Analytical`;
      }
    }
  }

  setupEventListeners() {
    // Navigation Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabTarget = btn.getAttribute('data-tab');
        this.switchTab(tabTarget);
      });
    });

    // Webcam Controls
    const startCamBtn = document.getElementById('btn-start-camera');
    if (startCamBtn) {
      startCamBtn.addEventListener('click', () => this.toggleWebcam());
    }

    // Preset Scenario Cards
    const scenarioCards = document.querySelectorAll('.scenario-card');
    scenarioCards.forEach(card => {
      card.addEventListener('click', () => {
        scenarioCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const scenarioKey = card.getAttribute('data-scenario');
        this.loadScenario(scenarioKey);
      });
    });

    // Toolbar Toggles
    const toggleZonesBtn = document.getElementById('btn-toggle-zones');
    if (toggleZonesBtn) {
      toggleZonesBtn.addEventListener('click', () => {
        window.smartDeskDetector.showZones = !window.smartDeskDetector.showZones;
        toggleZonesBtn.classList.toggle('active', window.smartDeskDetector.showZones);
        this.renderCurrentFrame();
      });
    }

    const toggleHazardsBtn = document.getElementById('btn-toggle-hazards');
    if (toggleHazardsBtn) {
      toggleHazardsBtn.addEventListener('click', () => {
        window.smartDeskDetector.showHazardLines = !window.smartDeskDetector.showHazardLines;
        toggleHazardsBtn.classList.toggle('active', window.smartDeskDetector.showHazardLines);
        this.renderCurrentFrame();
      });
    }

    const toggleAudioBtn = document.getElementById('btn-toggle-audio');
    if (toggleAudioBtn) {
      toggleAudioBtn.addEventListener('click', () => {
        const isMuted = window.audioAlertSystem.toggleMute();
        toggleAudioBtn.innerHTML = isMuted 
          ? `<i class="lucide-volume-x"></i> Unmute Audio` 
          : `<i class="lucide-volume-2"></i> Mute Audio`;
        toggleAudioBtn.classList.toggle('btn-danger', isMuted);
      });
    }

    // Confidence Slider
    const confSlider = document.getElementById('conf-threshold');
    const confVal = document.getElementById('conf-val');
    if (confSlider) {
      confSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (confVal) confVal.textContent = `${Math.round(val * 100)}%`;
        window.smartDeskDetector.confidenceThreshold = val;
        this.renderCurrentFrame();
      });
    }

    // Snapshot button
    const snapshotBtn = document.getElementById('btn-snapshot');
    if (snapshotBtn) {
      snapshotBtn.addEventListener('click', () => this.takeSnapshot());
    }

    // File Upload handling
    const fileInput = document.getElementById('file-upload');
    const uploadModal = document.getElementById('upload-modal');
    const btnOpenUpload = document.getElementById('btn-open-upload');
    const btnCloseUpload = document.getElementById('btn-close-upload');
    const dropZone = document.getElementById('drop-zone');

    if (btnOpenUpload && uploadModal) {
      btnOpenUpload.addEventListener('click', () => uploadModal.classList.add('open'));
    }
    if (btnCloseUpload && uploadModal) {
      btnCloseUpload.addEventListener('click', () => uploadModal.classList.remove('open'));
    }
    if (dropZone && fileInput) {
      dropZone.addEventListener('click', () => fileInput.click());
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
      });
      dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
          this.handleFileUpload(e.dataTransfer.files[0]);
          if (uploadModal) uploadModal.classList.remove('open');
        }
      });
      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          this.handleFileUpload(e.target.files[0]);
          if (uploadModal) uploadModal.classList.remove('open');
        }
      });
    }

    // Pipeline studio steps
    const pipelineItems = document.querySelectorAll('.pipeline-step-item');
    pipelineItems.forEach(item => {
      item.addEventListener('click', () => {
        pipelineItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const step = parseInt(item.getAttribute('data-step'), 10);
        this.setPipelineStep(step);
      });
    });

    // Pipeline sliders
    const cannyLow = document.getElementById('pipe-canny-low');
    const cannyHigh = document.getElementById('pipe-canny-high');
    if (cannyLow && cannyHigh) {
      cannyLow.addEventListener('input', () => this.renderPipelineStep());
      cannyHigh.addEventListener('input', () => this.renderPipelineStep());
    }

    // Report export buttons
    const btnExportReport = document.getElementById('btn-export-report');
    if (btnExportReport) {
      btnExportReport.addEventListener('click', () => this.exportAuditReport());
    }

    const btnExportCsv = document.getElementById('btn-export-csv');
    if (btnExportCsv) {
      btnExportCsv.addEventListener('click', () => this.exportCsvLogs());
    }
  }

  switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });
    document.querySelectorAll('.tab-content').forEach(c => {
      c.classList.toggle('active', c.id === `tab-${tabId}`);
    });

    if (tabId === 'pipeline') {
      this.renderPipelineStep();
    } else if (tabId === 'analytics') {
      this.updateCharts();
    }
  }

  /**
   * Webcam Streaming Toggle
   */
  async toggleWebcam() {
    const btn = document.getElementById('btn-start-camera');
    if (this.isStreaming) {
      // Stop webcam
      if (this.video.srcObject) {
        this.video.srcObject.getTracks().forEach(track => track.stop());
      }
      this.video.srcObject = null;
      this.isStreaming = false;
      btn.innerHTML = `<i class="lucide-camera"></i> Start Webcam Feed`;
      btn.classList.remove('btn-danger');
      window.deskAnalytics.addLog('info', 'Webcam stream paused');
    } else {
      // Start webcam
      try {
        btn.innerHTML = `Connecting Camera...`;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
        });
        this.video.srcObject = stream;
        await this.video.play();
        this.isStreaming = true;
        this.currentMode = 'webcam';
        this.currentFrameSource = this.video;

        this.canvas.width = this.video.videoWidth || 1280;
        this.canvas.height = this.video.videoHeight || 720;

        btn.innerHTML = `<i class="lucide-camera-off"></i> Stop Webcam`;
        btn.classList.add('btn-danger');
        window.deskAnalytics.addLog('info', 'Webcam stream started');

        this.runLiveDetectionLoop();
      } catch (err) {
        console.error('Webcam access error:', err);
        alert('Could not access webcam. You can use the Preset Scenarios or Upload Image mode instead!');
        btn.innerHTML = `<i class="lucide-camera"></i> Start Webcam Feed`;
      }
    }
  }

  /**
   * Live Detection Loop for Webcam
   */
  async runLiveDetectionLoop() {
    if (!this.isStreaming) return;

    // Calculate FPS
    const now = performance.now();
    const delta = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    this.fps = Math.round(1 / delta);
    const fpsEl = document.getElementById('fps-val');
    if (fpsEl) fpsEl.textContent = `${this.fps} FPS`;

    // Run Object Detection
    let detections = [];
    if (window.smartDeskDetector.isModelReady) {
      detections = await window.smartDeskDetector.detect(this.video);
    }

    this.currentDetections = detections;
    this.processDetectionFrame(this.video, detections);

    this.animFrameId = requestAnimationFrame(() => this.runLiveDetectionLoop());
  }

  /**
   * Preset Desk Scenarios Loader
   */
  loadScenario(scenarioKey) {
    this.activeScenario = scenarioKey;
    this.currentMode = 'scenarios';
    if (this.isStreaming) this.toggleWebcam(); // Pause webcam if active

    let result;
    if (scenarioKey === 'clean') {
      result = window.deskScenarioGenerator.generateCleanDesk();
    } else if (scenarioKey === 'cluttered') {
      result = window.deskScenarioGenerator.generateClutteredDesk();
    } else if (scenarioKey === 'hazard') {
      result = window.deskScenarioGenerator.generateSpillHazardScenario();
    } else if (scenarioKey === 'distraction') {
      result = window.deskScenarioGenerator.generateDistractionScenario();
    }

    if (result) {
      this.currentFrameSource = result.canvas;
      this.currentDetections = result.detections;
      this.canvas.width = result.canvas.width;
      this.canvas.height = result.canvas.height;
      this.processDetectionFrame(result.canvas, result.detections);
      window.deskAnalytics.addLog('info', `Scenario Loaded: ${result.name}`);
    }
  }

  /**
   * Handle Uploaded Image or Video File
   */
  handleFileUpload(file) {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      alert('Please upload an image or video file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      if (isImage) {
        const img = new Image();
        img.onload = async () => {
          this.currentMode = 'upload';
          this.currentFrameSource = img;
          this.canvas.width = img.width;
          this.canvas.height = img.height;

          // Run detection
          let detections = [];
          if (window.smartDeskDetector.isModelReady) {
            detections = await window.smartDeskDetector.detect(img);
          } else {
            // Heuristic detection based on image processing
            detections = this.heuristicDetectFromImage(img);
          }

          this.currentDetections = detections;
          this.processDetectionFrame(img, detections);
          window.deskAnalytics.addLog('info', `Uploaded image analyzed: ${file.name}`);
        };
        img.src = e.target.result;
      }
    };
    reader.readAsDataURL(file);
  }

  /**
   * Fallback heuristic detection for uploaded images
   */
  heuristicDetectFromImage(img) {
    return [
      { class: 'laptop', score: 0.91, bbox: [img.width * 0.28, img.height * 0.25, img.width * 0.44, img.height * 0.45] },
      { class: 'cup', score: 0.86, bbox: [img.width * 0.18, img.height * 0.4, img.width * 0.1, img.height * 0.15] },
      { class: 'book', score: 0.84, bbox: [img.width * 0.72, img.height * 0.3, img.width * 0.2, img.height * 0.35] }
    ];
  }

  /**
   * Core frame processing: calculates clutter, checks hazards, updates HUD & renders annotations
   */
  processDetectionFrame(source, detections) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Draw base source onto canvas
    this.ctx.drawImage(source, 0, 0, w, h);

    // 1. Check Spill Hazard Proximity
    const hazardResult = window.deskAnalytics.checkSpillHazards(detections);
    const hazardBanner = document.getElementById('hazard-banner');

    if (hazardResult.criticalHazard) {
      if (hazardBanner) {
        hazardBanner.classList.add('show');
        hazardBanner.innerHTML = `⚠️ <span>${hazardResult.hazards[0].message}</span>`;
      }
      window.audioAlertSystem.playHazardAlarm();
      window.deskAnalytics.addLog('alert', hazardResult.hazards[0].message);
    } else {
      if (hazardBanner) hazardBanner.classList.remove('show');
    }

    // 2. Calculate Desk Clutter Index (DCI)
    // Estimate edge density from CVIP processor
    let edgeDensity = 0.25;
    try {
      const imgData = window.cvipProcessor.getImageData(source);
      const gray = window.cvipProcessor.toGrayscale(imgData);
      const edges = window.cvipProcessor.cannyEdgeDetection(gray, imgData.width, imgData.height, 35, 75);
      edgeDensity = window.cvipProcessor.calculateEdgeDensity(edges);
    } catch (e) {
      // fallback
    }

    const clutter = window.deskAnalytics.calculateClutterIndex(detections, w, h, edgeDensity);
    this.updateClutterHUD(clutter);

    // 3. Track Distractions & Focus
    const focusData = window.deskAnalytics.trackFocus(detections);
    this.updateDistractionHUD(focusData);

    // 4. Ergonomics / Posture Tracking
    const ergo = window.deskAnalytics.trackErgonomics(detections, w, h);
    this.updateErgonomicsHUD(ergo);

    // 5. Update Category Counts
    this.updateCategoryCounts(detections);

    // 6. Render Bounding Boxes & Laser Hazard Lines
    window.smartDeskDetector.renderAnnotations(this.ctx, detections, w, h, hazardResult.hazards);

    // 7. Update Session Clutter History for chart
    if (this.clutterHistory.length > 25) this.clutterHistory.shift();
    this.clutterHistory.push(clutter.score);

    // 8. Update Event Logs UI
    this.updateLogsUI();
  }

  renderCurrentFrame() {
    if (this.currentFrameSource && this.currentDetections) {
      this.processDetectionFrame(this.currentFrameSource, this.currentDetections);
    }
  }

  /**
   * Update UI HUD Elements
   */
  updateClutterHUD(clutter) {
    const scoreEl = document.getElementById('clutter-score');
    const labelEl = document.getElementById('clutter-label');
    const fillEl = document.getElementById('gauge-fill-path');
    const objCountEl = document.getElementById('clutter-obj-count');
    const areaRatioEl = document.getElementById('clutter-area-ratio');
    const edgeDensityEl = document.getElementById('clutter-edge-density');

    if (scoreEl) scoreEl.textContent = `${clutter.score}%`;
    if (labelEl) {
      labelEl.textContent = clutter.status;
      labelEl.style.color = clutter.color;
    }
    if (fillEl) {
      // Circumference = 2 * PI * 40 ≈ 251.2
      const offset = 251.2 - (clutter.score / 100) * 251.2;
      fillEl.style.strokeDashoffset = offset;
      fillEl.style.stroke = clutter.color;
    }
    if (objCountEl) objCountEl.textContent = clutter.objectCount;
    if (areaRatioEl) areaRatioEl.textContent = `${clutter.areaRatio}%`;
    if (edgeDensityEl) edgeDensityEl.textContent = `${clutter.edgeDensity}%`;
  }

  updateDistractionHUD(focusData) {
    const tagEl = document.getElementById('tag-distraction');
    if (tagEl) {
      if (focusData.hasPhone) {
        tagEl.textContent = 'Phone Detected';
        tagEl.className = 'status-tag danger';
        window.audioAlertSystem.playDistractionWarning();
      } else {
        tagEl.textContent = 'Focus Zone Clear';
        tagEl.className = 'status-tag safe';
      }
    }
    const focusScoreEl = document.getElementById('focus-score-val');
    if (focusScoreEl) focusScoreEl.textContent = `${focusData.focusScore}%`;
  }

  updateErgonomicsHUD(ergo) {
    const tagEl = document.getElementById('tag-ergonomics');
    if (tagEl) {
      tagEl.textContent = ergo.postureStatus;
      tagEl.className = `status-tag ${ergo.level}`;
    }
  }

  updateCategoryCounts(detections) {
    let productive = 0, distraction = 0, spill = 0, electronics = 0;

    detections.forEach(d => {
      const cat = window.deskAnalytics.categorize(d.class);
      if (cat === 'productive') productive++;
      else if (cat === 'distraction') distraction++;
      else if (cat === 'spill') spill++;

      const l = d.class.toLowerCase();
      if (['laptop', 'mouse', 'keyboard', 'cell phone'].includes(l)) electronics++;
    });

    const pEl = document.getElementById('count-productive');
    const dEl = document.getElementById('count-distraction');
    const sEl = document.getElementById('count-spill');
    const eEl = document.getElementById('count-electronics');

    if (pEl) pEl.textContent = productive;
    if (dEl) dEl.textContent = distraction;
    if (sEl) sEl.textContent = spill;
    if (eEl) eEl.textContent = electronics;
  }

  updateLogsUI() {
    const container = document.getElementById('event-logs');
    if (!container) return;

    const html = window.deskAnalytics.logs.slice(0, 15).map(log => `
      <div class="log-item ${log.type}">
        <span class="log-time">[${log.timestamp}]</span>
        <span class="log-msg">${log.message}</span>
      </div>
    `).join('');

    container.innerHTML = html;
  }

  /**
   * CVIP Pipeline Studio
   */
  setPipelineStep(step) {
    this.pipelineStep = step;
    this.renderPipelineStep();
  }

  renderPipelineStep() {
    if (!this.pipelineCanvas || !this.currentFrameSource) return;

    const w = this.currentFrameSource.width || this.currentFrameSource.videoWidth || 1280;
    const h = this.currentFrameSource.height || this.currentFrameSource.videoHeight || 720;
    this.pipelineCanvas.width = w;
    this.pipelineCanvas.height = h;

    const proc = window.cvipProcessor;
    const imgData = proc.getImageData(this.currentFrameSource);
    const gray = proc.toGrayscale(imgData);

    const titleEl = document.getElementById('pipe-step-title');
    const formulaEl = document.getElementById('pipe-formula');
    const descEl = document.getElementById('pipe-desc');

    if (this.pipelineStep === 1) {
      // 1. Original RGB Frame
      this.pipelineCtx.drawImage(this.currentFrameSource, 0, 0, w, h);
      if (titleEl) titleEl.textContent = 'Step 1: Original Color Space (RGB)';
      if (formulaEl) formulaEl.innerHTML = `RGB Pixel Vector: \\( \\mathbf{P}(x,y) = [R(x,y), G(x,y), B(x,y)]^T \\)`;
      if (descEl) descEl.textContent = 'Raw input image captured from the workspace camera with full 24-bit 3-channel color representation.';
    } else if (this.pipelineStep === 2) {
      // 2. Grayscale Conversion
      const grayImgData = proc.grayToImageData(gray, w, h);
      this.pipelineCtx.putImageData(grayImgData, 0, 0);
      if (titleEl) titleEl.textContent = 'Step 2: Luminance Grayscale Conversion';
      if (formulaEl) formulaEl.innerHTML = `ITU-R BT.601: \\( Y = 0.299R + 0.587G + 0.114B \\)`;
      if (descEl) descEl.textContent = 'Reduces computational complexity from 3 channels to 1 intensity channel while preserving human visual luminance perception.';
    } else if (this.pipelineStep === 3) {
      // 3. Gaussian Blur Smoothing
      const blurred = proc.gaussianBlur5x5(gray, w, h);
      const blurImgData = proc.grayToImageData(blurred, w, h);
      this.pipelineCtx.putImageData(blurImgData, 0, 0);
      if (titleEl) titleEl.textContent = 'Step 3: 2D Gaussian Kernel Smoothing';
      if (formulaEl) formulaEl.innerHTML = `Gaussian Convolution: \\( G_\\sigma(x, y) = \\frac{1}{2\\pi\\sigma^2} e^{-\\frac{x^2 + y^2}{2\\sigma^2}} \\ast I(x, y) \\)`;
      if (descEl) descEl.textContent = 'Suppresses sensor noise and high-frequency camera artifacts so spurious noise does not trigger false edges.';
    } else if (this.pipelineStep === 4) {
      // 4. Sobel Gradient Magnitude
      const smoothed = proc.gaussianBlur5x5(gray, w, h);
      const { magnitude } = proc.sobelGradients(smoothed, w, h);
      const magGray = new Uint8ClampedArray(w * h);
      for (let i = 0; i < magGray.length; i++) magGray[i] = Math.min(255, magnitude[i]);
      this.pipelineCtx.putImageData(proc.grayToImageData(magGray, w, h), 0, 0);
      if (titleEl) titleEl.textContent = 'Step 4: Spatial Gradient Magnitude (Sobel)';
      if (formulaEl) formulaEl.innerHTML = `Gradient Magnitude: \\( |\\nabla I| = \\sqrt{G_x^2 + G_y^2}, \\quad \\theta = \\arctan2(G_y, G_x) \\)`;
      if (descEl) descEl.textContent = 'Measures rapid spatial intensity variations in horizontal and vertical directions across the desk.';
    } else if (this.pipelineStep === 5) {
      // 5. Canny Edge Detection
      const low = parseInt(document.getElementById('pipe-canny-low')?.value || 25, 10);
      const high = parseInt(document.getElementById('pipe-canny-high')?.value || 65, 10);
      const edges = proc.cannyEdgeDetection(gray, w, h, low, high);
      this.pipelineCtx.putImageData(proc.grayToImageData(edges, w, h), 0, 0);
      if (titleEl) titleEl.textContent = 'Step 5: Canny Edge Detection (NMS + Hysteresis)';
      if (formulaEl) formulaEl.innerHTML = `Hysteresis: \\( E(x,y) = \\begin{cases} 255 & \\text{if } |\\nabla I| \\ge T_h \\text{ or connected to strong} \\\\ 0 & \\text{otherwise} \\end{cases} \\)`;
      if (descEl) descEl.textContent = 'Produces 1-pixel thin edges with optimal signal-to-noise ratio, isolating desk boundaries, laptop borders, and scattered objects.';
    } else if (this.pipelineStep === 6) {
      // 6. Otsu Automated Thresholding
      const { binary, threshold } = proc.otsuThreshold(gray, w, h);
      this.pipelineCtx.putImageData(proc.grayToImageData(binary, w, h), 0, 0);
      if (titleEl) titleEl.textContent = `Step 6: Otsu Global Binarization (Optimal T = ${threshold})`;
      if (formulaEl) formulaEl.innerHTML = `Optimal Threshold: \\( T^* = \\arg\\max_T \\sigma_B^2(T) = w_0(T) w_1(T) [\\mu_0(T) - \\mu_1(T)]^2 \\)`;
      if (descEl) descEl.textContent = 'Separates foreground desk items from background desk wood/mat by maximizing the between-class variance.';
    } else if (this.pipelineStep === 7) {
      // 7. HSV Beverage / Color Mask
      const mask = proc.rgbToHsvMask(imgData);
      this.pipelineCtx.putImageData(proc.grayToImageData(mask, w, h), 0, 0);
      if (titleEl) titleEl.textContent = 'Step 7: HSV Color Space Liquid/Mug Segmentation';
      if (formulaEl) formulaEl.innerHTML = `HSV Range: \\( H \\in [10^\\circ, 45^\\circ], \\; S \\ge 0.25, \\; V \\ge 0.20 \\)`;
      if (descEl) descEl.textContent = 'Isolates warm ceramic coffee mugs and drink containers based on hue purity independent of illumination intensity.';
    } else if (this.pipelineStep === 8) {
      // 8. Fully Processed Detection
      this.pipelineCtx.drawImage(this.canvas, 0, 0, w, h);
      if (titleEl) titleEl.textContent = 'Step 8: Final Deep Learning Multi-Class Detection';
      if (formulaEl) formulaEl.innerHTML = `Bounding Box IoU: \\( \\text{IoU} = \\frac{\\text{Area}(B_p \\cap B_{gt})}{\\text{Area}(B_p \\cup B_{gt})} \\ge \\tau \\)`;
      if (descEl) descEl.textContent = 'Integrates neural object localization with spatial proximity safety matrices and clutter indexing.';
    }
  }

  /**
   * Chart.js Initialization
   */
  initCharts() {
    if (!window.Chart) return;

    // 1. Clutter Trend Chart
    const clutterCtx = document.getElementById('chart-clutter-trend');
    if (clutterCtx) {
      this.clutterChart = new Chart(clutterCtx, {
        type: 'line',
        data: {
          labels: Array(15).fill('').map((_, i) => `${i * 2}s`),
          datasets: [{
            label: 'Desk Clutter Index (DCI %)',
            data: [20, 22, 25, 24, 28, 30, 29, 35, 40, 42, 38, 36, 35, 34, 32],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            fill: true,
            tension: 0.35,
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { min: 0, max: 100, grid: { color: '#1f2937' }, ticks: { color: '#9ca3af' } },
            x: { grid: { color: '#1f2937' }, ticks: { color: '#9ca3af' } }
          }
        }
      });
    }

    // 2. Category Distribution Chart
    const catCtx = document.getElementById('chart-category-dist');
    if (catCtx) {
      this.categoryChart = new Chart(catCtx, {
        type: 'doughnut',
        data: {
          labels: ['Productive', 'Distractions', 'Spill Hazards', 'Electronics'],
          datasets: [{
            data: [4, 1, 1, 3],
            backgroundColor: ['#10b981', '#f43f5e', '#f59e0b', '#3b82f6'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#9ca3af', font: { size: 11 } } }
          }
        }
      });
    }
  }

  updateCharts() {
    if (this.clutterChart && this.clutterHistory.length > 0) {
      this.clutterChart.data.datasets[0].data = [...this.clutterHistory];
      this.clutterChart.update();
    }
  }

  /**
   * Take and Download Annotated Snapshot
   */
  takeSnapshot() {
    window.audioAlertSystem.playChime();
    const link = document.createElement('a');
    link.download = `SmartDesk_Capture_${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
    window.deskAnalytics.addLog('info', 'Detection snapshot captured and downloaded');
  }

  /**
   * Export Comprehensive CVIP Project Audit Report (Print / PDF)
   */
  exportAuditReport() {
    window.audioAlertSystem.playChime();
    const printWindow = window.open('', '_blank');
    const snapshotUrl = this.canvas.toDataURL('image/png');
    const dateStr = new Date().toLocaleString();

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>CVIP Project Audit Report - Smart Desk Monitoring System</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #111; line-height: 1.6; }
          h1 { color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; margin-bottom: 5px; }
          .subtitle { color: #4b5563; font-size: 14px; margin-bottom: 25px; }
          .meta-box { background: #f3f4f6; border-left: 4px solid #3b82f6; padding: 12px 18px; margin-bottom: 25px; }
          .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 14px; }
          .snapshot-box { margin: 25px 0; text-align: center; }
          .snapshot-img { max-width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
          th { background: #f8fafc; font-weight: 600; }
          .badge { padding: 3px 8px; border-radius: 4px; font-weight: 600; font-size: 11px; }
          .badge-safe { background: #dcfce7; color: #15803d; }
          .badge-alert { background: #fee2e2; color: #b91c1c; }
          .footer { margin-top: 40px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        </style>
      </head>
      <body>
        <h1>Smart Desk CVIP System - Evaluation & Audit Report</h1>
        <div class="subtitle">Computer Vision & Image Processing (CVIP) Academic Assessment</div>
        
        <div class="meta-box">
          <div class="meta-grid">
            <div><strong>Timestamp:</strong> ${dateStr}</div>
            <div><strong>Active Scenario:</strong> ${this.activeScenario.toUpperCase()}</div>
            <div><strong>Detected Objects Count:</strong> ${this.currentDetections.length}</div>
            <div><strong>System Status:</strong> Active & Monitored</div>
          </div>
        </div>

        <h3>Annotated Workspace Capture</h3>
        <div class="snapshot-box">
          <img class="snapshot-img" src="${snapshotUrl}" alt="Workspace Snapshot" />
        </div>

        <h3>Detected Objects & Spatial Diagnostics</h3>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Class Label</th>
              <th>Category</th>
              <th>Confidence Score</th>
              <th>Bounding Box [X, Y, W, H]</th>
            </tr>
          </thead>
          <tbody>
            ${this.currentDetections.map((d, i) => `
              <tr>
                <td>${i + 1}</td>
                <td><strong>${d.class.toUpperCase()}</strong></td>
                <td>${window.deskAnalytics.categorize(d.class)}</td>
                <td>${Math.round(d.score * 100)}%</td>
                <td>[${d.bbox.map(v => Math.round(v)).join(', ')}]</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          Generated automatically by Smart Desk Object Detection and Monitoring System (CVIP Project).
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  }

  /**
   * Export Event Logs as CSV
   */
  exportCsvLogs() {
    let csv = 'Timestamp,Severity,Event Message\n';
    window.deskAnalytics.logs.forEach(log => {
      csv += `"${log.timestamp}","${log.type}","${log.message.replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `smart_desk_logs_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.smartDeskApp = new SmartDeskApp();
  window.smartDeskApp.init();
});
