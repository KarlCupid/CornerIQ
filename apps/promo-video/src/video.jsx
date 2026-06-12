import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';

const VIDEO = {
  width: 1080,
  height: 1920,
};

const COLORS = {
  background: '#03060f',
  panel: '#0a1020',
  panelBorder: 'rgba(214, 224, 242, 0.16)',
  blue: '#27cef1',
  blueSoft: 'rgba(39, 206, 241, 0.22)',
  red: '#ff4f62',
  gold: '#ffd25a',
  text: '#f8fbff',
  muted: '#aebbd0',
};

const FONT = 'Inter, Arial, Helvetica, sans-serif';
const PHONE_RATIO = 2532 / 1170;

const ASSETS = {
  today: 'screenshots/02-today-dashboard.png',
  fuel: 'screenshots/11-fuel-overview.png',
  plan: 'screenshots/15-plan-overview.png',
  profile: 'screenshots/21-profile-athlete-overview.png',
  workout: 'screenshots/09-live-workout-player.png',
};

const SCENES = [
  {
    id: 'opening',
    start: 0,
    duration: 120,
    text: 'Boxing training shouldn\u2019t feel random.',
  },
  {
    id: 'dailyPlan',
    start: 120,
    duration: 150,
    text: 'CornerIQ gives you the plan.',
  },
  {
    id: 'signals',
    start: 270,
    duration: 180,
    text: 'Readiness. Fuel. Body mass. Training load.',
  },
  {
    id: 'workout',
    start: 450,
    duration: 210,
    text: 'Every round. Fully guided.',
  },
  {
    id: 'closing',
    start: 660,
    duration: 240,
  },
];

const SIGNAL_PANELS = [
  {
    label: 'Readiness',
    src: ASSETS.today,
    objectPosition: '50% 66%',
    left: 82,
    top: 424,
    accent: COLORS.green,
    delay: 0,
  },
  {
    label: 'Fuel',
    src: ASSETS.fuel,
    objectPosition: '50% 38%',
    left: 554,
    top: 424,
    accent: COLORS.orange,
    delay: 6,
  },
  {
    label: 'Body mass',
    src: ASSETS.profile,
    objectPosition: '50% 46%',
    left: 82,
    top: 966,
    accent: COLORS.orange,
    delay: 12,
  },
  {
    label: 'Training load',
    src: ASSETS.plan,
    objectPosition: '50% 90%',
    left: 554,
    top: 966,
    accent: COLORS.blue,
    delay: 18,
  },
];

const clamp = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
};

const ease = Easing.bezier(0.16, 1, 0.3, 1);
const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

function localFrame(frame, scene) {
  return frame - scene.start;
}

function progress(frame, start, duration, easing = ease) {
  return interpolate(frame, [start, start + duration], [0, 1], {
    ...clamp,
    easing,
  });
}

function sceneOpacity(frame, scene) {
  const fadeIn = scene.start === 0 ? 1 : progress(frame, scene.start, 18, easeInOut);
  const fadeOut = progress(
    frame,
    scene.start + scene.duration - 18,
    18,
    easeInOut,
  );

  return Math.min(fadeIn, 1 - fadeOut);
}

function Background({accent = COLORS.blue, frame}) {
  const drift = interpolate(frame, [0, 900], [-70, 70], clamp);

  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(circle at 50% 20%, rgba(39, 206, 241, 0.10), transparent 32%), linear-gradient(180deg, #050815 0%, #03060f 52%, #02040b 100%)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          background: `radial-gradient(circle, ${accent}25, transparent 64%)`,
          filter: 'blur(18px)',
          height: 760,
          left: 120 + drift,
          opacity: 0.64,
          position: 'absolute',
          top: 250,
          width: 840,
        }}
      />
      <div
        style={{
          background:
            'linear-gradient(180deg, transparent 0%, rgba(2, 4, 11, 0.24) 48%, rgba(2, 4, 11, 0.86) 100%)',
          bottom: 0,
          height: 720,
          left: 0,
          position: 'absolute',
          right: 0,
        }}
      />
      <div
        style={{
          borderLeft: '1px solid rgba(255,255,255,0.045)',
          borderRight: '1px solid rgba(255,255,255,0.045)',
          bottom: 84,
          left: 72,
          position: 'absolute',
          right: 72,
          top: 84,
        }}
      />
      <AbsoluteFill
        style={{
          boxShadow:
            'inset 0 0 180px rgba(0,0,0,0.78), inset 0 -220px 220px rgba(0,0,0,0.78)',
        }}
      />
    </AbsoluteFill>
  );
}

