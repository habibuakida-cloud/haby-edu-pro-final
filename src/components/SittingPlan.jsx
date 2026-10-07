import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Printer, 
  Download, 
  ArrowLeft, 
  ArrowRight, 
  Plus, 
  Trash2, 
  Grid, 
  Sliders, 
  Calendar, 
  Building2, 
  FileText, 
  CheckCircle2, 
  DoorClosed, 
  RefreshCw,
  Armchair,
  Sparkles,
  AlertCircle,
  Copy,
  Layers,
  Palette,
  Maximize2
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import html2canvas from 'html2canvas';
import { supabase } from '../lib/supabaseClient';

const EXAM_TYPES = [
  'CSEE',
  'FTNA',
  'ACSEE',
  'PSLE',
  'SFNA',
  'STNA',
  'MOCK',
  'PRE MOCK',
  'MID TERM',
  'TERMINAL',
  'ANNUAL'
];

// Color Theme Palettes for Whole Sitting Plan & Each Desk Box
const THEMES = {
  royal: {
    id: 'royal',
    name: 'Royal Sapphire (Default)',
    planBgClass: 'bg-[#f0f6fc]',
    planBgInline: '#f0f6fc',
    outerBorderClass: 'border-[#1e3a8a]',
    outerBorderInline: '#1e3a8a',
    accentBorderInline: '#3b82f6',
    headerBadgeBg: 'bg-[#1e3a8a] text-white',
    headerTitleClass: 'text-[#0f274a]',
    blackboardBg: 'bg-[#1e3a8a] text-white',
    doorBadgeClass: 'bg-blue-100 text-[#1e3a8a] border-[#2563eb]',
    // Desk Box Styling
    boxHeaderBg: 'bg-[#1e40af] text-white',
    boxHeaderBgInline: '#1e40af',
    boxBodyBg: 'bg-gradient-to-b from-[#e8f1fc] to-[#ffffff]',
    boxBodyBgInline: '#ffffff',
    boxBorder: 'border-[#3b82f6]',
    boxBorderInline: '#3b82f6',
    boxNumberText: 'text-[#0f274a]',
    boxNumberInline: '#0f274a',
    boxSubText: 'text-[#1e40af]',
    columnHeaderBg: 'bg-[#1e3a8a] text-white'
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Academy',
    planBgClass: 'bg-[#f0fdf4]',
    planBgInline: '#f0fdf4',
    outerBorderClass: 'border-[#14532d]',
    outerBorderInline: '#14532d',
    accentBorderInline: '#16a34a',
    headerBadgeBg: 'bg-[#14532d] text-white',
    headerTitleClass: 'text-[#064e3b]',
    blackboardBg: 'bg-[#14532d] text-white',
    doorBadgeClass: 'bg-emerald-100 text-[#14532d] border-[#16a34a]',
    // Desk Box Styling
    boxHeaderBg: 'bg-[#15803d] text-white',
    boxHeaderBgInline: '#15803d',
    boxBodyBg: 'bg-gradient-to-b from-[#e7f7ed] to-[#ffffff]',
    boxBodyBgInline: '#ffffff',
    boxBorder: 'border-[#22c55e]',
    boxBorderInline: '#22c55e',
    boxNumberText: 'text-[#064e3b]',
    boxNumberInline: '#064e3b',
    boxSubText: 'text-[#15803d]',
    columnHeaderBg: 'bg-[#14532d] text-white'
  },
  slateGold: {
    id: 'slateGold',
    name: 'Executive Slate & Gold',
    planBgClass: 'bg-[#f8fafc]',
    planBgInline: '#f8fafc',
    outerBorderClass: 'border-[#0f172a]',
    outerBorderInline: '#0f172a',
    accentBorderInline: '#d97706',
    headerBadgeBg: 'bg-[#0f172a] text-amber-300',
    headerTitleClass: 'text-[#0f172a]',
    blackboardBg: 'bg-[#0f172a] text-white',
    doorBadgeClass: 'bg-amber-50 text-[#78350f] border-[#d97706]',
    // Desk Box Styling
    boxHeaderBg: 'bg-[#1e293b] text-amber-300',
    boxHeaderBgInline: '#1e293b',
    boxBodyBg: 'bg-gradient-to-b from-[#fefce8] to-[#ffffff]',
    boxBodyBgInline: '#ffffff',
    boxBorder: 'border-[#d97706]',
    boxBorderInline: '#d97706',
    boxNumberText: 'text-[#0f172a]',
    boxNumberInline: '#0f172a',
    boxSubText: 'text-[#b45309]',
    columnHeaderBg: 'bg-[#1e293b] text-amber-300'
  },
  classic: {
    id: 'classic',
    name: 'Classic High-Contrast (Black & White)',
    planBgClass: 'bg-white',
    planBgInline: '#ffffff',
    outerBorderClass: 'border-black',
    outerBorderInline: '#000000',
    accentBorderInline: '#000000',
    headerBadgeBg: 'bg-black text-white',
    headerTitleClass: 'text-black',
    blackboardBg: 'bg-black text-white',
    doorBadgeClass: 'bg-slate-100 text-black border-black',
    // Desk Box Styling
    boxHeaderBg: 'bg-slate-800 text-white',
    boxHeaderBgInline: '#1e293b',
    boxBodyBg: 'bg-white',
    boxBodyBgInline: '#ffffff',
    boxBorder: 'border-black',
    boxBorderInline: '#000000',
    boxNumberText: 'text-black',
    boxNumberInline: '#000000',
    boxSubText: 'text-slate-700',
    columnHeaderBg: 'bg-black text-white'
  }
};

