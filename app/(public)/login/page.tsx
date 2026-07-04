import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-warm-bg p-6 md:p-10">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </main>
  );
}
