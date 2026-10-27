/**
 * ============================================================================
 * Smart Desk Analytics Engine (Refined & Validated)
 * ----------------------------------------------------------------------------
 * Implements:
 * 1. Standardized Desk Clutter Index (DCI) Formulation (Project Heuristic)
 * 2. Edge-to-Edge Bounding Box Spill Hazard Proximity Matrix (Normalized)
 * 3. Phone-Based Distraction Estimator (with Primary Work Zone spatial checks)
 * 4. User Screen Proximity Estimation (honest bounding box occupancy)
 * 5. Strictly Validated Standard COCO Classes
 * ============================================================================
 */

class DeskAnalyticsEngine {
  constructor() {
    this.sessionStartTime = Date.now();
    this.focusTimeMs = 0;
    this.distractedTimeMs = 0;
    this.inactiveTimeMs = 0;
    this.lastTick = Date.now();
    this.hazardAlertCount = 0;
    this.logs = [];

    // Normalized Primary Work Zone (x, y, w, h relative to frame [0..1])
    this.zones = {
      workZone: { x: 0.2, y: 0.25, w: 0.6, h: 0.65 },
      safeBeverageZone: { x: 0.8, y: 0.1, w: 0.18, h: 0.8 }
    };
  }

  /**
   * Categorize detected object based strictly on verified COCO dataset classes.
   * Unsupported classes (like notebook, pen, pencil) are excluded.
   */
  categorize(label) {
    const l = (label || '').toLowerCase().trim();
    // Verified COCO Study & Tech Productive Classes
    if (['laptop', 'keyboard', 'mouse', 'book', 'scissors'].includes(l)) {
      return 'productive';
    }
    // Verified COCO Distraction Hazard Classes
    if (['cell phone', 'remote'].includes(l)) {
      return 'distraction';
    }
    // Verified COCO Liquid / Consumable Classes
    if (['cup', 'bottle', 'wine glass', 'bowl'].includes(l)) {
      return 'spill';
    }
    // Verified COCO Human Presence Class
    if (l === 'person') {
      return 'user';
    }
    return 'neutral';
  }

  /**
   * Standardized Desk Clutter Index (DCI) Calculation
   * Project-Defined Heuristic Formulation:
   * DCI = w1 * (N / 8) + w2 * (OccupiedArea / (0.75 * TotalArea)) + w3 * EdgeDensity
   * Clamped to [0, 100]
   */
  calculateClutterIndex(detections, frameWidth, frameHeight, edgeDensity = 0.25) {
    const totalArea = Math.max(1, frameWidth * frameHeight);
    let totalOccupiedArea = 0;
    let validObjectCount = 0;

    detections.forEach(det => {
      // Exclude human user bounding box from desk clutter score
      if (det.class.toLowerCase() === 'person') return;

      const [x, y, w, h] = det.bbox;
      totalOccupiedArea += (w * h);
      validObjectCount++;
    });

    const areaRatio = Math.min(1.0, totalOccupiedArea / (totalArea * 0.75));
    const countRatio = Math.min(1.0, validObjectCount / 8.0);
    const edgeRatio = Math.min(1.0, edgeDensity);

    // Standardized weights: Count (35%), Area Coverage (40%), Canny Edge Density (25%)
    const rawScore = (countRatio * 0.35 + areaRatio * 0.40 + edgeRatio * 0.25) * 100;
    const score = Math.round(Math.min(100, Math.max(0, rawScore)));

    let status = 'Clean';
    let color = '#10b981';
    if (score > 65) {
      status = 'Messy / High Clutter';
      color = '#f43f5e';
    } else if (score > 35) {
      status = 'Moderate';
      color = '#f59e0b';
    }

    return {
      score,
      status,
      color,
      objectCount: validObjectCount,
      areaRatio: Math.round(areaRatio * 100),
      edgeDensity: Math.round(edgeRatio * 100),
      isStandardized: true
    };
  }

  /**
   * Edge-to-Edge Bounding Box Distance Calculation
   * Measures true separation between two rectangles.
   * Returns 0 if rectangles intersect or touch.
   */
  computeBoxEdgeDistance(box1, box2) {
    const a = { x1: box1[0], y1: box1[1], x2: box1[0] + box1[2], y2: box1[1] + box1[3] };
    const b = { x1: box2[0], y1: box2[1], x2: box2[0] + box2[2], y2: box2[1] + box2[3] };

    const dx = Math.max(0, Math.max(a.x1, b.x1) - Math.min(a.x2, b.x2));
    const dy = Math.max(0, Math.max(a.y1, b.y1) - Math.min(a.y2, b.y2));

    return Math.hypot(dx, dy);
  }

