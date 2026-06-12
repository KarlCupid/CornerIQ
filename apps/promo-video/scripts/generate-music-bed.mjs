import {Buffer} from 'node:buffer';
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, '../public/audio/corneriq-bed.wav');

const sampleRate = 48000;
const channels = 2;
const durationSeconds = 30;
const totalFrames = sampleRate * durationSeconds;
const bpm = 88;
const beatSeconds = 60 / bpm;
const dataSize = totalFrames * channels * 2;
const buffer = Buffer.alloc(44 + dataSize);

const notes = {
  c1: 32.7,
  d1: 36.71,
  e1: 41.2,
  f1: 43.65,
  g1: 49.0,
  a1: 55.0,
  c2: 65.41,
  d2: 73.42,
  e2: 82.41,
  g2: 98.0,
};

const scenes = [
  {end: 3.2, root: notes.e1, energy: 0.42, pad: 0.8},
  {end: 6.2, root: notes.g1, energy: 0.5, pad: 0.88},
  {end: 13.0, root: notes.d1, energy: 0.64, pad: 1.0},
  {end: 20.0, root: notes.e1, energy: 0.78, pad: 1.04},
  {end: 25.0, root: notes.c1, energy: 0.58, pad: 0.92},
  {end: 30.0, root: notes.g1, energy: 0.5, pad: 1.15},
];

const impacts = [
  {at: 0.0, gain: 0.36},
  {at: 3.2, gain: 0.28},
  {at: 6.2, gain: 0.34},
  {at: 13.0, gain: 0.42},
  {at: 20.0, gain: 0.3},
  {at: 25.0, gain: 0.36},
  {at: 28.7, gain: 0.24},
];

let seed = 73;
let lowNoise = 0;
let airNoise = 0;

const random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0xffffffff;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smooth = (value) => {
  const x = clamp(value, 0, 1);
  return x * x * (3 - 2 * x);
};
const sine = (hz, t) => Math.sin(Math.PI * 2 * hz * t);
const softLimit = (value) => Math.tanh(value * 1.18) * 0.84;
const globalFade = (t) => smooth(t / 1.4) * smooth((durationSeconds - t) / 2.8);
const rangeEnv = (t, start, end, attack = 0.45, release = 0.75) =>
  smooth((t - start) / attack) * smooth((end - t) / release);
const eventEnv = (t, at, decay = 8, attack = 0.01, length = 1.5) => {
  const local = t - at;
  if (local < 0 || local > length) {
    return 0;
  }
  return smooth(local / attack) * Math.exp(-local * decay);
};
const currentScene = (t) =>
  scenes.find((scene) => t < scene.end) ?? scenes[scenes.length - 1];

const writeString = (offset, value) => buffer.write(value, offset, 'ascii');
writeString(0, 'RIFF');
buffer.writeUInt32LE(36 + dataSize, 4);
writeString(8, 'WAVE');
writeString(12, 'fmt ');
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(channels, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * channels * 2, 28);
buffer.writeUInt16LE(channels * 2, 32);
buffer.writeUInt16LE(16, 34);
writeString(36, 'data');
buffer.writeUInt32LE(dataSize, 40);

const darkPad = (t, root, gain) => {
  const slow = sine(0.043, t) * 0.04 + sine(0.017, t) * 0.03;
  return (
    sine(root + slow, t) * 0.38 +
    sine(root * 1.5 + slow, t) * 0.2 +
    sine(root * 2, t) * 0.13 +
    sine(root * 0.5, t) * 0.24
  ) * gain;
};

const bassStep = (t, root, step, gain) => {
  const local = t % step;
  const env = Math.exp(-(local / step) * 8.8);
  return (
    sine(root * 0.5, t) * 0.75 +
    sine(root, t) * 0.25
  ) * env * gain;
};

const kick = (t, step, gain) => {
  const local = t % step;
  if (local > 0.42) {
    return 0;
  }
  const freq = 36 + 30 * Math.exp(-local * 12);
  return sine(freq, t) * Math.exp(-local * 12) * gain;
};

const lowImpact = (t) =>
  impacts.reduce((sum, impact) => {
    const body = eventEnv(t, impact.at, 3.4, 0.014, 1.9);
    const thump = eventEnv(t, impact.at, 9.0, 0.006, 0.5);
    return (
      sum +
      (sine(33, t) * 0.76 + sine(66, t) * 0.18) * body * impact.gain +
      sine(46, t) * thump * impact.gain * 0.36
    );
  }, 0);

