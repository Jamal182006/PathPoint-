import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Calendar as CalendarIcon,
  Building,
} from 'lucide-react';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const MonthCalendar = ({ interviews = [], onDateClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonthDays = new Date(year, month, 0).getDate();

  const now = new Date();
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const monthName = currentDate.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  // Map interviews to date keys e.g. "YYYY-MM-DD"
  const interviewMap = {};
  interviews.forEach((item) => {
    const d = new Date(item.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!interviewMap[key]) {
      interviewMap[key] = [];
    }
    interviewMap[key].push(item);
  });

  // Build grid calendar cells (42 cells: 6 rows of 7)
  const cells = [];

  // 1. Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    cells.push({
      day: dayNum,
      isCurrentMonth: false,
      dateString: `${month === 0 ? year - 1 : year}-${String(month === 0 ? 12 : month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`,
    });
  }

  // 2. Current month days
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const cellDate = new Date(year, month, dayNum);
    const isToday =
      cellDate.getDate() === now.getDate() &&
      cellDate.getMonth() === now.getMonth() &&
      cellDate.getFullYear() === now.getFullYear();

    cells.push({
      day: dayNum,
      isCurrentMonth: true,
      isToday,
      dateString: dateStr,
      interviews: interviewMap[dateStr] || [],
    });
  }

  // 3. Next month leading days
  const remaining = 42 - cells.length;
  for (let dayNum = 1; dayNum <= remaining; dayNum++) {
    cells.push({
      day: dayNum,
      isCurrentMonth: false,
      dateString: `${month === 11 ? year + 1 : year}-${String(month === 11 ? 1 : month + 2).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`,
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Calendar Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:px-6 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            {monthName}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition"
          >
            Today
          </button>
          <div className="flex items-center bg-white border border-slate-300 rounded-lg shadow-sm">
            <button
              onClick={prevMonth}
              className="p-1.5 hover:bg-slate-50 text-slate-600 rounded-l-lg transition"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="w-px h-4 bg-slate-200" />
            <button
              onClick={nextMonth}
              className="p-1.5 hover:bg-slate-50 text-slate-600 rounded-r-lg transition"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Weekday Names Header */}
      <div className="grid grid-cols-7 border-b border-slate-200 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 py-2.5">
        {DAYS_OF_WEEK.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Day Cells Grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 border-b border-slate-100">
        {cells.map((cell, idx) => {
          const hasEvents = cell.interviews && cell.interviews.length > 0;

          return (
            <div
              key={idx}
              className={`min-h-[105px] sm:min-h-[120px] p-2 flex flex-col justify-between transition-colors ${
                !cell.isCurrentMonth
                  ? 'bg-slate-50/50 text-slate-400'
                  : 'bg-white hover:bg-slate-50/40 text-slate-800'
              }`}
            >
              {/* Cell Day Header */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                    cell.isToday
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : cell.isCurrentMonth
                      ? 'text-slate-700'
                      : 'text-slate-400'
                  }`}
                >
                  {cell.day}
                </span>

                {hasEvents && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded-full">
                    {cell.interviews.length}
                  </span>
                )}
              </div>

              {/* Event Pills */}
              <div className="flex-1 space-y-1 overflow-y-auto max-h-[80px]">
                {cell.interviews?.map((ev, evIdx) => {
                  const isUrgent = ev.isUpcomingWithin7Days;
                  return (
                    <Link
                      key={evIdx}
                      to={`/applications/${ev.appId}`}
                      className={`block p-1 rounded-md text-[11px] font-medium truncate transition border shadow-xs ${
                        isUrgent
                          ? 'bg-amber-50 border-amber-200 text-amber-900 hover:border-amber-400'
                          : 'bg-indigo-50 border-indigo-100 text-indigo-900 hover:border-indigo-300'
                      }`}
                      title={`${ev.role} @ ${ev.company}`}
                    >
                      <div className="flex items-center gap-1">
                        {isUrgent && (
                          <Sparkles className="w-2.5 h-2.5 text-amber-600 flex-shrink-0 animate-pulse" />
                        )}
                        <span className="truncate font-semibold">{ev.company}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">{ev.role}</div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthCalendar;
