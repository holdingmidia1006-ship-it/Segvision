import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata = { title: "Recuperar conta" };

export default function ForgotPasswordPage() {
  return (
    <main className="auth-simple-page">
      <ForgotPasswordForm />
    </main>
  );
}
