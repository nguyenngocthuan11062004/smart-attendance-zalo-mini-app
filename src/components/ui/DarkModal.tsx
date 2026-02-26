import React, { useEffect, useState, useCallback } from "react";

interface DarkModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function DarkModal({ visible, onClose, title, children }: DarkModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      setIsClosing(false);
      document.body.style.overflow = "hidden";
    } else if (shouldRender) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
        document.body.style.overflow = "";
      }, 250);
      return () => clearTimeout(timer);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [visible]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 250);
  }, [onClose]);

  if (!shouldRender) return null;

  return (
    <div
      className={`modal-overlay-dark${isClosing ? " modal-closing" : ""}`}
      onClick={handleClose}
    >
      <div className="modal-content-dark" onClick={(e) => e.stopPropagation()}>
        {/* Handle bar */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: "rgba(0,0,0,0.15)",
            }}
          />
        </div>

        {title && (
          <h3
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#1a1a1a",
              marginBottom: 20,
              textAlign: "center",
            }}
          >
            {title}
          </h3>
        )}

        {children}
      </div>
    </div>
  );
}
