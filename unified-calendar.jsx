import { useState, useEffect } from "react";

// --- Data from live sources ---
const CALENDAR_EVENTS = [
  // Googleカレンダー & Apple Calendar events (May-June 2026)
  { id: "1", date: "2026-05-03", title: "憲法記念日", type: "holiday", allDay: true },
  { id: "2", date: "2026-05-04", title: "みどりの日", type: "holiday", allDay: true },
  { id: "3", date: "2026-05-05", title: "こどもの日", type: "holiday", allDay: true },
  { id: "4", date: "2026-05-06", title: "振替休日", type: "holiday", allDay: true },
  { id: "5", date: "2026-05-08", title: "ドコモショップ", type: "event", time: "10:00〜11:00" },
  { id: "6", date: "2026-05-08", title: "湘南美容外科", type: "event", time: "15:30〜16:30" },
  { id: "7", date: "2026-05-10", title: "母の日", type: "holiday", allDay: true },
  { id: "8", date: "2026-05-10", title: "有給", type: "personal", allDay: true },
  { id: "9", date: "2026-05-13", title: "健康診断（順風会）", type: "event", time: "07:40〜08:10" },
  { id: "10", date: "2026-05-15", title: "日本語ランキング", type: "youtube", allDay: true },
  { id: "11", date: "2026-05-16", title: "散髪", type: "personal", time: "09:00〜10:00" },
  { id: "12", date: "2026-05-17", title: "西田クリニック休診開始", type: "event", allDay: true },
  { id: "13", date: "2026-05-20", title: "誕生日おめでとう！", type: "personal", allDay: true },
  { id: "14", date: "2026-05-22", title: "英語ランキング", type: "youtube", allDay: true },
  { id: "15", date: "2026-05-30", title: "5月まとめ動画", type: "youtube", allDay: true },
  { id: "16", date: "2026-06-05", title: "1時間日本語", type: "personal", allDay: true },
  { id: "17", date: "2026-06-06", title: "今村晃マスターさんの誕生日", type: "birthday", allDay: true },
  { id: "18", date: "2026-06-12", title: "1時間英語", type: "personal", allDay: true },
  { id: "19", date: "2026-06-14", title: "湘南美容外科", type: "event", time: "16:15〜16:45" },
  { id: "20", date: "2026-06-19", title: "日本語ランキング", type: "youtube", allDay: true },
  { id: "21", date: "2026-06-24", title: "西田クリニック代診", type: "event", allDay: true },
  { id: "22", date: "2026-06-26", title: "英語ランキング", type: "youtube", allDay: true },
  { id: "23", date: "2026-06-26", title: "西田クリニック代診", type: "event", allDay: true },
  { id: "24", date: "2026-06-29", title: "6月まとめ動画", type: "youtube", allDay: true },
  // 繰り返し: 新曲投稿 月水土
  ...["05-02","05-04","05-06","05-09","05-11","05-13","05-16","05-18","05-20","05-23","05-25","05-27","05-29",
      "06-01","06-03","06-06","06-08","06-10","06-13","06-15","06-17","06-20","06-22","06-24","06-27"].map((d, i) => ({
    id: `music-${i}`, date: `2026-${d}`, title: "新曲投稿", type: "youtube", allDay: true
  })),
  // 繰り返し: ショート動画 火日木
  ...["05-03","05-05","05-07","05-10","05-12","05-14","05-17","05-19","05-21","05-24","05-26","05-28","05-31",
      "06-02","06-04","06-07","06-09","06-11","06-14","06-16","06-18","06-21","06-23","06-25","06-28","06-30"].map((d, i) => ({
    id: `short-${i}`, date: `2026-${d}`, title: "ショート動画", type: "youtube", allDay: true
  })),
];

const REMINDERS = [
  { id: "r1", title: "1000人突破ランキング", done: false },
  { id: "r2", title: "無料配布", done: false },
  { id: "r3", title: "感謝", done: false },
  { id: "r4", title: "ただ一人", done: false },
];

const TYPE_COLORS = {
  holiday: { bg: "#ff4444", text: "#fff", label: "祝日" },
  event: { bg: "#4fc3f7", text: "#000", label: "予定" },
  youtube: { bg: "#ff7043", text: "#fff", label: "YouTube" },
  personal: { bg: "#66bb6a", text: "#fff", label: "個人" },
  birthday: { bg: "#ce93d8", text: "#fff", label: "誕生日" },
  reminder: { bg: "#ffd54f", text: "#000", label: "リマインダー" },
};

