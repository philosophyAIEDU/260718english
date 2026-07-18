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
          <span style={{ fontSize: '2.6rem' }}>📖</span>
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
