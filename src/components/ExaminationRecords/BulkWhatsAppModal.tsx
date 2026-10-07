import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Play, 
  Square, 
  Copy, 
  Check, 
  AlertCircle, 
  Phone, 
  Sparkles,
  CheckCircle2,
  Users
} from 'lucide-react';
import { ExaminationRecord, SchoolInfo, Student } from '../../types';
import { getGradeRemark } from '../../utils/examinationRecordsUtils';

interface BulkWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: ExaminationRecord[];
  students: Student[];
  schoolInfo: SchoolInfo;
}

interface WhatsAppQueueItem {
  record: ExaminationRecord;
  phone: string;
  status: 'PENDING' | 'SENDING' | 'SENT' | 'FAILED';
  formattedMessage: string;
}

export const BulkWhatsAppModal: React.FC<BulkWhatsAppModalProps> = ({
  isOpen,
  onClose,
  records,
  students,
  schoolInfo
}) => {
  const [queue, setQueue] = useState<WhatsAppQueueItem[]>([]);
  const [isAutoSending, setIsAutoSending] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [copiedAll, setCopiedAll] = useState(false);
  const timerRef = useRef<any>(null);

  // Generate queue from records
  useEffect(() => {
    if (!isOpen) return;

    const initialQueue: WhatsAppQueueItem[] = records.map(rec => {
      const student = students.find(s => s.id === rec.studentId);
      const phone = rec.parentPhone || student?.parentPhone || student?.phone || '';

      // Format subject marks list: Math: 85/100 (A), English: 78 (B+)...
      const subjectStrings: string[] = [];
      if (rec.subjects) {
        Object.entries(rec.subjects).forEach(([subName, info]) => {
          subjectStrings.push(`${subName}: ${info.marks}/100 (${info.grade})`);
        });
      }
      const subjectsText = subjectStrings.length > 0 ? subjectStrings.join(', ') : 'No subjects recorded';

      const pointsStr = rec.points !== undefined && rec.points !== null ? String(rec.points) : '-';
      const divStr = rec.division || rec.overallGrade || '-';
      const remarks = getGradeRemark(rec.overallGrade);

      const streamText = rec.stream ? `Stream ${rec.stream}` : '';
      const formattedMessage = `HABY EDUPRO - ${schoolInfo.name.toUpperCase()}
Name: ${rec.studentName} Class: ${rec.className} ${streamText} Year: ${rec.academicYear} Term: ${rec.term} Exam: ${rec.examType}
${subjectsText}
Total: ${rec.totalMarks} Avg: ${rec.averageMarks}% Points: ${pointsStr} Div: ${divStr} Pos: ${rec.positionInClass}/${rec.totalStudents} Remarks: ${remarks}`;

      return {
        record: rec,
        phone,
        status: 'PENDING',
        formattedMessage
      };
    });

    setQueue(initialQueue);
    setCurrentIndex(0);
    setIsAutoSending(false);
  }, [isOpen, records, students, schoolInfo]);

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const handlePhoneChange = (index: number, val: string) => {
    setQueue(prev => {
      const next = [...prev];
      next[index] = { ...next[index], phone: val };
      return next;
    });
  };

  const cleanPhone = (phone: string): string => {
    let p = phone.replace(/[^0-9]/g, '');
    if (p.startsWith('0')) {
      p = '255' + p.substring(1);
    } else if (p.length === 9) {
      p = '255' + p;
    }
    return p;
  };

  const sendSingleWhatsApp = (index: number) => {
    const item = queue[index];
    if (!item) return;

    const phoneDigits = cleanPhone(item.phone);
    const url = phoneDigits 
      ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(item.formattedMessage)}`
      : `https://wa.me/?text=${encodeURIComponent(item.formattedMessage)}`;

    window.open(url, '_blank');

    setQueue(prev => {
      const next = [...prev];
      next[index] = { ...next[index], status: 'SENT' };
      return next;
    });
  };

  // Start 2-second interval auto sender
  const handleStartAutoSend = () => {
    if (queue.length === 0) return;
    setIsAutoSending(true);

    let idx = currentIndex;
    // Find next pending
    while (idx < queue.length && queue[idx].status === 'SENT') {
      idx++;
    }

    if (idx >= queue.length) {
      setIsAutoSending(false);
      return;
    }

    // Send first immediately
    sendSingleWhatsApp(idx);
    setCurrentIndex(idx + 1);

    // Setup 2-second interval for subsequent items
    timerRef.current = setInterval(() => {
      setCurrentIndex(prevIdx => {
        let nextIdx = prevIdx;
        while (nextIdx < queue.length && queue[nextIdx].status === 'SENT') {
          nextIdx++;
        }

        if (nextIdx >= queue.length) {
          clearInterval(timerRef.current);
          setIsAutoSending(false);
          return queue.length;
        }

        sendSingleWhatsApp(nextIdx);
        return nextIdx + 1;
      });
    }, 2000);
  };

  const handleStopAutoSend = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsAutoSending(false);
  };

  const handleCopyAll = () => {
    const allText = queue.map((item, idx) => `=== CANDIDATE ${idx + 1}: ${item.record.studentName} ===\n${item.formattedMessage}\n`).join('\n');
    navigator.clipboard.writeText(allText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 3000);
  };

  const sentCount = queue.filter(q => q.status === 'SENT').length;
  const progressPct = queue.length > 0 ? Math.round((sentCount / queue.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-700 via-green-700 to-emerald-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Send className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>Send Bulk Results to WhatsApp</span>
                <span className="text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                  Whole Class ({queue.length} Candidates)
                </span>
              </h2>
              <p className="text-xs text-emerald-100">
                Automatic sequential dispatch with subject scores, total, average, points, division & class ranking
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls & Progress Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {!isAutoSending ? (
              <button
                type="button"
                onClick={handleStartAutoSend}
                disabled={sentCount === queue.length}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Auto-Send Whole Class (2s Delay)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStopAutoSend}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Pause Auto-Send</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyAll}
              className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            >
              {copiedAll ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedAll ? 'Copied to Clipboard!' : 'Copy All Messages'}</span>
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs font-bold text-slate-800">
                {sentCount} of {queue.length} Sent
              </span>
              <span className="text-[10px] text-slate-500 block">
                {progressPct}% Completed
              </span>
            </div>
            <div className="w-28 h-3 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Queue Table */}
        <div className="overflow-y-auto p-4 flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="p-3 w-12 text-center">#</th>
                <th className="p-3">Student Name</th>
                <th className="p-3">Class & Stream</th>
                <th className="p-3">Parent Phone</th>
                <th className="p-3">Division & Points</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {queue.map((item, idx) => {
                const isSent = item.status === 'SENT';
                return (
                  <tr key={item.record.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 text-center text-slate-500 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="p-3 font-bold text-slate-900">
                      {item.record.studentName}
                    </td>
                    <td className="p-3 text-slate-600">
                      {item.record.className} {item.record.stream ? `(${item.record.stream})` : ''}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          value={item.phone}
                          onChange={(e) => handlePhoneChange(idx, e.target.value)}
                          placeholder="e.g. 0754000111"
                          className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono w-32 focus:bg-white focus:ring-1 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-800 font-bold rounded text-[10px]">
                          Div {item.record.division || item.record.overallGrade}
                        </span>
                        {item.record.points !== undefined && item.record.points !== null && (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded text-[10px]">
                            {item.record.points} pts
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isSent 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => sendSingleWhatsApp(idx)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 w-full cursor-pointer ${
                          isSent
                            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                        }`}
                      >
                        <Send className="w-3 h-3" />
                        <span>{isSent ? 'Resend' : 'Send'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            Messages include full breakdown of marks, NECTA points, and student rankings.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
