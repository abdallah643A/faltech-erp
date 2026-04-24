import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

export const Scene1Intro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame: frame - 10, fps, config: { damping: 18, stiffness: 120 } });
  const subtitleSpring = spring({ frame: frame - 30, fps, config: { damping: 20 } });
  const badgeSpring = spring({ frame: frame - 5, fps, config: { damping: 15, stiffness: 200 } });
  const lineWidth = interpolate(frame, [15, 55], [0, 400], { extrapolateRight: "clamp" });
  const iconPulse = 1 + Math.sin(frame * 0.08) * 0.03;

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", transform: `translateY(${interpolate(titleSpring, [0, 1], [30, 0])}px)` }}>
        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 20px",
            borderRadius: 24,
            backgroundColor: "rgba(59,130,246,0.15)",
            border: "1px solid rgba(59,130,246,0.3)",
            marginBottom: 30,
            opacity: interpolate(badgeSpring, [0, 1], [0, 1]),
            transform: `scale(${interpolate(badgeSpring, [0, 1], [0.8, 1])})`,
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#3b82f6", transform: `scale(${iconPulse})` }} />
          <span style={{ fontSize: 16, fontWeight: 600, color: "#93c5fd", letterSpacing: 2, textTransform: "uppercase" }}>
            ERP Training Guide
          </span>
        </div>

        {/* Main title */}
        <h1
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: "white",
            lineHeight: 1.1,
            opacity: interpolate(titleSpring, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleSpring, [0, 1], [40, 0])}px)`,
            margin: 0,
          }}
        >
          Project Schedule
        </h1>
        <h2
          style={{
            fontSize: 52,
            fontWeight: 700,
            background: "linear-gradient(90deg, #60a5fa, #a78bfa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            opacity: interpolate(titleSpring, [0, 1], [0, 1]),
            margin: "5px 0 0 0",
          }}
        >
          & WBS Planning
        </h2>

        {/* Divider line */}
        <div
          style={{
            width: lineWidth,
            height: 3,
            background: "linear-gradient(90deg, transparent, #3b82f6, transparent)",
            margin: "25px auto",
            borderRadius: 2,
          }}
        />

        {/* Subtitle */}
        <p
          style={{
            fontSize: 22,
            color: "rgba(255,255,255,0.6)",
            fontWeight: 400,
            opacity: interpolate(subtitleSpring, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subtitleSpring, [0, 1], [20, 0])}px)`,
            margin: 0,
          }}
        >
          Plan · Execute · Monitor · Control
        </p>
      </div>
    </AbsoluteFill>
  );
};
