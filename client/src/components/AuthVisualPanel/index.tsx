import React, { Suspense, lazy, useEffect, useState } from 'react';
import { SplineBoundary } from './SplineBoundary.js';
import styles from './AuthVisualPanel.module.css';

// Lazy-loaded so the heavy WebGL runtime never blocks the auth form's first
// paint, and is only fetched when actually rendered (desktop only — see below).
const Spline = lazy(() => import('@splinetool/react-spline'));

// Bump SCENE_VERSION whenever the Spline scene is re-exported with new edits.
// The scene URL itself never changes, and the CDN doesn't set a long-lived
// cache-control header, so browsers may otherwise serve a locally-cached
// copy for a while after an update. Changing this query param makes it a
// distinct URL each time, guaranteeing a fresh fetch — no hard-refresh needed.
const SCENE_VERSION = 3;
const SCENE_URL = `https://prod.spline.design/lvtWXuAHUQwGP1oB/scene.splinecode?v=${SCENE_VERSION}`;

// NOTE: background colour is intentionally NOT forced from code — it comes
// entirely from the Spline scene itself, so edits made in the Spline editor
// take effect immediately on next reload. The panel's own CSS background
// (see .panel) is just a neutral pre-load / no-WebGL fallback, not a pin.

/**
 * Quiet decorative right-hand panel for the vendor auth pages.
 * Hosts a Spline 3D scene, full-bleed, on a calm dark surface. Deliberately
 * understated so it supports the auth form rather than competing with it.
 *
 * The scene mounts only at >= 48rem (the panel is hidden below that), so the
 * Spline runtime is never downloaded on mobile. It also waits for the browser
 * to go idle before mounting, so the heavy WebGL init never competes with the
 * user's first interactions (form clicks) — keeping input latency (INP) low.
 */
export const AuthVisualPanel: React.FC = () => {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 48rem)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    // Defer the Spline mount until the main thread is idle so its WebGL init
    // doesn't block early clicks. requestIdleCallback where available, with a
    // timeout fallback for browsers that lack it (older Safari).
    const ric = window.requestIdleCallback;
    if (typeof ric === 'function') {
      const handle = ric(() => setIsIdle(true), { timeout: 2000 });
      return () => window.cancelIdleCallback?.(handle);
    }
    const timer = window.setTimeout(() => setIsIdle(true), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className={styles.panel} aria-hidden="true">
      {isDesktop && isIdle && (
        <SplineBoundary>
          <Suspense fallback={null}>
            <div className={styles.scene}>
              <Spline scene={SCENE_URL} />
            </div>
          </Suspense>
        </SplineBoundary>
      )}
    </div>
  );
};

export default AuthVisualPanel;
