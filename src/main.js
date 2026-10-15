import { createStandaloneApplication } from './standalone/application.js';
import { describeError } from './standalone/errors.js';
import { threatMatrix } from './threatMatrix.js';
import { tacticalSound } from './tacticalSound.js';
import { TacticalTourController } from './tacticalTour.js';
import { tacticalThreatGrid } from './tacticalThreatGrid.js';
import { dopplerRadar } from './layers/dopplerRadar.js';
import { satelliteCones } from './layers/satelliteCones.js';
import { gpsJammingLayer } from './layers/gpsJammingLayer.js';
import { tacticalSitrep } from './tacticalSitrep.js';
import { tacticalVectoring } from './tacticalVectoring.js';
import { milStdSymbology } from './layers/milStdSymbology.js';
import * as Cesium from 'cesium';
import { cotLayer } from './layers/cotLayer.js';
import { ballisticPredictor } from './layers/ballisticPredictor.js';
import { tacticalWta } from './tacticalWta.js';
import { terrainMasking } from './layers/terrainMasking.js';
import { spaceDomainAwareness } from './layers/spaceDomainAwareness.js';

if (typeof window !== 'undefined') {
  window.Cesium = Cesium;
}

const application =
  typeof document !== 'undefined'
    ? createStandaloneApplication({
        googleApiKey: import.meta.env?.GOOGLE_MAPS_API_KEY,
        cesiumToken: import.meta.env?.CESIUM_ION_TOKEN,
        allowQaRegistration: import.meta.env?.DEV,
      })
    : null;

let toastTimer = null;
function showToast(text, duration = 2800) {
  if (typeof document === 'undefined') return;
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = text;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), duration);
  }
}

const tacticalTour = new TacticalTourController({ showToast });

const CITY_HOTSPOTS = [
  { id: 'austin', name: 'AUSTIN, TX' },
  { id: 'sf', name: 'SAN FRANCISCO, CA' },
  { id: 'nyc', name: 'NEW YORK, NY' },
  { id: 'tokyo', name: 'TOKYO, JAPAN' },
  { id: 'london', name: 'LONDON, UK' },
  { id: 'paris', name: 'PARIS, FRANCE' },
  { id: 'dubai', name: 'DUBAI, UAE' },
  { id: 'dc', name: 'WASHINGTON D.C.' },
  { id: 'tallinn', name: 'TALLINN, ESTONIA' },
];
let currentCityIdx = 0;

export function toggleShader(styleName, displayName = styleName.toUpperCase()) {
  const sm =
    window.ProjectSeraph?.styleManager ||
    application.getComponents()?.controls?.styleManager;
  if (sm) {
    const current = sm.activeStyle;
    const next = current === styleName ? 'normal' : styleName;
    sm.setStyle(next);
    tacticalSound.playRadioChirp?.();
    showToast(
      next === styleName
        ? `VISUAL SENSOR // ${displayName} SHADER ACTIVE`
        : 'VISUAL SENSOR // NORMAL SPECTRUM RESTORED',
    );
    return next;
  }
  const btn = document.querySelector(`.style-btn[data-style="${styleName}"]`);
  if (btn) {
    btn.click();
    showToast(`VISUAL SENSOR // ${displayName} TOGGLED`);
  }
  return styleName;
}

// Expose global Project Seraph C4ISR interface immediately
if (typeof window !== 'undefined') {
  window.ProjectSeraph = {
    application,
    tacticalSitrep,
    dopplerRadar,
    satelliteCones,
    gpsJammingLayer,
    cotLayer,
    tacticalThreatGrid,
    tacticalSound,
    tacticalTour,
    ballisticPredictor,
    tacticalWta,
    terrainMasking,
    spaceDomainAwareness,
    threatMatrix,
    toggleShader,
  };
  window.HeliosC2 = window.ProjectSeraph; // Legacy backward alias
  window.__threatMatrix = threatMatrix;
  window.__tacticalSitrep = tacticalSitrep;
  window.__tacticalVectoring = tacticalVectoring;
  window.__tacticalThreatGrid = tacticalThreatGrid;
  window.__tacticalTour = tacticalTour;
}

