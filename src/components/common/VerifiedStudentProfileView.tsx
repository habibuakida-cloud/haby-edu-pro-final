import React from 'react';
import { Student, SchoolInfo } from '../../types';
import { ShieldCheck, User, Calendar, Phone, GraduationCap, CheckCircle2, ArrowLeft, Printer, ExternalLink, QrCode } from 'lucide-react';
import { HabyEduProLogo } from './HabyEduProLogo';
import { QRCodeSVG } from 'qrcode.react';

interface VerifiedStudentProfileViewProps {
  regNo: string;
  students: Student[];
  schoolInfo: SchoolInfo;
  onBackToMain: () => void;
}

export const VerifiedStudentProfileView: React.FC<VerifiedStudentProfileViewProps> = ({
  regNo,
  students,
  schoolInfo,
  onBackToMain
}) => {
  const student = students.find(s => s.regNo.toLowerCase() === regNo.toLowerCase().trim());
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-xl bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Verification Header Banner */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 border-b-4 border-amber-400 relative">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-2xl border border-white/20 shrink-0">
                {schoolInfo.logo ? (
                  <img src={schoolInfo.logo} alt="Logo" className="w-10 h-10 object-contain rounded" />
                ) : (
                  <HabyEduProLogo theme="dark" size="sm" variant="icon" />
                )}
              </div>
              <div>
                <h1 className="font-black text-base sm:text-lg tracking-wide uppercase leading-tight">
                  {schoolInfo.name || 'HABY EDU PRO SCHOOL'}
                </h1>
                <p className="text-xs text-blue-200 font-medium">
                  {schoolInfo.address || 'P.O. Box 1234, Tanga, Tanzania'}
                </p>
              </div>
            </div>

            <button
              onClick={onBackToMain}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition cursor-pointer shrink-0"
              title="Return to Main Application"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 px-3 py-1.5 rounded-full text-xs font-bold w-fit">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>OFFICIAL VERIFIED DIGITAL STUDENT RECORD</span>
          </div>
        </div>

        {/* Profile Content */}
        {!student ? (
          <div className="p-10 text-center space-y-4">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <User className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Student Record Not Found</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No registered candidate matches the provided registration number: <strong className="font-mono text-slate-800">{regNo}</strong>. Please verify the ID badge QR code.
            </p>
            <button
              onClick={onBackToMain}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition"
            >
              Go to School Portal
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            
            {/* Student Top Summary */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="w-28 h-32 bg-slate-200 rounded-xl border-2 border-slate-300 overflow-hidden shrink-0 shadow-sm flex items-center justify-center">
                {student.passportPhoto ? (
                  <img src={student.passportPhoto} alt={student.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-slate-400" />
                )}
              </div>

              <div className="flex-1 text-center sm:text-left space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-mono font-bold text-xs border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>REG: {student.regNo}</span>
                </div>
                <h2 className="text-xl font-black text-slate-900 leading-tight">{student.name}</h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs font-bold text-slate-600">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-md">
                    {student.className} {student.stream || 'A'}
                  </span>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-md">
                    Level: {student.level}
                  </span>
                </div>
              </div>

              {/* Verified QR Seal */}
              <div className="shrink-0 p-2 bg-white border border-slate-200 rounded-xl shadow-2xs text-center hidden sm:block">
                <QRCodeSVG value={currentUrl} size={64} level="M" />
                <span className="block text-[8px] font-black text-slate-400 uppercase mt-1">VERIFIED BADGE</span>
              </div>
            </div>

            {/* Candidate Attribute Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Gender / Jinsi</p>
                <p className="font-bold text-slate-800 mt-0.5">{student.gender || 'Not specified'}</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Date of Birth</p>
                <p className="font-mono font-bold text-slate-800 mt-0.5">{student.dob || '2010-01-01'}</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Parent / Guardian Contact</p>
                <p className="font-mono font-bold text-blue-900 mt-0.5">{student.parentPhone || student.phone || '0754 000 111'}</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Status / Hali Ya Usajili</p>
                <p className="font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Active Registered Candidate</span>
                </p>
              </div>
            </div>

            {/* Official Seal / Signature Footer */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs">
              <div className="text-left">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Issued By Authority</p>
                <p className="font-black text-slate-800">{schoolInfo.name || 'HABY EDU PRO SCHOOL'}</p>
              </div>

              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Head of Institution</p>
                <p className="font-bold text-slate-800 italic">{schoolInfo.principal || 'Mwl. H. Akida'}</p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Record</span>
              </button>

              <button
                onClick={onBackToMain}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Enter School Portal
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
