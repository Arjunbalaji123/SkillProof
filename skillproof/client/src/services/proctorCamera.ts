import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as blazeface from '@tensorflow-models/blazeface';

export interface FrameCheckResult {
  faceCount: number;
  phoneDetected: boolean;
  bookDetected: boolean;
  laptopDetected: boolean;
  cameraTrackDeadOrMuted: boolean;
  isFrameDarkOrBlocked: boolean;
  detectedObjects: { class: string; score: number }[];
}

class ProctorCameraManager {
  private stream: MediaStream | null = null;
  private cocoModel: cocoSsd.ObjectDetection | null = null;
  private faceModel: blazeface.BlazeFaceModel | null = null;
  private loadingPromise: Promise<void> | null = null;
  private keepAliveForNavigation = false;

  /**
   * Checks if the browser context supports getUserMedia (HTTPS or localhost).
   */
  isSecureContextAvailable(): boolean {
    if (typeof window === 'undefined') return true;
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') {
      return true;
    }
    return Boolean(window.isSecureContext);
  }

  /**
   * Loads TensorFlow.js, COCO-SSD, and BlazeFace models (singleton cached).
   */
  async loadModels(): Promise<void> {
    if (this.cocoModel && this.faceModel) return;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = (async () => {
      try {
        await tf.ready();
        const [coco, blaze] = await Promise.all([
          this.cocoModel ? Promise.resolve(this.cocoModel) : cocoSsd.load({ base: 'lite_mobilenet_v2' }),
          this.faceModel ? Promise.resolve(this.faceModel) : blazeface.load(),
        ]);
        this.cocoModel = coco;
        this.faceModel = blaze;
      } catch (err) {
        this.loadingPromise = null;
        throw err;
      }
    })();

    return this.loadingPromise;
  }

  /**
   * Requests webcam stream via getUserMedia.
   */
  async startCamera(): Promise<MediaStream> {
    if (!this.isSecureContextAvailable()) {
      throw new Error(
        'Camera access requires HTTPS in production (localhost works in development).'
      );
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Your browser does not support camera access (getUserMedia).');
    }

    // Reuse existing active stream if all video tracks are live
    if (this.stream) {
      const tracks = this.stream.getVideoTracks();
      if (tracks.length > 0 && tracks.every((t) => t.readyState === 'live')) {
        return this.stream;
      }
      this.stopCamera();
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });
      this.stream = mediaStream;
      return mediaStream;
    } catch (err: any) {
      if (
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.message?.toLowerCase().includes('permission')
      ) {
        throw new Error(
          'Camera permission was denied. Please allow camera access in your browser address bar settings and try again.'
        );
      }
      if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        throw new Error('No camera device was found on your system. A working webcam is required.');
      }
      throw new Error(err?.message || 'Unable to access camera. Please check your device settings.');
    }
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  setKeepAliveForNavigation(keep: boolean) {
    this.keepAliveForNavigation = keep;
  }

  shouldKeepAliveForNavigation(): boolean {
    return this.keepAliveForNavigation;
  }

  /**
   * Stops all active camera tracks immediately.
   */
  stopCamera() {
    this.keepAliveForNavigation = false;
    if (this.stream) {
      try {
        this.stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (_) {
            // ignore
          }
        });
      } catch (_) {
        // ignore
      }
      this.stream = null;
    }
  }

  /**
   * Analyzes a single frame from a <video> element using COCO-SSD and BlazeFace.
   */
  async analyzeFrame(videoEl: HTMLVideoElement | null): Promise<FrameCheckResult> {
    if (!this.stream) {
      return {
        faceCount: 0,
        phoneDetected: false,
        bookDetected: false,
        laptopDetected: false,
        cameraTrackDeadOrMuted: true,
        isFrameDarkOrBlocked: false,
        detectedObjects: [],
      };
    }

    const videoTracks = this.stream.getVideoTracks();
    const primaryTrack = videoTracks[0];
    const trackDeadOrMuted =
      !primaryTrack ||
      primaryTrack.readyState === 'ended' ||
      primaryTrack.muted ||
      !primaryTrack.enabled;

    if (
      trackDeadOrMuted ||
      !videoEl ||
      videoEl.readyState < 2 ||
      videoEl.videoWidth === 0 ||
      videoEl.videoHeight === 0
    ) {
      return {
        faceCount: 0,
        phoneDetected: false,
        bookDetected: false,
        laptopDetected: false,
        cameraTrackDeadOrMuted: trackDeadOrMuted,
        isFrameDarkOrBlocked: false,
        detectedObjects: [],
      };
    }

    // Check if camera is physically covered / black frame
    let isFrameDarkOrBlocked = false;
    try {
      const sampleCanvas = document.createElement('canvas');
      sampleCanvas.width = 32;
      sampleCanvas.height = 24;
      const ctx = sampleCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoEl, 0, 0, 32, 24);
        const imgData = ctx.getImageData(0, 0, 32, 24).data;
        let totalLum = 0;
        const pixelCount = imgData.length / 4;
        for (let i = 0; i < imgData.length; i += 4) {
          totalLum += 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2];
        }
        const avgLum = totalLum / pixelCount;
        if (avgLum < 8) {
          isFrameDarkOrBlocked = true;
        }
      }
    } catch (_) {
      // ignore canvas check errors
    }

    await this.loadModels();

    const [predictions, faces] = await Promise.all([
      this.cocoModel ? this.cocoModel.detect(videoEl) : Promise.resolve([]),
      this.faceModel ? this.faceModel.estimateFaces(videoEl, false) : Promise.resolve([]),
    ]);

    const relevantObjects = predictions
      .filter((p) => ['cell phone', 'book', 'laptop'].includes(p.class) && p.score >= 0.45)
      .map((p) => ({ class: p.class, score: Math.round(p.score * 100) / 100 }));

    const phoneDetected = relevantObjects.some((o) => o.class === 'cell phone');
    const bookDetected = relevantObjects.some((o) => o.class === 'book');
    const laptopDetected = relevantObjects.some((o) => o.class === 'laptop');

    return {
      faceCount: isFrameDarkOrBlocked ? 0 : faces.length,
      phoneDetected,
      bookDetected,
      laptopDetected,
      cameraTrackDeadOrMuted: trackDeadOrMuted,
      isFrameDarkOrBlocked,
      detectedObjects: relevantObjects,
    };
  }

  /**
   * Captures a small, low-quality JPEG snapshot (max 320px wide) at the moment of a violation.
   */
  captureSnapshot(videoEl: HTMLVideoElement | null): string | null {
    if (!videoEl || videoEl.videoWidth === 0 || videoEl.videoHeight === 0) {
      return null;
    }

    try {
      const maxWidth = 320;
      const scale = Math.min(1, maxWidth / videoEl.videoWidth);
      const width = Math.round(videoEl.videoWidth * scale);
      const height = Math.round(videoEl.videoHeight * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.drawImage(videoEl, 0, 0, width, height);
      return canvas.toDataURL('image/jpeg', 0.45);
    } catch (err) {
      console.error('Failed to capture proctor snapshot:', err);
      return null;
    }
  }
}

export const proctorCamera = new ProctorCameraManager();