function Scene({accent, children, scene}) {
  const frame = useCurrentFrame();
  const opacity = sceneOpacity(frame, scene);

  if (opacity <= 0) {
    return null;
  }

  return (
    <AbsoluteFill style={{opacity}}>
      <Background accent={accent} frame={frame} />
      {children(localFrame(frame, scene), frame)}
    </AbsoluteFill>
  );
}

function Heading({children, local, maxWidth = 900, top = 116}) {
  const enter = progress(local, 0, 28);

  return (
    <div
      style={{
        color: COLORS.text,
        fontFamily: FONT,
        fontSize: 72,
        fontWeight: 900,
        left: 82,
        letterSpacing: 0,
        lineHeight: 1.04,
        maxWidth,
        opacity: enter,
        position: 'absolute',
        top,
        transform: `translateY(${interpolate(enter, [0, 1], [22, 0], clamp)}px)`,
        zIndex: 8,
      }}
    >
      {children}
    </div>
  );
}

function PhoneFrame({
  local,
  push = 0.025,
  src,
  top,
  width,
  x = (VIDEO.width - width) / 2,
}) {
  const enter = progress(local, 10, 34);
  const phoneHeight = width * PHONE_RATIO;
  const slowPush = interpolate(local, [0, 220], [1, 1 + push], clamp);
  const drift = interpolate(local, [0, 220], [10, -8], clamp);

  return (
    <div
      style={{
        background: COLORS.panel,
        border: '2px solid rgba(255,255,255,0.18)',
        borderRadius: 58,
        boxShadow:
          '0 44px 120px rgba(0,0,0,0.58), 0 0 60px rgba(39,206,241,0.16)',
        height: phoneHeight,
        left: x,
        opacity: enter,
        overflow: 'hidden',
        position: 'absolute',
        top,
        transform: `translateY(${interpolate(enter, [0, 1], [34, 0], clamp) + drift}px) scale(${slowPush})`,
        transformOrigin: 'center center',
        width,
        zIndex: 5,
      }}
    >
      <Img
        src={staticFile(src)}
        style={{
          display: 'block',
          height: '100%',
          objectFit: 'cover',
          width: '100%',
        }}
      />
      <div
        style={{
          background:
            'linear-gradient(120deg, rgba(255,255,255,0.13), transparent 22%, transparent 78%, rgba(255,255,255,0.05))',
          inset: 0,
          opacity: 0.18,
          position: 'absolute',
        }}
      />
    </div>
  );
}

