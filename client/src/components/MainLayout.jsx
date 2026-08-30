import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export const MainLayout = () => {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 font-sans">
      {/* Sidebar - left */}
      <Sidebar />

      {/* Main content wrapper - right */}
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        {/* Topbar */}
        <Topbar />

        {/* Scrollable page body */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default MainLayout
