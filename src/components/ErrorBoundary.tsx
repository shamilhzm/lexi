// Keeps one view's runtime error from white-screening the whole app. Shows the
// message (handy for reporting) and a reset button. Resets when `resetKey` changes
// (i.e. when the user navigates to a different view).
import { Component, type ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';

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
        <div className="bg-panel border border-line rounded-md px-8 py-10 max-w-md text-center">
          <TriangleAlert size={28} className="text-amber mx-auto mb-3" />
          <h2 className="text-lg font-bold mb-1">This view hit an error</h2>
          <p className="text-dim text-xs mb-4">The rest of Lexi is fine — switch tabs and come back.</p>
          <pre className="text-left text-2xs text-red bg-panel2 border border-line rounded-md p-3 overflow-auto max-h-40 whitespace-pre-wrap">{this.state.error.message}</pre>
        </div>
      </div>
    );
  }
}
