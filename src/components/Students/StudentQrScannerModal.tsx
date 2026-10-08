import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  X, 
  QrCode, 
  CheckCircle2, 
  UserCheck, 
  AlertTriangle, 
  User, 
  Phone, 
  ShieldAlert, 
  Calendar, 
  Clock, 
  Upload, 
  RefreshCcw, 
  Volume2, 
  Zap,
  Check,
  Award
} from 'lucide-react';
import jsQR from 'jsqr';
import { Student, SchoolInfo } from '../../types';

interface StudentQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  schoolInfo?: SchoolInfo;
  onLogAttendance?: (studentId: number, status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED') => void;
  onLogDiscipline?: (student: Student) => void;
  onViewStudentProfile?: (student: Student) => void;
}

export const StudentQrScannerModal: React.FC<StudentQrScannerModalProps> = ({
  isOpen,
  onClose,
  students,
  schoolInfo,
  onLogAttendance,
  onLogDiscipline,
  onViewStudentProfile
}) => {
  if (!isOpen) return null;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [matchedStudent, setMatchedStudent] = useState<Student | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<string | null>(null);
  const [useFacingMode, setUseFacingMode] = useState<'environment' | 'user'>('environment');

  // Play audio chime when scanned
  const playScanBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch {}
  };

  // Process raw scanned QR code text
  const processQrCodeData = (dataStr: string) => {
    if (!dataStr || dataStr === lastScannedCode) return;
    
    setLastScannedCode(dataStr);

    let found: Student | undefined;

    // 1. Check if payload contains studentId parameter (e.g. ?studentId=123 or studentId:123)
    const idMatch = dataStr.match(/studentId[=:]\s*(\d+)/i) || dataStr.match(/[?&]id=(\d+)/i);
    if (idMatch && idMatch[1]) {
      const targetId = Number(idMatch[1]);
      found = students.find(s => s.id === targetId);
    }

    // 2. Check if payload contains registration number (e.g. RegNo or S.0123/2026)
    if (!found) {
      const regMatch = dataStr.match(/([A-Z0-9.\-/]{3,20})/gi);
      if (regMatch) {
        for (const token of regMatch) {
          const matched = students.find(s => 
            (s.regNo && s.regNo.toLowerCase() === token.toLowerCase()) ||
            (s.regNo && token.toLowerCase().includes(s.regNo.toLowerCase())) ||
            String(s.id) === token
          );
          if (matched) {
            found = matched;
            break;
          }
        }
      }
    }

    // 3. Fallback direct match on ID or name
    if (!found) {
      found = students.find(s => 
        String(s.id) === dataStr.trim() || 
        (s.regNo && s.regNo.toLowerCase() === dataStr.toLowerCase().trim()) ||
        s.name.toLowerCase() === dataStr.toLowerCase().trim()
      );
    }

    if (found) {
      playScanBeep();
      setMatchedStudent(found);
      setAttendanceStatus(null);
    }
  };

  // Camera video loop scanner
  useEffect(() => {
    let animationFrameId: number;
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      setCameraError(null);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: useFacingMode,
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();
          setCameraActive(true);

          const scanFrame = () => {
            if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
              const video = videoRef.current;
              const canvas = canvasRef.current || document.createElement('canvas');
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              const ctx = canvas.getContext('2d', { willReadFrequently: true });

              if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                  inversionAttempts: 'dontInvert'
                });

                if (code && code.data) {
                  processQrCodeData(code.data);
                }
              }
            }
            animationFrameId = requestAnimationFrame(scanFrame);
          };

          animationFrameId = requestAnimationFrame(scanFrame);
        }
      } catch (err: any) {
        console.warn('Camera stream error:', err);
        setCameraActive(false);
        setCameraError(
          err.name === 'NotAllowedError' 
            ? 'Camera access denied. Please grant camera permission in your browser.' 
            : 'Camera unavailable or in use by another app. You can also upload a QR image below.'
        );
      }
    };

    startCamera();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [useFacingMode]);

  // Handle file upload fallback for QR scanner
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            processQrCodeData(code.data);
          } else {
            alert('No valid student QR code detected in the uploaded image.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleQuickAttendance = (status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED') => {
    if (!matchedStudent) return;
    
    if (onLogAttendance) {
      onLogAttendance(matchedStudent.id, status);
    }

    setAttendanceStatus(status);
    playScanBeep();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl my-auto overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400 text-slate-950 rounded-2xl shadow-md">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>Student QR Camera Scanner</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-400 text-slate-950">
                  Live Stream
                </span>
              </h2>
              <p className="text-xs text-blue-200">
                Scan Student ID Cards or Badges for instant profile lookup, rapid attendance &amp; discipline logging.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Viewport & Matched Student Display */}
        <div className="p-5 space-y-5 bg-slate-50">
          {/* Camera Viewport Container */}
          {!matchedStudent && (
            <div className="relative bg-slate-950 rounded-2xl overflow-hidden aspect-4/3 flex flex-col items-center justify-center border-2 border-slate-800 shadow-inner group">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Scanning Target Overlay */}
              {cameraActive && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                  {/* Outer Dimmed Layer */}
                  <div className="w-56 h-56 border-2 border-amber-400 rounded-2xl relative shadow-[0_0_0_9999px_rgba(15,23,42,0.6)] flex items-center justify-center">
                    {/* Animated Scanning Line */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-amber-400 via-rose-500 to-amber-400 absolute top-0 animate-[ping_2s_infinite_ease-in-out] shadow-md" />
                    
                    {/* Corner Target Accents */}
                    <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
                    <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
                    <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />

                    <span className="text-[11px] font-black text-amber-300 bg-slate-900/90 px-3 py-1 rounded-full border border-amber-400/40 uppercase tracking-wider animate-pulse">
                      Align QR Code Here
                    </span>
                  </div>
                </div>
              )}

              {/* Camera Error / Fallback */}
              {cameraError && (
                <div className="p-6 text-center text-white space-y-3 max-w-sm">
                  <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-200">{cameraError}</p>
                </div>
              )}

              {/* Camera Controls Overlay */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                <button
                  type="button"
                  onClick={() => setUseFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
                  className="px-3 py-1.5 bg-slate-900/80 hover:bg-slate-900 backdrop-blur-md text-white rounded-xl font-bold flex items-center gap-1.5 border border-white/20 transition cursor-pointer"
                >
                  <RefreshCcw className="w-3.5 h-3.5 text-amber-300" />
                  <span>Switch Camera ({useFacingMode === 'environment' ? 'Back' : 'Front'})</span>
                </button>

                <label className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 border border-blue-400/40 transition cursor-pointer shadow-md">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload QR Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {/* MATCHED STUDENT CARD & RAPID ACTIONS */}
          {matchedStudent && (
            <div className="bg-white border-2 border-emerald-400 rounded-2xl p-5 shadow-lg space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Student Match Found &amp; Verified</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMatchedStudent(null);
                    setLastScannedCode(null);
                  }}
                  className="px-3 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCcw className="w-3 h-3" />
                  <span>Scan Next Student</span>
                </button>
              </div>

              {/* Student Particulars Bar */}
              <div className="flex items-center gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="w-16 h-20 bg-white border border-slate-300 rounded-lg overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                  {matchedStudent.passportPhoto ? (
                    <img 
                      src={matchedStudent.passportPhoto} 
                      alt={matchedStudent.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-slate-400 stroke-1" />
                  )}
                </div>

                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-slate-900 text-sm truncate">{matchedStudent.name}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-900 border border-blue-200 shrink-0">
                      {matchedStudent.regNo || `ID-${matchedStudent.id}`}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-bold">
                    Class: <span className="text-blue-900">{matchedStudent.className}</span> {matchedStudent.stream ? `- ${matchedStudent.stream}` : ''}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                    <span>Gender: <strong>{matchedStudent.gender || 'N/A'}</strong></span>
                    {matchedStudent.parentPhone && (
                      <span className="flex items-center gap-1 text-emerald-800">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        {matchedStudent.parentPhone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Attendance Logged Notification */}
              {attendanceStatus && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 font-extrabold text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Attendance status marked as <strong>{attendanceStatus}</strong> for today!</span>
                </div>
              )}

              {/* Action Buttons: Attendance, Discipline & Profile */}
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                  Rapid Actions for Academic Master / Duty Teacher:
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleQuickAttendance('PRESENT')}
                    className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex flex-col items-center justify-center gap-1 shadow-xs cursor-pointer transition active:scale-95"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>✓ Mark Present</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickAttendance('LATE')}
                    className="p-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-extrabold flex flex-col items-center justify-center gap-1 shadow-xs cursor-pointer transition active:scale-95"
                  >
                    <Clock className="w-4 h-4" />
                    <span>🕒 Mark Late</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickAttendance('ABSENT')}
                    className="p-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex flex-col items-center justify-center gap-1 shadow-xs cursor-pointer transition active:scale-95"
                  >
                    <X className="w-4 h-4" />
                    <span>✗ Mark Absent</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickAttendance('EXCUSED')}
                    className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex flex-col items-center justify-center gap-1 shadow-xs cursor-pointer transition active:scale-95"
                  >
                    <Award className="w-4 h-4" />
                    <span>⭐ Excused</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {onLogDiscipline && (
                    <button
                      type="button"
                      onClick={() => {
                        onLogDiscipline(matchedStudent);
                        onClose();
                      }}
                      className="p-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-900 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      <span>Log Discipline Record</span>
                    </button>
                  )}

                  {onViewStudentProfile && (
                    <button
                      type="button"
                      onClick={() => {
                        onViewStudentProfile(matchedStudent);
                        onClose();
                      }}
                      className="p-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-900 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      <User className="w-4 h-4 text-blue-600" />
                      <span>View Full Profile &amp; Report</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Haby Edu Pro • Official Student Identity &amp; Attendance Module</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 cursor-pointer"
          >
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
};
