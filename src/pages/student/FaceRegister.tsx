import React, { useCallback } from "react";
import { Page, Header } from "zmp-ui";
import { useNavigate } from "react-router-dom";
import { useAtom } from "jotai";
import { currentUserAtom } from "@/store/auth";
import { markFaceRegistered } from "@/services/auth.service";
import FaceRegistration from "@/components/face/FaceRegistration";

export default function FaceRegister() {
  const navigate = useNavigate();
  const [user, setUser] = useAtom(currentUserAtom);

  const handleComplete = useCallback(async () => {
    if (user) {
      await markFaceRegistered(user.id);
      setUser({ ...user, faceRegistered: true, updatedAt: Date.now() });
    }
    navigate("/home", { replace: true });
  }, [user, setUser, navigate]);

  return (
    <Page className="page">
      <Header title="Dang ky khuon mat" />
      <FaceRegistration
        onComplete={handleComplete}
        onSkip={() => navigate("/home", { replace: true })}
      />
    </Page>
  );
}
