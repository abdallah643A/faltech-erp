import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const phases = [
  { name: "Design", color: "#3b82f6", icon: "✏️" },
  { name: "Approvals", color: "#8b5cf6", icon: "✅" },
  { name: "Site Work", color: "#f59e0b", icon: "🏗️" },
  { name: "Structure", color: "#10b981", icon: "🏢" },
  { name: "Finishing", color: "#ec4899", icon: "🎨" },
  { name: "Handover", color: "#06b6d4", icon: "🤝" },
];

export const Scene3Phases = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleS = spring({ frame, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", padding: "70px 120px" }}>
      <div style={{ marginBottom: 50 }}>
        <div
          style={{
            fontSize: 14, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase",
            letterSpacing: 3, marginBottom: 12,
            opacity: interpolate(titleS, [0, 1], [0, 1]),
          }}
        >
          Step 1
        </div>
        <h2
          style={{
            fontSize: 48, fontWeight: 800, color: "white", margin: 0,
            opacity: interpolate(titleS, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleS, [0, 1], [30, 0])}px)`,
          }}
        >
          Create <span style={{ color: "#f59e0b" }}>Project Phases</span>
        </h2>
      </div>

      {/* Phase cards grid */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
        {phases.map((p, i) => {
          const s = spring({ frame: frame - 20 - i * 8, fps, config: { damping: 15, stiffness: 150 } });
          const isActive = Math.floor((frame - 40) / 15) % phases.length === i;
          return (
            <div
              key={i}
              style={{
                width: "calc(33.33% - 16px)",
                padding: "28px 24px",
                borderRadius: 16,
                backgroundColor: isActive ? `${p.color}15` : "rgba(255,255,255,0.03)",
                border: `1.5px solid ${isActive ? `${p.color}60` : "rgba(255,255,255,0.06)"}`,
                opacity: interpolate(s, [0, 1], [0, 1]),
                transform: `scale(${interpolate(s, [0, 1], [0.85, isActive ? 1.03 : 1])})`,
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div style={{ fontSize: 32 }}>{p.icon}</div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "white" }}>{p.name}</div>
                <div
                  style={{
                    width: 40, height: 3, borderRadius: 2,
                    backgroundColor: p.color,
                    marginTop: 8,
                    opacity: isActive ? 1 : 0.4,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* On-screen text */}
      <div
        style={{
          position: "absolute", bottom: 70, left: 120,
          fontSize: 18, color: "rgba(255,255,255,0.4)", fontWeight: 600,
          opacity: interpolate(frame, [50, 70], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        💡 Phases represent major project milestones and stages
      </div>
    </AbsoluteFill>
  );
};