/**
 * Format 4-digit number helper (e.g., 0001)
 */
function format4Digits(num) {
  return String(num).padStart(4, '0');
}

/**
 * Format 2-digit number helper (e.g., 01)
 */
function format2Digits(num) {
  return String(num).padStart(2, '0');
}

/**
 * @param {{ schoolId?: string, schoolInfo?: any, onBack?: (() => void) | null }} props
 */
export default function SittingPlan({ schoolId = 'DEMO_SCHOOL', schoolInfo = {}, onBack = undefined }) {
  const planContainerRef = useRef(null);

  // GLOBAL EXAM DETAILS
  const [examType, setExamType] = useState('CSEE');
  const [schoolName, setSchoolName] = useState(schoolInfo.name || 'HabyEduPro3A');
  const [day, setDay] = useState('Monday');
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [subject, setSubject] = useState('011 BASIC MATHEMATICS');
  const [codeNo, setCodeNo] = useState('011');
  const [academicMaster, setAcademicMaster] = useState('Habibu Akida (Academic Master)');
  const [supervisor, setSupervisor] = useState('NECTA External Supervisor');

  // COLOR THEME SELECTOR (Default Royal Sapphire)
  const [selectedThemeKey, setSelectedThemeKey] = useState('royal');
  const theme = THEMES[selectedThemeKey] || THEMES.royal;

  // PRINT SCOPE: 'current' (Print active room only) | 'all' (Print all rooms)
  const [printScope, setPrintScope] = useState('current');

  // MULTI-ROOM CONFIGURATION STATE
  // Each room has its own name, dimensions, starting seat, entrance door, and generated grid
  const [rooms, setRooms] = useState([
    {
      id: 'room-1',
      name: 'ROOM 01',
      numRows: 6,
      numColumns: 4,
      columnSeats: [6, 6, 6, 6],
      doorEntrance: 'Left Side',
      startingSeat: '0001',
      fillPattern: 'snake'
    }
  ]);
  const [activeRoomIndex, setActiveRoomIndex] = useState(0);

  // BATCH GENERATION MODAL
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchCandidateCount, setBatchCandidateCount] = useState(72);
  const [batchSeatsPerRoom, setBatchSeatsPerRoom] = useState(24);
  const [batchStartNumber, setBatchStartNumber] = useState('0001');

  // UI Feedback
  const [savedSuccessMsg, setSavedSuccessMsg] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isExportingImage, setIsExportingImage] = useState(false);

  useEffect(() => {
    if (schoolInfo.name) {
      setSchoolName(schoolInfo.name);
    }
  }, [schoolInfo.name]);

  // Current active room helper
  const currentRoom = rooms[activeRoomIndex] || rooms[0];

  // Helper to update current room properties
  const updateCurrentRoom = (patch) => {
    setRooms(prev => {
      const copy = [...prev];
      if (copy[activeRoomIndex]) {
        copy[activeRoomIndex] = { ...copy[activeRoomIndex], ...patch };
      }
      return copy;
    });
  };

  // Adjust columns count for current room
  const handleColumnsCountChange = (val) => {
    const cols = Math.max(1, Math.min(8, parseInt(val, 10) || 1));
    const currentSeats = currentRoom.columnSeats || [];
    let updatedSeats;
    if (cols > currentSeats.length) {
      const added = Array(cols - currentSeats.length).fill(currentRoom.numRows || 6);
      updatedSeats = [...currentSeats, ...added];
    } else {
      updatedSeats = currentSeats.slice(0, cols);
    }
    updateCurrentRoom({
      numColumns: cols,
      columnSeats: updatedSeats
    });
  };

  // Adjust default rows for current room
  const handleNumRowsChange = (val) => {
    const rows = Math.max(1, Math.min(12, parseInt(val, 10) || 1));
    updateCurrentRoom({
      numRows: rows,
      columnSeats: Array(currentRoom.numColumns || 4).fill(rows)
    });
  };

  // Adjust seat count in specific column
  const handleColumnSeatsChange = (colIndex, val) => {
    const parsed = Math.max(1, Math.min(15, parseInt(val, 10) || 1));
    const updated = [...(currentRoom.columnSeats || [])];
    updated[colIndex] = parsed;
    updateCurrentRoom({ columnSeats: updated });
  };

  // Add column dynamically to current room
  const handleAddColumn = () => {
    if ((currentRoom.numColumns || 4) >= 8) return;
    const nextCol = (currentRoom.numColumns || 4) + 1;
    const updatedSeats = [...(currentRoom.columnSeats || []), currentRoom.numRows || 6];
    updateCurrentRoom({
      numColumns: nextCol,
      columnSeats: updatedSeats
    });
  };

  // Remove column from current room
  const handleRemoveColumn = (colIndex) => {
    if ((currentRoom.numColumns || 4) <= 1) return;
    const updatedSeats = (currentRoom.columnSeats || []).filter((_, idx) => idx !== colIndex);
    updateCurrentRoom({
      numColumns: updatedSeats.length,
      columnSeats: updatedSeats
    });
  };

  // Add a new empty room
  const handleAddNewRoom = () => {
    const nextRoomNum = rooms.length + 1;
    const prevRoom = rooms[rooms.length - 1];
    let nextStartNum = 1;
    if (prevRoom) {
      const prevTotal = (prevRoom.columnSeats || []).reduce((a, b) => a + b, 0);
      const prevStart = parseInt(prevRoom.startingSeat, 10) || 1;
      nextStartNum = prevStart + prevTotal;
    }
    const newRoom = {
      id: `room-${Date.now()}`,
      name: `ROOM ${format2Digits(nextRoomNum)}`,
      numRows: prevRoom?.numRows || 6,
      numColumns: prevRoom?.numColumns || 4,
      columnSeats: [...(prevRoom?.columnSeats || [6, 6, 6, 6])],
      doorEntrance: prevRoom?.doorEntrance || 'Left Side',
      startingSeat: format4Digits(nextStartNum),
      fillPattern: prevRoom?.fillPattern || 'snake'
    };
    setRooms(prev => [...prev, newRoom]);
    setActiveRoomIndex(rooms.length);
    setSavedSuccessMsg(`Chumba kipya ${newRoom.name} kimeongezwa!`);
    setTimeout(() => setSavedSuccessMsg(null), 3000);
  };

  // Duplicate active room
  const handleDuplicateRoom = () => {
    const nextRoomNum = rooms.length + 1;
    const totalCurrentSeats = (currentRoom.columnSeats || []).reduce((a, b) => a + b, 0);
    const startNum = (parseInt(currentRoom.startingSeat, 10) || 1) + totalCurrentSeats;
    const clonedRoom = {
      ...currentRoom,
      id: `room-${Date.now()}`,
      name: `ROOM ${format2Digits(nextRoomNum)}`,
      startingSeat: format4Digits(startNum)
    };
    setRooms(prev => [...prev, clonedRoom]);
    setActiveRoomIndex(rooms.length);
    setSavedSuccessMsg(`Chumba kimewezeshwa kwa namba zinazofuata (${format4Digits(startNum)})!`);
    setTimeout(() => setSavedSuccessMsg(null), 3000);
  };

  // Remove a room
  const handleDeleteRoom = (index) => {
    if (rooms.length <= 1) {
      setErrorMessage('Huwezi kufuta chumba cha mwisho. Angalau chumba kimoja kinahitajika.');
      setTimeout(() => setErrorMessage(null), 3500);
      return;
    }
    const updated = rooms.filter((_, idx) => idx !== index);
    setRooms(updated);
    setActiveRoomIndex(Math.max(0, index - 1));
  };

  // Batch Auto-distributor for Multiple Rooms
  const handleApplyBatchGeneration = () => {
    const totalCand = Math.max(1, parseInt(batchCandidateCount, 10) || 1);
    const perRoom = Math.max(6, parseInt(batchSeatsPerRoom, 10) || 24);
    const startNumber = parseInt(batchStartNumber, 10) || 1;
    const roomCount = Math.ceil(totalCand / perRoom);

    const newRoomsList = [];
    let currentStart = startNumber;

    for (let i = 0; i < roomCount; i++) {
      const remaining = totalCand - i * perRoom;
      const thisRoomSeats = Math.min(perRoom, remaining);
      const cols = 4;
      const baseRows = Math.floor(thisRoomSeats / cols);
      const remainder = thisRoomSeats % cols;
      const colSeats = Array(cols).fill(baseRows).map((val, idx) => val + (idx < remainder ? 1 : 0));
      const maxRowsInRoom = Math.max(...colSeats);

      newRoomsList.push({
        id: `room-batch-${i + 1}`,
        name: `ROOM ${format2Digits(i + 1)}`,
        numRows: maxRowsInRoom,
        numColumns: cols,
        columnSeats: colSeats,
        doorEntrance: 'Left Side',
        startingSeat: format4Digits(currentStart),
        fillPattern: 'snake'
      });
      currentStart += thisRoomSeats;
    }

    setRooms(newRoomsList);
    setActiveRoomIndex(0);
    setShowBatchModal(false);
    setSavedSuccessMsg(`Vyumba ${roomCount} vimewekwa kikamilifu kwa watahiniwa ${totalCand}!`);
    setTimeout(() => setSavedSuccessMsg(null), 4000);
  };

  /**
   * GRID GENERATOR FOR A GIVEN ROOM
   * Generates 2D array [row][col] with candidates in Snake or Straight sequence
   */
  const generateRoomGrid = (room) => {
    const {
      numColumns = 4,
      columnSeats = [6, 6, 6, 6],
      doorEntrance = 'Left Side',
      startingSeat = '0001',
      fillPattern = 'snake'
    } = room;

    const startNum = parseInt(startingSeat, 10) || 1;
    let currentNumber = startNum;
    const maxRows = Math.max(...columnSeats, 1);
    const grid = Array.from({ length: maxRows }, () => Array(numColumns).fill(null));

    // Determine processing sequence based on door location
    const colOrder = [];
    if (doorEntrance === 'Left Side') {
      // Column 0 (Left nearest to Door) to Column N - 1
      for (let c = 0; c < numColumns; c++) colOrder.push(c);
    } else {
      // Column N - 1 (Right nearest to Door) down to Column 0
      for (let c = numColumns - 1; c >= 0; c--) colOrder.push(c);
    }

    colOrder.forEach((colIdx, orderIdx) => {
      const seatsInCol = columnSeats[colIdx] || 0;
      const isEvenOrder = orderIdx % 2 === 0;

      if (fillPattern === 'snake') {
        if (isEvenOrder) {
          // Top to Bottom
          for (let r = 0; r < seatsInCol; r++) {
            grid[r][colIdx] = {
              seatNo: format4Digits(currentNumber),
              colIndex: colIdx,
              rowIndex: r
            };
            currentNumber++;
          }
        } else {
          // Bottom to Top
          for (let r = seatsInCol - 1; r >= 0; r--) {
            grid[r][colIdx] = {
              seatNo: format4Digits(currentNumber),
              colIndex: colIdx,
              rowIndex: r
            };
            currentNumber++;
          }
        }
      } else {
        // Straight top to bottom
        for (let r = 0; r < seatsInCol; r++) {
          grid[r][colIdx] = {
            seatNo: format4Digits(currentNumber),
            colIndex: colIdx,
            rowIndex: r
          };
          currentNumber++;
        }
      }
    });

    const totalSeatsInRoom = columnSeats.reduce((a, b) => a + b, 0);
    const endSeatNum = startNum + totalSeatsInRoom - 1;

    return {
      grid,
      maxRows,
      totalSeats: totalSeatsInRoom,
      startSeatFormatted: format4Digits(startNum),
      endSeatFormatted: format4Digits(endSeatNum)
    };
  };

  // Compute all grids
  const computedRooms = useMemo(() => {
    return rooms.map(room => {
      const result = generateRoomGrid(room);
      return {
        ...room,
        ...result
      };
    });
  }, [rooms]);

  const activeComputedRoom = computedRooms[activeRoomIndex] || computedRooms[0];

  // Save to Supabase (Background)
  const handleSaveToDatabase = async () => {
    try {
      const inserts = computedRooms.map(r => ({
        school_id: schoolId,
        exam_type: examType,
        room_no: r.name,
        subject,
        code_no: codeNo,
        exam_date: examDate,
        door_entrance: r.doorEntrance,
        total_seats: r.totalSeats,
        start_seat: r.startSeatFormatted,
        end_seat: r.endSeatFormatted,
        columns_count: r.numColumns,
        rows_count: r.maxRows,
        columns_seats: r.columnSeats,
        created_at: new Date().toISOString()
      }));

      await supabase.from('sitting_plans').insert(inserts);
      setSavedSuccessMsg('Mpangilio wa vyumba umehifadhiwa kikamilifu kwenye database!');
      setTimeout(() => setSavedSuccessMsg(null), 3500);
    } catch (err) {
      console.warn('Could not save sitting plan to supabase:', err);
    }
  };

  // NATIVE REACT-TO-PRINT TRIGGER
  const reactToPrintTrigger = useReactToPrint({
    contentRef: planContainerRef,
    documentTitle: `NECTA_SITTING_PLAN_${examType}_${(currentRoom?.name || 'ROOM').replace(/\s+/g, '_')}`,
    pageStyle: `
      @page {
        size: A4 portrait !important;
        margin: 6mm 8mm !important;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
      }
    `
  });

  const handlePrintCurrentRoom = () => {
    setPrintScope('current');
    setTimeout(() => {
      try {
        if (reactToPrintTrigger) {
          reactToPrintTrigger();
        } else {
          window.print();
        }
      } catch {
        window.print();
      }
    }, 100);
  };

  const handlePrintAllRooms = () => {
    setPrintScope('all');
    setTimeout(() => {
      try {
        if (reactToPrintTrigger) {
          reactToPrintTrigger();
        } else {
          window.print();
        }
      } catch {
        window.print();
      }
    }, 100);
  };

  // Export as high-resolution PNG image
  const handleExportImage = async () => {
    const targetElement = document.getElementById(`room-portrait-page-${activeRoomIndex}`);
    if (!targetElement) return;
    setIsExportingImage(true);
    setErrorMessage(null);
    try {
      const canvas = await html2canvas(targetElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: theme.planBgInline
      });
      const link = document.createElement('a');
      link.download = `SITTING_PLAN_${examType}_${(currentRoom?.name || 'ROOM').replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setSavedSuccessMsg('Picha ya ubora wa juu imepakuliwa kwa ufanisi!');
      setTimeout(() => setSavedSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Export image error:', err);
      setErrorMessage('Hitilafu wakati wa kutoa picha. Tafadhali jaribu tena au tumia Print.');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsExportingImage(false);
    }
  };

  // Determine dynamic row height based on maximum rows in room
  // This guarantees that all rows fit strictly on ONE single portrait A4 page
  const getDynamicRowHeight = (maxRows) => {
    if (maxRows <= 5) return 'h-14 sm:h-14';
    if (maxRows === 6) return 'h-12 sm:h-12';
    if (maxRows === 7) return 'h-10 sm:h-10';
    if (maxRows === 8) return 'h-9 sm:h-9';
    return 'h-8 sm:h-8';
  };

  const getDynamicNumberSize = (maxRows) => {
    if (maxRows <= 6) return 'text-base sm:text-lg font-black';
    if (maxRows <= 8) return 'text-sm sm:text-base font-black';
    return 'text-xs sm:text-sm font-black';
  };

  // Determine which rooms to render for printing / viewing
  const roomsToRender = printScope === 'all' 
    ? computedRooms 
    : [activeComputedRoom];

  return (
    <div className="space-y-6">
      {/* 
        OFFICIAL PRINT CSS FOR A4 PORTRAIT - STRICTLY ONE PAGE PER ROOM
        Guarantees that each room occupies exactly 1 page and never spills over into 2 pages!
      */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait !important;
            margin: 6mm 8mm !important;
          }
          body * {
            visibility: hidden !important;
          }
          #sitting-plan-print-root,
          #sitting-plan-print-root * {
            visibility: visible !important;
          }
          #sitting-plan-print-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
          }
          .room-portrait-page {
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            width: 100% !important;
            height: 284mm !important;
            max-height: 284mm !important;
            min-height: 284mm !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            padding: 5mm 7mm !important;
            margin: 0 auto !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            border-width: 3px !important;
          }
          .room-portrait-page:last-of-type {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {/* TOP CONTROL PANEL & SETTINGS (Hidden during Print) */}
      <div className="no-print bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-6">
        {/* Main Title & Action Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-blue-100 text-blue-900 rounded-lg text-xs font-black tracking-wider uppercase flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                NECTA Official Sitting Plan
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                School ID: {schoolId}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 mt-1 flex items-center gap-2">
              <span>Examination Sitting Plan Generator</span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                A4 Portrait (1 Page Per Room)
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Mpangilio rasmi wa mitihani ya NECTA kwa ukurasa 1 wa Portrait kwa kila chumba, rangi nzuri za chumba na madawati.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Rudi / Back</span>
              </button>
            )}

            {/* Quick Batch Room Generator Button */}
            <button
              type="button"
              onClick={() => setShowBatchModal(true)}
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition active:scale-95"
            >
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Gawa Vyumba (Batch Generator)</span>
            </button>

            {/* Print Current Room in A4 Portrait */}
            <button
              type="button"
              onClick={handlePrintCurrentRoom}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm transition active:scale-95"
              title="Inachapisha chumba hiki tu kwenye ukurasa 1 wa A4 Portrait"
            >
              <Printer className="w-4 h-4" />
              <span>Print Room (1 Page Portrait)</span>
            </button>

            {/* Print All Rooms (Each on 1 Page) */}
            {rooms.length > 1 && (
              <button
                type="button"
                onClick={handlePrintAllRooms}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm transition active:scale-95"
                title="Inachapisha vyumba vyote, kila chumba ukurasa 1 kamili wa Portrait"
              >
                <Printer className="w-4 h-4" />
                <span>Print All {rooms.length} Rooms (1 Page Each)</span>
              </button>
            )}

            {/* Export High Res Image */}
            <button
              type="button"
              onClick={handleExportImage}
              disabled={isExportingImage}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>{isExportingImage ? 'Exporting...' : 'Export PNG Image'}</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {savedSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{savedSuccessMsg}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* THEME & COLOR CUSTOMIZER ROW */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <span className="font-black text-slate-800 text-xs block">
                Sitting Plan Color Theme &amp; Box Colors:
              </span>
              <span className="text-[11px] text-slate-500">
                Chagua rangi inayovutia kwa chumba na masanduku ya watahiniwa (Visual aesthetics)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {Object.keys(THEMES).map(key => {
              const item = THEMES[key];
              const isSelected = selectedThemeKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedThemeKey(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-white border-blue-600 text-blue-900 shadow-sm ring-2 ring-blue-200'
                      : 'bg-white/80 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span 
                    className="w-3.5 h-3.5 rounded-full border border-black/20"
                    style={{ backgroundColor: item.boxHeaderBgInline }}
                  />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ROOM TABS (Multi-room switching, add, duplicate, remove) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Exam Rooms ({rooms.length} Rooms Configured)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddNewRoom}
                className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ongeza Chumba (+ Room)</span>
              </button>
              <button
                type="button"
                onClick={handleDuplicateRoom}
                className="text-xs font-bold text-slate-600 hover:text-slate-800 flex items-center gap-1 cursor-pointer bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200"
                title="Nakili chumba hiki na endeleza namba ya mtahiniwa mbele"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplicate Next</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {computedRooms.map((rm, idx) => {
              const isActive = idx === activeRoomIndex;
              return (
                <div
                  key={rm.id || idx}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black cursor-pointer transition shrink-0 border ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                  onClick={() => setActiveRoomIndex(idx)}
                >
                  <Armchair className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-blue-600'}`} />
                  <span>{rm.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    isActive ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {rm.startSeatFormatted} - {rm.endSeatFormatted} ({rm.totalSeats} seats)
                  </span>

                  {rooms.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRoom(idx);
                      }}
                      className={`ml-1 hover:text-rose-300 p-0.5 rounded cursor-pointer ${
                        isActive ? 'text-blue-200' : 'text-slate-400 hover:text-rose-600'
                      }`}
                      title="Futa chumba hiki"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ACTIVE ROOM LAYOUT & EXAMINATION DETAILS INPUTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs pt-2">
          {/* Examination Type */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Type of Examination</label>
            <select
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-slate-50 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {EXAM_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* School Name */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Name of School</label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg font-semibold text-slate-800 bg-slate-50 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Room Number Name */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Room Name / Label</label>
            <input
              type="text"
              value={currentRoom.name}
              onChange={(e) => updateCurrentRoom({ name: e.target.value })}
              placeholder="e.g. ROOM 01 / LAB A"
              className="w-full p-2 border border-slate-300 rounded-lg font-bold text-blue-900 bg-slate-50 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Day & Date */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Day</label>
              <input
                type="text"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                placeholder="Monday"
                className="w-full p-2 border border-slate-300 rounded-lg font-semibold text-slate-800 bg-slate-50 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-semibold text-slate-800 bg-slate-50 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Subject & Code */}
          <div className="grid grid-cols-3 gap-2 lg:col-span-2">
            <div className="col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="011 BASIC MATHEMATICS"
                className="w-full p-2 border border-slate-300 rounded-lg font-semibold text-slate-800 bg-slate-50 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Subject Code</label>
              <input
                type="text"
                value={codeNo}
                onChange={(e) => setCodeNo(e.target.value)}
                placeholder="011"
                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-slate-50 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Starting Seat Number */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Starting Seat (4 Digits)</label>
            <input
              type="text"
              value={currentRoom.startingSeat}
              maxLength={4}
              onChange={(e) => {
                const clean = e.target.value.replace(/[^0-9]/g, '');
                updateCurrentRoom({ startingSeat: clean });
              }}
              placeholder="0001"
              className="w-full p-2 border border-slate-300 rounded-lg font-mono font-black text-slate-900 bg-slate-50 text-center tracking-widest focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Door Entrance */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Door Entrance</label>
            <select
              value={currentRoom.doorEntrance}
              onChange={(e) => updateCurrentRoom({ doorEntrance: e.target.value })}
              className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-slate-50 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="Left Side">Left Side (Anti-Clockwise)</option>
              <option value="Right Side">Right Side (Clockwise)</option>
            </select>
          </div>
        </div>

        {/* ROOM DESK & COLUMN SETTINGS */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              <span className="font-black text-slate-800 text-xs">
                {currentRoom.name} Layout ({currentRoom.numColumns} Columns, {activeComputedRoom.totalSeats} Total Candidates)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500">Pattern:</span>
              <button
                type="button"
                onClick={() => updateCurrentRoom({
                  fillPattern: currentRoom.fillPattern === 'snake' ? 'topToBottom' : 'snake'
                })}
                className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                {currentRoom.fillPattern === 'snake' ? 'Snake Pattern (NECTA Security)' : 'Straight Top-to-Bottom'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Rows per Column</label>
              <input
                type="number"
                min="1"
                max="12"
                value={currentRoom.numRows}
                onChange={(e) => handleNumRowsChange(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Number of Columns</label>
              <input
                type="number"
                min="1"
                max="8"
                value={currentRoom.numColumns}
                onChange={(e) => handleColumnsCountChange(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleAddColumn}
                disabled={currentRoom.numColumns >= 8}
                className="w-full p-2 text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 disabled:opacity-50 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add Column (Max 8)</span>
              </button>
            </div>
          </div>

          {/* Seats per individual column */}
          <div className="pt-2">
            <span className="text-[11px] font-bold text-slate-600 block mb-2">
              Seats in Each Column (Safu za Madawati):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {(currentRoom.columnSeats || []).map((count, colIdx) => (
                <div key={colIdx} className="bg-white p-2.5 rounded-lg border border-slate-300 text-center space-y-1 shadow-2xs">
                  <div className="flex items-center justify-between text-[11px] font-black text-slate-700">
                    <span>Col {colIdx + 1}</span>
                    {currentRoom.numColumns > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveColumn(colIdx)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5"
                        title="Ondoa safu hii"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={count}
                    onChange={(e) => handleColumnSeatsChange(colIdx, e.target.value)}
                    className="w-full py-1 text-center font-black text-sm text-slate-900 border border-slate-200 rounded-md bg-slate-50"
                  />
                  <span className="text-[10px] text-slate-400 block font-medium">desks</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* BATCH GENERATOR MODAL */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-slate-900 text-base">Gawa Vyumba Kiotomatiki (Batch)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-black p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Weka idadi ya watahiniwa na uwezo wa kila chumba ili mfumo ugawanye vyumba kiotomatiki (kila chumba kikiwa na ukurasa 1 wa Portrait).
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Idadi ya Watahiniwa (Total Candidates)</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={batchCandidateCount}
                  onChange={(e) => setBatchCandidateCount(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-black text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Idadi ya Madawati kwa Chumba (Seats per Room)</label>
                <input
                  type="number"
                  min="6"
                  max="48"
                  value={batchSeatsPerRoom}
                  onChange={(e) => setBatchSeatsPerRoom(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-black text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Namba ya Kuanzia (Starting Candidate Number)</label>
                <input
                  type="text"
                  maxLength={4}
                  value={batchStartNumber}
                  onChange={(e) => setBatchStartNumber(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono font-black text-sm text-center text-slate-900 tracking-widest"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs">
                <span className="font-bold">Muhtasari: </span>
                Vyumba <strong>{Math.ceil(Math.max(1, parseInt(batchCandidateCount, 10) || 1) / Math.max(6, parseInt(batchSeatsPerRoom, 10) || 24))}</strong> vitatengenezwa. Kila chumba kitatoka kwenye ukurasa 1 wa A4 Portrait.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Ghairi
              </button>
              <button
                type="button"
                onClick={handleApplyBatchGeneration}
                className="px-4 py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer shadow-sm"
              >
                Tengeneza Vyumba Vyote
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 
        OFFICIAL PRINTABLE SITTING PLAN CANVAS (PORTRAIT A4)
        Strictly fits on ONE PAGE of portrait for each room!
      */}
      <div 
        ref={planContainerRef}
        id="sitting-plan-print-root"
        className="space-y-8"
      >
        {roomsToRender.map((room, roomIdx) => {
          const rowHeightClass = getDynamicRowHeight(room.maxRows);
          const numberSizeClass = getDynamicNumberSize(room.maxRows);

          return (
            <div
              key={room.id || roomIdx}
              id={`room-portrait-page-${roomIdx}`}
              className={`room-portrait-page mx-auto shadow-xl transition-all font-sans relative border-3 ${theme.planBgClass} ${theme.outerBorderClass}`}
              style={{
                width: '100%',
                maxWidth: '780px',
                minHeight: '1020px',
                backgroundColor: theme.planBgInline,
                borderColor: theme.outerBorderInline
              }}
            >
              {/* SLIM NATIONAL TANZANIA RIBBON ACCENT (Green, Gold, Black, Blue) */}
              <div className="h-1.5 w-full flex rounded-t-sm overflow-hidden mb-2">
                <div className="h-full flex-1 bg-[#1eb53a]" />
                <div className="h-full w-2 bg-[#fcd116]" />
                <div className="h-full flex-1 bg-[#000000]" />
                <div className="h-full w-2 bg-[#fcd116]" />
                <div className="h-full flex-1 bg-[#00a3dd]" />
              </div>

              {/* DOCUMENT HEADER */}
              <div className="text-center space-y-1 pb-2 border-b-2" style={{ borderColor: theme.outerBorderInline }}>
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-700">
                  THE UNITED REPUBLIC OF TANZANIA
                </h3>
                <h1 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900 leading-tight">
                  NATIONAL EXAMINATIONS COUNCIL OF TANZANIA (NECTA)
                </h1>
                <div className="flex items-center justify-center gap-2 pt-0.5">
                  <span className={`inline-block px-3 py-0.5 rounded text-xs font-black uppercase tracking-wider ${theme.headerBadgeBg}`}>
                    {examType} EXAMINATION SITTING PLAN — {new Date().getFullYear()}
                  </span>
                  <span className="text-xs font-black px-2.5 py-0.5 bg-white border border-slate-300 rounded text-slate-800">
                    PORTRAIT A4
                  </span>
                </div>
              </div>

              {/* METADATA BAR (2-Column Official Examination Table) */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] border-b-2 py-2" style={{ borderColor: theme.outerBorderInline }}>
                <div className="space-y-1">
                  <div className="flex items-center">
                    <span className="font-bold w-28 uppercase text-slate-600">School:</span>
                    <span className="font-black text-slate-900 uppercase truncate">{schoolName}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-bold w-28 uppercase text-slate-600">Subject:</span>
                    <span className="font-black text-slate-900 uppercase truncate">{subject} ({codeNo})</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-bold w-28 uppercase text-slate-600">Room No:</span>
                    <span className="font-black text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-950 border border-blue-300 inline-block uppercase">
                      {room.name}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center">
                    <span className="font-bold w-28 uppercase text-slate-600">Day &amp; Date:</span>
                    <span className="font-black text-slate-900">{day}, {examDate}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-bold w-28 uppercase text-slate-600">Candidates:</span>
                    <span className="font-black text-slate-900">
                      {room.totalSeats} Candidates ({room.startSeatFormatted} — {room.endSeatFormatted})
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-bold w-28 uppercase text-slate-600">Door Entrance:</span>
                    <span className="font-black text-slate-900">
                      {room.doorEntrance} ({room.doorEntrance === 'Left Side' ? 'Anti-Clockwise' : 'Clockwise'})
                    </span>
                  </div>
                </div>
              </div>

              {/* FRONT OF CLASS / BLACKBOARD BANNER */}
              <div className="space-y-1.5 pt-1.5">
                <div 
                  className={`w-full py-1.5 px-3 rounded text-center font-black text-[11px] tracking-wider flex items-center justify-center gap-2 uppercase shadow-xs ${theme.blackboardBg}`}
                >
                  <Armchair className="w-3.5 h-3.5 text-amber-300" />
                  <span>FRONT OF ROOM — CHALKBOARD &amp; INVIGILATOR DESK</span>
                  <Armchair className="w-3.5 h-3.5 text-amber-300" />
                </div>

                {/* ENTRANCE DOOR ARROW INDICATOR */}
                <div className="flex items-center justify-between text-[11px] font-bold px-1">
                  {room.doorEntrance === 'Left Side' ? (
                    <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded border font-black ${theme.doorBadgeClass}`}>
                      <DoorClosed className="w-3.5 h-3.5" />
                      <ArrowRight className="w-3.5 h-3.5 text-blue-700" />
                      <span>ENTRANCE DOOR (START: {room.startSeatFormatted})</span>
                    </div>
                  ) : (
                    <div />
                  )}

                  {room.doorEntrance === 'Right Side' ? (
                    <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded border font-black ${theme.doorBadgeClass}`}>
                      <span>ENTRANCE DOOR (START: {room.startSeatFormatted})</span>
                      <ArrowLeft className="w-3.5 h-3.5 text-blue-700" />
                      <DoorClosed className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div />
                  )}
                </div>
              </div>

              {/* SEATS GRID DISPLAY - BEAUTIFULLY STYLED CANDIDATE DESKS */}
              <div className="my-auto py-1">
                <div 
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: `repeat(${room.numColumns}, minmax(0, 1fr))`
                  }}
                >
                  {Array.from({ length: room.numColumns }).map((_, colIdx) => (
                    <div key={colIdx} className="space-y-1.5">
                      {/* Column Header */}
                      <div 
                        className={`text-center py-0.5 rounded text-[10px] font-black uppercase tracking-wider shadow-2xs ${theme.columnHeaderBg}`}
                      >
                        Column {colIdx + 1}
                      </div>

                      {/* Column Desks / Boxes */}
                      <div className="space-y-1.5">
                        {room.grid && room.grid.map((rowArr, rowIdx) => {
                          const seat = rowArr[colIdx];
                          if (!seat) {
                            return (
                              <div
                                key={rowIdx}
                                className={`${rowHeightClass} border border-dashed border-slate-300 bg-slate-100/50 rounded flex items-center justify-center text-[9px] text-slate-400 font-medium`}
                              >
                                Empty Desk
                              </div>
                            );
                          }

                          return (
                            <div
                              key={rowIdx}
                              className={`${rowHeightClass} ${theme.boxBodyBg} border-2 ${theme.boxBorder} rounded flex flex-col justify-between p-1 shadow-2xs transition overflow-hidden`}
                              style={{
                                borderColor: theme.boxBorderInline
                              }}
                            >
                              {/* Desk Top Strip */}
                              <div 
                                className={`flex items-center justify-between px-1 py-0.2 rounded-xs text-[8px] font-black uppercase tracking-wider ${theme.boxHeaderBg}`}
                                style={{ backgroundColor: theme.boxHeaderBgInline }}
                              >
                                <span>DESK</span>
                                <span className="opacity-90">R{rowIdx + 1}C{colIdx + 1}</span>
                              </div>

                              {/* Candidate Roll Number */}
                              <div className="flex-1 flex items-center justify-center relative">
                                <span className={`font-mono tracking-tighter text-slate-900 ${numberSizeClass} break-all`}>
                                  {seat.seatNo}
                                </span>
                                
                                {/* Checkbox for Attendance */}
                                <div className="absolute top-0.5 right-0.5">
                                  <input 
                                    type="checkbox" 
                                    className="w-3 h-3 cursor-pointer accent-blue-600"
                                    title="Tiki kama mtahiniwa amehudhuria"
                                  />
                                </div>
                              </div>

                              {/* Desk Bottom Sub-tag */}
                              <div className="text-center leading-none">
                                <span className={`text-[8px] font-black uppercase tracking-wider ${theme.boxSubText}`}>
                                  CANDIDATE
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* REAR OF EXAMINATION ROOM */}
              <div className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest py-1 border-t border-slate-300">
                — REAR / BACK OF EXAMINATION ROOM —
              </div>

              {/* OFFICIAL SIGNATURES & SCHOOL STAMP FOOTER */}
              <div className="pt-2 border-t-2 space-y-2" style={{ borderColor: theme.outerBorderInline }}>
                <div className="grid grid-cols-2 gap-4 text-[10px]">
                  {/* Class Invigilator */}
                  <div className="space-y-1.5">
                    <div className="flex items-center">
                      <span className="font-bold w-40 uppercase text-slate-700">Invigilator Name:</span>
                      <span className="border-b border-black flex-1 h-4 font-bold text-slate-900">{academicMaster}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-bold w-20 uppercase text-slate-700">Signature:</span>
                      <span className="border-b border-black flex-1 h-4 mr-2" />
                      <span className="font-bold w-12 uppercase text-slate-700">Date:</span>
                      <span className="border-b border-black flex-1 h-4 font-semibold text-slate-900">{examDate}</span>
                    </div>
                  </div>

                  {/* Supervisor */}
                  <div className="space-y-1.5">
                    <div className="flex items-center">
                      <span className="font-bold w-40 uppercase text-slate-700">Supervisor Name:</span>
                      <span className="border-b border-black flex-1 h-4 font-bold text-slate-900">{supervisor}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-bold w-20 uppercase text-slate-700">Signature:</span>
                      <span className="border-b border-black flex-1 h-4 mr-2" />
                      <span className="font-bold w-12 uppercase text-slate-700">Date:</span>
                      <span className="border-b border-black flex-1 h-4 font-semibold text-slate-900">{examDate}</span>
                    </div>
                  </div>
                </div>

                {/* Stamp & Notice */}
                <div className="flex items-center justify-between pt-1">
                  <div className="text-[9px] text-slate-500 italic max-w-md">
                    * Sitting plan must be posted outside examination room 30 minutes prior to exam start.
                    <br />
                    * Every candidate must occupy the seat bearing their four-digit number.
                  </div>

                  <div className="w-36 h-14 border-2 border-dashed border-slate-600 rounded flex flex-col items-center justify-center text-center p-1 bg-white/80">
                    <span className="text-[9px] font-black uppercase text-slate-700">SCHOOL OFFICIAL STAMP</span>
                    <span className="text-[8px] text-slate-400">(Official Seal)</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
