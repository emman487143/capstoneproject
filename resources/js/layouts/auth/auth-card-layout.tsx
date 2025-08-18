import AppLogoIcon from '@/components/app-logo-icon';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

export default function AuthCardLayout({
    children,
    title,
    description,
}: PropsWithChildren<{
    name?: string;
    title?: string;
    description?: string;
}>) {
    return (
        <div
      className="bg-cover bg-center min-h-screen flex items-center justify-center p-6"
      style={{ backgroundImage: `url('/images/ramen-bg.png')` }}
    >

            <div className="flex w-full max-w-md flex-col gap-6">


                <div className="flex flex-col gap-6">
                    <Card className="rounded-xl">
                        <CardHeader className="px-10 pt-8 pb-0 text-center">
                            <CardTitle className="text-xl">{title}</CardTitle>
                            <CardDescription>{description}</CardDescription>
                        </CardHeader>
                        <CardContent className="px-10 py-8 pt-2">{children}</CardContent>
                    </Card>
                </div>
            </div>
        </div>

    );
}
