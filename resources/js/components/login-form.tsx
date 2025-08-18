import { FormEventHandler, useState } from "react"
import { useForm, Link } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import InputError from "@/components/input-error"
import { LoaderCircle, Eye, EyeOff } from "lucide-react"

interface LoginFormProps extends React.ComponentProps<"div"> {
  canResetPassword?: boolean
  status?: string
}

export function LoginForm({
  className,
  canResetPassword = false,
  status,
  ...props
}: LoginFormProps) {
  const { data, setData, post, processing, errors, reset } = useForm({
    email: '',
    password: '',
    remember: false,
  });

  const [showPassword, setShowPassword] = useState(false);

  const submit: FormEventHandler = (e) => {
    e.preventDefault();
    post(route('login'), {
      onFinish: () => reset('password'),
    });
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0 border-none shadow-2xl">
        <CardContent className="grid p-0 md:grid-cols-2 ">
          <form className="p-6 md:p-8" onSubmit={submit}>
            <div className="flex flex-col gap-6 ">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold dark:text-white">Welcome to Ramen Dreams</h1>
              </div>

              <div className="grid gap-3">

                <Input
                  id="email"
                  type="email"
                  placeholder="Your Email"
                  required
                  autoFocus
                  value={data.email}
                  onChange={(e) => setData('email', e.target.value)}
                />
                <InputError message={errors.email} />
              </div>

              <div className="grid gap-3">
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Your Password"
                    required
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ?
                      <EyeOff className="h-4 w-4" /> :
                      <Eye className="h-4 w-4" />
                    }
                  </button>
                </div>
                <InputError message={errors.password} />
              </div>


              <Button type="submit" className="w-full bg-red-900 hover:bg-red-950 dark:text-white" disabled={processing}>
                {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                Login
              </Button>
              {canResetPassword && (
                    <Link
                      href={route('password.request')}
                      className="text-sm text-center underline-offset-2 hover:underline"
                    >
                      Forgot your password?
                    </Link>
                  )}
              {status && (
                <div className="text-center text-sm font-medium text-green-600">
                  {status}
                </div>
              )}
            </div>
          </form>

          <div className="relative hidden md:block p-0 overflow-hidden">
            <img
              src="/images/ramen-bowl.png"
              alt="Ramen Dreams"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        </CardContent>
      </Card>
      <div className="text-muted-foreground text-center text-xs text-balance">
        Ramen Dreams Management System &copy; {new Date().getFullYear()}
      </div>
    </div>
  )
}
