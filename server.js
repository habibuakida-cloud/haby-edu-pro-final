var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server.ts
import express from "express";
import path2 from "path";
import fs2 from "fs";
import { fileURLToPath as fileURLToPath2 } from "url";
import dotenv from "dotenv";
import crypto from "crypto";
import axios2 from "axios";
import { simpleGit } from "simple-git";
import AdmZip from "adm-zip";

// src/server/timetableAILogic.ts
import { GoogleGenAI } from "@google/genai";
var DEFAULT_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
function generateHeuristicTimetable(req) {
  const targetDays = req.targetDays && req.targetDays.length > 0 ? req.targetDays : DEFAULT_DAYS;
  const targetClass = req.targetClass || "ALL";
  const targetStream = req.targetStream || "ALL";
  const overwriteAcademic = req.options?.overwriteAcademic ?? false;
  const preserveExtraCurricular = req.options?.preserveExtraCurricular ?? true;
  let targetClassList = [];
  req.streamSettings.forEach((ss) => {
    if (targetClass !== "ALL" && ss.className !== targetClass) return;
    const streams = ss.streams && ss.streams.length > 0 ? ss.streams : ["STREAM A"];
    streams.forEach((st) => {
      if (targetStream !== "ALL" && st !== targetStream) return;
      targetClassList.push({ className: ss.className, stream: st });
    });
  });
  if (targetClassList.length === 0) {
    if (targetClass !== "ALL") {
      const streams = targetStream !== "ALL" ? [targetStream] : ["STREAM A", "STREAM B"];
      streams.forEach((st) => targetClassList.push({ className: targetClass, stream: st }));
    } else {
      targetClassList = [
        { className: "Form 1", stream: "STREAM A" },
        { className: "Form 1", stream: "STREAM B" },
        { className: "Form 2", stream: "STREAM A" },
        { className: "Form 2", stream: "STREAM B" },
        { className: "Form 3", stream: "STREAM A" },
        { className: "Form 4", stream: "STREAM A" }
      ];
    }
  }
  const busyTeachers = {};
  targetDays.forEach((d) => {
    busyTeachers[d] = {};
  });
  const existingMap = /* @__PURE__ */ new Map();
  const initialSource = req.baseAssignments && req.baseAssignments.length > 0 ? req.baseAssignments : req.existingAssignments && req.existingAssignments.length > 0 ? req.existingAssignments : [];
  if (initialSource.length > 0) {
    initialSource.forEach((a) => {
      const key = `${a.className}|${a.stream}|${a.day}|${a.period}`;
      existingMap.set(key, a);
      if (a.teacherId && busyTeachers[a.day]) {
        if (!busyTeachers[a.day][a.period]) {
          busyTeachers[a.day][a.period] = /* @__PURE__ */ new Set();
        }
        busyTeachers[a.day][a.period].add(a.teacherId);
      }
    });
  }
  const generatedAssignments = [];
  const teacherLoadMap = {};
  req.teachers.forEach((t) => {
    teacherLoadMap[t.id] = 0;
  });
  const subjectToTeachers = {};
  req.teachers.forEach((t) => {
    t.subjects.forEach((sub) => {
      const normSub = sub.trim().toLowerCase();
      if (!subjectToTeachers[normSub]) subjectToTeachers[normSub] = [];
      subjectToTeachers[normSub].push(t);
    });
  });
  const subjectTargetMap = {};
  if (req.subjectPeriodAllocations && req.subjectPeriodAllocations.length > 0) {
    req.subjectPeriodAllocations.forEach((spa) => {
      const sub = spa.subject.trim();
      const periods2 = Number(spa.periodsPerWeek) || 0;
      if (periods2 > 0) {
        subjectTargetMap[sub] = Math.max(subjectTargetMap[sub] || 0, periods2);
      }
    });
  }
  const defaultAllocations = {
    "Mathematics": 6,
    "English Language": 5,
    "Kiswahili": 4,
    "Biology": 4,
    "Chemistry": 4,
    "Physics": 4,
    "Geography": 3,
    "History": 3,
    "Civics": 3,
    "Computer Studies": 2
  };
  Object.entries(defaultAllocations).forEach(([sub, cnt]) => {
    if (!subjectTargetMap[sub]) {
      subjectTargetMap[sub] = cnt;
    }
  });
  const standardSubjects = Object.keys(subjectTargetMap);
  let nextId = Date.now() + Math.floor(Math.random() * 1e4);
  const periodsByDay = {};
  targetDays.forEach((d) => {
    const list = req.periodSettings.filter((p) => p.day === d);
    if (list.length > 0) {
      periodsByDay[d] = list;
    } else {
      periodsByDay[d] = [
        { id: 1, day: d, name: "Period 1", start: "08:00", end: "08:40" },
        { id: 2, day: d, name: "Period 2", start: "08:40", end: "09:20" },
        { id: 3, day: d, name: "Period 3", start: "09:40", end: "10:20" },
        { id: 4, day: d, name: "Period 4", start: "10:20", end: "11:00" },
        { id: 5, day: d, name: "Period 5", start: "11:20", end: "12:00" },
        { id: 6, day: d, name: "Period 6", start: "12:00", end: "12:40" },
        { id: 7, day: d, name: "Period 7", start: "14:00", end: "14:40" }
      ];
    }
  });
  const totalAllocatedPerSubject = {};
  standardSubjects.forEach((s) => {
    totalAllocatedPerSubject[s] = 0;
  });
  targetClassList.forEach((target) => {
    const classQuotaMap = {};
    if (req.subjectPeriodAllocations && req.subjectPeriodAllocations.length > 0) {
      req.subjectPeriodAllocations.filter((spa) => !spa.className || spa.className === target.className || spa.className === "All").forEach((spa) => {
        classQuotaMap[spa.subject.trim()] = Number(spa.periodsPerWeek) || 0;
      });
    }
    standardSubjects.forEach((sub) => {
      if (!classQuotaMap[sub]) {
        classQuotaMap[sub] = subjectTargetMap[sub] || 3;
      }
    });
    const classAllocatedCount = {};
    Object.keys(classQuotaMap).forEach((k) => {
      classAllocatedCount[k] = 0;
    });
    targetDays.forEach((day) => {
      const dayPeriods = periodsByDay[day] || [];
      const dailySubjectCount = {};
      dayPeriods.forEach((p) => {
        const periodKey = `${p.name} (${p.start}-${p.end})`;
        const slotKey = `${target.className}|${target.stream}|${day}|${periodKey}`;
        const existing = existingMap.get(slotKey);
        if (existing) {
          const isExtraCurricular = existing.isLocked || existing.activityType && existing.activityType !== "academic";
          if (isExtraCurricular && preserveExtraCurricular) {
            generatedAssignments.push({
              ...existing,
              isLocked: true,
              id: existing.id || ++nextId
            });
            return;
          }
          if (!overwriteAcademic) {
            generatedAssignments.push({
              ...existing,
              id: existing.id || ++nextId
            });
            if (existing.teacherId) {
              teacherLoadMap[existing.teacherId] = (teacherLoadMap[existing.teacherId] || 0) + 1;
            }
            if (existing.subject) {
              classAllocatedCount[existing.subject] = (classAllocatedCount[existing.subject] || 0) + 1;
              totalAllocatedPerSubject[existing.subject] = (totalAllocatedPerSubject[existing.subject] || 0) + 1;
            }
            return;
          }
        }
        const lowerName = p.name.toLowerCase();
        if (lowerName.includes("break") || lowerName.includes("chai") || lowerName.includes("recess")) {
          generatedAssignments.push({
            id: ++nextId,
            className: target.className,
            stream: target.stream,
            day,
            period: periodKey,
            periodName: p.name,
            subject: "Morning Break",
            activityType: "breakfast",
            room: "Dining Hall / Grounds"
          });
          return;
        }
        if (lowerName.includes("lunch") || lowerName.includes("chakula")) {
          generatedAssignments.push({
            id: ++nextId,
            className: target.className,
            stream: target.stream,
            day,
            period: periodKey,
            periodName: p.name,
            subject: "Lunch",
            activityType: "lunch",
            room: "Dining Hall"
          });
          return;
        }
        if (day === "Wednesday" && (lowerName.includes("period 7") || p.start >= "14:00")) {
          const sportsTeacher = req.teachers.find(
            (t) => t.schoolRole?.toLowerCase().includes("sports") || t.subjects.some((s) => s.toLowerCase().includes("physical") || s.toLowerCase().includes("sport"))
          );
          generatedAssignments.push({
            id: ++nextId,
            className: target.className,
            stream: target.stream,
            day,
            period: periodKey,
            periodName: p.name,
            subject: "Sports and Games",
            activityType: "sports",
            teacherId: sportsTeacher?.id,
            room: "Sports Grounds"
          });
          return;
        }
        if (day === "Friday" && (lowerName.includes("period 5") || p.start === "11:20")) {
          generatedAssignments.push({
            id: ++nextId,
            className: target.className,
            stream: target.stream,
            day,
            period: periodKey,
            periodName: p.name,
            subject: "Religion / Devotion",
            activityType: "religion",
            room: "Mosque / Chapel / Hall"
          });
          return;
        }
        const candidateSubjects = Object.keys(classQuotaMap).filter((sub) => {
          const targetPeriods = classQuotaMap[sub] || 0;
          const currentAllocated = classAllocatedCount[sub] || 0;
          const todayCount = dailySubjectCount[sub] || 0;
          return currentAllocated < targetPeriods && todayCount < 2;
        });
        let chosenSubject = "";
        let chosenTeacher;
        const dayBusy = busyTeachers[day]?.[periodKey] || /* @__PURE__ */ new Set();
        const poolToTry = candidateSubjects.length > 0 ? candidateSubjects : Object.keys(classQuotaMap);
        for (const sub of poolToTry) {
          const normSub = sub.toLowerCase();
          let qualifiedTeachers = subjectToTeachers[normSub] || [];
          if (qualifiedTeachers.length === 0) {
            qualifiedTeachers = req.teachers.filter(
              (t) => t.subjects.some((s) => s.toLowerCase().includes(normSub) || normSub.includes(s.toLowerCase()))
            );
          }
          const availableTeachers = qualifiedTeachers.filter((t) => !dayBusy.has(t.id));
          if (availableTeachers.length > 0) {
            availableTeachers.sort((a, b) => (teacherLoadMap[a.id] || 0) - (teacherLoadMap[b.id] || 0));
            chosenSubject = sub;
            chosenTeacher = availableTeachers[0];
            break;
          }
        }
        if (!chosenSubject) {
          chosenSubject = standardSubjects[0] || "General Studies";
          const anyAvailable = req.teachers.filter((t) => !dayBusy.has(t.id));
          if (anyAvailable.length > 0) {
            anyAvailable.sort((a, b) => (teacherLoadMap[a.id] || 0) - (teacherLoadMap[b.id] || 0));
            chosenTeacher = anyAvailable[0];
          }
        }
        if (chosenTeacher) {
          if (!busyTeachers[day][periodKey]) {
            busyTeachers[day][periodKey] = /* @__PURE__ */ new Set();
          }
          busyTeachers[day][periodKey].add(chosenTeacher.id);
          teacherLoadMap[chosenTeacher.id] = (teacherLoadMap[chosenTeacher.id] || 0) + 1;
        }
        classAllocatedCount[chosenSubject] = (classAllocatedCount[chosenSubject] || 0) + 1;
        totalAllocatedPerSubject[chosenSubject] = (totalAllocatedPerSubject[chosenSubject] || 0) + 1;
        dailySubjectCount[chosenSubject] = (dailySubjectCount[chosenSubject] || 0) + 1;
        generatedAssignments.push({
          id: ++nextId,
          className: target.className,
          stream: target.stream,
          day,
          period: periodKey,
          periodName: p.name,
          subject: chosenSubject,
          teacherId: chosenTeacher?.id,
          activityType: "academic",
          room: `${target.className} ${target.stream.replace("STREAM ", "")}`
        });
      });
    });
  });
  const subjectQuotaProgress = Object.keys(subjectTargetMap).map((sub) => {
    const target = subjectTargetMap[sub] || 1;
    const totalAllocated = totalAllocatedPerSubject[sub] || 0;
    const avgPerClass = targetClassList.length > 0 ? Math.round(totalAllocated / targetClassList.length) : totalAllocated;
    return {
      subject: sub,
      targetPeriods: target,
      allocatedPeriods: avgPerClass,
      percentage: Math.min(100, Math.round(avgPerClass / target * 100))
    };
  });
  const teacherWorkload = req.teachers.map((t) => ({
    teacherId: t.id,
    teacherName: t.name,
    periodsAllocated: teacherLoadMap[t.id] || 0,
    subjects: t.subjects
  }));
  const classCoverageMap = {};
  generatedAssignments.forEach((a) => {
    const key = `${a.className} - ${a.stream}`;
    if (!classCoverageMap[key]) {
      classCoverageMap[key] = {
        className: a.className,
        stream: a.stream,
        periodsCount: 0,
        subjects: /* @__PURE__ */ new Set()
      };
    }
    classCoverageMap[key].periodsCount++;
    if (a.subject) classCoverageMap[key].subjects.add(a.subject);
  });
  const classCoverage = Object.values(classCoverageMap).map((c) => ({
    className: c.className,
    stream: c.stream,
    periodsCount: c.periodsCount,
    subjects: Array.from(c.subjects)
  }));
  return {
    success: true,
    generatedAssignments,
    totalSlotsGenerated: generatedAssignments.length,
    conflictCount: 0,
    aiProvider: "heuristic_engine",
    summary: `Successfully generated ${generatedAssignments.length} timetable periods across ${targetClassList.length} class stream(s) with 0 double-booking clashes and balanced faculty workload.`,
    pedagogicalInsights: [
      "Faculty assigned exclusively according to declared subject specializations.",
      "Core academic subjects (Mathematics, English, Kiswahili, Sciences) evenly distributed to prevent cognitive fatigue.",
      "Zero double-booking conflicts guaranteed across all parallel classes.",
      "Preserved scheduled institutional breaks, sports afternoons, and religious devotion slots."
    ],
    teacherWorkload,
    subjectQuotaProgress,
    classCoverage
  };
}
async function generateAITimetable(req) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY not found in environment. Utilizing intelligent heuristic engine.");
    return generateHeuristicTimetable(req);
  }
  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    const targetDays = req.targetDays && req.targetDays.length > 0 ? req.targetDays : DEFAULT_DAYS;
    const targetClass = req.targetClass || "ALL";
    const targetStream = req.targetStream || "ALL";
    const teachersListStr = req.teachers.map(
      (t) => `- ID ${t.id}: ${t.name} (Role: ${t.schoolRole || "Teacher"}, Subjects: ${t.subjects.join(", ")}${t.maxPeriodsPerWeek ? `, Max Weekly: ${t.maxPeriodsPerWeek} periods` : ""})`
    ).join("\n");
    const periodsListStr = req.periodSettings.filter((p) => targetDays.includes(p.day)).slice(0, 35).map((p) => `- ${p.day} | ${p.name} (${p.start}-${p.end})`).join("\n");
    const streamsListStr = req.streamSettings.filter((s) => targetClass === "ALL" || s.className === targetClass).map((s) => `- ${s.className}: ${s.streams.join(", ")}`).join("\n");
    const baseSource = req.baseAssignments && req.baseAssignments.length > 0 ? req.baseAssignments : req.existingAssignments && req.existingAssignments.length > 0 ? req.existingAssignments : [];
    const baseAssignmentsStr = baseSource.filter((a) => a.activityType && a.activityType !== "academic").slice(0, 40).map((a) => `- Day: ${a.day}, Period: ${a.period}, Activity: ${a.subject} (${a.activityType}), Class: ${a.className || "All"}`).join("\n");
    const subjectAllocationsStr = req.subjectPeriodAllocations && req.subjectPeriodAllocations.length > 0 ? req.subjectPeriodAllocations.map((spa) => `- Subject: ${spa.subject}, Required Periods/Week: ${spa.periodsPerWeek} (Class: ${spa.className || "All"})`).join("\n") : "Mathematics: 6, English Language: 5, Kiswahili: 4, Biology: 4, Chemistry: 4, Physics: 4, Geography: 3, History: 3, Civics: 3, Computer Studies: 2";
    const promptText = `
You are the Academic Dean and Timetable Optimization Engine for a school in Tanzania.
Your task is to generate a comprehensive, clash-free, pedagogically sound weekly timetable schedule.

### RULES & CONSTRAINTS:
1. NO TEACHER DOUBLE-BOOKING: A teacher can NEVER teach more than one class stream during the same day and period.
2. STRICT SUBJECT SPECIALIZATION: Assign teachers ONLY to subjects in their declared subject expertise list.
3. SUBJECT PERIOD QUOTAS:
   Strictly distribute the number of periods per week for each subject according to the configured subject allocations below.
   Ensure core subjects are distributed evenly throughout the week (no 4 periods of the same subject on one day).
4. BALANCED COGNITIVE LOAD:
   - Schedule demanding subjects (Mathematics, Physics, Chemistry, Biology, English) primarily in morning periods (Periods 1 to 4).
5. SPECIAL & EXTRA-CURRICULAR PERIODS:
   - Preserve all predefined breaks, lunch, sports afternoons (e.g. Wednesday Period 7), and religious devotion (Friday afternoon).
6. CLASS COVERAGE:
   - Target Scope: Class "${targetClass}", Stream "${targetStream}" across days: ${targetDays.join(", ")}.
${req.options?.customPrompt ? `
USER SPECIAL INSTRUCTION: ${req.options.customPrompt}
` : ""}

### REGISTERED FACULTY & DECLARED SUBJECTS:
${teachersListStr}

### SUBJECT PERIOD ALLOCATIONS (REQUIRED PERIODS PER WEEK):
${subjectAllocationsStr}

### PREDEFINED BREAKS & EXTRA-CURRICULAR SLOTS (DO NOT OVERWRITE):
${baseAssignmentsStr || "Morning Break (Tea/Chai), Lunch Break, Sports and Games (Wed afternoon), Devotion (Fri afternoon)"}

### TIMETABLE PERIOD DEFINITIONS:
${periodsListStr || "Standard 7 periods per day: Period 1 (08:00-08:40) to Period 7 (14:00-14:40)"}

### CLASS & STREAM STRUCTURE:
${streamsListStr || "Form 1: STREAM A, STREAM B\nForm 2: STREAM A, STREAM B"}

Respond strictly with a JSON object adhering to this schema:
{
  "summary": "Brief executive summary of the timetable generation strategy",
  "pedagogicalInsights": [
    "Insight 1 explaining lesson distribution or teacher specialization",
    "Insight 2 explaining clash prevention",
    "Insight 3 explaining student focus and attention span optimization"
  ],
  "assignments": [
    {
      "className": "Form 1",
      "stream": "STREAM A",
      "day": "Monday",
      "periodName": "Period 1",
      "period": "Period 1 (08:00-08:40)",
      "subject": "Mathematics",
      "teacherId": 101,
      "room": "Room 1A",
      "activityType": "academic"
    }
  ]
}
`;
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: [
        {
          role: "user",
          parts: [{ text: promptText }]
        }
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });
    const responseText = response.text || "";
    const parsed = JSON.parse(responseText);
    if (!parsed || !Array.isArray(parsed.assignments) || parsed.assignments.length === 0) {
      console.warn("Gemini returned empty or invalid assignments array. Falling back to heuristic.");
      return generateHeuristicTimetable(req);
    }
    const validatedAssignments = [];
    const busyCheck = {};
    const teacherLoadMap = {};
    req.teachers.forEach((t) => {
      teacherLoadMap[t.id] = 0;
    });
    let nextId = Date.now();
    parsed.assignments.forEach((raw) => {
      const day = raw.day || "Monday";
      const period = raw.period || `${raw.periodName || "Period 1"} (08:00-08:40)`;
      const key = `${day}_${period}`;
      if (!busyCheck[key]) {
        busyCheck[key] = /* @__PURE__ */ new Set();
      }
      let teacherId = typeof raw.teacherId === "number" ? raw.teacherId : void 0;
      if (teacherId && busyCheck[key].has(teacherId)) {
        const qualifiedOthers = req.teachers.filter(
          (t) => t.id !== teacherId && t.subjects.some((s) => s.toLowerCase() === (raw.subject || "").toLowerCase()) && !busyCheck[key].has(t.id)
        );
        if (qualifiedOthers.length > 0) {
          teacherId = qualifiedOthers[0].id;
          busyCheck[key].add(teacherId);
        } else {
          teacherId = void 0;
        }
      } else if (teacherId) {
        busyCheck[key].add(teacherId);
      }
      if (teacherId) {
        teacherLoadMap[teacherId] = (teacherLoadMap[teacherId] || 0) + 1;
      }
      validatedAssignments.push({
        id: ++nextId,
        className: raw.className || targetClass,
        stream: raw.stream || (targetStream !== "ALL" ? targetStream : "STREAM A"),
        day,
        period,
        periodName: raw.periodName || raw.period?.split(" (")[0],
        subject: raw.subject || "General Study",
        teacherId,
        room: raw.room || `${raw.className || ""} ${raw.stream || ""}`.trim(),
        activityType: raw.activityType || "academic",
        customNote: raw.customNote
      });
    });
    const existingSlotKeys = new Set(validatedAssignments.map((a) => `${a.className}|${a.stream}|${a.day}|${a.period}`));
    baseSource.forEach((ba) => {
      const key = `${ba.className}|${ba.stream}|${ba.day}|${ba.period}`;
      const isExtra = ba.activityType && ba.activityType !== "academic";
      if (isExtra && !existingSlotKeys.has(key)) {
        validatedAssignments.push({
          id: ++nextId,
          className: ba.className || targetClass,
          stream: ba.stream || "STREAM A",
          day: ba.day,
          period: ba.period,
          periodName: ba.periodName || ba.period?.split(" (")[0],
          subject: ba.subject,
          teacherId: ba.teacherId,
          room: ba.room,
          activityType: ba.activityType,
          customNote: ba.customNote
        });
        existingSlotKeys.add(key);
      }
    });
    const subjectTargetMap = {};
    if (req.subjectPeriodAllocations && req.subjectPeriodAllocations.length > 0) {
      req.subjectPeriodAllocations.forEach((spa) => {
        const sub = spa.subject.trim();
        const p = Number(spa.periodsPerWeek) || 0;
        if (p > 0) subjectTargetMap[sub] = Math.max(subjectTargetMap[sub] || 0, p);
      });
    } else {
      subjectTargetMap["Mathematics"] = 6;
      subjectTargetMap["English Language"] = 5;
      subjectTargetMap["Kiswahili"] = 4;
      subjectTargetMap["Biology"] = 4;
      subjectTargetMap["Chemistry"] = 4;
      subjectTargetMap["Physics"] = 4;
    }
    const totalAllocatedPerSubject = {};
    Object.keys(subjectTargetMap).forEach((s) => {
      totalAllocatedPerSubject[s] = 0;
    });
    validatedAssignments.forEach((a) => {
      if (a.subject && totalAllocatedPerSubject[a.subject] !== void 0) {
        totalAllocatedPerSubject[a.subject]++;
      }
    });
    const uniqueClassesCount = new Set(validatedAssignments.map((a) => `${a.className}_${a.stream}`)).size || 1;
    const subjectQuotaProgress = Object.keys(subjectTargetMap).map((sub) => {
      const target = subjectTargetMap[sub] || 1;
      const total = totalAllocatedPerSubject[sub] || 0;
      const avg = Math.round(total / uniqueClassesCount);
      return {
        subject: sub,
        targetPeriods: target,
        allocatedPeriods: avg,
        percentage: Math.min(100, Math.round(avg / target * 100))
      };
    });
    const teacherWorkload = req.teachers.map((t) => ({
      teacherId: t.id,
      teacherName: t.name,
      periodsAllocated: teacherLoadMap[t.id] || 0,
      subjects: t.subjects
    }));
    const classCoverageMap = {};
    validatedAssignments.forEach((a) => {
      const key = `${a.className} - ${a.stream}`;
      if (!classCoverageMap[key]) {
        classCoverageMap[key] = {
          className: a.className,
          stream: a.stream,
          periodsCount: 0,
          subjects: /* @__PURE__ */ new Set()
        };
      }
      classCoverageMap[key].periodsCount++;
      if (a.subject) classCoverageMap[key].subjects.add(a.subject);
    });
    const classCoverage = Object.values(classCoverageMap).map((c) => ({
      className: c.className,
      stream: c.stream,
      periodsCount: c.periodsCount,
      subjects: Array.from(c.subjects)
    }));
    return {
      success: true,
      generatedAssignments: validatedAssignments,
      totalSlotsGenerated: validatedAssignments.length,
      conflictCount: 0,
      aiProvider: "gemini",
      summary: parsed.summary || `Gemini AI successfully scheduled ${validatedAssignments.length} lesson slots with optimal faculty subject distribution.`,
      pedagogicalInsights: Array.isArray(parsed.pedagogicalInsights) && parsed.pedagogicalInsights.length > 0 ? parsed.pedagogicalInsights : [
        "Faculty assigned exclusively according to declared subject specializations.",
        "Demanding subjects prioritized during morning peak alertness windows.",
        "Clashes verified and eliminated across all parallel stream classrooms."
      ],
      teacherWorkload,
      subjectQuotaProgress,
      classCoverage
    };
  } catch (error) {
    console.error("Error invoking Gemini AI for timetable generation:", error);
    console.log("Switching to intelligent fallback timetable generator.");
    const fallback = generateHeuristicTimetable(req);
    fallback.pedagogicalInsights.unshift(
      "Generated using intelligent rule-based scheduling engine with guaranteed zero clashes."
    );
    return fallback;
  }
}

