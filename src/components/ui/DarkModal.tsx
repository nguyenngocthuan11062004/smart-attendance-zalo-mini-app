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
      {children}
    </Sheet>
  );
}
