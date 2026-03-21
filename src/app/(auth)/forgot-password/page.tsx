import Link from 'next/link'
import { ForgotPasswordForm } from '@/features/auth/components'

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Restablecer contraseña</h1>
          <p className="mt-2 text-gray-600">Ingresa tu email para recibir un enlace</p>
        </div>

        <ForgotPasswordForm />

        <p className="text-center text-sm text-gray-600">
          <Link href="/login" className="text-blue-600 hover:underline">
            Volver al login
          </Link>
        </p>
      </div>
    </div>
  )
}
