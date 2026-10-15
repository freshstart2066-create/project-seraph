import test from 'node:test';
import assert from 'node:assert/strict';
import { toggleShader } from './main.js';
import { threatMatrix } from './threatMatrix.js';
import { ballisticPredictor } from './layers/ballisticPredictor.js';
import { tacticalWta } from './tacticalWta.js';
import { terrainMasking } from './layers/terrainMasking.js';
import { spaceDomainAwareness } from './layers/spaceDomainAwareness.js';
import { tacticalSitrep } from './tacticalSitrep.js';
import { matchTacticalIntent } from './voice/localVoiceSession.js';

test('Project Seraph tactical engines export required interface methods', () => {
  assert.equal(typeof ballisticPredictor.toggle, 'function');
  assert.equal(typeof tacticalWta.toggle, 'function');
  assert.equal(typeof terrainMasking.toggle, 'function');
  assert.equal(typeof spaceDomainAwareness.toggle, 'function');
  assert.equal(typeof threatMatrix.setDefcon, 'function');
  assert.equal(typeof tacticalSitrep.deliverBriefing, 'function');
});

test('toggleShader cycles between active shader and normal spectrum', () => {
  let active = 'normal';
  const mockStyleManager = {
    get activeStyle() {
      return active;
    },
    setStyle(next) {
      active = next;
    },
  };

  globalThis.window = {
    ProjectSeraph: {
      styleManager: mockStyleManager,
    },
  };

  // Toggle FLIR Thermal [T]
  assert.equal(toggleShader('thermal', 'FLIR THERMAL'), 'thermal');
  assert.equal(active, 'thermal');
  // Re-toggle FLIR reverts to normal
  assert.equal(toggleShader('thermal', 'FLIR THERMAL'), 'normal');
  assert.equal(active, 'normal');

  // Toggle NVG Night Vision [N]
  assert.equal(toggleShader('surveillance', 'NVG NIGHT VISION'), 'surveillance');
  assert.equal(active, 'surveillance');
  assert.equal(toggleShader('surveillance', 'NVG NIGHT VISION'), 'normal');
  assert.equal(active, 'normal');

  // Toggle CRT Scanlines [C]
  assert.equal(toggleShader('retro', 'TACTICAL CRT'), 'retro');
  assert.equal(active, 'retro');
  assert.equal(toggleShader('retro', 'TACTICAL CRT'), 'normal');
  assert.equal(active, 'normal');
});

test('README hotkey DEFCON levels 1-5 correctly update threat matrix', () => {
  for (let i = 1; i <= 5; i++) {
    const res = threatMatrix.setDefcon(i);
    assert.equal(res.level, i);
    assert.equal(threatMatrix.currentDefcon, i);
    assert.ok(res.label.startsWith(String(i)));
  }
});

test('All natural voice commands from README map to correct tactical modules', () => {
  const commands = [
    { phrase: 'Seraph, run ballistic trajectory', expectedType: 'ballistic_predictor' },
    { phrase: 'Seraph, solve WTA / weapons to target', expectedType: 'wta_assignment' },
    { phrase: 'Seraph, show terrain masking / radar horizon', expectedType: 'terrain_masking' },
    { phrase: 'Seraph, monitor satellite passes / space domain', expectedType: 'space_domain' },
    { phrase: 'Seraph, set DEFCON 2 / DEFCON 1', expectedType: 'defcon' },
    { phrase: 'Seraph, generate situation report', expectedType: 'sitrep' },
    { phrase: 'Seraph, engage thermal vision / night vision', expectedType: 'action' },
  ];

  for (const cmd of commands) {
    const intent = matchTacticalIntent(cmd.phrase);
    assert.ok(intent, `Failed to match phrase: "${cmd.phrase}"`);
    assert.equal(
      intent.type,
      cmd.expectedType,
      `Phrase "${cmd.phrase}" produced type "${intent.type}", expected "${cmd.expectedType}"`,
    );
  }
});
