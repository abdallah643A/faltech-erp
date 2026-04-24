import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const statuses = [
  { label: "Not Started", color: "#6b7280", icon: "⏳", pct: 0 },
  { label: "In Progress", color: "#3b82f6", icon: "🔄", pct: 45 },
  { label: "Delayed", color: "#ef4444", icon: "⚠️", pct: 30 },
  { label: "Completed", color: "#10b981", icon: "✅", pct: 100 },
];

const tips = [
  "Update progress regularly",
  "Link dependent tasks",
  "Review schedule weekly",
  "Use milestones for key dates",
];

export const Scene6Progress = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleS = spring({ frame, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill style={{ display: "flex", padding: "70px 120px", gap: 80 }}>
      {/* Left */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{
          fontSize: 14, fontWeight: 700, color: "#ef4444", textTransform: "uppercase",
          letterSpacing: 3, marginBottom: 12,
          opacity: interpolate(titleS, [0, 1], [0, 1]),
        }}>
          Track & Control
        </div>
        <h2 style={{
          fontSize: 44, fontWeight: 800, color: "white", margin: 0, lineHeight: 1.2,
          opacity: interpolate(titleS, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(titleS, [0, 1], [30, 0])}px)`,
        }}>
          Progress <span style={{ color: "#ef4444" }}>Tracking</span>
          <br />& Delay Detection
        </h2>

        {/* Status cards */}
        <div style={{ display: "flex", gap: 16, marginTop: 40, flexWrap: "wrap" }}>
          {statuses.map((s, i) => {
            const sp = spring({ frame: frame - 20 - i * 8, fps, config: { damping: 15 } });
            const barFill = interpolate(sp, [0, 1], [0, s.pct]);
            return (
              <div key={i} style={{
                width: "calc(50% - 8px)",
                padding: "16px 20px", borderRadius: 14,
                backgroundColor: `${s.color}10`,
                border: `1px solid ${s.color}30`,
                opacity: interpolate(sp, [0, 1], [0, 1]),
                transform: `scale(${interpolate(sp, [0, 1], [0.9, 1])})`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 22 }}>{s.icon}</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.label}</span>
                </div>
                {/* Progress bar */}
                <div style={{ height: 6, borderRadius: 3, backgroundColor: `${s.color}20` }}>
                  <div style={{
                    height: "100%", borderRadius: 3,
                    backgroundColor: s.color,
                    width: `${barFill}%`,
                  }} />
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 6, textAlign: "right" }}>
                  {Math.round(barFill)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right - Best practices */}
      <div style={{ flex: "0 0 380px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{
          fontSize: 18, fontWeight: 700, color: "white", marginBottom: 24,
          opacity: interpolate(frame, [40, 55], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          💡 Best Practices
        </div>
        {tips.map((tip, i) => {
          const s = spring({ frame: frame - 50 - i * 10, fps, config: { damping: 18 } });
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "14px 20px", marginBottom: 10,
              borderRadius: 12,
              backgroundColor: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              opacity: interpolate(s, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(s, [0, 1], [30, 0])}px)`,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                backgroundColor: "rgba(59,130,246,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 800, color: "#60a5fa",
              }}>
                {i + 1}
              </div>
              <span style={{ fontSize: 16, color: "rgba(255,255,255,0.7)" }}>{tip}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
