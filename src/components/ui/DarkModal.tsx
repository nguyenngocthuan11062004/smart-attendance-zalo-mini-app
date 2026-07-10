import React from "react";
import { Sheet } from "zmp-ui";

interface DarkModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function DarkModal({ visible, onClose, title, children }: DarkModalProps) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      autoHeight
      mask
      maskClosable
      handler
      swipeToClose
    >
      {/* Nền trắng + chữ đen mặc định cho mọi popup; chừa 1 đoạn đáy + safe area
          để nút dưới cùng không bị thanh Home (iOS) / nav bar (Android) che. */}
      <div
        style={{
          background: "#ffffff",
          color: "#1a1a1a",
          // Padding NGANG 16px để nội dung không dính sát mép trái/phải; đáy 24px
          // cho khoảng thở. Phần safe-area (home indicator) do .zaui-sheet-content
          // xử lý ở app.scss để nền trắng phủ xuống tận đáy, không bị dải đen.
          padding: "4px 16px 24px",
        }}
      >
        {/* Header: nút X đóng ở góc trái + tiêu đề căn giữa. Tự render thay cho
            title mặc định của Sheet để có chỗ đặt nút đóng. */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 34,
            marginBottom: title ? 10 : 4,
          }}
        >
          <button
            onClick={onClose}
            aria-label="Đóng"
            style={{
              position: "absolute",
              left: 0,
              top: "50%",
              transform: "translateY(-50%)",
              width: 34,
              height: 34,
              borderRadius: 999,
              background: "#f0f0f5",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          {title && <span style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>{title}</span>}
        </div>
        {children}
      </div>
    </Sheet>
  );
}
