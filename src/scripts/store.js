/**
 * AttendanceStore — localStorage-backed data layer
 * Manages courses, timetable, attendance records, and settings.
 */

const KEYS = {
  COURSES: 'att_courses',
  TIMETABLE: 'att_timetable',
  RECORDS: 'att_records',
  SETTINGS: 'att_settings',
};

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_MAP = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };

const COURSE_COLORS = [
  '#0070f3', '#7928ca', '#ff0080', '#f5a623', '#50e3c2',
  '#ee0000', '#00dfd8', '#ff4d4d', '#f9cb28', '#79ffe1',
  '#0761d1', '#eb367f', '#ab570a', '#29bc9b', '#4c2889',
];

const STATUS_TYPES = {
  PRESENT: 'present',
  ABSENT: 'absent',
  HOLIDAY: 'holiday',
  CANCELLED: 'cancelled',
  LATE: 'late',
  ON_DUTY: 'on_duty',
};

// Statuses that count as "attended"
const ATTENDED_STATUSES = [STATUS_TYPES.PRESENT, STATUS_TYPES.LATE, STATUS_TYPES.ON_DUTY];
// Statuses that count as "conducted" (affects percentage)
const CONDUCTED_STATUSES = [STATUS_TYPES.PRESENT, STATUS_TYPES.ABSENT, STATUS_TYPES.LATE, STATUS_TYPES.ON_DUTY];