const DAYS_JA = ["日", "月", "火", "水", "木", "金", "土"];
const MONTHS_JA = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function UnifiedCalendar() {
  const today = new Date(2026, 4, 19); // May 19, 2026
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(4); // 0-indexed (4 = May)
  const [selectedDate, setSelectedDate] = useState("2026-05-19");
  const [reminders, setReminders] = useState(REMINDERS);
  const [showLegend, setShowLegend] = useState(false);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

  const formatDate = (year, month, day) => {
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${year}-${m}-${d}`;
  };

  const getEventsForDate = (dateStr) =>
    CALENDAR_EVENTS.filter(e => e.date === dateStr);

  const selectedEvents = getEventsForDate(selectedDate);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const toggleReminder = (id) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, done: !r.done } : r));
  };

  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  // Build calendar grid
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f5f5f7",
      fontFamily: "'Noto Sans JP', 'Hiragino Sans', sans-serif",
      color: "#1a1a2e",
      padding: "16px",
      boxSizing: "border-box",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "16px" }}>
        <div style={{
          fontSize: "11px",
          letterSpacing: "4px",
          color: "#999",
          textTransform: "uppercase",
          marginBottom: "4px",
        }}>UNIFIED CALENDAR</div>
        <div style={{
          fontSize: "22px",
          fontWeight: "700",
          background: "linear-gradient(90deg, #7c3aed, #06b6d4)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          letterSpacing: "1px",
        }}>カレンダー + リマインダー</div>
      </div>

      {/* Month Nav */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "12px",
        background: "rgba(0,0,0,0.05)",
        borderRadius: "12px",
        padding: "8px 16px",
        border: "1px solid rgba(0,0,0,0.08)",
      }}>
        <button onClick={prevMonth} style={navBtnStyle}>‹</button>
        <span style={{ fontSize: "18px", fontWeight: "700" }}>
          {viewYear}年 {MONTHS_JA[viewMonth]}
        </span>
        <button onClick={nextMonth} style={navBtnStyle}>›</button>
      </div>

      {/* Calendar Grid */}
      <div style={{
        background: "#ffffff",
        borderRadius: "14px",
        border: "1px solid rgba(0,0,0,0.08)",
        overflow: "hidden",
        marginBottom: "12px",
      }}>
        {/* Day headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
          {DAYS_JA.map((d, i) => (
            <div key={d} style={{
              textAlign: "center",
              padding: "8px 4px",
              fontSize: "11px",
              fontWeight: "700",
              color: i === 0 ? "#e53935" : i === 6 ? "#1e88e5" : "#888",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
            }}>{d}</div>
          ))}
        </div>
        {/* Day cells */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
          {cells.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} style={{ minHeight: "52px" }} />;
            const dateStr = formatDate(viewYear, viewMonth, day);
            const events = getEventsForDate(dateStr);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const isWeekend = (idx % 7 === 0) || (idx % 7 === 6);
            // Deduplicate events by title for dot display
            const uniqueTypes = [...new Set(events.map(e => e.type))].slice(0, 3);

            return (
              <div
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                style={{
                  minHeight: "52px",
                  padding: "4px",
                  cursor: "pointer",
                  borderRight: "1px solid rgba(0,0,0,0.05)",
                  borderBottom: "1px solid rgba(0,0,0,0.05)",
                  background: isSelected
                    ? "rgba(124,58,237,0.1)"
                    : isToday
                    ? "rgba(6,182,212,0.08)"
                    : "transparent",
                  transition: "background 0.15s",
                  position: "relative",
                }}
              >
                <div style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: isToday ? "700" : "400",
                  background: isToday ? "#06b6d4" : "transparent",
                  color: isToday
                    ? "#fff"
                    : idx % 7 === 0 ? "#e53935"
                    : idx % 7 === 6 ? "#1e88e5"
                    : "#1a1a2e",
                  margin: "0 auto",
                }}>
                  {day}
                </div>
                {/* Event dots */}
                <div style={{ display: "flex", gap: "2px", flexWrap: "wrap", justifyContent: "center", marginTop: "2px" }}>
                  {uniqueTypes.map(type => (
                    <div key={type} style={{
                      width: "5px",
                      height: "5px",
                      borderRadius: "50%",
                      background: TYPE_COLORS[type]?.bg || "#888",
                    }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend toggle */}
      <div
        onClick={() => setShowLegend(v => !v)}
        style={{
          cursor: "pointer",
          fontSize: "11px",
          color: "#666",
          textAlign: "center",
          marginBottom: "8px",
        }}
      >
        {showLegend ? "▲ 凡例を隠す" : "▼ 凡例を表示"}
      </div>
      {showLegend && (
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
          marginBottom: "12px",
          padding: "10px",
          background: "#ffffff",
          borderRadius: "10px",
          border: "1px solid rgba(0,0,0,0.08)",
        }}>
          {Object.entries(TYPE_COLORS).map(([type, { bg, text, label }]) => (
            <div key={type} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: bg }} />
              <span style={{ fontSize: "11px", color: "#555" }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Selected Date Events */}
      <div style={{
        background: "#ffffff",
        borderRadius: "14px",
        border: "1px solid rgba(0,0,0,0.08)",
        padding: "14px",
        marginBottom: "12px",
      }}>
        <div style={{
          fontSize: "13px",
          fontWeight: "700",
          color: "#0097a7",
          marginBottom: "10px",
          letterSpacing: "0.5px",
        }}>
          📅 {selectedDate.replace(/-/g, "/")} の予定
        </div>
        {selectedEvents.length === 0 ? (
          <div style={{ fontSize: "13px", color: "#aaa", textAlign: "center", padding: "8px" }}>
            予定なし
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            {selectedEvents.map(ev => {
              const c = TYPE_COLORS[ev.type] || TYPE_COLORS.event;
              return (
                <div key={ev.id} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "#f9f9fb",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  borderLeft: `3px solid ${c.bg}`,
                }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a2e" }}>{ev.title}</div>
                    {ev.time && <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>🕐 {ev.time}</div>}
                    {ev.allDay && !ev.time && <div style={{ fontSize: "11px", color: "#aaa", marginTop: "2px" }}>終日</div>}
                  </div>
                  <div style={{
                    marginLeft: "auto",
                    fontSize: "10px",
                    padding: "2px 7px",
                    borderRadius: "20px",
                    background: c.bg,
                    color: c.text,
                    whiteSpace: "nowrap",
                    fontWeight: "600",
                  }}>{c.label}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reminders */}
      <div style={{
        background: "#ffffff",
        borderRadius: "14px",
        border: "1px solid rgba(0,0,0,0.08)",
        padding: "14px",
      }}>
        <div style={{
          fontSize: "13px",
          fontWeight: "700",
          color: "#d97706",
          marginBottom: "10px",
          letterSpacing: "0.5px",
        }}>
          ✅ リマインダー ({reminders.filter(r => !r.done).length}件)
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
          {reminders.map(r => (
            <div
              key={r.id}
              onClick={() => toggleReminder(r.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: "#f9f9fb",
                borderRadius: "8px",
                padding: "8px 12px",
                cursor: "pointer",
                opacity: r.done ? 0.4 : 1,
                transition: "opacity 0.2s",
                borderLeft: `3px solid ${r.done ? "#ccc" : "#d97706"}`,
              }}
            >
              <div style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                border: `2px solid ${r.done ? "#ccc" : "#d97706"}`,
                background: r.done ? "#ccc" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.2s",
              }}>
                {r.done && <span style={{ fontSize: "10px", color: "#fff" }}>✓</span>}
              </div>
              <span style={{
                fontSize: "13px",
                textDecoration: r.done ? "line-through" : "none",
                color: r.done ? "#aaa" : "#1a1a2e",
              }}>{r.title}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: "10px", color: "#bbb", marginTop: "10px", textAlign: "center" }}>
          タップで完了/未完了を切替
        </div>
      </div>
    </div>
  );
}

const navBtnStyle = {
  background: "rgba(0,0,0,0.05)",
  border: "1px solid rgba(0,0,0,0.1)",
  color: "#1a1a2e",
  borderRadius: "8px",
  width: "32px",
  height: "32px",
  fontSize: "18px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1,
};
