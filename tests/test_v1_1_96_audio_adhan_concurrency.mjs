import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'islamic-v1-1-96-adhan-'));

function transpileProduction(relativePath, outputName, replacements) {
  let source = fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
  for (const [from, to] of replacements) {
    assert.ok(source.includes(from), `expected replacement target in ${relativePath}: ${from}`);
    source = source.replaceAll(from, to);
  }
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: relativePath,
  }).outputText;
  const filePath = path.join(TMP_DIR, outputName);
  fs.writeFileSync(filePath, output);
  return filePath;
}

fs.writeFileSync(path.join(TMP_DIR, 'audioExpo.mjs'), `
  export const players = [];
  export async function setAudioModeAsync() {}
  export function createAudioPlayer(source) {
    const player = {
      source,
      removeCalls: 0,
      releaseCalls: 0,
      pauseCalls: 0,
      playCalls: 0,
      addListener() {
        return { remove() { player.listenerRemoved = true; } };
      },
      play() { player.playCalls += 1; },
      pause() { player.pauseCalls += 1; },
      remove() { player.removeCalls += 1; },
      release() { player.releaseCalls += 1; },
      volume: 1,
    };
    players.push(player);
    return player;
  }
`);

fs.writeFileSync(path.join(TMP_DIR, 'audioStorage.mjs'), `
  export const reads = [];
  export default {
    getItem() {
      return new Promise((resolve) => reads.push(resolve));
    },
  };
`);

const audioFile = transpileProduction('src/lib/audio.ts', 'audio.mjs', [
  ["from 'expo-audio'", "from './audioExpo.mjs'"],
  ["from '@react-native-async-storage/async-storage'", "from './audioStorage.mjs'"],
]);
const audio = await import(audioFile);
const expo = await import(path.join(TMP_DIR, 'audioExpo.mjs'));
const storage = await import(path.join(TMP_DIR, 'audioStorage.mjs'));

const first = audio.playAdhan();
const second = audio.playAdhan();

async function waitForRead() {
  for (let i = 0; i < 100 && storage.reads.length === 0; i += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.ok(storage.reads.length > 0, 'a playAdhan call must reach the real settings read');
}

try {
  await waitForRead();
  storage.reads.shift()(null);
  await waitForRead();
  storage.reads.shift()(null);
  await Promise.all([first, second]);

  assert.equal(expo.players.length, 2, 'the serialized calls should each create one player');
  assert.equal(expo.players[0].removeCalls, 1, 'the second call must stop and release the first player');
  assert.equal(expo.players[1].removeCalls, 0, 'the winning player must not be released by the prior call');
  assert.equal(expo.players[1].playCalls, 1, 'the winning player must be wired and played');
  assert.equal(audio.getCurrentlyPlayingReciterId(), 'alafasy');
} finally {
  await audio.stopAdhan();
}

console.log('PASS: concurrent playAdhan calls are serialized at the real player-wiring boundary');
