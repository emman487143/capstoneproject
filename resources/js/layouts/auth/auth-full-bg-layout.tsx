import { ReactNode } from 'react';
import { Head } from '@inertiajs/react';

interface AuthFullBgLayoutProps {
  title?: string;
  children: ReactNode;
  bgImageUrl?: string;
}

export default function AuthFullBgLayout({
  title,
  children,
  bgImageUrl = '/images/ramen-bg.png',
}: AuthFullBgLayoutProps) {
  return (
    <div
      className="bg-cover bg-center min-h-screen flex items-center justify-center p-6"
      style={{ backgroundImage: `url('${bgImageUrl}')` }}
    >
      {title && <Head title={title} />}
      {children}
    </div>
  );
}