/**
 * Register UI controls, keyboard listeners, and command dock interactions immediately.
 * Does NOT wait for asynchronous 3D globe / WebGL bootstrap to complete.
 */
function initSeraphInteractions() {
  // 1. Bind AI SITREP Briefing Button
  const sitrepBtn = document.getElementById('tactical-sitrep-btn');
  if (sitrepBtn && !sitrepBtn.dataset.bound) {
    sitrepBtn.dataset.bound = 'true';
    sitrepBtn.addEventListener('click', () => {
      tacticalSitrep.deliverBriefing();
      showToast('AI SITREP // TACTICAL INTELLIGENCE BRIEFING ACTIVE');
    });
  }

  // 2. Bind Tactical Audio Switcher
  const audioBtn = document.getElementById('tactical-audio-btn');
  if (audioBtn && !audioBtn.dataset.bound) {
    audioBtn.dataset.bound = 'true';
    audioBtn.addEventListener('click', () => {
      const active = tacticalSound.toggle();
      audioBtn.style.color = active ? '#00f0ff' : '';
      audioBtn.style.background = active ? 'rgba(0, 240, 255, 0.2)' : '';
      showToast(
        active
          ? 'TACTICAL AUDIO ONLINE · SONAR & COMMS ARMED'
          : 'TACTICAL AUDIO MUTED',
      );
    });
  }

  // 3. Bind Theme Switcher (Day/Night)
  const themeBtn = document.getElementById('theme-toggle-btn');
  const themeIcon = document.getElementById('theme-toggle-icon');
  if (themeBtn && !themeBtn.dataset.bound) {
    themeBtn.dataset.bound = 'true';
    themeBtn.addEventListener('click', () => {
      const isLight = document.documentElement.dataset.theme === 'light';
      if (isLight) {
        delete document.documentElement.dataset.theme;
        if (themeIcon) themeIcon.textContent = 'light_mode';
        themeBtn.title = 'Toggle Day / Night Light Mode';
        showToast('VISUAL SPECTRUM: NIGHT OPS [DARK]');
      } else {
        document.documentElement.dataset.theme = 'light';
        if (themeIcon) themeIcon.textContent = 'dark_mode';
        themeBtn.title = 'Toggle Day / Night Light Mode';
        showToast('VISUAL SPECTRUM: DAYLIGHT RECON [LIGHT]');
      }
      tacticalSound.playRadioChirp?.();
    });
  }

  // 4. Interactive DEFCON Status Inspection
  const defconIndicator = document.getElementById('defcon-indicator');
  if (defconIndicator && !defconIndicator.dataset.bound) {
    defconIndicator.dataset.bound = 'true';
    defconIndicator.style.cursor = 'pointer';
    defconIndicator.title = 'Click to inspect DEFCON readiness status';
    defconIndicator.addEventListener('click', () => {
      const badgeText =
        document.getElementById('defcon-level-badge')?.textContent ||
        '4 · GUARDED';
      showToast(
        `DEFCON STATUS: [${badgeText}] · MULTI-DOMAIN C4ISR SECURE`,
        3500,
      );
      tacticalSound.playAlertBeep?.();
    });
  }

  // 5. Loading screen progress & smooth auto-dismissal
  const loadingScreen = document.getElementById('loading-screen');
  const progressBar = document.getElementById('loader-progress-bar');
  const substatusEl = document.getElementById('loader-substatus');

  window.setSeraphLoadProgress = (percent, statusText, substatusText) => {
    if (progressBar)
      progressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    const statusEl = document.querySelector('#loading-screen .loader-status');
    if (statusEl && statusText) statusEl.textContent = statusText;
    if (substatusEl && substatusText) substatusEl.textContent = substatusText;
  };

  window.setSeraphLoadProgress(
    35,
    'INITIALIZING ORBITAL CORE...',
    'CESIUM 3D GRAPHICS ENGINE',
  );

  if (loadingScreen && !loadingScreen.dataset.boundDismiss) {
    loadingScreen.dataset.boundDismiss = 'true';
    loadingScreen.style.cursor = 'pointer';
    loadingScreen.title = 'Click to skip loading and enter C4ISR Tactical HUD';
    loadingScreen.addEventListener('click', () => {
      loadingScreen.classList.add('hidden');
    });
    // Automatic failsafe: transition to tactical HUD after 3.2s so operator is never locked out
    setTimeout(() => {
      if (!loadingScreen.classList.contains('hidden')) {
        console.info(
          '[Project Seraph] Auto-dismissing loading overlay — entering tactical HUD.',
        );
        loadingScreen.classList.add('hidden');
      }
    }, 3200);
  }

  // 8. Tactical Keyboard Navigation Controller (registered immediately)
  window.addEventListener('keydown', (event) => {
    // Avoid intercepting while operator is typing in search, inputs, or selects
    if (
      event.target?.matches?.('input, textarea, select') ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {
      return;
    }

    const key = event.key.toLowerCase();
    const viewer = application.getComponents()?.scene?.viewer;

    // Tactical Recon Tour Toggle (M)
    if (key === 'm' && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      tacticalTour.toggle();
      return;
    }

    if (event.key === 'Escape') {
      tacticalVectoring.clear();
      if (tacticalTour.isRunning) {
        event.preventDefault();
        event.stopPropagation();
        tacticalTour.stop();
        return;
      }
      const loading = document.getElementById('loading-screen');
      if (loading && !loading.classList.contains('hidden')) {
        event.preventDefault();
        event.stopPropagation();
        loading.classList.add('hidden');
        return;
      }
    }

    // DEFCON Operational Readiness State [1] through [5]
    if (['1', '2', '3', '4', '5'].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      const level = Number.parseInt(event.key, 10);
      const def = threatMatrix.setDefcon(level);
      showToast(
        `DEFCON STATUS ESCALATION: [DEFCON ${def.label}] [${event.key}]`,
        3500,
      );
      return;
    }

    // AI Operational SITREP Briefing [Space] or [S]
    if (event.code === 'Space' || event.key === ' ' || key === 's') {
      event.preventDefault();
      event.stopPropagation();
      tacticalSitrep.deliverBriefing();
      showToast('AI SITREP // TACTICAL INTELLIGENCE BRIEFING ACTIVE [Space/S]');
      return;
    }

    // Toggle Operator Voice C2 Session (Local OmniVoice) [V]
    if (key === 'v' && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      const voiceBtn = document.getElementById('gev-voice-button');
      if (voiceBtn) {
        voiceBtn.click();
        showToast('OMNIVOICE C2 // OPERATOR VOICE SESSION TOGGLED [V]');
      } else if (window.__gevVoiceCommands) {
        if (window.__gevVoiceCommands.session?.isActive?.()) {
          window.__gevVoiceCommands.session.stop();
          showToast('OMNIVOICE C2 // VOICE STANDBY [V]');
        } else {
          window.__gevVoiceCommands.session?.start?.({ pushToTalk: false });
          showToast('OMNIVOICE C2 // VOICE ACTIVE [V]');
        }
      }
      tacticalSound.playRadioChirp?.();
      return;
    }

    // Toggle FLIR Thermal Multi-Spectral Post-Processing Shader [T]
    if (key === 't' && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      toggleShader('thermal', 'FLIR THERMAL [T]');
      return;
    }

    // Camera Tilt (Shift+T)
    if (event.key === 'T' || (key === 't' && event.shiftKey)) {
      event.preventDefault();
      event.stopPropagation();
      const tiltBtn = document.getElementById('tilt-map-view');
      if (tiltBtn) {
        tiltBtn.click();
        const isTilted = tiltBtn.getAttribute('aria-pressed') === 'true';
        showToast(
          isTilted
            ? 'CAMERA ANGLE: 45° OBLIQUE TILT [Shift+T]'
            : 'CAMERA ANGLE: TOP-DOWN NADIR [Shift+T]',
        );
      }
      return;
    }

    // Toggle NVG Night Vision Phosphor Shader [N]
    if (key === 'n' && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      toggleShader('surveillance', 'NVG NIGHT VISION PHOSPHOR [N]');
      return;
    }

    // Reset North (Shift+N)
    if (event.key === 'N' || (key === 'n' && event.shiftKey)) {
      event.preventDefault();
      event.stopPropagation();
      const northBtn = document.getElementById('north-up-view');
      if (northBtn) {
        northBtn.click();
        showToast('COMPASS ALIGNED: NORTH-UP [0°] [Shift+N]');
      }
      return;
    }

    // Toggle Tactical CRT Scanline Post-Processing Shader [C]
    if (key === 'c' && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      toggleShader('retro', 'TACTICAL CRT SCANLINES [C]');
      return;
    }

    // Space Domain Awareness - Satellite Recon Cones (Shift+C)
    if (event.key === 'C' || (key === 'c' && event.shiftKey)) {
      event.preventDefault();
      event.stopPropagation();
      const active = satelliteCones.toggle(viewer);
      showToast(
        active
          ? 'SDA ONLINE · SATELLITE RECON CONES PROJECTED [Shift+C]'
          : 'SATELLITE CONES HIDDEN [Shift+C]',
      );
      tacticalSound.playSonarPing?.();
      return;
    }

    // Reset Globe (G)
    if (key === 'g') {
      event.preventDefault();
      event.stopPropagation();
      const globeBtn = document.getElementById('reset-globe-view');
      if (globeBtn) {
        globeBtn.click();
        showToast('CAMERA RESET: PLANETARY ORBITAL VIEW [G]');
      }
      return;
    }

    // Location Tray Toggle (L)
    if (key === 'l') {
      event.preventDefault();
      event.stopPropagation();
      const locToggle = document.getElementById('location-bar-toggle');
      if (locToggle) {
        locToggle.click();
        showToast('LOCATION TRAY TOGGLED [L]');
      }
      return;
    }

    // Visual Presets Tray Toggle (P)
    if (key === 'p') {
      event.preventDefault();
      event.stopPropagation();
      const presetToggle = document.getElementById('control-panel-toggle');
      if (presetToggle) {
        presetToggle.click();
        showToast('VISUAL PRESETS TRAY TOGGLED [P]');
      }
      return;
    }

    // Strategic Defense Sector Cycle & Intercept Camera (Shift+K)
    if (event.key === 'K' || (key === 'k' && event.shiftKey)) {
      event.preventDefault();
      event.stopPropagation();
      const sector = tacticalThreatGrid.cycleNextSector();
      if (sector) {
        showToast(
          `DEFENSE SECTOR JUMP // ${sector.shortCode} · ${sector.name}`,
          3500,
        );
      }
      return;
    }

    // Tactical Threat & Radar Grid Toggle (K)
    if (key === 'k') {
      event.preventDefault();
      event.stopPropagation();
      const active = tacticalThreatGrid.toggle();
      showToast(
        active
          ? 'THREAT GRID ONLINE · RADAR ENVELOPES ARMED [K]'
          : 'THREAT GRID STANDBY · RADAR ENVELOPES HIDDEN [K]',
      );
      tacticalSound.playSonarPing?.();
      return;
    }

    // Tactical Intercept & Range Vectoring Engine (Shift+V or I)
    if ((key === 'v' && event.shiftKey) || key === 'i') {
      event.preventDefault();
      event.stopPropagation();
      if (tacticalVectoring.activeSolution) {
        tacticalVectoring.clear();
        showToast('INTERCEPT VECTORING // CLEARED [Shift+V]');
      } else {
        const sectors = tacticalThreatGrid.getSectors();
        const activeSec =
          sectors[tacticalThreatGrid.currentSectorIdx] || sectors[0];
        const anomalies = threatMatrix.getAnomalies();

        let target = window.__gevLastSelectedContact;
        if (!target) {
          if (anomalies && anomalies.length > 0) {
            target = anomalies[0];
          } else {
            const oppIdx =
              (tacticalThreatGrid.currentSectorIdx + 4) % sectors.length;
            target = sectors[oppIdx];
          }
        }

        if (activeSec && target) {
          const originContact = {
            id: activeSec.id,
            callsign: activeSec.name,
            lat: activeSec.lat,
            lon: activeSec.lon,
            speedKts: 0,
            courseDeg: 0,
          };
          const targetContact = {
            id: target.id || target.shortCode || 'TARGET',
            callsign:
              target.callsign ||
              target.name ||
              target.code ||
              'TACTICAL-TARGET',
            lat: target.lat ?? target.latitude ?? 0,
            lon: target.lon ?? target.longitude ?? 0,
            speedKts: target.speedKts || target.velocityKts || 450,
            courseDeg: target.heading || target.courseDeg || 180,
          };
          const sol = tacticalVectoring.setIntercept(
            originContact,
            targetContact,
          );
          if (sol) {
            showToast(`INTERCEPT // ${sol.tacticalSummary}`, 5500);
          }
        }
      }
      return;
    }

    // Live Doppler Storm Radar Toggle (R)
    if (key === 'r') {
      event.preventDefault();
      event.stopPropagation();
      const active = dopplerRadar.toggle(viewer);
      showToast(
        active
          ? 'DOPPLER RADAR ONLINE · LIVE PRECIPITATION MAPPED [R]'
          : 'DOPPLER RADAR MUTED [R]',
      );
      tacticalSound.playSonarPing?.();
      return;
    }

    // GPS Jamming & Electronic Warfare Denial Layer (J)
    if (key === 'j') {
      event.preventDefault();
      event.stopPropagation();
      const active = gpsJammingLayer.toggle(viewer);
      showToast(
        active
          ? 'ELECTRONIC WARFARE // GPS JAMMING ZONES ARMED [J]'
          : 'EW / GPS JAMMING LAYER STANDBY [J]',
      );
      tacticalSound.playAlertBeep?.();
      return;
    }

    // Ballistic & Hypersonic Trajectory Predictor (Shift+B)
    if (event.key === 'B' || (key === 'b' && event.shiftKey)) {
      event.preventDefault();
      event.stopPropagation();
      const active = ballisticPredictor.toggle(viewer);
      showToast(
        active
          ? 'BMEWS ONLINE · 3D BALLISTIC/HYPERSONIC TRAJECTORY & CEP PREDICTED [Shift+B]'
          : 'BALLISTIC PREDICTOR STANDBY [Shift+B]',
      );
      tacticalSound.playAlertBeep?.();
      return;
    }

    // ATAK / CoT Tactical Data Link (B)
    if (key === 'b') {
      event.preventDefault();
      event.stopPropagation();
      const active = cotLayer.toggle(viewer);
      showToast(
        active
          ? 'ATAK / CoT TACTICAL DATA LINK ONLINE [B]'
          : 'ATAK / CoT DATA LINK STANDBY [B]',
      );
      tacticalSound.playRadioChirp?.();
      return;
    }

    // Weapons-to-Target Assignment Battle Management (Shift+W)
    if (event.key === 'W' || (key === 'w' && event.shiftKey)) {
      event.preventDefault();
      event.stopPropagation();
      const active = tacticalWta.toggle(viewer);
      showToast(
        active
          ? 'WTA ONLINE · MULTI-TARGET INTERCEPT QUEUING & PK LOCKED [Shift+W]'
          : 'WTA BATTLE MANAGEMENT STANDBY [Shift+W]',
      );
      tacticalSound.playRadioChirp?.();
      return;
    }

    // 3D Radar Horizon & Terrain Masking (Shift+M)
    if (event.key === 'M' || (key === 'm' && event.shiftKey)) {
      event.preventDefault();
      event.stopPropagation();
      const active = terrainMasking.toggle(viewer);
      showToast(
        active
          ? 'RADAR HORIZON & TERRAIN MASKING DOME ACTIVE [Shift+M]'
          : 'TERRAIN MASKING STANDBY [Shift+M]',
      );
      tacticalSound.playSonarPing?.();
      return;
    }

    // Space Domain Awareness & Satellite Overflight Warning (Shift+O)
    if (event.key === 'O' || (key === 'o' && event.shiftKey)) {
      event.preventDefault();
      event.stopPropagation();
      const active = spaceDomainAwareness.toggle(viewer);
      showToast(
        active
          ? 'SDA ONLINE · SATELLITE RECON OVERFLIGHT DETECTION ARMED [Shift+O]'
          : 'SPACE DOMAIN AWARENESS STANDBY [Shift+O]',
      );
      tacticalSound.playAlertBeep?.();
      return;
    }

    // MIL-STD-2525D NATO Tactical Symbology (Y)
    if (key === 'y') {
      event.preventDefault();
      event.stopPropagation();
      const active = milStdSymbology.toggle(viewer);
      showToast(
        active
          ? 'MIL-STD-2525D ONLINE · NATO COMBAT FRAMES ARMED [Y]'
          : 'MIL-STD-2525D STANDBY · STANDARD SYMBOLOGY [Y]',
      );
      tacticalSound.playRadioChirp?.();
      return;
    }

    // Cycle Hotspot Cities Next (]) and Previous ([)
    if (event.key === ']' || event.key === '}') {
      event.preventDefault();
      event.stopPropagation();
      currentCityIdx = (currentCityIdx + 1) % CITY_HOTSPOTS.length;
      const target = CITY_HOTSPOTS[currentCityIdx];
      const pill = document.querySelector(
        `.location-pill[data-location-id="${target.id}"]`,
      );
      if (pill) pill.click();
      showToast(`NAV TARGET: ${target.name} [ ] ]`);
      return;
    }

    if (event.key === '[' || event.key === '{') {
      event.preventDefault();
      event.stopPropagation();
      currentCityIdx =
        (currentCityIdx - 1 + CITY_HOTSPOTS.length) % CITY_HOTSPOTS.length;
      const target = CITY_HOTSPOTS[currentCityIdx];
      const pill = document.querySelector(
        `.location-pill[data-location-id="${target.id}"]`,
      );
      if (pill) pill.click();
      showToast(`NAV TARGET: ${target.name} [ [ ]`);
      return;
    }

    // Camera Zoom In (+ or =)
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      event.stopPropagation();
      if (viewer && !viewer.isDestroyed()) {
        const camera = viewer.camera;
        const height = camera.positionCartographic?.height || 5000;
        camera.zoomIn(Math.max(150, height * 0.25));
        viewer.scene.requestRender();
      }
      return;
    }

    // Camera Zoom Out (- or _)
    if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      event.stopPropagation();
      if (viewer && !viewer.isDestroyed()) {
        const camera = viewer.camera;
        const height = camera.positionCartographic?.height || 5000;
        camera.zoomOut(Math.max(150, height * 0.25));
        viewer.scene.requestRender();
      }
      return;
    }

    // Keyboard Shortcuts Cheatsheet (? or F1)
    if (event.key === '?' || event.key === 'F1') {
      event.preventDefault();
      event.stopPropagation();
      showToast(
        'HOTKEYS: [1-5] DEFCON · [Space] SITREP · [V] Voice C2 · [T] FLIR · [N] NVG · [C] CRT · [Shift+B] Ballistic · [Shift+W] WTA · [Shift+M] Terrain Mask · [Shift+O] SDA · [Shift+V/I] Intercept · [Shift+K] Sectors · [K] Threat Grid · [R] Doppler · [J] EW/GPS · [B] CoT · [Y] NATO Frames · [M] Tour · [G] Globe · [Shift+T] Tilt · [Shift+N] North',
        9500,
      );
      return;
    }

    // Arrow keys smooth panning
    if (event.key === 'ArrowUp') {
      if (viewer && !viewer.isDestroyed()) {
        event.preventDefault();
        event.stopPropagation();
        const camera = viewer.camera;
        const dist = Math.max(
          100,
          (camera.positionCartographic?.height || 1000) * 0.08,
        );
        camera.moveUp(dist);
        viewer.scene.requestRender();
      }
      return;
    }
    if (event.key === 'ArrowDown') {
      if (viewer && !viewer.isDestroyed()) {
        event.preventDefault();
        event.stopPropagation();
        const camera = viewer.camera;
        const dist = Math.max(
          100,
          (camera.positionCartographic?.height || 1000) * 0.08,
        );
        camera.moveDown(dist);
        viewer.scene.requestRender();
      }
      return;
    }
    if (event.key === 'ArrowLeft') {
      if (viewer && !viewer.isDestroyed()) {
        event.preventDefault();
        event.stopPropagation();
        const camera = viewer.camera;
        const dist = Math.max(
          100,
          (camera.positionCartographic?.height || 1000) * 0.08,
        );
        camera.moveLeft(dist);
        viewer.scene.requestRender();
      }
      return;
    }
    if (event.key === 'ArrowRight') {
      if (viewer && !viewer.isDestroyed()) {
        event.preventDefault();
        event.stopPropagation();
        const camera = viewer.camera;
        const dist = Math.max(
          100,
          (camera.positionCartographic?.height || 1000) * 0.08,
        );
        camera.moveRight(dist);
        viewer.scene.requestRender();
      }
      return;
    }
  });
}

