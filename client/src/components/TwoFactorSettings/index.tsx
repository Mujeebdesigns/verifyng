import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { authService } from '../../services/auth.service.js';
import { Button } from '../Button/index.js';
import { ErrorMessage } from '../ErrorMessage/index.js';
import type { TotpSetupResponse } from '../../types/auth.js';
import styles from './TwoFactorSettings.module.css';

type Stage = 'idle' | 'enrolling' | 'showBackup' | 'disabling';

/**
 * Admin two-factor (TOTP) enrollment panel. Handles enable (scan QR -> confirm
 * code -> save backup codes) and disable (confirm with a current code).
 */
export const TwoFactorSettings: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [stage, setStage] = useState<Stage>('idle');
  const [setup, setSetup] = useState<TotpSetupResponse | null>(null);
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enabled = Boolean(user?.totpEnabled);

  const beginEnroll = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await authService.totpSetup();
      setSetup(data);
      setCode('');
      setStage('enrolling');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start 2FA setup.');
    } finally {
      setLoading(false);
    }
  };

  const confirmEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (code.trim().length < 6) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setLoading(true);
    try {
      const res = await authService.totpConfirm(code.trim());
      setBackupCodes(res.backupCodes);
      setStage('showBackup');
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const confirmDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (code.trim().length < 6) {
      setError('Enter a current code to disable 2FA.');
      return;
    }
    setLoading(true);
    try {
      await authService.totpDisable(code.trim());
      setCode('');
      setStage('idle');
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code. 2FA was not disabled.');
    } finally {
      setLoading(false);
    }
  };

  // After enrollment: show one-time backup codes.
  if (stage === 'showBackup') {
    return (
      <div className={styles.wrap}>
        <div className={styles.successMsg}>Two-factor authentication is now enabled.</div>
        <p className={styles.text}>
          Save these one-time backup codes somewhere safe. Each works once if you lose access to
          your authenticator app. They won&apos;t be shown again.
        </p>
        <div className={styles.backupCodes}>
          {backupCodes.map((c) => <span key={c}>{c}</span>)}
        </div>
        <Button variant="primary" onClick={() => { setStage('idle'); setBackupCodes([]); }}>
          I&apos;ve saved my codes
        </Button>
      </div>
    );
  }

  // Enrolling: show QR + secret + code confirmation.
  if (stage === 'enrolling' && setup) {
    return (
      <form className={styles.wrap} onSubmit={confirmEnroll}>
        <p className={styles.text}>
          1. Scan this QR code with an authenticator app (Google Authenticator, Authy, 1Password).
        </p>
        <img src={setup.qrDataUrl} alt="2FA QR code" className={styles.qr} />
        <p className={styles.text}>Can&apos;t scan? Enter this key manually:</p>
        <div className={styles.secretBox}>{setup.secret}</div>

        <ErrorMessage message={error} />

        <div>
          <label className={styles.label} htmlFor="enrollCode">2. Enter the 6-digit code to confirm</label>
          <input
            id="enrollCode"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            className={styles.codeInput}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{ marginTop: '0.375rem' }}
          />
        </div>

        <div className={styles.row}>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Verifying...' : 'Enable 2FA'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => { setStage('idle'); setSetup(null); setError(null); }}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  // Disabling: confirm with a current code.
  if (stage === 'disabling') {
    return (
      <form className={styles.wrap} onSubmit={confirmDisable}>
        <p className={styles.text}>Enter a current code from your authenticator app (or a backup code) to turn off 2FA.</p>
        <ErrorMessage message={error} />
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          className={styles.codeInput}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <div className={styles.row}>
          <Button type="submit" variant="danger" disabled={loading}>
            {loading ? 'Disabling...' : 'Disable 2FA'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => { setStage('idle'); setCode(''); setError(null); }}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  // Idle: show current status + primary action.
  return (
    <div className={styles.wrap}>
      {enabled ? (
        <>
          <span className={`${styles.status} ${styles.statusOn}`}>● Two-factor authentication is ON</span>
          <p className={styles.text}>
            Your admin account is protected by an authenticator app. You&apos;ll be asked for a code at every login.
          </p>
          <Button variant="secondary" onClick={() => { setCode(''); setError(null); setStage('disabling'); }}>
            Disable 2FA
          </Button>
        </>
      ) : (
        <>
          <span className={`${styles.status} ${styles.statusOff}`}>○ Two-factor authentication is OFF</span>
          <div className={styles.warnBox}>
            Strongly recommended for admin accounts. Adds a second step (a rotating code from your
            phone) so a stolen password alone can&apos;t grant access.
          </div>
          <ErrorMessage message={error} />
          <Button variant="primary" onClick={beginEnroll} disabled={loading}>
            {loading ? 'Starting...' : 'Enable 2FA'}
          </Button>
        </>
      )}
    </div>
  );
};

export default TwoFactorSettings;
