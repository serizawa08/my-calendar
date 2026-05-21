import { useState, useEffect, useCallback } from "react";

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

const REMINDERS = [
  { id: "r1", title: "1000人突破ランキング", done: false },
  { id: "r2", title: "無料配布", done: false },
  { id: "r3", title: "感謝", done: false },
  { id: "r4", title: "ただ一人", done: false },
];

const TYPE_COLORS = {
  event: { bg: "#4fc3f7", text: "#000", label: "予定" },
  holiday: { bg: "#ff4444", text: "#fff", label: "祝日" },
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
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(
    `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`
  );
  const [reminders, setReminders] = useState(REMINDERS);
  const [showLegend, setShowLegend] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tokenClient, setTokenClient] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  // Google Identity Services の読み込み＆自動ログイン
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
          if (response.access_token) {
            setAccessToken(response.access_token);
            setIsSignedIn(true);
          }
        },
      });
      setTokenClient(client);
      // promptなしで自動トークン取得を試みる（既にGoogleにログイン済みなら自動でOK）
      client.requestAccessToken({ prompt: "" });
    };
    document.body.appendChild(script);
  }, []);

  // カレンダーイベント取得（全カレンダー）
  const fetchEvents = useCallback(async (token) => {
    setLoading(true);
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString();

      // まず全カレンダーのリストを取得
      const calListRes = await fetch(
        "https://www.googleapis.com/calendar/v3/users/me/calendarList",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const calListData = await calListRes.json();
      const calendars = calListData.items || [];

      // 全カレンダーからイベントを並行取得
      const allEvents = await Promise.all(
        calendars.map(async (cal) => {
          try {
            const res = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?timeMin=${start}&timeMax=${end}&singleEvents=true&orderBy=startTime&maxResults=200`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = await res.json();
            const isHoliday = cal.summary?.includes("祝日") || cal.id?.includes("holiday");
            return (data.items || []).map((item) => {
              const startVal = item.start?.date || item.start?.dateTime;
              const date = startVal ? startVal.substring(0, 10) : null;
              const time = item.start?.dateTime
                ? new Date(item.start.dateTime).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) +
                  "〜" +
                  new Date(item.end.dateTime).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })
                : null;
              return {
                id: item.id + cal.id,
                date,
                title: item.summary || "(タイトルなし)",
                type: isHoliday ? "holiday" : "event",
                allDay: !item.start?.dateTime,
                time,
              };
            });
          } catch {
            return [];
          }
        })
      );

      const mapped = allEvents.flat();
      setEvents(mapped);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (accessToken) fetchEvents(accessToken);
  }, [accessToken, fetchEvents]);

  const handleSignIn = () => {
    if (tokenClient) tokenClient.requestAccessToken();
  };

  const handleSignOut = () => {
    if (accessToken) {
      window.google.accounts.oauth2.revoke(accessToken);
    }
    setIsSignedIn(false);
    setAccessToken(null);
    setEvents([]);
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

  const formatDate = (year, month, day) => {
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${year}-${m}-${d}`;
  };

  const getEventsForDate = (dateStr) => events.filter(e => e.date === dateStr);
  const selectedEvents = getEventsForDate(selectedDate);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

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
        <div style={{ fontSize: "11px", letterSpacing: "4px", color: "#999", textTransform: "uppercase", marginBottom: "4px" }}>
          UNIFIED CALENDAR
        </div>
        <div style={{
          fontSize: "22px", fontWeight: "700",
          background: "linear-gradient(90deg, #7c3aed, #06b6d4)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>カレンダー + リマインダー</div>
      </div>

      {/* ログイン/ログアウトボタン */}
      <div style={{ textAlign: "center", marginBottom: "12px" }}>
        {!isSignedIn ? (
          <button onClick={handleSignIn} style={{
            background: "linear-gradient(90deg, #7c3aed, #06b6d4)",
            color: "#fff", border: "none", borderRadius: "20px",
            padding: "8px 24px", fontSize: "13px", fontWeight: "700",
            cursor: "pointer",
          }}>
            Googleでログイン
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
            <span style={{ fontSize: "12px", color: "#06b6d4", fontWeight: "600" }}>✓ Googleカレンダー連携中</span>
            <button onClick={handleSignOut} style={{
              background: "transparent", color: "#aaa", border: "1px solid #ddd",
              borderRadius: "20px", padding: "4px 12px", fontSize: "11px", cursor: "pointer",
            }}>ログアウト</button>
          </div>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: "center", fontSize: "13px", color: "#888", marginBottom: "12px" }}>
          カレンダーを読み込み中...
        </div>
      )}

      {/* Month Nav */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: "12px", background: "rgba(0,0,0,0.05)",
        borderRadius: "12px", padding: "8px 16px", border: "1px solid rgba(0,0,0,0.08)",
      }}>
        <button onClick={prevMonth} style={navBtnStyle}>‹</button>
        <span style={{ fontSize: "18px", fontWeight: "700" }}>{viewYear}年 {MONTHS_JA[viewMonth]}</span>
        <button onClick={nextMonth} style={navBtnStyle}>›</button>
      </div>

      {/* Calendar Grid */}
      <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid rgba(0,0,0,0.08)", overflow: "hidden", marginBottom: "12px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
          {DAYS_JA.map((d, i) => (
            <div key={d} style={{
              textAlign: "center", padding: "8px 4px", fontSize: "11px", fontWeight: "700",
              color: i === 0 ? "#e53935" : i === 6 ? "#1e88e5" : "#888",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
            }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
          {cells.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} style={{ minHeight: "52px" }} />;
            const dateStr = formatDate(viewYear, viewMonth, day);
            const dayEvents = getEventsForDate(dateStr);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const uniqueTypes = [...new Set(dayEvents.map(e => e.type))].slice(0, 3);

            return (
              <div key={dateStr} onClick={() => setSelectedDate(dateStr)} style={{
                minHeight: "52px", padding: "4px", cursor: "pointer",
                borderRight: "1px solid rgba(0,0,0,0.05)", borderBottom: "1px solid rgba(0,0,0,0.05)",
                background: isSelected ? "rgba(124,58,237,0.1)" : isToday ? "rgba(6,182,212,0.08)" : "transparent",
                transition: "background 0.15s",
              }}>
                <div style={{
                  width: "24px", height: "24px", borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "12px", fontWeight: isToday ? "700" : "400",
                  background: isToday ? "#06b6d4" : "transparent",
                  color: isToday ? "#fff" : idx % 7 === 0 ? "#e53935" : idx % 7 === 6 ? "#1e88e5" : "#1a1a2e",
                  margin: "0 auto",
                }}>{day}</div>
                <div style={{ display: "flex", gap: "2px", flexWrap: "wrap", justifyContent: "center", marginTop: "2px" }}>
                  {uniqueTypes.map(type => (
                    <div key={type} style={{ width: "5px", height: "5px", borderRadius: "50%", background: TYPE_COLORS[type]?.bg || "#4fc3f7" }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div onClick={() => setShowLegend(v => !v)} style={{ cursor: "pointer", fontSize: "11px", color: "#666", textAlign: "center", marginBottom: "8px" }}>
        {showLegend ? "▲ 凡例を隠す" : "▼ 凡例を表示"}
      </div>
      {showLegend && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px", padding: "10px", background: "#ffffff", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.08)" }}>
          {Object.entries(TYPE_COLORS).map(([type, { bg, label }]) => (
            <div key={type} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: bg }} />
              <span style={{ fontSize: "11px", color: "#555" }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Selected Date Events */}
      <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid rgba(0,0,0,0.08)", padding: "14px", marginBottom: "12px" }}>
        <div style={{ fontSize: "13px", fontWeight: "700", color: "#0097a7", marginBottom: "10px" }}>
          📅 {selectedDate.replace(/-/g, "/")} の予定
        </div>
        {!isSignedIn ? (
          <div style={{ fontSize: "13px", color: "#aaa", textAlign: "center", padding: "8px" }}>
            Googleでログインするとカレンダーが表示されます
          </div>
        ) : selectedEvents.length === 0 ? (
          <div style={{ fontSize: "13px", color: "#aaa", textAlign: "center", padding: "8px" }}>予定なし</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            {selectedEvents.map(ev => {
              const c = TYPE_COLORS[ev.type] || TYPE_COLORS.event;
              return (
                <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: "10px", background: "#f9f9fb", borderRadius: "8px", padding: "8px 10px", borderLeft: `3px solid ${c.bg}` }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a2e" }}>{ev.title}</div>
                    {ev.time && <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>🕐 {ev.time}</div>}
                    {ev.allDay && !ev.time && <div style={{ fontSize: "11px", color: "#aaa", marginTop: "2px" }}>終日</div>}
                  </div>
                  <div style={{ marginLeft: "auto", fontSize: "10px", padding: "2px 7px", borderRadius: "20px", background: c.bg, color: c.text, whiteSpace: "nowrap", fontWeight: "600" }}>{c.label}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reminders */}
      <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid rgba(0,0,0,0.08)", padding: "14px" }}>
        <div style={{ fontSize: "13px", fontWeight: "700", color: "#d97706", marginBottom: "10px" }}>
          ✅ リマインダー ({reminders.filter(r => !r.done).length}件)
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
          {reminders.map(r => (
            <div key={r.id} onClick={() => toggleReminder(r.id)} style={{
              display: "flex", alignItems: "center", gap: "10px", background: "#f9f9fb",
              borderRadius: "8px", padding: "8px 12px", cursor: "pointer",
              opacity: r.done ? 0.4 : 1, transition: "opacity 0.2s",
              borderLeft: `3px solid ${r.done ? "#ccc" : "#d97706"}`,
            }}>
              <div style={{
                width: "18px", height: "18px", borderRadius: "50%",
                border: `2px solid ${r.done ? "#ccc" : "#d97706"}`,
                background: r.done ? "#ccc" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                {r.done && <span style={{ fontSize: "10px", color: "#fff" }}>✓</span>}
              </div>
              <span style={{ fontSize: "13px", textDecoration: r.done ? "line-through" : "none", color: r.done ? "#aaa" : "#1a1a2e" }}>{r.title}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: "10px", color: "#bbb", marginTop: "10px", textAlign: "center" }}>タップで完了/未完了を切替</div>
      </div>
    </div>
  );
}

const navBtnStyle = {
  background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.1)", color: "#1a1a2e",
  borderRadius: "8px", width: "32px", height: "32px", fontSize: "18px", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
};
