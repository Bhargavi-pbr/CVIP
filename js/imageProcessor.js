/**
 * ============================================================================
 * CVIP Image Processing Engine
 * Core classical Computer Vision algorithms implemented in pure JavaScript:
 * 1. Grayscale Conversion (Luminance weighting)
 * 2. 2D Gaussian Convolution Smoothing with Border Replication
 * 3. Sobel Gradient Magnitude & Direction with Edge Clamping
 * 4. Canny Edge Detector (NMS + Double Thresholding + Hysteresis)
 * 5. Otsu Automated Binarization
 * 6. Morphological Dilation and Erosion
 * 7. RGB to HSV Color Segmentation
 * 8. Desk Clutter Edge Density Metrics
 * ============================================================================
 */

class CVIPImageProcessor {
  constructor() {
    this.offscreenCanvas = document.createElement('canvas');
    this.ctx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
  }

  // Prepares offscreen canvas with matching dimensions
  setup(width, height) {
    this.offscreenCanvas.width = width;
    this.offscreenCanvas.height = height;
  }

  // Extracts ImageData from an Image, Video, or Canvas source
  getImageData(source) {
    const w = source.videoWidth || source.naturalWidth || source.width;
    const h = source.videoHeight || source.naturalHeight || source.height;
    if (!w || !h) return null;
    this.setup(w, h);
    this.ctx.drawImage(source, 0, 0, w, h);
    return this.ctx.getImageData(0, 0, w, h);
  }

