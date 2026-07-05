import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('App crashed:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#0d1117', color: '#f0f6fc', fontFamily: 'sans-serif' }}>
          <div style={{ maxWidth: 480 }}>
            <h1 style={{ fontSize: 18, marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ color: '#8b949e', fontSize: 13, marginBottom: 12 }}>
              The app hit an error while loading instead of showing a blank page. Details below — open the browser console (F12) for the full stack trace.
            </p>
            <pre style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: 12, fontSize: 12, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
              {String(this.state.error?.message || this.state.error)}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
