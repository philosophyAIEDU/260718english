import React from 'react';

/**
 * Top-level error boundary: whatever throws inside the tree, the user gets
 * a friendly recovery screen instead of a blank page. Saved data is safe in
 * IndexedDB, so a reload always recovers.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('ReadMate crashed:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="crash-screen">
          <div className="empty-icon-ring">
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3.8 2.8 19.5a1.4 1.4 0 0 0 1.2 2.1h16a1.4 1.4 0 0 0 1.2-2.1L12 3.8Z" />
              <path d="M12 9.5v4.5" />
              <circle cx="12" cy="17.5" r="0.9" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <h2>Something went wrong</h2>
          <p className="muted">
            Sorry — ReadMate hit an unexpected error. Your saved vocabulary and
            review progress are safe on this device.
          </p>
          <p className="muted small">{String(this.state.error?.message || this.state.error)}</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              this.setState({ error: null });
              window.location.reload();
            }}
          >
            Reload the app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
