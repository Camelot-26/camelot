import { Suspense } from "react";
import { RequiredPasswordChangeForm } from "@/components/forms/required-password-change-form";
import { requirePasswordChange } from "@/lib/authorization";

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<p role="status">Checking your account…</p>}>
      <PasswordChangeContent />
    </Suspense>
  );
}

async function PasswordChangeContent() {
  await requirePasswordChange();
  return <RequiredPasswordChangeForm />;
}
