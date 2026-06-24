import React from 'react';
import {Composition} from 'remotion';
import {
  CornerIQInstagramAuraTeaser,
  FPS,
  TOTAL_DURATION_FRAMES,
} from './instagram-aura-teaser.jsx';
import {CornerIQPromo} from './video.jsx';

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        component={CornerIQPromo}
        durationInFrames={900}
        fps={30}
        height={1920}
        id="CornerIQPromo"
        width={1080}
      />
      <Composition
        component={CornerIQInstagramAuraTeaser}
        durationInFrames={TOTAL_DURATION_FRAMES}
        fps={FPS}
        height={1920}
        id="CornerIQInstagramAuraTeaser"
        width={1080}
      />
    </>
  );
};
