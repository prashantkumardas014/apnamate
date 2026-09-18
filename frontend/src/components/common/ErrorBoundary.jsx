// frontend/src/components/common/ErrorBoundary.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

class ErrorBoundaryInner extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("❌ ErrorBoundary caught:", error, info);
    this.setState({ info });
  }

  handleClearAndLogout = () => {
    localStorage.clear();
    // ✅ Use React Router navigate passed via props (works in WebView / HashRouter)
    if (this.props.navigate) {
      this.props.navigate("/login", { replace: true });
    } else {
      // Fallback — should not happen, but safe
      localStorage.clear(); window.location.replace("#/login"); window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            padding: "40px 20px",
            background: "#fef2f2",
            fontFamily: "monospace",
            color: "#7f1d1d",
          }}
        >
          <div
            style={{
              maxWidth: 900,
              margin: "0 auto",
              background: "white",
              padding: 28,
              borderRadius: 12,
              border: "2px solid #dc2626",
              boxShadow: "0 10px 30px rgba(220,38,38,0.15)",
            }}
          >
            <h1 style={{ margin: "0 0 12px", fontSize: 22 }}>
              🚨 Something crashed
            </h1>
            <p style={{ margin: "0 0 20px", color: "#991b1b" }}>
              The page below threw an error. Full details:
            </p>

            <h3 style={{ marginTop: 20 }}>Message</h3>
            <pre
              style={{
                background: "#fef2f2",
                padding: 12,
                borderRadius: 8,
                overflow: "auto",
                fontSize: 13,
              }}
            >
              {String(this.state.error?.message || this.state.error)}
            </pre>

            <h3 style={{ marginTop: 20 }}>Stack trace</h3>
            <pre
              style={{
                background: "#fef2f2",
                padding: 12,
                borderRadius: 8,
                overflow: "auto",
                fontSize: 12,
                maxHeight: 300,
              }}
            >
              {String(this.state.error?.stack || "")}
            </pre>

            {this.state.info?.componentStack && (
              <>
                <h3 style={{ marginTop: 20 }}>Component stack</h3>
                <pre
                  style={{
                    background: "#fef2f2",
                    padding: 12,
                    borderRadius: 8,
                    overflow: "auto",
                    fontSize: 12,
                    maxHeight: 260,
                  }}
                >
                  {this.state.info.componentStack}
                </pre>
              </>
            )}

            <div style={{ marginTop: 22, display: "flex", gap: 10 }}>
              <button
                onClick={this.handleClearAndLogout}
                style={{
                  padding: "10px 18px",
                  background: "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                🚪 Clear + Logout
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: "10px 18px",
                  background: "white",
                  color: "#dc2626",
                  border: "2px solid #dc2626",
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                🔄 Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ✅ Wrapper gives the class component access to `navigate`
function ErrorBoundary(props) {
  const navigate = useNavigate();
  return <ErrorBoundaryInner {...props} navigate={navigate} />;
}

export default ErrorBoundary;