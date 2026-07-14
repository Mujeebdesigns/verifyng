import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  failed: boolean;
}

/**
 * Isolates the Spline 3D scene so a WebGL/network/runtime failure can never
 * crash the auth form. On error it renders nothing, leaving the calm dark
 * panel behind it visible — the page stays fully usable.
 */
export class SplineBoundary extends React.Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(): void {
    // Swallow — the panel is decorative; degrading to the dark surface is fine.
  }

  render(): React.ReactNode {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

export default SplineBoundary;
