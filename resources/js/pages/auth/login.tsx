import { Head } from '@inertiajs/react';
import { LoginForm } from '@/components/login-form';
import AuthFullBgLayout from '@/layouts/auth/auth-full-bg-layout';

interface LoginProps {
  status?: string;
}

export default function Login({ status }: LoginProps) {
  return (
    <AuthFullBgLayout>
      <Head title="Log in" />
      <div className="w-full max-w-sm md:max-w-2xl">
        <LoginForm
          status={status}
          canResetPassword={true}
        />
      </div>
    </AuthFullBgLayout>
  );
}
