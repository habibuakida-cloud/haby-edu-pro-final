import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, RefreshCw, Zap, Check } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (photoDataUrl: string) => void;
  title?: string;
  guideText?: string;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Live Passport Photo Capture',
  guideText = 'Align the student face within the passport guide frame below.'
}) => {
  if (!isOpen) return null;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [useFacingMode, setUseFacingMode] = useState<'user' | 'environment'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      setCameraError(null);
      setCameraActive(false);
      
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: useFacingMode,
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      };

      try {
        // Try optimal constraints first
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr: any) {
        console.warn('Optimal camera constraints failed, attempting fallback constraints:', firstErr);
        try {
          // Fallback constraints: simpler and widely supported on older smart phones and custom browsers
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: useFacingMode },
            audio: false
          });
        } catch (err: any) {
          console.warn('All camera initialization attempts failed:', err);
          setCameraActive(false);
          setCameraError(
            err.name === 'NotAllowedError'
              ? 'Camera access denied. Please grant camera permission in your browser.'
              : 'Live camera is unavailable or in use by another application.'
          );
          return;
        }
      }

      try {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('autoplay', 'true');
          await videoRef.current.play();
          setCameraActive(true);
        }
      } catch (playErr) {
        console.error('Error playing camera video stream:', playErr);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [useFacingMode]);

  // Capture current frame from video and crop to 3.5 : 4.5 ratio
  const handleSnap = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    
    // Set target resolution for student passport (350x450 px)
    const targetW = 350;
    const targetH = 450;
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Calculate crop coordinates from center to match 3.5:4.5 passport size aspect ratio
      const videoW = video.videoWidth;
      const videoH = video.videoHeight;
      const aspect = targetW / targetH; // 0.777

      let sourceW = videoW;
      let sourceH = videoW / aspect;

      if (sourceH > videoH) {
        sourceH = videoH;
        sourceW = videoH * aspect;
      }

      const sourceX = (videoW - sourceW) / 2;
      const sourceY = (videoH - sourceH) / 2;

      // Draw cropped image
      ctx.drawImage(video, sourceX, sourceY, sourceW, sourceH, 0, 0, targetW, targetH);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(dataUrl);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCapturedImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Camera className="w-5 h-5 text-amber-400" />
            <span className="font-black text-sm tracking-tight uppercase">{title}</span>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-xl transition text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="p-5 flex flex-col items-center justify-center space-y-4">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
            {guideText}
          </p>

          <div className="relative w-64 h-80 bg-slate-950 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border-2 border-slate-200">
            {capturedImage ? (
              /* Display captured image */
              <img src={capturedImage} alt="Captured Student" className="w-full h-full object-cover" />
            ) : (
              /* Live Camera Stream */
              <>
                <video
                  ref={videoRef}
                  className={`w-full h-full object-cover ${useFacingMode === 'user' ? 'transform scale-x-[-1]' : ''}`}
                  muted
                />
                
                {/* Passport Framing Guide Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-[180px] h-[230px] border-4 border-dashed border-amber-400/80 rounded-[40px] relative shadow-[0_0_0_9999px_rgba(15,23,42,0.5)]">
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-amber-400 text-slate-950 text-[8px] font-black rounded uppercase tracking-wider whitespace-nowrap shadow-xs">
                      Align Face Here
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Error Message if any */}
            {cameraError && !capturedImage && (
              <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
                <X className="w-10 h-10 text-rose-500" />
                <p className="text-xs font-black text-slate-200">{cameraError}</p>
                <p className="text-[10px] text-slate-400 leading-snug">Please grant camera permission or use device native camera below:</p>
                <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-md">
                  <Camera className="w-4 h-4" />
                  <span>Choose Photo / Use Camera</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="w-full pt-2 flex items-center justify-center gap-2 flex-wrap">
            {capturedImage ? (
              /* Capture review options */
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Retake Photo
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <Check className="w-4 h-4" />
                  Apply Student Photo
                </button>
              </>
            ) : (
              /* Live Streaming controls */
              <>
                {cameraActive && (
                  <button
                    type="button"
                    onClick={() => setUseFacingMode(useFacingMode === 'user' ? 'environment' : 'user')}
                    className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    title="Switch between front selfie and rear smartphone camera"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Flip Camera</span>
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={handleSnap}
                  disabled={!cameraActive}
                  className={`px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md ${
                    cameraActive ? 'hover:bg-blue-700 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  Take Snapshot
                </button>

                <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-md">
                  <RefreshCw className="w-4 h-4" />
                  <span>Upload / Use Phone Camera</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
