import React, { Component, type ReactNode } from "react";
import { Page, Header } from "zmp-ui";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Page className="page" style={{ background: "#f2f2f7" }}>
          <Header title="Lỗi" showBackIcon={false} />
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                background: "rgba(239,68,68,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
            <p style={{ color: "#1a1a1a", fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
              Đã xảy ra lỗi
            </p>
            <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 24, padding: "0 32px" }}>
              Ứng dụng gặp sự cố. Vui lòng thử lại.
            </p>
            <button
              className="btn-primary-dark"
              onClick={this.handleReset}
              style={{ padding: "10px 32px", fontSize: 14 }}
            >
              Thử lại
            </button>
          </div>
        </Page>
      );
    }

    return this.props.children;
  }
}
