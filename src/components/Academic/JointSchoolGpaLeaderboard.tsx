import React from 'react';
import { Trophy, Award, Building2, Sparkles, Plus } from 'lucide-react';
import { SchoolGpaRankingRow } from './jointExamGpaUtils';

interface JointSchoolGpaLeaderboardProps {
  schoolStats: SchoolGpaRankingRow[];
  isPrimary: boolean;
  isSevenOrMoreSubjects: boolean;
  onSelectSchoolFilter?: (schoolId: string) => void;
  onPopulateTenSchoolsDemo?: () => void;
  saving?: boolean;
}

export const JointSchoolGpaLeaderboard: React.FC<JointSchoolGpaLeaderboardProps> = ({
  schoolStats,
  isPrimary,
  isSevenOrMoreSubjects,
  onSelectSchoolFilter,
  onPopulateTenSchoolsDemo,
  saving = false,
}) => {
  const totalSchools = schoolStats.length;
  const rankedWithSat = schoolStats.filter((s) => s.satCount > 0);
  const topSchool = rankedWithSat[0] || null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
      {/* HEADER BAR */}
      <div className="px-5 py-4 bg-slate-900 text-white flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
              NECTA SCHOOL G.P.A RANKING ENGINE
            </span>
            <span className="text-[11px] font-bold text-slate-300">
              • Jumla ya Shule Zinazoshiriki: <strong className="text-white">{totalSchools}</strong>
            </span>
          </div>
          <h3 className="text-sm sm:text-base font-black uppercase tracking-wide flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Msimamo wa Shule Ki-Ufaulu kwa G.P.A (School Ranking by Overall Students&apos; G.P.A)
            </span>
          </h3>
          <p className="text-xs text-slate-300">
            Shule zimepangwa kuanzia ya Kwanza hadi ya Mwisho (mf. <strong>Nafasi ya 1 kati ya Shule {totalSchools}</strong>) kulingana na ufaulu wa G.P.A waliopata wanafunzi wote wa kila shule (G.P.A ndogo zaidi kuanzia <strong>1.0000</strong> ndiyo ufaulu wa juu zaidi kwa vigezo vya NECTA).
          </p>
        </div>

        {onPopulateTenSchoolsDemo && (
          <div className="flex flex-wrap items-center gap-2 shrink-0 print:hidden">
            <button
              type="button"
              disabled={saving}
              onClick={onPopulateTenSchoolsDemo}
              className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
              title="Tengeneza au kamilisha orodha ya Shule 10 (Shule A hadi Shule J) zikiwa na ufaulu wa G.P.A ambapo Shule B inaongoza"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {totalSchools < 10
                  ? `Ongeza Hadi Shule 10 & Panga G.P.A (Shule B #1 / 10)`
                  : `Kokotoa Msimamo wa Shule ${totalSchools} kwa G.P.A`}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* CHAMPION SCHOOL CALLOUT BANNER */}
      {topSchool && (
        <div
          className="px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          style={{
            backgroundColor: `${topSchool.hexColor}12`,
            borderLeft: `6px solid ${topSchool.hexColor}`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-xs shrink-0"
              style={{ backgroundColor: topSchool.hexColor }}
            >
              #1
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                  🏆 SHULE YA KWANZA KATI YA SHULE {totalSchools} (RANK #1 OUT OF {totalSchools})
                </span>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-black text-white"
                  style={{ backgroundColor: topSchool.hexColor }}
                >
                  {topSchool.schoolCode}
                </span>
              </div>
              <p className="text-sm font-black text-slate-900 mt-0.5">
                {topSchool.schoolName} ndiyo ya Kwanza (1 / {totalSchools}) kwa G.P.A ya{' '}
                <span className="font-mono underline decoration-2">{topSchool.schoolGpaFormatted}</span>{' '}
                (Grade {topSchool.schoolGpaGrade} — {topSchool.schoolGpaRemark})!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
            <div className="text-right">
              <span className="text-[10px] font-sans font-bold uppercase text-slate-500 block">
                School G.P.A
              </span>
              <span className="text-base font-black text-slate-900">
                {topSchool.schoolGpaFormatted}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-sans font-bold uppercase text-slate-500 block">
                Wastani (%)
              </span>
              <span className="text-base font-black text-emerald-700">{topSchool.meanAvg}%</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-sans font-bold uppercase text-slate-500 block">
                Watahiniwa
              </span>
              <span className="text-base font-black text-slate-900">{topSchool.satCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* SCHOOL GPA RANKING TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs tabular-nums">
          <thead>
            <tr className="bg-slate-100 border-b-2 border-slate-300 text-[11px] font-black text-slate-800 uppercase">
              <th className="py-3 px-3 text-center bg-amber-50 text-amber-950 border-r border-slate-200">
                Rank Ki-Shule
              </th>
              <th className="py-3 px-3 border-r border-slate-200">Shule &amp; Rangi (Badge)</th>
              <th className="py-3 px-2.5 text-center border-r border-slate-200" title="Wanafunzi Waliosajiliwa / Waliofanya Mtihani">
                Wanafunzi (Sat/Reg)
              </th>
              {isSevenOrMoreSubjects ? (
                <>
                  <th className="py-3 px-2 text-center bg-emerald-50/70 text-emerald-950 border-r border-slate-200">
                    Div I
                  </th>
                  <th className="py-3 px-2 text-center bg-blue-50/70 text-blue-950 border-r border-slate-200">
                    Div II
                  </th>
                  <th className="py-3 px-2 text-center bg-amber-50/70 text-amber-950 border-r border-slate-200">
                    Div III
                  </th>
                  <th className="py-3 px-2 text-center bg-orange-50/70 text-orange-950 border-r border-slate-200">
                    Div IV
                  </th>
                  <th className="py-3 px-2 text-center bg-rose-50/70 text-rose-950 border-r border-slate-200">
                    Div 0
                  </th>
                </>
              ) : (
                <>
                  <th className="py-3 px-2 text-center bg-emerald-50/70 text-emerald-950 border-r border-slate-200">
                    Grade A
                  </th>
                  <th className="py-3 px-2 text-center bg-blue-50/70 text-blue-950 border-r border-slate-200">
                    Grade B
                  </th>
                  <th className="py-3 px-2 text-center bg-amber-50/70 text-amber-950 border-r border-slate-200">
                    Grade C
                  </th>
                  <th className="py-3 px-2 text-center bg-orange-50/70 text-orange-950 border-r border-slate-200">
                    Grade D
                  </th>
                  <th className="py-3 px-2 text-center bg-rose-50/70 text-rose-950 border-r border-slate-200">
                    {isPrimary ? 'Grade E' : 'Grade F'}
                  </th>
                </>
              )}
              <th className="py-3 px-3 text-center border-r border-slate-200">Wastani (%)</th>
              <th className="py-3 px-3 text-center border-r border-slate-200">Ufaulu (%)</th>
              <th className="py-3 px-3 text-center bg-indigo-50 text-indigo-950 border-r border-slate-200">
                School G.P.A
              </th>
              <th className="py-3 px-3 text-center bg-indigo-50 text-indigo-950">
                Daraja la G.P.A (NECTA)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {schoolStats.map((st) => {
              const isFirst = st.schoolPosition === 1 && st.satCount > 0;
              return (
                <tr
                  key={st.id}
                  onClick={() => onSelectSchoolFilter && onSelectSchoolFilter(st.id)}
                  className={`transition-colors ${
                    onSelectSchoolFilter ? 'cursor-pointer' : ''
                  } ${isFirst ? 'bg-amber-50/40 hover:bg-amber-50/80' : 'hover:bg-slate-50'}`}
                  style={{ borderLeft: `6px solid ${st.hexColor}` }}
                >
                  {/* SCHOOL POSITION OUT OF N */}
                  <td className="py-2.5 px-3 text-center border-r border-slate-200 bg-amber-50/30">
                    <div className="inline-flex items-center gap-1.5">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono ${
                          st.satCount === 0
                            ? 'bg-slate-200 text-slate-600'
                            : st.schoolPosition === 1
                            ? 'bg-amber-400 text-slate-950 shadow-2xs'
                            : st.schoolPosition === 2
                            ? 'bg-slate-300 text-slate-900'
                            : st.schoolPosition === 3
                            ? 'bg-amber-700 text-white'
                            : 'bg-white text-slate-800 border border-slate-300'
                        }`}
                      >
                        {st.satCount > 0 ? `${st.schoolPosition} / ${totalSchools}` : `- / ${totalSchools}`}
                      </span>
                    </div>
                  </td>

                  {/* SCHOOL BADGE & NAME */}
                  <td className="py-2.5 px-3 border-r border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="px-2.5 py-1 rounded-md text-[11px] font-black text-white shrink-0 shadow-2xs"
                        style={{ backgroundColor: st.hexColor }}
                      >
                        {st.schoolCode}
                      </span>
                      <div className="min-w-0">
                        <span className="font-black text-slate-900 block truncate">
                          {st.schoolName}
                        </span>
                        {isFirst && (
                          <span className="text-[10px] font-black text-amber-700">
                            ★ Shule ya Kwanza Kiuinjia / Ki-GPA
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* REGISTERED / SAT CANDIDATES */}
                  <td className="py-2.5 px-2.5 text-center font-mono font-bold text-slate-800 border-r border-slate-200">
                    {st.satCount} / {st.studentCount}
                  </td>

                  {/* DIVISION OR GRADE COUNTS */}
                  {isSevenOrMoreSubjects ? (
                    <>
                      <td className="py-2.5 px-2 text-center font-mono font-black text-emerald-800 bg-emerald-50/30 border-r border-slate-200">
                        {st.divCounts.I}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-black text-blue-800 bg-blue-50/30 border-r border-slate-200">
                        {st.divCounts.II}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-black text-amber-900 bg-amber-50/30 border-r border-slate-200">
                        {st.divCounts.III}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-black text-orange-800 bg-orange-50/30 border-r border-slate-200">
                        {st.divCounts.IV}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-black text-rose-800 bg-rose-50/30 border-r border-slate-200">
                        {st.divCounts['0']}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-2.5 px-2 text-center font-mono font-black text-emerald-800 bg-emerald-50/30 border-r border-slate-200">
                        {st.gradeCounts.A}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-black text-blue-800 bg-blue-50/30 border-r border-slate-200">
                        {st.gradeCounts.B}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-black text-amber-900 bg-amber-50/30 border-r border-slate-200">
                        {st.gradeCounts.C}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-black text-orange-800 bg-orange-50/30 border-r border-slate-200">
                        {st.gradeCounts.D}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-black text-rose-800 bg-rose-50/30 border-r border-slate-200">
                        {isPrimary ? st.gradeCounts.E : st.gradeCounts.F}
                      </td>
                    </>
                  )}

                  {/* MEAN SCORE % */}
                  <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900 border-r border-slate-200">
                    {st.satCount > 0 ? `${st.meanAvg}%` : '-'}
                  </td>

                  {/* PASS RATE % */}
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700 border-r border-slate-200">
                    {st.satCount > 0 ? `${st.passRate}%` : '-'}
                  </td>

                  {/* SCHOOL GPA */}
                  <td className="py-2.5 px-3 text-center font-mono font-black text-sm text-indigo-950 bg-indigo-50/50 border-r border-slate-200">
                    {st.schoolGpaFormatted}
                  </td>

                  {/* GPA GRADE & REMARK */}
                  <td className="py-2.5 px-3 text-center bg-indigo-50/30">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black border ${st.schoolGpaColorClass}`}
                    >
                      <span>GRADE {st.schoolGpaGrade}</span>
                      <span>•</span>
                      <span>{st.schoolGpaRemark}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
