import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const summaryPoints = [
  "Create project phases",
  "Add WBS and sub-tasks",
  "Set planned dates",
  "Track progress and delays",
  "Monitor timeline in Gantt view",
];

export const Scene7Closing = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleS = spring({ frame: frame - 5, fps, config: { damping: 18, stiffness: 100 } });
  const pulse = 1 + Math.sin(frame * 0.06) * 0.015;

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", maxWidth: 900 }}>
        {/* Summary checklist */}
        <div style={{
          display: "flex", flexWrap: "wrap", justifyContent: "center",
          gap: 14, marginBottom: 50,
        }}>
          {summaryPoints.map((p, i) => {
            const s = spring({ frame: frame - 5 - i * 8, fps, config: { damping: 15 } });
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 22px", borderRadius: 30,
                backgroundColor: "rgba(59,130,246,0.1)",
                border: "1px solid rgba(59,130,246,0.25)",
                opacity: interpolate(s, [0, 1], [0, 1]),
                transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
              }}>
                <span style={{ color: "#60a5fa", fontSize: 16 }}>✓</span>
                <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 15, fontWeight: 600 }}>{p}</span>
              </div>
            );
          })}
        </div>

        {/* Main closing text */}
        <h2 style={{
          fontSize: 56, fontWeight: 900, color: "white", margin: 0, lineHeight: 1.2,
          opacity: interpolate(titleS, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(titleS, [0, 1], [40, 0])}px) scale(${pulse})`,
        }}>
          Keep Your Schedule
          <br />
          <span style={{
            background: "linear-gradient(90deg, #60a5fa, #a78bfa, #ec4899)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            Updated & Accurate
          </span>
        </h2>

        {/* Divider */}
        <div style={{
          width: interpolate(frame, [40, 70], [0, 300], { extrapolateRight: "clamp" }),
          height: 3,
          background: "linear-gradient(90deg, transparent, #3b82f6, transparent)",
          margin: "30px auto",
          borderRadius: 2,
        }} />

        {/* Footer text */}
        <p style={{
          fontSize: 20, color: "rgba(255,255,255,0.4)", fontWeight: 500,
          opacity: interpolate(frame, [55, 75], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          Project Schedule & WBS Planning — Your ERP Planning Command Center
        </p>
      </div>
    </AbsoluteFill>
  );
};
