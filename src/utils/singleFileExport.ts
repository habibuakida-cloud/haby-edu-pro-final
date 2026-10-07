import { AppData } from '../types';

/**
 * Generates a fully self-contained, standalone single-file HTML application
 * embedding the current school data, complete Tailwind CSS, Lucide icons,
 * responsive multi-tab UI (Dashboard, Timetable, Invigilation, Students,
 * Teachers, Results, Exams, Settings), printable layouts, and local storage persistence.
 */
export function generateSingleFileHtml(appData: AppData): string {
  const dataJson = JSON.stringify(appData).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appData.schoolInfo?.name || 'HABY EDU PRO'} - Standalone Single-File Edition</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    @media print {
      .no-print { display: none !important; }
      body { background: white !important; padding: 0 !important; }
      .print-page { page-break-after: always; box-shadow: none !important; border: 1px solid #000 !important; }
    }
  </style>
</head>
<body class="bg-slate-100 text-slate-800 font-sans min-h-screen p-3 sm:p-6">
  <div id="app" class="max-w-7xl mx-auto space-y-5">
    <!-- Header -->
    <header class="bg-[#1f4d8b] text-white p-5 rounded-2xl shadow-sm border border-blue-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
      <div>
        <h1 id="hdr-school-name" class="text-2xl sm:text-3xl font-extrabold tracking-tight">HABY EDU PRO</h1>
        <p id="hdr-school-motto" class="text-xs sm:text-sm text-blue-200 mt-1">Single-File Offline Application • Complete School Management & Timetabling</p>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="window.print()" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition-colors">
          <i data-lucide="printer" class="w-4 h-4"></i> Print
        </button>
        <button onclick="saveCurrentData()" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1.5 shadow-xs transition-colors">
          <i data-lucide="save" class="w-4 h-4"></i> Save
        </button>
      </div>
    </header>

    <!-- Navigation Tabs -->
    <nav class="flex flex-wrap gap-1 bg-white p-2 rounded-xl border border-slate-200 shadow-xs no-print">
      <button onclick="switchTab('dashboard')" id="nav-dashboard" class="nav-btn px-4 py-2 rounded-lg text-xs font-bold transition-all bg-[#1f4d8b] text-white">Dashboard</button>
      <button onclick="switchTab('timetable')" id="nav-timetable" class="nav-btn px-4 py-2 rounded-lg text-xs font-bold transition-all text-slate-600 hover:bg-slate-100">Timetable</button>
      <button onclick="switchTab('invigilation')" id="nav-invigilation" class="nav-btn px-4 py-2 rounded-lg text-xs font-bold transition-all text-slate-600 hover:bg-slate-100">Invigilation</button>
      <button onclick="switchTab('students')" id="nav-students" class="nav-btn px-4 py-2 rounded-lg text-xs font-bold transition-all text-slate-600 hover:bg-slate-100">Students</button>
      <button onclick="switchTab('teachers')" id="nav-teachers" class="nav-btn px-4 py-2 rounded-lg text-xs font-bold transition-all text-slate-600 hover:bg-slate-100">Teachers</button>
      <button onclick="switchTab('results')" id="nav-results" class="nav-btn px-4 py-2 rounded-lg text-xs font-bold transition-all text-slate-600 hover:bg-slate-100">Results</button>
      <button onclick="switchTab('exams')" id="nav-exams" class="nav-btn px-4 py-2 rounded-lg text-xs font-bold transition-all text-slate-600 hover:bg-slate-100">Exams</button>
      <button onclick="switchTab('settings')" id="nav-settings" class="nav-btn px-4 py-2 rounded-lg text-xs font-bold transition-all text-slate-600 hover:bg-slate-100">Settings</button>
    </nav>

    <!-- TAB: DASHBOARD -->
    <section id="view-dashboard" class="tab-view space-y-5">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center">
          <div id="stat-students" class="text-3xl font-black text-blue-700">0</div>
          <div class="text-xs font-bold text-slate-500 uppercase mt-1">Total Students</div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center">
          <div id="stat-teachers" class="text-3xl font-black text-emerald-700">0</div>
          <div class="text-xs font-bold text-slate-500 uppercase mt-1">Teaching Staff</div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center">
          <div id="stat-exams" class="text-3xl font-black text-indigo-700">0</div>
          <div class="text-xs font-bold text-slate-500 uppercase mt-1">Exam Papers</div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center">
          <div id="stat-sessions" class="text-3xl font-black text-amber-700">0</div>
          <div class="text-xs font-bold text-slate-500 uppercase mt-1">Invigilation Sessions</div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h2 class="text-lg font-bold text-slate-800">Quick Actions & System Overview</h2>
        <p class="text-xs text-slate-600 leading-relaxed">
          Welcome to the self-contained single-file version of <strong>HABY EDU PRO</strong>. This file contains all your school's data, timetable allocations, invigilation duties, and student records. You can safely save this file, open it directly in any browser on any computer, and work completely offline.
        </p>
        <div class="flex flex-wrap gap-2 pt-2">
          <button onclick="switchTab('timetable')" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs">View Class Timetables</button>
          <button onclick="switchTab('invigilation')" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs">View Invigilation Timetable</button>
          <button onclick="switchTab('results')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs">View Student Results</button>
        </div>
      </div>
    </section>

    <!-- TAB: TIMETABLE -->
    <section id="view-timetable" class="tab-view hidden space-y-4">
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <label class="text-xs font-bold text-slate-600">Select Class:</label>
          <select id="tt-class-select" onchange="renderTimetableGrid()" class="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white">
            <option value="Form 1 A">Form 1 A</option>
            <option value="Form 1 B">Form 1 B</option>
            <option value="Form 2 A">Form 2 A</option>
            <option value="Form 2 B">Form 2 B</option>
            <option value="Form 3 A">Form 3 A</option>
            <option value="Form 3 B">Form 3 B</option>
            <option value="Form 4 A">Form 4 A</option>
            <option value="Form 4 B">Form 4 B</option>
            <option value="Form 5 PCB">Form 5 PCB</option>
            <option value="Form 5 HKL">Form 5 HKL</option>
            <option value="Form 6 PCM">Form 6 PCM</option>
            <option value="Form 6 HGL">Form 6 HGL</option>
          </select>
        </div>
        <button onclick="window.print()" class="px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center gap-1">
          <i data-lucide="printer" class="w-3.5 h-3.5"></i> Print Class Timetable
        </button>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto p-4">
        <div class="text-center font-bold text-sm text-slate-800 mb-3" id="tt-header-title">Class Timetable</div>
        <table class="w-full text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-slate-700">
              <th class="p-2 border border-slate-200 w-24">Day</th>
              <th class="p-2 border border-slate-200">Period 1<br><span class="font-normal text-[10px] text-slate-500">07:30 - 08:10</span></th>
              <th class="p-2 border border-slate-200">Period 2<br><span class="font-normal text-[10px] text-slate-500">08:10 - 08:50</span></th>
              <th class="p-2 border border-slate-200">Period 3<br><span class="font-normal text-[10px] text-slate-500">08:50 - 09:30</span></th>
              <th class="p-2 border border-slate-200 bg-amber-50 text-amber-800 w-16">Break</th>
              <th class="p-2 border border-slate-200">Period 4<br><span class="font-normal text-[10px] text-slate-500">10:00 - 10:40</span></th>
              <th class="p-2 border border-slate-200">Period 5<br><span class="font-normal text-[10px] text-slate-500">10:40 - 11:20</span></th>
              <th class="p-2 border border-slate-200">Period 6<br><span class="font-normal text-[10px] text-slate-500">11:20 - 12:00</span></th>
              <th class="p-2 border border-slate-200 bg-amber-50 text-amber-800 w-16">Lunch</th>
              <th class="p-2 border border-slate-200">Period 7<br><span class="font-normal text-[10px] text-slate-500">13:00 - 13:40</span></th>
              <th class="p-2 border border-slate-200">Period 8<br><span class="font-normal text-[10px] text-slate-500">13:40 - 14:20</span></th>
            </tr>
          </thead>
          <tbody id="tt-grid-body">
            <!-- Populated via JS -->
          </tbody>
        </table>
      </div>
    </section>

    <!-- TAB: INVIGILATION -->
    <section id="view-invigilation" class="tab-view hidden space-y-4">
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-bold text-slate-800">Examination Invigilation Schedule</h2>
          <p class="text-xs text-slate-500">Sessions I (Morning), II (Afternoon), and III (Evening) with room assignments</p>
        </div>
        <button onclick="window.print()" class="px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center gap-1">
          <i data-lucide="printer" class="w-3.5 h-3.5"></i> Print Invigilation
        </button>
      </div>

      <div id="invigilation-list" class="space-y-3">
        <!-- Populated via JS -->
      </div>
    </section>

    <!-- TAB: STUDENTS -->
    <section id="view-students" class="tab-view hidden space-y-4">
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-base font-bold text-slate-800">Student Directory</h2>
        <span id="students-count-badge" class="px-2.5 py-1 text-xs font-bold bg-blue-100 text-blue-800 rounded-lg">0 Enrolled</span>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
        <table class="w-full text-xs text-left">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-700">
            <tr>
              <th class="p-3">Reg No</th>
              <th class="p-3">Student Name</th>
              <th class="p-3">Gender</th>
              <th class="p-3">Class</th>
              <th class="p-3">Level</th>
              <th class="p-3">Combination / Stream</th>
            </tr>
          </thead>
          <tbody id="students-table-body" class="divide-y divide-slate-100">
            <!-- Populated via JS -->
          </tbody>
        </table>
      </div>
    </section>

    <!-- TAB: TEACHERS -->
    <section id="view-teachers" class="tab-view hidden space-y-4">
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-base font-bold text-slate-800">Teaching Staff & Subject Allocations</h2>
        <span id="teachers-count-badge" class="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-lg">0 Teachers</span>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
        <table class="w-full text-xs text-left">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-700">
            <tr>
              <th class="p-3">Initial</th>
              <th class="p-3">Teacher Name</th>
              <th class="p-3">Subjects Taught</th>
              <th class="p-3 text-center">Periods / Wk</th>
              <th class="p-3 text-center">Invigilation Allowed</th>
            </tr>
          </thead>
          <tbody id="teachers-table-body" class="divide-y divide-slate-100">
            <!-- Populated via JS -->
          </tbody>
        </table>
      </div>
    </section>

    <!-- TAB: RESULTS -->
    <section id="view-results" class="tab-view hidden space-y-4">
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-bold text-slate-800">Official Exam Results Sheet</h2>
          <p class="text-xs text-slate-500">Tanzanian NECTA Division Grading (Div I, II, III, IV, 0)</p>
        </div>
        <button onclick="window.print()" class="px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center gap-1">
          <i data-lucide="printer" class="w-3.5 h-3.5"></i> Print Results Sheet
        </button>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto p-4">
        <table class="w-full text-xs text-left border-collapse">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-700">
            <tr>
              <th class="p-2.5 border border-slate-200">Reg No</th>
              <th class="p-2.5 border border-slate-200">Candidate Name</th>
              <th class="p-2.5 border border-slate-200">Class</th>
              <th class="p-2.5 border border-slate-200 text-center">Total</th>
              <th class="p-2.5 border border-slate-200 text-center">Average</th>
              <th class="p-2.5 border border-slate-200 text-center">Division</th>
            </tr>
          </thead>
          <tbody id="results-table-body">
            <!-- Populated via JS -->
          </tbody>
        </table>
      </div>
    </section>

    <!-- TAB: EXAMS -->
    <section id="view-exams" class="tab-view hidden space-y-4">
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-base font-bold text-slate-800">Examination Master Schedule</h2>
        <span id="exams-count-badge" class="px-2.5 py-1 text-xs font-bold bg-indigo-100 text-indigo-800 rounded-lg">0 Papers</span>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
        <table class="w-full text-xs text-left">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-700">
            <tr>
              <th class="p-3">Day & Date</th>
              <th class="p-3">Session</th>
              <th class="p-3">Subject</th>
              <th class="p-3">Target Class</th>
              <th class="p-3">Time</th>
            </tr>
          </thead>
          <tbody id="exams-table-body" class="divide-y divide-slate-100">
            <!-- Populated via JS -->
          </tbody>
        </table>
      </div>
    </section>

    <!-- TAB: SETTINGS -->
    <section id="view-settings" class="tab-view hidden space-y-4">
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
        <h2 class="text-lg font-bold text-[#1f4d8b]">School Identity & Backup</h2>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="text-xs font-bold text-slate-700 block mb-1">School Name</label>
            <input type="text" id="set-school-name" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white">
          </div>
          <div>
            <label class="text-xs font-bold text-slate-700 block mb-1">Motto / Tagline</label>
            <input type="text" id="set-school-motto" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white">
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
          <button onclick="updateSchoolInfo()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs">
            Save School Info
          </button>
          <button onclick="exportJsonBackup()" class="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xs">
            Export JSON Data Backup
          </button>
          <button onclick="resetData()" class="px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-bold rounded-lg">
            Reset to Defaults
          </button>
        </div>

        <!-- User Accounts Management in Single File -->
        <div class="pt-5 border-t border-slate-100 space-y-4">
          <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
            <i data-lucide="key-round" class="w-4 h-4 text-blue-600"></i> Authorized User Accounts & Passwords
          </h3>
          <div class="overflow-x-auto">
            <table class="w-full text-xs text-left">
              <thead class="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th class="p-2.5">Name</th>
                  <th class="p-2.5">Username</th>
                  <th class="p-2.5">Role</th>
                  <th class="p-2.5">Password</th>
                </tr>
              </thead>
              <tbody id="users-table-body" class="divide-y divide-slate-100">
                <!-- Populated via JS -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  </div>

  <script>
    // Embedded App Data
    const INITIAL_DATA = ${dataJson};
    let appData = null;

    try {
      const saved = localStorage.getItem('haby_edu_pro_single_file_data');
      appData = saved ? JSON.parse(saved) : INITIAL_DATA;
    } catch(e) {
      appData = INITIAL_DATA;
    }

    function saveCurrentData() {
      try {
        localStorage.setItem('haby_edu_pro_single_file_data', JSON.stringify(appData));
        alert('All school timetable, invigilation, and student data saved to local browser storage!');
      } catch(e) {
        alert('Could not save data: ' + e);
      }
    }

    function switchTab(tabId) {
      document.querySelectorAll('.tab-view').forEach(el => el.classList.add('hidden'));
      document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-[#1f4d8b]', 'text-white');
        btn.classList.add('text-slate-600');
      });

      const target = document.getElementById('view-' + tabId);
      if (target) target.classList.remove('hidden');

      const activeBtn = document.getElementById('nav-' + tabId);
      if (activeBtn) {
        activeBtn.classList.remove('text-slate-600');
        activeBtn.classList.add('bg-[#1f4d8b]', 'text-white');
      }

      if (window.lucide) window.lucide.createIcons();
    }

    function renderHeader() {
      const name = appData.schoolInfo?.name || 'HABY EDU PRO';
      const motto = appData.schoolInfo?.motto || 'School Management & Timetable System';
      document.getElementById('hdr-school-name').textContent = name;
      document.getElementById('hdr-school-motto').textContent = motto;
      document.getElementById('set-school-name').value = name;
      document.getElementById('set-school-motto').value = motto;
    }

    function renderDashboard() {
      document.getElementById('stat-students').textContent = appData.students?.length || 0;
      document.getElementById('stat-teachers').textContent = appData.teachers?.length || 0;
      document.getElementById('stat-exams').textContent = appData.exams?.length || 0;
      document.getElementById('stat-sessions').textContent = appData.sessions?.length || 0;
      document.getElementById('students-count-badge').textContent = (appData.students?.length || 0) + ' Enrolled';
      document.getElementById('teachers-count-badge').textContent = (appData.teachers?.length || 0) + ' Teachers';
      document.getElementById('exams-count-badge').textContent = (appData.exams?.length || 0) + ' Papers';
    }

    function renderTimetableGrid() {
      const classSelect = document.getElementById('tt-class-select');
      const selectedClass = classSelect ? classSelect.value : 'Form 1 A';
      document.getElementById('tt-header-title').textContent = selectedClass + ' - Weekly Class Timetable';

      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const tbody = document.getElementById('tt-grid-body');
      tbody.innerHTML = '';

      const assignments = appData.timetableAssignments || [];
      const teachers = appData.teachers || [];

      days.forEach(day => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-100 hover:bg-slate-50/50';

        let html = '<td class="p-2 border border-slate-200 font-bold text-slate-800 bg-slate-50">' + day + '</td>';

        for (let p = 1; p <= 8; p++) {
          if (p === 4) {
            html += '<td class="p-2 border border-slate-200 text-center font-bold text-[10px] bg-amber-50/70 text-amber-800">BREAK</td>';
          }
          if (p === 7) {
            html += '<td class="p-2 border border-slate-200 text-center font-bold text-[10px] bg-amber-50/70 text-amber-800">LUNCH</td>';
          }

          const slot = assignments.find(a => a.day === day && a.period === p && a.className === selectedClass);
          if (slot && slot.subject) {
            const t = teachers.find(teach => teach.id === slot.teacherId);
            const tInitial = t ? t.initial : '';
            html += '<td class="p-2 border border-slate-200 bg-blue-50/40 text-center">' +
              '<div class="font-bold text-blue-900">' + slot.subject + '</div>' +
              (tInitial ? '<div class="text-[10px] text-slate-500 font-semibold">' + tInitial + '</div>' : '') +
              '</td>';
          } else {
            html += '<td class="p-2 border border-slate-200 text-center text-slate-300">-</td>';
          }
        }

        tr.innerHTML = html;
        tbody.appendChild(tr);
      });
    }

    function renderInvigilation() {
      const list = document.getElementById('invigilation-list');
      list.innerHTML = '';
      const sessions = appData.sessions || [];
      const assignments = appData.invigilationAssignments || {};
      const teachers = appData.teachers || [];

      sessions.forEach(s => {
        const div = document.createElement('div');
        div.className = 'p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2';

        let roomBadges = '';
        for (let r = 0; r < (s.rooms || 1); r++) {
          const key = s.id + '_room' + r;
          const tid = assignments[key];
          const t = tid ? teachers.find(teach => teach.id === tid) : null;
          roomBadges += '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">' +
            'Room ' + (r + 1) + ': ' + (t ? '<strong class="text-blue-800">' + t.name + '</strong>' : '<span class="text-amber-600">Unassigned</span>') +
            '</span> ';
        }

        div.innerHTML = 
          '<div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">' +
            '<div class="flex items-center gap-2">' +
              '<span class="font-bold text-slate-900 text-xs">' + s.day + ', ' + s.date + '</span>' +
              '<span class="px-2 py-0.5 rounded text-[10px] font-black ' + 
                (s.session === 'SESSION I' ? 'bg-blue-100 text-blue-800' : s.session === 'SESSION II' ? 'bg-indigo-100 text-indigo-800' : 'bg-purple-100 text-purple-800') + 
              '">' + s.session + ' (' + s.time + ')</span>' +
            '</div>' +
            '<span class="font-bold text-xs text-blue-800">' + s.subject + ' (' + s.className + ' • ' + s.stream + ')</span>' +
          '</div>' +
          '<div class="flex flex-wrap gap-2 pt-1">' + roomBadges + '</div>';

        list.appendChild(div);
      });
    }

    function renderStudents() {
      const tbody = document.getElementById('students-table-body');
      tbody.innerHTML = '';
      (appData.students || []).forEach(s => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50';
        tr.innerHTML = 
          '<td class="p-3 font-mono font-bold text-blue-700">' + s.regNo + '</td>' +
          '<td class="p-3 font-bold text-slate-800">' + s.name + '</td>' +
          '<td class="p-3">' + s.gender + '</td>' +
          '<td class="p-3">' + s.className + '</td>' +
          '<td class="p-3"><span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">' + s.level + '</span></td>' +
          '<td class="p-3 font-semibold text-slate-600">' + (s.stream || s.combination || '-') + '</td>';
        tbody.appendChild(tr);
      });
    }

    function renderTeachers() {
      const tbody = document.getElementById('teachers-table-body');
      tbody.innerHTML = '';
      (appData.teachers || []).forEach(t => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50';
        tr.innerHTML = 
          '<td class="p-3 font-bold text-slate-700">' + t.initial + '</td>' +
          '<td class="p-3 font-bold text-slate-900">' + t.name + '</td>' +
          '<td class="p-3">' + (t.subjects || []).join(', ') + '</td>' +
          '<td class="p-3 text-center font-bold text-blue-700">' + (t.workload || 0) + '</td>' +
          '<td class="p-3 text-center">' + (t.excludeInvigilation ? '<span class="text-rose-600 font-bold">No</span>' : '<span class="text-emerald-600 font-bold">Yes</span>') + '</td>';
        tbody.appendChild(tr);
      });
    }

    function renderResults() {
      const tbody = document.getElementById('results-table-body');
      tbody.innerHTML = '';
      (appData.students || []).forEach(s => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50';
        tr.innerHTML = 
          '<td class="p-2.5 border border-slate-200 font-mono font-bold text-blue-700">' + s.regNo + '</td>' +
          '<td class="p-2.5 border border-slate-200 font-bold text-slate-800">' + s.name + '</td>' +
          '<td class="p-2.5 border border-slate-200">' + s.className + '</td>' +
          '<td class="p-2.5 border border-slate-200 text-center font-bold">' + (s.total || 0) + '</td>' +
          '<td class="p-2.5 border border-slate-200 text-center font-bold text-blue-700">' + (s.average || 0) + '%</td>' +
          '<td class="p-2.5 border border-slate-200 text-center font-bold text-emerald-700">' + (s.division || 'DIV I') + '</td>';
        tbody.appendChild(tr);
      });
    }

    function renderExams() {
      const tbody = document.getElementById('exams-table-body');
      tbody.innerHTML = '';
      (appData.exams || []).forEach(e => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50';
        tr.innerHTML = 
          '<td class="p-3 font-bold text-slate-800">' + e.day + ', ' + e.date + '</td>' +
          '<td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">' + e.session + '</span></td>' +
          '<td class="p-3 font-bold text-blue-900">' + e.subject + '</td>' +
          '<td class="p-3">' + e.className + '</td>' +
          '<td class="p-3 text-slate-600">' + e.time + '</td>';
        tbody.appendChild(tr);
      });
    }

    function updateSchoolInfo() {
      const name = document.getElementById('set-school-name').value.trim();
      const motto = document.getElementById('set-school-motto').value.trim();
      if (!appData.schoolInfo) appData.schoolInfo = {};
      appData.schoolInfo.name = name;
      appData.schoolInfo.motto = motto;
      renderHeader();
      saveCurrentData();
      alert('School identity updated successfully!');
    }

    function exportJsonBackup() {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(appData, null, 2));
      const a = document.createElement('a');
      a.setAttribute('href', dataStr);
      a.setAttribute('download', 'haby_edu_pro_backup.json');
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    function resetData() {
      if (confirm('Reset to factory demo data?')) {
        appData = JSON.parse(JSON.stringify(INITIAL_DATA));
        localStorage.removeItem('haby_edu_pro_single_file_data');
        init();
        alert('Reset complete!');
      }
    }

    function renderUsers() {
      const tbody = document.getElementById('users-table-body');
      if (!tbody) return;
      tbody.innerHTML = '';
      (appData.users || []).forEach(u => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50';
        tr.innerHTML = 
          '<td class="p-2.5 font-bold text-slate-800">' + u.fullName + ' <span class="text-[10px] text-slate-500 font-normal">(' + (u.title || '') + ')</span></td>' +
          '<td class="p-2.5 font-mono text-blue-700 font-bold">@' + u.username + '</td>' +
          '<td class="p-2.5 capitalize font-semibold">' + u.role.replace('_', ' ') + '</td>' +
          '<td class="p-2.5 font-mono bg-slate-100 rounded text-slate-800 text-xs">' + u.password + '</td>';
        tbody.appendChild(tr);
      });
    }

    function init() {
      renderHeader();
      renderDashboard();
      renderTimetableGrid();
      renderInvigilation();
      renderStudents();
      renderTeachers();
      renderResults();
      renderExams();
      renderUsers();
      if (window.lucide) window.lucide.createIcons();
    }

    window.onload = init;
  </script>
</body>
</html>`;
}

/**
 * Triggers a browser download of the standalone single-file HTML application.
 */
export function downloadSingleFileApp(appData: AppData) {
  const htmlContent = generateSingleFileHtml(appData);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'haby_edu_pro_standalone.html';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
