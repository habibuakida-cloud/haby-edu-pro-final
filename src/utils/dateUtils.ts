import { AcademicTermDates } from '../types';

/**
 * Helper to count only weekdays (Mon-Fri) between two dates,
 * and optionally exclude a holiday range.
 */
export const calculateAcademicDays = (startDateStr: string, endDateStr: string, holidayStart?: string, holidayEnd?: string) => {
  if (!startDateStr || !endDateStr) return 0;
  
  let start = new Date(startDateStr);
  let end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  
  // Normalize dates to midnight to avoid time-of-day issues
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  let hStart = holidayStart ? new Date(holidayStart) : null;
  let hEnd = holidayEnd ? new Date(holidayEnd) : null;
  if (hStart && isNaN(hStart.getTime())) hStart = null;
  if (hEnd && isNaN(hEnd.getTime())) hEnd = null;
  if (hStart) hStart.setHours(0, 0, 0, 0);
  if (hEnd) hEnd.setHours(0, 0, 0, 0);

  let count = 0;
  let current = new Date(start);
  
  while (current < end) {
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 0 = Sunday, 6 = Saturday
    
    let isHoliday = false;
    if (hStart && hEnd && current >= hStart && current < hEnd) {
      isHoliday = true;
    }
    
    if (!isWeekend && !isHoliday) {
      count++;
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  return count;
};

/**
 * Calculates the current academic week and term based on the provided term dates.
 */
export const getAcademicWeek = (date: Date | string, termDates?: AcademicTermDates) => {
  if (!termDates || !termDates.yearOpeningDate) {
    return { term: 'N/A', week: 0, label: 'Wiki ya Kiakademia: --' };
  }

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const openingDate = new Date(termDates.yearOpeningDate);
  openingDate.setHours(0, 0, 0, 0);

  if (targetDate < openingDate) {
    return { term: 'Term 1', week: 0, label: 'Kabla ya Kufungua' };
  }

  // Helper to check if a date falls within a range
  const isInRange = (d: Date, start?: string, end?: string) => {
    if (!start || !end) return false;
    const s = new Date(start);
    const e = new Date(end);
    s.setHours(0, 0, 0, 0);
    e.setHours(0, 0, 0, 0);
    return d >= s && d <= e;
  };

  // Determine Term
  let term = 'Term 1';
  if (termDates.terminalBreakEnd && targetDate >= new Date(termDates.terminalBreakEnd)) {
    term = 'Term 2';
  }

  // Check if in break
  if (
    isInRange(targetDate, termDates.midTerm1BreakStart, termDates.midTerm1BreakEnd) ||
    isInRange(targetDate, termDates.terminalBreakStart, termDates.terminalBreakEnd) ||
    isInRange(targetDate, termDates.midTerm2BreakStart, termDates.midTerm2BreakEnd) ||
    isInRange(targetDate, termDates.annualBreakStart, termDates.annualBreakEnd)
  ) {
    return { term, week: 0, label: 'Likizo (Break)' };
  }

  // Calculate week number
  // Align opening date to the Monday of its week to count full weeks
  const openingMonday = new Date(openingDate);
  const day = openingMonday.getDay(); // 0 is Sunday, 1 is Monday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  openingMonday.setDate(openingMonday.getDate() + diffToMonday);

  const targetMonday = new Date(targetDate);
  const tDay = targetMonday.getDay();
  const tDiffToMonday = tDay === 0 ? -6 : 1 - tDay;
  targetMonday.setDate(targetMonday.getDate() + tDiffToMonday);

  const weekDiff = Math.round((targetMonday.getTime() - openingMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  
  // Subtract break weeks that have already passed
  let breakWeeks = 0;
  const breaks = [
    [termDates.midTerm1BreakStart, termDates.midTerm1BreakEnd],
    [termDates.terminalBreakStart, termDates.terminalBreakEnd],
    [termDates.midTerm2BreakStart, termDates.midTerm2BreakEnd]
  ];

  breaks.forEach(([start, end]) => {
    if (start && end) {
      const bStart = new Date(start);
      const bEnd = new Date(end);
      bStart.setHours(0, 0, 0, 0);
      bEnd.setHours(0, 0, 0, 0);
      
      if (targetDate > bEnd) {
        const bStartMon = new Date(bStart);
        const bsDay = bStartMon.getDay();
        bStartMon.setDate(bStartMon.getDate() + (bsDay === 0 ? -6 : 1 - bsDay));
        
        const bEndMon = new Date(bEnd);
        const beDay = bEndMon.getDay();
        bEndMon.setDate(bEndMon.getDate() + (beDay === 0 ? -6 : 1 - beDay));
        
        const bWeeks = Math.round((bEndMon.getTime() - bStartMon.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
        breakWeeks += bWeeks;
      }
    }
  });

  const academicWeek = Math.max(1, weekDiff - breakWeeks);

  return {
    term,
    week: academicWeek,
    label: `${term} - Wiki ya ${academicWeek}`
  };
};
