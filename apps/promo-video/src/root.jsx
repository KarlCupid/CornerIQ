import React from 'react';
import {Composition} from 'remotion';
import {CornerIQPromo} from './video.jsx';

export const RemotionRoot = () => {
  return (
    <Composition
      component={CornerIQPromo}
      durationInFrames={900}
      fps={30}
      height={1920}
      id="CornerIQPromo"
      width={1080}
    />
  );
};
