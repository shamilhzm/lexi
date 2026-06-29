// Keeps one view's runtime error from white-screening the whole app. Shows the
// message (handy for reporting) and a reset button. Resets when `resetKey` changes
// (i.e. when the user navigates to a different view).
import { Component, type ReactNode } from 'react';

interface Props { resetKey: string; children: ReactNode; }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidUpdate(prev: Props) { if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null }); }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid place-items-center min-h-[440px]">
        <div className="bg-panel border border-line rounded-2xl px-8 py-10 max-w-md text-center">
          <div className="text-3xl mb-3">⚠️</div>
          <h2 className="text-lg font-bold mb-1">This view hit an error</h2>
          <p className="text-dim text-[13px] mb-4">The rest of Lexi is fine — switch tabs and come back.</p>
          <pre className="text-left text-[11px] text-red bg-panel2 border border-line rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap">{this.state.error.message}</pre>
        </div>
      </div>
    );
  }
}