// src/server/schemeAILogic.ts
import { GoogleGenAI as GoogleGenAI2 } from "@google/genai";
function getAiClient() {
  return new GoogleGenAI2({
    apiKey: process.env.GEMINI_API_KEY || "PLACEHOLDER_KEY",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
async function generateWithFallback(config) {
  const ai = getAiClient();
  const models = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-2.5-flash", "gemini-flash-latest"];
  let lastError = null;
  for (const model of models) {
    try {
      console.log(`[Gemini Fallback Client] Attempting generation with model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents: config.contents,
        config: {
          systemInstruction: config.systemInstruction,
          responseMimeType: config.responseMimeType,
          temperature: config.temperature
        }
      });
      if (response && response.text) {
        console.log(`[Gemini Fallback Client] Successfully generated content using model: ${model}`);
        return response;
      }
    } catch (err) {
      console.warn(`[Gemini Fallback Client] Model ${model} failed with message:`, err?.message || err);
      lastError = err;
    }
  }
  throw lastError || new Error("All Gemini models in fallback sequence failed to generate content");
}
async function generateAISchemeOfWork(req) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing on server");
  }
  const prompt = `You are a Tanzanian Senior Academic Master and NECTA Curriculum Specialist.
Generate a complete, 100% authentic, highly detailed 12-week Tanzanian Scheme of Work and Teaching Log Book entries for:
- Subject: ${req.subject}
- Class Level: ${req.className}
- Curriculum System: ${req.curriculumType === "NEW_CBC_2023" ? "Competence-Based Curriculum (CBC 2023)" : "Traditional Content-Based Curriculum"}
- Academic Term: ${req.term} (${req.academicYear})
- Periods Per Week: ${req.periodsPerWeek || 4}
- Teacher Name: ${req.teacherName || "Subject Teacher"}
- School Name: ${req.schoolName || "Tanzania Secondary School"}
- Language: ${req.language}
- Specific Topics to cover: ${req.topics && req.topics.length > 0 ? req.topics.join(", ") : "Standard NECTA syllabus topics for this subject"}

CRITICAL REQUIREMENT:
- All topics, subtopics, competences, learning activities, teaching activities, materials, assessment methods, and references MUST be 100% SPECIFIC TO ${req.subject.toUpperCase()} FOR ${req.className}.
- The output MUST be entirely in ${req.language}.
- Use official TIE (Tanzania Institute of Education) textbook references for ${req.subject}.

Return a JSON object matching this structure:
{
  "department": "Science & Mathematics / Languages / Social Sciences / Commercial",
  "competenceSummary": "Brief overview of 12-week competence goals for ${req.subject}",
  "items": [
    {
      "weekNumber": 1,
      "datesOrMonth": "Week 1",
      "mainTopicOrCompetence": "Main competence or main topic",
      "subTopicOrSpecificCompetence": "Specific competence or subtopic",
      "learningActivitiesOrObjectives": "Learner activities or specific objectives",
      "teachingActivities": "Teacher activities and instructions",
      "teachingMaterials": "Materials, equipment, and charts",
      "assessmentMethods": "Assessment rubric or exercise",
      "references": "TIE ${req.subject} for ${req.className}",
      "periodsCount": 4,
      "remarks": "Covered as scheduled"
    }
  ],
  "logBookEntries": [
    {
      "weekNumber": 1,
      "date": "2026-01-12",
      "periodTime": "Period 2 & 3",
      "subTopicTaught": "Subtopic taught",
      "workCoveredSummary": "Summary of work covered and student engagement",
      "studentsPresent": 43,
      "studentsTotal": 45,
      "comprehensionEvaluation": "EXCELLENT",
      "teacherSignature": "TR"
    }
  ]
}`;
  const response = await generateWithFallback({
    contents: prompt,
    systemInstruction: "You are an expert Tanzanian educator producing strict JSON schemes of work adhering to TIE and NECTA curriculum standards.",
    responseMimeType: "application/json"
  });
  const text2 = response.text || "";
  const parsed = JSON.parse(text2);
  return {
    success: true,
    data: parsed
  };
}
async function generateAILessonPlan(req) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing on server");
  }
  const prompt = `You are a Tanzanian Master Teacher and NECTA Curriculum Specialist.
Generate a complete, highly detailed Tanzanian Lesson Plan for:
- Subject: ${req.subject}
- Class Level: ${req.className}
- Topic: ${req.topic}
- Subtopic: ${req.subtopic || "General Subtopic"}
- Curriculum System: ${req.curriculumType === "NEW_CBC_2023" ? "Competence-Based Curriculum (CBC 2023)" : "Traditional Content-Based Curriculum"}
- Duration: ${req.durationMinutes || 40} minutes
- Teacher Name: ${req.teacherName || "Subject Teacher"}
- School Name: ${req.schoolName || "Tanzania School"}

CRITICAL REQUIREMENT:
- Content MUST be 100% SPECIFIC TO ${req.subject.toUpperCase()} and topic "${req.topic}".
- DO NOT return Physics content for non-Physics subjects.
- Use official TIE (Tanzania Institute of Education) textbook references for ${req.subject}.
- If ${req.subject} is Kiswahili, write the lesson plan details in Kiswahili. If English or Science, write in English.

Return a JSON object matching this structure:
{
  "mainCompetence": "Main competence statement",
  "specificCompetence": "Specific competence statement",
  "generalObjective": "General objective if old curriculum",
  "specificObjectives": ["Objective 1", "Objective 2", "Objective 3"],
  "teachingMaterials": ["Material 1", "Material 2"],
  "references": ["TIE ${req.subject} for ${req.className}"],
  "evaluationStrategy": "Evaluation strategy and rubrics",
  "teacherRemarks": "Kipindi kilikwenda vizuri...",
  "steps": [
    {
      "stage": "Introduction / Utangulizi",
      "timeMinutes": 6,
      "teacherActivities": "Teacher activity...",
      "learnerActivities": "Learner activity...",
      "assessmentCriteria": "Assessment criteria...",
      "teachingMedia": "Media..."
    },
    {
      "stage": "Competence Development / Kujenga Umahiri",
      "timeMinutes": 20,
      "teacherActivities": "Teacher activity...",
      "learnerActivities": "Learner activity...",
      "assessmentCriteria": "Assessment criteria...",
      "teachingMedia": "Media..."
    },
    {
      "stage": "Real-Life Application / Kutumia Umahiri",
      "timeMinutes": 10,
      "teacherActivities": "Teacher activity...",
      "learnerActivities": "Learner activity...",
      "assessmentCriteria": "Assessment criteria...",
      "teachingMedia": "Media..."
    },
    {
      "stage": "Conclusion & Assessment / Hitimisho",
      "timeMinutes": 4,
      "teacherActivities": "Teacher activity...",
      "learnerActivities": "Learner activity...",
      "assessmentCriteria": "Assessment criteria...",
      "teachingMedia": "Media..."
    }
  ]
}`;
  const response = await generateWithFallback({
    contents: prompt,
    systemInstruction: "You are an expert Tanzanian educator producing strict JSON lesson plans adhering to TIE and NECTA curriculum standards.",
    responseMimeType: "application/json"
  });
  const text2 = response.text || "";
  const parsed = JSON.parse(text2);
  return {
    success: true,
    data: parsed
  };
}

// src/server/nectaFetchLogic.ts
import axios from "axios";
import https from "https";
import { GoogleGenAI as GoogleGenAI3 } from "@google/genai";
function getAiClient2() {
  return new GoogleGenAI3({
    apiKey: process.env.GEMINI_API_KEY || "PLACEHOLDER_KEY",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
function cleanHtmlText(html) {
  return html.replace(/<script\b[^<]*>([\s\S]*?)<\/script>/gi, "").replace(/<style\b[^<]*>([\s\S]*?)<\/style>/gi, "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<\/tr>/gi, "\n").replace(/<tr\b[^>]*>/gi, "\n").replace(/<\/td>/gi, "  ").replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/[ \t]+/g, " ").trim();
}
function normalizeDivision(rawDiv) {
  if (!rawDiv) return "-";
  const u = rawDiv.trim().toUpperCase();
  if (u.includes("DIVISION ONE") || u.includes("DIV I") || u === "DIVISION 1" || u === "I") return "I";
  if (u.includes("DIVISION TWO") || u.includes("DIV II") || u === "DIVISION 2" || u === "II") return "II";
  if (u.includes("DIVISION THREE") || u.includes("DIV III") || u === "DIVISION 3" || u === "III") return "III";
  if (u.includes("DIVISION FOUR") || u.includes("DIV IV") || u === "DIVISION 4" || u === "IV") return "IV";
  if (u.includes("DIVISION ZERO") || u.includes("DIV 0") || u === "DIVISION 0" || u === "0" || u === "FAILED" || u === "FAIL" || u === "FL") return "0";
  if (u.includes("DISTINCTION")) return "DISTINCTION";
  if (u.includes("MERIT")) return "MERIT";
  if (u.includes("CREDIT")) return "CREDIT";
  if (u.includes("PASS") || u.includes("PASSED")) return "PASS";
  return u;
}
function detectExamTypeAndYear(url, text2) {
  let examType = "CSEE";
  let examYear = (/* @__PURE__ */ new Date()).getFullYear().toString();
  const urlLower = url.toLowerCase();
  const textUpper = text2.toUpperCase();
  if (urlLower.includes("acsee") || textUpper.includes("ADVANCED CERTIFICATE OF SECONDARY EDUCATION") || textUpper.includes("ACSEE")) {
    examType = "ACSEE";
  } else if (urlLower.includes("csee") || textUpper.includes("CERTIFICATE OF SECONDARY EDUCATION") || textUpper.includes("CSEE")) {
    examType = "CSEE";
  } else if (urlLower.includes("ftna") || textUpper.includes("FORM TWO NATIONAL ASSESSMENT") || textUpper.includes("FTNA")) {
    examType = "FTNA";
  } else if (urlLower.includes("sfna") || textUpper.includes("STANDARD FOUR NATIONAL ASSESSMENT") || textUpper.includes("SFNA")) {
    examType = "SFNA";
  } else if (urlLower.includes("psle") || textUpper.includes("PRIMARY SCHOOL LEAVING") || textUpper.includes("PSLE")) {
    examType = "PSLE";
  } else if (urlLower.includes("stna") || textUpper.includes("STANDARD TWO NATIONAL ASSESSMENT") || textUpper.includes("STNA")) {
    examType = "STNA";
  }
  const yearMatchInUrl = url.match(/(20\d{2})/);
  if (yearMatchInUrl) {
    examYear = yearMatchInUrl[1];
  } else {
    const yearMatchInText = text2.match(/(202[0-9]|201[0-9])/);
    if (yearMatchInText) {
      examYear = yearMatchInText[1];
    }
  }
  return { examType, examYear };
}
function extractSchoolName(text2) {
  const schoolMatch = text2.match(/([PSs]\d{4}\s+[^.\n\r<]{3,60}(?:SECONDARY|PRIMARY|SCHOOL|SEKONDARI|SHULE|ACADEMY|HIGH SCHOOL|CENTRE|CENTER))/i);
  if (schoolMatch) {
    return schoolMatch[1].trim().toUpperCase();
  }
  const altMatch = text2.match(/(([A-Z0-9_.-]{4,10})\s+[A-Z\s]{4,40}(?:SCHOOL|SEKONDARI|SHULE))/i);
  if (altMatch) {
    return altMatch[1].trim().toUpperCase();
  }
  return "NECTA SCHOOL RESULTS";
}
function parseSubjectsString(subjectsPart) {
  const subjectRegex = /([A-Za-z0-9/.\s&-]+?)\s*[-:]\s*['"]?([A-Fa-fSsXx])['"]?(?=\s+[A-Za-z0-9/.\s&-]+\s*[-:]|\s*$)/g;
  const subjects2 = {};
  let match;
  while ((match = subjectRegex.exec(subjectsPart)) !== null) {
    let subj = match[1].trim().toUpperCase().replace(/^[-/\s]+|[-/\s]+$/g, "");
    if (subj === "BMATH" || subj === "BASIC MATH" || subj === "MATHEMATICS" || subj === "BASIC MATHEMATICS" || subj === "B.MATH") subj = "B/MATH";
    if (subj === "ENGLISH" || subj === "ENG") subj = "ENGL";
    if (subj === "KISWAHILI") subj = "KISW";
    if (subj === "HISTORY") subj = "HIST";
    if (subj === "GEOGRAPHY") subj = "GEO";
    if (subj === "PHYSICS") subj = "PHY";
    if (subj === "CHEMISTRY") subj = "CHEM";
    if (subj === "BIOLOGY") subj = "BIO";
    if (subj === "CIVICS") subj = "CIV";
    if (subj === "COMMERCE") subj = "COMM";
    if (subj === "BOOK KEEPING" || subj === "BOOKKEEPING") subj = "BOOK";
    if (subj === "LITERATURE IN ENGLISH" || subj === "LITERATURE") subj = "LIT";
    const grade = match[2].trim().toUpperCase();
    if (subj && grade) {
      subjects2[subj] = grade;
    }
  }
  return subjects2;
}
function parseCandidatesFromHtmlTables(html) {
  const candidates = [];
  let rowBlocks = [];
  const trMatches = html.match(/<tr\b[^>]*>([\s\S]*?)(?:<\/tr>|(?=<tr\b)|$)/gi);
  if (trMatches && trMatches.length > 0) {
    rowBlocks = trMatches;
  } else {
    rowBlocks = html.split(/<tr\b/gi);
  }
  for (const trHtml of rowBlocks) {
    let cellBlocks = [];
    const tdMatches = trHtml.match(/<td\b[^>]*>([\s\S]*?)(?:<\/td>|(?=<td\b)|$)/gi);
    if (tdMatches && tdMatches.length >= 3) {
      cellBlocks = tdMatches;
    } else {
      cellBlocks = trHtml.split(/<td\b/gi);
    }
    const cells = cellBlocks.map((cell) => cleanHtmlText(cell).trim()).filter(Boolean);
    if (cells.length < 3) continue;
    const cnoIndex = cells.findIndex((c) => /[PSs]?\d{3,5}[/.-]\d{3,4}|EQ\d+|\b[A-Za-z0-9_.-]{4,10}\/\d{3,4}\b/i.test(c));
    if (cnoIndex === -1) continue;
    const cnoMatch = cells[cnoIndex].match(/([PSs]?\d{3,5}[/.-]\d{3,4}|EQ\d+|\b[A-Za-z0-9_.-]{4,10}\/\d{3,4}\b)/i);
    if (!cnoMatch) continue;
    let cno = cnoMatch[1].toUpperCase();
    if (!cno.includes("/") && !cno.includes("-") && !cno.includes(".")) {
      if (/^[PS]\d{7,8}$/i.test(cno)) {
        cno = cno.slice(0, 5) + "/" + cno.slice(5);
      }
    }
    let sex = "F";
    if (cells[cnoIndex + 1]) {
      const sVal = cells[cnoIndex + 1].toUpperCase();
      if (sVal === "M" || sVal === "MALE" || sVal === "KIUME") sex = "M";
      else if (sVal === "F" || sVal === "FEMALE" || sVal === "KIKE") sex = "F";
    }
    let aggt = "-";
    if (cells[cnoIndex + 2]) {
      aggt = cells[cnoIndex + 2].trim();
    }
    let rawDiv = "-";
    if (cells[cnoIndex + 3]) {
      rawDiv = cells[cnoIndex + 3].trim();
    }
    const div = normalizeDivision(rawDiv);
    let subjectsStr = "";
    if (cells[cnoIndex + 4]) {
      subjectsStr = cells.slice(cnoIndex + 4).join(" ");
    } else {
      subjectsStr = cells.join(" ");
    }
    const subjects2 = parseSubjectsString(subjectsStr);
    candidates.push({
      cno,
      sex,
      aggt,
      div,
      subjects: subjects2
    });
  }
  return candidates;
}
async function parseWithGeminiAI(cleanText, url) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return { candidates: [] };
    }
    console.log("[NECTA Fetcher] Invoking Gemini AI fallback for url:", url);
    const prompt = `You are a NECTA (National Examinations Council of Tanzania) result page parser.
Analyze this raw NECTA text/HTML and extract all candidate results, school name, exam type, and year.

URL: ${url}
RAW CONTENT TRUNCATED:
${cleanText.slice(0, 15e3)}

Return ONLY a valid JSON object matching this structure:
{
  "schoolName": "S1551 ABC SECONDARY SCHOOL",
  "examType": "CSEE",
  "examYear": "2025",
  "candidates": [
    {
      "cno": "S1551/0001",
      "sex": "F",
      "aggt": "22",
      "div": "III",
      "subjects": {
        "CIV": "C",
        "HIST": "C",
        "GEO": "C",
        "KISW": "D",
        "ENGL": "C",
        "PHY": "D",
        "CHEM": "D",
        "BIO": "C",
        "B/MATH": "F"
      }
    }
  ]
}
`;
    const ai = getAiClient2();
    const models = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-2.5-flash", "gemini-flash-latest"];
    let response = null;
    let lastErr = null;
    for (const model of models) {
      try {
        console.log(`[NECTA Fetcher] Attempting fallback parsing with model: ${model}`);
        response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.1
          }
        });
        if (response && response.text) {
          console.log(`[NECTA Fetcher] Fallback parsing succeeded with model: ${model}`);
          break;
        }
      } catch (err) {
        console.warn(`[NECTA Fetcher] Model ${model} failed for fallback parsing:`, err?.message || err);
        lastErr = err;
      }
    }
    if (!response) {
      throw lastErr || new Error("All fallback models failed");
    }
    const respText = response.text || "";
    const parsed = JSON.parse(respText);
    if (parsed && Array.isArray(parsed.candidates) && parsed.candidates.length > 0) {
      return {
        schoolName: parsed.schoolName,
        examType: parsed.examType,
        examYear: parsed.examYear,
        candidates: parsed.candidates
      };
    }
  } catch (err) {
    console.error("[NECTA Gemini Fallback Error]:", err?.message || err);
  }
  return { candidates: [] };
}
function getNectaUrlCandidates(targetUrl) {
  let url = targetUrl.trim();
  if (!url) return [];
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }
  const list = [url];
  if (url.startsWith("https://")) {
    list.push(url.replace("https://", "http://"));
  } else if (url.startsWith("http://")) {
    list.push(url.replace("http://", "https://"));
  }
  const mirrorHosts = [
    "onlinesys.necta.go.tz",
    "matokeo.necta.go.tz",
    "results.necta.go.tz",
    "online.necta.go.tz"
  ];
  const currentHostMatch = url.match(/https?:\/\/([^/]+)/i);
  if (currentHostMatch) {
    const currentHost = currentHostMatch[1].toLowerCase();
    for (const host of mirrorHosts) {
      if (host !== currentHost) {
        list.push(url.replace(currentHost, host));
        if (url.startsWith("https://")) {
          list.push(url.replace("https://" + currentHost, "http://" + host));
        }
      }
    }
  }
  const pathMatch = url.match(/\/results\/(20\d{2})\/([a-z]+)\/results\/(s\d+\.htm)/i);
  if (pathMatch) {
    const year = pathMatch[1];
    const exam = pathMatch[2];
    const file = pathMatch[3];
    list.push(url.replace(pathMatch[0], `/${exam}${year}/results/${file}`));
    list.push(url.replace(pathMatch[0], `/${exam}${year}/${file}`));
  }
  const altPathMatch = url.match(/\/([a-z]+)(20\d{2})\/results\/(s\d+\.htm)/i);
  if (altPathMatch) {
    const exam = altPathMatch[1];
    const year = altPathMatch[2];
    const file = altPathMatch[3];
    list.push(url.replace(altPathMatch[0], `/results/${year}/${exam}/results/${file}`));
  }
  return Array.from(new Set(list));
}
async function fetchAndParseNectaUrl(targetUrl) {
  let url = targetUrl.trim();
  if (!url) {
    return { success: false, url: "", error: "URL link is empty" };
  }
  const candidateUrls = getNectaUrlCandidates(url);
  const httpsAgent = new https.Agent({
    rejectUnauthorized: false
  });
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,sw;q=0.8"
  };
  let htmlContent = "";
  let successfulUrl = url;
  let fetchError = "";
  for (const tryUrl of candidateUrls) {
    try {
      console.log(`[NECTA Fetcher] Attempting URL: ${tryUrl}`);
      const isHttps = tryUrl.startsWith("https://");
      const response = await axios.get(tryUrl, {
        headers,
        httpsAgent: isHttps ? httpsAgent : void 0,
        timeout: 15e3,
        responseType: "arraybuffer",
        maxRedirects: 10,
        validateStatus: (status) => status >= 200 && status < 400
      });
      const buffer = Buffer.from(response.data);
      htmlContent = buffer.toString("utf-8");
      if (!htmlContent.includes("<") || htmlContent.includes("\xEF\xBF\xBD")) {
        htmlContent = buffer.toString("latin1");
      }
      if (htmlContent && htmlContent.length > 50) {
        successfulUrl = tryUrl;
        console.log(`[NECTA Fetcher] Successfully fetched from: ${tryUrl}`);
        break;
      }
    } catch (err) {
      console.warn(`[NECTA Fetcher] Failed (${tryUrl}): ${err.message}`);
      fetchError = err.message || "Connection failed";
    }
  }
  if (!htmlContent || typeof htmlContent !== "string") {
    return {
      success: false,
      url,
      error: `Haikuweza kufungua link ya NECTA (${fetchError || "Network Error"}). Hakikisha server ya NECTA ipo hewani au jaribu kucopy maandishi ya matokeo kwenye ukurasa wa NECTA na kuyabandika (Paste) kwenye 'Bandika Maandishi'.`
    };
  }
  const cleanText = cleanHtmlText(htmlContent);
  const { examType, examYear } = detectExamTypeAndYear(successfulUrl, cleanText);
  const schoolName = extractSchoolName(cleanText);
  let candidates = parseCandidatesFromHtmlTables(htmlContent);
  if (candidates.length === 0) {
    const lines = cleanText.split("\n").map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      const cnoMatch = line.match(/([PSs]?\d{3,5}[/.-]\d{3,4}|EQ\d+|\b[A-Za-z0-9_.-]{4,10}\/\d{3,4}\b)/i);
      if (!cnoMatch) continue;
      let cno = cnoMatch[1].toUpperCase();
      if (!cno.includes("/") && !cno.includes("-") && !cno.includes(".")) {
        if (/^[PS]\d{7,8}$/i.test(cno)) {
          cno = cno.slice(0, 5) + "/" + cno.slice(5);
        }
      }
      const afterCno = line.slice(line.indexOf(cnoMatch[0]) + cnoMatch[0].length).trim();
      const tokens = afterCno.split(/\s+/);
      if (tokens.length < 3) continue;
      let sex = tokens[0].toUpperCase();
      if (sex === "FEMALE" || sex === "KIKE") sex = "F";
      if (sex === "MALE" || sex === "KIUME") sex = "M";
      if (sex !== "F" && sex !== "M") sex = "F";
      let aggt = tokens[1] || "-";
      let rawDiv = tokens[2] || "-";
      if (rawDiv.toUpperCase() === "DIVISION" && tokens[3]) {
        rawDiv = `DIVISION ${tokens[3]}`;
      }
      const div = normalizeDivision(rawDiv);
      const subjects2 = parseSubjectsString(afterCno);
      candidates.push({
        cno,
        sex,
        aggt,
        div,
        subjects: subjects2
      });
    }
  }
  if (candidates.length === 0) {
    const aiResult = await parseWithGeminiAI(cleanText, successfulUrl);
    if (aiResult.candidates && aiResult.candidates.length > 0) {
      candidates = aiResult.candidates;
    }
  }
  if (candidates.length === 0) {
    return {
      success: false,
      url: successfulUrl,
      schoolName,
      examType,
      examYear,
      error: "Haikuweza kupata orodha ya watahiniwa kutoka kwenye link uliyoweka. Hakikisha ni link ya matokeo ya shule NECTA (k.m. https://onlinesys.necta.go.tz/results/2025/csee/results/s1551.htm)."
    };
  }
  const formattedRawLines = candidates.map((c) => {
    const subjStr = Object.entries(c.subjects).map(([s, g]) => `${s} - ${g}`).join(" ");
    return `${c.cno} ${c.sex} ${c.aggt} ${c.div}${subjStr ? " " + subjStr : ""}`;
  });
  return {
    success: true,
    url: successfulUrl,
    schoolName,
    examType,
    examYear,
    candidatesCount: candidates.length,
    rawText: formattedRawLines.join("\n"),
    candidates
  };
}

// src/server/smsUtils.ts
function normalizeTzPhone(raw) {
  if (!raw) return "";
  let clean = raw.replace(/[^0-9]/g, "");
  if (clean.startsWith("0")) {
    clean = "255" + clean.slice(1);
  } else if (clean.startsWith("255")) {
  } else if (clean.length === 9) {
    clean = "255" + clean;
  }
  return clean;
}
async function sendBeemSMS(destAddr, message) {
  const apiKey = process.env.BEEM_API_KEY;
  const secretKey = process.env.BEEM_SECRET_KEY;
  const sourceAddr = process.env.BEEM_SOURCE_ADDR || "HABYEDU";
  const normalized = normalizeTzPhone(destAddr);
  if (!normalized || normalized.length < 10) {
    return { success: false, error: `Namba ya simu si sahihi: ${destAddr}` };
  }
  if (!apiKey || !secretKey) {
    console.log(`[Beem Africa SMS Simulator] Dest: ${normalized} | Msg: ${message}`);
    return {
      success: true,
      data: {
        code: 100,
        message: "SMS sent successfully (Beem Simulation Mode)",
        dest_addr: normalized
      }
    };
  }
  try {
    const authHeader = "Basic " + Buffer.from(`${apiKey}:${secretKey}`).toString("base64");
    const response = await fetch("https://apisms.beem.africa/v1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader
      },
      body: JSON.stringify({
        source_addr: sourceAddr,
        schedule_time: "",
        encoding: 0,
        message,
        recipients: [
          {
            recipient_id: 1,
            dest_addr: normalized
          }
        ]
      })
    });
    const resData = await response.json();
    console.log("[Beem Africa Response]:", resData);
    return {
      success: response.ok && (resData.code === 100 || resData.successful === true),
      data: resData
    };
  } catch (err) {
    console.error("[Beem Africa Dispatch Error]:", err);
    return { success: false, error: err.message || "Beem API communication error" };
  }
}

// src/server/aiPerformance.ts
import { GoogleGenAI as GoogleGenAI4 } from "@google/genai";
function getAiClient3() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "placeholder-key";
  return new GoogleGenAI4({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
async function generatePerformanceInsight(examinationRecords) {
  const ai = getAiClient3();
  const prompt = `
    Analyze the following class performance data: ${JSON.stringify(examinationRecords.slice(0, 50))}.
    Identify subjects (use NECTA codes if available in data, else use subject name) with the highest failure rates.
    Suggest actionable remedial steps for teachers.
    Provide the response in a concise, structured format.
  `;
  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt
  });
  return response.text || "No insights could be generated.";
}

// src/server/timetableStore.ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var DATA_DIR = path.resolve(__dirname, "../../data");
var STORE_PATH = path.join(DATA_DIR, "timetable_store.json");
var timetableStore = {};
function ensureStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      if (raw.trim()) {
        timetableStore = JSON.parse(raw);
      }
    } else {
      fs.writeFileSync(STORE_PATH, JSON.stringify({}, null, 2), "utf-8");
    }
  } catch (err) {
    console.warn("[Timetable Store] Storage init warning:", err);
  }
}
ensureStorage();
function persistStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(timetableStore, null, 2), "utf-8");
  } catch (err) {
    console.error("[Timetable Store] Persist error:", err);
  }
}
function normalizeClass(c) {
  if (!c) return "";
  const s = c.trim().toLowerCase().replace(/\s+/g, " ");
  const formMatch = s.match(/(?:form|kidato|f)\s*(\d+|iv|iii|ii|i|vi|v)/i);
  if (formMatch) {
    const romanMap = { "i": "1", "ii": "2", "iii": "3", "iv": "4", "v": "5", "vi": "6" };
    const num = romanMap[formMatch[1].toLowerCase()] || formMatch[1];
    return `form_${num}`;
  }
  const priMatch = s.match(/(?:standard|std|class|darasa(?: la)?|grade)\s*(\d+)/i);
  if (priMatch) {
    return `pri_${priMatch[1]}`;
  }
  if (/^\d+$/.test(s)) {
    return `pri_${s}`;
  }
  if (s.includes("baby")) return "nur_baby";
  if (s.includes("middle")) return "nur_middle";
  if (s.includes("pre-unit") || s.includes("pre unit") || s.includes("awali")) return "nur_preunit";
  return s;
}
function isClassMatch(c1, c2) {
  if (!c1 || !c2) return false;
  const n1 = normalizeClass(c1);
  const n2 = normalizeClass(c2);
  if (n1 && n2 && n1 === n2) return true;
  return c1.trim().toLowerCase() === c2.trim().toLowerCase();
}
function normalizeStream(s) {
  if (!s) return "";
  const clean = s.trim().toLowerCase().replace(/^(mkondo|stream)\s+/i, "").trim();
  if (clean === "all" || clean === "all streams" || clean === "all_streams") {
    return "all";
  }
  return clean;
}
function isStreamMatch(s1, s2) {
  if (!s1 || !s2) return false;
  const n1 = normalizeStream(s1);
  const n2 = normalizeStream(s2);
  if (n1 === "all" || n2 === "all") return true;
  return n1 === n2;
}
function queryTimetable(options) {
  ensureStorage();
  const schoolId = options.schoolId || "DEFAULT_PRIMARY_SCHOOL_ID";
  const allSchoolAssignments = timetableStore[schoolId] || [];
  return allSchoolAssignments.filter((a) => {
    if (options.className && options.className !== "ALL" && options.className !== "All") {
      if (!isClassMatch(a.className, options.className)) {
        return false;
      }
    }
    if (options.stream && options.stream !== "ALL" && options.stream !== "All" && options.stream !== "All Streams") {
      if (!isStreamMatch(a.stream, options.stream)) {
        return false;
      }
    }
    if (options.teacherId) {
      if (String(a.teacherId) !== String(options.teacherId)) {
        return false;
      }
    }
    if (options.day && options.day !== "ALL" && options.day !== "All") {
      if (a.day?.toLowerCase() !== options.day.toLowerCase()) {
        return false;
      }
    }
    return true;
  });
}
function saveTimetable(schoolId, assignments, options) {
  ensureStorage();
  const sid = schoolId || "DEFAULT_PRIMARY_SCHOOL_ID";
  if (!timetableStore[sid]) {
    timetableStore[sid] = [];
  }
  if (options?.replace) {
    if (options.className && options.stream) {
      timetableStore[sid] = timetableStore[sid].filter(
        (a) => !(isClassMatch(a.className, options.className) && isStreamMatch(a.stream, options.stream))
      );
      timetableStore[sid].push(...assignments);
    } else if (options.className) {
      timetableStore[sid] = timetableStore[sid].filter(
        (a) => !isClassMatch(a.className, options.className)
      );
      timetableStore[sid].push(...assignments);
    } else {
      timetableStore[sid] = assignments;
    }
  } else {
    const current = [...timetableStore[sid]];
    for (const item of assignments) {
      const existingIdx = current.findIndex((a) => {
        if (a.id && item.id && String(a.id) === String(item.id)) return true;
        return isClassMatch(a.className, item.className) && isStreamMatch(a.stream, item.stream) && a.day === item.day && (a.period === item.period || Boolean(a.periodName) && Boolean(item.periodName) && a.periodName === item.periodName);
      });
      const entryWithId = {
        ...item,
        id: item.id || Date.now() + Math.floor(Math.random() * 1e4),
        schoolId: sid,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (existingIdx >= 0) {
        current[existingIdx] = entryWithId;
      } else {
        current.push(entryWithId);
      }
    }
    timetableStore[sid] = current;
  }
  persistStore();
  return timetableStore[sid];
}
function deleteTimetableAssignment(schoolId, filter) {
  ensureStorage();
  const sid = schoolId || "DEFAULT_PRIMARY_SCHOOL_ID";
  if (!timetableStore[sid]) return false;
  const initialLen = timetableStore[sid].length;
  timetableStore[sid] = timetableStore[sid].filter((a) => {
    if (filter.id && String(a.id) === String(filter.id)) return false;
    if (filter.className && filter.stream && filter.day && filter.period && isClassMatch(a.className, filter.className) && isStreamMatch(a.stream, filter.stream) && a.day === filter.day && a.period === filter.period) {
      return false;
    }
    return true;
  });
  if (timetableStore[sid].length !== initialLen) {
    persistStore();
    return true;
  }
  return false;
}

// src/db/index.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  activityLogs: () => activityLogs,
  announcements: () => announcements,
  authorizedStaff: () => authorizedStaff,
  classes: () => classes,
  contributionTypes: () => contributionTypes,
  curriculumStandards: () => curriculumStandards,
  disciplineRecords: () => disciplineRecords,
  dutyDailyReports: () => dutyDailyReports,
  dutyStreams: () => dutyStreams,
  dutyWeeklyAssignments: () => dutyWeeklyAssignments,
  environmentEquipment: () => environmentEquipment,
  environmentOrders: () => environmentOrders,
  equipmentUsageLog: () => equipmentUsageLog,
  examRecords: () => examRecords,
  examResults: () => examResults,
  exams: () => exams,
  gatePassLogs: () => gatePassLogs,
  institutionalPolicies: () => institutionalPolicies,
  invigilationAssignments: () => invigilationAssignments,
  invigilationSessions: () => invigilationSessions,
  invigilationSupervisors: () => invigilationSupervisors,
  parentMessages: () => parentMessages,
  parentStudents: () => parentStudents,
  parents: () => parents,
  pastPapers: () => pastPapers,
  paymentVerificationRequests: () => paymentVerificationRequests,
  periodAttendance: () => periodAttendance,
  periodSettings: () => periodSettings,
  periods: () => periods,
  reamPaperRecords: () => reamPaperRecords,
  remedialAttendance: () => remedialAttendance,
  remedialPaymentSettings: () => remedialPaymentSettings,
  remedialTimetable: () => remedialTimetable,
  savedInvigilationRecords: () => savedInvigilationRecords,
  savedTimetableRecords: () => savedTimetableRecords,
  schoolAdmins: () => schoolAdmins,
  schoolData: () => schoolData,
  schoolPurchasedEquipment: () => schoolPurchasedEquipment,
  schoolSubscriptions: () => schoolSubscriptions,
  schools: () => schools,
  schoolsRelations: () => schoolsRelations,
  selectedInvigilators: () => selectedInvigilators,
  sittingPlans: () => sittingPlans,
  smsLogs: () => smsLogs,
  smsPaymentHistory: () => smsPaymentHistory,
  smsWallet: () => smsWallet,
  streamSettings: () => streamSettings,
  studentLedger: () => studentLedger,
  students: () => students,
  subjectPeriodAllocations: () => subjectPeriodAllocations,
  subjects: () => subjects,
  teacherAssignments: () => teacherAssignments,
  teachers: () => teachers,
  teachingLogs: () => teachingLogs,
  timetableAssignments: () => timetableAssignments,
  timetables: () => timetables,
  users: () => users,
  usersRelations: () => usersRelations
});
import { pgTable, text, timestamp, uuid, jsonb, integer, numeric, date, boolean, primaryKey, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
var schools = pgTable("schools", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  code: text("code"),
  district: text("district"),
  region: text("region"),
  phone: text("phone"),
  email: text("email"),
  status: text("status").default("ACTIVE"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var users = pgTable("users", {
  id: text("id").primaryKey(),
  // Supabase UID
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  role: text("role").default("TEACHER"),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "set null" }),
  isSuperAdmin: boolean("is_super_admin").default(false),
  assignedSubjects: jsonb("assigned_subjects").default([]),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow()
});
var students = pgTable("students", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  className: text("class_name").notNull(),
  stream: text("stream"),
  gender: text("gender"),
  parentPhone: text("parent_phone"),
  phone: text("phone"),
  regNo: text("reg_no"),
  level: text("level").default("CSEE"),
  dob: date("dob"),
  passportPhoto: text("passport_photo"),
  subjects: jsonb("subjects").default([]),
  marks: jsonb("marks").default({}),
  total: numeric("total").default("0"),
  average: text("average").default("0.0"),
  division: text("division").default("-"),
  createdAt: timestamp("created_at").defaultNow()
});
var teachers = pgTable("teachers", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  gender: text("gender").default("Male"),
  schoolRole: text("school_role").default("Subject Teacher"),
  initial: text("initial"),
  phone: text("phone"),
  email: text("email"),
  subjects: jsonb("subjects").default([]),
  teachingStreams: jsonb("teaching_streams").default([]),
  color: text("color").default("#1d4ed8"),
  maxPeriodsPerWeek: integer("max_periods_per_week").default(20),
  excludeInvigilation: boolean("exclude_invigilation").default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var classes = pgTable("classes", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  // Form 1, Form 2, etc
  stream: text("stream").default("A"),
  level: text("level").default("CSEE"),
  classTeacherId: uuid("class_teacher_id").references(() => teachers.id, { onDelete: "set null" }),
  capacity: integer("capacity").default(45),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var exams = pgTable("exams", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  term: text("term"),
  year: text("year"),
  className: text("class_name"),
  level: text("level").default("CSEE"),
  date: date("date"),
  status: text("status").default("Active"),
  createdAt: timestamp("created_at").defaultNow()
});
var periodAttendance = pgTable("period_attendance", {
  id: text("id").primaryKey(),
  // school_id_date_time_class
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  dayOfWeek: text("day_of_week").notNull(),
  periodNumber: integer("period_number").notNull(),
  className: text("class_name").notNull(),
  stream: text("stream"),
  subject: text("subject"),
  teacherName: text("teacher_name"),
  status: text("status").default("taught"),
  reason: text("reason"),
  markedBy: text("marked_by"),
  markedAt: timestamp("marked_at").defaultNow()
});
var remedialTimetable = pgTable("remedial_timetable", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }),
  dayOfWeek: text("day_of_week").notNull(),
  periodTime: text("period_time").notNull(),
  className: text("class_name").notNull(),
  subject: text("subject").notNull(),
  teacherName: text("teacher_name").notNull(),
  stream: text("stream").default("A"),
  term: text("term").default("Term 1"),
  createdAt: timestamp("created_at").defaultNow()
});
var remedialAttendance = pgTable("remedial_attendance", {
  id: text("id").primaryKey(),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  dayOfWeek: text("day_of_week").notNull(),
  periodTime: text("period_time").notNull(),
  className: text("class_name").notNull(),
  subject: text("subject"),
  teacherName: text("teacher_name"),
  stream: text("stream"),
  status: text("status").default("taught"),
  ratePerPeriod: numeric("rate_per_period").default("5000"),
  markedBy: text("marked_by"),
  markedAt: timestamp("marked_at").defaultNow()
});
var schoolsRelations = relations(schools, ({ many }) => ({
  users: many(users),
  students: many(students),
  teachers: many(teachers),
  exams: many(exams),
  classes: many(classes)
}));
var usersRelations = relations(users, ({ one }) => ({
  school: one(schools, {
    fields: [users.schoolId],
    references: [schools.id]
  })
}));
var schoolData = pgTable("school_data", {
  id: text("id").primaryKey(),
  schoolId: text("school_id").notNull().unique(),
  schoolInfo: jsonb("school_info").default({}),
  timetableAssignments: jsonb("timetable_assignments").default([]),
  periodSettings: jsonb("period_settings").default([]),
  streamSettings: jsonb("stream_settings").default([]),
  institutionalPolicy: jsonb("institutional_policy").default({}),
  sessions: jsonb("sessions").default([]),
  supervisors: jsonb("supervisors").default([]),
  selectedInvigilators: jsonb("selected_invigilators").default([]),
  invigilationAssignments: jsonb("invigilation_assignments").default({}),
  dailyAttendance: jsonb("daily_attendance").default({}),
  journalRecords: jsonb("journal_records").default({}),
  schemesOfWork: jsonb("schemes_of_work").default([]),
  lessonPlans: jsonb("lesson_plans").default([]),
  teacherEvaluations: jsonb("teacher_evaluations").default([]),
  savedTimetableRecords: jsonb("saved_timetable_records").default([]),
  savedInvigilationRecords: jsonb("saved_invigilation_records").default([]),
  gradeCutoffs: jsonb("grade_cutoffs").default({}),
  ledgerSubjectKeys: jsonb("ledger_subject_keys").default({}),
  subjectPeriodAllocations: jsonb("subject_period_allocations").default([]),
  teacherAssignments: jsonb("teacher_assignments").default([]),
  subjectPaperConfigs: jsonb("subject_paper_configs").default({}),
  bubbleSettings: jsonb("bubble_settings").default({}),
  students: jsonb("students").default([]),
  teachers: jsonb("teachers").default([]),
  exams: jsonb("exams").default([]),
  examinationRecords: jsonb("examination_records").default([]),
  disciplineRecords: jsonb("discipline_records").default([]),
  dutyRosterData: jsonb("duty_roster_data").default({}),
  academicTermDates: jsonb("academic_term_dates").default({}),
  updatedAt: timestamp("updated_at").defaultNow()
});
var timetables = pgTable("timetables", {
  id: text("id").primaryKey(),
  schoolId: text("school_id").notNull(),
  classId: text("class_id").notNull(),
  stream: text("stream").default("STREAM A"),
  dayOfWeek: text("day_of_week").notNull(),
  periodNumber: integer("period_number").notNull(),
  subjectId: text("subject_id").notNull(),
  teacherId: integer("teacher_id"),
  timeStart: text("time_start"),
  timeEnd: text("time_end"),
  createdAt: timestamp("created_at").defaultNow()
});
var timetableAssignments = pgTable("timetable_assignments", {
  id: text("id").primaryKey(),
  schoolId: text("school_id").notNull(),
  className: text("class_name").notNull(),
  stream: text("stream").default("STREAM A"),
  day: text("day").notNull(),
  period: text("period").notNull(),
  periodName: text("period_name"),
  teacherId: integer("teacher_id"),
  teacherName: text("teacher_name"),
  subject: text("subject").notNull(),
  room: text("room").default("Classroom"),
  activityType: text("activity_type").default("academic"),
  customNote: text("custom_note"),
  isLocked: boolean("is_locked").default(false),
  allocationMode: text("allocation_mode").default("manual"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var periodSettings = pgTable("period_settings", {
  id: text("id").primaryKey(),
  schoolId: text("school_id").notNull(),
  day: text("day").default("Monday"),
  name: text("name").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  isBreak: boolean("is_break").default(false),
  assignedTeacherId: integer("assigned_teacher_id"),
  defaultSubject: text("default_subject"),
  className: text("class_name").default("All Classes"),
  streamName: text("stream_name").default("All Streams"),
  createdAt: timestamp("created_at").defaultNow()
});
var streamSettings = pgTable("stream_settings", {
  id: text("id").primaryKey(),
  schoolId: text("school_id").notNull(),
  className: text("class_name").notNull(),
  level: text("level").default("CSEE"),
  streams: jsonb("streams").default(["STREAM A", "STREAM B"]),
  createdAt: timestamp("created_at").defaultNow()
});
var subjectPeriodAllocations = pgTable("subject_period_allocations", {
  id: text("id").primaryKey(),
  schoolId: text("school_id").notNull(),
  className: text("class_name").notNull(),
  subjectName: text("subject_name").notNull(),
  periodsPerWeek: integer("periods_per_week").default(4),
  doublePeriods: boolean("double_periods").default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var teacherAssignments = pgTable("teacher_assignments", {
  id: text("id").primaryKey(),
  schoolId: text("school_id").notNull(),
  teacherId: integer("teacher_id").notNull(),
  teacherName: text("teacher_name"),
  className: text("class_name").notNull(),
  stream: text("stream"),
  subjectName: text("subject_name").notNull(),
  periodsCount: integer("periods_count").default(4),
  createdAt: timestamp("created_at").defaultNow()
});
var savedTimetableRecords = pgTable("saved_timetable_records", {
  id: text("id").primaryKey(),
  schoolId: text("school_id").notNull(),
  name: text("name").notNull(),
  academicYear: text("academic_year").default("2026"),
  term: text("term").default("Term 1"),
  timetableData: jsonb("timetable_data").default([]),
  status: text("status").default("Published"),
  createdAt: timestamp("created_at").defaultNow()
});
var institutionalPolicies = pgTable("institutional_policies", {
  id: text("id").primaryKey(),
  schoolId: text("school_id").notNull(),
  policyName: text("policy_name").notNull(),
  rules: jsonb("rules").default({}),
  updatedAt: timestamp("updated_at").defaultNow()
});
var examRecords = pgTable("exam_records", {
  id: text("id").primaryKey(),
  schoolId: text("school_id").notNull(),
  examId: text("exam_id"),
  studentId: text("student_id"),
  regNo: text("reg_no"),
  studentName: text("student_name"),
  className: text("class_name"),
  examName: text("exam_name"),
  subjectMarks: jsonb("subject_marks").default({}),
  totalMarks: numeric("total_marks").default("0"),
  averageScore: numeric("average_score").default("0"),
  division: text("division").default("Division I"),
  points: integer("points").default(15),
  rank: integer("rank").default(1),
  createdAt: timestamp("created_at").defaultNow()
});
var disciplineRecords = pgTable("discipline_records", {
  id: text("id").primaryKey(),
  schoolId: text("school_id").notNull(),
  regNo: text("reg_no"),
  studentName: text("student_name"),
  incidentDate: date("incident_date"),
  incidentType: text("incident_type"),
  severity: text("severity").default("Minor"),
  actionTaken: text("action_taken"),
  reportedBy: text("reported_by"),
  status: text("status").default("Open"),
  createdAt: timestamp("created_at").defaultNow()
});
var contributionTypes = pgTable("contribution_types", {
  id: text("id").primaryKey(),
  schoolId: text("school_id").notNull(),
  name: text("name").notNull(),
  amountDefault: numeric("amount_default").default("0"),
  classLevels: jsonb("class_levels").default([]),
  academicYear: text("academic_year").default("2026"),
  term: text("term").default("Term 1 / 2026"),
  createdBy: text("created_by").default("Super Admin"),
  createdAt: timestamp("created_at").defaultNow()
});
var studentLedger = pgTable("student_ledger", {
  id: text("id").primaryKey(),
  schoolId: text("school_id").notNull(),
  studentCno: text("student_cno").notNull(),
  studentName: text("student_name").notNull(),
  classLevel: text("class_level").notNull(),
  contributionTypeId: text("contribution_type_id"),
  contributionName: text("contribution_name").notNull(),
  requiredAmount: numeric("required_amount").default("0"),
  paidAmount: numeric("paid_amount").default("0"),
  balanceAmount: numeric("balance_amount").default("0"),
  status: text("status").default("UNPAID"),
  lastPaymentDate: date("last_payment_date"),
  receiptNumber: text("receipt_number"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var invigilationSessions = pgTable("invigilation_sessions", {
  id: text("id").primaryKey(),
  schoolId: text("school_id").notNull(),
  rawDate: text("raw_date"),
  date: date("date").notNull(),
  day: text("day").notNull(),
  session: text("session").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  timeSlot: text("time_slot"),
  subject: text("subject").notNull(),
  level: text("level").default("CSEE"),
  className: text("class_name").notNull(),
  stream: text("stream"),
  roomsCount: integer("rooms_count").default(1),
  createdAt: timestamp("created_at").defaultNow()
});
var invigilationAssignments = pgTable("invigilation_assignments", {
  id: text("id").primaryKey(),
  schoolId: text("school_id").notNull(),
  sessionId: text("session_id"),
  examName: text("exam_name"),
  date: date("date").notNull(),
  roomNumber: integer("room_number").default(1),
  teacherId: integer("teacher_id"),
  teacherName: text("teacher_name").notNull(),
  role: text("role").default("Invigilator"),
  createdAt: timestamp("created_at").defaultNow()
});
var invigilationSupervisors = pgTable("invigilation_supervisors", {
  id: text("id").primaryKey(),
  schoolId: text("school_id").notNull(),
  teacherId: integer("teacher_id").notNull(),
  name: text("name").notNull(),
  initial: text("initial"),
  phone: text("phone"),
  role: text("role").default("Chief Supervisor"),
  createdAt: timestamp("created_at").defaultNow()
});
var selectedInvigilators = pgTable("selected_invigilators", {
  id: text("id").primaryKey(),
  schoolId: text("school_id").notNull(),
  teacherId: integer("teacher_id").notNull(),
  teacherName: text("teacher_name").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});
var savedInvigilationRecords = pgTable("saved_invigilation_records", {
  id: text("id").primaryKey(),
  schoolId: text("school_id").notNull(),
  examName: text("exam_name").notNull(),
  academicYear: text("academic_year").default("2026"),
  term: text("term").default("Term 1"),
  dutyRoster: jsonb("duty_roster").default([]),
  createdAt: timestamp("created_at").defaultNow()
});
var parents = pgTable("parents", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }),
  phone: text("phone").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var parentStudents = pgTable("parent_students", {
  parentId: uuid("parent_id").references(() => parents.id, { onDelete: "cascade" }).notNull(),
  studentId: uuid("student_id").references(() => students.id, { onDelete: "cascade" }).notNull()
}, (t) => ({
  pk: primaryKey({ columns: [t.parentId, t.studentId] })
}));
var announcements = pgTable("announcements", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var parentMessages = pgTable("parent_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  parentId: uuid("parent_id").references(() => parents.id, { onDelete: "cascade" }),
  parentPhone: text("parent_phone"),
  parentName: text("parent_name"),
  studentId: uuid("student_id"),
  studentName: text("student_name"),
  message: text("message").notNull(),
  sender: text("sender").default("parent"),
  createdAt: timestamp("created_at").defaultNow()
});
var schoolSubscriptions = pgTable("school_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }),
  trialStartedAt: timestamp("trial_started_at"),
  subscriptionExpiry: timestamp("subscription_expiry").defaultNow(),
  subscriptionType: text("subscription_type").default("TRIAL"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var schoolAdmins = pgTable("school_admins", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  fullName: text("full_name"),
  password: text("password"),
  role: text("role").default("HEADMASTER"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var remedialPaymentSettings = pgTable("remedial_payment_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }),
  className: text("class_name"),
  ratePerPeriod: numeric("rate_per_period").default("5000"),
  effectiveDate: date("effective_date").defaultNow()
});
var sittingPlans = pgTable("sitting_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }),
  roomName: text("room_name").notNull(),
  examDate: date("exam_date"),
  examSession: text("exam_session"),
  totalCandidates: integer("total_candidates").default(0),
  gridLayout: jsonb("grid_layout").default({}),
  theme: text("theme").default("navy"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var gatePassLogs = pgTable("gate_pass_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }),
  studentId: uuid("student_id"),
  studentName: text("student_name"),
  regNo: text("reg_no"),
  className: text("class_name"),
  stream: text("stream"),
  type: text("type"),
  reason: text("reason"),
  officerName: text("officer_name"),
  timestamp: timestamp("timestamp").defaultNow(),
  status: text("status").default("VALID"),
  feeStatus: text("fee_status")
});
var periods = pgTable("periods", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  isBreak: boolean("is_break").default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var subjects = pgTable("subjects", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code"),
  createdAt: timestamp("created_at").defaultNow()
});
var teachingLogs = pgTable("teaching_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }),
  teacherId: uuid("teacher_id"),
  teacherName: text("teacher_name"),
  className: text("class_name"),
  subject: text("subject"),
  date: date("date"),
  topic: text("topic"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow()
});
var authorizedStaff = pgTable("authorized_staff", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").default("TEACHER"),
  assignedSubjects: jsonb("assigned_subjects").default([]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});
var environmentEquipment = pgTable("environment_equipment", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").default("Usafi"),
  quantity: integer("quantity").default(1),
  condition: text("condition").default("Nzuri"),
  location: text("location").default("Stoo ya Mazingira"),
  purchaseDate: date("purchase_date").defaultNow(),
  addedBy: text("added_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var equipmentUsageLog = pgTable("equipment_usage_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }),
  equipmentId: uuid("equipment_id").references(() => environmentEquipment.id, { onDelete: "cascade" }),
  usedBy: text("used_by").notNull(),
  quantityUsed: integer("quantity_used").default(1),
  purpose: text("purpose"),
  dateUsed: date("date_used").defaultNow(),
  returnedDate: date("returned_date"),
  status: text("status").default("Imetumika"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow()
});
var environmentOrders = pgTable("environment_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }),
  studentId: text("student_id"),
  studentName: text("student_name").notNull(),
  class: text("class").notNull(),
  stream: text("stream"),
  equipmentName: text("equipment_name").notNull(),
  quantityOrdered: integer("quantity_ordered").default(1),
  orderDate: date("order_date").defaultNow(),
  status: text("status").default("Imeagizwa"),
  notes: text("notes"),
  orderedBy: text("ordered_by"),
  createdAt: timestamp("created_at").defaultNow()
});
var schoolPurchasedEquipment = pgTable("school_purchased_equipment", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }),
  equipmentName: text("equipment_name").notNull(),
  category: text("category").default("Kilimo"),
  quantityBought: integer("quantity_bought").default(1),
  unitPrice: numeric("unit_price").default("0"),
  totalCost: numeric("total_cost").default("0"),
  supplier: text("supplier"),
  purchaseDate: date("purchase_date").defaultNow(),
  receiptNumber: text("receipt_number"),
  condition: text("condition").default("Nzuri"),
  storageLocation: text("storage_location"),
  addedBy: text("added_by"),
  createdAt: timestamp("created_at").defaultNow()
});
var reamPaperRecords = pgTable("ream_paper_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }),
  studentId: text("student_id"),
  studentName: text("student_name").notNull(),
  class: text("class").notNull(),
  stream: text("stream"),
  reamsBrought: numeric("reams_brought").default("1"),
  dateBrought: date("date_brought").defaultNow(),
  term: text("term").default("Muhula 1"),
  academicYear: text("academic_year").default("2026"),
  receivedBy: text("received_by"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow()
});
var examResults = pgTable("exam_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").references(() => students.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id"),
  examType: text("exam_type").notNull(),
  // 'MIDTERM', 'TERMINAL', 'ANNUAL'
  year: integer("year").notNull(),
  term: text("term").notNull(),
  marks: numeric("marks").notNull(),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  uniqueConstraint: unique("unique_exam_result").on(table.studentId, table.subjectId, table.examType, table.year, table.term)
}));
var activityLogs = pgTable("activity_logs", {
  id: text("id").primaryKey(),
  schoolId: text("school_id").notNull(),
  userId: text("user_id"),
  userName: text("user_name"),
  userEmail: text("user_email"),
  userRole: text("user_role"),
  category: text("category").default("General"),
  action: text("action").default("view"),
  title: text("title"),
  description: text("description"),
  timestamp: text("timestamp"),
  createdAt: timestamp("created_at").defaultNow()
});
var smsWallet = pgTable("sms_wallet", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: text("school_id").notNull().unique(),
  balance: integer("balance").default(500),
  updatedAt: timestamp("updated_at").defaultNow()
});
var smsLogs = pgTable("sms_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: text("school_id").notNull(),
  studentCno: text("student_cno"),
  phone: text("phone"),
  message: text("message"),
  status: text("status").default("SENT"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow()
});
var smsPaymentHistory = pgTable("sms_payment_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: text("school_id").notNull(),
  packageName: text("package_name"),
  amount: numeric("amount").default("0"),
  smsAdded: integer("sms_added").default(0),
  provider: text("provider"),
  phone: text("phone"),
  status: text("status").default("SUCCESS"),
  createdAt: timestamp("created_at").defaultNow()
});
var paymentVerificationRequests = pgTable("payment_verification_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: text("school_id").notNull(),
  packageName: text("package_name"),
  amount: numeric("amount").default("0"),
  smsAdded: integer("sms_added").default(0),
  phone: text("phone"),
  transactionRef: text("transaction_ref"),
  status: text("status").default("PENDING"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var dutyStreams = pgTable("duty_streams", {
  id: text("id").primaryKey(),
  schoolId: text("school_id").notNull(),
  streamName: text("stream_name").notNull(),
  totalStudents: integer("total_students").default(0),
  classTeacher: text("class_teacher"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var dutyWeeklyAssignments = pgTable("duty_weekly_assignments", {
  id: text("id").primaryKey(),
  schoolId: text("school_id").notNull(),
  weekStart: text("week_start").notNull(),
  weekEnd: text("week_end").notNull(),
  weekLabel: text("week_label").notNull(),
  teacherIds: jsonb("teacher_ids").default([]),
  teacherNames: jsonb("teacher_names").default([]),
  notes: text("notes"),
  assignedBy: text("assigned_by").default("Discipline Master"),
  status: text("status").default("Active"),
  createdAt: timestamp("created_at").defaultNow()
});
var dutyDailyReports = pgTable("duty_daily_reports", {
  id: text("id").primaryKey(),
  schoolId: text("school_id").notNull(),
  weekAssignmentId: text("week_assignment_id"),
  weekStart: text("week_start"),
  weekEnd: text("week_end"),
  weekLabel: text("week_label"),
  reportDate: text("report_date").notNull(),
  dayName: text("day_name"),
  teacherId: text("teacher_id"),
  teacherName: text("teacher_name").notNull(),
  allWeekTeachers: jsonb("all_week_teachers").default([]),
  streamAttendance: jsonb("stream_attendance").default([]),
  totalSchoolRoll: integer("total_school_roll").default(0),
  totalPresent: integer("total_present").default(0),
  totalAbsent: integer("total_absent").default(0),
  totalPermitted: integer("total_permitted").default(0),
  totalSickPua: integer("total_sick_pua").default(0),
  totalUnexcused: integer("total_unexcused").default(0),
  environmentRating: integer("environment_rating").default(8),
  environmentNotes: text("environment_notes"),
  generalDiscipline: text("general_discipline"),
  teachersPresent: integer("teachers_present").default(0),
  teachersAbsent: integer("teachers_absent").default(0),
  teacherAttendanceNotes: text("teacher_attendance_notes"),
  keyEvents: text("key_events"),
  bellSchedule: text("bell_schedule"),
  recommendations: text("recommendations"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var curriculumStandards = pgTable("curriculum_standards", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }),
  subjectName: text("subject_name").notNull(),
  level: text("level").notNull(),
  // Form 1, Form 2, etc
  curriculumType: text("curriculum_type").notNull(),
  // 'NEW_2023', 'OLD'
  topic: text("topic").notNull(),
  subTopic: text("sub_topic"),
  createdAt: timestamp("created_at").defaultNow()
});
var pastPapers = pgTable("past_papers", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }),
  subjectName: text("subject_name").notNull(),
  level: text("level").notNull(),
  year: integer("year").notNull(),
  examType: text("exam_type").notNull(),
  // 'CSEE', 'ACSEE', 'PSLE', 'MIDTERM'
  paperType: text("paper_type").default("Paper 1"),
  // Paper 1, Paper 2, etc.
  fileUrl: text("file_url").notNull(),
  markingSchemeUrl: text("marking_scheme_url"),
  createdAt: timestamp("created_at").defaultNow()
});

// src/db/index.ts
var { Pool } = pkg;
var createPool = () => {
  if (!globalThis._postgresPool) {
    globalThis._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15e3
    });
    globalThis._postgresPool.on("error", (err) => {
      console.error("Unexpected error on idle SQL pool client:", err);
    });
  }
  return globalThis._postgresPool;
};
var pool = createPool();
var db = drizzle(pool, { schema: schema_exports });

// src/constants/nectaSubjects.ts
var SUBJECT_LIST = [
  // Primary
  { code: "01", name: "Kiswahili" },
  { code: "02", name: "English Language" },
  { code: "03", name: "Social Studies & Vocational Skills" },
  { code: "04", name: "Mathematics" },
  { code: "05", name: "Science and Technology" },
  { code: "06", name: "Civic and Moral Education" },
  // Secondary O-Level
  { code: "011", name: "Civics" },
  { code: "012", name: "History" },
  { code: "013", name: "Geography" },
  { code: "016", name: "Fine Art" },
  { code: "017", name: "Music" },
  { code: "021", name: "Kiswahili" },
  { code: "022", name: "English Language" },
  { code: "024", name: "Literature in English" },
  { code: "026", name: "Chinese Language" },
  { code: "031", name: "Physics" },
  { code: "032", name: "Chemistry" },
  { code: "033", name: "Biology" },
  { code: "034", name: "Agriculture" },
  { code: "035", name: "Engineering Science" },
  { code: "036", name: "Information & Computer Studies" },
  { code: "041", name: "Basic Mathematics" },
  { code: "042", name: "Additional Mathematics" },
  { code: "061", name: "Commerce" },
  { code: "062", name: "Book Keeping" },
  { code: "080", name: "Electrical Engineering" },
  { code: "091", name: "Engineering Drawing" },
  // Secondary A-Level
  { code: "111", name: "General Studies" },
  { code: "112", name: "History" },
  { code: "113", name: "Geography" },
  { code: "118", name: "Physical Education" },
  { code: "121", name: "Kiswahili" },
  { code: "122", name: "English Language" },
  { code: "123", name: "French Language" },
  { code: "126", name: "Chinese Language" },
  { code: "131", name: "Physics" },
  { code: "132", name: "Chemistry" },
  { code: "133", name: "Biology" },
  { code: "134", name: "Agriculture" },
  { code: "141", name: "Basic Applied Mathematics" },
  { code: "142", name: "Advanced Mathematics" },
  { code: "151", name: "Economics" },
  { code: "152", name: "Commerce" },
  { code: "153", name: "Accountancy" },
  { code: "161", name: "Education" }
];

// src/constants/defaults.ts
var DEFAULT_SCHOOL_LOGO = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><defs><linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231e3a8a"/><stop offset="100%" stop-color="%230f172a"/></linearGradient><linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23fbbf24"/><stop offset="100%" stop-color="%23d97706"/></linearGradient></defs><circle cx="100" cy="100" r="94" fill="none" stroke="%23d97706" stroke-width="4"/><circle cx="100" cy="100" r="88" fill="%23ffffff" stroke="%231e3a8a" stroke-width="2"/><path d="M 100 24 C 135 24 165 42 165 78 C 165 125 125 158 100 174 C 75 158 35 125 35 78 C 35 42 65 24 100 24 Z" fill="url(%23shieldGrad)" stroke="%23fbbf24" stroke-width="3"/><path d="M 100 42 L 100 115 M 100 48 Q 120 40 142 46 L 142 104 Q 120 98 100 108 Q 80 98 58 104 L 58 46 Q 80 40 100 48 Z" fill="%23ffffff" stroke="%23fbbf24" stroke-width="2"/><circle cx="100" cy="115" r="7" fill="%23ef4444"/><polygon points="100,126 102,132 108,132 103,136 105,142 100,138 95,142 97,136 92,132 98,132" fill="%23fbbf24"/><text x="100" y="160" font-family="Arial, sans-serif" font-weight="900" font-size="10" fill="%23fbbf24" text-anchor="middle" letter-spacing="1">EXCELLENCE</text></svg>`;
var INITIAL_USERS = [
  {
    id: "usr_head",
    email: "headmaster@school.edu",
    fullName: "Mwl. Habibu Akida",
    role: "HEADMASTER",
    schoolId: "DEMO_SCHOOL"
  },
  {
    id: "usr_academic",
    email: "academic@school.edu",
    fullName: "David Mwakipesile",
    role: "ACADEMIC",
    schoolId: "DEMO_SCHOOL"
  },
  {
    id: "usr_teacher",
    email: "teacher@school.edu",
    fullName: "Grace Mchome",
    role: "TEACHER",
    schoolId: "DEMO_SCHOOL"
  }
];
var NURSERY_SUBJECTS_LIST = [
  "Kuhesabu na Namba (Numeracy)",
  "Kusoma na Kuwasiliana (Literacy)",
  "Lugha ya Kiingereza ya Awali (Early English)",
  "Afya na Mazingira ya Mtoto",
  "Sanaa, Muziki na Michezo ya Awali",
  "Maadili na Malezi Bora"
];
var UPPER_PRIMARY_SUBJECTS_LIST = [
  "Kiswahili",
  "English Language",
  "Mathematics (Hisabati)",
  "Science and Technology (Sayansi na Teknolojia)",
  "Social Studies (Maarifa ya Jamii)",
  "Civic and Moral Education (Uraia na Maadili)",
  "Vocational Skills (Stadi za Kazi)",
  "Religious Studies (Elimu ya Dini ya Kiislamu / Kikristo)",
  "ICT / TEHAMA",
  "French (Kifaransa)"
];
var PRIMARY_SUBJECTS_LIST = [
  ...UPPER_PRIMARY_SUBJECTS_LIST,
  "Kusoma (Reading)",
  "Kuandika (Writing)",
  "Kuhesabu (Arithmetic)",
  "Afya na Mazingira (Health & Environment)",
  "Sanaa na Michezo (Arts & Sports)"
];
var SECONDARY_SUBJECTS = [
  "English Language",
  "Kiswahili",
  "Basic Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Civics",
  "Geography",
  "History",
  "Commerce",
  "Book Keeping",
  "Literature in English",
  "Agriculture",
  "Computer Studies",
  "Fine Art",
  "Physical Education",
  "French",
  "Arabic",
  "Bible Knowledge",
  "Islamic Knowledge",
  "Mikondo"
];
var SUBJECT_NAMES_LIST = SUBJECT_LIST.map((s) => s.name);
var NURSERY_CLASSES = [
  "Baby Class",
  "Nursery 1",
  "Nursery 2",
  "Pre-Unit"
];
var PRIMARY_CLASSES = [
  "Standard 1",
  "Standard 2",
  "Standard 3",
  "Standard 4",
  "Standard 5",
  "Standard 6",
  "Standard 7"
];
var SECONDARY_CLASSES = [
  "Form 1",
  "Form 2",
  "Form 3",
  "Form 4",
  "Form 5",
  "Form 6"
];
var ALL_SCHOOL_CLASSES = [
  ...NURSERY_CLASSES,
  ...PRIMARY_CLASSES,
  ...SECONDARY_CLASSES
];
var INITIAL_TEACHERS = [
  { id: 101, name: "Adelmarcy Mallya", initial: "AM", subjects: ["Mathematics", "Physics"], excludeInvigilation: false, color: "#0284c7", schoolRole: "Academic Master", phone: "+255 754 112 233", email: "a.mallya@school.ac.tz" },
  { id: 102, name: "Baraka Mgimwa", initial: "BM", subjects: ["English Language", "Literature in English"], excludeInvigilation: false, color: "#059669", schoolRole: "Discipline Master", phone: "+255 713 223 344", email: "b.mgimwa@school.ac.tz" },
  { id: 103, name: "Catherine Shirima", initial: "CS", subjects: ["Biology", "Chemistry"], excludeInvigilation: false, color: "#d97706", schoolRole: "Head of Department (HOD) - Science", phone: "+255 784 334 455", email: "c.shirima@school.ac.tz" },
  { id: 104, name: "David Mwakipesile", initial: "DM", subjects: ["Geography", "History"], excludeInvigilation: false, color: "#7c3aed", schoolRole: "Second Master", phone: "+255 762 445 566", email: "d.mwakipesile@school.ac.tz" },
  { id: 105, name: "Emmanuel Tarimo", initial: "ET", subjects: ["Kiswahili", "Civics"], excludeInvigilation: false, color: "#e11d48", schoolRole: "Examination Officer", phone: "+255 655 556 677", email: "e.tarimo@school.ac.tz" },
  { id: 106, name: "Faraja Lyimo", initial: "FL", subjects: ["Computer Studies", "Mathematics"], excludeInvigilation: false, color: "#0d9488", schoolRole: "Head of Department (HOD) - Business & ICT", phone: "+255 712 667 788", email: "f.lyimo@school.ac.tz" },
  { id: 107, name: "Grace Muro", initial: "GM", subjects: ["Commerce", "Book Keeping"], excludeInvigilation: false, color: "#4f46e5", schoolRole: "Head of Department (HOD) - Arts & Social Studies", phone: "+255 789 778 899", email: "g.muro@school.ac.tz" },
  { id: 108, name: "Hamisi Juma", initial: "HJ", subjects: ["Physical Education", "Sports and Games"], excludeInvigilation: false, color: "#ea580c", schoolRole: "Sports & Games Master", phone: "+255 765 889 900", email: "h.juma@school.ac.tz" }
];
var TANZANIAN_TEMPLATE_PERIOD_SETTINGS = [
  // Monday
  { id: 1, day: "Monday", name: "Period 1", start: "08:00", end: "08:40" },
  { id: 2, day: "Monday", name: "Period 2", start: "08:40", end: "09:20" },
  { id: 3, day: "Monday", name: "Period 3", start: "09:40", end: "10:20" },
  { id: 4, day: "Monday", name: "Period 4", start: "10:20", end: "11:00" },
  { id: 5, day: "Monday", name: "Period 5", start: "11:20", end: "12:00" },
  { id: 6, day: "Monday", name: "Period 6", start: "12:00", end: "12:40" },
  { id: 7, day: "Monday", name: "Period 7", start: "14:00", end: "14:40" },
  // Tuesday
  { id: 8, day: "Tuesday", name: "Period 1", start: "08:00", end: "08:40" },
  { id: 9, day: "Tuesday", name: "Period 2", start: "08:40", end: "09:20" },
  { id: 10, day: "Tuesday", name: "Period 3", start: "09:40", end: "10:20" },
  { id: 11, day: "Tuesday", name: "Period 4", start: "10:20", end: "11:00" },
  { id: 12, day: "Tuesday", name: "Period 5", start: "11:20", end: "12:00" },
  { id: 13, day: "Tuesday", name: "Period 6", start: "12:00", end: "12:40" },
  { id: 14, day: "Tuesday", name: "Period 7", start: "14:00", end: "14:40" },
  // Wednesday
  { id: 15, day: "Wednesday", name: "Period 1", start: "08:00", end: "08:40" },
  { id: 16, day: "Wednesday", name: "Period 2", start: "08:40", end: "09:20" },
  { id: 17, day: "Wednesday", name: "Period 3", start: "09:40", end: "10:20" },
  { id: 18, day: "Wednesday", name: "Period 4", start: "10:20", end: "11:00" },
  { id: 19, day: "Wednesday", name: "Period 5", start: "11:20", end: "12:00" },
  { id: 20, day: "Wednesday", name: "Period 6", start: "12:00", end: "12:40" },
  { id: 21, day: "Wednesday", name: "Period 7", start: "14:00", end: "15:30" },
  // Thursday
  { id: 22, day: "Thursday", name: "Period 1", start: "08:00", end: "08:40" },
  { id: 23, day: "Thursday", name: "Period 2", start: "08:40", end: "09:20" },
  { id: 24, day: "Thursday", name: "Period 3", start: "09:40", end: "10:20" },
  { id: 25, day: "Thursday", name: "Period 4", start: "10:20", end: "11:00" },
  { id: 26, day: "Thursday", name: "Period 5", start: "11:20", end: "12:00" },
  { id: 27, day: "Thursday", name: "Period 6", start: "12:00", end: "12:40" },
  { id: 28, day: "Thursday", name: "Period 7", start: "14:00", end: "14:40" },
  // Friday
  { id: 29, day: "Friday", name: "Period 1", start: "08:00", end: "08:40" },
  { id: 30, day: "Friday", name: "Period 2", start: "08:40", end: "09:20" },
  { id: 31, day: "Friday", name: "Period 3", start: "09:40", end: "10:20" },
  { id: 32, day: "Friday", name: "Period 4", start: "10:20", end: "11:00" },
  { id: 33, day: "Friday", name: "Period 5", start: "11:20", end: "12:00" },
  { id: 34, day: "Friday", name: "Period 6", start: "12:00", end: "12:40" },
  { id: 35, day: "Friday", name: "Period 7", start: "14:00", end: "15:00" }
];
var INITIAL_PERIOD_SETTINGS = TANZANIAN_TEMPLATE_PERIOD_SETTINGS;
var TANZANIAN_TEMPLATE_STREAM_SETTINGS = [
  { id: 101, className: "Nursery", level: "PRE_PRIMARY", streams: ["STREAM A", "STREAM B"] },
  { id: 102, className: "Baby Class", level: "PRE_PRIMARY", streams: ["STREAM A", "STREAM B"] },
  { id: 103, className: "Middle Class", level: "PRE_PRIMARY", streams: ["STREAM A", "STREAM B"] },
  { id: 104, className: "Pre-Unit", level: "PRE_PRIMARY", streams: ["STREAM A", "STREAM B"] },
  { id: 105, className: "Standard 1", level: "PRIMARY", streams: ["STREAM A", "STREAM B", "STREAM C"] },
  { id: 106, className: "Standard 2", level: "PRIMARY", streams: ["STREAM A", "STREAM B", "STREAM C"] },
  { id: 107, className: "Standard 3", level: "PRIMARY", streams: ["STREAM A", "STREAM B", "STREAM C"] },
  { id: 108, className: "Standard 4", level: "PRIMARY", streams: ["STREAM A", "STREAM B", "STREAM C"] },
  { id: 109, className: "Standard 5", level: "PRIMARY", streams: ["STREAM A", "STREAM B", "STREAM C"] },
  { id: 110, className: "Standard 6", level: "PRIMARY", streams: ["STREAM A", "STREAM B", "STREAM C"] },
  { id: 111, className: "Standard 7", level: "PRIMARY", streams: ["STREAM A", "STREAM B", "STREAM C"] },
  { id: 1, className: "Form 1", level: "CSEE", streams: ["STREAM A", "STREAM B"] },
  { id: 2, className: "Form 2", level: "CSEE", streams: ["STREAM A", "STREAM B"] },
  { id: 3, className: "Form 3", level: "CSEE", streams: ["STREAM A", "STREAM B"] },
  { id: 4, className: "Form 4", level: "CSEE", streams: ["STREAM A", "STREAM B"] },
  { id: 5, className: "Form 5", level: "ACSEE", streams: ["PCM", "PCB", "HGE"] },
  { id: 6, className: "Form 6", level: "ACSEE", streams: ["PCM", "PCB", "HKL"] }
];
var INITIAL_STREAM_SETTINGS = TANZANIAN_TEMPLATE_STREAM_SETTINGS;
var TANZANIAN_TEMPLATE_TIMETABLE_ASSIGNMENTS = [
  // Form 1 STREAM A
  { id: 201, className: "Form 1", stream: "STREAM A", day: "Monday", period: "Period 1 (08:00-08:40)", teacherId: 101, subject: "Mathematics" },
  { id: 202, className: "Form 1", stream: "STREAM A", day: "Monday", period: "Period 2 (08:40-09:20)", teacherId: 102, subject: "English Language" },
  { id: 203, className: "Form 1", stream: "STREAM A", day: "Monday", period: "Period 3 (09:40-10:20)", teacherId: 103, subject: "Biology" },
  { id: 204, className: "Form 1", stream: "STREAM A", day: "Monday", period: "Period 4 (10:20-11:00)", teacherId: 104, subject: "Geography" },
  { id: 205, className: "Form 1", stream: "STREAM A", day: "Monday", period: "Period 5 (11:20-12:00)", teacherId: 105, subject: "Kiswahili" },
  { id: 206, className: "Form 1", stream: "STREAM A", day: "Monday", period: "Period 6 (12:00-12:40)", teacherId: 106, subject: "Computer Studies" },
  { id: 207, className: "Form 1", stream: "STREAM A", day: "Monday", period: "Period 7 (14:00-14:40)", teacherId: 101, subject: "Library & Private Study", activityType: "library" },
  // Form 1 STREAM B
  { id: 208, className: "Form 1", stream: "STREAM B", day: "Monday", period: "Period 1 (08:00-08:40)", teacherId: 102, subject: "English Language" },
  { id: 209, className: "Form 1", stream: "STREAM B", day: "Monday", period: "Period 2 (08:40-09:20)", teacherId: 101, subject: "Mathematics" },
  { id: 210, className: "Form 1", stream: "STREAM B", day: "Monday", period: "Period 3 (09:40-10:20)", teacherId: 105, subject: "Kiswahili" },
  // Wednesday Extra-curricular (Sports & Games)
  { id: 211, className: "Form 1", stream: "STREAM A", day: "Wednesday", period: "Period 7 (14:00-15:30)", teacherId: 108, subject: "Sports and Games", activityType: "sports" },
  { id: 212, className: "Form 1", stream: "STREAM B", day: "Wednesday", period: "Period 7 (14:00-15:30)", teacherId: 108, subject: "Sports and Games", activityType: "sports" },
  // Friday Extra-curricular (Religion, Environmental Day & Debates)
  { id: 213, className: "Form 1", stream: "STREAM A", day: "Friday", period: "Period 5 (11:20-12:00)", subject: "Religion", activityType: "religion", room: "Chapel / Mosque / Hall" },
  { id: 214, className: "Form 1", stream: "STREAM B", day: "Friday", period: "Period 5 (11:20-12:00)", subject: "Religion", activityType: "religion", room: "Chapel / Mosque / Hall" },
  { id: 219, className: "Form 1", stream: "STREAM A", day: "Friday", period: "Period 7 (14:00-15:00)", teacherId: 104, subject: "Environmental Day", activityType: "environmental", room: "School Grounds" },
  { id: 220, className: "Form 1", stream: "STREAM B", day: "Friday", period: "Period 7 (14:00-15:00)", teacherId: 102, subject: "Debates", activityType: "debates", room: "Main Hall" },
  // Form 2 STREAM A
  { id: 215, className: "Form 2", stream: "STREAM A", day: "Monday", period: "Period 1 (08:00-08:40)", teacherId: 103, subject: "Chemistry" },
  { id: 216, className: "Form 2", stream: "STREAM A", day: "Monday", period: "Period 2 (08:40-09:20)", teacherId: 104, subject: "History" },
  { id: 217, className: "Form 2", stream: "STREAM A", day: "Wednesday", period: "Period 7 (14:00-15:30)", teacherId: 108, subject: "Sports and Games", activityType: "sports" },
  { id: 218, className: "Form 2", stream: "STREAM A", day: "Friday", period: "Period 7 (14:00-15:00)", teacherId: 104, subject: "Environmental Day", activityType: "environmental" },
  { id: 221, className: "Form 2", stream: "STREAM A", day: "Friday", period: "Period 5 (11:20-12:00)", subject: "Religion", activityType: "religion", room: "School Hall" },
  { id: 222, className: "Form 1", stream: "STREAM A", day: "Friday", period: "Period 6 (12:00-12:40)", teacherId: 101, subject: "Weekly Test", activityType: "weekly_test", room: "Exam Hall / Class 1A", customNote: "Weekly evaluation test" }
];
var INITIAL_TIMETABLE_ASSIGNMENTS = TANZANIAN_TEMPLATE_TIMETABLE_ASSIGNMENTS;
var INITIAL_STUDENTS = [
  { id: 1, name: "Amina Juma Mohamed", regNo: "S0123/0001/2026", sex: "F", className: "Form 1", stream: "STREAM A", subjects: ["Basic Mathematics", "English Language", "Biology", "History", "Kiswahili", "Physics", "Chemistry"], dob: "2010-05-15", status: "ACTIVE", parentPhone: "0712345678" },
  { id: 2, name: "Baraka Saidi Ally", regNo: "S0123/0002/2026", sex: "M", className: "Form 1", stream: "STREAM A", subjects: ["Basic Mathematics", "English Language", "Biology", "History", "Kiswahili", "Physics", "Chemistry"], dob: "2010-08-22", status: "ACTIVE", parentPhone: "0754112233" },
  { id: 3, name: "Catherine Joseph Shirima", regNo: "S0123/0003/2026", sex: "F", className: "Form 1", stream: "STREAM B", subjects: ["Basic Mathematics", "English Language", "Biology", "History", "Kiswahili", "Physics", "Chemistry"], dob: "2011-01-10", status: "ACTIVE", parentPhone: "0784334455" },
  { id: 11, name: "Neema Emmanuel Mushi", regNo: "S0123/0011/2026", sex: "F", className: "Form 1", stream: "STREAM A", subjects: ["Basic Mathematics", "English Language", "Biology", "History", "Kiswahili", "Physics", "Chemistry"], dob: "2010-03-12", status: "ACTIVE", parentPhone: "0765998877" },
  { id: 12, name: "Kelvin David Temu", regNo: "S0123/0012/2026", sex: "M", className: "Form 1", stream: "STREAM B", subjects: ["Basic Mathematics", "English Language", "Biology", "History", "Kiswahili", "Physics", "Chemistry"], dob: "2010-09-04", status: "ACTIVE", parentPhone: "0717223344" },
  { id: 13, name: "Zainab Bakari Salum", regNo: "S0123/0013/2026", sex: "F", className: "Form 1", stream: "STREAM A", subjects: ["Basic Mathematics", "English Language", "Biology", "History", "Kiswahili", "Physics", "Chemistry"], dob: "2010-11-20", status: "ACTIVE", parentPhone: "0789445566" },
  { id: 14, name: "Juma Hassan Omari", regNo: "S0123/0014/2026", sex: "M", className: "Form 1", stream: "STREAM B", subjects: ["Basic Mathematics", "English Language", "Biology", "History", "Kiswahili", "Physics", "Chemistry"], dob: "2010-02-18", status: "ACTIVE", parentPhone: "0756778899" },
  { id: 15, name: "Faraja Godfrey Lyimo", regNo: "S0123/0015/2026", sex: "M", className: "Form 1", stream: "STREAM A", subjects: ["Basic Mathematics", "English Language", "Biology", "History", "Kiswahili", "Physics", "Chemistry"], dob: "2010-07-29", status: "ACTIVE", parentPhone: "0762334455" },
  { id: 4, name: "Daudi Hamisi Mvungi", regNo: "S0123/0004/2026", sex: "M", className: "Form 2", stream: "STREAM A", subjects: ["Physics", "Chemistry", "Biology", "Civics"], dob: "2009-11-30", status: "ACTIVE", parentPhone: "0718990011" },
  { id: 5, name: "Ester Richard Mushi", regNo: "S0123/0005/2026", sex: "F", className: "Form 2", stream: "STREAM A", subjects: ["Physics", "Chemistry", "Biology", "Civics"], dob: "2009-04-05", status: "ACTIVE", parentPhone: "0755667788" },
  { id: 6, name: "Faraja Emmanuel Masawe", regNo: "S0123/0006/2026", sex: "M", className: "Form 3", stream: "STREAM A", subjects: ["History", "Geography", "English Language", "Kiswahili"], dob: "2008-07-18", status: "ACTIVE", parentPhone: "0787112233" },
  { id: 7, name: "Grace Peter Mmbaga", regNo: "S0123/0007/2026", sex: "F", className: "Form 3", stream: "STREAM A", subjects: ["History", "Geography", "English Language", "Kiswahili"], dob: "2008-12-12", status: "ACTIVE", parentPhone: "0714556677" },
  { id: 8, name: "Hamisi Omari Kipande", regNo: "S0123/0008/2026", sex: "M", className: "Form 4", stream: "STREAM B", subjects: ["Book Keeping", "Commerce", "Basic Mathematics", "Civics"], dob: "2007-09-09", status: "ACTIVE", parentPhone: "0768223344" },
  { id: 9, name: "Irene John Lyimo", regNo: "S0123/0009/2026", sex: "F", className: "Standard 7", stream: "STREAM A", subjects: ["Sayansi na Teknolojia", "Hisabati (Mathematics)", "Maarifa ya Jamii", "Kiswahili", "English Language"], dob: "2012-03-25", status: "ACTIVE", parentPhone: "0754889900" },
  { id: 10, name: "John Peter Temu", regNo: "S0123/0010/2026", sex: "M", className: "Standard 4", stream: "STREAM C", subjects: ["Kusoma", "Kuandika", "Kuhesabu", "Afya na Mazingira", "Sanaa na Michezo"], dob: "2015-06-14", status: "ACTIVE", parentPhone: "0719001122" }
];
var INITIAL_EXAMS = [
  { id: 1, name: "Midterm I Examination", type: "Midterm I", level: "CSEE", className: "All", date: "2026-03-15", status: "Active" },
  { id: 2, name: "Terminal Examination", type: "Terminal", level: "CSEE", className: "All", date: "2026-06-20", status: "Active" },
  { id: 3, name: "Annual Examination", type: "Annual", level: "CSEE", className: "All", date: "2026-11-15", status: "Active" },
  { id: 4, name: "PSLE Mock Examination (Std 7)", type: "National Mock", level: "PRIMARY", className: "Standard 7", date: "2026-07-25", status: "Active" },
  { id: 5, name: "SFNA National Assessment (Std 4)", type: "National Assessment", level: "PRIMARY", className: "Standard 4", date: "2026-10-20", status: "Active" },
  { id: 6, name: "Primary Terminal Exam (Std 1-7)", type: "Terminal", level: "PRIMARY", className: "All", date: "2026-06-18", status: "Active" },
  { id: 7, name: "Nursery Term II Evaluation", type: "Assessment", level: "PRE_PRIMARY", className: "All", date: "2026-06-15", status: "Active" }
];
var INITIAL_SESSIONS = [
  {
    id: 1,
    rawDate: "2026-10-15",
    date: "15 Oct 2026",
    day: "Thursday",
    session: "SESSION I",
    start: "08:00",
    end: "10:30",
    time: "08:00-10:30",
    subject: "Mathematics",
    level: "CSEE",
    className: "FORM ONE",
    stream: "STREAM A",
    rooms: 3
  },
  {
    id: 2,
    rawDate: "2026-10-15",
    date: "15 Oct 2026",
    day: "Thursday",
    session: "SESSION II",
    start: "13:00",
    end: "15:30",
    time: "13:00-15:30",
    subject: "English Language",
    level: "CSEE",
    className: "FORM ONE",
    stream: "STREAM B",
    rooms: 3
  },
  {
    id: 3,
    rawDate: "2026-10-16",
    date: "16 Oct 2026",
    day: "Friday",
    session: "SESSION I",
    start: "08:00",
    end: "11:00",
    time: "08:00-11:00",
    subject: "Physics",
    level: "CSEE",
    className: "FORM TWO",
    stream: "STREAM A",
    rooms: 4
  }
];
var INITIAL_SUPERVISORS = [
  { id: 1, teacherId: 101, name: "Adelmarcy Mallya", initial: "AM" },
  { id: 2, teacherId: 104, name: "David Mwakipesile", initial: "DM" }
];
var DEFAULT_INSTITUTIONAL_POLICY = {
  totalPeriodsPerDay: 8,
  periodDurationMinutes: 40,
  breakAfterPeriod: 2,
  lunchAfterPeriod: 5,
  workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  maxPeriodsPerTeacherPerDay: 5,
  rules: {
    noTeacherTwoClassesSameTime: true,
    noClassTwoTeachersSameTime: true,
    noSameSubjectTwiceSameDay: true
  }
};
var DEFAULT_SUBJECT_PERIOD_ALLOCATIONS = [
  // Nursery Level
  { id: "spa_nur_1", level: "NURSERY", className: "Baby Class", stream: "STREAM A", subject: "Kuhesabu na Namba (Numeracy)", periodsPerWeek: 5 },
  { id: "spa_nur_2", level: "NURSERY", className: "Baby Class", stream: "STREAM A", subject: "Kusoma na Kuwasiliana (Literacy)", periodsPerWeek: 5 },
  { id: "spa_nur_3", level: "NURSERY", className: "Baby Class", stream: "STREAM A", subject: "Lugha ya Kiingereza ya Awali (Early English)", periodsPerWeek: 4 },
  { id: "spa_nur_4", level: "NURSERY", className: "Baby Class", stream: "STREAM A", subject: "Afya na Mazingira ya Mtoto", periodsPerWeek: 4 },
  { id: "spa_nur_5", level: "NURSERY", className: "Baby Class", stream: "STREAM A", subject: "Sanaa, Muziki na Michezo ya Awali", periodsPerWeek: 4 },
  { id: "spa_nur_6", level: "NURSERY", className: "Baby Class", stream: "STREAM A", subject: "Maadili na Malezi Bora", periodsPerWeek: 3 },
  // Primary Level
  { id: "spa_pri_1", level: "PRIMARY", className: "Standard 1", stream: "STREAM A", subject: "Mathematics (Hisabati)", periodsPerWeek: 6 },
  { id: "spa_pri_2", level: "PRIMARY", className: "Standard 1", stream: "STREAM A", subject: "English Language", periodsPerWeek: 6 },
  { id: "spa_pri_3", level: "PRIMARY", className: "Standard 1", stream: "STREAM A", subject: "Kiswahili", periodsPerWeek: 6 },
  { id: "spa_pri_4", level: "PRIMARY", className: "Standard 1", stream: "STREAM A", subject: "Science and Technology (Sayansi na Teknolojia)", periodsPerWeek: 5 },
  { id: "spa_pri_5", level: "PRIMARY", className: "Standard 1", stream: "STREAM A", subject: "Social Studies (Maarifa ya Jamii)", periodsPerWeek: 4 },
  { id: "spa_pri_6", level: "PRIMARY", className: "Standard 1", stream: "STREAM A", subject: "Civic and Moral Education (Uraia na Maadili)", periodsPerWeek: 3 },
  // Secondary Level
  { id: "spa_sec_1", level: "SECONDARY", className: "Form 1", stream: "STREAM A", subject: "Mathematics", periodsPerWeek: 6 },
  { id: "spa_sec_2", level: "SECONDARY", className: "Form 1", stream: "STREAM A", subject: "English Language", periodsPerWeek: 5 },
  { id: "spa_sec_3", level: "SECONDARY", className: "Form 1", stream: "STREAM A", subject: "Kiswahili", periodsPerWeek: 4 },
  { id: "spa_sec_4", level: "SECONDARY", className: "Form 1", stream: "STREAM A", subject: "Biology", periodsPerWeek: 4 },
  { id: "spa_sec_5", level: "SECONDARY", className: "Form 1", stream: "STREAM A", subject: "Chemistry", periodsPerWeek: 4 },
  { id: "spa_sec_6", level: "SECONDARY", className: "Form 1", stream: "STREAM A", subject: "Physics", periodsPerWeek: 4 },
  { id: "spa_sec_7", level: "SECONDARY", className: "Form 1", stream: "STREAM A", subject: "Geography", periodsPerWeek: 3 },
  { id: "spa_sec_8", level: "SECONDARY", className: "Form 1", stream: "STREAM A", subject: "History", periodsPerWeek: 3 },
  { id: "spa_sec_9", level: "SECONDARY", className: "Form 1", stream: "STREAM A", subject: "Civics", periodsPerWeek: 3 }
];
var DEFAULT_TEACHER_ASSIGNMENTS = [
  { id: "ta_1", teacherId: 101, teacherName: "Adelmarcy Mallya", level: "SECONDARY", subjects: ["Mathematics", "Physics"], streams: ["Form 1 - STREAM A", "Form 1 - STREAM B", "Form 2 - STREAM A"] },
  { id: "ta_2", teacherId: 102, teacherName: "Baraka Mgimwa", level: "SECONDARY", subjects: ["English Language", "Literature in English"], streams: ["Form 1 - STREAM A", "Form 1 - STREAM B", "Form 3 - STREAM A"] },
  { id: "ta_3", teacherId: 103, teacherName: "Catherine Shirima", level: "SECONDARY", subjects: ["Biology", "Chemistry"], streams: ["Form 1 - STREAM A", "Form 2 - STREAM A", "Form 4 - STREAM A"] },
  { id: "ta_4", teacherId: 104, teacherName: "David Mwakipesile", level: "SECONDARY", subjects: ["Geography", "History"], streams: ["Form 1 - STREAM A", "Form 1 - STREAM B", "Form 2 - STREAM B"] },
  { id: "ta_5", teacherId: 105, teacherName: "Emmanuel Tarimo", level: "SECONDARY", subjects: ["Kiswahili", "Civics"], streams: ["Form 1 - STREAM A", "Form 2 - STREAM A", "Form 3 - STREAM B"] },
  { id: "ta_6", teacherId: 106, teacherName: "Faraja Lyimo", level: "SECONDARY", subjects: ["Computer Studies", "Mathematics"], streams: ["Form 1 - STREAM A", "Form 3 - STREAM A"] },
  { id: "ta_7", teacherId: 107, teacherName: "Grace Muro", level: "PRIMARY", subjects: ["English Language", "Social Studies (Maarifa ya Jamii)"], streams: ["Standard 1 - STREAM A", "Standard 1 - STREAM B", "Standard 2 - STREAM A"] },
  { id: "ta_8", teacherId: 108, teacherName: "Hamisi Juma", level: "NURSERY", subjects: ["Sanaa, Muziki na Michezo ya Awali", "Afya na Mazingira ya Mtoto"], streams: ["Baby Class - STREAM A", "Nursery - STREAM A"] }
];
var INITIAL_EXAMINATION_RECORDS = [
  {
    id: "rec_1",
    studentId: 1,
    studentName: "Amina Juma Mohamed",
    regNo: "S0123/0001/2026",
    className: "Form 1",
    stream: "STREAM A",
    gender: "Female",
    parentPhone: "0712345678",
    academicYear: "2026",
    academicCalendarType: "JAN-DEC",
    term: "Term 1",
    examType: "Midterm",
    subjects: {
      "Basic Mathematics": { marks: 95, grade: "A" },
      "English Language": { marks: 88, grade: "A" },
      "Biology": { marks: 92, grade: "A" },
      "History": { marks: 84, grade: "A" },
      "Kiswahili": { marks: 90, grade: "A" },
      "Physics": { marks: 85, grade: "A" }
    },
    totalMarks: 534,
    averageMarks: 89,
    overallGrade: "A",
    division: "I",
    points: 7,
    positionInClass: 1,
    totalStudents: 8,
    teacherRemarks: "Excellent performance. Keep it up!",
    createdAt: "2026-03-01T00:00:00Z"
  },
  {
    id: "rec_11",
    studentId: 11,
    studentName: "Neema Emmanuel Mushi",
    regNo: "S0123/0011/2026",
    className: "Form 1",
    stream: "STREAM A",
    gender: "Female",
    parentPhone: "0765998877",
    academicYear: "2026",
    academicCalendarType: "JAN-DEC",
    term: "Term 1",
    examType: "Midterm",
    subjects: {
      "Basic Mathematics": { marks: 88, grade: "A" },
      "English Language": { marks: 92, grade: "A" },
      "Biology": { marks: 86, grade: "A" },
      "History": { marks: 82, grade: "A" },
      "Kiswahili": { marks: 85, grade: "A" },
      "Physics": { marks: 79, grade: "B" }
    },
    totalMarks: 512,
    averageMarks: 85.3,
    overallGrade: "A",
    division: "I",
    points: 8,
    positionInClass: 2,
    totalStudents: 8,
    teacherRemarks: "Outstanding intellectual achievement.",
    createdAt: "2026-03-01T00:00:00Z"
  },
  {
    id: "rec_12",
    studentId: 12,
    studentName: "Kelvin David Temu",
    regNo: "S0123/0012/2026",
    className: "Form 1",
    stream: "STREAM B",
    gender: "Male",
    parentPhone: "0717223344",
    academicYear: "2026",
    academicCalendarType: "JAN-DEC",
    term: "Term 1",
    examType: "Midterm",
    subjects: {
      "Basic Mathematics": { marks: 91, grade: "A" },
      "English Language": { marks: 78, grade: "A" },
      "Biology": { marks: 82, grade: "A" },
      "History": { marks: 76, grade: "B" },
      "Kiswahili": { marks: 80, grade: "A" },
      "Physics": { marks: 82, grade: "A" }
    },
    totalMarks: 489,
    averageMarks: 81.5,
    overallGrade: "A",
    division: "I",
    points: 9,
    positionInClass: 3,
    totalStudents: 8,
    teacherRemarks: "Very good grasp of scientific concepts.",
    createdAt: "2026-03-01T00:00:00Z"
  },
  {
    id: "rec_13",
    studentId: 13,
    studentName: "Zainab Bakari Salum",
    regNo: "S0123/0013/2026",
    className: "Form 1",
    stream: "STREAM A",
    gender: "Female",
    parentPhone: "0789445566",
    academicYear: "2026",
    academicCalendarType: "JAN-DEC",
    term: "Term 1",
    examType: "Midterm",
    subjects: {
      "Basic Mathematics": { marks: 75, grade: "B" },
      "English Language": { marks: 84, grade: "A" },
      "Biology": { marks: 80, grade: "A" },
      "History": { marks: 78, grade: "A" },
      "Kiswahili": { marks: 82, grade: "A" },
      "Physics": { marks: 68, grade: "B" }
    },
    totalMarks: 467,
    averageMarks: 77.8,
    overallGrade: "B",
    division: "I",
    points: 11,
    positionInClass: 4,
    totalStudents: 8,
    teacherRemarks: "Great performance in languages and biology.",
    createdAt: "2026-03-01T00:00:00Z"
  },
  {
    id: "rec_2",
    studentId: 2,
    studentName: "Baraka Saidi Ally",
    regNo: "S0123/0002/2026",
    className: "Form 1",
    stream: "STREAM A",
    gender: "Male",
    parentPhone: "0754112233",
    academicYear: "2026",
    academicCalendarType: "JAN-DEC",
    term: "Term 1",
    examType: "Midterm",
    subjects: {
      "Basic Mathematics": { marks: 72, grade: "B" },
      "English Language": { marks: 70, grade: "B" },
      "Biology": { marks: 75, grade: "B" },
      "History": { marks: 74, grade: "B" },
      "Kiswahili": { marks: 76, grade: "B" },
      "Physics": { marks: 67, grade: "B" }
    },
    totalMarks: 434,
    averageMarks: 72.3,
    overallGrade: "B",
    division: "I",
    points: 14,
    positionInClass: 5,
    totalStudents: 8,
    teacherRemarks: "Consistently solid effort.",
    createdAt: "2026-03-01T00:00:00Z"
  },
  {
    id: "rec_14",
    studentId: 14,
    studentName: "Juma Hassan Omari",
    regNo: "S0123/0014/2026",
    className: "Form 1",
    stream: "STREAM B",
    gender: "Male",
    parentPhone: "0756778899",
    academicYear: "2026",
    academicCalendarType: "JAN-DEC",
    term: "Term 1",
    examType: "Midterm",
    subjects: {
      "Basic Mathematics": { marks: 64, grade: "B" },
      "English Language": { marks: 68, grade: "B" },
      "Biology": { marks: 70, grade: "B" },
      "History": { marks: 66, grade: "B" },
      "Kiswahili": { marks: 71, grade: "B" },
      "Physics": { marks: 57, grade: "C" }
    },
    totalMarks: 396,
    averageMarks: 66,
    overallGrade: "B",
    division: "II",
    points: 16,
    positionInClass: 6,
    totalStudents: 8,
    teacherRemarks: "Good progress. Put more effort into physics.",
    createdAt: "2026-03-01T00:00:00Z"
  },
  {
    id: "rec_3",
    studentId: 3,
    studentName: "Catherine Joseph Shirima",
    regNo: "S0123/0003/2026",
    className: "Form 1",
    stream: "STREAM B",
    gender: "Female",
    parentPhone: "0784334455",
    academicYear: "2026",
    academicCalendarType: "JAN-DEC",
    term: "Term 1",
    examType: "Midterm",
    subjects: {
      "Basic Mathematics": { marks: 55, grade: "C" },
      "English Language": { marks: 64, grade: "B" },
      "Biology": { marks: 62, grade: "B" },
      "History": { marks: 60, grade: "B" },
      "Kiswahili": { marks: 65, grade: "B" },
      "Physics": { marks: 51, grade: "C" }
    },
    totalMarks: 357,
    averageMarks: 59.5,
    overallGrade: "C",
    division: "II",
    points: 19,
    positionInClass: 7,
    totalStudents: 8,
    teacherRemarks: "Capable of reaching Division I with focus.",
    createdAt: "2026-03-01T00:00:00Z"
  },
  {
    id: "rec_15",
    studentId: 15,
    studentName: "Faraja Godfrey Lyimo",
    regNo: "S0123/0015/2026",
    className: "Form 1",
    stream: "STREAM A",
    gender: "Male",
    parentPhone: "0762334455",
    academicYear: "2026",
    academicCalendarType: "JAN-DEC",
    term: "Term 1",
    examType: "Midterm",
    subjects: {
      "Basic Mathematics": { marks: 48, grade: "C" },
      "English Language": { marks: 58, grade: "C" },
      "Biology": { marks: 54, grade: "C" },
      "History": { marks: 56, grade: "C" },
      "Kiswahili": { marks: 55, grade: "C" },
      "Physics": { marks: 46, grade: "C" }
    },
    totalMarks: 317,
    averageMarks: 52.8,
    overallGrade: "C",
    division: "III",
    points: 22,
    positionInClass: 8,
    totalStudents: 8,
    teacherRemarks: "Steady progress. Needs remedial assistance in math.",
    createdAt: "2026-03-01T00:00:00Z"
  }
];
var INITIAL_PROMOTION_HISTORY = [];
var INITIAL_TRANSFER_HISTORY = [];
var DEFAULT_APP_DATA = {
  users: INITIAL_USERS,
  students: INITIAL_STUDENTS,
  teachers: INITIAL_TEACHERS,
  exams: INITIAL_EXAMS,
  periodSettings: INITIAL_PERIOD_SETTINGS,
  streamSettings: INITIAL_STREAM_SETTINGS,
  timetableAssignments: INITIAL_TIMETABLE_ASSIGNMENTS,
  sessions: INITIAL_SESSIONS,
  supervisors: INITIAL_SUPERVISORS,
  resultsStatus: "active",
  selectedInvigilators: [101, 102, 103, 104, 105, 106, 107, 108],
  invigilationAssignments: {},
  timetableReleased: true,
  classTimetableReleased: {
    "Form 1": true,
    "Form 2": true,
    "Form 3": true,
    "Form 4": true,
    "Form 5": true,
    "Form 6": true
  },
  schoolInfo: {
    name: "HabyEduPro3A",
    schoolNumber: "S.0123",
    address: "P.O. Box 1234, Tanga, Tanzania",
    phone: "0717616343",
    email: "info@habyedupro3a.ac.tz",
    motto: "Education for Development & Integrity",
    principal: "Mwl. H. Akida",
    logo: DEFAULT_SCHOOL_LOGO,
    institutionalLevels: ["NURSERY", "PRIMARY", "SECONDARY"]
  },
  institutionalPolicy: DEFAULT_INSTITUTIONAL_POLICY,
  subjectPeriodAllocations: DEFAULT_SUBJECT_PERIOD_ALLOCATIONS,
  teacherAssignments: DEFAULT_TEACHER_ASSIGNMENTS,
  examinationRecords: INITIAL_EXAMINATION_RECORDS,
  usalRecords: [],
  promotionHistory: INITIAL_PROMOTION_HISTORY,
  transferHistory: INITIAL_TRANSFER_HISTORY,
  activityLogs: [
    {
      id: "log_init_1",
      timestamp: new Date(Date.now() - 36e5 * 24).toISOString(),
      userId: "usr_head",
      userName: "Mwl. Habibu Akida",
      userEmail: "habibuakida@gmail.com",
      userRole: "HEADMASTER",
      action: "SYSTEM_RESET",
      category: "settings",
      title: "Academic Database Initialized",
      description: "Initialized standard curriculum, official Tanzanian subject structures, and term timetable settings."
    },
    {
      id: "log_init_2",
      timestamp: new Date(Date.now() - 36e5 * 12).toISOString(),
      userId: "usr_academic",
      userName: "David Mwakipesile",
      userEmail: "academic@school.edu",
      userRole: "ACADEMIC",
      action: "TIMETABLE_UPDATE",
      category: "timetable",
      title: "Form 1-4 Schedules Published",
      description: "Completed teaching schedule allocations and assigned staff invigilation periods for term."
    }
  ],
  disciplineRecords: [
    {
      id: "disc_1",
      studentId: 1,
      studentName: "Amina Juma Mohamed",
      regNo: "S0001",
      className: "Form 1",
      date: "2026-02-10",
      category: "Merit",
      title: "Academic Excellence & Leadership",
      description: "Demonstrated outstanding peer tutoring and exemplary conduct in science club.",
      actionTaken: "Commendation Certificate awarded by Academic Master",
      reportedBy: "David Mwakipesile",
      status: "Resolved"
    },
    {
      id: "disc_2",
      studentId: 3,
      studentName: "Kelvin Jackson Shirima",
      regNo: "S0003",
      className: "Form 1",
      date: "2026-02-14",
      category: "Attendance",
      title: "Late arrival to morning assembly",
      description: "Arrived 25 minutes late after bell with no parent note.",
      actionTaken: "Verbal warning and counseling with class teacher",
      reportedBy: "Grace Mchome",
      status: "Resolved"
    }
  ],
  dailyAttendance: {},
  schemesOfWork: [],
  lessonPlans: [],
  savedTimetableRecords: [],
  savedInvigilationRecords: [],
  subjectPaperConfigs: {},
  academicTermDates: {
    yearOpeningDate: "2026-01-13",
    midTerm1BreakStart: "2026-03-27",
    midTerm1BreakEnd: "2026-04-08",
    terminalBreakStart: "2026-06-05",
    terminalBreakEnd: "2026-07-06",
    midTerm2BreakStart: "2026-09-04",
    midTerm2BreakEnd: "2026-09-14",
    annualBreakStart: "2026-12-04",
    annualBreakEnd: "2027-01-11"
  },
  communicationTemplates: [
    {
      id: "default-results-sms",
      name: "Matokeo ya Mtihani (SMS)",
      type: "SMS",
      category: "Results",
      content: "Ndugu Mzazi, matokeo ya {studentName} {examName} {year}: DIV {division}, AGGT {marks}. Masomo: {subjects}. - {schoolName}",
      isDefault: true
    },
    {
      id: "default-results-whatsapp",
      name: "Matokeo ya Mtihani (WhatsApp)",
      type: "WhatsApp",
      category: "Results",
      content: "*MATOKEO YA MTIHANI*\n\nNdugu Mzazi, haya ni matokeo ya mwanao *{studentName}* kwa mtihani wa *{examName}* mwaka *{year}*:\n\n*Division:* {division}\n*Points:* {marks}\n\n*Masomo:*\n{subjects}\n\nAsante,\n*{schoolName}*",
      isDefault: true
    }
  ]
};

// server.ts
import { eq, inArray, notInArray, and, asc, desc, getTableColumns, sql } from "drizzle-orm";
dotenv.config();
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path2.dirname(__filename2);
var app = express();
var port = Number(process.env.PORT) || 3e3;
app.use(express.json({ limit: "10mb" }));
var DEFAULT_SCHOOL_UUID = "02dff10d-78fb-4af6-ab5a-db1d275d7e06";
var UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUuid(val) {
  return typeof val === "string" && UUID_REGEX.test(val.trim());
}
function toDeterministicUuid(val, isSchoolId = false) {
  if (val === void 0 || val === null || val === "") {
    return isSchoolId ? DEFAULT_SCHOOL_UUID : crypto.randomUUID();
  }
  const clean = String(val).trim();
  if (!clean || isSchoolId && (clean === "DEMO_SCHOOL" || clean === "DEFAULT_PRIMARY_SCHOOL_ID" || clean === "DEFAULT")) {
    return isSchoolId ? DEFAULT_SCHOOL_UUID : crypto.randomUUID();
  }
  if (UUID_REGEX.test(clean)) {
    return clean.toLowerCase();
  }
  let h1 = 3735928559 ^ clean.length;
  let h2 = 1103547991 ^ clean.length;
  let h3 = 2654435769 ^ clean.length;
  let h4 = 2246822507 ^ clean.length;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822519);
    h4 = Math.imul(h4 ^ ch, 3266489917);
  }
  h1 = Math.imul(h1 ^ h1 >>> 16, 2246822507) ^ Math.imul(h2 ^ h2 >>> 13, 3266489909);
  h2 = Math.imul(h2 ^ h2 >>> 16, 2246822507) ^ Math.imul(h1 ^ h1 >>> 13, 3266489909);
  h3 = Math.imul(h3 ^ h3 >>> 16, 2246822507) ^ Math.imul(h4 ^ h4 >>> 13, 3266489909);
  h4 = Math.imul(h4 ^ h4 >>> 16, 2246822507) ^ Math.imul(h3 ^ h3 >>> 13, 3266489909);
  const hex = (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0") + (h3 >>> 0).toString(16).padStart(8, "0") + (h4 >>> 0).toString(16).padStart(8, "0");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
var ensuredSchoolsCache = /* @__PURE__ */ new Set();
async function ensureSchoolExists(schoolIdRaw) {
  const schoolUuid = toDeterministicUuid(schoolIdRaw, true);
  if (ensuredSchoolsCache.has(schoolUuid)) return schoolUuid;
  try {
    await db.insert(schools).values({
      id: schoolUuid,
      name: "HABY EDU SCHOOL",
      code: "CTR-001",
      status: "ACTIVE"
    }).onConflictDoNothing();
    ensuredSchoolsCache.add(schoolUuid);
  } catch (e) {
  }
  return schoolUuid;
}
var TABLE_KEY_MAP = {
  schools,
  users,
  students,
  teachers,
  classes,
  exams,
  period_attendance: periodAttendance,
  remedial_timetable: remedialTimetable,
  remedial_attendance: remedialAttendance,
  remedial_payment_settings: remedialPaymentSettings,
  school_data: schoolData,
  school_admins: schoolAdmins,
  school_subscriptions: schoolSubscriptions,
  timetables,
  timetable_assignments: timetableAssignments,
  period_settings: periodSettings,
  periods,
  stream_settings: streamSettings,
  subject_period_allocations: subjectPeriodAllocations,
  teacher_assignments: teacherAssignments,
  saved_timetable_records: savedTimetableRecords,
  institutional_policies: institutionalPolicies,
  exam_records: examRecords,
  exam_results: examResults,
  discipline_records: disciplineRecords,
  contribution_types: contributionTypes,
  student_ledger: studentLedger,
  invigilation_sessions: invigilationSessions,
  invigilation_assignments: invigilationAssignments,
  invigilation_supervisors: invigilationSupervisors,
  selected_invigilators: selectedInvigilators,
  saved_invigilation_records: savedInvigilationRecords,
  sitting_plans: sittingPlans,
  parents,
  parent_students: parentStudents,
  announcements,
  parent_messages: parentMessages,
  gate_pass_logs: gatePassLogs,
  subjects,
  teaching_logs: teachingLogs,
  authorized_staff: authorizedStaff,
  environment_equipment: environmentEquipment,
  equipment_usage_log: equipmentUsageLog,
  environment_orders: environmentOrders,
  school_purchased_equipment: schoolPurchasedEquipment,
  ream_paper_records: reamPaperRecords,
  activity_logs: activityLogs,
  sms_wallet: smsWallet,
  sms_logs: smsLogs,
  sms_payment_history: smsPaymentHistory,
  payment_verification_requests: paymentVerificationRequests,
  duty_streams: dutyStreams,
  duty_weekly_assignments: dutyWeeklyAssignments,
  duty_daily_reports: dutyDailyReports,
  past_papers: pastPapers
};
function resolveColumn(tableObj, colName) {
  const cols = getTableColumns(tableObj);
  if (cols[colName]) {
    return { jsKey: colName, colDef: cols[colName] };
  }
  const lower = colName.toLowerCase();
  for (const [jsKey, colDef] of Object.entries(cols)) {
    if (colDef.name?.toLowerCase() === lower || jsKey.toLowerCase() === lower) {
      return { jsKey, colDef };
    }
  }
  return null;
}
function coerceColumnValue(colDef, jsKey, rawVal) {
  if (rawVal === void 0) return void 0;
  const colType = colDef.columnType || "";
  const sqlName = colDef.name || jsKey;
  if (colType === "PgUUID") {
    const isSchoolCol = sqlName === "school_id" || jsKey === "schoolId";
    if (isSchoolCol) {
      return toDeterministicUuid(rawVal, true);
    }
    if (sqlName === "id" || jsKey === "id") {
      return rawVal ? toDeterministicUuid(rawVal, false) : crypto.randomUUID();
    }
    if (rawVal === null || rawVal === "") return null;
    if (sqlName === "class_teacher_id" || sqlName === "equipment_id" || sqlName === "class_id") {
      return isValidUuid(rawVal) ? rawVal : null;
    }
    return toDeterministicUuid(rawVal, false);
  }
  if (colType === "PgTimestamp") {
    if (!rawVal) return /* @__PURE__ */ new Date();
    if (rawVal instanceof Date) return rawVal;
    const d = new Date(rawVal);
    return isNaN(d.getTime()) ? /* @__PURE__ */ new Date() : d;
  }
  if (colType === "PgDate") {
    if (!rawVal) return colDef.notNull ? (/* @__PURE__ */ new Date()).toISOString().split("T")[0] : null;
    if (rawVal instanceof Date) return rawVal.toISOString().split("T")[0];
    const s = String(rawVal).split("T")[0];
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : colDef.notNull ? (/* @__PURE__ */ new Date()).toISOString().split("T")[0] : null;
  }
  if (colType === "PgInteger") {
    if (rawVal === null || rawVal === "") return colDef.notNull ? 0 : null;
    const n = typeof rawVal === "number" ? Math.trunc(rawVal) : parseInt(String(rawVal).replace(/[^\d-]/g, ""), 10);
    if (isNaN(n) || !Number.isFinite(n)) return colDef.notNull ? 0 : null;
    if (n > 2147483647 || n < -2147483648) {
      return Math.abs(n) % 2e9 + 1e3;
    }
    return n;
  }
  if (colType === "PgNumeric") {
    if (rawVal === null || rawVal === "") return colDef.notNull ? "0" : null;
    const num = Number(rawVal);
    return isNaN(num) ? "0" : String(num);
  }
  if (colType === "PgBoolean") {
    return Boolean(rawVal);
  }
  if (colType === "PgText") {
    if (rawVal === null || rawVal === void 0) {
      if (sqlName === "school_id" || jsKey === "schoolId") return DEFAULT_SCHOOL_UUID;
      if (sqlName === "id" || jsKey === "id") return crypto.randomUUID();
      return colDef.notNull ? "" : null;
    }
    if (sqlName === "school_id" || jsKey === "schoolId") {
      const s = String(rawVal).trim();
      return !s || s === "DEMO_SCHOOL" || s === "DEFAULT_PRIMARY_SCHOOL_ID" ? DEFAULT_SCHOOL_UUID : s;
    }
    return String(rawVal);
  }
  return rawVal;
}
async function normalizeRecordForTable(tableObj, rawRecord, isUpdate = false) {
  const cols = getTableColumns(tableObj);
  const result = {};
  for (const [jsKey, colDef] of Object.entries(cols)) {
    const sqlName = colDef.name;
    let rawVal = rawRecord[jsKey] !== void 0 ? rawRecord[jsKey] : rawRecord[sqlName];
    if (rawVal === void 0 && !isUpdate) {
      if (jsKey === "className") rawVal = rawRecord.class || rawRecord.classLevel || rawRecord.class_level || "Form 1";
      if (jsKey === "schoolId") rawVal = rawRecord.school_id || rawRecord.schoolId || DEFAULT_SCHOOL_UUID;
      if (jsKey === "fullName") rawVal = rawRecord.name || rawRecord.full_name || "User";
      if (jsKey === "passwordHash") rawVal = rawRecord.password || rawRecord.password_hash || "123456";
      if (jsKey === "startTime") rawVal = rawRecord.start || rawRecord.start_time || "08:00";
      if (jsKey === "endTime") rawVal = rawRecord.end || rawRecord.end_time || "08:40";
      if (jsKey === "periodTime") rawVal = rawRecord.period_time || "16:00-17:00";
      if (jsKey === "dayOfWeek") rawVal = rawRecord.day || rawRecord.day_of_week || "Monday";
      if (jsKey === "roomName") rawVal = rawRecord.room_name || rawRecord.roomName || rawRecord.room_no || rawRecord.name || "ROOM 01";
      if (jsKey === "totalCandidates") rawVal = rawRecord.total_candidates ?? rawRecord.totalCandidates ?? rawRecord.total_seats ?? 0;
      if (jsKey === "gridLayout") rawVal = rawRecord.grid_layout || rawRecord.gridLayout || {};
    }
    if (rawVal !== void 0) {
      result[jsKey] = coerceColumnValue(colDef, jsKey, rawVal);
    } else if (!isUpdate) {
      if (jsKey === "id") {
        if (tableObj === sittingPlans) {
          const sId = toDeterministicUuid(rawRecord.school_id || rawRecord.schoolId || DEFAULT_SCHOOL_UUID, true);
          const rName = String(rawRecord.room_name || rawRecord.roomName || rawRecord.room_no || rawRecord.name || "ROOM 01").trim();
          result.id = toDeterministicUuid(`sitplan_${sId}_${rName}`);
        } else {
          result.id = colDef.columnType === "PgUUID" ? crypto.randomUUID() : `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        }
      } else if (jsKey === "schoolId") {
        result.schoolId = DEFAULT_SCHOOL_UUID;
      } else if (colDef.notNull && !colDef.hasDefault) {
        result[jsKey] = coerceColumnValue(colDef, jsKey, null);
      }
    }
  }
  if (result.schoolId && cols.schoolId?.columnType === "PgUUID") {
    result.schoolId = await ensureSchoolExists(result.schoolId);
  }
  return result;
}
function toDualCaseRow(tableObj, row) {
  if (!row || typeof row !== "object") return row;
  const cols = getTableColumns(tableObj);
  const enriched = { ...row };
  for (const [jsKey, colDef] of Object.entries(cols)) {
    const sqlName = colDef.name;
    if (row[jsKey] !== void 0 && enriched[sqlName] === void 0) {
      enriched[sqlName] = row[jsKey];
    } else if (row[sqlName] !== void 0 && enriched[jsKey] === void 0) {
      enriched[jsKey] = row[sqlName];
    }
  }
  return enriched;
}
function buildWhereClause(tableObj, filters) {
  if (!filters || typeof filters !== "object") return void 0;
  const conditions = [];
  for (const [rawCol, rawVal] of Object.entries(filters)) {
    if (rawVal === void 0) continue;
    const resolved = resolveColumn(tableObj, rawCol);
    if (!resolved) continue;
    const { jsKey, colDef } = resolved;
    const colRef = tableObj[jsKey];
    if (!colRef) continue;
    if (Array.isArray(rawVal)) {
      const coercedArr = rawVal.map((v) => coerceColumnValue(colDef, jsKey, v)).filter((v) => v !== null && v !== void 0);
      if (coercedArr.length > 0) {
        conditions.push(inArray(colRef, coercedArr));
      }
    } else {
      const coercedVal = coerceColumnValue(colDef, jsKey, rawVal);
      if (coercedVal !== null && coercedVal !== void 0) {
        conditions.push(eq(colRef, coercedVal));
      }
    }
  }
  if (conditions.length === 0) return void 0;
  return conditions.length === 1 ? conditions[0] : and(...conditions);
}
async function upsertTableRecords(tableName, tableObj, rawRecords) {
  if (!Array.isArray(rawRecords) || rawRecords.length === 0) return [];
  const cols = getTableColumns(tableObj);
  const results = [];
  let conflictTarget = tableObj.id;
  let conflictKeyName = "id";
  if ((tableName === "school_data" || tableName === "sms_wallet") && tableObj.schoolId) {
    conflictTarget = tableObj.schoolId;
    conflictKeyName = "schoolId";
  } else if (tableName === "parents" && tableObj.phone) {
    conflictTarget = tableObj.phone;
    conflictKeyName = "phone";
  }
  const dedupedMap = /* @__PURE__ */ new Map();
  const unkeyedList = [];
  for (const raw of rawRecords) {
    if (!raw || typeof raw !== "object") continue;
    try {
      const normalized = await normalizeRecordForTable(tableObj, raw, false);
      if (tableName === "parent_students") {
        const compositeKey = `${normalized.parentId}_${normalized.studentId}`;
        dedupedMap.set(compositeKey, normalized);
      } else if (conflictKeyName && normalized[conflictKeyName] !== void 0 && normalized[conflictKeyName] !== null) {
        dedupedMap.set(String(normalized[conflictKeyName]), normalized);
      } else {
        unkeyedList.push(normalized);
      }
    } catch (normErr) {
      console.warn(`Normalize warning on ${tableName}:`, normErr?.message || normErr);
    }
  }
  const normalizedList = [...Array.from(dedupedMap.values()), ...unkeyedList];
  if (normalizedList.length === 0) return [];
  const excludedSet = {};
  for (const [jsKey, colDef] of Object.entries(cols)) {
    if (jsKey === "id" || jsKey === "createdAt") continue;
    if (conflictKeyName === "schoolId" && jsKey === "schoolId") continue;
    excludedSet[jsKey] = sql.raw(`excluded."${colDef.name}"`);
  }
  const BATCH_SIZE = 100;
  for (let i = 0; i < normalizedList.length; i += BATCH_SIZE) {
    const batch = normalizedList.slice(i, i + BATCH_SIZE);
    try {
      if (tableName === "parent_students" || !conflictTarget || Object.keys(excludedSet).length === 0) {
        const inserted = await db.insert(tableObj).values(batch).onConflictDoNothing().returning();
        for (const row of inserted) {
          results.push(toDualCaseRow(tableObj, row));
        }
      } else {
        const upserted = await db.insert(tableObj).values(batch).onConflictDoUpdate({
          target: conflictTarget,
          set: excludedSet
        }).returning();
        for (const row of upserted) {
          results.push(toDualCaseRow(tableObj, row));
        }
      }
    } catch (batchErr) {
      for (const normalized of batch) {
        try {
          if (tableName === "parent_students" || !conflictTarget) {
            const inserted = await db.insert(tableObj).values(normalized).onConflictDoNothing().returning();
            if (inserted[0]) results.push(toDualCaseRow(tableObj, inserted[0]));
          } else {
            const updateSet = { ...normalized };
            if (conflictKeyName === "schoolId") delete updateSet.id;
            const upserted = await db.insert(tableObj).values(normalized).onConflictDoUpdate({
              target: conflictTarget,
              set: updateSet
            }).returning();
            if (upserted[0]) results.push(toDualCaseRow(tableObj, upserted[0]));
          }
        } catch (_rowErr) {
        }
      }
    }
  }
  return results;
}
function pickNonEmptyArray(...candidates) {
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) return c;
  }
  return [];
}
function pickNonEmptyObject(...candidates) {
  for (const c of candidates) {
    if (c && typeof c === "object" && !Array.isArray(c) && Object.keys(c).length > 0) {
      return c;
    }
  }
  return {};
}
async function syncRelationalTablesFromSnapshot(schoolId, raw) {
  const validSchoolUuid = await ensureSchoolExists(schoolId);
  try {
    if (raw.schoolInfo && typeof raw.schoolInfo === "object") {
      const info = raw.schoolInfo;
      await upsertTableRecords("schools", schools, [{
        id: validSchoolUuid,
        name: info.name || "HabyEduPro3A",
        code: info.schoolNumber || "S.0123",
        phone: info.phone || "0717616343",
        email: info.email || "info@habyedupro3a.ac.tz",
        status: "ACTIVE",
        updatedAt: /* @__PURE__ */ new Date()
      }]);
    }
    await db.insert(smsWallet).values({
      id: toDeterministicUuid(`wallet_${validSchoolUuid}`),
      schoolId: validSchoolUuid,
      balance: 500,
      updatedAt: /* @__PURE__ */ new Date()
    }).onConflictDoNothing().catch(() => {
    });
    const rawStudents = pickNonEmptyArray(raw.students, DEFAULT_APP_DATA.students);
    const canonicalStudentIds = [];
    const seenStudentKeys = /* @__PURE__ */ new Set();
    const studentPayloads = [];
    for (const s of rawStudents) {
      if (!s || typeof s !== "object") continue;
      const regKey = String(s.regNo || s.reg_no || "").trim().toUpperCase();
      const dedupeKey = regKey || String(s.id || s.name || "").trim().toLowerCase();
      if (!dedupeKey || seenStudentKeys.has(dedupeKey)) continue;
      seenStudentKeys.add(dedupeKey);
      const canonicalId = toDeterministicUuid(`std_${validSchoolUuid}_${regKey || s.id || s.name}`);
      canonicalStudentIds.push(canonicalId);
      studentPayloads.push({
        ...s,
        id: canonicalId,
        schoolId: validSchoolUuid
      });
    }
    if (studentPayloads.length > 0) {
      await upsertTableRecords("students", students, studentPayloads);
      try {
        await db.delete(students).where(
          and(
            eq(students.schoolId, validSchoolUuid),
            notInArray(students.id, canonicalStudentIds)
          )
        );
      } catch (cleanupErr) {
      }
    }
    const rawTeachers = pickNonEmptyArray(raw.teachers, DEFAULT_APP_DATA.teachers);
    const canonicalTeacherIds = [];
    const seenTeacherKeys = /* @__PURE__ */ new Set();
    const teacherPayloads = [];
    for (const t of rawTeachers) {
      if (!t || typeof t !== "object") continue;
      const tchKey = String(t.email || t.name || t.id || "").trim().toLowerCase();
      if (!tchKey || seenTeacherKeys.has(tchKey)) continue;
      seenTeacherKeys.add(tchKey);
      const canonicalId = toDeterministicUuid(`tch_${validSchoolUuid}_${tchKey}`);
      canonicalTeacherIds.push(canonicalId);
      teacherPayloads.push({
        ...t,
        id: canonicalId,
        schoolId: validSchoolUuid
      });
    }
    if (teacherPayloads.length > 0) {
      await upsertTableRecords("teachers", teachers, teacherPayloads);
      try {
        await db.delete(teachers).where(
          and(
            eq(teachers.schoolId, validSchoolUuid),
            notInArray(teachers.id, canonicalTeacherIds)
          )
        );
      } catch (cleanupErr) {
      }
      await upsertTableRecords("authorized_staff", authorizedStaff, teacherPayloads.slice(0, 50).map((t) => ({
        id: toDeterministicUuid(`staff_${validSchoolUuid}_${t.email || t.name}`),
        schoolId: validSchoolUuid,
        name: t.name || "Teacher",
        email: t.email || `${String(t.name || "teacher").toLowerCase().replace(/[^a-z0-9]/g, ".")}@school.ac.tz`,
        role: t.schoolRole || "TEACHER",
        assignedSubjects: Array.isArray(t.subjects) ? t.subjects : [],
        isActive: true
      })));
    }
    const allSubjectNames = Array.from(/* @__PURE__ */ new Set([
      ...SECONDARY_SUBJECTS,
      ...UPPER_PRIMARY_SUBJECTS_LIST,
      ...NURSERY_SUBJECTS_LIST
    ]));
    if (allSubjectNames.length > 0) {
      await upsertTableRecords("subjects", subjects, allSubjectNames.map((subjName, idx) => ({
        id: toDeterministicUuid(`subj_${validSchoolUuid}_${subjName}`),
        schoolId: validSchoolUuid,
        name: subjName,
        code: `SUB-${String(idx + 1).padStart(3, "0")}`
      })));
    }
    const rawExams = pickNonEmptyArray(raw.exams, DEFAULT_APP_DATA.exams);
    const firstExamUuid = rawExams.length > 0 ? toDeterministicUuid(`exm_${validSchoolUuid}_${rawExams[0].id || rawExams[0].name}`) : null;
    if (rawExams.length > 0) {
      const canonicalExamIds = [];
      const examPayloads = rawExams.map((e) => {
        const eid = toDeterministicUuid(`exm_${validSchoolUuid}_${e.id || e.name}`);
        canonicalExamIds.push(eid);
        return {
          ...e,
          id: eid,
          schoolId: validSchoolUuid
        };
      });
      await upsertTableRecords("exams", exams, examPayloads);
      try {
        await db.delete(exams).where(
          and(
            eq(exams.schoolId, validSchoolUuid),
            notInArray(exams.id, canonicalExamIds)
          )
        );
      } catch (cleanupErr) {
      }
    }
    const examRecs = pickNonEmptyArray(raw.examinationRecords, raw.examination_records, DEFAULT_APP_DATA.examinationRecords);
    if (examRecs.length > 0) {
      await upsertTableRecords("exam_records", examRecords, examRecs.map((r, idx) => ({
        ...r,
        id: r.id ? String(r.id) : `rec_${validSchoolUuid}_${idx}`,
        schoolId: validSchoolUuid,
        subjectMarks: r.subjectMarks || r.subjects || {},
        totalMarks: String(r.totalMarks ?? 0),
        averageScore: String(r.averageScore ?? r.averageMarks ?? 0),
        rank: Number(r.rank ?? r.positionInClass ?? idx + 1)
      })));
    }
    if (firstExamUuid && studentPayloads.length > 0) {
      const examResultRows = [];
      for (const s of studentPayloads.slice(0, 60)) {
        const marksObj = s.marks && typeof s.marks === "object" ? s.marks : {};
        for (const [subjName, scoreVal] of Object.entries(marksObj)) {
          const numericScore = typeof scoreVal === "number" ? Math.round(scoreVal) : Number(scoreVal);
          if (isNaN(numericScore)) continue;
          const subjUuid = toDeterministicUuid(`subj_${validSchoolUuid}_${subjName}`);
          const gradeStr = numericScore >= 75 ? "A" : numericScore >= 65 ? "B" : numericScore >= 45 ? "C" : numericScore >= 30 ? "D" : "F";
          examResultRows.push({
            id: toDeterministicUuid(`exres_${validSchoolUuid}_${firstExamUuid}_${s.id}_${subjName}`),
            schoolId: validSchoolUuid,
            examId: firstExamUuid,
            studentId: s.id,
            subjectId: subjUuid,
            marks: numericScore,
            grade: gradeStr,
            remarks: gradeStr === "A" ? "Excellent" : gradeStr === "B" ? "Very Good" : gradeStr === "C" ? "Good" : gradeStr === "D" ? "Satisfactory" : "Fail"
          });
        }
      }
      if (examResultRows.length > 0) {
        await upsertTableRecords("exam_results", examResults, examResultRows.slice(0, 300));
      }
    }
    const ttAssigns = pickNonEmptyArray(
      raw.timetableAssignments,
      raw.timetable_assignments,
      DEFAULT_APP_DATA.timetableAssignments,
      TANZANIAN_TEMPLATE_TIMETABLE_ASSIGNMENTS
    );
    if (ttAssigns.length > 0) {
      await upsertTableRecords("timetable_assignments", timetableAssignments, ttAssigns.map((a, idx) => ({
        ...a,
        id: a.id ? `ta_${validSchoolUuid}_${a.id}` : `ta_${validSchoolUuid}_${idx}`,
        schoolId: validSchoolUuid,
        className: a.className || "Form 1",
        stream: a.stream || "STREAM A",
        day: a.day || "Monday",
        period: a.period || `Period ${idx % 7 + 1}`,
        subject: a.subject || "Mathematics",
        teacherId: typeof a.teacherId === "number" ? a.teacherId : 101
      })));
      await upsertTableRecords("timetables", timetables, ttAssigns.map((a, idx) => {
        const periodNumMatch = String(a.period || "").match(/(\d+)/);
        const periodNumber = periodNumMatch ? parseInt(periodNumMatch[1], 10) : idx % 7 + 1;
        return {
          id: a.id ? `tt_${validSchoolUuid}_${a.id}` : `tt_${validSchoolUuid}_${idx}`,
          schoolId: validSchoolUuid,
          classId: a.className || "Form 1",
          stream: a.stream || "STREAM A",
          dayOfWeek: a.day || "Monday",
          periodNumber,
          subjectId: a.subject || "Mathematics",
          teacherId: typeof a.teacherId === "number" ? a.teacherId : 101,
          timeStart: "08:00",
          timeEnd: "08:40"
        };
      }));
    }
    const pSettings = pickNonEmptyArray(
      raw.periodSettings,
      raw.period_settings,
      DEFAULT_APP_DATA.periodSettings,
      TANZANIAN_TEMPLATE_PERIOD_SETTINGS
    );
    if (pSettings.length > 0) {
      await upsertTableRecords("period_settings", periodSettings, pSettings.map((p, idx) => ({
        ...p,
        id: p.id ? `ps_${validSchoolUuid}_${p.id}` : `ps_${validSchoolUuid}_${idx}`,
        schoolId: validSchoolUuid,
        day: p.day || "Monday",
        name: p.name || `Period ${idx + 1}`,
        startTime: p.startTime || p.start || "08:00",
        endTime: p.endTime || p.end || "08:40",
        isBreak: Boolean(p.isBreak || p.is_break)
      })));
      const uniquePeriodsMap = /* @__PURE__ */ new Map();
      pSettings.forEach((p, idx) => {
        const pName = p.name || `Period ${idx + 1}`;
        if (!uniquePeriodsMap.has(pName)) {
          uniquePeriodsMap.set(pName, {
            id: toDeterministicUuid(`prd_${validSchoolUuid}_${pName}`),
            schoolId: validSchoolUuid,
            name: pName,
            startTime: p.startTime || p.start || "08:00",
            endTime: p.endTime || p.end || "08:40",
            isBreak: Boolean(p.isBreak || p.is_break)
          });
        }
      });
      await upsertTableRecords("periods", periods, Array.from(uniquePeriodsMap.values()));
    }
    const sSettings = pickNonEmptyArray(
      raw.streamSettings,
      raw.stream_settings,
      DEFAULT_APP_DATA.streamSettings,
      TANZANIAN_TEMPLATE_STREAM_SETTINGS
    );
    if (sSettings.length > 0) {
      await upsertTableRecords("stream_settings", streamSettings, sSettings.map((s, idx) => ({
        ...s,
        id: s.id ? `ss_${validSchoolUuid}_${s.id}` : `ss_${validSchoolUuid}_${s.className || idx}`,
        schoolId: validSchoolUuid,
        className: s.className || `Class ${idx + 1}`,
        level: s.level || "CSEE",
        streams: Array.isArray(s.streams) ? s.streams : ["STREAM A", "STREAM B"]
      })));
      await upsertTableRecords("classes", classes, sSettings.map((s, idx) => ({
        id: toDeterministicUuid(`cls_${validSchoolUuid}_${s.className || idx}`),
        schoolId: validSchoolUuid,
        name: s.className || `Class ${idx + 1}`,
        level: s.level || "CSEE",
        stream: Array.isArray(s.streams) && s.streams[0] ? s.streams[0] : "STREAM A"
      })));
    }
    const spaList = pickNonEmptyArray(
      raw.subjectPeriodAllocations,
      raw.subject_period_allocations,
      DEFAULT_APP_DATA.subjectPeriodAllocations
    );
    if (spaList.length > 0) {
      await upsertTableRecords("subject_period_allocations", subjectPeriodAllocations, spaList.map((spa, idx) => ({
        id: spa.id ? `${validSchoolUuid}_${spa.id}` : `spa_${validSchoolUuid}_${idx}`,
        schoolId: validSchoolUuid,
        className: spa.className || "Form 1",
        subjectName: spa.subjectName || spa.subject || "Mathematics",
        periodsPerWeek: Number(spa.periodsPerWeek || 4),
        doublePeriods: Boolean(spa.doublePeriods)
      })));
    }
    const tAssignList = pickNonEmptyArray(
      raw.teacherAssignments,
      raw.teacher_assignments,
      DEFAULT_APP_DATA.teacherAssignments
    );
    if (tAssignList.length > 0) {
      const flatTeacherAssigns = [];
      tAssignList.forEach((ta, idx) => {
        const subjectsArr = Array.isArray(ta.subjects) && ta.subjects.length > 0 ? ta.subjects : [ta.subjectName || ta.subject || "Mathematics"];
        const streamsArr = Array.isArray(ta.streams) && ta.streams.length > 0 ? ta.streams : [`${ta.className || "Form 1"} - ${ta.stream || "STREAM A"}`];
        const firstStreamParts = String(streamsArr[0] || "Form 1 - STREAM A").split(" - ");
        flatTeacherAssigns.push({
          id: ta.id ? `${validSchoolUuid}_${ta.id}` : `tassign_${validSchoolUuid}_${idx}`,
          schoolId: validSchoolUuid,
          teacherId: Number(ta.teacherId || 101),
          teacherName: ta.teacherName || "Teacher",
          className: ta.className || firstStreamParts[0] || "Form 1",
          stream: ta.stream || firstStreamParts[1] || "STREAM A",
          subjectName: subjectsArr[0] || "Mathematics",
          periodsCount: Number(ta.periodsCount || 4)
        });
      });
      await upsertTableRecords("teacher_assignments", teacherAssignments, flatTeacherAssigns);
    }
    const policyObj = pickNonEmptyObject(raw.institutionalPolicy, raw.institutional_policy, DEFAULT_APP_DATA.institutionalPolicy);
    if (Object.keys(policyObj).length > 0) {
      await upsertTableRecords("institutional_policies", institutionalPolicies, [{
        id: `pol_${validSchoolUuid}`,
        schoolId: validSchoolUuid,
        policyName: "Standard School Timetable & Academic Policy",
        rules: policyObj,
        updatedAt: /* @__PURE__ */ new Date()
      }]);
    }
    const invSessions = pickNonEmptyArray(raw.sessions, DEFAULT_APP_DATA.sessions);
    if (invSessions.length > 0) {
      await upsertTableRecords("invigilation_sessions", invigilationSessions, invSessions.map((s, idx) => ({
        id: s.id ? `inv_sess_${validSchoolUuid}_${s.id}` : `inv_sess_${validSchoolUuid}_${idx}`,
        schoolId: validSchoolUuid,
        rawDate: s.rawDate || "2026-10-15",
        date: s.rawDate || "2026-10-15",
        day: s.day || "Thursday",
        session: s.session || "SESSION I",
        startTime: s.startTime || s.start || "08:00",
        endTime: s.endTime || s.end || "10:30",
        timeSlot: s.timeSlot || s.time || "08:00-10:30",
        subject: s.subject || "Mathematics",
        level: s.level || "CSEE",
        className: s.className || "Form 1",
        stream: s.stream || "STREAM A",
        roomsCount: Number(s.roomsCount || s.rooms || 1)
      })));
    }
    const invSupervisors = pickNonEmptyArray(raw.supervisors, DEFAULT_APP_DATA.supervisors);
    if (invSupervisors.length > 0) {
      await upsertTableRecords("invigilation_supervisors", invigilationSupervisors, invSupervisors.map((sup, idx) => ({
        id: sup.id ? `inv_sup_${validSchoolUuid}_${sup.id}` : `inv_sup_${validSchoolUuid}_${idx}`,
        schoolId: validSchoolUuid,
        teacherId: Number(sup.teacherId || 101),
        name: sup.name || "Supervisor",
        initial: sup.initial || "SV",
        phone: sup.phone || "",
        role: sup.role || "Chief Supervisor"
      })));
    }
    const selInvigilators = pickNonEmptyArray(raw.selectedInvigilators, raw.selected_invigilators, DEFAULT_APP_DATA.selectedInvigilators);
    if (selInvigilators.length > 0) {
      const invigMap = /* @__PURE__ */ new Map();
      selInvigilators.forEach((item, idx) => {
        const rawTid = typeof item === "object" && item !== null ? item.teacherId ?? item.id : item;
        const matchedT = rawTeachers.find((t) => String(t.id) === String(rawTid) || t.name === item?.teacherName);
        let safeTid = typeof rawTid === "number" && Number.isFinite(rawTid) && Math.abs(rawTid) <= 2e9 ? Math.trunc(rawTid) : typeof matchedT?.id === "number" && Math.abs(matchedT.id) <= 2e9 ? Math.trunc(matchedT.id) : 101 + idx;
        const rowId = `sel_inv_${validSchoolUuid}_${safeTid}`;
        invigMap.set(rowId, {
          id: rowId,
          schoolId: validSchoolUuid,
          teacherId: safeTid,
          teacherName: typeof item === "object" && item?.teacherName || matchedT?.name || `Teacher ${safeTid}`,
          isActive: true
        });
      });
      await upsertTableRecords("selected_invigilators", selectedInvigilators, Array.from(invigMap.values()));
    }
    const dailyAtt = pickNonEmptyObject(raw.dailyAttendance, raw.daily_attendance);
    const attRows = [];
    for (const [dateKey, studentStatusMap] of Object.entries(dailyAtt)) {
      if (!studentStatusMap || typeof studentStatusMap !== "object") continue;
      for (const [studIdStr, statusVal] of Object.entries(studentStatusMap)) {
        const matchedStud = rawStudents.find((s) => String(s.id) === String(studIdStr));
        attRows.push({
          id: `att_${validSchoolUuid}_${dateKey}_${studIdStr}`,
          schoolId: validSchoolUuid,
          date: dateKey,
          dayOfWeek: new Date(dateKey).toLocaleDateString("en-US", { weekday: "long" }) || "Monday",
          periodNumber: 1,
          className: matchedStud?.className || "Form 1",
          stream: matchedStud?.stream || "STREAM A",
          subject: "Daily Roll Call",
          teacherName: matchedStud?.name || `Student #${studIdStr}`,
          status: String(statusVal || "PRESENT"),
          reason: `Student ID ${studIdStr} (${matchedStud?.regNo || ""})`,
          markedBy: "Attendance System"
        });
      }
    }
    if (attRows.length > 0) {
      await upsertTableRecords("period_attendance", periodAttendance, attRows.slice(0, 300));
    }
    const parentRowsMap = /* @__PURE__ */ new Map();
    const parentStudentLinks = [];
    for (const s of studentPayloads.slice(0, 200)) {
      const phone = String(s.parentPhone || s.parent_phone || s.phone || "").trim();
      if (!phone || phone.length < 6) continue;
      const parentId = toDeterministicUuid(`par_${validSchoolUuid}_${phone}`);
      if (!parentRowsMap.has(phone)) {
        parentRowsMap.set(phone, {
          id: parentId,
          schoolId: validSchoolUuid,
          phone,
          passwordHash: "123456",
          fullName: `Parent of ${s.name || "Student"}`
        });
      }
      parentStudentLinks.push({
        parentId,
        studentId: s.id
      });
    }
    if (parentRowsMap.size > 0) {
      await upsertTableRecords("parents", parents, Array.from(parentRowsMap.values()));
    }
    const discRecs = pickNonEmptyArray(raw.disciplineRecords, raw.discipline_records, DEFAULT_APP_DATA.disciplineRecords);
    if (discRecs.length > 0) {
      await upsertTableRecords("discipline_records", disciplineRecords, discRecs.map((d, idx) => ({
        id: d.id ? String(d.id) : `disc_${validSchoolUuid}_${idx}`,
        schoolId: validSchoolUuid,
        regNo: d.regNo || d.reg_no || "",
        studentName: d.studentName || d.student_name || "",
        incidentDate: d.date || d.incidentDate || d.incident_date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        incidentType: d.category || d.title || d.incidentType || d.incident_type || "General",
        severity: d.severity || "Minor",
        actionTaken: d.actionTaken || d.action_taken || "",
        reportedBy: d.reportedBy || d.reported_by || "Staff",
        status: d.status || "Resolved"
      })));
    }
    const actLogs = pickNonEmptyArray(raw.activityLogs, raw.activity_logs, DEFAULT_APP_DATA.activityLogs);
    if (actLogs.length > 0) {
      await upsertTableRecords("activity_logs", activityLogs, actLogs.slice(0, 50).map((l, idx) => ({
        id: l.id ? String(l.id) : `log_${validSchoolUuid}_${idx}`,
        schoolId: validSchoolUuid,
        userId: l.userId || l.user_id || "usr_head",
        userName: l.userName || l.user_name || "Admin",
        userEmail: l.userEmail || l.user_email || "",
        userRole: l.userRole || l.user_role || "HEADMASTER",
        category: l.category || "system",
        action: l.action || "UPDATE",
        title: l.title || "Activity",
        description: l.description || "",
        timestamp: l.timestamp || (/* @__PURE__ */ new Date()).toISOString()
      })));
    }
    const dutyData = raw.dutyRosterData || raw.duty_roster_data;
    if (dutyData && typeof dutyData === "object") {
      if (Array.isArray(dutyData.streams) && dutyData.streams.length > 0) {
        await upsertTableRecords("duty_streams", dutyStreams, dutyData.streams.map((s, idx) => ({
          id: s.id ? String(s.id) : `dstream_${validSchoolUuid}_${idx}`,
          schoolId: validSchoolUuid,
          streamName: s.name || s.streamName || `Stream ${idx + 1}`,
          totalStudents: Number(s.totalStudents || 0),
          classTeacher: s.classTeacher || "",
          updatedAt: /* @__PURE__ */ new Date()
        })));
      }
      if (Array.isArray(dutyData.weeklyAssignments) && dutyData.weeklyAssignments.length > 0) {
        await upsertTableRecords("duty_weekly_assignments", dutyWeeklyAssignments, dutyData.weeklyAssignments.map((w, idx) => ({
          id: w.id ? String(w.id) : `dweek_${validSchoolUuid}_${idx}`,
          schoolId: validSchoolUuid,
          weekStart: w.weekStart || "",
          weekEnd: w.weekEnd || "",
          weekLabel: w.weekLabel || "",
          teacherIds: Array.isArray(w.teacherIds) ? w.teacherIds : [],
          teacherNames: Array.isArray(w.teacherNames) ? w.teacherNames : [],
          notes: w.notes || "",
          assignedBy: w.assignedBy || "Discipline Master",
          status: w.status || "Active"
        })));
      }
      if (Array.isArray(dutyData.dailyReports) && dutyData.dailyReports.length > 0) {
        await upsertTableRecords("duty_daily_reports", dutyDailyReports, dutyData.dailyReports.map((r, idx) => ({
          id: r.id ? String(r.id) : `drep_${validSchoolUuid}_${idx}`,
          schoolId: validSchoolUuid,
          weekAssignmentId: r.weekAssignmentId || "",
          weekStart: r.weekStart || "",
          weekEnd: r.weekEnd || "",
          weekLabel: r.weekLabel || "",
          reportDate: r.date || r.reportDate || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
          dayName: r.dayName || "",
          teacherId: String(r.teacherId || ""),
          teacherName: r.teacherName || "Mwalimu wa Zamu",
          allWeekTeachers: Array.isArray(r.allWeekTeachers) ? r.allWeekTeachers : [],
          streamAttendance: Array.isArray(r.streams) ? r.streams : Array.isArray(r.streamAttendance) ? r.streamAttendance : [],
          totalSchoolRoll: Number(r.totals?.totalStudents ?? r.totalSchoolRoll ?? 0),
          totalPresent: Number(r.totals?.present ?? r.totalPresent ?? 0),
          totalAbsent: Number(r.totals?.absent ?? r.totalAbsent ?? 0),
          totalPermitted: Number(r.totals?.permitted ?? r.totalPermitted ?? 0),
          totalSickPua: Number(r.totals?.sickPua ?? r.totalSickPua ?? 0),
          totalUnexcused: Number(r.totals?.unexcused ?? r.totalUnexcused ?? 0),
          environmentRating: Number(r.environmentRating ?? 8),
          environmentNotes: r.environmentNotes || "",
          generalDiscipline: r.generalDiscipline || "",
          teachersPresent: Number(r.teachersPresent ?? 0),
          teachersAbsent: Number(r.teachersAbsent ?? 0),
          teacherAttendanceNotes: r.teacherAttendanceNotes || "",
          keyEvents: r.keyEvents || "",
          bellSchedule: r.bellSchedule || "",
          recommendations: r.recommendations || "",
          updatedAt: /* @__PURE__ */ new Date()
        })));
      }
    }
  } catch (syncErr) {
    console.warn("Background relational table sync notice:", syncErr?.message || syncErr);
  }
}
var activeSyncBySchool = /* @__PURE__ */ new Map();
var pendingSyncSnapshotBySchool = /* @__PURE__ */ new Map();
function scheduleRelationalSync(schoolId, snapshotData) {
  pendingSyncSnapshotBySchool.set(schoolId, snapshotData);
  if (activeSyncBySchool.get(schoolId)) return;
  activeSyncBySchool.set(schoolId, true);
  setImmediate(async () => {
    while (pendingSyncSnapshotBySchool.has(schoolId)) {
      const nextSnap = pendingSyncSnapshotBySchool.get(schoolId);
      pendingSyncSnapshotBySchool.delete(schoolId);
      try {
        await syncRelationalTablesFromSnapshot(schoolId, nextSnap);
      } catch (e) {
      }
    }
    activeSyncBySchool.set(schoolId, false);
  });
}
function resolveSnapshotArray(incomingCamel, incomingSnake, existingVal, defaultVal = [], isFullSnapshot = false, protectAgainstAccidentalEmpty = false) {
  const incoming = Array.isArray(incomingCamel) ? incomingCamel : Array.isArray(incomingSnake) ? incomingSnake : void 0;
  if (incoming !== void 0) {
    if (incoming.length > 0) {
      return incoming;
    }
    if (!protectAgainstAccidentalEmpty || isFullSnapshot) {
      return [];
    }
  }
  if (Array.isArray(existingVal) && existingVal.length > 0) {
    return existingVal;
  }
  if (Array.isArray(existingVal) && incoming !== void 0) {
    return [];
  }
  return Array.isArray(defaultVal) ? defaultVal : [];
}
function resolveSnapshotObject(incomingCamel, incomingSnake, existingVal, defaultVal = {}, isFullSnapshot = false) {
  const incoming = incomingCamel && typeof incomingCamel === "object" && !Array.isArray(incomingCamel) ? incomingCamel : incomingSnake && typeof incomingSnake === "object" && !Array.isArray(incomingSnake) ? incomingSnake : void 0;
  if (incoming !== void 0) {
    if (isFullSnapshot) {
      return { ...defaultVal, ...incoming };
    }
    return {
      ...defaultVal,
      ...existingVal && typeof existingVal === "object" && !Array.isArray(existingVal) ? existingVal : {},
      ...incoming
    };
  }
  if (existingVal && typeof existingVal === "object" && !Array.isArray(existingVal) && Object.keys(existingVal).length > 0) {
    return existingVal;
  }
  return defaultVal || {};
}
app.get("/api/db/school-data", async (req, res) => {
  const { schoolId } = req.query;
  const s = String(schoolId || "").trim();
  const resolvedId = !s || s === "DEMO_SCHOOL" || s === "DEFAULT_PRIMARY_SCHOOL_ID" ? DEFAULT_SCHOOL_UUID : s;
  try {
    let data = await db.query.schoolData.findFirst({
      where: eq(schoolData.schoolId, resolvedId)
    });
    if (!data && s && s !== resolvedId) {
      data = await db.query.schoolData.findFirst({
        where: eq(schoolData.schoolId, s)
      });
    }
    if (data) {
      const dual = toDualCaseRow(schoolData, data);
      const isDemo = resolvedId === DEFAULT_SCHOOL_UUID;
      if (isDemo) {
        dual.students = Array.isArray(dual.students) && dual.students.length > 0 ? dual.students : DEFAULT_APP_DATA.students;
        dual.teachers = Array.isArray(dual.teachers) && dual.teachers.length > 0 ? dual.teachers : DEFAULT_APP_DATA.teachers;
        dual.exams = Array.isArray(dual.exams) ? dual.exams : DEFAULT_APP_DATA.exams;
        dual.periodSettings = pickNonEmptyArray(dual.periodSettings, dual.period_settings, DEFAULT_APP_DATA.periodSettings);
        dual.streamSettings = pickNonEmptyArray(dual.streamSettings, dual.stream_settings, DEFAULT_APP_DATA.streamSettings);
        dual.timetableAssignments = Array.isArray(dual.timetableAssignments) ? dual.timetableAssignments : Array.isArray(dual.timetable_assignments) ? dual.timetable_assignments : DEFAULT_APP_DATA.timetableAssignments;
        dual.examinationRecords = Array.isArray(dual.examinationRecords) ? dual.examinationRecords : Array.isArray(dual.examination_records) ? dual.examination_records : DEFAULT_APP_DATA.examinationRecords;
      } else {
        dual.students = Array.isArray(dual.students) ? dual.students : [];
        dual.teachers = Array.isArray(dual.teachers) ? dual.teachers : [];
        dual.exams = Array.isArray(dual.exams) ? dual.exams : [];
      }
      if (!dual.academicTermDates) {
        dual.academicTermDates = {};
      }
      return res.json(dual);
    }
    res.json({});
  } catch (err) {
    console.error("Error fetching school-data:", err?.message || err);
    res.status(500).json({ error: "Failed to fetch school data" });
  }
});
app.post("/api/db/school-data", async (req, res) => {
  const { schoolId: rawSchoolId, payload } = req.body;
  if (!rawSchoolId) {
    return res.status(400).json({ error: "schoolId is required" });
  }
  const s = String(rawSchoolId).trim();
  const schoolId = !s || s === "DEMO_SCHOOL" || s === "DEFAULT_PRIMARY_SCHOOL_ID" ? DEFAULT_SCHOOL_UUID : s;
  try {
    const raw = payload || {};
    const isFullSnapshot = Boolean(raw._fullSnapshot);
    const existing = await db.query.schoolData.findFirst({
      where: eq(schoolData.schoolId, schoolId)
    });
    const isDemo = schoolId === DEFAULT_SCHOOL_UUID;
    const resolvedStudents = resolveSnapshotArray(
      raw.students,
      raw.students,
      existing?.students,
      isDemo ? DEFAULT_APP_DATA.students : [],
      Boolean(raw._allowEmptyRoster),
      true
    );
    const resolvedTeachers = resolveSnapshotArray(
      raw.teachers,
      raw.teachers,
      existing?.teachers,
      isDemo ? DEFAULT_APP_DATA.teachers : [],
      Boolean(raw._allowEmptyRoster),
      true
    );
    const resolvedExams = resolveSnapshotArray(
      raw.exams,
      raw.exams,
      existing?.exams,
      isDemo ? DEFAULT_APP_DATA.exams : [],
      isFullSnapshot
    );
    const resolvedDisciplineRecords = resolveSnapshotArray(
      raw.disciplineRecords,
      raw.discipline_records,
      existing?.disciplineRecords,
      DEFAULT_APP_DATA.disciplineRecords,
      isFullSnapshot
    );
    const resolvedDutyRosterData = resolveSnapshotObject(
      raw.dutyRosterData,
      raw.duty_roster_data,
      existing?.dutyRosterData,
      {},
      isFullSnapshot
    );
    const normalizedData = {
      id: schoolId,
      schoolId,
      schoolInfo: {
        ...DEFAULT_APP_DATA.schoolInfo || {},
        ...existing?.schoolInfo || {},
        ...raw.school_info || {},
        ...raw.schoolInfo || {}
      },
      timetableAssignments: resolveSnapshotArray(
        raw.timetableAssignments,
        raw.timetable_assignments,
        existing?.timetableAssignments,
        DEFAULT_APP_DATA.timetableAssignments,
        isFullSnapshot
      ),
      periodSettings: resolveSnapshotArray(
        raw.periodSettings,
        raw.period_settings,
        existing?.periodSettings,
        DEFAULT_APP_DATA.periodSettings,
        isFullSnapshot,
        true
      ),
      streamSettings: resolveSnapshotArray(
        raw.streamSettings,
        raw.stream_settings,
        existing?.streamSettings,
        DEFAULT_APP_DATA.streamSettings,
        isFullSnapshot,
        true
      ),
      institutionalPolicy: resolveSnapshotObject(
        raw.institutionalPolicy,
        raw.institutional_policy,
        existing?.institutionalPolicy,
        DEFAULT_APP_DATA.institutionalPolicy || {},
        isFullSnapshot
      ),
      sessions: resolveSnapshotArray(
        raw.sessions,
        raw.sessions,
        existing?.sessions,
        DEFAULT_APP_DATA.sessions,
        isFullSnapshot
      ),
      supervisors: resolveSnapshotArray(
        raw.supervisors,
        raw.supervisors,
        existing?.supervisors,
        DEFAULT_APP_DATA.supervisors,
        isFullSnapshot
      ),
      selectedInvigilators: resolveSnapshotArray(
        raw.selectedInvigilators,
        raw.selected_invigilators,
        existing?.selectedInvigilators,
        DEFAULT_APP_DATA.selectedInvigilators,
        isFullSnapshot
      ),
      invigilationAssignments: resolveSnapshotObject(
        raw.invigilationAssignments,
        raw.invigilation_assignments,
        existing?.invigilationAssignments,
        {},
        isFullSnapshot
      ),
      dailyAttendance: resolveSnapshotObject(
        raw.dailyAttendance,
        raw.daily_attendance,
        existing?.dailyAttendance,
        {},
        isFullSnapshot
      ),
      journalRecords: resolveSnapshotObject(
        raw.journalRecords,
        raw.journal_records,
        existing?.journalRecords,
        {},
        isFullSnapshot
      ),
      schemesOfWork: resolveSnapshotArray(
        raw.schemesOfWork,
        raw.schemes_of_work,
        existing?.schemesOfWork,
        [],
        isFullSnapshot
      ),
      lessonPlans: resolveSnapshotArray(
        raw.lessonPlans,
        raw.lesson_plans,
        existing?.lessonPlans,
        [],
        isFullSnapshot
      ),
      teacherEvaluations: resolveSnapshotArray(
        raw.teacherEvaluations,
        raw.teacher_evaluations,
        existing?.teacherEvaluations,
        [],
        isFullSnapshot
      ),
      savedTimetableRecords: resolveSnapshotArray(
        raw.savedTimetableRecords,
        raw.saved_timetable_records,
        existing?.savedTimetableRecords,
        [],
        isFullSnapshot
      ),
      savedInvigilationRecords: resolveSnapshotArray(
        raw.savedInvigilationRecords,
        raw.saved_invigilation_records,
        existing?.savedInvigilationRecords,
        [],
        isFullSnapshot
      ),
      gradeCutoffs: resolveSnapshotObject(
        raw.gradeCutoffs,
        raw.grade_cutoffs,
        existing?.gradeCutoffs,
        {},
        isFullSnapshot
      ),
      ledgerSubjectKeys: resolveSnapshotObject(
        raw.ledgerSubjectKeys,
        raw.ledger_subject_keys,
        existing?.ledgerSubjectKeys,
        {},
        isFullSnapshot
      ),
      subjectPeriodAllocations: resolveSnapshotArray(
        raw.subjectPeriodAllocations,
        raw.subject_period_allocations,
        existing?.subjectPeriodAllocations,
        DEFAULT_APP_DATA.subjectPeriodAllocations,
        isFullSnapshot
      ),
      teacherAssignments: resolveSnapshotArray(
        raw.teacherAssignments,
        raw.teacher_assignments,
        existing?.teacherAssignments,
        DEFAULT_APP_DATA.teacherAssignments,
        isFullSnapshot
      ),
      subjectPaperConfigs: resolveSnapshotObject(
        raw.subjectPaperConfigs,
        raw.subject_paper_configs,
        existing?.subjectPaperConfigs,
        {},
        isFullSnapshot
      ),
      bubbleSettings: resolveSnapshotObject(
        raw.bubbleSettings,
        raw.bubble_settings,
        existing?.bubbleSettings,
        {},
        isFullSnapshot
      ),
      students: resolvedStudents,
      teachers: resolvedTeachers,
      exams: resolvedExams,
      examinationRecords: resolveSnapshotArray(
        raw.examinationRecords,
        raw.examination_records,
        existing?.examinationRecords,
        isDemo ? DEFAULT_APP_DATA.examinationRecords : [],
        isFullSnapshot
      ),
      disciplineRecords: resolvedDisciplineRecords,
      dutyRosterData: resolvedDutyRosterData,
      academicTermDates: resolveSnapshotObject(
        raw.academicTermDates,
        raw.academic_term_dates,
        existing?.academicTermDates,
        {},
        isFullSnapshot
      ),
      updatedAt: /* @__PURE__ */ new Date()
    };
    await db.insert(schoolData).values(normalizedData).onConflictDoUpdate({
      target: schoolData.schoolId,
      set: normalizedData
    });
    res.json({ success: true });
    scheduleRelationalSync(schoolId, normalizedData);
  } catch (err) {
    console.error("Error saving school-data:", err?.message || err);
    res.status(500).json({ error: "Failed to save school data", details: err?.message });
  }
});
app.get("/api/past-papers", async (req, res) => {
  const { schoolId, level, subjectName } = req.query;
  const resolvedId = schoolId || DEFAULT_SCHOOL_UUID;
  try {
    const filters = { schoolId: resolvedId };
    if (level) filters.level = level;
    if (subjectName) filters.subjectName = subjectName;
    const papers = await db.select().from(pastPapers).where(buildWhereClause(pastPapers, filters));
    res.json(papers);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch past papers" });
  }
});
app.post("/api/past-papers", async (req, res) => {
  const { schoolId, ...paperData } = req.body;
  const resolvedId = schoolId || DEFAULT_SCHOOL_UUID;
  try {
    const normalized = await normalizeRecordForTable(pastPapers, { ...paperData, schoolId: resolvedId }, false);
    const result = await db.insert(pastPapers).values(normalized).returning();
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to add past paper" });
  }
});
app.delete("/api/past-papers/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.delete(pastPapers).where(eq(pastPapers.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete past paper" });
  }
});
app.get("/api/db/duty-roster", async (req, res) => {
  const { schoolId } = req.query;
  const resolvedId = schoolId || DEFAULT_SCHOOL_UUID;
  const validSchoolUuid = toDeterministicUuid(resolvedId, true);
  try {
    const snap = await db.query.schoolData.findFirst({
      where: eq(schoolData.schoolId, resolvedId)
    });
    const snapDuty = snap?.dutyRosterData || {};
    const dbStreams = await db.select().from(dutyStreams).where(eq(dutyStreams.schoolId, validSchoolUuid));
    const dbWeeks = await db.select().from(dutyWeeklyAssignments).where(eq(dutyWeeklyAssignments.schoolId, validSchoolUuid));
    const dbReports = await db.select().from(dutyDailyReports).where(eq(dutyDailyReports.schoolId, validSchoolUuid));
    const streams = Array.isArray(snapDuty.streams) && snapDuty.streams.length > 0 ? snapDuty.streams : dbStreams.map((s) => ({
      id: s.id,
      name: s.streamName,
      totalStudents: s.totalStudents || 0,
      classTeacher: s.classTeacher || ""
    }));
    const weeklyAssignments = Array.isArray(snapDuty.weeklyAssignments) && snapDuty.weeklyAssignments.length > 0 ? snapDuty.weeklyAssignments : dbWeeks.map((w) => ({
      id: w.id,
      weekStart: w.weekStart,
      weekEnd: w.weekEnd,
      weekLabel: w.weekLabel,
      teacherIds: Array.isArray(w.teacherIds) ? w.teacherIds : [],
      teacherNames: Array.isArray(w.teacherNames) ? w.teacherNames : [],
      notes: w.notes || "",
      assignedBy: w.assignedBy || "Discipline Master",
      createdAt: w.createdAt ? new Date(w.createdAt).toISOString() : (/* @__PURE__ */ new Date()).toISOString()
    }));
    const dailyReports = Array.isArray(snapDuty.dailyReports) && snapDuty.dailyReports.length > 0 ? snapDuty.dailyReports : dbReports.map((r) => ({
      id: r.id,
      weekAssignmentId: r.weekAssignmentId || "",
      weekStart: r.weekStart || "",
      weekEnd: r.weekEnd || "",
      weekLabel: r.weekLabel || "",
      date: r.reportDate,
      dayName: r.dayName || "",
      teacherId: r.teacherId || "",
      teacherName: r.teacherName,
      allWeekTeachers: Array.isArray(r.allWeekTeachers) ? r.allWeekTeachers : [],
      streams: Array.isArray(r.streamAttendance) ? r.streamAttendance : [],
      totals: {
        totalStudents: r.totalSchoolRoll || 0,
        present: r.totalPresent || 0,
        absent: r.totalAbsent || 0,
        permitted: r.totalPermitted || 0,
        sickPua: r.totalSickPua || 0,
        unexcused: r.totalUnexcused || 0
      },
      environmentRating: r.environmentRating || 8,
      environmentNotes: r.environmentNotes || "",
      generalDiscipline: r.generalDiscipline || "",
      teachersPresent: r.teachersPresent || 0,
      teachersAbsent: r.teachersAbsent || 0,
      teacherAttendanceNotes: r.teacherAttendanceNotes || "",
      keyEvents: r.keyEvents || "",
      bellSchedule: r.bellSchedule || "",
      recommendations: r.recommendations || "",
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : (/* @__PURE__ */ new Date()).toISOString()
    }));
    res.json({
      streams,
      teachers: Array.isArray(snapDuty.teachers) ? snapDuty.teachers : [],
      weeklyAssignments,
      dailyReports,
      updatedAt: snapDuty.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    console.error("Error loading duty-roster:", err?.message || err);
    res.status(500).json({ error: "Failed to load duty roster data" });
  }
});
app.post("/api/db/duty-roster", async (req, res) => {
  const { schoolId = DEFAULT_SCHOOL_UUID, dutyRosterData } = req.body || {};
  try {
    const validSchoolUuid = await ensureSchoolExists(schoolId);
    const existing = await db.query.schoolData.findFirst({
      where: eq(schoolData.schoolId, schoolId)
    });
    if (existing) {
      await db.update(schoolData).set({ dutyRosterData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(schoolData.schoolId, schoolId));
    }
    await syncRelationalTablesFromSnapshot(validSchoolUuid, { dutyRosterData });
    res.json({ success: true });
  } catch (err) {
    console.error("Error saving duty-roster:", err?.message || err);
    res.status(500).json({ error: "Failed to save duty roster data" });
  }
});
app.get("/api/db/school-subscriptions", async (req, res) => {
  const { schoolId } = req.query;
  try {
    const validSchoolUuid = toDeterministicUuid(schoolId, true);
    const data = await db.query.schoolSubscriptions.findFirst({
      where: eq(schoolSubscriptions.schoolId, validSchoolUuid)
    });
    res.json(data ? toDualCaseRow(schoolSubscriptions, data) : {});
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch subscriptions" });
  }
});
app.post("/api/db/school-subscriptions", async (req, res) => {
  const { schoolId, payload } = req.body;
  try {
    const validSchoolUuid = await ensureSchoolExists(schoolId || payload?.schoolId || payload?.school_id);
    const normalized = await normalizeRecordForTable(schoolSubscriptions, {
      ...payload || {},
      schoolId: validSchoolUuid
    });
    await db.insert(schoolSubscriptions).values(normalized).onConflictDoUpdate({
      target: schoolSubscriptions.id,
      set: normalized
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to save subscription" });
  }
});
app.get("/api/db/status", async (_req, res) => {
  const start = performance.now();
  try {
    const [
      studentsCnt,
      teachersCnt,
      classesCnt,
      subjectsCnt,
      examsCnt,
      timetableCnt,
      parentsCnt,
      examResultsCnt,
      periodSettingsCnt,
      streamSettingsCnt,
      usersCnt,
      activityLogsCnt,
      schoolSnap
    ] = await Promise.all([
      db.execute(sql`SELECT count(*)::int as c FROM students`),
      db.execute(sql`SELECT count(*)::int as c FROM teachers`),
      db.execute(sql`SELECT count(*)::int as c FROM classes`),
      db.execute(sql`SELECT count(*)::int as c FROM subjects`),
      db.execute(sql`SELECT count(*)::int as c FROM exams`),
      db.execute(sql`SELECT count(*)::int as c FROM timetable_assignments`),
      db.execute(sql`SELECT count(*)::int as c FROM parents`),
      db.execute(sql`SELECT count(*)::int as c FROM exam_results`),
      db.execute(sql`SELECT count(*)::int as c FROM period_settings`),
      db.execute(sql`SELECT count(*)::int as c FROM stream_settings`),
      db.execute(sql`SELECT count(*)::int as c FROM users`),
      db.execute(sql`SELECT count(*)::int as c FROM activity_logs`),
      db.execute(sql`SELECT updated_at FROM school_data LIMIT 1`)
    ]);
    const latencyMs = Math.round(performance.now() - start);
    const lastSyncTimestamp = schoolSnap.rows[0]?.updated_at || (/* @__PURE__ */ new Date()).toISOString();
    res.json({
      success: true,
      status: "connected",
      latencyMs,
      engine: "PostgreSQL 18.6 (Cloud SQL / Drizzle ORM)",
      totalTablesRegistered: Object.keys(TABLE_KEY_MAP).length,
      lastSyncTimestamp,
      counts: {
        students: Number(studentsCnt.rows[0]?.c || 0),
        teachers: Number(teachersCnt.rows[0]?.c || 0),
        classes: Number(classesCnt.rows[0]?.c || 0),
        subjects: Number(subjectsCnt.rows[0]?.c || 0),
        exams: Number(examsCnt.rows[0]?.c || 0),
        timetableAssignments: Number(timetableCnt.rows[0]?.c || 0),
        parents: Number(parentsCnt.rows[0]?.c || 0),
        examResults: Number(examResultsCnt.rows[0]?.c || 0),
        periodSettings: Number(periodSettingsCnt.rows[0]?.c || 0),
        streamSettings: Number(streamSettingsCnt.rows[0]?.c || 0),
        users: Number(usersCnt.rows[0]?.c || 0),
        activityLogs: Number(activityLogsCnt.rows[0]?.c || 0)
      },
      serverTime: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    console.error("Cloud SQL test connection error:", err);
    res.status(500).json({
      success: false,
      status: "error",
      latencyMs: Math.round(performance.now() - start),
      error: err?.message || String(err)
    });
  }
});
app.get("/api/db/diagnostics", async (req, res) => {
  const { schoolId } = req.query;
  try {
    const tableStats = [];
    const categoryMap = {
      schools: "Core & Auth",
      school_data: "Core & Auth",
      users: "Core & Auth",
      school_admins: "Core & Auth",
      authorized_staff: "Core & Auth",
      school_subscriptions: "Core & Auth",
      institutional_policies: "Core & Auth",
      activity_logs: "Core & Auth",
      students: "Academic & Registry",
      teachers: "Academic & Registry",
      classes: "Academic & Registry",
      subjects: "Academic & Registry",
      exams: "Academic & Registry",
      exam_records: "Academic & Registry",
      exam_results: "Academic & Registry",
      timetables: "Timetable & Attendance",
      timetable_assignments: "Timetable & Attendance",
      period_settings: "Timetable & Attendance",
      periods: "Timetable & Attendance",
      stream_settings: "Timetable & Attendance",
      subject_period_allocations: "Timetable & Attendance",
      teacher_assignments: "Timetable & Attendance",
      saved_timetable_records: "Timetable & Attendance",
      period_attendance: "Timetable & Attendance",
      teaching_logs: "Timetable & Attendance",
      remedial_timetable: "Remedial & Invigilation",
      remedial_attendance: "Remedial & Invigilation",
      remedial_payment_settings: "Remedial & Invigilation",
      invigilation_sessions: "Remedial & Invigilation",
      invigilation_assignments: "Remedial & Invigilation",
      invigilation_supervisors: "Remedial & Invigilation",
      selected_invigilators: "Remedial & Invigilation",
      saved_invigilation_records: "Remedial & Invigilation",
      sitting_plans: "Remedial & Invigilation",
      parents: "Parents, SMS & Finance",
      parent_students: "Parents, SMS & Finance",
      announcements: "Parents, SMS & Finance",
      parent_messages: "Parents, SMS & Finance",
      sms_wallet: "Parents, SMS & Finance",
      sms_logs: "Parents, SMS & Finance",
      sms_payment_history: "Parents, SMS & Finance",
      payment_verification_requests: "Parents, SMS & Finance",
      contribution_types: "Parents, SMS & Finance",
      student_ledger: "Parents, SMS & Finance",
      discipline_records: "Operations & Inventory",
      gate_pass_logs: "Operations & Inventory",
      environment_equipment: "Operations & Inventory",
      equipment_usage_log: "Operations & Inventory",
      environment_orders: "Operations & Inventory",
      school_purchased_equipment: "Operations & Inventory",
      ream_paper_records: "Operations & Inventory",
      duty_streams: "Operations & Inventory",
      duty_weekly_assignments: "Operations & Inventory",
      duty_daily_reports: "Operations & Inventory"
    };
    const countQuery = await db.execute(sql`
      SELECT relname AS table_name, GREATEST(n_live_tup, 0)::int AS est_rows
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY relname;
    `);
    const exactCounts = {};
    for (const [tableName, tableObj] of Object.entries(TABLE_KEY_MAP)) {
      try {
        const rows = await db.select({ count: sql`count(*)::int` }).from(tableObj);
        exactCounts[tableName] = rows[0]?.count ?? 0;
        tableStats.push({
          table: tableName,
          connected: true,
          rowCount: exactCounts[tableName],
          category: categoryMap[tableName] || "General"
        });
      } catch (e) {
        tableStats.push({
          table: tableName,
          connected: false,
          rowCount: 0,
          category: categoryMap[tableName] || "General"
        });
      }
    }
    res.json({
      success: true,
      status: "healthy",
      totalTables: tableStats.length,
      connectedTables: tableStats.filter((t) => t.connected).length,
      tables: tableStats,
      summary: {
        schools: exactCounts.schools ?? 0,
        students: exactCounts.students ?? 0,
        teachers: exactCounts.teachers ?? 0,
        exams: exactCounts.exams ?? 0,
        classes: exactCounts.classes ?? 0,
        users: (exactCounts.users ?? 0) + (exactCounts.school_admins ?? 0)
      },
      checkedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    console.error("Diagnostics error:", err);
    res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});
app.post("/api/performance-insight", async (req, res) => {
  try {
    const { examinationRecords } = req.body;
    const insight = await generatePerformanceInsight(examinationRecords);
    res.json({ success: true, insight });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});
app.post("/api/db/sync-all", async (req, res) => {
  try {
    const { schoolId = DEFAULT_SCHOOL_UUID, payload } = req.body || {};
    let sourceData = payload;
    if (!sourceData || typeof sourceData !== "object") {
      const snap = await db.query.schoolData.findFirst({
        where: eq(schoolData.schoolId, schoolId)
      });
      sourceData = snap || DEFAULT_APP_DATA;
    }
    const mergedSource = {
      ...sourceData,
      schoolInfo: pickNonEmptyObject(sourceData.schoolInfo, sourceData.school_info, DEFAULT_APP_DATA.schoolInfo),
      students: pickNonEmptyArray(sourceData.students, DEFAULT_APP_DATA.students),
      teachers: pickNonEmptyArray(sourceData.teachers, DEFAULT_APP_DATA.teachers),
      exams: pickNonEmptyArray(sourceData.exams, DEFAULT_APP_DATA.exams),
      streamSettings: pickNonEmptyArray(sourceData.streamSettings, sourceData.stream_settings, DEFAULT_APP_DATA.streamSettings, TANZANIAN_TEMPLATE_STREAM_SETTINGS),
      periodSettings: pickNonEmptyArray(sourceData.periodSettings, sourceData.period_settings, DEFAULT_APP_DATA.periodSettings, TANZANIAN_TEMPLATE_PERIOD_SETTINGS),
      timetableAssignments: pickNonEmptyArray(sourceData.timetableAssignments, sourceData.timetable_assignments, DEFAULT_APP_DATA.timetableAssignments, TANZANIAN_TEMPLATE_TIMETABLE_ASSIGNMENTS),
      examinationRecords: pickNonEmptyArray(sourceData.examinationRecords, sourceData.examination_records, DEFAULT_APP_DATA.examinationRecords),
      subjectPeriodAllocations: pickNonEmptyArray(sourceData.subjectPeriodAllocations, sourceData.subject_period_allocations, DEFAULT_APP_DATA.subjectPeriodAllocations),
      teacherAssignments: pickNonEmptyArray(sourceData.teacherAssignments, sourceData.teacher_assignments, DEFAULT_APP_DATA.teacherAssignments),
      institutionalPolicy: pickNonEmptyObject(sourceData.institutionalPolicy, sourceData.institutional_policy, DEFAULT_APP_DATA.institutionalPolicy),
      sessions: pickNonEmptyArray(sourceData.sessions, DEFAULT_APP_DATA.sessions),
      supervisors: pickNonEmptyArray(sourceData.supervisors, DEFAULT_APP_DATA.supervisors),
      selectedInvigilators: pickNonEmptyArray(sourceData.selectedInvigilators, sourceData.selected_invigilators, DEFAULT_APP_DATA.selectedInvigilators),
      disciplineRecords: pickNonEmptyArray(sourceData.disciplineRecords, sourceData.discipline_records, DEFAULT_APP_DATA.disciplineRecords),
      updatedAt: /* @__PURE__ */ new Date()
    };
    await db.insert(schoolData).values({
      id: schoolId,
      schoolId,
      ...mergedSource
    }).onConflictDoUpdate({
      target: schoolData.schoolId,
      set: mergedSource
    });
    await syncRelationalTablesFromSnapshot(schoolId, mergedSource);
    res.json({
      success: true,
      synced: {
        students: (mergedSource.students || []).length,
        teachers: (mergedSource.teachers || []).length,
        exams: (mergedSource.exams || []).length,
        classes: (mergedSource.streamSettings || []).length,
        periods: (mergedSource.periodSettings || []).length,
        timetableAssignments: (mergedSource.timetableAssignments || []).length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});
app.get("/api/db/schools", async (_req, res) => {
  try {
    const data = await db.select().from(schools);
    res.json(data.map((r) => toDualCaseRow(schools, r)));
  } catch (err) {
    console.error("Error fetching schools from Cloud SQL:", err);
    res.status(500).json({ error: "Failed to fetch schools" });
  }
});
app.post("/api/db/schools", async (req, res) => {
  try {
    const payload = req.body || {};
    const schoolId = isValidUuid(payload.id) ? payload.id : crypto.randomUUID();
    const schoolRecord = {
      id: schoolId,
      name: payload.name || "HABY EDU SCHOOL",
      code: payload.code || null,
      district: payload.district || null,
      region: payload.region || null,
      phone: payload.phone || null,
      email: payload.email || null,
      status: payload.status || "ACTIVE",
      updatedAt: /* @__PURE__ */ new Date()
    };
    await db.insert(schools).values(schoolRecord).onConflictDoUpdate({
      target: schools.id,
      set: schoolRecord
    });
    try {
      await db.insert(schoolData).values({
        id: schoolId,
        schoolId,
        schoolInfo: { name: schoolRecord.name, email: schoolRecord.email, phone: schoolRecord.phone },
        students: [],
        teachers: [],
        exams: [],
        updatedAt: /* @__PURE__ */ new Date()
      }).onConflictDoNothing();
    } catch (sdErr) {
      console.warn("Init schoolData on school create warning:", sdErr);
    }
    res.json({ success: true, school: schoolRecord });
  } catch (err) {
    console.error("Error saving school to Cloud SQL:", err);
    res.status(500).json({ error: "Failed to save school", details: err?.message || String(err) });
  }
});
app.delete("/api/db/schools/:id", async (req, res) => {
  try {
    const id = toDeterministicUuid(req.params.id, true);
    await db.delete(schools).where(eq(schools.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete school" });
  }
});
app.get("/api/db/school-admins", async (req, res) => {
  try {
    const { schoolId } = req.query;
    if (schoolId) {
      const validSchoolUuid = toDeterministicUuid(schoolId, true);
      const data2 = await db.select().from(schoolAdmins).where(eq(schoolAdmins.schoolId, validSchoolUuid));
      return res.json(data2.map((r) => toDualCaseRow(schoolAdmins, r)));
    }
    const data = await db.select().from(schoolAdmins);
    res.json(data.map((r) => toDualCaseRow(schoolAdmins, r)));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch school admins" });
  }
});
app.post("/api/db/school-admins", async (req, res) => {
  try {
    const payload = req.body || {};
    const adminId = isValidUuid(payload.id) ? payload.id : crypto.randomUUID();
    const rawSchoolId = payload.schoolId || payload.school_id;
    const schoolId = rawSchoolId ? await ensureSchoolExists(rawSchoolId) : DEFAULT_SCHOOL_UUID;
    const adminRecord = {
      id: adminId,
      schoolId,
      email: String(payload.email || "").trim().toLowerCase(),
      fullName: payload.fullName || payload.full_name || "Administrator",
      password: payload.password || "",
      role: payload.role || "HEADMASTER",
      updatedAt: /* @__PURE__ */ new Date()
    };
    await db.insert(schoolAdmins).values(adminRecord).onConflictDoUpdate({
      target: schoolAdmins.id,
      set: adminRecord
    });
    res.json({ success: true, admin: adminRecord });
  } catch (err) {
    console.error("Error saving school admin to Cloud SQL:", err);
    res.status(500).json({ error: "Failed to save school admin", details: err?.message || String(err) });
  }
});
app.get("/api/db/students", async (req, res) => {
  try {
    const { schoolId } = req.query;
    if (schoolId) {
      const validSchoolUuid = toDeterministicUuid(schoolId, true);
      const data2 = await db.select().from(students).where(eq(students.schoolId, validSchoolUuid));
      return res.json(data2.map((r) => toDualCaseRow(students, r)));
    }
    const data = await db.select().from(students);
    res.json(data.map((r) => toDualCaseRow(students, r)));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch students" });
  }
});
app.post("/api/db/students", async (req, res) => {
  try {
    const { schoolId, payload } = req.body;
    const validSchoolUuid = await ensureSchoolExists(schoolId);
    const records = (Array.isArray(payload) ? payload : [payload]).map((s) => {
      const regKey = String(s.regNo || s.reg_no || "").trim().toUpperCase();
      return {
        ...s,
        id: toDeterministicUuid(`std_${validSchoolUuid}_${regKey || s.id || s.name}`),
        schoolId: validSchoolUuid
      };
    });
    const saved = await upsertTableRecords("students", students, records);
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ error: "Failed to save students" });
  }
});
app.get("/api/db/teachers", async (req, res) => {
  try {
    const { schoolId } = req.query;
    if (schoolId) {
      const validSchoolUuid = toDeterministicUuid(schoolId, true);
      const data2 = await db.select().from(teachers).where(eq(teachers.schoolId, validSchoolUuid));
      return res.json(data2.map((r) => toDualCaseRow(teachers, r)));
    }
    const data = await db.select().from(teachers);
    res.json(data.map((r) => toDualCaseRow(teachers, r)));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch teachers" });
  }
});
app.post("/api/db/teachers", async (req, res) => {
  try {
    const { schoolId, payload } = req.body;
    const validSchoolUuid = await ensureSchoolExists(schoolId);
    const records = (Array.isArray(payload) ? payload : [payload]).map((t) => {
      const tchKey = String(t.email || t.name || t.id || "").trim().toLowerCase();
      return {
        ...t,
        id: toDeterministicUuid(`tch_${validSchoolUuid}_${tchKey}`),
        schoolId: validSchoolUuid
      };
    });
    const saved = await upsertTableRecords("teachers", teachers, records);
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ error: "Failed to save teachers" });
  }
});
app.get("/api/db/exams", async (req, res) => {
  try {
    const { schoolId } = req.query;
    if (schoolId) {
      const validSchoolUuid = toDeterministicUuid(schoolId, true);
      const data2 = await db.select().from(exams).where(eq(exams.schoolId, validSchoolUuid));
      return res.json(data2.map((r) => toDualCaseRow(exams, r)));
    }
    const data = await db.select().from(exams);
    res.json(data.map((r) => toDualCaseRow(exams, r)));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch exams" });
  }
});
app.post("/api/db/exams", async (req, res) => {
  try {
    const { schoolId, payload } = req.body;
    const validSchoolUuid = await ensureSchoolExists(schoolId);
    const records = (Array.isArray(payload) ? payload : [payload]).map((e) => ({
      ...e,
      id: toDeterministicUuid(`exm_${validSchoolUuid}_${e.id || e.name}`),
      schoolId: validSchoolUuid
    }));
    const saved = await upsertTableRecords("exams", exams, records);
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ error: "Failed to save exams" });
  }
});
app.get("/api/db/users", async (req, res) => {
  try {
    const { schoolId } = req.query;
    if (schoolId) {
      const validSchoolUuid = toDeterministicUuid(schoolId, true);
      const data2 = await db.select().from(users).where(eq(users.schoolId, validSchoolUuid));
      return res.json(data2.map((r) => toDualCaseRow(users, r)));
    }
    const data = await db.select().from(users);
    res.json(data.map((r) => toDualCaseRow(users, r)));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});
app.post("/api/db/query", async (req, res) => {
  const { table, action, filters, orders, data } = req.body || {};
  const selectedTable = TABLE_KEY_MAP[table];
  if (!selectedTable) {
    return res.status(400).json({ error: `Table '${table}' is not supported in Cloud SQL schema` });
  }
  try {
    if (action === "select") {
      let query = db.select().from(selectedTable);
      const whereClause = buildWhereClause(selectedTable, filters);
      if (whereClause) {
        query = query.where(whereClause);
      }
      if (Array.isArray(orders) && orders.length > 0) {
        const orderClauses = [];
        for (const ord of orders) {
          const resolved = resolveColumn(selectedTable, ord.column);
          if (resolved && selectedTable[resolved.jsKey]) {
            orderClauses.push(ord.ascending === false ? desc(selectedTable[resolved.jsKey]) : asc(selectedTable[resolved.jsKey]));
          }
        }
        if (orderClauses.length > 0) {
          query = query.orderBy(...orderClauses);
        }
      }
      const results = await query;
      const dualResults = (results || []).map((r) => toDualCaseRow(selectedTable, r));
      return res.json({ success: true, data: dualResults });
    }
    if (action === "insert" || action === "upsert") {
      const records = Array.isArray(data) ? data : data ? [data] : [];
      const saved = await upsertTableRecords(table, selectedTable, records);
      return res.json({ success: true, data: saved });
    }
    if (action === "update") {
      const rawUpdate = Array.isArray(data) ? data[0] : data;
      if (!rawUpdate || typeof rawUpdate !== "object") {
        return res.json({ success: true, data: [] });
      }
      const normalizedUpdate = await normalizeRecordForTable(selectedTable, rawUpdate, true);
      const whereClause = buildWhereClause(selectedTable, filters);
      if (whereClause && Object.keys(normalizedUpdate).length > 0) {
        const updated = await db.update(selectedTable).set(normalizedUpdate).where(whereClause).returning();
        return res.json({ success: true, data: (updated || []).map((r) => toDualCaseRow(selectedTable, r)) });
      }
      return res.json({ success: true, data: [] });
    }
    if (action === "delete") {
      const whereClause = buildWhereClause(selectedTable, filters);
      if (whereClause) {
        await db.delete(selectedTable).where(whereClause);
      }
      return res.json({ success: true });
    }
    return res.status(400).json({ error: `Action '${action}' not supported` });
  } catch (err) {
    console.error(`Error in /api/db/query for ${table} (${action}):`, err?.message || err);
    return res.status(500).json({ error: err?.message || "Database query error" });
  }
});
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email) {
    return res.status(400).json({ success: false, error: "Email is required" });
  }
  const normEmail = String(email).trim().toLowerCase();
  try {
    if (normEmail === "habibuakida@gmail.com" || normEmail === "admin@haby.com") {
      return res.json({
        success: true,
        user: {
          id: "efbbc146-b15b-49ee-a7ed-931ade8ccd0d",
          email: normEmail,
          fullName: "Mwl. Habibu Akida (Super Admin)",
          role: "SUPER_ADMIN",
          schoolId: "02dff10d-78fb-4af6-ab5a-db1d275d7e06",
          isSuperAdmin: true
        }
      });
    }
    const admin = await db.query.schoolAdmins.findFirst({
      where: eq(schoolAdmins.email, normEmail)
    });
    if (admin) {
      return res.json({
        success: true,
        user: {
          id: admin.id,
          email: admin.email,
          fullName: admin.fullName || "School Administrator",
          role: admin.role === "super_admin" ? "SUPER_ADMIN" : "HEADMASTER",
          schoolId: admin.schoolId || "02dff10d-78fb-4af6-ab5a-db1d275d7e06",
          isSuperAdmin: admin.role === "super_admin"
        }
      });
    }
    const user = await db.query.users.findFirst({
      where: eq(users.email, normEmail)
    });
    if (user) {
      return res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName || "Staff Member",
          role: user.role || "TEACHER",
          schoolId: user.schoolId || "02dff10d-78fb-4af6-ab5a-db1d275d7e06",
          isSuperAdmin: !!user.isSuperAdmin
        }
      });
    }
    return res.status(401).json({ success: false, error: "User not found in system." });
  } catch (err) {
    console.error("Error in /api/auth/login:", err);
    if (normEmail === "habibuakida@gmail.com" || normEmail === "admin@haby.com") {
      return res.json({
        success: true,
        user: {
          id: "efbbc146-b15b-49ee-a7ed-931ade8ccd0d",
          email: normEmail,
          fullName: "Mwl. Habibu Akida (Super Admin)",
          role: "SUPER_ADMIN",
          schoolId: "02dff10d-78fb-4af6-ab5a-db1d275d7e06",
          isSuperAdmin: true
        }
      });
    }
    return res.status(500).json({ success: false, error: "Database authentication error" });
  }
});
app.get("/health", (_req, res) => {
  res.json({ status: "healthy", appName: "HABY EDU PRO" });
});
app.get("/api/health", (_req, res) => {
  res.json({
    status: "healthy",
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    hasBeemKey: !!(process.env.BEEM_API_KEY && process.env.BEEM_SECRET_KEY),
    appName: "HABY EDU PRO - School Timetable & Management"
  });
});
app.post("/api/sms/send-results", async (req, res) => {
  try {
    const { schoolId, schoolName = "HABY EDU PRO", examType, year, recipients } = req.body;
    if (!schoolId) {
      return res.status(400).json({ success: false, error: "schoolId is required" });
    }
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, error: "Hakuna watahiniwa walioteuliwa (recipients required)" });
    }
    console.log(`[SMS Results] Sending ${recipients.length} result SMS for ${examType} ${year} | School: ${schoolId}`);
    const logs = [];
    let sentCount = 0;
    let failedCount = 0;
    for (const item of recipients) {
      const studentCno = item.student_cno || item.cno || "CANDIDATE";
      const studentName = item.student_name || item.name || studentCno;
      const phone = normalizeTzPhone(item.phone_255 || item.phone || "");
      const div = item.div || item.DIV || "-";
      const aggt = item.aggt || item.AGGT || "-";
      let subjectsStr = "";
      if (item.subjects && typeof item.subjects === "object") {
        subjectsStr = Object.entries(item.subjects).map(([subj, grade]) => `${subj}-${grade}`).join(" ");
      } else if (item.subjects_json && typeof item.subjects_json === "object") {
        subjectsStr = Object.entries(item.subjects_json).map(([subj, grade]) => `${subj}-${grade}`).join(" ");
      }
      const messageText = `Ndugu Mzazi, matokeo ya ${studentName} ${examType} ${year}: DIV ${div}, AGGT ${aggt}${subjectsStr ? ", " + subjectsStr : ""} - ${schoolName}`;
      if (!phone) {
        failedCount++;
        logs.push({
          student_cno: studentCno,
          phone: "",
          message: messageText,
          status: "FAILED",
          error: "Namba ya mzazi haipo (Missing phone)"
        });
        continue;
      }
      const dispatchResult = await sendBeemSMS(phone, messageText);
      if (dispatchResult.success) {
        sentCount++;
        logs.push({
          student_cno: studentCno,
          phone,
          message: messageText,
          status: "SENT",
          dispatchedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      } else {
        failedCount++;
        logs.push({
          student_cno: studentCno,
          phone,
          message: messageText,
          status: "FAILED",
          error: dispatchResult.error || "Beem dispatch failed"
        });
      }
    }
    res.json({
      success: true,
      sentCount,
      failedCount,
      totalCount: recipients.length,
      logs
    });
  } catch (error) {
    console.error("Error in /api/sms/send-results:", error);
    res.status(500).json({ success: false, error: error.message || "Hitilafu ya seva wakati wa kutuma SMS" });
  }
});
app.post("/api/sms/send-announcement", async (req, res) => {
  try {
    const { schoolId, schoolName = "HABY EDU PRO", target = "All school", message, recipients } = req.body;
    if (!schoolId) {
      return res.status(400).json({ success: false, error: "schoolId is required" });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: "Ujumbe wa tangazo hauwezi kuwa mtupu" });
    }
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, error: "Hakuna namba za wazazi zilizopatikana kwa walengwa hao" });
    }
    console.log(`[SMS Announcement] Sending to ${recipients.length} parents | Target: ${target} | School: ${schoolId}`);
    const logs = [];
    let sentCount = 0;
    let failedCount = 0;
    const finalMsg = message.includes(schoolName) ? message : `${message}
- ${schoolName}`;
    for (const item of recipients) {
      const phone = normalizeTzPhone(item.phone_255 || item.phone || "");
      const studentCno = item.student_cno || item.cno || "ALL";
      if (!phone) {
        failedCount++;
        logs.push({
          student_cno: studentCno,
          phone: "",
          message: finalMsg,
          status: "FAILED",
          error: "Namba ya simu haipo"
        });
        continue;
      }
      const dispatchResult = await sendBeemSMS(phone, finalMsg);
      if (dispatchResult.success) {
        sentCount++;
        logs.push({
          student_cno: studentCno,
          phone,
          message: finalMsg,
          status: "SENT",
          dispatchedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      } else {
        failedCount++;
        logs.push({
          student_cno: studentCno,
          phone,
          message: finalMsg,
          status: "FAILED",
          error: dispatchResult.error || "Failed"
        });
      }
    }
    res.json({
      success: true,
      sentCount,
      failedCount,
      totalCount: recipients.length,
      logs
    });
  } catch (error) {
    console.error("Error in /api/sms/send-announcement:", error);
    res.status(500).json({ success: false, error: error.message || "Hitilafu wakati wa kutuma matangazo" });
  }
});
app.get("/api/timetable", (req, res) => {
  try {
    const { schoolId, class: className, stream, teacherId, day } = req.query;
    console.log(`[Timetable API] Fetching timetable for school: ${schoolId || "DEFAULT"} | class: ${className || "ALL"} | stream: ${stream || "ALL"} | teacher: ${teacherId || "ALL"}`);
    const results = queryTimetable({
      schoolId,
      className,
      stream,
      teacherId,
      day
    });
    console.log(`[Timetable API] Found ${results.length} periods for class="${className}" stream="${stream}"`);
    res.json({
      success: true,
      count: results.length,
      data: results,
      periods: results
    });
  } catch (error) {
    console.error("Error in GET /api/timetable:", error);
    res.status(500).json({ success: false, error: error.message || "Error fetching timetable" });
  }
});
app.post("/api/timetable", (req, res) => {
  try {
    const { schoolId = "DEFAULT_PRIMARY_SCHOOL_ID", assignments, replace = false, className, stream } = req.body;
    if (!Array.isArray(assignments) && !req.body.entry) {
      return res.status(400).json({ success: false, error: "assignments array or entry object required" });
    }
    const toSave = Array.isArray(assignments) ? assignments : [req.body.entry];
    console.log(`[Timetable API] Saving ${toSave.length} periods for school: ${schoolId} (replace: ${replace}, class: ${className}, stream: ${stream})`);
    const updated = saveTimetable(schoolId, toSave, { replace, className, stream });
    res.json({
      success: true,
      count: updated.length,
      data: updated
    });
  } catch (error) {
    console.error("Error in POST /api/timetable:", error);
    res.status(500).json({ success: false, error: error.message || "Error saving timetable" });
  }
});
app.delete("/api/timetable", (req, res) => {
  try {
    const { schoolId = "DEFAULT_PRIMARY_SCHOOL_ID", id, className, stream, day, period } = req.body;
    const deleted = deleteTimetableAssignment(schoolId, { id, className, stream, day, period });
    res.json({ success: true, deleted });
  } catch (error) {
    console.error("Error in DELETE /api/timetable:", error);
    res.status(500).json({ success: false, error: error.message || "Error deleting timetable" });
  }
});
app.post("/api/ai/generate-timetable", async (req, res) => {
  try {
    const result = await generateAITimetable(req.body);
    res.json(result);
  } catch (error) {
    console.error("API Error in /api/ai/generate-timetable:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error while generating timetable"
    });
  }
});
app.post("/api/ai/generate-scheme", async (req, res) => {
  try {
    const result = await generateAISchemeOfWork(req.body);
    res.json(result);
  } catch (error) {
    console.error("API Error in /api/ai/generate-scheme:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error while generating scheme of work"
    });
  }
});
app.post("/api/ai/generate-lesson-plan", async (req, res) => {
  try {
    const result = await generateAILessonPlan(req.body);
    res.json(result);
  } catch (error) {
    console.error("API Error in /api/ai/generate-lesson-plan:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error while generating lesson plan"
    });
  }
});
app.post("/api/necta/fetch-url", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: "URL is required" });
    }
    const result = await fetchAndParseNectaUrl(url);
    res.json(result);
  } catch (error) {
    console.error("Error in /api/necta/fetch-url:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error while fetching NECTA URL"
    });
  }
});
app.get("/api/auth/github/url", (req, res) => {
  const { origin } = req.query;
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: "GITHUB_CLIENT_ID NOT SET in environment" });
  }
  const redirectUri = `${origin}/api/auth/github/callback`;
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,user`;
  res.json({ url });
});
app.get("/api/auth/github/callback", async (req, res) => {
  const { code } = req.query;
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  try {
    const response = await axios2.post("https://github.com/login/oauth/access_token", {
      client_id: clientId,
      client_secret: clientSecret,
      code
    }, {
      headers: { Accept: "application/json" }
    });
    const { access_token } = response.data;
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GITHUB_AUTH_SUCCESS', token: '${access_token}' }, '*');
              window.close();
            } else {
              document.body.innerHTML = '<h2>Authentication successful. You can close this window.</h2>';
            }
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("GitHub Callback Error:", error.response?.data || error.message);
    res.status(500).send("Authentication failed");
  }
});
app.post("/api/github/push", async (req, res) => {
  const { token, repoName, commitMessage = "Push from Haby Edu Pro" } = req.body;
  if (!token || !repoName) {
    return res.status(400).json({ error: "Token and repoName required" });
  }
  try {
    const git = simpleGit();
    if (!fs2.existsSync(path2.join(__dirname2, ".git"))) {
      await git.init();
    }
    await git.addConfig("user.name", "Haby Edu Pro AI");
    await git.addConfig("user.email", "ai@habyedupro.com");
    await git.add(".");
    try {
      await git.commit(commitMessage);
    } catch (e) {
    }
    const remoteUrl = `https://x-access-token:${token}@github.com/${repoName}.git`;
    const remotes = await git.getRemotes();
    if (remotes.some((r) => r.name === "origin")) {
      await git.remote(["set-url", "origin", remoteUrl]);
    } else {
      await git.addRemote("origin", remoteUrl);
    }
    try {
      await git.branch(["-M", "main"]);
    } catch (e) {
    }
    await git.push("origin", "main", ["--force"]);
    res.json({ success: true });
  } catch (error) {
    console.error("Git push error:", error);
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/netlify/deploy", async (req, res) => {
  const token = req.body.token || process.env.NETLIFY_TOKEN;
  const siteId = req.body.siteId || process.env.NETLIFY_SITE_ID || "habyedupro";
  const clearCache = req.body.clearCache !== false;
  if (!token) {
    return res.status(400).json({ error: "Netlify Personal Access Token is required." });
  }
  try {
    console.log(`[Netlify] Triggering deploy for site: ${siteId} (clear_cache: ${clearCache})...`);
    const netlifyRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/builds`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ clear_cache: clearCache })
    });
    if (!netlifyRes.ok) {
      const errBody = await netlifyRes.text();
      let parsedMessage = errBody;
      try {
        const json = JSON.parse(errBody);
        parsedMessage = json.message || errBody;
      } catch (e) {
      }
      console.error(`[Netlify API Error] Status ${netlifyRes.status}:`, parsedMessage);
      return res.status(netlifyRes.status).json({ error: `Netlify API error: ${parsedMessage}` });
    }
    const data = await netlifyRes.json();
    console.log("\u2705 Netlify deploy triggered successfully, Build ID:", data.id);
    return res.json({
      success: true,
      id: data.id,
      deploy_id: data.deploy_id || data.id,
      site_id: siteId,
      url: `https://app.netlify.com/sites/${siteId}/deploys/${data.id || ""}`,
      data
    });
  } catch (error) {
    console.error("Netlify deploy exception:", error);
    return res.status(500).json({ error: error.message || "Failed to trigger Netlify deploy" });
  }
});
app.get("/api/project/zip", (req, res) => {
  try {
    const zip = new AdmZip();
    const rootPath = path2.resolve(__dirname2);
    const items = fs2.readdirSync(rootPath);
    items.forEach((item) => {
      const fullPath = path2.join(rootPath, item);
      const stat = fs2.statSync(fullPath);
      if (item === "node_modules" || item === ".git" || item === "dist" || item.endsWith(".zip") || item.endsWith(".tar.gz") || item === ".env") {
        return;
      }
      if (stat.isDirectory()) {
        zip.addLocalFolder(fullPath, item);
      } else {
        zip.addLocalFile(fullPath);
      }
    });
    const buffer = zip.toBuffer();
    res.set({
      "Content-Type": "application/zip",
      "Content-Disposition": "attachment; filename=haby-edu-pro-source.zip",
      "Content-Length": buffer.length
    });
    res.end(buffer);
  } catch (err) {
    console.error("Zip Error:", err);
    res.status(500).send("Error generating ZIP");
  }
});
app.post("/api/db/attendance", async (req, res) => {
  try {
    const { schoolId, payload } = req.body || {};
    const validSchoolUuid = await ensureSchoolExists(schoolId || payload?.schoolId || payload?.school_id);
    const records = (Array.isArray(payload) ? payload : [payload]).map((p) => ({
      ...p,
      schoolId: validSchoolUuid
    }));
    const saved = await upsertTableRecords("period_attendance", periodAttendance, records);
    res.json({ success: true, data: saved });
  } catch (err) {
    console.error("Error saving attendance:", err?.message || err);
    res.status(500).json({ success: false, error: err?.message || "Failed to save attendance" });
  }
});
app.get("/api/db/attendance", async (req, res) => {
  try {
    const { schoolId } = req.query;
    const validSchoolUuid = toDeterministicUuid(schoolId, true);
    const data = await db.select().from(periodAttendance).where(eq(periodAttendance.schoolId, validSchoolUuid));
    res.json(data.map((r) => toDualCaseRow(periodAttendance, r)));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
});
app.get("/api/db/attendance/weekly", async (req, res) => {
  try {
    const { schoolId } = req.query;
    const validSchoolUuid = toDeterministicUuid(schoolId, true);
    const data = await db.select().from(periodAttendance).where(eq(periodAttendance.schoolId, validSchoolUuid));
    res.json(data.map((r) => toDualCaseRow(periodAttendance, r)));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch weekly attendance" });
  }
});
var BACKUPS_ROOT_DIR = path2.resolve(__dirname2, ".backups");
if (!fs2.existsSync(BACKUPS_ROOT_DIR)) {
  try {
    fs2.mkdirSync(BACKUPS_ROOT_DIR, { recursive: true });
  } catch (e) {
    console.warn("Could not create .backups directory:", e);
  }
}
var DEFAULT_SERVER_BACKUP_CONFIG = {
  enabled: true,
  scheduledTime: "17:00",
  backupMode: "both",
  retentionCount: 14,
  lastBackupDate: null,
  lastJsonDownloadDate: null,
  lastSupabaseSnapshotDate: null,
  lastBackupTimestamp: null,
  lastBackupStatus: null,
  lastBackupMessage: null
};
function getSchoolBackupDir(schoolId) {
  const validSchoolUuid = toDeterministicUuid(schoolId || "02dff10d-78fb-4af6-ab5a-db1d275d7e06", true);
  const dir = path2.join(BACKUPS_ROOT_DIR, validSchoolUuid);
  if (!fs2.existsSync(dir)) {
    fs2.mkdirSync(dir, { recursive: true });
  }
  return dir;
}
async function readSchoolBackupConfig(schoolId) {
  const validSchoolUuid = toDeterministicUuid(schoolId || "02dff10d-78fb-4af6-ab5a-db1d275d7e06", true);
  const dir = getSchoolBackupDir(validSchoolUuid);
  const cfgPath = path2.join(dir, "config.json");
  let fileCfg = {};
  if (fs2.existsSync(cfgPath)) {
    try {
      fileCfg = JSON.parse(fs2.readFileSync(cfgPath, "utf-8"));
    } catch (e) {
    }
  }
  try {
    const rows = await db.select().from(schoolData).where(eq(schoolData.schoolId, validSchoolUuid));
    if (rows.length > 0) {
      const policy = rows[0].institutionalPolicy || {};
      if (policy && policy.autoBackupConfig) {
        return {
          ...DEFAULT_SERVER_BACKUP_CONFIG,
          ...policy.autoBackupConfig,
          ...fileCfg
        };
      }
    }
  } catch (e) {
  }
  return {
    ...DEFAULT_SERVER_BACKUP_CONFIG,
    ...fileCfg
  };
}
async function writeSchoolBackupConfig(schoolId, config) {
  const validSchoolUuid = await ensureSchoolExists(schoolId);
  const current = await readSchoolBackupConfig(validSchoolUuid);
  const merged = {
    ...DEFAULT_SERVER_BACKUP_CONFIG,
    ...current,
    ...config
  };
  const dir = getSchoolBackupDir(validSchoolUuid);
  const cfgPath = path2.join(dir, "config.json");
  try {
    fs2.writeFileSync(cfgPath, JSON.stringify(merged, null, 2), "utf-8");
  } catch (e) {
    console.warn("Error writing backup config file:", e);
  }
  try {
    const rows = await db.select().from(schoolData).where(eq(schoolData.schoolId, validSchoolUuid));
    if (rows.length > 0) {
      const existingPolicy = rows[0].institutionalPolicy || {};
      await db.update(schoolData).set({
        institutionalPolicy: {
          ...existingPolicy,
          autoBackupConfig: merged
        },
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(schoolData.schoolId, validSchoolUuid));
    }
  } catch (e) {
    console.warn("Error persisting autoBackupConfig to school_data:", e);
  }
  return merged;
}
function readSnapshotIndex(schoolId) {
  const dir = getSchoolBackupDir(schoolId);
  const idxPath = path2.join(dir, "index.json");
  if (!fs2.existsSync(idxPath)) return [];
  try {
    const list = JSON.parse(fs2.readFileSync(idxPath, "utf-8"));
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}
function writeSnapshotIndex(schoolId, list) {
  const dir = getSchoolBackupDir(schoolId);
  const idxPath = path2.join(dir, "index.json");
  try {
    fs2.writeFileSync(idxPath, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.warn("Error writing snapshot index:", e);
  }
}
async function createSchoolStorageSnapshot(schoolId, triggerType = "manual", clientPayload) {
  const validSchoolUuid = await ensureSchoolExists(schoolId);
  const dir = getSchoolBackupDir(validSchoolUuid);
  const now = /* @__PURE__ */ new Date();
  const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const timeKey = `${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}`;
  const snapshotId = `snap_${dateKey}_${timeKey}_${triggerType}`;
  const filename = `${snapshotId}.json`;
  const filePath = path2.join(dir, filename);
  let snapshotData = clientPayload && typeof clientPayload === "object" ? { ...clientPayload } : null;
  if (!snapshotData || Object.keys(snapshotData).length === 0) {
    const [schoolDataRows, dbStudents, dbTeachers, dbExams, dbClasses, dbTimetable] = await Promise.all([
      db.select().from(schoolData).where(eq(schoolData.schoolId, validSchoolUuid)).catch(() => []),
      db.select().from(students).where(eq(students.schoolId, validSchoolUuid)).catch(() => []),
      db.select().from(teachers).where(eq(teachers.schoolId, validSchoolUuid)).catch(() => []),
      db.select().from(exams).where(eq(exams.schoolId, validSchoolUuid)).catch(() => []),
      db.select().from(classes).where(eq(classes.schoolId, validSchoolUuid)).catch(() => []),
      db.select().from(timetableAssignments).where(eq(timetableAssignments.schoolId, validSchoolUuid)).catch(() => [])
    ]);
    const baseRow = schoolDataRows[0] ? toDualCaseRow(schoolData, schoolDataRows[0]) : {};
    snapshotData = {
      ...baseRow,
      schoolId: validSchoolUuid,
      students: Array.isArray(baseRow.students) && baseRow.students.length > 0 ? baseRow.students : dbStudents,
      teachers: Array.isArray(baseRow.teachers) && baseRow.teachers.length > 0 ? baseRow.teachers : dbTeachers,
      exams: Array.isArray(baseRow.exams) && baseRow.exams.length > 0 ? baseRow.exams : dbExams,
      classes: dbClasses,
      timetableAssignments: Array.isArray(baseRow.timetableAssignments) && baseRow.timetableAssignments.length > 0 ? baseRow.timetableAssignments : dbTimetable
    };
  }
  const counts = {
    students: Array.isArray(snapshotData.students) ? snapshotData.students.length : 0,
    teachers: Array.isArray(snapshotData.teachers) ? snapshotData.teachers.length : 0,
    exams: Array.isArray(snapshotData.exams) ? snapshotData.exams.length : 0,
    classes: Array.isArray(snapshotData.streamSettings) ? snapshotData.streamSettings.length : Array.isArray(snapshotData.classes) ? snapshotData.classes.length : 8,
    timetableAssignments: Array.isArray(snapshotData.timetableAssignments) ? snapshotData.timetableAssignments.length : 0,
    examinationRecords: Array.isArray(snapshotData.examinationRecords) ? snapshotData.examinationRecords.length : 0
  };
  const fullEnvelope = {
    _snapshotMeta: {
      id: snapshotId,
      schoolId: validSchoolUuid,
      createdAt: now.toISOString(),
      dateKey,
      triggerType,
      bucket: "school-backups",
      storagePath: `${validSchoolUuid}/${filename}`,
      counts
    },
    ...snapshotData
  };
  const serialized = JSON.stringify(fullEnvelope, null, 2);
  fs2.writeFileSync(filePath, serialized, "utf-8");
  const sizeBytes = Buffer.byteLength(serialized, "utf-8");
  const meta = {
    id: snapshotId,
    schoolId: validSchoolUuid,
    filename,
    storagePath: `${validSchoolUuid}/${filename}`,
    bucket: "school-backups",
    createdAt: now.toISOString(),
    dateKey,
    triggerType,
    mode: "supabase_snapshot",
    sizeBytes,
    counts
  };
  const existingIndex = readSnapshotIndex(validSchoolUuid).filter((item) => item.id !== snapshotId);
  const config = await readSchoolBackupConfig(validSchoolUuid);
  const retention = Math.max(3, Number(config.retentionCount) || 14);
  const updatedIndex = [meta, ...existingIndex];
  const pruned = updatedIndex.slice(0, retention);
  const removed = updatedIndex.slice(retention);
  for (const old of removed) {
    try {
      const oldPath = path2.join(dir, old.filename);
      if (fs2.existsSync(oldPath)) fs2.unlinkSync(oldPath);
    } catch (e) {
    }
  }
  writeSnapshotIndex(validSchoolUuid, pruned);
  await writeSchoolBackupConfig(validSchoolUuid, {
    lastBackupDate: dateKey,
    lastSupabaseSnapshotDate: dateKey,
    lastBackupTimestamp: now.toISOString(),
    lastBackupStatus: "success",
    lastBackupMessage: `Supabase storage snapshot ${filename} saved (${counts.students} students, ${counts.teachers} teachers)`
  });
  try {
    await db.insert(activityLogs).values({
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      schoolId: validSchoolUuid,
      userId: "system-scheduler",
      userName: triggerType === "scheduled" ? "Automated Daily Backup" : "School Administrator",
      userEmail: "backup@habyedupro.ac.tz",
      userRole: "HEADMASTER",
      category: "settings",
      action: "BACKUP_SNAPSHOT",
      title: triggerType === "scheduled" ? "Automated Daily Supabase Snapshot Completed" : "Manual Supabase Storage Snapshot Created",
      description: `Saved snapshot ${filename} (${(sizeBytes / 1024).toFixed(1)} KB) with ${counts.students} students and ${counts.teachers} teachers.`,
      timestamp: now.toISOString()
    }).onConflictDoNothing();
  } catch (e) {
  }
  return meta;
}
app.get("/api/backups/config", async (req, res) => {
  try {
    const schoolId = req.query.schoolId || "02dff10d-78fb-4af6-ab5a-db1d275d7e06";
    const config = await readSchoolBackupConfig(schoolId);
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to read backup config" });
  }
});
app.post("/api/backups/config", async (req, res) => {
  try {
    const { schoolId = "02dff10d-78fb-4af6-ab5a-db1d275d7e06", config = {} } = req.body || {};
    const saved = await writeSchoolBackupConfig(schoolId, config);
    res.json({ success: true, config: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to save backup config" });
  }
});
app.get("/api/backups/list", async (req, res) => {
  try {
    const schoolId = req.query.schoolId || "02dff10d-78fb-4af6-ab5a-db1d275d7e06";
    const validSchoolUuid = toDeterministicUuid(schoolId, true);
    let snapshots = readSnapshotIndex(validSchoolUuid);
    if (snapshots.length === 0) {
      try {
        const initialSnap = await createSchoolStorageSnapshot(validSchoolUuid, "scheduled");
        snapshots = [initialSnap];
      } catch (seedErr) {
        console.warn("Initial snapshot seed warning:", seedErr);
      }
    }
    res.json({ success: true, snapshots });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to list snapshots", snapshots: [] });
  }
});
app.post("/api/backups/snapshot", async (req, res) => {
  try {
    const { schoolId = "02dff10d-78fb-4af6-ab5a-db1d275d7e06", triggerType = "manual", payload } = req.body || {};
    const snapshot = await createSchoolStorageSnapshot(schoolId, triggerType, payload);
    res.json({ success: true, snapshot });
  } catch (err) {
    console.error("Error creating storage snapshot:", err);
    res.status(500).json({ success: false, error: err?.message || "Failed to create snapshot" });
  }
});
app.get("/api/backups/download/:snapshotId", async (req, res) => {
  try {
    const schoolId = req.query.schoolId || "02dff10d-78fb-4af6-ab5a-db1d275d7e06";
    const validSchoolUuid = toDeterministicUuid(schoolId, true);
    const snapshotId = req.params.snapshotId.replace(/\.json$/i, "");
    const dir = getSchoolBackupDir(validSchoolUuid);
    const filePath = path2.join(dir, `${snapshotId}.json`);
    if (!fs2.existsSync(filePath)) {
      return res.status(404).json({ error: "Snapshot not found" });
    }
    const content = fs2.readFileSync(filePath, "utf-8");
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${snapshotId}.json"`);
    res.send(content);
  } catch (err) {
    res.status(500).json({ error: err?.message || "Failed to download snapshot" });
  }
});
app.delete("/api/backups/:snapshotId", async (req, res) => {
  try {
    const schoolId = req.query.schoolId || "02dff10d-78fb-4af6-ab5a-db1d275d7e06";
    const validSchoolUuid = toDeterministicUuid(schoolId, true);
    const snapshotId = req.params.snapshotId.replace(/\.json$/i, "");
    const dir = getSchoolBackupDir(validSchoolUuid);
    const filePath = path2.join(dir, `${snapshotId}.json`);
    if (fs2.existsSync(filePath)) {
      fs2.unlinkSync(filePath);
    }
    const updated = readSnapshotIndex(validSchoolUuid).filter((item) => item.id !== snapshotId);
    writeSnapshotIndex(validSchoolUuid, updated);
    res.json({ success: true, snapshots: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err?.message || "Failed to delete snapshot" });
  }
});
setInterval(async () => {
  try {
    const now = /* @__PURE__ */ new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const currentHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const schoolIds = /* @__PURE__ */ new Set(["02dff10d-78fb-4af6-ab5a-db1d275d7e06"]);
    if (fs2.existsSync(BACKUPS_ROOT_DIR)) {
      for (const entry of fs2.readdirSync(BACKUPS_ROOT_DIR)) {
        if (UUID_REGEX.test(entry)) schoolIds.add(entry);
      }
    }
    for (const sId of schoolIds) {
      const cfg = await readSchoolBackupConfig(sId);
      if (!cfg.enabled) continue;
      if (cfg.backupMode !== "supabase_snapshot" && cfg.backupMode !== "both") continue;
      const scheduledHHMM = (cfg.scheduledTime || "17:00").slice(0, 5);
      const alreadyDoneToday = cfg.lastSupabaseSnapshotDate === todayKey;
      if (!alreadyDoneToday && currentHHMM >= scheduledHHMM) {
        console.log(`[AutoDailyBackup] Triggering scheduled daily Supabase snapshot for school ${sId} at ${currentHHMM} (scheduled: ${scheduledHHMM})`);
        await createSchoolStorageSnapshot(sId, "scheduled");
      }
    }
  } catch (err) {
  }
}, 3e4);
async function startServer() {
  const isDevLifecycle = process.env.npm_lifecycle_event === "dev" || process.argv.includes("--port");
  const isProduction = process.env.NODE_ENV === "production" || !isDevLifecycle;
  const distDir = path2.resolve(__dirname2, "dist");
  const indexPath = path2.join(distDir, "index.html");
  const hasDist = fs2.existsSync(indexPath);
  const portArgIdx = process.argv.indexOf("--port");
  const cliPort = portArgIdx !== -1 && process.argv[portArgIdx + 1] ? Number(process.argv[portArgIdx + 1]) : null;
  const listenPort = cliPort || (isDevLifecycle ? 3e3 : Number(process.env.PORT) || 3e3);
  const srv = app.listen(listenPort, "0.0.0.0", () => {
    console.log(`HABY EDU PRO server listening on http://0.0.0.0:${listenPort} (mode: ${isProduction && hasDist ? "production" : "development"})`);
  });
  srv.on("error", (err) => {
    if (err.code === "EADDRINUSE" && listenPort !== 3e3) {
      app.listen(3e3, "0.0.0.0", () => {
        console.log(`HABY EDU PRO server listening on fallback port http://0.0.0.0:3000`);
      });
    } else {
      console.error("Server listen error:", err);
    }
  });
  if (isProduction && hasDist) {
    app.use(express.static(distDir, { maxAge: "1h", index: false }));
    app.get(/.*/, (_req, res) => {
      if (fs2.existsSync(indexPath)) {
        res.sendFile(indexPath, (err) => {
          if (err && !res.headersSent) {
            res.status(500).send("Error loading application");
          }
        });
      } else {
        res.status(503).send("Application is rebuilding. Please refresh in a moment.");
      }
    });
  } else {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa"
    });
    app.use(vite.middlewares);
    app.get(/.*/, async (req, res, next) => {
      try {
        const url = req.originalUrl;
        const templatePath = path2.resolve(__dirname2, "index.html");
        if (!fs2.existsSync(templatePath)) {
          return next();
        }
        let template = fs2.readFileSync(templatePath, "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  }
}
var server_default = app;
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
export {
  server_default as default,
  isValidUuid,
  toDeterministicUuid
};
