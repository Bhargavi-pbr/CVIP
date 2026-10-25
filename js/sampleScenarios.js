/**
 * ============================================================================
 * Preset Synthetic Desk Scenarios
 * High-definition Canvas generator for instant demonstration & CVIP evaluation
 * ============================================================================
 */

class DeskScenarioGenerator {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1280;
    this.canvas.height = 720;
    this.ctx = this.canvas.getContext('2d');
  }

  // Draw desk background surface
  drawDeskSurface(theme = 'wood') {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    if (theme === 'wood') {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#2d1b11');
      grad.addColorStop(0.5, '#452c1e');
      grad.addColorStop(1, '#1e110b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Subtle wood grain lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let y = 0; y < h; y += 14) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(w * 0.3, y + 4, w * 0.7, y - 4, w, y);
        ctx.stroke();
      }
    } else {
      // Modern gray desk
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#1f2430');
      grad.addColorStop(1, '#11141c');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    // Desk mat / pad in center
    ctx.fillStyle = '#171c26';
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(160, 100, 960, 520, 16);
    ctx.fill();
    ctx.stroke();
  }

  // Draw realistic Laptop
  drawLaptop(x, y, w, h, open = true) {
    const ctx = this.ctx;
    // Laptop base
    ctx.fillStyle = '#64748b';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y + h * 0.4, w, h * 0.6, 12);
    ctx.fill();
    ctx.stroke();

    // Keyboard bed
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(x + w * 0.08, y + h * 0.44, w * 0.84, h * 0.36, 6);
    ctx.fill();

    // Keyboard keys simulation
    ctx.fillStyle = '#0f172a';
    const rows = 4, cols = 12;
    const kw = (w * 0.8) / cols;
    const kh = (h * 0.3) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillRect(x + w * 0.1 + c * kw, y + h * 0.46 + r * kh, kw - 3, kh - 2);
      }
    }

    // Trackpad
    ctx.fillStyle = '#475569';
    ctx.fillRect(x + w * 0.35, y + h * 0.82, w * 0.3, h * 0.14);

    // Laptop screen
    if (open) {
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#475569';
      ctx.beginPath();
      ctx.roundRect(x + w * 0.05, y, w * 0.9, h * 0.42, 8);
      ctx.fill();
      ctx.stroke();

      // Screen glow / code editor
      const screenGrad = ctx.createLinearGradient(x, y, x + w, y + h * 0.4);
      screenGrad.addColorStop(0, '#0284c7');
      screenGrad.addColorStop(1, '#3b82f6');
      ctx.fillStyle = screenGrad;
      ctx.fillRect(x + w * 0.08, y + h * 0.04, w * 0.84, h * 0.34);

      // Simulated code lines on screen
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      for (let line = 0; line < 6; line++) {
        ctx.fillRect(x + w * 0.12, y + h * 0.08 + line * 14, (line % 2 === 0 ? 120 : 80), 4);
      }
    }
  }

  // Draw Coffee Mug / Cup
  drawCup(x, y, radius, color = '#f97316', hasLiquid = true) {
    const ctx = this.ctx;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(x + 4, y + 6, radius + 4, radius * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Handle
    ctx.strokeStyle = color;
    ctx.lineWidth = radius * 0.3;
    ctx.beginPath();
    ctx.arc(x + radius * 1.1, y, radius * 0.55, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();

    // Mug body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner coffee liquid
    if (hasLiquid) {
      ctx.fillStyle = '#3e2723';
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.75, 0, Math.PI * 2);
      ctx.fill();

      // Foam ring
      ctx.strokeStyle = '#d7ccc8';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // Draw Smartphone
  drawPhone(x, y, w, h, screenOn = true) {
    const ctx = this.ctx;
    // Phone body
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();

    // Screen
    if (screenOn) {
      const grad = ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, '#4f46e5');
      grad.addColorStop(1, '#9333ea');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x + 3, y + 4, w - 6, h - 8, 5);
      ctx.fill();

      // Notification icon
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h * 0.35, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw Book / Notebook
  drawBook(x, y, w, h, color = '#10b981', title = 'CVIP Algorithms') {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 4);
    ctx.fill();
    ctx.stroke();

    // Spine
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x, y, 16, h);

    // Title line
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px sans-serif';
    ctx.fillText(title, x + 24, y + h / 2);
  }

  // Draw Computer Mouse
  drawMouse(x, y, w, h) {
    const ctx = this.ctx;
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, w / 2);
    ctx.fill();
    ctx.stroke();

    // Scroll wheel
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(x + w / 2 - 2, y + h * 0.2, 4, 14);
  }

  // Draw Scissors
  drawScissors(x, y) {
    const ctx = this.ctx;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 4;
    // Blades
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 40, y + 40);
    ctx.moveTo(x + 40, y);
    ctx.lineTo(x, y + 40);
    ctx.stroke();
    // Handles
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x, y + 44, 9, 0, Math.PI * 2);
    ctx.arc(x + 40, y + 44, 9, 0, Math.PI * 2);
    ctx.stroke();
  }

  /**
   * Generates Preset 1: Clean & Ergonomic Desk
   */
  generateCleanDesk() {
    this.drawDeskSurface('wood');
    // Centered Laptop
    this.drawLaptop(440, 160, 400, 300);
    // Mouse on right
    this.drawMouse(890, 340, 50, 80);
    // Notebook on left
    this.drawBook(200, 240, 180, 220, '#059669', 'Research Notes');
    // Safe coffee mug on drink coaster (far right corner)
    this.drawCup(1050, 200, 26, '#3b82f6', true);

    const detections = [
      { class: 'laptop', score: 0.96, bbox: [440, 160, 400, 300] },
      { class: 'mouse', score: 0.91, bbox: [890, 340, 50, 80] },
      { class: 'book', score: 0.89, bbox: [200, 240, 180, 220] },
      { class: 'cup', score: 0.94, bbox: [1024, 174, 52, 52] }
    ];

    return { canvas: this.canvas, detections, name: 'Optimal Clean Desk' };
  }

  /**
   * Generates Preset 2: High Clutter Messy Desk
   */
  generateClutteredDesk() {
    this.drawDeskSurface('wood');
    this.drawLaptop(380, 180, 360, 260);
    this.drawMouse(780, 320, 50, 80);
    this.drawBook(180, 140, 160, 200, '#e11d48', 'Calculus');
    this.drawBook(190, 320, 170, 210, '#d97706', 'CVIP Textbook');
    this.drawBook(860, 180, 150, 190, '#7c3aed', 'Data Science');
    this.drawCup(780, 200, 24, '#ea580c', true); // Mug 1
    this.drawCup(940, 390, 22, '#0284c7', true); // Mug 2
    this.drawCup(220, 480, 22, '#16a34a', true); // Mug 3
    this.drawPhone(520, 460, 60, 110, true);
    this.drawScissors(760, 430);

    const detections = [
      { class: 'laptop', score: 0.95, bbox: [380, 180, 360, 260] },
      { class: 'mouse', score: 0.88, bbox: [780, 320, 50, 80] },
      { class: 'book', score: 0.92, bbox: [180, 140, 160, 200] },
      { class: 'book', score: 0.89, bbox: [190, 320, 170, 210] },
      { class: 'book', score: 0.87, bbox: [860, 180, 150, 190] },
      { class: 'cup', score: 0.93, bbox: [756, 176, 48, 48] },
      { class: 'cup', score: 0.91, bbox: [918, 368, 44, 44] },
      { class: 'cup', score: 0.90, bbox: [198, 458, 44, 44] },
      { class: 'cell phone', score: 0.94, bbox: [520, 460, 60, 110] },
      { class: 'scissors', score: 0.86, bbox: [760, 430, 50, 50] }
    ];

    return { canvas: this.canvas, detections, name: 'High Clutter Desk' };
  }

  /**
   * Generates Preset 3: Spill Hazard Alert (Coffee right on laptop keyboard!)
   */
  generateSpillHazardScenario() {
    this.drawDeskSurface('wood');
    // Laptop in center
    this.drawLaptop(420, 180, 420, 320);
    // Coffee mug placed dangerously close to laptop keyboard edge (< 40px away!)
    this.drawCup(360, 340, 28, '#ef4444', true);
    this.drawMouse(880, 360, 50, 80);
    this.drawBook(960, 200, 160, 220, '#2563eb', 'Computer Vision');

    const detections = [
      { class: 'laptop', score: 0.97, bbox: [420, 180, 420, 320] },
      { class: 'cup', score: 0.96, bbox: [332, 312, 56, 56] },
      { class: 'mouse', score: 0.92, bbox: [880, 360, 50, 80] },
      { class: 'book', score: 0.88, bbox: [960, 200, 160, 220] }
    ];

    return { canvas: this.canvas, detections, name: 'CRITICAL Spill Hazard' };
  }

  /**
   * Generates Preset 4: Distraction Scenario (Active smartphone in hand zone during study)
   */
  generateDistractionScenario() {
    this.drawDeskSurface('gray');
    this.drawBook(340, 180, 340, 400, '#059669', 'Advanced Deep Learning');
    // Smartphone sitting directly in the active center of the study book
    this.drawPhone(460, 300, 70, 130, true);
    this.drawLaptop(740, 200, 360, 260);
    this.drawCup(1050, 220, 24, '#f59e0b', true);

    const detections = [
      { class: 'book', score: 0.94, bbox: [340, 180, 340, 400] },
      { class: 'cell phone', score: 0.97, bbox: [460, 300, 70, 130] },
      { class: 'laptop', score: 0.93, bbox: [740, 200, 360, 260] },
      { class: 'cup', score: 0.91, bbox: [1026, 196, 48, 48] }
    ];

    return { canvas: this.canvas, detections, name: 'Study Distraction (Phone Active)' };
  }
}

// Global instance
window.deskScenarioGenerator = new DeskScenarioGenerator();
