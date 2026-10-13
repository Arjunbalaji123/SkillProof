import React, { useState, useEffect, useRef } from 'react';
import { proctorCamera, FrameCheckResult } from '../services/proctorCamera';
import {
  Camera,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lock,
  Play,
  RefreshCw,
  Eye,
  Smartphone,
  BookOpen,
  UserCheck,
} from 'lucide-react';

interface ProctorConsentModalProps {
  skillName: string;
  isOpen: boolean;
  isStarting: boolean;
  onCancel: () => void;
  onConfirmStart: () => void;
}

export const ProctorConsentModal: React.FC<ProctorConsentModalProps> = ({
  skillName,
  isOpen,
  isStarting,
  onCancel,
  onConfirmStart,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [consented, setConsented] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [checkState, setCheckState] = useState<FrameCheckResult | null>(null);
  const [hasPassedCheck, setHasPassedCheck] = useState(false);

  // Stop camera if modal closes without starting assessment
  useEffect(() => {
    if (!isOpen) {
      if (!proctorCamera.shouldKeepAliveForNavigation()) {
        proctorCamera.stopCamera();
      }
      setCameraActive(false);
      setCameraError(null);
      setCheckState(null);
      setHasPassedCheck(false);
    }
  }, [isOpen]);

  const handleEnableCamera = async () => {
    setCameraError(null);
    setModelsLoading(true);
    try {
      const stream = await proctorCamera.startCamera();
      setCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      await proctorCamera.loadModels();
      setModelsReady(true);
    } catch (err: any) {
      setCameraError(
        err?.message || 'Camera permission was denied or no camera was detected.'
      );
      setCameraActive(false);
    } finally {
      setModelsLoading(false);
    }
  };

  // Attach stream whenever videoRef mounts and camera is active
  useEffect(() => {
    const stream = proctorCamera.getStream();
    if (cameraActive && stream && videoRef.current && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraActive]);

  // Run pre-start environment check every 800ms once camera & models are ready
  useEffect(() => {
    if (!isOpen || !cameraActive || !modelsReady) return;

    let cancelled = false;
    const interval = setInterval(async () => {
      if (cancelled || !videoRef.current) return;
      try {
        const res = await proctorCamera.analyzeFrame(videoRef.current);
        if (cancelled) return;
        setCheckState(res);

        const passed =
          !res.cameraTrackDeadOrMuted &&
          !res.isFrameDarkOrBlocked &&
          res.faceCount === 1 &&
          !res.phoneDetected &&
          !res.bookDetected;

        if (passed) {
          setHasPassedCheck(true);
        } else {
          setHasPassedCheck(false);
        }
      } catch (_) {
        // ignore transient frame errors
      }
    }, 800);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isOpen, cameraActive, modelsReady]);

  if (!isOpen) return null;

  const isSingleFaceOk = checkState ? checkState.faceCount === 1 : false;
  const isNoPhoneOk = checkState ? !checkState.phoneDetected : false;
  const isNoBookOk = checkState ? !checkState.bookDetected : false;
  const isCameraClear = checkState
    ? !checkState.cameraTrackDeadOrMuted && !checkState.isFrameDarkOrBlocked
    : false;

  const canStart = consented && cameraActive && modelsReady && hasPassedCheck && !isStarting;

  const handleCancelClick = () => {
    proctorCamera.stopCamera();
    onCancel();
  };

  const handleStartClick = () => {
    if (!canStart) return;
    proctorCamera.setKeepAliveForNavigation(true);
    onConfirmStart();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 flex-shrink-0">
              <Camera size={24} />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-600">
                AI Proctored Benchmark
              </span>
              <h2 className="text-xl font-black text-[#0F172A]">
                Camera Consent &amp; Environment Setup — {skillName}
              </h2>
            </div>
          </div>
          <button
            onClick={handleCancelClick}
            className="text-xs font-bold text-slate-400 hover:text-slate-700 px-2 py-1"
          >
            ✕
          </button>
        </div>

        {/* Consent & Privacy Disclosure */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <p className="font-bold text-[#0F172A] flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-emerald-600" />
              Processed Locally in Browser
            </p>
            <p className="text-slate-600 leading-relaxed">
              Camera is required. Your live video stream is analyzed 100% locally in your browser using TensorFlow.js and is <strong>never uploaded</strong>.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <p className="font-bold text-[#0F172A] flex items-center gap-1.5">
              <Eye size={15} className="text-blue-600" />
              Violation Snapshots (30-Day Retention)
            </p>
            <p className="text-slate-600 leading-relaxed">
              Only a small, low-resolution JPEG snapshot (max 320px wide) is saved when a violation occurs. Kept for <strong>30 days</strong> for admin review only.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1 sm:col-span-2">
            <p className="font-bold text-amber-950 flex items-center gap-1.5">
              <AlertTriangle size={15} className="text-amber-600" />
              Proctoring Rules: 2 Warnings, Then 2-Day Skill Lockout
            </p>
            <p className="text-amber-900 leading-relaxed">
              Violations are raised if a <strong>cell phone</strong> or <strong>book</strong> is detected (3 consecutive checks), <strong>no face or 2+ faces</strong> appear (5 consecutive checks), or your <strong>camera is turned off/muted</strong> (&gt;15s). You receive <strong>2 warnings</strong>; a <strong>3rd violation terminates the test</strong> (no score, no verification) and locks this skill for <strong>2 days</strong>.
            </p>
          </div>
        </div>

        {/* Live Camera Preview & Real-Time Check */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center bg-slate-900 rounded-2xl p-4 text-white">
          <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transform scale-x-[-1] ${
                cameraActive ? 'block' : 'hidden'
              }`}
            />
            {!cameraActive && (
              <div className="text-center p-4 space-y-2">
                <Camera size={32} className="mx-auto text-slate-500" />
                <p className="text-xs text-slate-400">
                  Click &ldquo;Enable Camera &amp; Run Check&rdquo; below to start your webcam preview.
                </p>
                <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                  <Lock size={10} /> Requires HTTPS in production (localhost supported in dev)
                </p>
              </div>
            )}
            {cameraActive && (
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 text-[10px] font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                LIVE LOCAL FEED
              </div>
            )}
          </div>

          {/* Environment Checklist */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
                Pre-Start Environment Check
              </h4>
              {modelsLoading && (
                <span className="text-[11px] text-blue-400 flex items-center gap-1 font-bold">
                  <RefreshCw size={12} className="animate-spin" /> Loading AI models...
                </span>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="flex items-center gap-2">
                  <Camera size={14} className="text-blue-400" /> Camera Unobstructed
                </span>
                {checkState ? (
                  isCameraClear ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 size={14} /> Clear
                    </span>
                  ) : (
                    <span className="text-red-400 font-bold flex items-center gap-1">
                      <XCircle size={14} /> Blocked/Off
                    </span>
                  )
                ) : (
                  <span className="text-slate-500">Waiting...</span>
                )}
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="flex items-center gap-2">
                  <UserCheck size={14} className="text-blue-400" /> One Face Visible
                </span>
                {checkState ? (
                  isSingleFaceOk ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 size={14} /> 1 Face Detected
                    </span>
                  ) : (
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      <XCircle size={14} /> {checkState.faceCount} Faces
                    </span>
                  )
                ) : (
                  <span className="text-slate-500">Waiting...</span>
                )}
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="flex items-center gap-2">
                  <Smartphone size={14} className="text-blue-400" /> No Cell Phone
                </span>
                {checkState ? (
                  isNoPhoneOk ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 size={14} /> Clear
                    </span>
                  ) : (
                    <span className="text-red-400 font-bold flex items-center gap-1">
                      <XCircle size={14} /> Phone Detected!
                    </span>
                  )
                ) : (
                  <span className="text-slate-500">Waiting...</span>
                )}
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="flex items-center gap-2">
                  <BookOpen size={14} className="text-blue-400" /> No Book / Notes
                </span>
                {checkState ? (
                  isNoBookOk ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 size={14} /> Clear
                    </span>
                  ) : (
                    <span className="text-red-400 font-bold flex items-center gap-1">
                      <XCircle size={14} /> Book Detected!
                    </span>
                  )
                ) : (
                  <span className="text-slate-500">Waiting...</span>
                )}
              </div>
            </div>

            {!cameraActive && (
              <button
                type="button"
                onClick={handleEnableCamera}
                disabled={modelsLoading}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md disabled:opacity-50"
              >
                <Camera size={15} />
                {modelsLoading ? 'Initializing Camera & AI...' : 'Enable Camera & Run Check'}
              </button>
            )}
          </div>
        </div>

        {/* Permission / Camera Error Alert */}
        {cameraError && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Camera Check Failed</p>
                <p className="mt-0.5">{cameraError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleEnableCamera}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex-shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Consent Checkbox */}
        <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-xs text-[#0F172A] leading-relaxed">
            I consent to local browser camera proctoring and understand that <strong>no video is uploaded</strong>, a small low-quality snapshot is saved for 30 days only when a violation occurs, and <strong>3 violations result in test termination and a 2-day lockout</strong> for {skillName}.
          </span>
        </label>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleCancelClick}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleStartClick}
            disabled={!canStart}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-md ${
              canStart
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Play size={14} />
            {isStarting
              ? 'Starting Assessment...'
              : hasPassedCheck
              ? 'Start Proctored Assessment'
              : 'Complete Camera Check to Start'}
          </button>
        </div>
      </div>
    </div>
  );
};

