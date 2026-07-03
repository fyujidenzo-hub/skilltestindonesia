import React from "react";

type ErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

export default class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "The app failed to load.",
    };
  }

  componentDidCatch(error: unknown) {
    console.error("App crashed:", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900">
        <div className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-panel">
          <h1 className="text-xl font-black">Unable to load app</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Please refresh the page. If you opened this inside WhatsApp or another in-app browser, tap the menu and open it in Safari/Chrome.
          </p>
          {this.state.message ? (
            <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-xs text-rose-700">
              {this.state.message}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 w-full rounded-2xl bg-emerald-600 px-4 py-3 font-black text-white"
          >
            Refresh
          </button>
        </div>
      </main>
    );
  }
}
