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
