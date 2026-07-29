import { createFileRoute } from '@tanstack/react-router'
import { AdminArea } from '#/components/admin/AdminDashboard'

/**
 * Internal moderation dashboard for the feature board. Deliberately
 * minimal chrome (no Nav/Footer), English-only, noindex everywhere:
 * meta robots here, X-Robots-Tag via vercel.json, Disallow in
 * robots.txt. Data comes exclusively from /api/admin/* behind the
 * signed session cookie.
 */
export const Route = createFileRoute('/admin')({
  head: () => ({
    meta: [
      { title: 'Admin — Battery Sensei' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: AdminPage,
})

function AdminPage() {
  return (
    <main className="min-h-screen bg-[var(--washi)] px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <AdminArea />
      </div>
    </main>
  )
}
