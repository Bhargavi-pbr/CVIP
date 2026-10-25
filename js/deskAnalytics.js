/**
 * ============================================================================
 * Smart Desk Analytics Engine
 * Implements:
 * 1. Desk Clutter Index (DCI) Formulation
 * 2. Spill Hazard Proximity Matrix
 * 3. Distraction & Focus Scoring
 * 4. Ergonomics & Posture Monitoring
 * 5. Desk Zoning Rules
 * ============================================================================
 */

class DeskAnalyticsEngine {
  constructor() {
    this.sessionStartTime = Date.now();
    this.focusTimeMs = 0;
    this.distractedTimeMs = 0;
    this.lastTick = Date.now();
    this.hazardAlertCount = 0;
    this.logs = [];
    this.zones = {
      workZone: { x: 0.2, y: 0.25, w: 0.6, h: 0.65 },
      safeBeverageZone: { x: 0.8, y: 0.1, w: 0.18, h: 0.8 }
    };
  }

  // Categorize detected object
  categorize(label) {
    const l = label.toLowerCase();
    if (['laptop', 'mouse', 'keyboard', 'book', 'notebook', 'scissors', 'pen', 'pencil'].includes(l)) {
      return 'productive';
    }
    if (['cell phone', 'phone', 'remote', 'controller', 'gamepad'].includes(l)) {
      return 'distraction';
    }
    if (['cup', 'bottle', 'wine glass', 'mug', 'bowl', 'drink'].includes(l)) {
      return 'spill';
    }
    if (['person', 'head', 'face'].includes(l)) {
      return 'user';
    }
    return 'neutral';
  }

  /**
   * Desk Clutter Index (DCI) Calculation
   * Mathematical formula:
   * DCI = w1 * (N / N_max) + w2 * (OccupiedArea / TotalArea) + w3 * EdgeDensity
   * Clamped to [0, 100]
   */
  calculateClutterIndex(detections, frameWidth, frameHeight, edgeDensity = 0.2) {
    const totalArea = frameWidth * frameHeight;
    let totalOccupiedArea = 0;
    let objectCount = 0;

    detections.forEach(det => {
      // Exclude the user/person from desk clutter calculation
      if (det.class.toLowerCase() === 'person') return;

      const [x, y, w, h] = det.bbox;
      totalOccupiedArea += (w * h);
      objectCount++;
    });

    const areaRatio = Math.min(1.0, totalOccupiedArea / (totalArea * 0.75));
    const countRatio = Math.min(1.0, objectCount / 8.0);
    const edgeRatio = Math.min(1.0, edgeDensity);

    // Weights: count (35%), area occupancy (40%), high-frequency clutter edges (25%)
    const rawScore = (countRatio * 0.35 + areaRatio * 0.40 + edgeRatio * 0.25) * 100;
    const score = Math.round(Math.min(100, Math.max(0, rawScore)));

    let status = 'Clean';
    let color = '#10b981';
    if (score > 65) {
      status = 'Messy / Highly Cluttered';
      color = '#f43f5e';
    } else if (score > 35) {
      status = 'Moderate';
      color = '#f59e0b';
    }

    return {
      score,
      status,
      color,
      objectCount,
      areaRatio: Math.round(areaRatio * 100),
      edgeDensity: Math.round(edgeRatio * 100)
    };
  }

  /**
   * Spill Hazard Proximity Matrix
   * Computes Euclidean distance between liquid containers and sensitive electronics
   */
  checkSpillHazards(detections) {
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
    let minDistance = 9999;
    let criticalHazard = false;

    liquids.forEach(liq => {
      tech.forEach(tc => {
        // Distance between centers
        const dx = liq.center.x - tc.center.x;
        const dy = liq.center.y - tc.center.y;
        const dist = Math.hypot(dx, dy);

        if (dist < minDistance) minDistance = dist;

        // Proximity threshold: Critical < 110px, Warning < 180px
        if (dist < 110) {
          criticalHazard = true;
          hazards.push({
            level: 'CRITICAL',
            message: `CRITICAL: ${liq.item.class} is dangerously close to ${tc.item.class}! (${Math.round(dist)}px)`,
            liquid: liq,
            tech: tc,
            dist
          });
        } else if (dist < 180) {
          hazards.push({
            level: 'WARNING',
            message: `Caution: ${liq.item.class} placed near ${tc.item.class} (${Math.round(dist)}px)`,
            liquid: liq,
            tech: tc,
            dist
          });
        }
      });
    });

    return {
      hasHazard: hazards.length > 0,
      criticalHazard,
      minDistance: minDistance === 9999 ? null : Math.round(minDistance),
      hazards
    };
  }

  /**
   * Focus & Distraction Tracker
   * Checks for active distractions (smartphone)
   */
  trackFocus(detections) {
    const now = Date.now();
    const dt = now - this.lastTick;
    this.lastTick = now;

    let hasPhone = false;
    let hasPerson = false;

    detections.forEach(d => {
      const l = d.class.toLowerCase();
      if (l === 'cell phone' || l === 'phone') hasPhone = true;
      if (l === 'person') hasPerson = true;
    });

    if (hasPhone) {
      this.distractedTimeMs += dt;
    } else if (hasPerson) {
      this.focusTimeMs += dt;
    }

    const totalTracked = this.focusTimeMs + this.distractedTimeMs;
    const focusPercentage = totalTracked > 0 
      ? Math.round((this.focusTimeMs / totalTracked) * 100)
      : 100;

    return {
      hasPhone,
      hasPerson,
      focusScore: focusPercentage,
      focusMinutes: Math.round(this.focusTimeMs / 60000),
      distractedMinutes: Math.round(this.distractedTimeMs / 60000)
    };
  }

  /**
   * Ergonomics & Screen Distance Tracker
   * Evaluates posture based on person bounding box scale and aspect ratio
   */
  trackErgonomics(detections, frameWidth, frameHeight) {
    const person = detections.find(d => d.class.toLowerCase() === 'person');

    if (!person) {
      return {
        postureStatus: 'Away from Desk',
        level: 'info',
        isSlouching: false
      };
    }

    const [x, y, w, h] = person.bbox;
    const relativeHeight = h / frameHeight;
    const relativeArea = (w * h) / (frameWidth * frameHeight);

    // If person bounding box covers > 60% of frame area, they are sitting too close/leaning
    if (relativeArea > 0.65 || relativeHeight > 0.9) {
      return {
        postureStatus: 'Too Close / Leaning Forward',
        level: 'warn',
        isSlouching: true,
        message: 'Ergonomic Warning: Maintain arm-length distance from screen!'
      };
    }

    return {
      postureStatus: 'Good Posture',
      level: 'safe',
      isSlouching: false,
      message: 'Ergonomic alignment optimal.'
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
