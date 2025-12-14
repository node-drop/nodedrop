import React from 'react'
import { Outlet } from 'react-router'
import { BaseLayout } from './BaseLayout'

export const Layout: React.FC = () => {
  return (
    <BaseLayout>
      <Outlet />
    </BaseLayout>
  )
}