const mutedDrive = (t, energy) => {
  const step = beatSeconds / 2;
  const local = t % step;
  if (local > 0.2) {
    return 0;
  }
  const env = Math.exp(-(local / step) * 18);
  return sine(74, t) * env * energy * 0.052;
};

const lowRiser = (t, start, end, gain) => {
  if (t < start || t > end) {
    return 0;
  }
  const p = (t - start) / (end - start);
  const env = smooth(p) * smooth((end - t) / 0.42);
  const freq = 42 + 36 * p;
  return (sine(freq, t) * 0.66 + sine(freq * 0.5, t) * 0.34) * env * gain;
};

const writeSample = (offset, left, right) => {
  buffer.writeInt16LE(Math.round(clamp(left, -1, 1) * 32767), offset);
  buffer.writeInt16LE(Math.round(clamp(right, -1, 1) * 32767), offset + 2);
};

for (let i = 0; i < totalFrames; i += 1) {
  const t = i / sampleRate;
  const scene = currentScene(t);
  const whiteNoise = random() * 2 - 1;
  lowNoise += (whiteNoise - lowNoise) * 0.0026;
  airNoise += (whiteNoise - airNoise) * 0.0009;

  const hookEnv = rangeEnv(t, 0, 3.2, 0.42, 0.5);
  const intelligenceEnv = rangeEnv(t, 6.2, 13.0, 0.6, 0.9);
  const workoutEnv = rangeEnv(t, 13.0, 20.0, 0.34, 0.84);
  const systemEnv = rangeEnv(t, 20.0, 25.0, 0.55, 0.75);
  const closeEnv = rangeEnv(t, 25.0, 30.0, 0.7, 2.1);

  let center = darkPad(t, scene.root, scene.pad * 0.13);
  center += bassStep(t, scene.root, beatSeconds * 2, 0.12 + scene.energy * 0.05);
  center += kick(t, t < 3.2 ? beatSeconds * 2 : beatSeconds, scene.energy * 0.28);
  center += lowImpact(t);
  center += lowRiser(t, 2.45, 3.2, 0.052);
  center += lowRiser(t, 5.3, 6.2, 0.06);
  center += lowRiser(t, 11.75, 13.0, 0.078);
  center += lowRiser(t, 18.8, 20.0, 0.064);
  center += lowRiser(t, 24.1, 25.0, 0.062);

  if (hookEnv > 0) {
    center += darkPad(t, notes.e1, hookEnv * 0.042);
  }

  if (intelligenceEnv > 0) {
    const step = beatSeconds;
    const bar = Math.floor(t / step);
    const root = [notes.d1, notes.f1, notes.g1, notes.e1][bar % 4];
    center += bassStep(t, root, step, intelligenceEnv * 0.052);
    center += mutedDrive(t, intelligenceEnv * 0.8);
  }

  if (workoutEnv > 0) {
    const step = beatSeconds / 2;
    center += kick(t, step, workoutEnv * 0.12);
    center += mutedDrive(t, workoutEnv * 1.15);
    center += darkPad(t, notes.e1, workoutEnv * 0.035);
  }

  if (systemEnv > 0) {
    center += bassStep(t, notes.c1, beatSeconds, systemEnv * 0.04);
    center += darkPad(t, notes.c1, systemEnv * 0.042);
  }

  if (closeEnv > 0) {
    center += bassStep(t, notes.g1, beatSeconds * 2, closeEnv * 0.048);
    center += darkPad(t, notes.g1, closeEnv * 0.07);
  }

  const air = airNoise * 0.018 + lowNoise * 0.026;
  const side = (
    sine(0.12, t) * darkPad(t, scene.root * 2, 0.025) +
    air * (0.42 + workoutEnv * 0.18)
  );

  const master = globalFade(t) * 0.92;
  const left = softLimit((center - side) * master);
  const right = softLimit((center + side) * master);
  writeSample(44 + i * channels * 2, left, right);
}

mkdirSync(dirname(outPath), {recursive: true});
writeFileSync(outPath, buffer);
process.stdout.write(`Wrote ${outPath}\n`);
