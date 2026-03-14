import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWav(filename, sampleRate, numChannels, samples) {
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF Chunk Descriptor
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20); // AudioFormat (PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Write audio data
  for (let i = 0; i < samples.length; i++) {
    // clamp between -1 and 1
    let s = Math.max(-1, Math.min(1, samples[i]));
    // convert to 16 bit PCM
    let val = s < 0 ? s * 0x8000 : s * 0x7FFF;
    buffer.writeInt16LE(val, 44 + i * 2);
  }

  fs.writeFileSync(filename, buffer);
}

// Ensure dir exists
const dir = path.join(__dirname, 'assets', 'sounds');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const sampleRate = 44100;

// 1. UI Hover/Select (short high beep)
const hoverVol = 0.15;
const hoverLen = Math.floor(sampleRate * 0.05); // 50ms
const hoverSamples = new Float32Array(hoverLen);
for (let i = 0; i < hoverLen; i++) {
  const t = i / sampleRate;
  let s = Math.sin(2 * Math.PI * 880 * t); // A5
  s *= (1 - i/hoverLen) * hoverVol;
  hoverSamples[i] = s;
}
createWav(path.join(dir, 'ui_hover.wav'), sampleRate, 1, hoverSamples);

// 2. UI Click/Confirm (synth zap downwards)
const clickLen = Math.floor(sampleRate * 0.1);
const clickSamples = new Float32Array(clickLen);
for (let i = 0; i < clickLen; i++) {
  const t = i / sampleRate;
  let freq = 1200 - (i/clickLen) * 600; // Pitch drop
  let s = Math.sin(2 * Math.PI * freq * t);
  s *= (1 - i/clickLen) * 0.3;
  clickSamples[i] = s;
}
createWav(path.join(dir, 'ui_click.wav'), sampleRate, 1, clickSamples);

// 3. Success (Arpeggio)
const succLen = Math.floor(sampleRate * 0.5);
const succSamples = new Float32Array(succLen);
for (let i = 0; i < succLen; i++) {
  const t = i / sampleRate;
  let s = 0;
  if (t < 0.15) s = Math.sin(2 * Math.PI * 523.25 * t); // C5
  else if (t < 0.3) s = Math.sin(2 * Math.PI * 659.25 * t); // E5
  else s = Math.sin(2 * Math.PI * 783.99 * t); // G5
  s *= (1 - i/succLen) * 0.3; // Decay over whole duration
  succSamples[i] = s;
}
createWav(path.join(dir, 'success.wav'), sampleRate, 1, succSamples);

// 4. Error (Low buzz)
const errLen = Math.floor(sampleRate * 0.3);
const errSamples = new Float32Array(errLen);
for (let i = 0; i < errLen; i++) {
  const t = i / sampleRate;
  let s = Math.sin(2 * Math.PI * 150 * t); // Low square-ish wave
  s = s > 0 ? 0.8 : -0.8;
  s *= (1 - i/errLen) * 0.2;
  errSamples[i] = s;
}
createWav(path.join(dir, 'error.wav'), sampleRate, 1, errSamples);

// 5. Door Open (Squeaky/Creaky Door)
const doorLen = Math.floor(sampleRate * 1.5);
const doorSamples = new Float32Array(doorLen);
for (let i = 0; i < doorLen; i++) {
  const t = i / sampleRate;
  // Squeak: high pitched resonant frequency with slight wobble
  let squeakFreq = 2200 + Math.sin(2 * Math.PI * 6 * t) * 150;
  let squeak = Math.sin(2 * Math.PI * squeakFreq * t);
  
  // Creak: random low-frequency wood-like impulses
  let creak = 0;
  if (t > 0.1 && Math.random() < 0.015) {
    creak = (Math.random() * 2 - 1) * 0.6;
  }
  
  // Combined sound with noise friction
  let friction = (Math.random() * 2 - 1) * 0.05;
  
  // Envelope: slow opening, then sustained squeak, then fade
  let env = t < 0.2 ? (t/0.2) : (1 - (t-0.2)/1.3);
  doorSamples[i] = (squeak * 0.2 + creak * 0.4 + friction) * env * 0.2;
}
createWav(path.join(dir, 'door.wav'), sampleRate, 1, doorSamples);

// 6. Background loop (low hum/drone with slight pulsing)
const bgmLen = Math.floor(sampleRate * 3.0); // 3 seconds loop
const bgmSamples = new Float32Array(bgmLen);
for (let i = 0; i < bgmLen; i++) {
  const t = i / sampleRate;
  let s1 = Math.sin(2 * Math.PI * 55 * t); // Low A
  let s2 = Math.sin(2 * Math.PI * 55.5 * t); // Beating
  let s3 = Math.sin(2 * Math.PI * 110 * t) * 0.4; // 1st overtone
  let s = (s1 + s2 + s3) * 0.1;
  // slight pulsing amplitude
  s *= 0.8 + 0.2 * Math.sin(2 * Math.PI * 0.333333 * t); // Modulates once per 3 seconds
  bgmSamples[i] = s;
}
createWav(path.join(dir, 'bgm.wav'), sampleRate, 1, bgmSamples);

// 7. Key Pickup (Metallic chime/glissando up)
const keyLen = Math.floor(sampleRate * 0.3);
const keySamples = new Float32Array(keyLen);
for (let i = 0; i < keyLen; i++) {
  const t = i / sampleRate;
  // Fast frequency sweep up
  let freq = 1500 + (t / 0.3) * 1000;
  let s = Math.sin(2 * Math.PI * freq * t);
  // Add some overtone to make it chime-y
  s += 0.5 * Math.sin(2 * Math.PI * freq * 2.5 * t);
  // Percussive envelope
  let env = Math.exp(-t * 15);
  keySamples[i] = s * env * 0.2;
}
createWav(path.join(dir, 'pickup_key.wav'), sampleRate, 1, keySamples);

// 8. Door Locked (Rattle/knock noise burst)
const rattleLen = Math.floor(sampleRate * 0.4);
const rattleSamples = new Float32Array(rattleLen);
for (let i = 0; i < rattleLen; i++) {
  const t = i / sampleRate;
  // Fast square-ish noise
  let noise = Math.random() > 0.5 ? 1 : -1;
  // Two distinct "knocks"
  let env1 = Math.exp(-t * 40); // knock 1
  let env2 = t > 0.15 ? Math.exp(-(t-0.15) * 40) : 0; // knock 2
  rattleSamples[i] = noise * (env1 + env2) * 0.4;
}
createWav(path.join(dir, 'door_locked.wav'), sampleRate, 1, rattleSamples);

console.log('Sounds generated successfully in assets/sounds/');
