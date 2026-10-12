import { Component, type ReactNode } from 'react';

interface Props {
  host: HTMLElement;
  children?: ReactNode;
}

/** Let the host replace a failed asynchronous React render with its retry UI. */
export class EngineErrorBoundary extends Component<Props, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(error: Error): void {
    this.props.host.dataset.error = 'true';
    console.error('The example engine could not render', error);
  }

  override render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}
