'use client'

import { useState } from 'react'
import { createUser, deleteUser } from '@/actions/admin-users'

interface User {
  id: string
  email: string
  role: string
  created_at: string
}

export function UserManager({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const fd = new FormData()
    fd.set('email', email)
    fd.set('password', password)

    const result = await createUser(fd)
    setLoading(false)

    if ('error' in result) {
      setError(result.error)
    } else {
      setSuccess(`Usuario ${email} creado correctamente.`)
      setEmail('')
      setPassword('')
      // Refrescar lista
      const newUser: User = {
        id: crypto.randomUUID(),
        email,
        role: 'user',
        created_at: new Date().toISOString(),
      }
      setUsers((prev) => [newUser, ...prev])
    }
  }

  async function handleDelete(userId: string, userEmail: string) {
    if (!confirm(`¿Eliminar el usuario ${userEmail}?`)) return
    setDeletingId(userId)
    const result = await deleteUser(userId)
    setDeletingId(null)
    if ('error' in result) {
      setError(result.error)
    } else {
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    }
  }

  return (
    <div className="space-y-8">
      {/* Crear usuario */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Crear nuevo usuario</h2>
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@empresa.com"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-64"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="mínimo 6 caracteres"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creando...' : '+ Crear usuario'}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {success && <p className="mt-3 text-sm text-green-600">{success}</p>}
      </div>

      {/* Lista de usuarios */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{users.length} usuario{users.length !== 1 ? 's' : ''}</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-6 py-3 text-left">Email</th>
              <th className="px-6 py-3 text-left">Rol</th>
              <th className="px-6 py-3 text-left">Creado</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-medium text-gray-900">{u.email}</td>
                <td className="px-6 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {u.role === 'admin' ? 'Administrador' : 'Usuario'}
                  </span>
                </td>
                <td className="px-6 py-3 text-gray-500">
                  {new Date(u.created_at).toLocaleDateString('es-MX')}
                </td>
                <td className="px-6 py-3 text-right">
                  {u.role !== 'admin' && (
                    <button
                      onClick={() => handleDelete(u.id, u.email)}
                      disabled={deletingId === u.id}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
                    >
                      {deletingId === u.id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
