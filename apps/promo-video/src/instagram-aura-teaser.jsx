import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';

export const FPS = 30;
export const TOTAL_DURATION_SECONDS = 30;
export const TOTAL_DURATION_FRAMES = FPS * TOTAL_DURATION_SECONDS;
export const LOGO_TEASER_FRAMES = 150;
export const SCREEN_HOLD_FRAMES = 123;
export const FINAL_LOCKUP_FRAME = LOGO_TEASER_FRAMES + SCREEN_HOLD_FRAMES * 5;

const VIDEO = {
  height: 1920,
  width: 1080,
};

const PHONE_RATIO = 2532 / 1170;
const FONT = 'Inter, Arial, Helvetica, sans-serif';

const COLORS = {
  amber: '#ff9a4f',
  background: '#02050e',
  blue: '#27cef1',
  green: '#38e28a',
  muted: '#b7c4d9',
  purple: '#9657f5',
  red: '#ff5265',
  text: '#f8fbff',
};

const ASSETS = {
  fuel: 'screenshots/06-fuel-screen-fresh.png',
  plan: 'screenshots/07-plan-screen-fresh.png',
  splash: 'brand/splash-screen.png',
  today: 'screenshots/01-today-screen-fresh.png',
  train: 'screenshots/03-train-screen-fresh.png',
  workout: 'screenshots/04-workout-viewer-fresh.png',
};

const FEATURES = [
  {
    accent: COLORS.blue,
    caption: "See today's training, fuel, and weight check-ins.",
    label: 'Today',
    src: ASSETS.today,
    support: ['Check in', 'Training', 'Fuel', 'Weight'],
  },
  {
    accent: COLORS.purple,
    caption: 'Know how hard to train and what work is up next.',
    label: 'Train',
    src: ASSETS.train,
    support: ['Rounds', 'Strength', 'Roadwork'],
  },
  {
    accent: COLORS.green,
    caption: 'Follow the session round by round.',
    label: 'Workout',
    src: ASSETS.workout,
    support: ['Timer', 'Cues', 'Round flow'],
  },
  {
    accent: COLORS.amber,
    caption: 'Keep food, water, body weight, and fight target in one place.',
    label: 'Fuel',
    src: ASSETS.fuel,
    support: ['Meals', 'Water', 'Body weight', 'Fight target'],
  },
  {
    accent: COLORS.green,
    caption: 'Plan the week around training, recovery, and weigh-in.',
    label: 'Plan',
    src: ASSETS.plan,
    support: ['Weekly plan', 'Sessions', 'Weigh-in'],
  },
];

const clamp = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
};

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeInOut = Easing.bezier(0.45, 0, 0.55, 1);
const settleEase = Easing.bezier(0.22, 1, 0.36, 1);

function progress(frame, start, duration, easing = easeOut) {
  return interpolate(frame, [start, start + duration], [0, 1], {
    ...clamp,
    easing,
  });
}

function fadeWindow(frame, start, end, fade = 24) {
  const fadeIn = start === 0 ? 1 : progress(frame, start, fade, easeInOut);
  const fadeOut = progress(frame, end - fade, fade, easeInOut);
  return Math.max(0, Math.min(1, fadeIn * (1 - fadeOut)));
}

function Background({accent, frame, warmth = 0.2}) {
  const drift = interpolate(frame, [0, TOTAL_DURATION_FRAMES], [-42, 48], clamp);
  const pulse = 0.72 + Math.sin(frame / 56) * 0.04;

  return (
    <AbsoluteFill
      style={{
        background:
          'linear-gradient(180deg, #040817 0%, #02050e 50%, #01030a 100%)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          background: `radial-gradient(circle, ${accent}38 0%, rgba(39,206,241,0.10) 34%, transparent 68%)`,
          filter: 'blur(32px)',
          height: 1020,
          left: 70 + drift,
          opacity: pulse,
          position: 'absolute',
          top: 250,
          width: 940,
        }}
      />
      <div
        style={{
          background: `linear-gradient(140deg, transparent 0%, rgba(255,82,101,${0.06 + warmth * 0.08}) 55%, transparent 100%)`,
          height: 1220,
          left: 602,
          opacity: 0.62,
          position: 'absolute',
          top: 190,
          transform: 'rotate(-12deg)',
          width: 410,
        }}
      />
      <div
        style={{
          border: '1px solid rgba(255,255,255,0.045)',
          borderLeftColor: 'rgba(39,206,241,0.12)',
          borderRadius: 64,
          bottom: 88,
          left: 60,
          opacity: 0.64,
          position: 'absolute',
          right: 60,
          top: 88,
        }}
      />
      <AbsoluteFill
        style={{
          boxShadow:
            'inset 0 0 180px rgba(0,0,0,0.80), inset 0 -240px 220px rgba(0,0,0,0.88)',
        }}
      />
    </AbsoluteFill>
  );
}

