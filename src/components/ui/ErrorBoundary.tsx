import React, { Component, type ReactNode } from "react";
import { Page, Header, Button, Icon } from "zmp-ui";

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
              <Icon icon="zi-warning" size={28} style={{ color: "#ef4444" }} />
            </div>
            <p style={{ color: "#1a1a1a", fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
              Đã xảy ra lỗi
            </p>
            <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 24, padding: "0 32px" }}>
              Ứng dụng gặp sự cố. Vui lòng thử lại.
            </p>
            <Button type="danger" size="medium" onClick={this.handleReset}>
              Thử lại
            </Button>
          </div>
        </Page>
      );
    }

    return this.props.children;
  }
}
