import React from 'react';
import { Calendar, Clock, ArrowRight, ShieldCheck, Info, Sparkles, MapPin } from 'lucide-react';
import { AcademicTermDates } from '../../types';

interface TermCalendarViewProps {
  academicTermDates?: AcademicTermDates;
  onUpdateAcademicTermDates?: (dates: AcademicTermDates) => void;
}

export const TermCalendarView: React.FC<TermCalendarViewProps> = ({
  academicTermDates = {},
  onUpdateAcademicTermDates
}) => {
  const handleChange = (field: keyof AcademicTermDates, value: string) => {
    if (onUpdateAcademicTermDates) {
      onUpdateAcademicTermDates({
        ...academicTermDates,
        [field]: value
      });
    }
  };

  const calendarEvents = [
    { 
      id: 'opening', 
      title: 'Kufungua Mwaka Mpya (New Year Opening)', 
      field: 'yearOpeningDate', 
      color: 'blue',
      icon: <Sparkles className="w-4 h-4" />,
      desc: 'Siku ya kwanza kabisa ya masomo kwa mwaka mpya.'
    },
    { 
      id: 'mid1', 
      title: 'Likizo Fupi ya Muhula wa 1 (Mid-Term I Break)', 
      startField: 'midTerm1BreakStart', 
      endField: 'midTerm1BreakEnd', 
      color: 'amber',
      icon: <Calendar className="w-4 h-4" />,
      desc: 'Mwezi wa 3 au wa 4 (Easter / Eid breaks).'
    },
    { 
      id: 'terminal', 
      title: 'Likizo Ndefu / Terminal (Mid-Year Break)', 
      startField: 'terminalBreakStart', 
      endField: 'terminalBreakEnd', 
      color: 'indigo',
      icon: <Clock className="w-4 h-4" />,
      desc: 'Likizo ya katikati ya mwaka (Mwezi wa 6).'
    },
    { 
      id: 'mid2', 
      title: 'Likizo ya Mwezi wa Tisa (September Break)', 
      startField: 'midTerm2BreakStart', 
      endField: 'midTerm2BreakEnd', 
      color: 'emerald',
      icon: <Calendar className="w-4 h-4" />,
      desc: 'Likizo fupi ya muhula wa pili.'
    },
    { 
      id: 'annual', 
      title: 'Likizo ya Kufunga Mwaka (Annual Break)', 
      startField: 'annualBreakStart', 
      endField: 'annualBreakEnd', 
      color: 'rose',
      icon: <ShieldCheck className="w-4 h-4" />,
      desc: 'Kufunga shule kwa ajili ya mapumziko ya Krismasi na mwaka mpya.'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6] text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
              <Calendar className="w-6 h-6 text-yellow-300" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Ratiba ya Kalenda ya Shule (Academic Calendar)</h2>
          </div>
          <p className="text-blue-100 text-xs font-medium max-w-2xl leading-relaxed">
            Panga tarehe za muhimu kwa mwaka mzima. Taarifa hizi zitatumika kiotomatiki kwenye ripoti za maendeleo ya wanafunzi, 
            mipango kazi ya walimu (Schemes of Work), na ufuatiliaji wa masomo.
          </p>
        </div>
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/10 rounded-full -ml-10 -mb-10 blur-2xl" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Controls */}
        <div className="lg:col-span-8 space-y-4">
          {calendarEvents.map((event) => (
            <div 
              key={event.id}
              className={`bg-white border-l-4 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all ${
                event.color === 'blue' ? 'border-blue-600' :
                event.color === 'amber' ? 'border-amber-500' :
                event.color === 'indigo' ? 'border-indigo-600' :
                event.color === 'emerald' ? 'border-emerald-600' :
                'border-rose-600'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${
                    event.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                    event.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                    event.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
                    event.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                    'bg-rose-50 text-rose-600'
                  }`}>
                    {event.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">{event.title}</h3>
                    <p className="text-[10px] text-slate-500 font-medium">{event.desc}</p>
                  </div>
                </div>
              </div>

              {event.field ? (
                <div className="max-w-xs">
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5 ml-1">Tarehe Rasmi (Official Date):</label>
                  <input 
                    type="date"
                    value={(academicTermDates as any)[event.field] || ''}
                    onChange={(e) => handleChange(event.field as any, e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5 ml-1">Kufunga (Closing Date):</label>
                    <input 
                      type="date"
                      value={(academicTermDates as any)[event.startField!] || ''}
                      onChange={(e) => handleChange(event.startField as any, e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5 ml-1">Kufungua (Resuming Date):</label>
                    <input 
                      type="date"
                      value={(academicTermDates as any)[event.endField!] || ''}
                      onChange={(e) => handleChange(event.endField as any, e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Visual Timeline / Status */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5 sticky top-6">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Yearly Visual Timeline
            </h3>

            <div className="space-y-4">
              <div className="relative pl-8 border-l-2 border-dashed border-slate-200 ml-2 space-y-8">
                {/* Year Start */}
                <div className="relative">
                  <div className="absolute -left-[41px] top-0 w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow-sm ring-4 ring-blue-50" />
                  <div className="text-[10px] font-black text-blue-600 uppercase">January</div>
                  <div className="text-xs font-bold text-slate-800">Muhula wa Kwanza Unaanza</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">{academicTermDates.yearOpeningDate || 'TBD'}</div>
                </div>

                {/* Mid Term 1 */}
                <div className="relative">
                  <div className="absolute -left-[41px] top-0 w-4 h-4 rounded-full bg-amber-500 border-4 border-white shadow-sm ring-4 ring-amber-50" />
                  <div className="text-[10px] font-black text-amber-600 uppercase">March / April</div>
                  <div className="text-xs font-bold text-slate-800">Likizo Fupi (Muhula I)</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {academicTermDates.midTerm1BreakStart || 'TBD'} → {academicTermDates.midTerm1BreakEnd || 'TBD'}
                  </div>
                </div>

                {/* Terminal */}
                <div className="relative">
                  <div className="absolute -left-[41px] top-0 w-4 h-4 rounded-full bg-indigo-600 border-4 border-white shadow-sm ring-4 ring-indigo-50" />
                  <div className="text-[10px] font-black text-indigo-600 uppercase">June / July</div>
                  <div className="text-xs font-bold text-slate-800">Likizo Ndefu ya Terminal</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {academicTermDates.terminalBreakStart || 'TBD'} → {academicTermDates.terminalBreakEnd || 'TBD'}
                  </div>
                </div>

                {/* Mid Term 2 */}
                <div className="relative">
                  <div className="absolute -left-[41px] top-0 w-4 h-4 rounded-full bg-indigo-600 border-4 border-white shadow-sm ring-4 ring-indigo-50" />
                  <div className="text-[10px] font-black text-indigo-600 uppercase">July / August</div>
                  <div className="text-xs font-bold text-slate-800">Muhula wa Pili Unaanza</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">{academicTermDates.terminalBreakEnd || 'TBD'}</div>
                </div>

                <div className="relative">
                  <div className="absolute -left-[41px] top-0 w-4 h-4 rounded-full bg-emerald-600 border-4 border-white shadow-sm ring-4 ring-emerald-50" />
                  <div className="text-[10px] font-black text-emerald-600 uppercase">September</div>
                  <div className="text-xs font-bold text-slate-800">Likizo Fupi (Muhula II)</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {academicTermDates.midTerm2BreakStart || 'TBD'} → {academicTermDates.midTerm2BreakEnd || 'TBD'}
                  </div>
                </div>

                {/* Annual */}
                <div className="relative">
                  <div className="absolute -left-[41px] top-0 w-4 h-4 rounded-full bg-rose-600 border-4 border-white shadow-sm ring-4 ring-rose-50" />
                  <div className="text-[10px] font-black text-rose-600 uppercase">December</div>
                  <div className="text-xs font-bold text-slate-800">Likizo ya Kufunga Mwaka</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {academicTermDates.annualBreakStart || 'TBD'} → {academicTermDates.annualBreakEnd || 'TBD'}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">Academic Days Calculation:</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-500">Muhula wa I:</span>
                  <span className="text-blue-700">
                    {academicTermDates.yearOpeningDate && academicTermDates.terminalBreakStart 
                      ? `${Math.floor((new Date(academicTermDates.terminalBreakStart).getTime() - new Date(academicTermDates.yearOpeningDate).getTime()) / (1000 * 60 * 60 * 24))} siku`
                      : 'TBD'}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-500">Muhula wa II:</span>
                  <span className="text-blue-700">
                    {academicTermDates.terminalBreakEnd && academicTermDates.annualBreakStart 
                      ? `${Math.floor((new Date(academicTermDates.annualBreakStart).getTime() - new Date(academicTermDates.terminalBreakEnd).getTime()) / (1000 * 60 * 60 * 24))} siku`
                      : 'TBD'}
                  </span>
                </div>
                <div className="pt-2 border-t border-blue-100 flex justify-between text-xs font-black">
                  <span className="text-slate-700 uppercase">Jumla ya Masomo:</span>
                  <span className="text-blue-900">
                    {academicTermDates.yearOpeningDate && academicTermDates.terminalBreakStart && academicTermDates.terminalBreakEnd && academicTermDates.annualBreakStart
                      ? `${Math.floor(((new Date(academicTermDates.terminalBreakStart).getTime() - new Date(academicTermDates.yearOpeningDate).getTime()) + (new Date(academicTermDates.annualBreakStart).getTime() - new Date(academicTermDates.terminalBreakEnd).getTime())) / (1000 * 60 * 60 * 24))} Siku za Shule`
                      : '---'}
                  </span>
                </div>
              </div>

              <p className="text-[9px] text-slate-500 leading-relaxed italic border-t border-blue-100 pt-2">
                &quot;Taarifa hizi zitajumuishwa kiotomatiki kwenye ripoti za maendeleo ya wanafunzi na kalenda ya shule.&quot;
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