function Wordmark({fontSize = 112}) {
  return (
    <div
      style={{
        color: COLORS.text,
        fontFamily: FONT,
        fontSize,
        fontWeight: 950,
        letterSpacing: 0,
        lineHeight: 0.9,
      }}
    >
      Corner<span style={{color: COLORS.blue}}>IQ</span>
    </div>
  );
}

function LogoTeaser({frame}) {
  if (frame >= LOGO_TEASER_FRAMES) {
    return null;
  }

  const opacity = fadeWindow(frame, 0, LOGO_TEASER_FRAMES, 28);
  const markIn = progress(frame, 4, 72, settleEase);
  const wordIn = progress(frame, 24, 54, easeOut);
  const glow = 0.82 + Math.sin(frame / 34) * 0.05;
  const drift = interpolate(frame, [0, LOGO_TEASER_FRAMES], [18, -8], clamp);

  return (
    <AbsoluteFill style={{opacity}}>
      <Background accent={COLORS.blue} frame={frame} warmth={0.28} />
      <Img
        src={staticFile(ASSETS.splash)}
        style={{
          height: '100%',
          left: 0,
          objectFit: 'cover',
          opacity: markIn * 0.62,
          position: 'absolute',
          top: 0,
          transform: `translateY(${interpolate(markIn, [0, 1], [22, 0], clamp)}px) scale(${interpolate(frame, [0, LOGO_TEASER_FRAMES], [1.05, 1.015], clamp)})`,
          width: '100%',
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(2,5,14,0.36) 0%, rgba(2,5,14,0.10) 42%, rgba(2,5,14,0.72) 100%)',
        }}
      />
      <div
        style={{
          background: `radial-gradient(circle, ${COLORS.blue}36 0%, rgba(39,206,241,0.11) 35%, transparent 70%)`,
          filter: 'blur(18px)',
          height: 760,
          left: 160,
          opacity: glow,
          position: 'absolute',
          top: 402 + drift,
          width: 760,
        }}
      />
      <div
        style={{
          left: 72,
          opacity: wordIn,
          position: 'absolute',
          right: 72,
          textAlign: 'center',
          top: 840,
          transform: `translateY(${interpolate(wordIn, [0, 1], [22, 0], clamp)}px)`,
        }}
      >
        <Wordmark fontSize={98} />
        <div
          style={{
            background: `linear-gradient(90deg, transparent, ${COLORS.blue}, ${COLORS.red}, transparent)`,
            height: 2,
            margin: '42px auto 34px',
            opacity: 0.74,
            width: 560,
          }}
        />
        <div
          style={{
            color: COLORS.muted,
            fontFamily: FONT,
            fontSize: 36,
            fontWeight: 820,
            letterSpacing: 0,
            lineHeight: 1.18,
            margin: '0 auto',
            maxWidth: 900,
          }}
        >
          Boxing guidance for training, food, weight, and planning before you have a full team.
        </div>
      </div>
    </AbsoluteFill>
  );
}

function featureOpacity(showcaseFrame, index) {
  const fade = 26;
  const start = index * SCREEN_HOLD_FRAMES;
  const end = start + SCREEN_HOLD_FRAMES;
  const fadeIn = index === 0 ? 1 : progress(showcaseFrame, start - fade, fade * 2, easeInOut);
  const fadeOut =
    index === FEATURES.length - 1
      ? 0
      : progress(showcaseFrame, end - fade, fade * 2, easeInOut);

  return Math.max(0, Math.min(1, fadeIn * (1 - fadeOut)));
}

