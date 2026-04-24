import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const tasks = [
  { name: "Design", start: 0, duration: 25, color: "#3b82f6", progress: 100 },
  { name: "Approvals", start: 20, duration: 15, color: "#8b5cf6", progress: 80 },
  { name: "Procurement", start: 30, duration: 20, color: "#f59e0b", progress: 60 },
  { name: "Site Work", start: 45, duration: 30, color: "#10b981", progress: 30 },
  { name: "Structure", start: 60, duration: 25, color: "#ec4899", progress: 0 },
  { name: "Finishing", start: 80, duration: 15, color: "#06b6d4", progress: 0 },
];

export const Scene5Gantt = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleS = spring({ frame, fps, config: { damping: 20 } });
  const chartWidth = 900;
  const totalUnits = 100;

  // Today marker animation
  const todayPos = interpolate(frame, [30, 100], [0, 55], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", padding: "60px 100px" }}>
      {/* Title */}
      <div style={{ marginBottom: 40 }}>
        <div style={{
          fontSize: 14, fontWeight: 700, color: "#3b82f6", textTransform: "uppercase",
          letterSpacing: 3, marginBottom: 12,
          opacity: interpolate(titleS, [0, 1], [0, 1]),
        }}>
          Visual Timeline
        </div>
        <h2 style={{
          fontSize: 44, fontWeight: 800, color: "white", margin: 0,
          opacity: interpolate(titleS, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(titleS, [0, 1], [30, 0])}px)`,
        }}>
          Interactive <span style={{ color: "#3b82f6" }}>Gantt Chart</span>
        </h2>
      </div>

      {/* Gantt */}
      <div style={{ display: "flex", gap: 30 }}>
        {/* Task list */}
        <div style={{ width: 220, display: "flex", flexDirection: "column", gap: 8, paddingTop: 38 }}>
          {tasks.map((t, i) => {
            const s = spring({ frame: frame - 15 - i * 5, fps, config: { damping: 20 } });
            return (
              <div key={i} style={{
                height: 44, display: "flex", alignItems: "center", gap: 12,
                opacity: interpolate(s, [0, 1], [0, 1]),
                transform: `translateX(${interpolate(s, [0, 1], [-30, 0])}px)`,
              }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: t.color }} />
                <span style={{ fontSize: 16, fontWeight: 600, color: "white" }}>{t.name}</span>
              </div>
            );
          })}
        </div>

        {/* Chart area */}
        <div style={{ flex: 1, position: "relative" }}>
          {/* Timeline header */}
          <div style={{ display: "flex", height: 30, borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: 8 }}>
            {["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"].map((w, i) => (
              <div key={i} style={{
                flex: 1, fontSize: 12, fontWeight: 600,
                color: "rgba(255,255,255,0.4)", textAlign: "center",
              }}>
                {w}
              </div>
            ))}
          </div>

          {/* Bars */}
          {tasks.map((t, i) => {
            const s = spring({ frame: frame - 20 - i * 6, fps, config: { damping: 15 } });
            const barLeft = (t.start / totalUnits) * 100;
            const barWidth = (t.duration / totalUnits) * 100;
            const fillWidth = interpolate(s, [0, 1], [0, t.progress]);

            return (
              <div key={i} style={{ height: 44, position: "relative", display: "flex", alignItems: "center" }}>
                {/* Background bar */}
                <div style={{
                  position: "absolute",
                  left: `${barLeft}%`,
                  width: `${interpolate(s, [0, 1], [0, barWidth])}%`,
                  height: 28,
                  borderRadius: 6,
                  backgroundColor: `${t.color}25`,
                  border: `1px solid ${t.color}40`,
                }} />
                {/* Progress fill */}
                <div style={{
                  position: "absolute",
                  left: `${barLeft}%`,
                  width: `${(fillWidth / 100) * barWidth}%`,
                  height: 28,
                  borderRadius: 6,
                  backgroundColor: `${t.color}60`,
                }} />
                {/* Progress text */}
                {t.progress > 0 && (
                  <span style={{
                    position: "absolute",
                    left: `${barLeft + barWidth / 2}%`,
                    transform: "translateX(-50%)",
                    fontSize: 11, fontWeight: 700,
                    color: "white",
                    opacity: interpolate(s, [0, 1], [0, 1]),
                  }}>
                    {t.progress}%
                  </span>
                )}
              </div>
            );
          })}

          {/* Today marker */}
          <div style={{
            position: "absolute", top: 0, bottom: 0,
            left: `${todayPos}%`,
            width: 2, backgroundColor: "#ef4444",
            opacity: interpolate(frame, [30, 45], [0, 0.8], { extrapolateRight: "clamp" }),
          }}>
            <div style={{
              position: "absolute", top: -5,
              left: -20, fontSize: 10, fontWeight: 700,
              color: "#ef4444", backgroundColor: "rgba(239,68,68,0.15)",
              padding: "2px 8px", borderRadius: 4,
            }}>
              TODAY
            </div>
          </div>
        </div>
      </div>

      {/* Caption */}
      <div style={{
        position: "absolute", bottom: 60, right: 100,
        fontSize: 16, color: "rgba(255,255,255,0.4)", fontWeight: 600,
        opacity: interpolate(frame, [60, 80], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        📊 Monitor project timeline with weekly & monthly views
      </div>
    </AbsoluteFill>
  );
};
