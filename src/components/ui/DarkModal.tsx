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
      title={title}
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
        {children}
      </div>
    </Sheet>
  );
}