function activeFeatureIndex(showcaseFrame) {
  return Math.max(
    0,
    Math.min(FEATURES.length - 1, Math.floor(showcaseFrame / SCREEN_HOLD_FRAMES)),
  );
}

function ShowcasePhone({frame, showcaseFrame}) {
  const enter = progress(showcaseFrame, 0, 52, settleEase);
  const phoneWidth = 650;
  const phoneHeight = phoneWidth * PHONE_RATIO;
  const driftX = interpolate(
    showcaseFrame,
    [0, 123, 246, 369, 492, 615],
    [0, -24, 20, -18, 22, 0],
    clamp,
  );
  const driftY = interpolate(showcaseFrame, [0, 615], [22, -12], clamp);
  const rotate = interpolate(
    showcaseFrame,
    [0, 123, 246, 369, 492, 615],
    [-0.45, 0.35, -0.25, 0.28, -0.32, 0],
    clamp,
  );
  const scale = interpolate(
    showcaseFrame,
    [0, 246, 369, 615],
    [0.982, 1.012, 1.035, 1],
    clamp,
  );
  const floatY = Math.sin((frame + 18) / 52) * 4;

  return (
    <div
      style={{
        background: '#050914',
        border: '2px solid rgba(255,255,255,0.18)',
        borderRadius: 58,
        boxShadow: `0 48px 128px rgba(0,0,0,0.62), 0 0 88px ${COLORS.blue}22, 0 0 72px ${COLORS.amber}12`,
        height: phoneHeight,
        left: (VIDEO.width - phoneWidth) / 2,
        opacity: enter,
        overflow: 'hidden',
        position: 'absolute',
        top: 118,
        transform: `translateX(${driftX}px) translateY(${driftY + floatY}px) rotate(${rotate}deg) scale(${scale})`,
        transformOrigin: 'center center',
        width: phoneWidth,
        zIndex: 8,
      }}
    >
      {FEATURES.map((feature, index) => {
        const opacity = featureOpacity(showcaseFrame, index);
        const screenShift = interpolate(
          showcaseFrame,
          [index * SCREEN_HOLD_FRAMES - 36, index * SCREEN_HOLD_FRAMES + SCREEN_HOLD_FRAMES + 36],
          [10, -10],
          clamp,
        );

        return (
          <Img
            key={feature.src}
            src={staticFile(feature.src)}
            style={{
              display: 'block',
              height: '100%',
              left: 0,
              objectFit: 'cover',
              opacity,
              position: 'absolute',
              top: 0,
              transform: `translateY(${screenShift}px) scale(${1 + opacity * 0.012})`,
              width: '100%',
            }}
          />
        );
      })}
      <div
        style={{
          background:
            'linear-gradient(125deg, rgba(255,255,255,0.12), transparent 24%, transparent 78%, rgba(255,255,255,0.06))',
          inset: 0,
          opacity: 0.18,
          position: 'absolute',
        }}
      />
    </div>
  );
}