  /**
   * Spill Hazard Proximity Matrix
   * Uses Edge-to-Edge separation normalized by frame diagonal to prevent resolution skew!
   */
  checkSpillHazards(detections, frameWidth = 1280, frameHeight = 720) {
    const frameDiagonal = Math.hypot(frameWidth, frameHeight);
    const liquids = [];
    const tech = [];

    detections.forEach(det => {
      const cat = this.categorize(det.class);
      const [x, y, w, h] = det.bbox;
      const center = { x: x + w / 2, y: y + h / 2 };

      if (cat === 'spill') {
        liquids.push({ item: det, center, bbox: det.bbox });
      } else if (['laptop', 'keyboard', 'mouse'].includes(det.class.toLowerCase())) {
        tech.push({ item: det, center, bbox: det.bbox });
      }
    });

    const hazards = [];
    let minNormalizedDist = 9999;
    let minEdgeDist = 9999;
    let criticalHazard = false;

    liquids.forEach(liq => {
      tech.forEach(tc => {
        // True edge-to-edge separation
        const edgeDist = this.computeBoxEdgeDistance(liq.bbox, tc.bbox);
        const normDist = edgeDist / frameDiagonal;

        if (normDist < minNormalizedDist) {
          minNormalizedDist = normDist;
          minEdgeDist = edgeDist;
        }

        // Proximity thresholds normalized to frame diagonal:
        // Critical: Overlap (0) or within 5% of diagonal (~70px at 1280x720, ~40px at 640x480)
        // Warning: Within 12% of diagonal (~170px at 1280x720, ~95px at 640x480)
        if (normDist < 0.05 || edgeDist === 0) {
          criticalHazard = true;
          hazards.push({
            level: 'CRITICAL',
            message: `CRITICAL HAZARD: ${liq.item.class} edge is within ${Math.round(edgeDist)}px (${(normDist * 100).toFixed(1)}% diagonal) of ${tc.item.class}!`,
            liquid: liq,
            tech: tc,
            edgeDist: Math.round(edgeDist),
            normDist,
            centerDist: Math.round(Math.hypot(liq.center.x - tc.center.x, liq.center.y - tc.center.y))
          });
        } else if (normDist < 0.12) {
          hazards.push({
            level: 'WARNING',
            message: `Caution: ${liq.item.class} near ${tc.item.class} (${Math.round(edgeDist)}px edge separation).`,
            liquid: liq,
            tech: tc,
            edgeDist: Math.round(edgeDist),
            normDist,
            centerDist: Math.round(Math.hypot(liq.center.x - tc.center.x, liq.center.y - tc.center.y))
          });
        }
      });
    });

    return {
      hasHazard: hazards.length > 0,
      criticalHazard,
      minEdgeDistance: minEdgeDist === 9999 ? null : Math.round(minEdgeDist),
      minNormalizedDistance: minNormalizedDist === 9999 ? null : minNormalizedDist,
      hazards
    };
  }

  /**
   * Phone-Based Distraction Estimator (Refined)
   * Evaluates if a smartphone is actively situated inside or overlapping the Primary Work Zone.
   * Tracks inactive time when no user is detected at the workspace.
   */
  trackFocus(detections, frameWidth = 1280, frameHeight = 720) {
    const now = Date.now();
    const dt = now - this.lastTick;
    this.lastTick = now;

    let phoneInWorkZone = false;
    let hasPhoneAnywhere = false;
    let hasPerson = false;

    // Absolute coordinates of Primary Work Zone
    const wzX1 = this.zones.workZone.x * frameWidth;
    const wzY1 = this.zones.workZone.y * frameHeight;
    const wzX2 = wzX1 + this.zones.workZone.w * frameWidth;
    const wzY2 = wzY1 + this.zones.workZone.h * frameHeight;

    detections.forEach(d => {
      const l = d.class.toLowerCase();
      if (l === 'cell phone') {
        hasPhoneAnywhere = true;
        const [px, py, pw, ph] = d.bbox;
        // Check if phone overlaps work zone
        const overlapsWorkZone = !(px + pw < wzX1 || px > wzX2 || py + ph < wzY1 || py > wzY2);
        if (overlapsWorkZone) {
          phoneInWorkZone = true;
        }
      }
      if (l === 'person') {
        hasPerson = true;
      }
    });

    let state = 'active_clear';
    if (!hasPerson) {
      // User absent: time is untracked/inactive, not blindly added to focus!
      this.inactiveTimeMs += dt;
      state = 'desk_vacant';
    } else if (phoneInWorkZone) {
      // User present and phone actively in work area
      this.distractedTimeMs += dt;
      state = 'distraction_in_zone';
    } else {
      // User present and work zone free of phone distraction
      this.focusTimeMs += dt;
      state = 'focused_clear';
    }

    const activeUserTime = this.focusTimeMs + this.distractedTimeMs;
    const focusPercentage = activeUserTime > 0
      ? Math.round((this.focusTimeMs / activeUserTime) * 100)
      : 100;

    return {
      state,
      hasPerson,
      hasPhoneAnywhere,
      phoneInWorkZone,
      focusScore: focusPercentage,
      focusMinutes: Math.round(this.focusTimeMs / 60000),
      distractedMinutes: Math.round(this.distractedTimeMs / 60000),
      inactiveMinutes: Math.round(this.inactiveTimeMs / 60000)
    };
  }

  /**
   * User Screen Proximity Estimation (Refined from Posture Monitoring)
   * Clearly describes proxy estimation based on 2D bounding box occupancy.
   */
  trackUserProximity(detections, frameWidth = 1280, frameHeight = 720) {
    const person = detections.find(d => d.class.toLowerCase() === 'person');

    if (!person) {
      return {
        status: 'Desk Vacant / Away',
        level: 'info',
        isClose: false,
        message: 'No user detected at workspace.'
      };
    }

    const [x, y, w, h] = person.bbox;
    const relativeHeight = h / frameHeight;
    const relativeArea = (w * h) / (frameWidth * frameHeight);

    // Estimated proxy: person box occupying >65% area or >90% height indicates leaning very close to camera
    if (relativeArea > 0.65 || relativeHeight > 0.90) {
      return {
        status: 'Close to Screen / Leaning',
        level: 'warn',
        isClose: true,
        message: 'Screen Proximity: User appears close to monitor (< 50cm estimated proxy).'
      };
    }

    return {
      status: 'Optimal Proximity',
      level: 'safe',
      isClose: false,
      message: 'Screen Proximity: Distance within normal desk working bounds.'
    };
  }

  // Add session log entry
  addLog(type, message) {
    const timestamp = new Date().toLocaleTimeString();
    this.logs.unshift({ timestamp, type, message });
    if (this.logs.length > 50) this.logs.pop();
  }
}

// Global instance
window.deskAnalytics = new DeskAnalyticsEngine();
