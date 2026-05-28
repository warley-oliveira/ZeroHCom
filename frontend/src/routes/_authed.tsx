import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"

import { PrivateLayout } from "@/components/layouts/PrivateLayout"
import { getToken } from "@/lib/auth-storage"

export const Route = createFileRoute("/_authed")({
  beforeLoad: ({ location }) => {
    if (!getToken()) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      })
    }
  },
  component: AuthedLayout,
})

function AuthedLayout() {
  return (
    <PrivateLayout>
      <Outlet />
    </PrivateLayout>
  )
}
