/**
 * ============================================================================
 * Object Detection Engine
 * Integrates TensorFlow.js COCO-SSD model with robust status handling
 * Renders verified COCO bounding boxes, edge-to-edge hazard proximity lines, and zoning grids
 * Note: Never calls clearRect on background, ensuring custom images, videos, and preset desks stay fully visible!
 * ============================================================================
 */

class SmartDeskDetector {
  constructor() {
    this.model = null;
    this.isLoading = false;
    this.isModelReady = false;
    this.loadError = null;
    this.confidenceThreshold = 0.50;
    this.showZones = true;
    this.showHazardLines = true;

    // Verified supported classes in standard COCO-SSD MobileNetV2
    this.supportedClasses = new Set([
      'person', 'laptop', 'mouse', 'keyboard', 'cell phone', 
      'book', 'bottle', 'cup', 'wine glass', 'bowl', 'scissors'
    ]);
  }

  // Load COCO-SSD model
  async loadModel() {
    if (this.model || this.isLoading) return;
    this.isLoading = true;
    this.loadError = null;

    try {
      if (window.cocoSsd) {
        console.log('Loading TensorFlow.js COCO-SSD model...');
        this.model = await window.cocoSsd.load({ base: 'mobilenet_v2' });
        this.isModelReady = true;
        console.log('COCO-SSD model loaded successfully!');
        if (window.deskAnalytics) {
          window.deskAnalytics.addLog('info', 'Deep Learning Model (COCO-SSD MobileNetV2) loaded successfully');
        }
      } else {
        throw new Error('COCO-SSD library not detected in window scope.');
      }
    } catch (err) {
      console.warn('COCO-SSD Model Load Notice:', err);
      this.isModelReady = false;
      this.loadError = err.message || 'Failed to load model from CDN';
      if (window.deskAnalytics) {
        window.deskAnalytics.addLog('warn', 'AI model loading deferred. Preset benchmarks remain active.');
      }
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Run detection on image or video frame
   */
  async detect(sourceElement) {
    if (this.model && this.isModelReady) {
      try {
        const rawDetections = await this.model.detect(sourceElement);
        return rawDetections.filter(d => 
          d.score >= this.confidenceThreshold && 
          this.supportedClasses.has(d.class.toLowerCase())
        );
      } catch (e) {
        console.error('Detection frame error:', e);
      }
    }
    return [];
  }

  /**
   * Render Bounding Boxes, Proximity Hazard Vectors, and Zones on Canvas
   * Note: Does NOT call clearRect, preserving the background image/video/preset desk!
   */
  renderAnnotations(ctx, detections, width, height, hazards = []) {
    const scaleFactor = Math.max(1, Math.min(width, height) / 720);

    // 1. Draw Desk Zones (if enabled)
    if (this.showZones) {
      this.drawDeskZones(ctx, width, height, scaleFactor);
    }

    // 2. Draw Spill Hazard Proximity Lines
    if (this.showHazardLines && hazards.length > 0) {
      this.drawHazardLines(ctx, hazards, scaleFactor);
    }

    // 3. Draw Bounding Boxes
    detections.forEach(det => {
      this.drawBoundingBox(ctx, det, scaleFactor);
    });
  }

  // Render Virtual Desk Zones
  drawDeskZones(ctx, width, height, scaleFactor = 1) {
    ctx.save();
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)';
    ctx.lineWidth = 2 * scaleFactor;
    ctx.setLineDash([6 * scaleFactor, 6 * scaleFactor]);
    ctx.fillStyle = 'rgba(6, 182, 212, 0.04)';
    const wz = { x: width * 0.2, y: height * 0.25, w: width * 0.6, h: height * 0.65 };
    ctx.fillRect(wz.x, wz.y, wz.w, wz.h);
    ctx.strokeRect(wz.x, wz.y, wz.w, wz.h);

    ctx.fillStyle = 'rgba(6, 182, 212, 0.85)';
    ctx.font = `bold ${Math.round(11 * scaleFactor)}px sans-serif`;
    ctx.fillText('PRIMARY WORK ZONE', wz.x + 10 * scaleFactor, wz.y + 18 * scaleFactor);

    // Safe Beverage Zone (Right Edge)
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
    ctx.fillStyle = 'rgba(16, 185, 129, 0.04)';
    const bz = { x: width * 0.82, y: height * 0.12, w: width * 0.15, h: height * 0.75 };
    ctx.fillRect(bz.x, bz.y, bz.w, bz.h);
    ctx.strokeRect(bz.x, bz.y, bz.w, bz.h);

    ctx.fillStyle = 'rgba(16, 185, 129, 0.85)';
    ctx.fillText('SAFE DRINK ZONE', bz.x + 8 * scaleFactor, bz.y + 18 * scaleFactor);
    ctx.restore();
  }

  // Render Laser Proximity Hazard Lines (Edge-to-Edge Distance)
  drawHazardLines(ctx, hazards, scaleFactor = 1) {
    ctx.save();
    hazards.forEach(h => {
      const isCritical = h.level === 'CRITICAL';
      ctx.strokeStyle = isCritical ? 'rgba(244, 63, 94, 0.95)' : 'rgba(245, 158, 11, 0.85)';
      ctx.lineWidth = (isCritical ? 3 : 2) * scaleFactor;
      ctx.setLineDash(isCritical ? [] : [5 * scaleFactor, 5 * scaleFactor]);

      // Connect liquid center to tech center
      ctx.beginPath();
      ctx.moveTo(h.liquid.center.x, h.liquid.center.y);
      ctx.lineTo(h.tech.center.x, h.tech.center.y);
      ctx.stroke();

      // Midpoint tag showing true Edge-to-Edge separation
      const midX = (h.liquid.center.x + h.tech.center.x) / 2;
      const midY = (h.liquid.center.y + h.tech.center.y) / 2;

      const badgeText = h.edgeDist === 0 ? 'OVERLAP' : `${h.edgeDist}px edge`;
      const fontSize = Math.round(10 * scaleFactor);
      ctx.font = `bold ${fontSize}px sans-serif`;
      const textWidth = ctx.measureText(badgeText).width;
      const pillW = textWidth + 14 * scaleFactor;
      const pillH = 20 * scaleFactor;

      ctx.fillStyle = isCritical ? '#f43f5e' : '#f59e0b';
      ctx.beginPath();
      ctx.roundRect(midX - pillW / 2, midY - pillH / 2, pillW, pillH, 10 * scaleFactor);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, midX, midY);

      // Warning circle around tech if critical
      if (isCritical) {
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.6)';
        ctx.lineWidth = 2 * scaleFactor;
        ctx.beginPath();
        const [tx, ty, tw, th] = h.tech.bbox;
        ctx.arc(tx + tw / 2, ty + th / 2, Math.max(tw, th) * 0.65, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  // Render Single Bounding Box with Badge
  drawBoundingBox(ctx, det, scaleFactor = 1) {
    const [x, y, w, h] = det.bbox;
    const cat = window.deskAnalytics ? window.deskAnalytics.categorize(det.class) : 'productive';

    let strokeColor = '#3b82f6';
    let bgColor = 'rgba(59, 130, 246, 0.15)';

    if (cat === 'productive') {
      strokeColor = '#10b981';
      bgColor = 'rgba(16, 185, 129, 0.12)';
    } else if (cat === 'distraction') {
      strokeColor = '#f43f5e';
      bgColor = 'rgba(244, 63, 94, 0.18)';
    } else if (cat === 'spill') {
      strokeColor = '#f59e0b';
      bgColor = 'rgba(245, 158, 11, 0.16)';
    } else if (cat === 'user') {
      strokeColor = '#06b6d4';
      bgColor = 'rgba(6, 182, 212, 0.1)';
    }

    ctx.save();
    // Bounding Box Rect
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = Math.max(2, 2.5 * scaleFactor);
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6 * scaleFactor);
    ctx.fill();
    ctx.stroke();

    // Corner brackets
    const bracketLen = Math.min(16 * scaleFactor, Math.min(w, h) * 0.3);
    ctx.lineWidth = Math.max(3, 3.5 * scaleFactor);
    // Top-left
    ctx.beginPath();
    ctx.moveTo(x, y + bracketLen);
    ctx.lineTo(x, y);
    ctx.lineTo(x + bracketLen, y);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(x + w - bracketLen, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + bracketLen);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(x, y + h - bracketLen);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x + bracketLen, y + h);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(x + w - bracketLen, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w, y + h - bracketLen);
    ctx.stroke();

    // Label Badge
    const labelText = `${det.class.toUpperCase()} ${Math.round(det.score * 100)}%`;
    const fontSize = Math.round(11 * scaleFactor);
    ctx.font = `bold ${fontSize}px sans-serif`;
    const textMetrics = ctx.measureText(labelText);
    const badgeW = textMetrics.width + 14 * scaleFactor;
    const badgeH = 20 * scaleFactor;
    const badgeY = Math.max(0, y - badgeH - 3 * scaleFactor);

    ctx.fillStyle = strokeColor;
    ctx.beginPath();
    ctx.roundRect(x, badgeY, badgeW, badgeH, 4 * scaleFactor);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, x + 7 * scaleFactor, badgeY + badgeH / 2);

    ctx.restore();
  }
}

// Global instance
window.smartDeskDetector = new SmartDeskDetector();
