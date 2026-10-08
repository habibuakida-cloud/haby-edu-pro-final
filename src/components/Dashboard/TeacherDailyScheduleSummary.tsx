import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import { 
  Clock, 
  Calendar, 
  BookOpen, 
  Users, 
  CheckCircle2, 
  Printer, 
  ChevronRight, 
  Sparkles, 
  Coffee, 
  ArrowRight, 
  GraduationCap, 
  Activity, 
  Layers, 
  Flame, 
  CalendarDays,
  UserCheck,
  CheckCircle,
  HelpCircle,
  BarChart3,
  PieChart as PieIcon,
  PlayCircle
} from 'lucide-react';
import { TimetableAssignment, Teacher, PeriodSetting, StreamSetting, UserAccount, SchoolInfo } from '../../types';

interface TeacherDailyScheduleSummaryProps {
  assignments: TimetableAssignment[];
  teachers: Teacher[];
  periodSettings?: PeriodSetting[];
  streamSettings?: StreamSetting[];
  currentUser?: UserAccount | null;
  schoolInfo?: SchoolInfo;
  onSelectView?: (view: string) => void;
}

interface ParsedSlot {
  id: string | number;
  periodName: string;
  periodNumber: number;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  startMinutes: number; // minutes from 00:00
  endMinutes: number;
  subject: string;
  className: string;
  stream: string;
  room?: string;
  teacherId?: number;
  teacherName?: string;
  activityType?: string;
  isBreak?: boolean;
  status: 'completed' | 'current' | 'upcoming' | 'scheduled';
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SWAHILI_DAYS: Record<string, string> = {
  'Monday': 'Jumatatu',
  'Tuesday': 'Jumanne',
  'Wednesday': 'Jumatano',
  'Thursday': 'Alhamisi',
  'Friday': 'Ijumaa',
  'Saturday': 'Jumamosi',
  'Sunday': 'Jumapili'
};

// Subject color mapping with vibrant, accessible palettes
const SUBJECT_COLORS: Record<string, { bg: string; border: string; text: string; fill: string; gradient: [string, string] }> = {
  'Mathematics': { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-900', fill: '#3b82f6', gradient: ['#3b82f6', '#1d4ed8'] },
  'Hisabati': { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-900', fill: '#3b82f6', gradient: ['#3b82f6', '#1d4ed8'] },
  'English': { bg: 'bg-indigo-50', border: 'border-indigo-400', text: 'text-indigo-900', fill: '#6366f1', gradient: ['#6366f1', '#4338ca'] },
  'Kiingereza': { bg: 'bg-indigo-50', border: 'border-indigo-400', text: 'text-indigo-900', fill: '#6366f1', gradient: ['#6366f1', '#4338ca'] },
  'Kiswahili': { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-900', fill: '#f59e0b', gradient: ['#f59e0b', '#b45309'] },
  'Biology': { bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-900', fill: '#10b981', gradient: ['#10b981', '#047857'] },
  'Biolojia': { bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-900', fill: '#10b981', gradient: ['#10b981', '#047857'] },
  'Chemistry': { bg: 'bg-teal-50', border: 'border-teal-400', text: 'text-teal-900', fill: '#14b8a6', gradient: ['#14b8a6', '#0f766e'] },
  'Kemia': { bg: 'bg-teal-50', border: 'border-teal-400', text: 'text-teal-900', fill: '#14b8a6', gradient: ['#14b8a6', '#0f766e'] },
  'Physics': { bg: 'bg-cyan-50', border: 'border-cyan-400', text: 'text-cyan-900', fill: '#06b6d4', gradient: ['#06b6d4', '#0369a1'] },
  'Fizikia': { bg: 'bg-cyan-50', border: 'border-cyan-400', text: 'text-cyan-900', fill: '#06b6d4', gradient: ['#06b6d4', '#0369a1'] },
  'History': { bg: 'bg-rose-50', border: 'border-rose-400', text: 'text-rose-900', fill: '#f43f5e', gradient: ['#f43f5e', '#be123c'] },
  'Historia': { bg: 'bg-rose-50', border: 'border-rose-400', text: 'text-rose-900', fill: '#f43f5e', gradient: ['#f43f5e', '#be123c'] },
  'Geography': { bg: 'bg-lime-50', border: 'border-lime-400', text: 'text-lime-900', fill: '#84cc16', gradient: ['#84cc16', '#4d7c0f'] },
  'Jiografia': { bg: 'bg-lime-50', border: 'border-lime-400', text: 'text-lime-900', fill: '#84cc16', gradient: ['#84cc16', '#4d7c0f'] },
  'Civics': { bg: 'bg-purple-50', border: 'border-purple-400', text: 'text-purple-900', fill: '#a855f7', gradient: ['#a855f7', '#7e22ce'] },
  'Uraia': { bg: 'bg-purple-50', border: 'border-purple-400', text: 'text-purple-900', fill: '#a855f7', gradient: ['#a855f7', '#7e22ce'] },
  'Science': { bg: 'bg-sky-50', border: 'border-sky-400', text: 'text-sky-900', fill: '#0ea5e9', gradient: ['#0ea5e9', '#0284c7'] },
  'Sayansi': { bg: 'bg-sky-50', border: 'border-sky-400', text: 'text-sky-900', fill: '#0ea5e9', gradient: ['#0ea5e9', '#0284c7'] },
  'Religion': { bg: 'bg-violet-50', border: 'border-violet-400', text: 'text-violet-900', fill: '#8b5cf6', gradient: ['#8b5cf6', '#6d28d9'] },
  'Dini': { bg: 'bg-violet-50', border: 'border-violet-400', text: 'text-violet-900', fill: '#8b5cf6', gradient: ['#8b5cf6', '#6d28d9'] },
  'Break': { bg: 'bg-amber-50/70', border: 'border-amber-300', text: 'text-amber-800', fill: '#fbbf24', gradient: ['#fbbf24', '#f59e0b'] },
  'Lunch': { bg: 'bg-orange-50/70', border: 'border-orange-300', text: 'text-orange-800', fill: '#fb923c', gradient: ['#fb923c', '#ea580c'] },
  'Chai': { bg: 'bg-amber-50/70', border: 'border-amber-300', text: 'text-amber-800', fill: '#fbbf24', gradient: ['#fbbf24', '#f59e0b'] }
};

function getSubjectTheme(subject: string) {
  if (!subject) return { bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-800', fill: '#64748b', gradient: ['#64748b', '#475569'] };
  
  const match = Object.keys(SUBJECT_COLORS).find(key => 
    subject.toLowerCase().includes(key.toLowerCase())
  );
  
  if (match) return SUBJECT_COLORS[match];

  // Hash-based dynamic fallback
  const colors = [
    { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-900', fill: '#3b82f6', gradient: ['#3b82f6', '#1d4ed8'] },
    { bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-900', fill: '#10b981', gradient: ['#10b981', '#047857'] },
    { bg: 'bg-violet-50', border: 'border-violet-400', text: 'text-violet-900', fill: '#8b5cf6', gradient: ['#8b5cf6', '#6d28d9'] },
    { bg: 'bg-rose-50', border: 'border-rose-400', text: 'text-rose-900', fill: '#f43f5e', gradient: ['#f43f5e', '#be123c'] },
    { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-900', fill: '#f59e0b', gradient: ['#f59e0b', '#d97706'] }
  ];
  const charCode = subject.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return colors[charCode % colors.length];
}

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const TeacherDailyScheduleSummary: React.FC<TeacherDailyScheduleSummaryProps> = ({
  assignments = [],
  teachers = [],
  periodSettings = [],
  streamSettings = [],
  currentUser,
  schoolInfo,
  onSelectView
}) => {
  // Determine current day of week
  const todayDate = useMemo(() => new Date(), []);
  const currentDayOfWeekName = useMemo(() => {
    const dayIndex = todayDate.getDay();
    const map = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return map[dayIndex];
  }, [todayDate]);

  // Selected Day (Default to current weekday or Monday if weekend)
  const defaultDay = useMemo(() => {
    if (DAYS_OF_WEEK.includes(currentDayOfWeekName)) return currentDayOfWeekName;
    return 'Monday';
  }, [currentDayOfWeekName]);

  const [selectedDay, setSelectedDay] = useState<string>(defaultDay);

  // Selected Teacher State: Try auto-detecting from currentUser
  const matchedUserTeacher = useMemo(() => {
    if (!currentUser || !teachers.length) return null;
    return teachers.find(t => 
      (currentUser.fullName && t.name.toLowerCase().includes(currentUser.fullName.toLowerCase())) ||
      (currentUser.email && t.email && t.email.toLowerCase() === currentUser.email.toLowerCase())
    );
  }, [currentUser, teachers]);

  const [selectedTeacherId, setSelectedTeacherId] = useState<string | number>(() => {
    if (matchedUserTeacher) return matchedUserTeacher.id;
    if (teachers.length > 0) return teachers[0].id;
    return 'ALL';
  });

  // Keep selectedTeacherId updated if matched teacher is detected later
  useEffect(() => {
    if (matchedUserTeacher && (selectedTeacherId === 'ALL' || !teachers.some(t => t.id === Number(selectedTeacherId)))) {
      setSelectedTeacherId(matchedUserTeacher.id);
    } else if (selectedTeacherId !== 'ALL' && !teachers.some(t => t.id === Number(selectedTeacherId)) && teachers.length > 0) {
      setSelectedTeacherId(teachers[0].id);
    }
  }, [matchedUserTeacher, teachers]);

  // View presentation mode: 'timeline' (D3 horizontal scale) vs 'donut' (D3 distribution radial)
  const [activeChartType, setActiveChartType] = useState<'timeline' | 'donut'>('timeline');

  // Hovered or clicked slot for interactive inspection
  const [hoveredSlot, setHoveredSlot] = useState<ParsedSlot | null>(null);

  // Current real-time clock (updates every minute for live status indicator)
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const currentMinutesToday = useMemo(() => {
    return currentTime.getHours() * 60 + currentTime.getMinutes();
  }, [currentTime]);

  const isSelectedDayToday = selectedDay === currentDayOfWeekName;

  // Selected teacher object
  const activeTeacher = useMemo(() => {
    if (selectedTeacherId === 'ALL') return null;
    return teachers.find(t => String(t.id) === String(selectedTeacherId)) || null;
  }, [teachers, selectedTeacherId]);

  // Build canonical day slots based on periodSettings or assignments
  const dailySlots: ParsedSlot[] = useMemo(() => {
    // 1. Gather relevant assignments for selected day & teacher
    let dayAssignments = assignments.filter(a => a.day === selectedDay);
    if (selectedTeacherId !== 'ALL') {
      dayAssignments = dayAssignments.filter(a => String(a.teacherId) === String(selectedTeacherId));
    }

    // Default period timing heuristics if periodSettings are not fully customized
    const defaultTimeRanges: Record<string, { start: string; end: string; num: number }> = {
      'Period 1': { start: '08:00', end: '08:40', num: 1 },
      'Period 2': { start: '08:40', end: '09:20', num: 2 },
      'Break':    { start: '09:20', end: '09:50', num: 3 },
      'Period 3': { start: '09:50', end: '10:30', num: 4 },
      'Period 4': { start: '10:30', end: '11:10', num: 5 },
      'Midday':   { start: '11:10', end: '11:30', num: 6 },
      'Period 5': { start: '11:30', end: '12:10', num: 7 },
      'Period 6': { start: '12:10', end: '12:50', num: 8 },
      'Lunch':    { start: '12:50', end: '14:00', num: 9 },
      'Period 7': { start: '14:00', end: '14:40', num: 10 },
      'Period 8': { start: '14:40', end: '15:20', num: 11 },
      'Clubs':    { start: '15:20', end: '16:20', num: 12 },
    };

    const slots: ParsedSlot[] = [];

    dayAssignments.forEach((a, index) => {
      // Find period setting match
      const pSetting = periodSettings.find(p => 
        (p.name && (a.periodName === p.name || a.period.includes(p.name))) ||
        (p.id && String(p.id) === String((a as any).periodId))
      );

      // Extract time from period string (e.g. "Period 1 (08:00-08:40)")
      let start = pSetting?.start;
      let end = pSetting?.end;

      if (!start || !end) {
        const timeMatch = a.period?.match(/\((\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\)/);
        if (timeMatch) {
          start = timeMatch[1];
          end = timeMatch[2];
        }
      }

      const pName = a.periodName || a.period.split(' (')[0] || `Period ${index + 1}`;
      
      if (!start || !end) {
        const fallback = defaultTimeRanges[pName] || { start: '08:00', end: '08:40', num: index + 1 };
        start = fallback.start;
        end = fallback.end;
      }

      const startMinutes = parseTimeToMinutes(start);
      const endMinutes = parseTimeToMinutes(end);

      // Compute live status
      let status: ParsedSlot['status'] = 'scheduled';
      if (isSelectedDayToday) {
        if (currentMinutesToday >= endMinutes) {
          status = 'completed';
        } else if (currentMinutesToday >= startMinutes && currentMinutesToday < endMinutes) {
          status = 'current';
        } else {
          status = 'upcoming';
        }
      }

      const teacherObj = teachers.find(t => t.id === a.teacherId);

      slots.push({
        id: a.id || `slot-${index}`,
        periodName: pName,
        periodNumber: index + 1,
        startTime: start,
        endTime: end,
        startMinutes,
        endMinutes,
        subject: a.subject,
        className: a.className,
        stream: a.stream || '',
        room: a.room || '',
        teacherId: a.teacherId,
        teacherName: teacherObj?.name || 'Mwalimu',
        activityType: a.activityType,
        isBreak: a.activityType === 'break' || a.activityType === 'lunch' || a.subject?.toLowerCase().includes('break'),
        status
      });
    });

    // Sort chronologically by start time
    slots.sort((a, b) => a.startMinutes - b.startMinutes);
    return slots;
  }, [assignments, selectedDay, selectedTeacherId, periodSettings, isSelectedDayToday, currentMinutesToday, teachers]);

  // Statistics summaries
  const stats = useMemo(() => {
    const teachingPeriods = dailySlots.filter(s => !s.isBreak);
    const totalMinutes = teachingPeriods.reduce((acc, s) => acc + (s.endMinutes - s.startMinutes), 0);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    
    const activeSlot = isSelectedDayToday ? dailySlots.find(s => s.status === 'current') : null;
    const nextSlot = isSelectedDayToday ? dailySlots.find(s => s.status === 'upcoming') : null;
    const completedCount = isSelectedDayToday ? dailySlots.filter(s => s.status === 'completed' && !s.isBreak).length : 0;

    // Distinct subjects taught today
    const subjectSet = new Set(teachingPeriods.map(s => s.subject).filter(Boolean));

    return {
      totalPeriods: teachingPeriods.length,
      totalHoursStr: hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ''}` : `${mins}m`,
      activeSlot,
      nextSlot,
      completedCount,
      uniqueSubjectsCount: subjectSet.size,
      allDaySlotsCount: dailySlots.length
    };
  }, [dailySlots, isSelectedDayToday]);

  // Count periods per day of the week for day navigation badges
  const weekDayCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    DAYS_OF_WEEK.forEach(d => {
      let f = assignments.filter(a => a.day === d);
      if (selectedTeacherId !== 'ALL') {
        f = f.filter(a => String(a.teacherId) === String(selectedTeacherId));
      }
      counts[d] = f.length;
    });
    return counts;
  }, [assignments, selectedTeacherId]);

  // D3 Timeline Chart Ref & Renderer
  const d3TimelineSvgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (activeChartType !== 'timeline' || !d3TimelineSvgRef.current) return;

    const svgElement = d3TimelineSvgRef.current;
    const svg = d3.select(svgElement);
    svg.selectAll('*').remove(); // clear canvas

    const width = 860;
    const height = 180;
    const margin = { top: 38, right: 30, bottom: 42, left: 30 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Time domain: 07:30 to 17:00 (450 to 1020 mins)
    let minTime = 7.5 * 60; // 07:30
    let maxTime = 17 * 60;   // 17:00

    if (dailySlots.length > 0) {
      const earliest = Math.min(...dailySlots.map(s => s.startMinutes));
      const latest = Math.max(...dailySlots.map(s => s.endMinutes));
      minTime = Math.min(minTime, Math.max(0, earliest - 30));
      maxTime = Math.max(maxTime, latest + 30);
    }

    const xScale = d3.scaleLinear()
      .domain([minTime, maxTime])
      .range([0, innerWidth]);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Background track
    g.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('rx', 12)
      .attr('fill', '#f8fafc')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 1.5);

    // Grid lines for every hour
    const hourTicks: number[] = [];
    const startHour = Math.floor(minTime / 60);
    const endHour = Math.ceil(maxTime / 60);
    for (let h = startHour; h <= endHour; h++) {
      hourTicks.push(h * 60);
    }

    g.selectAll('.hour-grid')
      .data(hourTicks)
      .enter()
      .append('line')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#e2e8f0')
      .attr('stroke-dasharray', '3,3');

    // Time axis labels
    g.selectAll('.hour-label')
      .data(hourTicks)
      .enter()
      .append('text')
      .attr('x', d => xScale(d))
      .attr('y', innerHeight + 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .attr('fill', '#64748b')
      .text(d => formatMinutesToTime(d));

    // Defs for gradients
    const defs = svg.append('defs');
    
    // Add linear gradients for distinct subjects
    dailySlots.forEach((slot, i) => {
      const theme = getSubjectTheme(slot.subject);
      const gradId = `grad-${slot.id}-${i}`;
      const grad = defs.append('linearGradient')
        .attr('id', gradId)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '100%');
      grad.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', theme.gradient[0]);
      grad.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', theme.gradient[1]);
    });

    if (dailySlots.length === 0) {
      g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight / 2 + 5)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', '700')
        .attr('fill', '#94a3b8')
        .text('Hakuna vipindi vilivyopangwa kwa mwalimu huyu siku hii.');
    }

    // Render period bars
    const barHeight = innerHeight - 16;
    const barY = 8;

    const slotGroups = g.selectAll('.slot-group')
      .data(dailySlots)
      .enter()
      .append('g')
      .attr('class', 'slot-group')
      .style('cursor', 'pointer')
      .on('mouseenter', (_event, d) => setHoveredSlot(d))
      .on('mouseleave', () => setHoveredSlot(null));

    slotGroups.each(function(d, i) {
      const el = d3.select(this);
      const xStart = xScale(d.startMinutes);
      const xEnd = xScale(d.endMinutes);
      const w = Math.max(12, xEnd - xStart);
      const theme = getSubjectTheme(d.subject);
      const isCurrent = d.status === 'current';

      // Bar rect
      el.append('rect')
        .attr('x', xStart + 2)
        .attr('y', isCurrent ? barY - 3 : barY)
        .attr('width', Math.max(8, w - 4))
        .attr('height', isCurrent ? barHeight + 6 : barHeight)
        .attr('rx', 8)
        .attr('fill', `url(#grad-${d.id}-${i})`)
        .attr('stroke', isCurrent ? '#facc15' : 'white')
        .attr('stroke-width', isCurrent ? 3 : 1.5)
        .attr('filter', isCurrent ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.25))' : 'drop-shadow(0 1px 2px rgba(0,0,0,0.06))')
        .style('transition', 'all 0.2s ease');

      // Live pulse aura if current
      if (isCurrent) {
        el.append('rect')
          .attr('x', xStart)
          .attr('y', barY - 5)
          .attr('width', Math.max(12, w))
          .attr('height', barHeight + 10)
          .attr('rx', 10)
          .attr('fill', 'none')
          .attr('stroke', '#eab308')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '4,2')
          .attr('opacity', 0.85);
      }

      // Period text labels if width permits
      if (w > 45) {
        // Subject label
        el.append('text')
          .attr('x', xStart + w / 2)
          .attr('y', barY + (w > 80 ? barHeight / 2 - 8 : barHeight / 2 + 4))
          .attr('text-anchor', 'middle')
          .attr('font-size', w > 90 ? '11px' : '9px')
          .attr('font-weight', '800')
          .attr('fill', '#ffffff')
          .text(d.subject.length > (w / 8) ? d.subject.substring(0, Math.floor(w / 8)) + '…' : d.subject);

        // Class & Stream / Room
        if (w > 75) {
          el.append('text')
            .attr('x', xStart + w / 2)
            .attr('y', barY + barHeight / 2 + 10)
            .attr('text-anchor', 'middle')
            .attr('font-size', '9px')
            .attr('font-weight', '600')
            .attr('fill', 'rgba(255,255,255,0.92)')
            .text(`${d.className} ${d.stream}`);
        }

        // Time range at bottom
        if (w > 105) {
          el.append('text')
            .attr('x', xStart + w / 2)
            .attr('y', barY + barHeight - 8)
            .attr('text-anchor', 'middle')
            .attr('font-size', '8px')
            .attr('font-weight', '500')
            .attr('fill', 'rgba(255,255,255,0.75)')
            .text(`${d.startTime}-${d.endTime}`);
        }
      } else {
        // Minimal dot/short name
        el.append('text')
          .attr('x', xStart + w / 2)
          .attr('y', barY + barHeight / 2 + 3)
          .attr('text-anchor', 'middle')
          .attr('font-size', '8px')
          .attr('font-weight', '800')
          .attr('fill', '#ffffff')
          .text(d.subject.substring(0, 2).toUpperCase());
      }
    });

    // Red live cursor line if viewing today
    if (isSelectedDayToday && currentMinutesToday >= minTime && currentMinutesToday <= maxTime) {
      const nowX = xScale(currentMinutesToday);

      const liveGroup = g.append('g').attr('class', 'now-indicator');

      // Vertical line
      liveGroup.append('line')
        .attr('x1', nowX)
        .attr('x2', nowX)
        .attr('y1', -16)
        .attr('y2', innerHeight + 6)
        .attr('stroke', '#ef4444')
        .attr('stroke-width', 2.5)
        .attr('stroke-dasharray', '4,3');

      // Top badge
      const badgeW = 44;
      const badgeH = 18;
      liveGroup.append('rect')
        .attr('x', nowX - badgeW / 2)
        .attr('y', -24)
        .attr('width', badgeW)
        .attr('height', badgeH)
        .attr('rx', 9)
        .attr('fill', '#ef4444');

      liveGroup.append('text')
        .attr('x', nowX)
        .attr('y', -11)
        .attr('text-anchor', 'middle')
        .attr('font-size', '9px')
        .attr('font-weight', '900')
        .attr('fill', '#ffffff')
        .text('SASA');

      // Pulsing bottom dot
      liveGroup.append('circle')
        .attr('cx', nowX)
        .attr('cy', innerHeight + 6)
        .attr('r', 4.5)
        .attr('fill', '#ef4444');
    }

  }, [dailySlots, activeChartType, isSelectedDayToday, currentMinutesToday]);

  // D3 Donut Workload Chart Ref & Renderer
  const d3DonutSvgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (activeChartType !== 'donut' || !d3DonutSvgRef.current) return;

    const svgElement = d3DonutSvgRef.current;
    const svg = d3.select(svgElement);
    svg.selectAll('*').remove();

    const width = 360;
    const height = 180;
    const radius = Math.min(width, height) / 2 - 14;

    // Group periods by subject for donut slices
    const subjectMap: Record<string, { subject: string; count: number; theme: any }> = {};
    dailySlots.forEach(s => {
      if (!subjectMap[s.subject]) {
        subjectMap[s.subject] = { subject: s.subject, count: 0, theme: getSubjectTheme(s.subject) };
      }
      subjectMap[s.subject].count += 1;
    });

    const data = Object.values(subjectMap);

    if (data.length === 0) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('fill', '#94a3b8')
        .text('Hakuna taarifa za vipindi leo.');
      return;
    }

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const pie = d3.pie<typeof data[0]>()
      .value(d => d.count)
      .sort(null);

    const arc = d3.arc<d3.PieArcDatum<typeof data[0]>>()
      .innerRadius(radius * 0.58)
      .outerRadius(radius)
      .cornerRadius(6);

    const arcs = g.selectAll('.arc')
      .data(pie(data))
      .enter()
      .append('g')
      .attr('class', 'arc');

    arcs.append('path')
      .attr('d', arc as any)
      .attr('fill', d => d.data.theme.fill)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer');

    // Center text
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', -3)
      .attr('font-size', '18px')
      .attr('font-weight', '900')
      .attr('fill', '#1e293b')
      .text(`${stats.totalPeriods}`);

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 14)
      .attr('font-size', '9px')
      .attr('font-weight', '700')
      .attr('fill', '#64748b')
      .text('VIPINDI');

  }, [dailySlots, activeChartType, stats.totalPeriods]);

  // Handler for printing teacher's daily schedule slip
  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-5 md:p-6 shadow-xs hover:shadow-md transition-all space-y-5 relative overflow-hidden">
      {/* Decorative subtle background mesh */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-gradient-to-bl from-blue-500/8 to-indigo-500/0 rounded-full blur-2xl pointer-events-none" />

      {/* Header bar: Title, Badge, Teacher Selector, Day Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-sm shadow-blue-500/20 shrink-0">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Ratiba ya Kufundisha ya Leo
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-50 text-blue-700 border border-blue-200/70">
                <Sparkles className="w-3 h-3 text-blue-500" />
                D3 Visual Snapshot
              </span>
              {isSelectedDayToday && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Muda Halisi (Live)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Muhtasari wa vipindi kwa siku ya <strong className="text-slate-800">{SWAHILI_DAYS[selectedDay] || selectedDay}</strong> kwa ajili ya walimu.
            </p>
          </div>
        </div>

        {/* Teacher Selection & Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80 text-xs">
            <UserCheck className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-bold text-slate-600">Mwalimu:</span>
            <select
              value={selectedTeacherId}
              onChange={e => setSelectedTeacherId(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer max-w-[160px] truncate"
            >
              <option value="ALL">Walimu Wote (Shule Nzima)</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} {matchedUserTeacher?.id === t.id ? '★ (Wewe)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle between D3 Timeline & Donut */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveChartType('timeline')}
              title="Grafu ya Mstari wa Muda (D3 Timeline)"
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                activeChartType === 'timeline' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Timeline</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveChartType('donut')}
              title="Mchoro wa Duara (D3 Donut)"
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                activeChartType === 'donut' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Mzigo</span>
            </button>
          </div>

          {/* Print button */}
          <button
            type="button"
            onClick={handlePrintSlip}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            title="Chapisha Ratiba ya Siku Hii"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden md:inline">Print Slip</span>
          </button>

          {/* Go to Full Timetable */}
          {onSelectView && (
            <button
              type="button"
              onClick={() => onSelectView('timetable')}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl border border-blue-200 text-xs font-black flex items-center gap-1 transition cursor-pointer"
            >
              <span>Ratiba Kuu</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Weekday Switcher Tabs with period badges */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {DAYS_OF_WEEK.map(day => {
          const isSelected = selectedDay === day;
          const isToday = currentDayOfWeekName === day;
          const periodCount = weekDayCounts[day] || 0;

          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer border ${
                isSelected 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
              }`}
            >
              <div className="flex items-center gap-1">
                <span>{SWAHILI_DAYS[day] || day}</span>
                {isToday && (
                  <span className={`text-[9px] uppercase px-1 rounded font-black ${
                    isSelected ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700'
                  }`}>
                    Leo
                  </span>
                )}
              </div>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-700'
              }`}>
                {periodCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* High-Impact Snapshot Metric Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Periods */}
        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Vipindi vya Leo</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">{stats.totalPeriods} <span className="text-xs font-semibold text-slate-400">Vipindi</span></p>
          </div>
          <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
            <BookOpen className="w-4 h-4" />
          </div>
        </div>

        {/* Teaching Hours */}
        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Muda Darasani</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">{stats.totalHoursStr}</p>
          </div>
          <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        {/* Current Active Status */}
        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3 flex items-center justify-between">
          <div className="min-w-0 pr-1">
            <p className="text-[10px] uppercase font-bold text-slate-400">Hali ya Sasa</p>
            {stats.activeSlot ? (
              <p className="text-xs font-black text-emerald-700 truncate mt-0.5">
                ● {stats.activeSlot.subject} ({stats.activeSlot.className})
              </p>
            ) : stats.nextSlot ? (
              <p className="text-xs font-black text-amber-700 truncate mt-0.5">
                Inayofuata: {stats.nextSlot.startTime}
              </p>
            ) : (
              <p className="text-xs font-black text-slate-500 mt-0.5">
                {isSelectedDayToday ? 'Hakuna Kipindi Sasa' : 'Ratiba ya Kesho'}
              </p>
            )}
          </div>
          <div className={`p-2 rounded-xl ${stats.activeSlot ? 'bg-emerald-100 text-emerald-700 animate-pulse' : 'bg-slate-200 text-slate-600'}`}>
            <Activity className="w-4 h-4" />
          </div>
        </div>

        {/* Unique Subjects / Workload */}
        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Masomo Tofauti</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">{stats.uniqueSubjectsCount} <span className="text-xs font-semibold text-slate-400">Masomo</span></p>
          </div>
          <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
            <GraduationCap className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* D3 Visual Chart Area */}
      <div className="border border-slate-200/90 rounded-2xl p-4 bg-gradient-to-b from-white to-slate-50/50 shadow-inner relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              {activeChartType === 'timeline' 
                ? 'D3 Interactive Chronological Timeline (Ratiba kwa Saa)' 
                : 'D3 Distribution & Subject Workload'}
            </h4>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            {activeTeacher ? `Ratiba ya: ${activeTeacher.name}` : 'Walimu Wote wa Shule'}
          </span>
        </div>

        {/* Timeline SVG View */}
        {activeChartType === 'timeline' && (
          <div className="w-full overflow-x-auto scrollbar-thin">
            <div className="min-w-[800px]">
              <svg
                ref={d3TimelineSvgRef}
                viewBox="0 0 860 180"
                className="w-full h-auto select-none"
              />
            </div>
          </div>
        )}

        {/* Donut SVG View */}
        {activeChartType === 'donut' && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
            <svg
              ref={d3DonutSvgRef}
              viewBox="0 0 360 180"
              className="w-64 h-auto select-none"
            />
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2 text-xs">
              <p className="font-black text-slate-800 text-[11px] uppercase tracking-wider mb-1">Mchanganuo wa Masomo:</p>
              {Array.from(new Set(dailySlots.map(s => s.subject))).map(subj => {
                const count = dailySlots.filter(s => s.subject === subj).length;
                const theme = getSubjectTheme(subj);
                return (
                  <div key={subj} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-md shrink-0" style={{ backgroundColor: theme.fill }} />
                    <span className="font-bold text-slate-700">{subj}:</span>
                    <span className="font-black text-slate-900">{count} {count === 1 ? 'Kipindi' : 'Vipindi'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tooltip detail bar when hovering on a D3 bar */}
        {hoveredSlot && (
          <div className="mt-3 p-2.5 bg-slate-900 text-white rounded-xl text-xs flex flex-wrap items-center justify-between gap-3 shadow-md animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="font-black text-amber-400">{hoveredSlot.periodName}:</span>
              <span className="font-bold">{hoveredSlot.subject}</span>
              <span className="text-slate-300">({hoveredSlot.className} {hoveredSlot.stream})</span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-slate-300">
                <Clock className="w-3 h-3 text-blue-400" />
                {hoveredSlot.startTime} - {hoveredSlot.endTime}
              </span>
              {hoveredSlot.room && (
                <span className="text-slate-300">📍 {hoveredSlot.room}</span>
              )}
              {hoveredSlot.teacherName && (
                <span className="text-slate-300">👨‍🏫 {hoveredSlot.teacherName}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chronological Day Cards (Agenda List) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <PlayCircle className="w-4 h-4 text-blue-600" />
            Mlolongo wa Vipindi vya Siku ({dailySlots.length})
          </h4>
          {onSelectView && (
            <button
              type="button"
              onClick={() => onSelectView('dailytracker')}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition"
            >
              <span>Ufuatiliaji wa Kufundisha (Daily Tracker)</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {dailySlots.length === 0 ? (
          <div className="text-center py-8 bg-slate-50/70 border border-dashed border-slate-200 rounded-2xl p-6">
            <Coffee className="w-9 h-9 text-slate-300 mx-auto mb-2" />
            <h5 className="font-bold text-slate-800 text-sm">Hakuna Vipindi Vilivyopangwa Siku Hii</h5>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Mwalimu huyu hana vipindi vya darasani vilivyopangwa kwa siku ya {SWAHILI_DAYS[selectedDay] || selectedDay}. Hii ni fursa ya maandalizi au masahihisho.
            </p>
            {onSelectView && (
              <button
                type="button"
                onClick={() => onSelectView('timetable')}
                className="mt-3 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>Panga Ratiba Mpya Kwenye Timetable</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dailySlots.map((slot) => {
              const theme = getSubjectTheme(slot.subject);
              const isCurrent = slot.status === 'current';
              const isCompleted = slot.status === 'completed';

              return (
                <div
                  key={slot.id}
                  className={`p-3.5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                    isCurrent 
                      ? 'bg-amber-50/70 border-amber-300 shadow-sm ring-2 ring-amber-400/40' 
                      : isCompleted
                      ? 'bg-slate-50/60 border-slate-200 opacity-80'
                      : 'bg-white border-slate-200 hover:border-blue-300 shadow-xs'
                  }`}
                >
                  {/* Top Bar: Period name & status badge */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {slot.periodName}
                      </span>

                      {/* Status Pills */}
                      {isCurrent ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                          Inaendelea Sasa
                        </span>
                      ) : isCompleted ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Imekamilika
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          Imeratibiwa
                        </span>
                      )}
                    </div>

                    {/* Subject & Class Details */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: theme.fill }} />
                        <h5 className="font-black text-slate-900 text-sm truncate">
                          {slot.subject}
                        </h5>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <span>{slot.className}</span>
                        {slot.stream && (
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-black">
                            {slot.stream}
                          </span>
                        )}
                        {slot.room && (
                          <span className="text-[11px] text-slate-400">· {slot.room}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Bar: Clock & Teacher / Shortcut */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-black text-slate-700 flex items-center gap-1 text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      {slot.startTime} - {slot.endTime}
                    </span>

                    {selectedTeacherId === 'ALL' && slot.teacherName && (
                      <span className="text-[10px] font-bold text-slate-500 truncate max-w-[120px]">
                        👤 {slot.teacherName}
                      </span>
                    )}

                    {onSelectView && (
                      <button
                        type="button"
                        onClick={() => onSelectView('dailytracker')}
                        className="text-[10px] font-black text-blue-600 hover:text-blue-800 transition flex items-center gap-0.5"
                        title="Tiki kipindi hiki"
                      >
                        <span>Tiki</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