function FeatureChip({accent, opacity, text}) {
  return (
    <div
      style={{
        background: 'rgba(5,9,20,0.72)',
        border: `1px solid ${accent}66`,
        borderRadius: 999,
        boxShadow: `0 0 22px ${accent}1f`,
        color: COLORS.text,
        fontFamily: FONT,
        fontSize: 24,
        fontWeight: 850,
        letterSpacing: 0,
        lineHeight: 1,
        opacity,
        padding: '15px 21px',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  );
}

function FeatureCopy({showcaseFrame}) {
  return (
    <>
      {FEATURES.map((feature, index) => {
        const start = index * SCREEN_HOLD_FRAMES;
        const local = showcaseFrame - start;
        const opacity = featureOpacity(showcaseFrame, index);
        const enter = progress(local, -8, 42, easeOut);
        const y = interpolate(enter, [0, 1], [18, 0], clamp);

        if (opacity <= 0.01) {
          return null;
        }

        return (
          <div
            key={feature.label}
            style={{
              bottom: 92,
              color: COLORS.text,
              fontFamily: FONT,
              left: 78,
              opacity,
              position: 'absolute',
              right: 78,
              transform: `translateY(${y}px)`,
              zIndex: 14,
            }}
          >
            <div
              style={{
                alignItems: 'center',
                color: feature.accent,
                display: 'flex',
                fontSize: 32,
                fontWeight: 930,
                lineHeight: 1,
                marginBottom: 18,
              }}
            >
              <span
                style={{
                  background: feature.accent,
                  borderRadius: 999,
                  boxShadow: `0 0 28px ${feature.accent}55`,
                  display: 'inline-block',
                  height: 12,
                  marginRight: 16,
                  width: 12,
                }}
              />
              {feature.label}
            </div>
            <div
              style={{
                fontSize: 49,
                fontWeight: 900,
                letterSpacing: 0,
                lineHeight: 1.08,
                maxWidth: 900,
              }}
            >
              {feature.caption}
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 12,
                marginTop: 26,
                maxWidth: 900,
              }}
            >
              {feature.support.map((item) => (
                <FeatureChip
                  accent={feature.accent}
                  key={item}
                  opacity={0.92}
                  text={item}
                />
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

function AppShowcase({frame}) {
  if (frame < LOGO_TEASER_FRAMES || frame >= FINAL_LOCKUP_FRAME) {
    return null;
  }

  const showcaseFrame = frame - LOGO_TEASER_FRAMES;
  const active = FEATURES[activeFeatureIndex(showcaseFrame)];
  const opacity = fadeWindow(frame, LOGO_TEASER_FRAMES - 10, FINAL_LOCKUP_FRAME + 10, 30);

  return (
    <AbsoluteFill style={{opacity}}>
      <Background
        accent={active.accent}
        frame={frame}
        warmth={active.accent === COLORS.amber ? 0.58 : 0.24}
      />
      <ShowcasePhone frame={frame} showcaseFrame={showcaseFrame} />
      <FeatureCopy showcaseFrame={showcaseFrame} />
    </AbsoluteFill>
  );
}

function FinalLockup({frame}) {
  const local = frame - FINAL_LOCKUP_FRAME;
  const opacity = progress(local, 0, 42, easeInOut);
  const logoIn = progress(local, 12, 48, settleEase);
  const textIn = progress(local, 34, 46, easeOut);
  const glowScale = interpolate(local, [0, TOTAL_DURATION_FRAMES - FINAL_LOCKUP_FRAME], [0.96, 1.04], clamp);

  if (frame < FINAL_LOCKUP_FRAME) {
    return null;
  }

  return (
    <AbsoluteFill style={{opacity}}>
      <Background accent={COLORS.blue} frame={frame} warmth={0.34} />
      <Img
        src={staticFile(ASSETS.splash)}
        style={{
          height: '100%',
          left: 0,
          objectFit: 'cover',
          opacity: logoIn * 0.38,
          position: 'absolute',
          top: 0,
          transform: `scale(${glowScale})`,
          width: '100%',
        }}
      />
      <AbsoluteFill style={{background: 'rgba(2,5,14,0.56)'}} />
      <div
        style={{
          left: 72,
          opacity: textIn,
          position: 'absolute',
          right: 72,
          textAlign: 'center',
          top: 760,
          transform: `translateY(${interpolate(textIn, [0, 1], [24, 0], clamp)}px)`,
          zIndex: 20,
        }}
      >
        <Wordmark />
        <div
          style={{
            background: `linear-gradient(90deg, transparent, ${COLORS.blue}, ${COLORS.red}, transparent)`,
            height: 2,
            margin: '48px auto 40px',
            opacity: 0.78,
            width: 690,
          }}
        />
        <div
          style={{
            color: COLORS.muted,
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 850,
            letterSpacing: 0,
            lineHeight: 1.08,
          }}
        >
          Coming soon
        </div>
        <div
          style={{
            color: COLORS.muted,
            fontFamily: FONT,
            fontSize: 34,
            fontWeight: 760,
            letterSpacing: 0,
            lineHeight: 1.16,
            margin: '34px auto 0',
            maxWidth: 720,
            opacity: 0.86,
          }}
        >
          Built for boxers before they have a full team.
        </div>
      </div>
    </AbsoluteFill>
  );
}

export const CornerIQInstagramAuraTeaser = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{backgroundColor: COLORS.background}}>
      <LogoTeaser frame={frame} />
      <AppShowcase frame={frame} />
      <FinalLockup frame={frame} />
    </AbsoluteFill>
  );
};