// Bootstrap UI immediately
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSeraphInteractions);
  } else {
    initSeraphInteractions();
  }
}

// Start application runtime and connect 3D scene when ready
if (application) {
  application
    .start()
  .then(() => {
    // Initialize Project Seraph Tactical Threat & Radar Grid
    threatMatrix.init();
    const components = application.getComponents();
    const viewer = components.scene?.viewer;
    const styleManager = components.controls?.styleManager;
    if (typeof window !== 'undefined') {
      window.ProjectSeraph.viewer = viewer;
      window.ProjectSeraph.styleManager = styleManager;
    }
    if (viewer) {
      tacticalThreatGrid.init(viewer);
      dopplerRadar.init(viewer);
      satelliteCones.init(viewer);
      gpsJammingLayer.init(viewer);
      tacticalSitrep.init(viewer);
      cotLayer.init(viewer);
      tacticalVectoring.init(viewer);
      milStdSymbology.init(viewer);
      ballisticPredictor.init(viewer);
      tacticalWta.init(viewer);
      terrainMasking.init(viewer);
      spaceDomainAwareness.init(viewer);

      // Track active operator target selections for instantaneous intercept vectoring
      window.addEventListener('gev:entity-selected', (e) => {
        if (e.detail) {
          window.__gevLastSelectedContact = e.detail;
        }
      });
      window.addEventListener('gev:awareness-subject-selected', (e) => {
        if (e.detail) {
          window.__gevLastSelectedContact = e.detail;
        }
      });
    }

    // Initialize Tactical Recon Tour Engine
    tacticalTour.init();

    // Signal completion and smoothly dismiss loading overlay
    window.setSeraphLoadProgress?.(
      100,
      'SYSTEMS OPERATIONAL',
      'PROJECT SERAPH READY',
    );
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      setTimeout(() => {
        loadingScreen.classList.add('hidden');
        console.info(
          '[Project Seraph] 3D C4ISR core online — loading overlay dismissed.',
        );
      }, 180);
    }
  })
  .catch((error) => {
    console.error('Project Seraph initialization notice:', error);
    const loadingScreen = document.getElementById('loading-screen');
    const loaderStatus = document.querySelector(
      '#loading-screen .loader-status',
    );
    if (loaderStatus) {
      loaderStatus.innerHTML = `Notice: ${describeError(error)}<br><button id="emergency-dismiss-loader" style="margin-top:12px;padding:6px 14px;background:#00f0ff;color:#000;border:none;border-radius:4px;cursor:pointer;font-family:monospace;font-weight:bold;">ENTER STANDALONE C4ISR HUD</button>`;
      document
        .getElementById('emergency-dismiss-loader')
        ?.addEventListener('click', () => {
          loadingScreen?.classList.add('hidden');
        });
    }
    // Safe timeout to avoid stranding operator behind loading overlay
    setTimeout(() => {
      loadingScreen?.classList.add('hidden');
    }, 2500);
  });
}

export { application };
