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
  Maximize2,
  Edit3,
  Play,
  Pause,
  RotateCcw,
  Eye,
  Database
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { supabase } from '../lib/dbClient';

// In-memory cache per schoolId so switching modules in SPA is 100% instant with zero flicker
const sittingPlanMemoryCache = new Map();

function normalizeSittingPlanSchoolId(rawId) {
  const s = String(rawId || '').trim();
  return !s || s === 'DEMO_SCHOOL' || s === 'DEFAULT_PRIMARY_SCHOOL_ID'
    ? '02dff10d-78fb-4af6-ab5a-db1d275d7e06'
    : s;
}

function loadSavedSittingPlanState(schoolId) {
  const normId = normalizeSittingPlanSchoolId(schoolId);
  if (sittingPlanMemoryCache.has(normId)) {
    return sittingPlanMemoryCache.get(normId);
  }
  if (typeof window !== 'undefined') {
    try {
      const raw =
        localStorage.getItem(`haby_sitting_plan_state_${normId}`) ||
        localStorage.getItem(`haby_sitting_plan_state_${schoolId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.rooms) && parsed.rooms.length > 0) {
          sittingPlanMemoryCache.set(normId, parsed);
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read sitting plan state from localStorage:', e);
    }
  }
  return null;
}

function escapeXml(unsafe) {
  return String(unsafe ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

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
  const normalizedSchoolId = useMemo(() => normalizeSittingPlanSchoolId(schoolId), [schoolId]);
  const initialSaved = useMemo(() => loadSavedSittingPlanState(normalizedSchoolId), [normalizedSchoolId]);

  // GLOBAL EXAM DETAILS (Restored from saved database / localStorage state)
  const [examType, setExamType] = useState(() => initialSaved?.examType || 'CSEE');
  const [schoolName, setSchoolName] = useState(() => initialSaved?.schoolName || schoolInfo.name || 'HabyEduPro3A');
  const [day, setDay] = useState(() => initialSaved?.day || 'Monday');
  const [examDate, setExamDate] = useState(() => initialSaved?.examDate || new Date().toISOString().split('T')[0]);
  const [subject, setSubject] = useState(() => initialSaved?.subject || '011 BASIC MATHEMATICS');
  const [codeNo, setCodeNo] = useState(() => initialSaved?.codeNo || '011');
  const [academicMaster, setAcademicMaster] = useState(() => initialSaved?.academicMaster ?? '');
  const [supervisor, setSupervisor] = useState(() => initialSaved?.supervisor ?? '');

  // COLOR THEME SELECTOR (Default Royal Sapphire)
  const [selectedThemeKey, setSelectedThemeKey] = useState(() => initialSaved?.selectedThemeKey || 'royal');
  const theme = THEMES[selectedThemeKey] || THEMES.royal;

  // PRINT SCOPE: 'current' (Print active room only) | 'all' (Print all rooms)
  const [printScope, setPrintScope] = useState('current');

  // MULTI-ROOM CONFIGURATION STATE
  // Each room has its own name, dimensions, starting seat, entrance door, and generated grid
  const [rooms, setRooms] = useState(() =>
    Array.isArray(initialSaved?.rooms) && initialSaved.rooms.length > 0
      ? initialSaved.rooms
      : [
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
        ]
  );
  const [activeRoomIndex, setActiveRoomIndex] = useState(() => {
    const idx = Number(initialSaved?.activeRoomIndex || 0);
    const maxIdx = Array.isArray(initialSaved?.rooms) ? Math.max(0, initialSaved.rooms.length - 1) : 0;
    return Math.min(Math.max(0, idx), maxIdx);
  });

  // BATCH / AUTOMATIC MULTI-ROOM GENERATOR STATE
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchCandidateCount, setBatchCandidateCount] = useState(() => initialSaved?.batchCandidateCount ?? 300);
  const [batchSeatsPerRoom, setBatchSeatsPerRoom] = useState(() => initialSaved?.batchSeatsPerRoom ?? 25);
  const [batchColsPerRoom, setBatchColsPerRoom] = useState(() => initialSaved?.batchColsPerRoom ?? 4);
  const [batchPattern, setBatchPattern] = useState(() => initialSaved?.batchPattern || 'snake');
  const [batchStartNumber, setBatchStartNumber] = useState(() => initialSaved?.batchStartNumber || '0001');

  // MANUAL LIST MODAL
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualListText, setManualListText] = useState('');

  const handleApplyManualList = () => {
    const list = manualListText
      .split(/[\n,\t]+/)
      .map(s => s.trim())
      .filter(Boolean);

    if (list.length === 0) {
      setErrorMessage('Tafadhali weka namba za watahiniwa angalau moja.');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    const newOverrides = { ...seatOverrides };
    let listIdx = 0;
    const roomIdx = activeRoomIndex;
    const room = activeComputedRoom;

    room.grid.forEach((rowArr, rowIdx) => {
      rowArr.forEach((seat, colIdx) => {
        if (seat && !seat.isDeleted && listIdx < list.length) {
          const overrideKey = `${roomIdx}-${rowIdx}-${colIdx}`;
          newOverrides[overrideKey] = list[listIdx];
          listIdx++;
        }
      });
    });

    setSeatOverrides(newOverrides);
    setShowManualModal(false);
    setManualListText('');
    setSavedSuccessMsg(`Namba ${listIdx} zimewekwa kwa mafanikio kwenye chumba ${room.name}!`);
    setTimeout(() => setSavedSuccessMsg(null), 3500);
  };

  // CUSTOM SEAT OVERRIDES & MOVABLE/SWAPPABLE DESKS STATE
  const [seatOverrides, setSeatOverrides] = useState(() =>
    initialSaved?.seatOverrides && typeof initialSaved.seatOverrides === 'object'
      ? initialSaved.seatOverrides
      : {}
  );
  const [selectedDeskForMove, setSelectedDeskForMove] = useState(null); // { roomIdx, rowIdx, colIdx, seatNo }
  const [draggedDesk, setDraggedDesk] = useState(null); // { roomIdx, rowIdx, colIdx, seatNo }

  // Clear hardcoded number overrides in a room while keeping DELETED and ACTIVE desk positions intact
  // so Snake Pattern / Straight Pattern / Starting Seat / Door Entrance always re-flow numbers cleanly
  const clearRoomNumberOverridesKeepLayout = (roomIdx) => {
    const rm = rooms[roomIdx];
    const colSeats = rm?.columnSeats || [];
    setSeatOverrides(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        if (key.startsWith(`${roomIdx}-`)) {
          const parts = key.split('-');
          const rIdx = parseInt(parts[1], 10);
          const cIdx = parseInt(parts[2], 10);
          const val = next[key];
          if (val !== 'DELETED' && val !== 'ACTIVE') {
            const seatsInCol = colSeats[cIdx] ?? 0;
            if (rIdx >= seatsInCol) {
              next[key] = 'ACTIVE';
            } else {
              delete next[key];
            }
          }
        }
      });
      return next;
    });
  };

  // Move or swap from source desk to target slot (works for both active desk and empty/deleted slot)
  const executeDeskMoveOrSwap = (source, targetRoomIdx, targetRowIdx, targetColIdx, targetSeat) => {
    if (!source || source.roomIdx !== targetRoomIdx) return;
    if (source.rowIdx === targetRowIdx && source.colIdx === targetColIdx) {
      setSelectedDeskForMove(null);
      return;
    }

    const sourceKey = `${source.roomIdx}-${source.rowIdx}-${source.colIdx}`;
    const targetKey = `${targetRoomIdx}-${targetRowIdx}-${targetColIdx}`;

    setSeatOverrides(prev => {
      const next = { ...prev };
      const isTargetEmpty = !targetSeat || targetSeat.isDeleted;

      if (isTargetEmpty) {
        // Move the desk box to the empty/deleted slot and leave the old slot empty/deleted
        const existingSourceOverride = prev[sourceKey];
        const hasCustomText =
          existingSourceOverride !== undefined &&
          existingSourceOverride !== 'DELETED' &&
          existingSourceOverride !== 'ACTIVE';
        next[targetKey] = hasCustomText ? existingSourceOverride : 'ACTIVE';
        next[sourceKey] = 'DELETED';
      } else {
        // Swap the two desks' candidate numbers
        next[sourceKey] = targetSeat.seatNo || 'EMPTY_SEAT';
        next[targetKey] = source.seatNo || 'EMPTY_SEAT';
      }
      return next;
    });

    setSelectedDeskForMove(null);
    setDraggedDesk(null);
    setSavedSuccessMsg(
      !targetSeat || targetSeat.isDeleted
        ? `Meza [${source.seatNo}] imehamishwa kwenda Row ${targetRowIdx + 1}, Col ${targetColIdx + 1}!`
        : `Meza [${source.seatNo}] na [${targetSeat.seatNo}] zimebadilishana nafasi!`
    );
    setTimeout(() => setSavedSuccessMsg(null), 3000);
  };

  const handleDeskClick = (roomIdx, rowIdx, colIdx, seat) => {
    if (selectedDeskForMove) {
      executeDeskMoveOrSwap(selectedDeskForMove, roomIdx, rowIdx, colIdx, seat);
    }
  };

  const handleInlineSeatChange = (roomIdx, rowIdx, colIdx, newValue) => {
    const targetKey = `${roomIdx}-${rowIdx}-${colIdx}`;
    setSeatOverrides(prev => ({
      ...prev,
      [targetKey]: newValue === '' ? 'EMPTY_SEAT' : newValue
    }));
  };

  const handleDeleteDesk = (roomIdx, rowIdx, colIdx, e) => {
    if (e) e.stopPropagation();
    const targetKey = `${roomIdx}-${rowIdx}-${colIdx}`;
    setSeatOverrides(prev => ({
      ...prev,
      [targetKey]: 'DELETED'
    }));
    if (
      selectedDeskForMove &&
      selectedDeskForMove.roomIdx === roomIdx &&
      selectedDeskForMove.rowIdx === rowIdx &&
      selectedDeskForMove.colIdx === colIdx
    ) {
      setSelectedDeskForMove(null);
    }
    setSavedSuccessMsg(`Meza (Row ${rowIdx + 1}, Col ${colIdx + 1}) imefutwa bila kupandisha meza za chini.`);
    setTimeout(() => setSavedSuccessMsg(null), 3000);
  };

  const handleRestoreDesk = (roomIdx, rowIdx, colIdx, e) => {
    if (e) e.stopPropagation();
    if (selectedDeskForMove && selectedDeskForMove.roomIdx === roomIdx) {
      executeDeskMoveOrSwap(selectedDeskForMove, roomIdx, rowIdx, colIdx, null);
      return;
    }
    const targetKey = `${roomIdx}-${rowIdx}-${colIdx}`;
    const seatsInCol = currentRoom.columnSeats?.[colIdx] || 0;
    setSeatOverrides(prev => {
      const next = { ...prev };
      if (rowIdx < seatsInCol) {
        delete next[targetKey];
      } else {
        next[targetKey] = 'ACTIVE';
      }
      return next;
    });
    if ((currentRoom.numRows || 1) <= rowIdx) {
      updateCurrentRoom({ numRows: rowIdx + 1 });
    }
    setSavedSuccessMsg(`Meza imerudishwa kwenye Row ${rowIdx + 1}, Col ${colIdx + 1}!`);
    setTimeout(() => setSavedSuccessMsg(null), 3000);
  };

  const handleStartMoveDesk = (roomIdx, rowIdx, colIdx, seat, e) => {
    if (e) e.stopPropagation();
    if (
      selectedDeskForMove &&
      selectedDeskForMove.roomIdx === roomIdx &&
      selectedDeskForMove.rowIdx === rowIdx &&
      selectedDeskForMove.colIdx === colIdx
    ) {
      setSelectedDeskForMove(null);
      return;
    }
    setSelectedDeskForMove({ roomIdx, rowIdx, colIdx, seatNo: seat.seatNo });
    setSavedSuccessMsg(`Meza [${seat.seatNo}] imechaguliwa! Bofya meza nyingine au nafasi iliyo wazi kuihamisha hapo.`);
    setTimeout(() => setSavedSuccessMsg(null), 4000);
  };

  // UI Feedback
  const [savedSuccessMsg, setSavedSuccessMsg] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingSVG, setIsExportingSVG] = useState(false);

  useEffect(() => {
    if (schoolInfo.name && (!initialSaved?.schoolName || schoolName === 'HabyEduPro3A')) {
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

  // Change pattern for current room and re-flow numbers immediately
  const handleSetRoomPattern = (newPattern) => {
    clearRoomNumberOverridesKeepLayout(activeRoomIndex);
    updateCurrentRoom({ fillPattern: newPattern });
    setSavedSuccessMsg(
      newPattern === 'snake'
        ? `Snake Pattern (Zunguka Juu-Chini / Chini-Juu) imewashwa kwenye ${currentRoom.name}!`
        : `Straight Pattern (Juu kwenda Chini) imewashwa kwenye ${currentRoom.name}!`
    );
    setTimeout(() => setSavedSuccessMsg(null), 3000);
  };

  // Apply pattern to ALL rooms
  const handleSetAllRoomsPattern = (newPattern) => {
    setRooms(prev => prev.map(r => ({ ...r, fillPattern: newPattern })));
    setBatchPattern(newPattern);
    // Clear number overrides across all rooms while keeping DELETED/ACTIVE layout
    setSeatOverrides(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        if (next[key] !== 'DELETED' && next[key] !== 'ACTIVE') {
          delete next[key];
        }
      });
      return next;
    });
    setSavedSuccessMsg(
      newPattern === 'snake'
        ? `Snake Pattern imewashwa kwenye vyumba vyote (${rooms.length})!`
        : `Straight Pattern imewashwa kwenye vyumba vyote (${rooms.length})!`
    );
    setTimeout(() => setSavedSuccessMsg(null), 3000);
  };

  // Set total students for the currently active room directly
  const handleCurrentRoomStudentsChange = (val) => {
    const totalInRoom = Math.max(1, Math.min(120, parseInt(val, 10) || 1));
    const cols = currentRoom.numColumns || 4;
    const baseRows = Math.floor(totalInRoom / cols);
    const remainder = totalInRoom % cols;
    const colSeats = Array(cols)
      .fill(baseRows)
      .map((v, idx) => v + (idx < remainder ? 1 : 0));
    const maxRowsInRoom = Math.max(...colSeats, 1);

    // Clear overrides for this room so the exact student count is reflected cleanly
    setSeatOverrides(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (k.startsWith(`${activeRoomIndex}-`)) {
          delete next[k];
        }
      });
      return next;
    });

    updateCurrentRoom({
      columnSeats: colSeats,
      numRows: maxRowsInRoom
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
    setSeatOverrides(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (k.startsWith(`${activeRoomIndex}-`)) {
          delete next[k];
        }
      });
      return next;
    });
    updateCurrentRoom({
      numRows: rows,
      columnSeats: Array(currentRoom.numColumns || 4).fill(rows)
    });
  };

  // Adjust seat count in specific column
  const handleColumnSeatsChange = (colIndex, val) => {
    const parsed = Math.max(0, Math.min(15, parseInt(val, 10) || 0));
    const updated = [...(currentRoom.columnSeats || [])];
    updated[colIndex] = parsed;
    // Clear any DELETED overrides in this column up to parsed so the user's column count takes effect cleanly
    setSeatOverrides(prev => {
      const next = { ...prev };
      for (let r = 0; r < 15; r++) {
        delete next[`${activeRoomIndex}-${r}-${colIndex}`];
      }
      return next;
    });
    updateCurrentRoom({
      columnSeats: updated,
      numRows: Math.max(...updated, 1)
    });
  };

  // Adjust number of desks in a specific horizontal row (Row 1, Row 2, ...)
  const handleRowDesksChange = (rowIndex, val) => {
    const numCols = currentRoom.numColumns || 4;
    const parsed = Math.max(0, Math.min(numCols, parseInt(val, 10) || 0));

    // Ensure columnSeats is tall enough to include this row for active columns
    const updatedColSeats = [...(currentRoom.columnSeats || Array(numCols).fill(currentRoom.numRows || 6))];
    for (let c = 0; c < parsed; c++) {
      if ((updatedColSeats[c] || 0) <= rowIndex) {
        updatedColSeats[c] = rowIndex + 1;
      }
    }
    updateCurrentRoom({
      columnSeats: updatedColSeats,
      numRows: Math.max(...updatedColSeats, currentRoom.numRows || 1)
    });

    setSeatOverrides(prev => {
      const next = { ...prev };
      for (let c = 0; c < numCols; c++) {
        const key = `${activeRoomIndex}-${rowIndex}-${c}`;
        if (c < parsed) {
          if (next[key] === 'DELETED') {
            delete next[key];
          }
        } else {
          next[key] = 'DELETED';
        }
      }
      return next;
    });
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

  // Batch Auto-distributor for Multiple Rooms (e.g., 300 students, 25 per room -> 12 rooms)
  const handleApplyBatchGeneration = () => {
    const totalCand = Math.max(1, parseInt(batchCandidateCount, 10) || 1);
    const perRoom = Math.max(1, parseInt(batchSeatsPerRoom, 10) || 25);
    const cols = Math.max(1, Math.min(8, parseInt(batchColsPerRoom, 10) || 4));
    const startNumber = parseInt(batchStartNumber, 10) || 1;
    const roomCount = Math.ceil(totalCand / perRoom);

    const newRoomsList = [];
    let currentStart = startNumber;

    for (let i = 0; i < roomCount; i++) {
      const remaining = totalCand - i * perRoom;
      const thisRoomSeats = Math.min(perRoom, remaining);
      const baseRows = Math.floor(thisRoomSeats / cols);
      const remainder = thisRoomSeats % cols;
      const colSeats = Array(cols)
        .fill(baseRows)
        .map((val, idx) => val + (idx < remainder ? 1 : 0));
      const maxRowsInRoom = Math.max(...colSeats, 1);

      newRoomsList.push({
        id: `room-batch-${Date.now()}-${i + 1}`,
        name: `ROOM ${format2Digits(i + 1)}`,
        numRows: maxRowsInRoom,
        numColumns: cols,
        columnSeats: colSeats,
        doorEntrance: currentRoom?.doorEntrance || 'Left Side',
        startingSeat: format4Digits(currentStart),
        fillPattern: batchPattern || 'snake'
      });
      currentStart += thisRoomSeats;
    }

    setSeatOverrides({});
    setSelectedDeskForMove(null);
    setRooms(newRoomsList);
    setActiveRoomIndex(0);
    setShowBatchModal(false);
    setSavedSuccessMsg(
      `Vyumba ${roomCount} vimetengenezwa kiotomatiki kwa wanafunzi ${totalCand} (${perRoom} kwa chumba, ${
        batchPattern === 'snake' ? 'Snake Pattern' : 'Straight Pattern'
      })!`
    );
    setTimeout(() => setSavedSuccessMsg(null), 4500);
  };

  /**
   * GRID GENERATOR FOR A GIVEN ROOM
   * Generates 2D array [row][col] with candidates in Snake or Straight sequence
   */
  const generateRoomGrid = (room, roomIdx = 0) => {
    const {
      numColumns = 4,
      columnSeats = [6, 6, 6, 6],
      doorEntrance = 'Left Side',
      startingSeat = '0001',
      fillPattern = 'snake'
    } = room;

    const startNum = parseInt(startingSeat, 10) || 1;
    let currentNumber = startNum;
    const maxRows = Math.max(...columnSeats, room.numRows || 1, 1);
    const grid = Array.from({ length: maxRows }, () => Array(numColumns).fill(null));

    // Determine processing sequence based on door location
    const colOrder = [];
    if (doorEntrance === 'Left Side') {
      for (let c = 0; c < numColumns; c++) colOrder.push(c);
    } else {
      for (let c = numColumns - 1; c >= 0; c--) colOrder.push(c);
    }

    // Track column direction for visual header display ('down' = top-to-bottom, 'up' = bottom-to-top)
    const colDirections = Array(numColumns).fill('down');
    const snakeSequence = [];

    colOrder.forEach((colIdx, orderIdx) => {
      const seatsInCol = columnSeats[colIdx] ?? 0;
      const isEvenOrder = orderIdx % 2 === 0;
      const isBottomToTop = fillPattern === 'snake' && !isEvenOrder;
      colDirections[colIdx] = isBottomToTop ? 'up' : 'down';

      // Build row traversal order to honor snake pattern vs straight top-to-bottom
      const rowOrder = [];
      if (isBottomToTop) {
        for (let r = maxRows - 1; r >= 0; r--) rowOrder.push(r);
      } else {
        for (let r = 0; r < maxRows; r++) rowOrder.push(r);
      }

      rowOrder.forEach((r) => {
        const overrideKey = `${roomIdx}-${r}-${colIdx}`;
        const overrideVal = seatOverrides[overrideKey];
        const isDeleted = overrideVal === 'DELETED';
        const isForceActive = overrideVal === 'ACTIVE';
        const hasCustomNumber =
          overrideVal !== undefined &&
          overrideVal !== 'DELETED' &&
          overrideVal !== 'ACTIVE';
        const isWithinCol = r < seatsInCol;

        if (isDeleted) {
          grid[r][colIdx] = {
            isDeleted: true,
            seatNo: '',
            colIndex: colIdx,
            rowIndex: r
          };
        } else if (isWithinCol || isForceActive || hasCustomNumber) {
          let seatNo = format4Digits(currentNumber);
          if (overrideVal === 'EMPTY_SEAT') {
            seatNo = '';
          } else if (hasCustomNumber && overrideVal !== '') {
            seatNo = overrideVal;
          }

          const stepOrder = snakeSequence.length + 1;
          grid[r][colIdx] = {
            isDeleted: false,
            seatNo,
            stepOrder,
            colIndex: colIdx,
            rowIndex: r
          };

          snakeSequence.push({
            rowIndex: r,
            colIndex: colIdx,
            seatNo,
            stepOrder,
            direction: colDirections[colIdx]
          });

          currentNumber++;
        } else {
          grid[r][colIdx] = {
            isDeleted: true,
            seatNo: '',
            colIndex: colIdx,
            rowIndex: r
          };
        }
      });
    });

    const activeSeatsCount = snakeSequence.length;
    const endSeatNum = startNum + activeSeatsCount - 1;

    return {
      grid,
      maxRows,
      colDirections,
      snakeSequence,
      totalSeats: activeSeatsCount,
      startSeatFormatted: format4Digits(startNum),
      endSeatFormatted: format4Digits(Math.max(startNum, endSeatNum))
    };
  };

  // Compute all grids
  const computedRooms = useMemo(() => {
    return rooms.map((room, roomIdx) => {
      const result = generateRoomGrid(room, roomIdx);
      return {
        ...room,
        roomIdx,
        ...result
      };
    });
  }, [rooms, seatOverrides]);

  const activeComputedRoom = computedRooms[activeRoomIndex] || computedRooms[0];
  const totalConfiguredStudents = useMemo(
    () => computedRooms.reduce((sum, r) => sum + r.totalSeats, 0),
    [computedRooms]
  );

  // SNAKE PATTERN VISUAL CANVAS PREVIEW & SIMULATION MODE STATE
  const [showPreviewCanvas, setShowPreviewCanvas] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState(999);
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [isCommittedToDb, setIsCommittedToDb] = useState(false);
  const simulationCanvasRef = useRef(null);

  // Keep simulationStep synced when active room or totalSeats changes
  useEffect(() => {
    if (!isSimulating) {
      setSimulationStep(activeComputedRoom?.totalSeats || 0);
    }
    setIsCommittedToDb(false);
  }, [activeComputedRoom?.totalSeats, activeRoomIndex, rooms, seatOverrides, isSimulating]);

  // Step-by-step Snake animation timer
  useEffect(() => {
    if (!isSimulating) return undefined;
    const maxSteps = activeComputedRoom?.totalSeats || 1;
    const timer = setInterval(() => {
      setSimulationStep(prev => {
        if (prev >= maxSteps) {
          setIsSimulating(false);
          return maxSteps;
        }
        return prev + 1;
      });
    }, 220);
    return () => clearInterval(timer);
  }, [isSimulating, activeComputedRoom?.totalSeats]);

  const handleStartSnakeSimulation = () => {
    setShowPreviewCanvas(true);
    setSimulationStep(1);
    setIsSimulating(true);
  };

  // Draw the visual Snake Pattern simulation onto the HTML5 <canvas>
  useEffect(() => {
    if (!showPreviewCanvas || !simulationCanvasRef.current || !activeComputedRoom) return;
    const canvas = simulationCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = 760;
    const numCols = Math.max(1, activeComputedRoom.numColumns || 4);
    const maxRows = Math.max(1, activeComputedRoom.maxRows || 6);
    const topBannerHeight = 76;
    const colHeaderHeight = 28;
    const bottomFooterHeight = 36;
    const rowPitch = maxRows <= 6 ? 52 : maxRows <= 8 ? 44 : 38;
    const logicalHeight = topBannerHeight + colHeaderHeight + maxRows * rowPitch + bottomFooterHeight;

    canvas.width = logicalWidth * dpr;
    canvas.height = logicalHeight * dpr;
    canvas.style.width = '100%';
    canvas.style.maxWidth = `${logicalWidth}px`;
    canvas.style.height = 'auto';
    ctx.scale(dpr, dpr);

    // 1. Canvas Background
    ctx.fillStyle = theme.planBgInline || '#f0f6fc';
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);
    ctx.strokeStyle = theme.outerBorderInline || '#1e3a8a';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, logicalWidth - 3, logicalHeight - 3);

    // 2. Top Chalkboard & Entrance Banner
    const padX = 18;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(padX, 12, logicalWidth - padX * 2, 28, 6);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '900 11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `FRONT OF ROOM — ${activeComputedRoom.name} (${
        activeComputedRoom.fillPattern === 'snake' ? 'SNAKE PATTERN ↓↑' : 'STRAIGHT PATTERN ↓↓'
      })`,
      logicalWidth / 2,
      26
    );

    // Door indicator & summary
    const isLeftDoor = activeComputedRoom.doorEntrance === 'Left Side';
    ctx.fillStyle = '#fef3c7';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    const doorX = isLeftDoor ? padX : logicalWidth - padX - 190;
    ctx.beginPath();
    ctx.roundRect(doorX, 45, 190, 22, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#78350f';
    ctx.font = '800 10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      isLeftDoor
        ? `🚪 DOOR: LEFT SIDE → (START ${activeComputedRoom.startSeatFormatted})`
        : `🚪 DOOR: RIGHT SIDE ← (START ${activeComputedRoom.startSeatFormatted})`,
      doorX + 95,
      56
    );

    ctx.fillStyle = '#334155';
    ctx.font = '700 10px Inter, system-ui, sans-serif';
    ctx.textAlign = isLeftDoor ? 'right' : 'left';
    ctx.fillText(
      `Desks in Room: ${activeComputedRoom.totalSeats}  |  Total All Rooms: ${totalConfiguredStudents} Students`,
      isLeftDoor ? logicalWidth - padX : padX,
      56
    );

    // 3. Column Headers & Desk Cell Coordinates
    const gridAreaWidth = logicalWidth - padX * 2;
    const colGap = 12;
    const colWidth = (gridAreaWidth - colGap * (numCols - 1)) / numCols;
    const colStartY = topBannerHeight;

    const cellCenters = {}; // key `${r}-${c}` -> { cx, cy, x, y, w, h }

    for (let c = 0; c < numCols; c++) {
      const colX = padX + c * (colWidth + colGap);
      const dir = activeComputedRoom.colDirections?.[c] || 'down';

      ctx.fillStyle = theme.boxHeaderBgInline || '#1e40af';
      ctx.beginPath();
      ctx.roundRect(colX, colStartY, colWidth, 22, 5);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `COL ${c + 1} ${dir === 'up' ? '↑ (Chini-Juu)' : '↓ (Juu-Chini)'}`,
        colX + colWidth / 2,
        colStartY + 11
      );

      for (let r = 0; r < maxRows; r++) {
        const boxY = colStartY + colHeaderHeight + r * rowPitch;
        const boxH = rowPitch - 7;
        const cx = colX + colWidth / 2;
        const cy = boxY + boxH / 2;
        cellCenters[`${r}-${c}`] = { cx, cy, x: colX, y: boxY, w: colWidth, h: boxH };

        const seat = activeComputedRoom.grid?.[r]?.[c];
        const isDeleted = !seat || seat.isDeleted;

        if (isDeleted) {
          // Draw faint dashed slot showing deleted desk does NOT shift lower desks up
          ctx.save();
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(colX + 2, boxY + 2, colWidth - 4, boxH - 4, 5);
          ctx.stroke();
          ctx.fillStyle = '#94a3b8';
          ctx.font = '700 8px Inter, system-ui, sans-serif';
          ctx.fillText('EMPTY / DELETED', cx, cy);
          ctx.restore();
        }
      }
    }

    // 4. Draw Snake Path Polyline & Directional Arrows First (under or connecting desk boxes)
    const seq = activeComputedRoom.snakeSequence || [];
    const visibleSteps = Math.min(simulationStep, seq.length);

    if (visibleSteps > 1) {
      ctx.save();
      ctx.strokeStyle = activeComputedRoom.fillPattern === 'snake' ? '#10b981' : '#3b82f6';
      ctx.lineWidth = 3.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < visibleSteps; i++) {
        const item = seq[i];
        const pt = cellCenters[`${item.rowIndex}-${item.colIndex}`];
        if (!pt) continue;
        if (i === 0) ctx.moveTo(pt.cx, pt.cy);
        else ctx.lineTo(pt.cx, pt.cy);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 5. Draw Active Desk Boxes & Candidate Numbers on Top
    for (let r = 0; r < maxRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const seat = activeComputedRoom.grid?.[r]?.[c];
        if (!seat || seat.isDeleted) continue;
        const pt = cellCenters[`${r}-${c}`];
        if (!pt) continue;

        const isReached = (seat.stepOrder || 0) <= visibleSteps;
        const isCurrentHead = isSimulating && seat.stepOrder === visibleSteps;

        ctx.save();
        ctx.fillStyle = isCurrentHead
          ? '#fef3c7'
          : isReached
          ? '#ffffff'
          : '#f1f5f9';
        ctx.strokeStyle = isCurrentHead
          ? '#f59e0b'
          : isReached
          ? theme.boxBorderInline || '#1e40af'
          : '#94a3b8';
        ctx.lineWidth = isCurrentHead ? 3 : 2;
        ctx.beginPath();
        ctx.roundRect(pt.x, pt.y, pt.w, pt.h, 6);
        ctx.fill();
        ctx.stroke();

        // Top mini strip inside desk box
        ctx.fillStyle = isReached ? theme.boxHeaderBgInline || '#1e40af' : '#64748b';
        ctx.beginPath();
        ctx.roundRect(pt.x + 2, pt.y + 2, pt.w - 4, 12, 3);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '700 8px Inter, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`R${r + 1}C${c + 1}`, pt.x + 6, pt.y + 8.5);

        ctx.textAlign = 'right';
        ctx.fillText(`#${seat.stepOrder}`, pt.x + pt.w - 6, pt.y + 8.5);

        // Candidate Seat Number (Centered, Unclipped, Auto-scaled)
        if (isReached) {
          const textVal = String(seat.seatNo || '----');
          const fontSize = textVal.length > 8 ? 11 : textVal.length > 5 ? 12 : 14;
          ctx.fillStyle = '#0f172a';
          ctx.font = `900 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(textVal, pt.cx, pt.y + 13 + (pt.h - 13) / 2);
        } else {
          ctx.fillStyle = '#94a3b8';
          ctx.font = '700 11px ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('....', pt.cx, pt.y + 13 + (pt.h - 13) / 2);
        }
        ctx.restore();
      }
    }

    // 6. Draw Directional Arrowheads Along the Snake Path
    if (visibleSteps > 1) {
      for (let i = 0; i < visibleSteps - 1; i++) {
        const a = seq[i];
        const b = seq[i + 1];
        const ptA = cellCenters[`${a.rowIndex}-${a.colIndex}`];
        const ptB = cellCenters[`${b.rowIndex}-${b.colIndex}`];
        if (!ptA || !ptB) continue;

        const midX = (ptA.cx + ptB.cx) / 2;
        const midY = (ptA.cy + ptB.cy) / 2;
        const angle = Math.atan2(ptB.cy - ptA.cy, ptB.cx - ptA.cx);

        ctx.save();
        ctx.translate(midX, midY);
        ctx.rotate(angle);
        ctx.fillStyle = activeComputedRoom.fillPattern === 'snake' ? '#059669' : '#2563eb';
        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.lineTo(-4, -4.5);
        ctx.lineTo(-4, 4.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // 7. Rear of Room Footer
    ctx.fillStyle = '#64748b';
    ctx.font = '800 10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `— REAR OF ROOM (${activeComputedRoom.name}: ${visibleSteps}/${activeComputedRoom.totalSeats} Desks Simulated) —`,
      logicalWidth / 2,
      logicalHeight - 14
    );
  }, [
    showPreviewCanvas,
    activeComputedRoom,
    simulationStep,
    isSimulating,
    theme,
    totalConfiguredStudents
  ]);

  // Persist state to Database (`sitting_plans` table) & LocalStorage
  const persistSittingPlanToDatabase = async (isManualAction = false) => {
    if (isManualAction) {
      setIsSavingToDb(true);
      setErrorMessage(null);
    }
    try {
      const fullSnapshot = {
        rooms,
        seatOverrides,
        activeRoomIndex,
        examType,
        schoolName,
        day,
        examDate,
        subject,
        codeNo,
        academicMaster,
        supervisor,
        selectedThemeKey,
        batchCandidateCount,
        batchSeatsPerRoom,
        batchColsPerRoom,
        batchPattern,
        batchStartNumber,
        updatedAt: new Date().toISOString()
      };

      sittingPlanMemoryCache.set(normalizedSchoolId, fullSnapshot);
      if (typeof window !== 'undefined') {
        try {
          const serialized = JSON.stringify(fullSnapshot);
          localStorage.setItem(`haby_sitting_plan_state_${normalizedSchoolId}`, serialized);
          localStorage.setItem(`haby_sitting_plan_state_${schoolId}`, serialized);
        } catch (e) {}
      }

      const recordsToUpsert = computedRooms.map((r, idx) => ({
        school_id: normalizedSchoolId,
        room_name: r.name || `ROOM ${format2Digits(idx + 1)}`,
        exam_date: examDate || new Date().toISOString().split('T')[0],
        exam_session: `${examType} - ${subject}`,
        total_candidates: r.totalSeats || 0,
        theme: selectedThemeKey || 'royal',
        grid_layout: {
          roomIndex: idx,
          roomConfig: rooms[idx] || r,
          fullSnapshot: idx === 0 ? fullSnapshot : undefined,
          examType,
          schoolName,
          day,
          examDate,
          subject,
          codeNo,
          academicMaster,
          supervisor,
          selectedThemeKey,
          doorEntrance: r.doorEntrance,
          fillPattern: r.fillPattern || 'snake',
          startSeat: r.startSeatFormatted,
          endSeat: r.endSeatFormatted,
          numColumns: r.numColumns,
          maxRows: r.maxRows,
          columnSeats: r.columnSeats
        },
        updated_at: new Date().toISOString()
      }));

      await supabase.from('sitting_plans').upsert(recordsToUpsert);
      setIsCommittedToDb(true);

      if (isManualAction) {
        setSavedSuccessMsg(
          `Mpangilio wa vyumba ${computedRooms.length} (${totalConfiguredStudents} wanafunzi, ${
            currentRoom?.fillPattern === 'snake' ? 'Snake Pattern' : 'Straight Pattern'
          }) umehifadhiwa kikamilifu kwenye database!`
        );
        setTimeout(() => setSavedSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.warn('Could not save sitting plan to database:', err);
      if (isManualAction) {
        setErrorMessage('Hitilafu wakati wa kuhifadhi kwenye database. Tafadhali jaribu tena.');
        setTimeout(() => setErrorMessage(null), 4000);
      }
    } finally {
      if (isManualAction) {
        setIsSavingToDb(false);
      }
    }
  };

  const handleSaveToDatabase = () => persistSittingPlanToDatabase(true);

  // Hydrate from Cloud SQL `sitting_plans` table on mount if localStorage had no saved state
  const hasHydratedFromDbRef = useRef(false);
  useEffect(() => {
    if (hasHydratedFromDbRef.current) return;
    hasHydratedFromDbRef.current = true;

    (async () => {
      try {
        const { data: rows, error } = await supabase
          .from('sitting_plans')
          .select('*')
          .eq('school_id', normalizedSchoolId);

        if (error || !Array.isArray(rows) || rows.length === 0) return;

        // Look for a row carrying fullSnapshot in grid_layout / gridLayout
        let snapshotFromDb = null;
        for (const row of rows) {
          const gl = row.grid_layout || row.gridLayout || {};
          if (gl && gl.fullSnapshot && Array.isArray(gl.fullSnapshot.rooms) && gl.fullSnapshot.rooms.length > 0) {
            snapshotFromDb = gl.fullSnapshot;
            break;
          }
        }

        // If no local state was present, or if DB has rooms and local only had default single 24-seat room
        const localNow = loadSavedSittingPlanState(normalizedSchoolId);
        if (!localNow && snapshotFromDb) {
          sittingPlanMemoryCache.set(normalizedSchoolId, snapshotFromDb);
          try {
            localStorage.setItem(`haby_sitting_plan_state_${normalizedSchoolId}`, JSON.stringify(snapshotFromDb));
          } catch (e) {}

          if (Array.isArray(snapshotFromDb.rooms) && snapshotFromDb.rooms.length > 0) {
            setRooms(snapshotFromDb.rooms);
          }
          if (snapshotFromDb.seatOverrides && typeof snapshotFromDb.seatOverrides === 'object') {
            setSeatOverrides(snapshotFromDb.seatOverrides);
          }
          if (snapshotFromDb.examType) setExamType(snapshotFromDb.examType);
          if (snapshotFromDb.schoolName) setSchoolName(snapshotFromDb.schoolName);
          if (snapshotFromDb.day) setDay(snapshotFromDb.day);
          if (snapshotFromDb.examDate) setExamDate(snapshotFromDb.examDate);
          if (snapshotFromDb.subject) setSubject(snapshotFromDb.subject);
          if (snapshotFromDb.codeNo) setCodeNo(snapshotFromDb.codeNo);
          if (snapshotFromDb.academicMaster !== undefined) setAcademicMaster(snapshotFromDb.academicMaster);
          if (snapshotFromDb.supervisor !== undefined) setSupervisor(snapshotFromDb.supervisor);
          if (snapshotFromDb.selectedThemeKey) setSelectedThemeKey(snapshotFromDb.selectedThemeKey);
          if (snapshotFromDb.batchCandidateCount) setBatchCandidateCount(snapshotFromDb.batchCandidateCount);
          if (snapshotFromDb.batchSeatsPerRoom) setBatchSeatsPerRoom(snapshotFromDb.batchSeatsPerRoom);
          if (snapshotFromDb.batchColsPerRoom) setBatchColsPerRoom(snapshotFromDb.batchColsPerRoom);
          if (snapshotFromDb.batchPattern) setBatchPattern(snapshotFromDb.batchPattern);
          if (snapshotFromDb.batchStartNumber) setBatchStartNumber(snapshotFromDb.batchStartNumber);
          setIsCommittedToDb(true);
        } else if (!localNow && rows.length > 0) {
          // Reconstruct rooms from individual sitting_plans rows if fullSnapshot wasn't attached
          const sortedRows = [...rows].sort((a, b) => {
            const ia = a.grid_layout?.roomIndex ?? a.gridLayout?.roomIndex ?? 0;
            const ib = b.grid_layout?.roomIndex ?? b.gridLayout?.roomIndex ?? 0;
            return ia - ib;
          });
          const reconstructedRooms = sortedRows
            .map((r, idx) => {
              const gl = r.grid_layout || r.gridLayout || {};
              if (gl.roomConfig) return gl.roomConfig;
              return {
                id: r.id || `room-db-${idx + 1}`,
                name: r.room_name || r.roomName || `ROOM ${format2Digits(idx + 1)}`,
                numRows: gl.maxRows || 6,
                numColumns: gl.numColumns || 4,
                columnSeats: Array.isArray(gl.columnSeats) ? gl.columnSeats : [6, 6, 6, 6],
                doorEntrance: gl.doorEntrance || 'Left Side',
                startingSeat: gl.startSeat || '0001',
                fillPattern: gl.fillPattern || 'snake'
              };
            })
            .filter(Boolean);
          if (reconstructedRooms.length > 0) {
            setRooms(reconstructedRooms);
            setIsCommittedToDb(true);
          }
        } else {
          setIsCommittedToDb(true);
        }
      } catch (e) {
        console.warn('SittingPlan DB hydration notice:', e);
      }
    })();
  }, [normalizedSchoolId]);

  // Auto-save every Sitting Plan change to localStorage immediately + debounce sync to Cloud SQL Database
  const autoSaveTimerRef = useRef(null);
  useEffect(() => {
    const fullSnapshot = {
      rooms,
      seatOverrides,
      activeRoomIndex,
      examType,
      schoolName,
      day,
      examDate,
      subject,
      codeNo,
      academicMaster,
      supervisor,
      selectedThemeKey,
      batchCandidateCount,
      batchSeatsPerRoom,
      batchColsPerRoom,
      batchPattern,
      batchStartNumber,
      updatedAt: new Date().toISOString()
    };

    sittingPlanMemoryCache.set(normalizedSchoolId, fullSnapshot);
    if (typeof window !== 'undefined') {
      try {
        const serialized = JSON.stringify(fullSnapshot);
        localStorage.setItem(`haby_sitting_plan_state_${normalizedSchoolId}`, serialized);
        localStorage.setItem(`haby_sitting_plan_state_${schoolId}`, serialized);
      } catch (e) {}
    }

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      persistSittingPlanToDatabase(false);
    }, 900);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [
    rooms,
    seatOverrides,
    activeRoomIndex,
    examType,
    schoolName,
    day,
    examDate,
    subject,
    codeNo,
    academicMaster,
    supervisor,
    selectedThemeKey,
    batchCandidateCount,
    batchSeatsPerRoom,
    batchColsPerRoom,
    batchPattern,
    batchStartNumber,
    normalizedSchoolId
  ]);

  // NATIVE REACT-TO-PRINT TRIGGER
  const reactToPrintTrigger = useReactToPrint({
    contentRef: planContainerRef,
    documentTitle: `NECTA_SITTING_PLAN_${examType}_${(currentRoom?.name || 'ROOM').replace(/\s+/g, '_')}`,
    pageStyle: `
      @page {
        size: A4 portrait !important;
        margin: 5mm 7mm !important;
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

  // Helper to prepare cloned DOM for high-res print-grade capture (hides .no-print & shows unclipped print spans)
  const prepareClonedPageForExport = (clonedDoc) => {
    clonedDoc.querySelectorAll('.no-print').forEach(el => {
      el.style.display = 'none';
    });
    clonedDoc.querySelectorAll('.desk-seat-number-print').forEach(el => {
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
    });
    clonedDoc.querySelectorAll('.desk-slot-deleted').forEach(el => {
      el.style.visibility = 'hidden';
    });
  };

  // Export as high-resolution A4 Portrait PDF (supports current room or all visible rooms)
  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    setErrorMessage(null);
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      const pageWidthMm = 210;
      const pageHeightMm = 297;
      const marginMm = 6;
      const printableW = pageWidthMm - marginMm * 2;
      const printableH = pageHeightMm - marginMm * 2;

      const pagesCount = roomsToRender.length;
      for (let i = 0; i < pagesCount; i++) {
        const targetElement = document.getElementById(`room-portrait-page-${i}`);
        if (!targetElement) continue;
        if (i > 0) pdf.addPage('a4', 'portrait');

        const canvas = await html2canvas(targetElement, {
          scale: 3,
          useCORS: true,
          backgroundColor: theme.planBgInline || '#ffffff',
          onclone: prepareClonedPageForExport
        });

        const imgData = canvas.toDataURL('image/png', 1.0);
        pdf.addImage(imgData, 'PNG', marginMm, marginMm, printableW, printableH, undefined, 'FAST');
      }

      const fileName =
        pagesCount > 1
          ? `SITTING_PLAN_${examType}_ALL_${pagesCount}_ROOMS.pdf`
          : `SITTING_PLAN_${examType}_${(currentRoom?.name || 'ROOM').replace(/\s+/g, '_')}.pdf`;
      pdf.save(fileName);
      setSavedSuccessMsg(`PDF ya ubora wa juu (${fileName}) imepakuliwa kwa ufanisi kwa ajili ya ku-print!`);
      setTimeout(() => setSavedSuccessMsg(null), 3500);
    } catch (err) {
      console.error('Export PDF error:', err);
      setErrorMessage('Hitilafu wakati wa kutengeneza PDF. Tafadhali jaribu tena.');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Export current desk arrangement as a crisp, scalable Vector SVG image for printing
  const handleExportSVG = () => {
    if (!activeComputedRoom) return;
    setIsExportingSVG(true);
    setErrorMessage(null);
    try {
      const rm = activeComputedRoom;
      const svgW = 794; // A4 Portrait width at 96 DPI
      const svgH = 1123; // A4 Portrait height at 96 DPI
      const padX = 28;
      const contentW = svgW - padX * 2;

      const bgFill = theme.planBgInline || '#f0f6fc';
      const borderCol = theme.outerBorderInline || '#1e3a8a';
      const boxHeaderCol = theme.boxHeaderBgInline || '#1e40af';
      const boxBorderCol = theme.boxBorderInline || '#3b82f6';
      const numCols = Math.max(1, rm.numColumns || 4);
      const maxRows = Math.max(1, rm.maxRows || 6);

      // Compute grid geometry inside A4 portrait
      const gridTopY = 250;
      const gridBottomY = svgH - 135;
      const availableGridH = gridBottomY - gridTopY;
      const colHeaderH = 24;
      const colGap = 12;
      const colW = (contentW - colGap * (numCols - 1)) / numCols;
      const rowGap = 8;
      const deskH = Math.min(72, Math.max(34, (availableGridH - colHeaderH - 10 - rowGap * (maxRows - 1)) / maxRows));

      let desksSvg = '';
      for (let c = 0; c < numCols; c++) {
        const colX = padX + c * (colW + colGap);
        const colDir = rm.colDirections?.[c] || 'down';
        const dirLabel = colDir === 'up' ? '↑ (Chini-Juu)' : '↓ (Juu-Chini)';

        desksSvg += `
          <rect x="${colX}" y="${gridTopY}" width="${colW}" height="${colHeaderH}" rx="4" fill="${borderCol}" />
          <text x="${colX + colW / 2}" y="${gridTopY + 15}" text-anchor="middle" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="10" font-weight="900">
            COLUMN ${c + 1} ${escapeXml(dirLabel)}
          </text>
        `;

        for (let r = 0; r < maxRows; r++) {
          const seat = rm.grid?.[r]?.[c];
          if (!seat || seat.isDeleted) continue;

          const deskY = gridTopY + colHeaderH + 8 + r * (deskH + rowGap);
          const stripH = Math.min(15, Math.max(12, deskH * 0.26));
          const seatText = String(seat.seatNo || '----');
          const numFontSize = seatText.length >= 10 ? 11 : seatText.length >= 7 ? 13 : maxRows <= 6 ? 17 : 15;

          desksSvg += `
            <g>
              <rect x="${colX}" y="${deskY}" width="${colW}" height="${deskH}" rx="6" fill="#ffffff" stroke="${boxBorderCol}" stroke-width="2" />
              <rect x="${colX + 2}" y="${deskY + 2}" width="${colW - 4}" height="${stripH}" rx="3" fill="${boxHeaderCol}" />
              <text x="${colX + 7}" y="${deskY + stripH - 2}" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="8.5" font-weight="800">
                R${r + 1}C${c + 1}
              </text>
              <rect x="${colX + colW - 15}" y="${deskY + 4}" width="9" height="9" rx="1.5" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />
              <text x="${colX + colW / 2}" y="${deskY + stripH + (deskH - stripH - 10) / 2 + 5}" text-anchor="middle" fill="#0f172a" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="${numFontSize}" font-weight="900">
                ${escapeXml(seatText)}
              </text>
              <text x="${colX + colW / 2}" y="${deskY + deskH - 4}" text-anchor="middle" fill="${boxHeaderCol}" font-family="Inter, Arial, sans-serif" font-size="7.5" font-weight="800">
                ${seat.seatNo ? `SEAT #${seat.stepOrder || ''}` : 'EMPTY DESK'}
              </text>
            </g>
          `;
        }
      }

      const isLeftDoor = rm.doorEntrance === 'Left Side';
      const doorX = isLeftDoor ? padX : svgW - padX - 230;
      const doorLabel = isLeftDoor
        ? `ENTRANCE DOOR → (START: ${rm.startSeatFormatted})`
        : `(START: ${rm.startSeatFormatted}) ← ENTRANCE DOOR`;

      const svgContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="${svgW}px" height="${svgH}px">
  <!-- Background & Outer Frame -->
  <rect x="6" y="6" width="${svgW - 12}" height="${svgH - 12}" rx="4" fill="${bgFill}" stroke="${borderCol}" stroke-width="3.5" />

  <!-- National Flag Ribbon -->
  <rect x="${padX}" y="18" width="${contentW * 0.32}" height="6" fill="#1eb53a" />
  <rect x="${padX + contentW * 0.32}" y="18" width="${contentW * 0.02}" height="6" fill="#fcd116" />
  <rect x="${padX + contentW * 0.34}" y="18" width="${contentW * 0.32}" height="6" fill="#000000" />
  <rect x="${padX + contentW * 0.66}" y="18" width="${contentW * 0.02}" height="6" fill="#fcd116" />
  <rect x="${padX + contentW * 0.68}" y="18" width="${contentW * 0.32}" height="6" fill="#00a3dd" />

  <!-- Official Document Header -->
  <text x="${svgW / 2}" y="42" text-anchor="middle" fill="#334155" font-family="Inter, Arial, sans-serif" font-size="11" font-weight="800" letter-spacing="1.5">
    THE UNITED REPUBLIC OF TANZANIA
  </text>
  <text x="${svgW / 2}" y="62" text-anchor="middle" fill="#0f172a" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="900" letter-spacing="0.8">
    NATIONAL EXAMINATIONS COUNCIL OF TANZANIA (NECTA)
  </text>
  <rect x="${svgW / 2 - 170}" y="70" width="340" height="22" rx="4" fill="${borderCol}" />
  <text x="${svgW / 2}" y="85" text-anchor="middle" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="11" font-weight="900" letter-spacing="0.8">
    ${escapeXml(examType)} EXAMINATION SITTING PLAN — ${new Date().getFullYear()}
  </text>
  <line x1="${padX}" y1="100" x2="${svgW - padX}" y2="100" stroke="${borderCol}" stroke-width="2" />

  <!-- Metadata Grid -->
  <text x="${padX}" y="118" fill="#475569" font-family="Inter, Arial, sans-serif" font-size="11" font-weight="700">SCHOOL:</text>
  <text x="${padX + 95}" y="118" fill="#0f172a" font-family="Inter, Arial, sans-serif" font-size="11" font-weight="900">${escapeXml(schoolName.toUpperCase())}</text>

  <text x="${padX}" y="136" fill="#475569" font-family="Inter, Arial, sans-serif" font-size="11" font-weight="700">SUBJECT:</text>
  <text x="${padX + 95}" y="136" fill="#0f172a" font-family="Inter, Arial, sans-serif" font-size="11" font-weight="900">${escapeXml(`${subject} (${codeNo})`)}</text>

  <text x="${padX}" y="154" fill="#475569" font-family="Inter, Arial, sans-serif" font-size="11" font-weight="700">ROOM NO:</text>
  <text x="${padX + 95}" y="154" fill="${borderCol}" font-family="Inter, Arial, sans-serif" font-size="12" font-weight="900">${escapeXml(rm.name)}</text>

  <text x="${svgW / 2 + 10}" y="118" fill="#475569" font-family="Inter, Arial, sans-serif" font-size="11" font-weight="700">DAY &amp; DATE:</text>
  <text x="${svgW / 2 + 110}" y="118" fill="#0f172a" font-family="Inter, Arial, sans-serif" font-size="11" font-weight="900">${escapeXml(`${day}, ${examDate}`)}</text>

  <text x="${svgW / 2 + 10}" y="136" fill="#475569" font-family="Inter, Arial, sans-serif" font-size="11" font-weight="700">CANDIDATES:</text>
  <text x="${svgW / 2 + 110}" y="136" fill="#0f172a" font-family="Inter, Arial, sans-serif" font-size="11" font-weight="900">${escapeXml(`${rm.totalSeats} (${rm.startSeatFormatted} — ${rm.endSeatFormatted})`)}</text>

  <text x="${svgW / 2 + 10}" y="154" fill="#475569" font-family="Inter, Arial, sans-serif" font-size="11" font-weight="700">DOOR / PATTERN:</text>
  <text x="${svgW / 2 + 110}" y="154" fill="#0f172a" font-family="Inter, Arial, sans-serif" font-size="11" font-weight="900">${escapeXml(`${rm.doorEntrance} (${rm.fillPattern === 'snake' ? 'Snake Pattern' : 'Straight'})`)}</text>

  <line x1="${padX}" y1="166" x2="${svgW - padX}" y2="166" stroke="${borderCol}" stroke-width="2" />

  <!-- Chalkboard & Entrance Door -->
  <rect x="${padX}" y="176" width="${contentW}" height="26" rx="5" fill="${borderCol}" />
  <text x="${svgW / 2}" y="193" text-anchor="middle" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="11" font-weight="900" letter-spacing="1">
    FRONT OF ROOM — CHALKBOARD &amp; INVIGILATOR DESK
  </text>

  <rect x="${doorX}" y="210" width="230" height="22" rx="4" fill="#dbeafe" stroke="${boxBorderCol}" stroke-width="1.5" />
  <text x="${doorX + 115}" y="225" text-anchor="middle" fill="${borderCol}" font-family="Inter, Arial, sans-serif" font-size="10" font-weight="900">
    ${escapeXml(doorLabel)}
  </text>

  <!-- Candidate Desks Grid -->
  ${desksSvg}

  <!-- Rear of Examination Room & Official Signatures Footer -->
  <line x1="${padX}" y1="${svgH - 122}" x2="${svgW - padX}" y2="${svgH - 122}" stroke="#cbd5e1" stroke-width="1.5" />
  <text x="${svgW / 2}" y="${svgH - 108}" text-anchor="middle" fill="#64748b" font-family="Inter, Arial, sans-serif" font-size="10" font-weight="800" letter-spacing="1.5">
    — REAR / BACK OF EXAMINATION ROOM —
  </text>
  <line x1="${padX}" y1="${svgH - 98}" x2="${svgW - padX}" y2="${svgH - 98}" stroke="${borderCol}" stroke-width="2" />

  <text x="${padX}" y="${svgH - 76}" fill="#334155" font-family="Inter, Arial, sans-serif" font-size="10" font-weight="800">INVIGILATOR NAME:</text>
  <text x="${padX + 115}" y="${svgH - 76}" fill="#0f172a" font-family="Inter, Arial, sans-serif" font-size="10" font-weight="900">${escapeXml(academicMaster)}</text>
  <line x1="${padX + 110}" y1="${svgH - 73}" x2="${svgW / 2 - 15}" y2="${svgH - 73}" stroke="#0f172a" stroke-width="1" />

  <text x="${padX}" y="${svgH - 54}" fill="#334155" font-family="Inter, Arial, sans-serif" font-size="10" font-weight="800">SIGNATURE: ___________________   DATE: ${escapeXml(examDate)}</text>

  <text x="${svgW / 2 + 10}" y="${svgH - 76}" fill="#334155" font-family="Inter, Arial, sans-serif" font-size="10" font-weight="800">SUPERVISOR NAME:</text>
  <text x="${svgW / 2 + 125}" y="${svgH - 76}" fill="#0f172a" font-family="Inter, Arial, sans-serif" font-size="10" font-weight="900">${escapeXml(supervisor)}</text>
  <line x1="${svgW / 2 + 120}" y1="${svgH - 73}" x2="${svgW - padX}" y2="${svgH - 73}" stroke="#0f172a" stroke-width="1" />

  <text x="${svgW / 2 + 10}" y="${svgH - 54}" fill="#334155" font-family="Inter, Arial, sans-serif" font-size="10" font-weight="800">SIGNATURE: ___________________   DATE: ${escapeXml(examDate)}</text>

  <text x="${padX}" y="${svgH - 28}" fill="#64748b" font-family="Inter, Arial, sans-serif" font-size="9" font-style="italic">
    * Every candidate must occupy the seat bearing their candidate number.
  </text>
  <rect x="${svgW - padX - 140}" y="${svgH - 44}" width="140" height="30" rx="4" fill="#ffffff" stroke="#475569" stroke-width="1.2" stroke-dasharray="4,3" />
  <text x="${svgW - padX - 70}" y="${svgH - 26}" text-anchor="middle" fill="#334155" font-family="Inter, Arial, sans-serif" font-size="8.5" font-weight="900">
    SCHOOL OFFICIAL STAMP
  </text>
</svg>`;

      const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const fileName = `SITTING_PLAN_${examType}_${(rm.name || 'ROOM').replace(/\s+/g, '_')}.svg`;
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSavedSuccessMsg(`Picha ya Vector SVG (${fileName}) imepakuliwa kwa ufanisi kwa ajili ya ku-print!`);
      setTimeout(() => setSavedSuccessMsg(null), 3500);
    } catch (err) {
      console.error('Export SVG error:', err);
      setErrorMessage('Hitilafu wakati wa kutoa SVG. Tafadhali jaribu tena.');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsExportingSVG(false);
    }
  };

  // Export as high-resolution PNG image
  const handleExportImage = async () => {
    const targetElement = document.getElementById(`room-portrait-page-${activeRoomIndex}`) || document.getElementById('room-portrait-page-0');
    if (!targetElement) return;
    setIsExportingImage(true);
    setErrorMessage(null);
    try {
      const canvas = await html2canvas(targetElement, {
        scale: 3,
        useCORS: true,
        backgroundColor: theme.planBgInline,
        onclone: prepareClonedPageForExport
      });
      const link = document.createElement('a');
      link.download = `SITTING_PLAN_${examType}_${(currentRoom?.name || 'ROOM').replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setSavedSuccessMsg('Picha ya ubora wa juu (PNG) imepakuliwa kwa ufanisi!');
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
  // Generous height so candidate numbers NEVER get clipped vertically on screen or print!
  const getDynamicRowHeight = (maxRows) => {
    if (maxRows <= 5) return 'h-16 print:h-[58px]';
    if (maxRows === 6) return 'h-15 print:h-[52px]';
    if (maxRows === 7) return 'h-14 print:h-[46px]';
    if (maxRows === 8) return 'h-12 print:h-[41px]';
    if (maxRows === 9) return 'h-11 print:h-[37px]';
    return 'h-10 print:h-[33px]';
  };

  // Smart font sizing based on BOTH row count and character length of the candidate number
  // so 4-digit numbers ('0001') and full numbers ('S0123/0001') are 100% visible without cutting off
  const getDynamicNumberSize = (maxRows, seatText = '', numCols = 4) => {
    const len = String(seatText || '').length;
    if (len >= 11 || numCols >= 7) {
      return 'text-[10px] sm:text-xs font-black leading-none tracking-tighter';
    }
    if (len >= 7 || numCols === 6) {
      return 'text-xs sm:text-sm font-black leading-none tracking-tight';
    }
    if (maxRows <= 6) return 'text-base sm:text-lg font-black leading-none tracking-tight';
    if (maxRows <= 8) return 'text-sm sm:text-base font-black leading-none tracking-tight';
    return 'text-xs sm:text-sm font-black leading-none tracking-tight';
  };

  // Determine which rooms to render for printing / viewing
  const roomsToRender = printScope === 'all' 
    ? computedRooms 
    : [activeComputedRoom];

  return (
    <div className="space-y-6">
      {/* 
        OFFICIAL PRINT CSS FOR A4 PORTRAIT - STRICTLY ONE PAGE PER ROOM
        Guarantees that each room occupies exactly 1 page, numbers never clip, and desk boxes sit cleanly!
      */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait !important;
            margin: 5mm 7mm !important;
          }
          body * {
            visibility: hidden !important;
          }
          #sitting-plan-print-root,
          #sitting-plan-print-root * {
            visibility: visible !important;
          }
          #sitting-plan-print-root .no-print,
          #sitting-plan-print-root .no-print * {
            display: none !important;
            visibility: hidden !important;
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
            height: 285mm !important;
            max-height: 285mm !important;
            min-height: 285mm !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            padding: 4.5mm 6mm !important;
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
          .desk-box-card {
            border-width: 2px !important;
            border-style: solid !important;
            box-sizing: border-box !important;
            overflow: visible !important;
            break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .desk-slot-deleted {
            visibility: hidden !important;
            border: none !important;
            background: transparent !important;
          }
          .desk-seat-number-print {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 100% !important;
            line-height: 1 !important;
            overflow: visible !important;
            white-space: nowrap !important;
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

            {/* Toggle Snake Pattern Canvas Preview Mode */}
            <button
              type="button"
              onClick={() => setShowPreviewCanvas(prev => !prev)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer border transition active:scale-95 ${
                showPreviewCanvas
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>{showPreviewCanvas ? 'Ficha Preview Canvas' : 'Preview Snake Pattern (Canvas)'}</span>
            </button>

            {/* Commit & Save Configuration to Database */}
            <button
              type="button"
              onClick={handleSaveToDatabase}
              disabled={isSavingToDb}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer border shadow-sm transition active:scale-95 ${
                isCommittedToDb
                  ? 'bg-teal-700 text-white border-teal-800'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700'
              }`}
              title="Thibitisha na hifadhi mpangilio huu wa vyumba kwenye Database"
            >
              <Database className="w-4 h-4" />
              <span>
                {isSavingToDb
                  ? 'Inahifadhi...'
                  : isCommittedToDb
                  ? 'Imehifadhiwa Database ✓'
                  : 'Hifadhi Kwenye Database'}
              </span>
            </button>

            {/* Manual Candidate Numbers Input Button */}
            <button
              type="button"
              onClick={() => setShowManualModal(true)}
              className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition active:scale-95"
            >
              <Edit3 className="w-4 h-4 text-amber-600" />
              <span>Weka Namba Manual (List)</span>
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

            {/* Export High-Resolution PDF for Printing */}
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm transition active:scale-95"
              title="Pakua mpangilio wa madawati kama High-Resolution PDF kwa ajili ya ku-print"
            >
              <FileText className="w-4 h-4" />
              <span>{isExportingPDF ? 'Inatengeneza PDF...' : 'Export High-Res PDF'}</span>
            </button>

            {/* Export Crisp Vector SVG Image for Printing */}
            <button
              type="button"
              onClick={handleExportSVG}
              disabled={isExportingSVG}
              className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm transition active:scale-95"
              title="Pakua mpangilio wa madawati kama Vector SVG Image isiyofifia wakati wa ku-print"
            >
              <Download className="w-4 h-4" />
              <span>{isExportingSVG ? 'Exporting SVG...' : 'Export Vector SVG'}</span>
            </button>

            {/* Export High Res PNG Image */}
            <button
              type="button"
              onClick={handleExportImage}
              disabled={isExportingImage}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition active:scale-95"
              title="Pakua mpangilio wa madawati kama picha ya PNG"
            >
              <Download className="w-4 h-4" />
              <span>{isExportingImage ? 'Exporting...' : 'Export PNG'}</span>
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

        {/* INLINE AUTOMATIC MULTI-ROOM SITTING PLAN GENERATOR (e.g., 300 Students, 25 per Room) */}
        <div className="p-4 bg-gradient-to-r from-indigo-50 via-blue-50 to-emerald-50 rounded-xl border-2 border-indigo-200 space-y-3 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-indigo-200/80 pb-2.5">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-700 shrink-0" />
              <div>
                <h3 className="font-black text-indigo-950 text-xs sm:text-sm uppercase tracking-wide">
                  Automatic Sitting Plan Generator (Weka Idadi ya Wanafunzi Wote &amp; Kila Chumba)
                </h3>
                <p className="text-[11px] text-slate-600 font-medium">
                  Ingiza jumla ya wanafunzi (mfano: 300) na idadi ya wanafunzi kwa kila chumba (mfano: 25 au 30) kutengeneza vyumba vyote kiotomatiki.
                </p>
              </div>
            </div>
            <div className="px-3 py-1 bg-white/90 border border-indigo-200 rounded-lg text-xs font-black text-indigo-900 shrink-0">
              Muhtasari: Wanafunzi {Math.max(1, parseInt(batchCandidateCount, 10) || 1)} &rarr; Vyumba{' '}
              <span className="text-emerald-700 underline">
                {Math.ceil(
                  Math.max(1, parseInt(batchCandidateCount, 10) || 1) /
                    Math.max(1, parseInt(batchSeatsPerRoom, 10) || 25)
                )}
              </span>{' '}
              ({Math.max(1, parseInt(batchSeatsPerRoom, 10) || 25)} kwa chumba)
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs items-end">
            <div>
              <label className="block font-black text-slate-800 mb-1">
                1. Jumla ya Wanafunzi Wote
              </label>
              <input
                type="number"
                min="1"
                max="5000"
                value={batchCandidateCount}
                onChange={(e) => setBatchCandidateCount(e.target.value)}
                placeholder="Mfano: 300"
                className="w-full p-2 border-2 border-indigo-300 rounded-lg font-black text-sm text-indigo-950 bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-black text-slate-800 mb-1">
                2. Wanafunzi Kila Chumba
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={batchSeatsPerRoom}
                onChange={(e) => setBatchSeatsPerRoom(e.target.value)}
                placeholder="Mfano: 25"
                className="w-full p-2 border-2 border-indigo-300 rounded-lg font-black text-sm text-indigo-950 bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-black text-slate-800 mb-1">
                3. Columns kwa Chumba
              </label>
              <input
                type="number"
                min="1"
                max="8"
                value={batchColsPerRoom}
                onChange={(e) => setBatchColsPerRoom(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-black text-sm text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-black text-slate-800 mb-1">
                4. Namba ya Kuanzia
              </label>
              <input
                type="text"
                maxLength={4}
                value={batchStartNumber}
                onChange={(e) => setBatchStartNumber(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="0001"
                className="w-full p-2 border border-slate-300 rounded-lg font-mono font-black text-sm text-center text-slate-900 bg-white tracking-widest focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-black text-slate-800 mb-1">
                5. Mpangilio (Pattern)
              </label>
              <select
                value={batchPattern}
                onChange={(e) => {
                  const pat = e.target.value;
                  setBatchPattern(pat);
                  handleSetAllRoomsPattern(pat);
                }}
                className="w-full p-2 border border-slate-300 rounded-lg font-black text-xs text-slate-900 bg-white cursor-pointer focus:ring-2 focus:ring-indigo-500"
              >
                <option value="snake">Snake Pattern (Zunguka ↓↑)</option>
                <option value="topToBottom">Straight (Juu-Chini ↓↓)</option>
              </select>
            </div>

            <div>
              <button
                type="button"
                onClick={handleApplyBatchGeneration}
                className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95 text-xs"
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Generate Sitting Plan</span>
              </button>
            </div>
          </div>
        </div>

        {/* ROOM TABS (Multi-room switching, add, duplicate, remove) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Exam Rooms ({rooms.length} Rooms Configured — Total{' '}
              {computedRooms.reduce((sum, r) => sum + r.totalSeats, 0)} Students)
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {rooms.length > 1 && (
                <button
                  type="button"
                  onClick={() => setPrintScope(prev => (prev === 'all' ? 'current' : 'all'))}
                  className={`text-xs font-black flex items-center gap-1 cursor-pointer px-2.5 py-1 rounded-lg border transition ${
                    printScope === 'all'
                      ? 'bg-emerald-600 text-white border-emerald-700'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>
                    {printScope === 'all'
                      ? `Unatazama Vyumba Vyote (${rooms.length}) — Bofya Kuona 1`
                      : `Onyesha Vyumba Vyote (${rooms.length}) Chini`}
                  </span>
                </button>
              )}
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
                clearRoomNumberOverridesKeepLayout(activeRoomIndex);
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
              onChange={(e) => {
                clearRoomNumberOverridesKeepLayout(activeRoomIndex);
                updateCurrentRoom({ doorEntrance: e.target.value });
              }}
              className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-slate-50 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="Left Side">Left Side (Anti-Clockwise)</option>
              <option value="Right Side">Right Side (Clockwise)</option>
            </select>
          </div>

          {/* Invigilator Name */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Invigilator Name</label>
            <input
              type="text"
              value={academicMaster}
              onChange={(e) => setAcademicMaster(e.target.value)}
              placeholder="e.g. Juma Ally"
              className="w-full p-2 border border-slate-300 rounded-lg font-semibold text-slate-800 bg-slate-50 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Supervisor Name */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Supervisor Name</label>
            <input
              type="text"
              value={supervisor}
              onChange={(e) => setSupervisor(e.target.value)}
              placeholder="e.g. Dr. Mwinyi"
              className="w-full p-2 border border-slate-300 rounded-lg font-semibold text-slate-800 bg-slate-50 focus:ring-2 focus:ring-blue-500"
            />
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
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black text-slate-700">Seating Pattern:</span>
              <button
                type="button"
                onClick={() => handleSetRoomPattern('snake')}
                className={`px-3 py-1.5 text-xs font-black rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                  currentRoom.fillPattern === 'snake'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-200'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <span>🐍 Snake Pattern (Zunguka ↓↑)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetRoomPattern('topToBottom')}
                className={`px-3 py-1.5 text-xs font-black rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                  currentRoom.fillPattern === 'topToBottom'
                    ? 'bg-blue-600 text-white border-blue-700 shadow-xs ring-2 ring-blue-200'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <span>⬇️ Straight (Juu-Chini ↓↓)</span>
              </button>
              {rooms.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleSetAllRoomsPattern(currentRoom.fillPattern || 'snake')}
                  className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100 cursor-pointer"
                  title="Weka mpangilio huu wa Snake au Straight kwenye vyumba vyote"
                >
                  Weka Vyumba Vyote ({rooms.length})
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-black text-blue-900 mb-1">
                Wanafunzi Chumba Hiki (Total in Room)
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={activeComputedRoom.totalSeats}
                onChange={(e) => handleCurrentRoomStudentsChange(e.target.value)}
                className="w-full p-2 border-2 border-blue-300 rounded-lg font-black text-blue-950 bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Rows per Column (Default)</label>
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
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <span className="text-[11px] font-black text-slate-800 uppercase tracking-wide">
                1. Idadi ya Meza kwa Kila Safu ya Wima (Number of Desks in Each Column):
              </span>
              <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Badili idadi ya meza kwa kila Column (Col 1 - Col {currentRoom.numColumns})
              </span>
            </div>
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
                    min="0"
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

          {/* Desks per individual horizontal row */}
          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <span className="text-[11px] font-black text-slate-800 uppercase tracking-wide">
                2. Idadi ya Meza kwa Kila Mstari wa Ulalo (Number of Desks in Each Row):
              </span>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Weka idadi ya meza kwa kila Row (Row 1 - Row {activeComputedRoom.maxRows})
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2.5">
              {Array.from({ length: activeComputedRoom.maxRows }).map((_, rIdx) => {
                const activeInRow = (activeComputedRoom.grid?.[rIdx] || []).filter(cell => cell && !cell.isDeleted).length;
                return (
                  <div key={rIdx} className="bg-white p-2 rounded-lg border border-slate-300 text-center space-y-1 shadow-2xs">
                    <div className="text-[10px] font-black text-slate-700">
                      Row {rIdx + 1}
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={currentRoom.numColumns}
                      value={activeInRow}
                      onChange={(e) => handleRowDesksChange(rIdx, e.target.value)}
                      className="w-full py-0.5 text-center font-black text-xs text-slate-900 border border-slate-200 rounded bg-slate-50"
                    />
                    <span className="text-[9px] text-slate-400 block font-medium">desks</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* VISUAL SNAKE PATTERN CANVAS PREVIEW & SIMULATION MODE (Before Committing to Database) */}
        {showPreviewCanvas && (
          <div className="p-4 bg-slate-900 text-white rounded-2xl border-2 border-emerald-500/40 space-y-4 shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-700 pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Eye className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-300">
                    Snake Pattern Visual Canvas Simulator &amp; Preview Mode
                  </span>
                  <span className="text-[11px] text-slate-300 font-semibold">
                    · Chumba: {activeComputedRoom.name} ({activeComputedRoom.totalSeats} Desks) · Jumla Wanafunzi Wote: {totalConfiguredStudents}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Hakiki mzunguko wa <strong>Snake Pattern (↓ Juu-Chini / ↑ Chini-Juu)</strong> kwenye Canvas kulingana na idadi ya meza na wanafunzi kabla ya kuhifadhi mpangilio wa mwisho kwenye Database.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    if (isSimulating) {
                      setIsSimulating(false);
                    } else {
                      handleStartSnakeSimulation();
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-slate-950 flex items-center gap-1.5 cursor-pointer transition"
                >
                  {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isSimulating ? 'Simamisha (Pause)' : 'Cheza Mzunguko wa Snake (Simulate)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSimulating(false);
                    setSimulationStep(activeComputedRoom.totalSeats || 0);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 flex items-center gap-1 cursor-pointer transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Onyesha Zote ({activeComputedRoom.totalSeats})</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveToDatabase}
                  disabled={isSavingToDb}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer transition shadow-sm ${
                    isCommittedToDb
                      ? 'bg-teal-500 text-slate-950'
                      : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>
                    {isSavingToDb
                      ? 'Inahifadhi...'
                      : isCommittedToDb
                      ? 'Imethibitishwa Kwenye Database ✓'
                      : 'Thibitisha & Hifadhi Kwenye Database'}
                  </span>
                </button>
              </div>
            </div>

            {/* Interactive Step Scrubber & Room Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800/80 px-3.5 py-2.5 rounded-xl border border-slate-700 text-xs">
              <div className="flex items-center gap-3 flex-1">
                <span className="font-bold text-slate-300 whitespace-nowrap">
                  Hatua ya Ukaaji (Step {Math.min(simulationStep, activeComputedRoom.totalSeats)} / {activeComputedRoom.totalSeats}):
                </span>
                <input
                  type="range"
                  min="1"
                  max={Math.max(1, activeComputedRoom.totalSeats)}
                  value={Math.min(simulationStep, Math.max(1, activeComputedRoom.totalSeats))}
                  onChange={(e) => {
                    setIsSimulating(false);
                    setSimulationStep(parseInt(e.target.value, 10) || 1);
                  }}
                  className="w-full max-w-xs accent-emerald-400 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-slate-400 font-semibold">Badili Pattern Kwenye Preview:</span>
                <button
                  type="button"
                  onClick={() => handleSetRoomPattern('snake')}
                  className={`px-2.5 py-1 rounded text-[11px] font-black cursor-pointer transition ${
                    currentRoom.fillPattern === 'snake'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  🐍 Snake (↓↑)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetRoomPattern('topToBottom')}
                  className={`px-2.5 py-1 rounded text-[11px] font-black cursor-pointer transition ${
                    currentRoom.fillPattern === 'topToBottom'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  ⬇️ Straight (↓↓)
                </button>
              </div>
            </div>

            {/* HTML5 Canvas Rendering the Live Snake Pattern Simulation */}
            <div className="flex justify-center bg-slate-950/60 p-3 rounded-xl border border-slate-800 overflow-x-auto">
              <canvas
                ref={simulationCanvasRef}
                className="rounded-lg shadow-md"
              />
            </div>
          </div>
        )}
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
                  max="5000"
                  value={batchCandidateCount}
                  onChange={(e) => setBatchCandidateCount(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-black text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Idadi ya Madawati kwa Chumba (Seats per Room)</label>
                <input
                  type="number"
                  min="1"
                  max="120"
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
                Vyumba <strong>{Math.ceil(Math.max(1, parseInt(batchCandidateCount, 10) || 1) / Math.max(1, parseInt(batchSeatsPerRoom, 10) || 25))}</strong> vitatengenezwa. Kila chumba kitatoka kwenye ukurasa 1 wa A4 Portrait.
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

      {/* MANUAL CANDIDATE LIST MODAL */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-600" />
                <h3 className="font-black text-slate-900 text-base">Weka Namba za Watahiniwa Manual (List)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-black p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Paste auandika namba za watahiniwa (k.v. S0123/0001, S0123/0002 au 0001, 0002...) zilizotenganishwa na koma au mstari mpya. Mfumo utazijaza kwenye madawati ya chumba cha <strong>{activeComputedRoom.name}</strong> kuanzia mwanzo hadi mwisho.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Orodha ya Namba za Watahiniwa (Candidate Numbers List)</label>
                <textarea
                  rows={6}
                  value={manualListText}
                  onChange={(e) => setManualListText(e.target.value)}
                  placeholder="S0123/0001, S0123/0002, S0123/0003..."
                  className="w-full p-3 border border-slate-300 rounded-xl font-mono text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                <span className="font-bold">Kumbuka: </span>
                Chumba hiki kina madawati <strong>{activeComputedRoom.totalSeats}</strong>. Namba za kwanza {activeComputedRoom.totalSeats} kwenye orodha zitajazwa kwenye vyumba hivi.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Ghairi
              </button>
              <button
                type="button"
                onClick={handleApplyManualList}
                className="px-4 py-2 text-xs font-black text-white bg-amber-600 hover:bg-amber-700 rounded-lg cursor-pointer shadow-sm"
              >
                Weka Kwenye Viti
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
                      {room.doorEntrance} ({room.fillPattern === 'snake' ? 'Snake Pattern' : 'Straight'})
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

              {/* ADVISORY TIP BANNER FOR MOVABLE/CUSTOM DESKS (Hidden on Print) */}
              <div className="no-print bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  {selectedDeskForMove ? (
                    <span>
                      <strong className="text-blue-700">Unahamisha Meza [{selectedDeskForMove.seatNo}]:</strong> Sasa bofya meza nyingine kubadilishana au bofya nafasi iliyofutwa kuihamishia hapo!
                    </span>
                  ) : (
                    <span>
                      <strong>Udhibiti wa Meza:</strong> Bofya namba uhariri moja kwa moja, buruta (Drag &amp; Drop) au bofya ikoni ya <strong>Hamisha</strong> kuhamisha meza, na bofya <strong>Chombo cha Taka (Delete)</strong> kufuta kibox bila kupandisha meza za chini.
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selectedDeskForMove && (
                    <button
                      type="button"
                      onClick={() => setSelectedDeskForMove(null)}
                      className="px-2.5 py-1 bg-slate-700 hover:bg-slate-800 text-white rounded text-[10px] font-bold cursor-pointer shrink-0"
                    >
                      Ghairi Kuhamisha
                    </button>
                  )}
                  {Object.keys(seatOverrides).length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSeatOverrides({});
                        setSelectedDeskForMove(null);
                      }}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer shrink-0"
                    >
                      Rudisha Meza Zote (Reset)
                    </button>
                  )}
                </div>
              </div>

              {/* SEATS GRID DISPLAY - BEAUTIFULLY STYLED CANDIDATE DESKS */}
              <div className="my-auto py-1">
                <div 
                  className="grid gap-2.5"
                  style={{
                    gridTemplateColumns: `repeat(${room.numColumns}, minmax(0, 1fr))`
                  }}
                >
                  {Array.from({ length: room.numColumns }).map((_, colIdx) => {
                    const actualRoomIdx = room.roomIdx ?? roomIdx;
                    const colDir = room.colDirections?.[colIdx] || 'down';
                    return (
                      <div key={colIdx} className="space-y-1.5">
                        {/* Column Header with Snake / Straight Direction Indicator */}
                        <div 
                          className={`text-center py-0.5 px-1 rounded text-[10px] font-black uppercase tracking-wider shadow-2xs flex items-center justify-center gap-1 ${theme.columnHeaderBg}`}
                        >
                          <span>Column {colIdx + 1}</span>
                          <span className="text-[9px] opacity-90">
                            {colDir === 'up' ? '↑ (Chini-Juu)' : '↓ (Juu-Chini)'}
                          </span>
                        </div>

                        {/* Column Desks / Boxes */}
                        <div className="space-y-1.5">
                          {room.grid && room.grid.map((rowArr, rowIdx) => {
                            const seat = rowArr[colIdx];
                            const isEmptyOrDeleted = !seat || seat.isDeleted;

                            // When a desk is deleted, the box disappears completely on print and keeps its exact row height so lower desks NEVER shift up
                            if (isEmptyOrDeleted) {
                              return (
                                <div
                                  key={rowIdx}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    if (draggedDesk) {
                                      executeDeskMoveOrSwap(draggedDesk, actualRoomIdx, rowIdx, colIdx, null);
                                    }
                                  }}
                                  onClick={(e) => handleRestoreDesk(actualRoomIdx, rowIdx, colIdx, e)}
                                  className={`desk-slot-deleted ${rowHeightClass} rounded flex items-center justify-center transition group relative ${
                                    selectedDeskForMove
                                      ? 'border-2 border-dashed border-amber-400 bg-amber-50/70 cursor-pointer'
                                      : 'border border-transparent hover:border-dashed hover:border-slate-300 hover:bg-slate-100/60 cursor-pointer'
                                  }`}
                                  title={
                                    selectedDeskForMove
                                      ? 'Bofya hapa kuhamishia meza uliyoichagua kwenye nafasi hii'
                                      : 'Nafasi wazi (Meza imefutwa) — Bofya kurudisha meza hapa'
                                  }
                                >
                                  <span
                                    className={`no-print text-[9px] font-bold px-1.5 py-0.5 rounded transition ${
                                      selectedDeskForMove
                                        ? 'text-amber-900 bg-amber-200/80 opacity-100'
                                        : 'text-slate-400 opacity-0 group-hover:opacity-100'
                                    }`}
                                  >
                                    {selectedDeskForMove ? '↙ Hamishia Hapa' : '+ Rudisha Meza'}
                                  </span>
                                </div>
                              );
                            }

                            const isSelectedForMove = selectedDeskForMove && 
                              selectedDeskForMove.roomIdx === actualRoomIdx && 
                              selectedDeskForMove.rowIdx === rowIdx && 
                              selectedDeskForMove.colIdx === colIdx;

                            const cellFontSizeClass = getDynamicNumberSize(room.maxRows, seat.seatNo, room.numColumns);

                            return (
                              <div
                                key={rowIdx}
                                draggable
                                onDragStart={() => setDraggedDesk({ roomIdx: actualRoomIdx, rowIdx, colIdx, seatNo: seat.seatNo })}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  if (draggedDesk) {
                                    executeDeskMoveOrSwap(draggedDesk, actualRoomIdx, rowIdx, colIdx, seat);
                                  }
                                }}
                                title="Buruta (Drag) kuhamisha, bofya namba kuhariri, au tumia vitufe vya juu kuhamisha/kufuta"
                                onClick={() => handleDeskClick(actualRoomIdx, rowIdx, colIdx, seat)}
                                className={`desk-box-card ${rowHeightClass} ${theme.boxBodyBg} border-2 ${
                                  isSelectedForMove ? 'border-amber-500 ring-4 ring-amber-300 animate-pulse' : theme.boxBorder
                                } rounded-md flex flex-col justify-between p-1 shadow-2xs transition group relative cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-blue-500`}
                                style={{
                                  borderColor: isSelectedForMove ? '#f59e0b' : theme.boxBorderInline
                                }}
                              >
                                {/* Desk Top Strip (Row/Col Tag + Attendance Checkbox + Action Buttons) */}
                                <div 
                                  className={`flex items-center justify-between px-1.5 py-0.5 rounded-xs text-[8px] font-black uppercase tracking-wider shrink-0 ${theme.boxHeaderBg}`}
                                  style={{ backgroundColor: theme.boxHeaderBgInline }}
                                >
                                  <span className="flex items-center gap-1">
                                    <span>R{rowIdx + 1}C{colIdx + 1}</span>
                                    {isSelectedForMove && <span className="text-amber-300 font-bold">(HAMISHA)</span>}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    {/* Attendance Checkbox in Header Bar so it NEVER covers the Candidate Number */}
                                    <input 
                                      type="checkbox" 
                                      className="w-2.5 h-2.5 cursor-pointer accent-emerald-400 rounded-xs"
                                      title="Tiki kama mtahiniwa amehudhuria"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <div className="no-print flex items-center gap-1">
                                      <button
                                        type="button"
                                        title="Hamisha meza hii (Move / Swap Desk)"
                                        onClick={(e) => handleStartMoveDesk(actualRoomIdx, rowIdx, colIdx, seat, e)}
                                        className={`px-1 py-0.2 rounded flex items-center gap-0.5 transition cursor-pointer ${
                                          isSelectedForMove
                                            ? 'bg-amber-400 text-slate-950 font-black'
                                            : 'bg-white/15 hover:bg-amber-400 hover:text-slate-950 text-white'
                                        }`}
                                      >
                                        <RefreshCw className="w-2.5 h-2.5" />
                                      </button>
                                      <button
                                        type="button"
                                        title="Futa meza hii kabisa (Delete Desk Box)"
                                        onClick={(e) => handleDeleteDesk(actualRoomIdx, rowIdx, colIdx, e)}
                                        className="px-1 py-0.2 rounded bg-rose-500/80 hover:bg-rose-600 text-white transition cursor-pointer"
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Candidate Roll Number - Unclipped on Screen (<input>) AND Unclipped on Print (<span>) */}
                                <div className="flex-1 flex items-center justify-center w-full px-0.5 py-0.5 overflow-visible">
                                  <input
                                    type="text"
                                    value={seat.seatNo}
                                    placeholder="----"
                                    title="Bofya hapa kubadili namba ya mtahiniwa moja kwa moja"
                                    onClick={(e) => {
                                      if (!selectedDeskForMove) {
                                        e.stopPropagation();
                                      }
                                    }}
                                    onChange={(e) => handleInlineSeatChange(actualRoomIdx, rowIdx, colIdx, e.target.value)}
                                    className={`no-print w-full text-center bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded font-mono text-slate-950 py-0 px-0.5 ${cellFontSizeClass}`}
                                  />
                                  <span
                                    className={`hidden desk-seat-number-print font-mono text-slate-950 text-center w-full px-0.5 ${cellFontSizeClass}`}
                                  >
                                    {seat.seatNo || '----'}
                                  </span>
                                </div>

                                {/* Desk Bottom Sub-tag */}
                                <div className="text-center leading-none shrink-0 pb-0.5">
                                  <span className={`text-[7px] font-black uppercase tracking-wider ${theme.boxSubText}`}>
                                    {seat.seatNo ? `SEAT #${seat.stepOrder || ''}` : 'EMPTY DESK'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
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