function _get(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function _set(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── Courses ───────────────────────────────────────────────

function getCourses() {
  return _get(KEYS.COURSES) || [];
}

function addCourse(course) {
  const courses = getCourses();
  const id = course.code.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36);
  const color = course.color || COURSE_COLORS[courses.length % COURSE_COLORS.length];
  const newCourse = {
    id,
    code: course.code.trim().toUpperCase(),
    name: course.name.trim(),
    color,
    minAttendance: course.minAttendance || 75,
  };
  courses.push(newCourse);
  _set(KEYS.COURSES, courses);
  return newCourse;
}

function updateCourse(id, updates) {
  const courses = getCourses();
  const idx = courses.findIndex(c => c.id === id);
  if (idx === -1) return null;
  courses[idx] = { ...courses[idx], ...updates };
  _set(KEYS.COURSES, courses);
  return courses[idx];
}

function deleteCourse(id) {
  const courses = getCourses().filter(c => c.id !== id);
  _set(KEYS.COURSES, courses);
  // Also remove from timetable
  const tt = getTimetable();
  for (const day of DAYS) {
    if (tt[day]) {
      tt[day] = tt[day].filter(slot => slot.courseId !== id);
    }
  }
  _set(KEYS.TIMETABLE, tt);
}

function getCourseById(id) {
  return getCourses().find(c => c.id === id) || null;
}

// ─── Timetable ─────────────────────────────────────────────

function getTimetable() {
  const tt = _get(KEYS.TIMETABLE);
  if (tt) return tt;
  const empty = {};
  for (const day of DAYS) empty[day] = [];
  return empty;
}

function setTimetableSlot(day, period, courseId, startTime, endTime, type = 'lecture') {
  const tt = getTimetable();
  if (!tt[day]) tt[day] = [];
  // Remove existing slot at this period
  tt[day] = tt[day].filter(s => s.period !== period);
  if (courseId) {
    tt[day].push({ period, courseId, startTime, endTime, type });
    tt[day].sort((a, b) => a.period - b.period);
  }
  _set(KEYS.TIMETABLE, tt);
}

function removeTimetableSlot(day, period) {
  const tt = getTimetable();
  if (tt[day]) {
    tt[day] = tt[day].filter(s => s.period !== period);
    _set(KEYS.TIMETABLE, tt);
  }
}

function getDaySchedule(day) {
  const tt = getTimetable();
  return (tt[day] || []).sort((a, b) => a.period - b.period);
}

function getTodaySchedule() {
  const dayIndex = new Date().getDay();
  const day = DAY_MAP[dayIndex];
  if (day === 'sunday') return [];
  return getDaySchedule(day);
}

// ─── Attendance Records ────────────────────────────────────

function getRecords() {
  return _get(KEYS.RECORDS) || {};
}

function getDateRecord(dateStr) {
  const records = getRecords();
  return records[dateStr] || {};
}

function markAttendance(dateStr, period, courseId, status) {
  const records = getRecords();
  if (!records[dateStr]) records[dateStr] = {};
  const key = `${period}_${courseId}`;
  records[dateStr][key] = { period, courseId, status, timestamp: Date.now() };
  _set(KEYS.RECORDS, records);
}

function markDayStatus(dateStr, daySchedule, status) {
  const records = getRecords();
  if (!records[dateStr]) records[dateStr] = {};
  for (const slot of daySchedule) {
    const key = `${slot.period}_${slot.courseId}`;
    records[dateStr][key] = { period: slot.period, courseId: slot.courseId, status, timestamp: Date.now() };
  }
  _set(KEYS.RECORDS, records);
}

function getSlotStatus(dateStr, period, courseId) {
  const record = getDateRecord(dateStr);
  const key = `${period}_${courseId}`;
  return record[key]?.status || null;
}

// ─── Statistics & Calculations ─────────────────────────────

function getCourseStats(courseId) {
  const records = getRecords();
  let total = 0;
  let attended = 0;
  let absent = 0;
  let holidays = 0;
  let cancelled = 0;
  let late = 0;
  let onDuty = 0;

  for (const dateStr of Object.keys(records)) {
    for (const key of Object.keys(records[dateStr])) {
      const entry = records[dateStr][key];
      if (entry.courseId !== courseId) continue;

      if (CONDUCTED_STATUSES.includes(entry.status)) {
        total++;
        if (ATTENDED_STATUSES.includes(entry.status)) attended++;
        if (entry.status === STATUS_TYPES.ABSENT) absent++;
        if (entry.status === STATUS_TYPES.LATE) late++;
        if (entry.status === STATUS_TYPES.ON_DUTY) onDuty++;
      }
      if (entry.status === STATUS_TYPES.HOLIDAY) holidays++;
      if (entry.status === STATUS_TYPES.CANCELLED) cancelled++;
    }
  }

  const percentage = total > 0 ? Math.round((attended / total) * 10000) / 100 : 100;
  return { total, attended, absent, holidays, cancelled, late, onDuty, percentage };
}

// ─── Extra Classes ───────────────────────────────────────────

function getExtraClasses() {
  try {
    const data = localStorage.getItem('att_extra_classes');
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveExtraClasses(data) {
  localStorage.setItem('att_extra_classes', JSON.stringify(data));
}

function getExtraClassesForDate(dateStr) {
  const allExtra = getExtraClasses();
  return allExtra[dateStr] || [];
}

function addExtraClass(dateStr, courseId, startTime, endTime, notes = '') {
  const allExtra = getExtraClasses();
  if (!allExtra[dateStr]) {
    allExtra[dateStr] = [];
  }
  
  const id = `extra-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  allExtra[dateStr].push({
    id,
    courseId,
    startTime,
    endTime,
    notes,
    isExtra: true,
  });
  
  saveExtraClasses(allExtra);
  return id;
}

function deleteExtraClass(dateStr, extraClassId) {
  const allExtra = getExtraClasses();
  if (allExtra[dateStr]) {
    allExtra[dateStr] = allExtra[dateStr].filter(c => c.id !== extraClassId);
    if (allExtra[dateStr].length === 0) {
      delete allExtra[dateStr];
    }
    saveExtraClasses(allExtra);
  }
}

function getOverallStats() {
  const courses = getCourses();
  let totalClasses = 0;
  let totalAttended = 0;
  let totalAbsent = 0;

  const courseStats = [];
  for (const course of courses) {
    const stats = getCourseStats(course.id);
    totalClasses += stats.total;
    totalAttended += stats.attended;
    totalAbsent += stats.absent;
    courseStats.push({ ...course, ...stats });
  }

  const percentage = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 10000) / 100 : 100;
  return { totalClasses, totalAttended, totalAbsent, percentage, courseStats };
}

function getCurrentStreak() {
  const records = getRecords();
  const dates = Object.keys(records).sort().reverse();
  let streak = 0;

  for (const dateStr of dates) {
    const dayRecords = records[dateStr];
    const entries = Object.values(dayRecords);
    const conductedEntries = entries.filter(e => CONDUCTED_STATUSES.includes(e.status));
    if (conductedEntries.length === 0) continue; // skip holidays/cancelled only days
    const allPresent = conductedEntries.every(e => ATTENDED_STATUSES.includes(e.status));
    if (allPresent) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function getBunkableClasses(courseId) {
  const course = getCourseById(courseId);
  if (!course) return 0;
  const stats = getCourseStats(courseId);
  const minPct = course.minAttendance / 100;

  if (stats.total === 0) return 0;

  let bunkable = 0;
  let attended = stats.attended;
  let total = stats.total;

  while (true) {
    total++;
    const newPct = attended / total;
    if (newPct < minPct) break;
    bunkable++;
  }
  return bunkable;
}

function getClassesNeeded(courseId) {
  const course = getCourseById(courseId);
  if (!course) return 0;
  const stats = getCourseStats(courseId);
  const minPct = course.minAttendance / 100;

  if (stats.percentage >= course.minAttendance) return 0;

  let needed = 0;
  let attended = stats.attended;
  let total = stats.total;

  while (attended / total < minPct && needed < 500) {
    attended++;
    total++;
    needed++;
  }
  return needed;
}

function getPredictedPercentage(courseId, futureDays = 30) {
  const stats = getCourseStats(courseId);
  if (stats.total === 0) return 100;

  const dailyRate = stats.percentage / 100;
  // Estimate classes per day from timetable
  const tt = getTimetable();
  let classesPerWeek = 0;
  for (const day of DAYS) {
    classesPerWeek += (tt[day] || []).filter(s => s.courseId === courseId).length;
  }
  const classesPerDay = classesPerWeek / 6;
  const futureClasses = Math.round(classesPerDay * futureDays);
  const futureAttended = Math.round(futureClasses * dailyRate);

  const totalFuture = stats.total + futureClasses;
  const attendedFuture = stats.attended + futureAttended;
  return totalFuture > 0 ? Math.round((attendedFuture / totalFuture) * 100) : stats.percentage;
}

function getAttendanceTrend(days = 30) {
  const records = getRecords();
  const today = new Date();
  const trend = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayRecords = records[dateStr] || {};
    const entries = Object.values(dayRecords);
    const conducted = entries.filter(e => CONDUCTED_STATUSES.includes(e.status));
    const attended = conducted.filter(e => ATTENDED_STATUSES.includes(e.status));

    trend.push({
      date: dateStr,
      label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      total: conducted.length,
      attended: attended.length,
      percentage: conducted.length > 0 ? Math.round((attended.length / conducted.length) * 100) : null,
    });
  }
  return trend;
}

function getCalendarData(year, month) {
  const records = getRecords();
  const data = {};
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayRecords = records[dateStr] || {};
    const entries = Object.values(dayRecords);
    const conducted = entries.filter(e => CONDUCTED_STATUSES.includes(e.status));
    const attended = conducted.filter(e => ATTENDED_STATUSES.includes(e.status));

    if (entries.length > 0) {
      const allHoliday = entries.every(e => e.status === STATUS_TYPES.HOLIDAY);
      const allCancelled = entries.every(e => e.status === STATUS_TYPES.CANCELLED);
      data[day] = {
        total: conducted.length,
        attended: attended.length,
        percentage: conducted.length > 0 ? Math.round((attended.length / conducted.length) * 100) : null,
        isHoliday: allHoliday,
        isCancelled: allCancelled,
        hasRecords: true,
      };
    }
  }
  return data;
}

// ─── Settings ──────────────────────────────────────────────

function getSettings() {
  return _get(KEYS.SETTINGS) || {
    semesterStart: '',
    semesterEnd: '',
    onboardingComplete: false,
    theme: 'dark',
    periodsPerDay: 8,
    userName: '',
    userRoll: '',
    userBranch: '',
    userYear: '',
    userSemester: '',
    userSection: '',
  };
}

function updateSettings(updates) {
  const settings = getSettings();
  Object.assign(settings, updates);
  _set(KEYS.SETTINGS, settings);
  return settings;
}

function isOnboardingComplete() {
  return getSettings().onboardingComplete;
}

// ─── Data Export/Import ────────────────────────────────────

function exportData() {
  return JSON.stringify({
    courses: getCourses(),
    timetable: getTimetable(),
    records: getRecords(),
    settings: getSettings(),
    exportedAt: new Date().toISOString(),
    version: 1,
  }, null, 2);
}

function importData(jsonStr) {
  try {
    const data = JSON.parse(jsonStr);
    if (data.courses) _set(KEYS.COURSES, data.courses);
    if (data.timetable) _set(KEYS.TIMETABLE, data.timetable);
    if (data.records) _set(KEYS.RECORDS, data.records);
    if (data.settings) _set(KEYS.SETTINGS, data.settings);
    return true;
  } catch {
    return false;
  }
}

function resetAllData() {
  localStorage.removeItem(KEYS.COURSES);
  localStorage.removeItem(KEYS.TIMETABLE);
  localStorage.removeItem(KEYS.RECORDS);
  localStorage.removeItem(KEYS.SETTINGS);
}

// ─── Date Helpers ──────────────────────────────────────────

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function getDayName(date) {
  return DAY_MAP[date.getDay()];
}

function getToday() {
  return formatDate(new Date());
}

// ─── Exports ───────────────────────────────────────────────

export {
  DAYS,
  DAY_MAP,
  STATUS_TYPES,
  COURSE_COLORS,
  ATTENDED_STATUSES,
  CONDUCTED_STATUSES,
  // Courses
  getCourses,
  addCourse,
  updateCourse,
  deleteCourse,
  getCourseById,
  // Timetable
  getTimetable,
  setTimetableSlot,
  removeTimetableSlot,
  getDaySchedule,
  getTodaySchedule,
  // Records
  getRecords,
  getDateRecord,
  markAttendance,
  markDayStatus,
  getSlotStatus,
  // Stats
  getCourseStats,
  getOverallStats,
  getCurrentStreak,
  getBunkableClasses,
  getClassesNeeded,
  getPredictedPercentage,
  getAttendanceTrend,
  getCalendarData,
  // Extra Classes
  getExtraClasses,
  saveExtraClasses,
  getExtraClassesForDate,
  addExtraClass,
  deleteExtraClass,
  // Settings
  getSettings,
  updateSettings,
  isOnboardingComplete,
  // Data management
  exportData,
  importData,
  resetAllData,
  // Helpers
  formatDate,
  getDayName,
  getToday,
};
