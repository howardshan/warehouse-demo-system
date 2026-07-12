import { Suspense } from "react";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">加载中…</div>}>
      <LoginForm />
    </Suspense>
  );
}