function SignalPanel({
  accent,
  label,
  left,
  local,
  objectPosition,
  src,
  delay,
  top,
}) {
  const enter = progress(local, 12 + delay, 30);
  const drift = interpolate(local, [0, 180], [8, -5], clamp);

  return (
    <div
      style={{
        background: 'rgba(9, 15, 29, 0.9)',
        border: `1px solid ${COLORS.panelBorder}`,
        borderRadius: 30,
        boxShadow: '0 30px 80px rgba(0,0,0,0.38)',
        height: 498,
        left,
        opacity: enter,
        overflow: 'hidden',
        position: 'absolute',
        top,
        transform: `translateY(${
          interpolate(enter, [0, 1], [24, 0], clamp) + drift
        }px)`,
        width: 444,
        zIndex: 5,
      }}
    >
      <Img
        src={staticFile(src)}
        style={{
          height: '100%',
          objectFit: 'cover',
          objectPosition,
          width: '100%',
        }}
      />
      <div
        style={{
          background:
            'linear-gradient(180deg, rgba(3,6,15,0.18), transparent 46%, rgba(3,6,15,0.76))',
          inset: 0,
          position: 'absolute',
        }}
      />
      <div
        style={{
          background: 'rgba(3, 6, 15, 0.76)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderLeft: `4px solid ${accent}`,
          borderRadius: 18,
          bottom: 20,
          color: COLORS.text,
          fontFamily: FONT,
          fontSize: 28,
          fontWeight: 850,
          left: 20,
          padding: '12px 16px',
          position: 'absolute',
          right: 20,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function OpeningScene({local}) {
  return (
    <>
      <Heading local={local} maxWidth={850}>
        {SCENES[0].text}
      </Heading>
      <PhoneFrame local={local} push={0.018} src={ASSETS.today} top={392} width={660} />
    </>
  );
}

function DailyPlanScene({local}) {
  return (
    <>
      <Heading local={local} maxWidth={820}>
        {SCENES[1].text}
      </Heading>
      <PhoneFrame local={local} push={0.028} src={ASSETS.today} top={328} width={710} />
    </>
  );
}

function SignalsScene({local}) {
  return (
    <>
      <Heading local={local} maxWidth={900}>
        {SCENES[2].text}
      </Heading>
      {SIGNAL_PANELS.map((panel) => (
        <SignalPanel key={panel.label} local={local} {...panel} />
      ))}
    </>
  );
}

function WorkoutScene({local}) {
  return (
    <>
      <Heading local={local} maxWidth={760} top={92}>
        {SCENES[3].text}
      </Heading>
      <PhoneFrame local={local} push={0.018} src={ASSETS.workout} top={312} width={728} />
    </>
  );
}

function ClosingScene({local}) {
  const enter = progress(local, 24, 46);
  const glow = interpolate(local, [0, 240], [0.9, 1.04], clamp);

  return (
    <>
      <div
        style={{
          background: `radial-gradient(circle, ${COLORS.blueSoft}, transparent 62%)`,
          filter: 'blur(12px)',
          height: 680,
          left: 180,
          opacity: enter * 0.72,
          position: 'absolute',
          top: 498,
          transform: `scale(${glow})`,
          width: 720,
        }}
      />
      <div
        style={{
          left: 78,
          opacity: enter,
          position: 'absolute',
          right: 78,
          textAlign: 'center',
          top: 752,
          transform: `translateY(${interpolate(enter, [0, 1], [28, 0], clamp)}px)`,
          zIndex: 8,
        }}
      >
        <div
          style={{
            color: COLORS.text,
            fontFamily: FONT,
            fontSize: 118,
            fontWeight: 950,
            letterSpacing: 0,
            lineHeight: 0.9,
          }}
        >
          CornerIQ
        </div>
        <div
          style={{
            background: `linear-gradient(90deg, transparent, ${COLORS.blue}, ${COLORS.red}, transparent)`,
            height: 2,
            margin: '48px auto 42px',
            opacity: 0.78,
            width: 760,
          }}
        />
        <div
          style={{
            color: COLORS.muted,
            fontFamily: FONT,
            fontSize: 44,
            fontWeight: 780,
            lineHeight: 1.14,
          }}
        >
          The intelligence in your corner.
        </div>
      </div>
    </>
  );
}

const renderScene = {
  opening: OpeningScene,
  dailyPlan: DailyPlanScene,
  signals: SignalsScene,
  workout: WorkoutScene,
  closing: ClosingScene,
};

export const CornerIQPromo = () => {
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.background}}>
      {SCENES.map((scene) => {
        const SceneComponent = renderScene[scene.id];

        return (
          <Scene
            accent={scene.id === 'closing' ? COLORS.red : COLORS.blue}
            key={scene.id}
            scene={scene}
          >
            {(local) => <SceneComponent local={local} />}
          </Scene>
        );
      })}
    </AbsoluteFill>
  );
};
