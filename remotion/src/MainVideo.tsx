import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Scene1Intro } from "./scenes/Scene1Intro";
import { Scene2Overview } from "./scenes/Scene2Overview";
import { Scene3Phases } from "./scenes/Scene3Phases";
import { Scene4WBS } from "./scenes/Scene4WBS";
import { Scene5Gantt } from "./scenes/Scene5Gantt";
import { Scene6Progress } from "./scenes/Scene6Progress";
import { Scene7Closing } from "./scenes/Scene7Closing";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800", "900"], subsets: ["latin"] });

export const MainVideo = () => {
  const frame = useCurrentFrame();

  // Persistent animated background
  const bgHue = interpolate(frame, [0, 750], [215, 225]);
  const bgShift = Math.sin(frame * 0.008) * 3;

  return (
    <AbsoluteFill style={{ fontFamily, overflow: "hidden" }}>
      {/* Animated gradient background */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(${135 + bgShift}deg, hsl(${bgHue}, 35%, 8%) 0%, hsl(${bgHue + 10}, 40%, 14%) 50%, hsl(${bgHue + 20}, 30%, 10%) 100%)`,
        }}
      />

      {/* Floating grid pattern */}
      <AbsoluteFill style={{ opacity: 0.04 }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={`h${i}`}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: `${(i + 1) * 5}%`,
              height: 1,
              backgroundColor: "white",
              transform: `translateY(${Math.sin(frame * 0.01 + i) * 2}px)`,
            }}
          />
        ))}
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={`v${i}`}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${(i + 1) * 5}%`,
              width: 1,
              backgroundColor: "white",
              transform: `translateX(${Math.cos(frame * 0.01 + i) * 2}px)`,
            }}
          />
        ))}
      </AbsoluteFill>

      {/* Accent orb */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)",
          top: `${30 + Math.sin(frame * 0.006) * 10}%`,
          right: `${-5 + Math.cos(frame * 0.008) * 5}%`,
          transform: `scale(${1 + Math.sin(frame * 0.005) * 0.1})`,
        }}
      />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={120}>
          <Scene1Intro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={110}>
          <Scene2Overview />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-left" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={110}>
          <Scene3Phases />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={110}>
          <Scene4WBS />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={120}>
          <Scene5Gantt />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={110}>
          <Scene6Progress />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 25 })}
        />
        <TransitionSeries.Sequence durationInFrames={115}>
          <Scene7Closing />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