  /**
   * 1. Grayscale Conversion
   * Uses standard ITU-R BT.601 luminance weighting:
   * Y = 0.299*R + 0.587*G + 0.114*B
   */
  toGrayscale(imageData) {
    const data = imageData.data;
    const len = data.length;
    const gray = new Uint8ClampedArray(len / 4);

    for (let i = 0, j = 0; i < len; i += 4, j++) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      gray[j] = lum;
    }
    return gray;
  }

  // Converts 1-channel Uint8Array to 4-channel ImageData for canvas display
  grayToImageData(gray, width, height) {
    const output = this.ctx.createImageData(width, height);
    const d = output.data;
    for (let i = 0, j = 0; i < gray.length; i++, j += 4) {
      const val = gray[i];
      d[j] = val;
      d[j + 1] = val;
      d[j + 2] = val;
      d[j + 3] = 255;
    }
    return output;
  }

  /**
   * 2. 2D Gaussian Blur Smoothing with Border Replication (Edge Clamping)
   * 5x5 Normalized Gaussian Kernel (sigma ≈ 1.4)
   * Fixed: Border pixels replicate nearest boundary values, eliminating artificial dark borders!
   */
  gaussianBlur5x5(gray, width, height) {
    const output = new Uint8ClampedArray(width * height);
    // Gaussian 5x5 kernel weights (sum = 273)
    const kernel = [
      1,  4,  7,  4, 1,
      4, 16, 26, 16, 4,
      7, 26, 41, 26, 7,
      4, 16, 26, 16, 4,
      1,  4,  7,  4, 1
    ];
    const kSum = 273;

    for (let y = 0; y < height; y++) {
      const yOffset = y * width;
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let ki = 0;
        for (let ky = -2; ky <= 2; ky++) {
          // Edge clamping (replication) for Y boundary
          const cy = Math.min(height - 1, Math.max(0, y + ky));
          const rowOffset = cy * width;
          for (let kx = -2; kx <= 2; kx++) {
            // Edge clamping (replication) for X boundary
            const cx = Math.min(width - 1, Math.max(0, x + kx));
            sum += gray[rowOffset + cx] * kernel[ki++];
          }
        }
        output[yOffset + x] = Math.round(sum / kSum);
      }
    }
    return output;
  }

  /**
   * 3. Sobel Gradient Operators with Border Clamping
   * Computes spatial derivatives Gx and Gy, gradient magnitude, and orientation theta
   */
  sobelGradients(gray, width, height) {
    const magnitude = new Float32Array(width * height);
    const direction = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
      const ym1 = Math.max(0, y - 1) * width;
      const y0 = y * width;
      const yp1 = Math.min(height - 1, y + 1) * width;

      for (let x = 0; x < width; x++) {
        const xm1 = Math.max(0, x - 1);
        const xp1 = Math.min(width - 1, x + 1);

        const gx = (
          -1 * gray[ym1 + xm1] + 1 * gray[ym1 + xp1] +
          -2 * gray[y0 + xm1]  + 2 * gray[y0 + xp1] +
          -1 * gray[yp1 + xm1] + 1 * gray[yp1 + xp1]
        );

        const gy = (
          -1 * gray[ym1 + xm1] - 2 * gray[ym1 + x] - 1 * gray[ym1 + xp1] +
           1 * gray[yp1 + xm1] + 2 * gray[yp1 + x] + 1 * gray[yp1 + xp1]
        );

        const idx = y0 + x;
        magnitude[idx] = Math.hypot(gx, gy);
        direction[idx] = Math.atan2(gy, gx); // Range -PI to PI
      }
    }
    return { magnitude, direction };
  }

  /**
   * 4. Canny Edge Detection
   * Complete multi-stage implementation:
   * 1. Gaussian Blur with edge replication
   * 2. Sobel Gradients
   * 3. Non-Maximum Suppression (edge thinning)
   * 4. Double Thresholding (low & high)
   * 5. Hysteresis Edge Tracking
   */
  cannyEdgeDetection(grayInput, width, height, lowThreshold = 25, highThreshold = 65) {
    const smoothed = this.gaussianBlur5x5(grayInput, width, height);
    const { magnitude, direction } = this.sobelGradients(smoothed, width, height);

    // Step 3: Non-Maximum Suppression (NMS)
    const nms = new Float32Array(width * height);

    for (let y = 1; y < height - 1; y++) {
      const y0 = y * width;
      for (let x = 1; x < width - 1; x++) {
        const idx = y0 + x;
        const mag = magnitude[idx];
        if (mag === 0) continue;

        let angle = (direction[idx] * 180 / Math.PI);
        if (angle < 0) angle += 180;

        let q = 255, r = 255;

        // Angle 0° (Horizontal gradient, vertical edge)
        if ((angle >= 0 && angle < 22.5) || (angle >= 157.5 && angle <= 180)) {
          q = magnitude[y0 + (x + 1)];
          r = magnitude[y0 + (x - 1)];
        }
        // Angle 45°
        else if (angle >= 22.5 && angle < 67.5) {
          q = magnitude[(y + 1) * width + (x - 1)];
          r = magnitude[(y - 1) * width + (x + 1)];
        }
        // Angle 90° (Vertical gradient, horizontal edge)
        else if (angle >= 67.5 && angle < 112.5) {
          q = magnitude[(y + 1) * width + x];
          r = magnitude[(y - 1) * width + x];
        }
        // Angle 135°
        else if (angle >= 112.5 && angle < 157.5) {
          q = magnitude[(y - 1) * width + (x - 1)];
          r = magnitude[(y + 1) * width + (x + 1)];
        }

        if (mag >= q && mag >= r) {
          nms[idx] = mag;
        } else {
          nms[idx] = 0;
        }
      }
    }

    // Step 4 & 5: Double Thresholding and Hysteresis
    const edges = new Uint8ClampedArray(width * height);
    const STRONG = 255;
    const WEAK = 75;

    for (let i = 0; i < nms.length; i++) {
      const val = nms[i];
      if (val >= highThreshold) {
        edges[i] = STRONG;
      } else if (val >= lowThreshold) {
        edges[i] = WEAK;
      } else {
        edges[i] = 0;
      }
    }

    // Hysteresis: connect weak edges to strong neighbors (8-connected)
    for (let y = 1; y < height - 1; y++) {
      const y0 = y * width;
      for (let x = 1; x < width - 1; x++) {
        const idx = y0 + x;
        if (edges[idx] === WEAK) {
          const hasStrongNeighbor = (
            edges[(y - 1) * width + (x - 1)] === STRONG ||
            edges[(y - 1) * width + x]       === STRONG ||
            edges[(y - 1) * width + (x + 1)] === STRONG ||
            edges[y0 + (x - 1)]              === STRONG ||
            edges[y0 + (x + 1)]              === STRONG ||
            edges[(y + 1) * width + (x - 1)] === STRONG ||
            edges[(y + 1) * width + x]       === STRONG ||
            edges[(y + 1) * width + (x + 1)] === STRONG
          );
          edges[idx] = hasStrongNeighbor ? STRONG : 0;
        }
      }
    }

    return edges;
  }

  /**
   * 5. Otsu Automated Global Thresholding
   * Maximizes between-class variance to calculate the optimal binarization threshold
   */
  otsuThreshold(gray, width, height) {
    const histogram = new Uint32Array(256);
    const totalPixels = width * height;
    for (let i = 0; i < totalPixels; i++) {
      histogram[gray[i]]++;
    }

    let sum = 0;
    for (let t = 0; t < 256; t++) {
      sum += t * histogram[t];
    }

    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let varMax = 0;
    let optimalThreshold = 128;

    for (let t = 0; t < 256; t++) {
      wB += histogram[t];
      if (wB === 0) continue;
      wF = totalPixels - wB;
      if (wF === 0) break;

      sumB += t * histogram[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;

      const varBetween = wB * wF * (mB - mF) * (mB - mF);
      if (varBetween > varMax) {
        varMax = varBetween;
        optimalThreshold = t;
      }
    }

    const binary = new Uint8ClampedArray(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      binary[i] = gray[i] >= optimalThreshold ? 255 : 0;
    }

    return { binary, threshold: optimalThreshold };
  }

  /**
   * 6. Morphological Operations: Dilation and Erosion
   */
  morphologicalDilation(binary, width, height) {
    const output = new Uint8ClampedArray(width * height);
    for (let y = 1; y < height - 1; y++) {
      const y0 = y * width;
      for (let x = 1; x < width - 1; x++) {
        let maxVal = 0;
        for (let ky = -1; ky <= 1; ky++) {
          const row = (y + ky) * width;
          for (let kx = -1; kx <= 1; kx++) {
            if (binary[row + (x + kx)] === 255) {
              maxVal = 255;
              break;
            }
          }
          if (maxVal === 255) break;
        }
        output[y0 + x] = maxVal;
      }
    }
    return output;
  }

  morphologicalErosion(binary, width, height) {
    const output = new Uint8ClampedArray(width * height);
    for (let y = 1; y < height - 1; y++) {
      const y0 = y * width;
      for (let x = 1; x < width - 1; x++) {
        let allTrue = 255;
        for (let ky = -1; ky <= 1; ky++) {
          const row = (y + ky) * width;
          for (let kx = -1; kx <= 1; kx++) {
            if (binary[row + (x + kx)] !== 255) {
              allTrue = 0;
              break;
            }
          }
          if (allTrue === 0) break;
        }
        output[y0 + x] = allTrue;
      }
    }
    return output;
  }

  /**
   * 7. RGB to HSV Color Segmentation
   */
  rgbToHsvMask(imageData, minHue = 10, maxHue = 45, minSat = 0.25, minVal = 0.2) {
    const data = imageData.data;
    const len = data.length;
    const mask = new Uint8ClampedArray(len / 4);

    for (let i = 0, j = 0; i < len; i += 4, j++) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const delta = max - min;

      let h = 0;
      if (delta !== 0) {
        if (max === r) h = ((g - b) / delta) % 6;
        else if (max === g) h = (b - r) / delta + 2;
        else h = (r - g) / delta + 4;
        h = Math.round(h * 60);
        if (h < 0) h += 360;
      }

      const s = max === 0 ? 0 : delta / max;
      const v = max;

      if (h >= minHue && h <= maxHue && s >= minSat && v >= minVal) {
        mask[j] = 255;
      } else {
        mask[j] = 0;
      }
    }
    return mask;
  }

  /**
   * 8. Desk Clutter Edge Density Calculation
   * Measures percentage of high-frequency edge pixels across the analyzed frame
   */
  calculateEdgeDensity(edges) {
    let edgeCount = 0;
    const total = edges.length;
    for (let i = 0; i < total; i++) {
      if (edges[i] === 255) edgeCount++;
    }
    return Math.min(1.0, (edgeCount / total) * 12);
  }
}

// Global instance
window.cvipProcessor = new CVIPImageProcessor();
