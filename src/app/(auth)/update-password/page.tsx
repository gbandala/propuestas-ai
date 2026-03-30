import { UpdatePasswordForm } from '@/features/auth/components'

export default function UpdatePasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Cambia tu contraseña</h1>
          <p className="mt-2 text-gray-600">
            Por seguridad, debes establecer una contraseña personal antes de continuar.
          </p>
        </div>

        <UpdatePasswordForm />
      </div>
    </div>
  )
}
