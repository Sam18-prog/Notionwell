'use client';

import { saveStudyTimeLog, getTodayDateString } from '@/lib/app';
import { v4 as uuidv4 } from 'uuid';

export interface GlobalTimerState {
  seconds: number;
  isRunning: boolean;
}

let timerSeconds = 0;
let timerRunning = false;
let intervalId: NodeJS.Timeout | null = null;
let sessionStartTime = '';

// Idle Detection State (15 mins = 900,000 ms)
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
let lastInteractionTime = Date.now();
let isIdlePaused = false;
let isInitialized = false;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function notifyTimerUpdate() {
  if (!isBrowser()) return;
  window.dispatchEvent(
    new CustomEvent('study-timer-update', {
      detail: { seconds: timerSeconds, isRunning: timerRunning },
    })
  );
}

export function getGlobalTimerState(): GlobalTimerState {
  return { seconds: timerSeconds, isRunning: timerRunning };
}

function handleUserActivity() {
  lastInteractionTime = Date.now();
  if (isIdlePaused) {
    isIdlePaused = false;
    startGlobalTimer();
  }
}

function setupActivityListeners() {
  if (!isBrowser() || isInitialized) return;
  isInitialized = true;

  const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
  events.forEach((evt) => {
    window.addEventListener(evt, handleUserActivity, { passive: true });
  });

  // Best effort flush on window unload
  window.addEventListener('beforeunload', () => {
    if (timerSeconds > 0) {
      flushCurrentSegment();
    }
  });

}

function flushCurrentSegment() {
  if (timerSeconds > 0) {
    saveStudyTimeLog({
      id: uuidv4(),
      date: getTodayDateString(),
      durationSeconds: timerSeconds,
      startedAt: sessionStartTime || new Date().toISOString(),
    });
  }
  timerSeconds = 0;
  sessionStartTime = '';
}

export function startGlobalTimer(): void {
  if (timerRunning) return;
  timerRunning = true;
  isIdlePaused = false;
  if (!sessionStartTime) {
    sessionStartTime = new Date().toISOString();
  }

  if (isBrowser()) {
    if (!intervalId) {
      intervalId = setInterval(() => {
        // Idle check: 15 minutes of inactivity
        if (Date.now() - lastInteractionTime >= IDLE_TIMEOUT_MS) {
          isIdlePaused = true;
          pauseGlobalTimer();
          return;
        }

        timerSeconds += 1;
        notifyTimerUpdate();
      }, 1000);
    }
  }
  notifyTimerUpdate();
}

export function pauseGlobalTimer(): void {
  if (!timerRunning) return;
  timerRunning = false;
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  notifyTimerUpdate();
}

export function resetAndSaveGlobalTimer(): void {
  pauseGlobalTimer();
  flushCurrentSegment();
  notifyTimerUpdate();
}

// Auto-run initialization in browser environment
if (isBrowser()) {
  setupActivityListeners();
}
