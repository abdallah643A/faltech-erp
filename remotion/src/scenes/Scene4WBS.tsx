import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const wbsTree = [
  { code: "1", name: "Design Phase", level: 0 },
  { code: "1.1", name: "Architectural Design", level: 1 },
  { code: "1.2", name: "Structural Design", level: 1 },
  { code: "1.3", name: "MEP Design", level: 1 },
  { code: "2", name: "Approvals", level: 0 },
  { code: "2.1", name: "Municipality Approval", level: 1 },
  { code: "2.2", name: "Civil Defense Approval", level: 1 },
  { code: "3", name: "Site Work", level: 0 },
  { code: "3.1", name: "Excavation", level: 1 },
  { code: "3.2", name: "Foundation", level: 1 },
];

export const Scene4WBS = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleS = spring({ frame, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill style={{ display: "flex", padding: "70px 120px", gap: 80 }}>
      {/* Left text */}
      <div style={{ flex: "0 0 400px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div
          style={{
            fontSize: 14, fontWeight: 700, color: "#10b981", textTransform: "uppercase",
            letterSpacing: 3, marginBottom: 12,
            opacity: interpolate(titleS, [0, 1], [0, 1]),
          }}
        >
          Step 2
        </div>
        <h2
          style={{
            fontSize: 44, fontWeight: 800, color: "white", margin: 0, lineHeight: 1.2,
            opacity: interpolate(titleS, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleS, [0, 1], [30, 0])}px)`,
          }}
        >
          Add <span style={{ color: "#10b981" }}>WBS Items</span>
        </h2>
        <p style={{
          fontSize: 18, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginTop: 20,
          opacity: interpolate(frame, [20, 40], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          Break down each phase into manageable work packages with clear numbering and hierarchy.
        </p>
      </div>

      {/* WBS tree */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {wbsTree.map((item, i) => {
          const s = spring({ frame: frame - 10 - i * 6, fps, config: { damping: 18 } });
          const isParent = item.level === 0;
          const highlight = Math.floor((frame - 30) / 10) % wbsTree.length === i;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: isParent ? "14px 20px" : "10px 20px",
                marginLeft: item.level * 36,
                marginBottom: 4,
                borderRadius: 10,
                backgroundColor: highlight ? "rgba(16,185,129,0.1)" : isParent ? "rgba(255,255,255,0.04)" : "transparent",
                border: highlight ? "1px solid rgba(16,185,129,0.3)" : "1px solid transparent",
                opacity: interpolate(s, [0, 1], [0, 1]),
                transform: `translateX(${interpolate(s, [0, 1], [40, 0])}px)`,
              }}
            >
              <span
                style={{
                  fontSize: 14, fontWeight: 700,
                  color: isParent ? "#10b981" : "#6ee7b7",
                  fontFamily: "monospace",
                  minWidth: 40,
                }}
              >
                {item.code}
              </span>
              <span style={{ fontSize: isParent ? 20 : 17, fontWeight: isParent ? 700 : 400, color: isParent ? "white" : "rgba(255,255,255,0.7)" }}>
                {item.name}
              </span>
              {isParent && (
                <div style={{
                  marginLeft: "auto", fontSize: 12, fontWeight: 600,
                  color: "#10b981", backgroundColor: "rgba(16,185,129,0.15)",
                  padding: "3px 10px", borderRadius: 6,
                }}>
                  PHASE
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
