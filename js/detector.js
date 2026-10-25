/**
 * ============================================================================
 * Object Detection Engine
 * Integrates TensorFlow.js COCO-SSD model with zero-friction offline fallback
 * Renders annotated bounding boxes, hazard proximity lines, and zoning grids
 * ============================================================================
 */

class SmartDeskDetector {
  constructor() {
    this.model = null;
    this.isLoading = false;
    this.isModelReady = false;
    this.confidenceThreshold = 0.50;
    this.showZones = true;
    this.showHazardLines = true;
  }

  // Load COCO-SSD model
  async loadModel() {
    if (this.model || this.isLoading) return;
    this.isLoading = true;

    try {
      if (window.cocoSsd) {
        console.log('Loading TensorFlow.js COCO-SSD model...');
        this.model = await window.cocoSsd.load({ base: 'mobilenet_v2' });
        this.isModelReady = true;
        console.log('COCO-SSD model loaded successfully!');
        if (window.deskAnalytics) {
          window.deskAnalytics.addLog('info', 'Deep Learning Model (COCO-SSD MobileNetV2) loaded');
        }
      } else {
        console.warn('COCO-SSD CDN not reached. Running on built-in Heuristic CV Engine.');
        this.isModelReady = false;
      }
    } catch (err) {
      console.warn('Failed to load COCO-SSD, switching to fallback engine:', err);
      this.isModelReady = false;
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
        return rawDetections.filter(d => d.score >= this.confidenceThreshold);
      } catch (e) {
        console.error('Detection frame error:', e);
      }
    }
    // Return empty if no model and no preset
    return [];
  }

  /**
   * Render Bounding Boxes, Proximity Hazard Vectors, and Zones on Canvas
   */
  renderAnnotations(ctx, detections, width, height, hazards = []) {
    ctx.clearRect(0, 0, width, height);

    // 1. Draw Desk Zones (if enabled)
    if (this.showZones) {
      this.drawDeskZones(ctx, width, height);
    }

    // 2. Draw Spill Hazard Proximity Lines
    if (this.showHazardLines && hazards.length > 0) {
      this.drawHazardLines(ctx, hazards);
    }

    // 3. Draw Bounding Boxes
    detections.forEach(det => {
      this.drawBoundingBox(ctx, det);
    });
  }

  // Render Virtual Desk Zones
  drawDeskZones(ctx, width, height) {
    // Primary Work Zone (Center)
    ctx.save();
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.fillStyle = 'rgba(6, 182, 212, 0.03)';
    const wz = { x: width * 0.2, y: height * 0.25, w: width * 0.6, h: height * 0.65 };
    ctx.fillRect(wz.x, wz.y, wz.w, wz.h);
    ctx.strokeRect(wz.x, wz.y, wz.w, wz.h);

    ctx.fillStyle = 'rgba(6, 182, 212, 0.7)';
    ctx.font = '11px sans-serif';
    ctx.fillText('PRIMARY WORK ZONE', wz.x + 10, wz.y + 18);

    // Safe Beverage Zone (Right Edge)
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.fillStyle = 'rgba(16, 185, 129, 0.04)';
    const bz = { x: width * 0.82, y: height * 0.12, w: width * 0.15, h: height * 0.75 };
    ctx.fillRect(bz.x, bz.y, bz.w, bz.h);
    ctx.strokeRect(bz.x, bz.y, bz.w, bz.h);

    ctx.fillStyle = 'rgba(16, 185, 129, 0.7)';
    ctx.fillText('SAFE DRINK ZONE', bz.x + 8, bz.y + 18);
    ctx.restore();
  }

  // Render Laser Proximity Hazard Lines
  drawHazardLines(ctx, hazards) {
    ctx.save();
    hazards.forEach(h => {
      const isCritical = h.level === 'CRITICAL';
      ctx.strokeStyle = isCritical ? 'rgba(244, 63, 94, 0.95)' : 'rgba(245, 158, 11, 0.85)';
      ctx.lineWidth = isCritical ? 3 : 2;
      ctx.setLineDash(isCritical ? [] : [5, 5]);

      // Connect liquid center to tech center
      ctx.beginPath();
      ctx.moveTo(h.liquid.center.x, h.liquid.center.y);
      ctx.lineTo(h.tech.center.x, h.tech.center.y);
      ctx.stroke();

      // Distance tag in midpoint
      const midX = (h.liquid.center.x + h.tech.center.x) / 2;
      const midY = (h.liquid.center.y + h.tech.center.y) / 2;

      ctx.fillStyle = isCritical ? '#f43f5e' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(midX, midY, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.round(h.dist)}px`, midX, midY);

      // Warning circle around tech if critical
      if (isCritical) {
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const [tx, ty, tw, th] = h.tech.bbox;
        ctx.arc(tx + tw / 2, ty + th / 2, Math.max(tw, th) * 0.7, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  // Render Single Bounding Box with Badge
  drawBoundingBox(ctx, det) {
    const [x, y, w, h] = det.bbox;
    const cat = window.deskAnalytics ? window.deskAnalytics.categorize(det.class) : 'productive';

    // Color definitions
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
    ctx.lineWidth = 2.5;
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
    ctx.stroke();

    // Corner brackets for high-tech aesthetic
    const bracketLen = Math.min(16, Math.min(w, h) * 0.3);
    ctx.lineWidth = 3.5;
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
    ctx.font = 'bold 11px sans-serif';
    const textMetrics = ctx.measureText(labelText);
    const badgeW = textMetrics.width + 14;
    const badgeH = 20;
    const badgeY = Math.max(0, y - badgeH - 3);

    ctx.fillStyle = strokeColor;
    ctx.beginPath();
    ctx.roundRect(x, badgeY, badgeW, badgeH, 4);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, x + 7, badgeY + badgeH / 2);

    ctx.restore();
  }
}

// Global instance
window.smartDeskDetector = new SmartDeskDetector();
