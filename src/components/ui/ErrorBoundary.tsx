import React, { Component, type ReactNode } from "react";
import { Page, Text, Button, Header } from "zmp-ui";

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
        <Page className="page">
          <Header title="Lỗi" showBackIcon={false} />
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
            <Text bold size="large" className="text-gray-700 mb-2">
              Đã xảy ra lỗi
            </Text>
            <Text size="small" className="text-gray-400 mb-6 px-8">
              Ứng dụng gặp sự cố. Vui lòng thử lại.
            </Text>
            <Button variant="primary" onClick={this.handleReset}>
              Thử lại
            </Button>
          </div>
        </Page>
      );
    }

    return this.props.children;
  }
}
