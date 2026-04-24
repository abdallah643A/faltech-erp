import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const features = [
  { icon: "📋", label: "Project Selector", desc: "Choose your active project" },
  { icon: "🏗️", label: "Create Phases", desc: "Build project stages" },
  { icon: "📊", label: "Gantt Chart", desc: "Visual timeline view" },
  { icon: "📅", label: "Schedule Dates", desc: "Plan start & end dates" },
];

export const Scene2Overview = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill style={{ display: "flex", padding: "80px 120px" }}>
      {/* Left side */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#60a5fa",
            textTransform: "uppercase",
            letterSpacing: 3,
            marginBottom: 16,
            opacity: interpolate(titleSpring, [0, 1], [0, 1]),
          }}
        >
          Page Overview
        </div>
        <h2
          style={{
            fontSize: 52,
            fontWeight: 800,
            color: "white",
            lineHeight: 1.15,
            margin: 0,
            opacity: interpolate(titleSpring, [0, 1], [0, 1]),
            transform: `translateX(${interpolate(titleSpring, [0, 1], [-40, 0])}px)`,
          }}
        >
          Your Central{" "}
          <span style={{ color: "#60a5fa" }}>Planning</span>
          <br />
          Command Center
        </h2>
        <p
          style={{
            fontSize: 20,
            color: "rgba(255,255,255,0.5)",
            marginTop: 20,
            lineHeight: 1.6,
            maxWidth: 480,
            opacity: interpolate(frame, [15, 35], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          The Project Schedule page gives you complete control over phases, WBS items, dates, and execution tracking.
        </p>
      </div>

      {/* Right side - feature cards */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 20 }}>
        {features.map((f, i) => {
          const s = spring({ frame: frame - 15 - i * 10, fps, config: { damping: 18 } });
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                padding: "20px 28px",
                borderRadius: 16,
                backgroundColor: `rgba(255,255,255,${0.03 + (i === Math.floor((frame / 30) % 4) ? 0.04 : 0)})`,
                border: "1px solid rgba(255,255,255,0.08)",
                opacity: interpolate(s, [0, 1], [0, 1]),
                transform: `translateX(${interpolate(s, [0, 1], [60, 0])}px)`,
              }}
            >
              <div style={{ fontSize: 36 }}>{f.icon}</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "white" }}>{f.label}</div>
                <div style={{ fontSize: 15, color: "rgba(255,255,255,0.5)" }}>{f.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
