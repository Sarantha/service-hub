import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  IconTool,
  IconLayoutDashboard,
  IconFileDescription,
  IconCalendar,
  IconUsers,
  IconReceipt,
  IconChartBar,
  IconPackage,
  IconUserCircle,
  IconSettings,
} from '@tabler/icons-react'

export const Sidebar = () => {
  const { user, logout } = useAuth()
  const sections = [
    {
      label: 'Overview',
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: IconLayoutDashboard, allowedRoles: ['Super Admin'] },
      ],
    },
    {
      label: 'Operations',
      items: [
        { label: 'Job Cards', path: '/jobcards', icon: IconFileDescription, allowedRoles: ['Super Admin', 'Service Advisor', 'Technician'] },
        { label: 'Appointments', path: '/appointments', icon: IconCalendar, allowedRoles: ['Super Admin', 'Service Advisor'] },
        { label: 'Customers & Vehicles', path: '/customers', icon: IconUsers, allowedRoles: ['Super Admin', 'Service Advisor', 'Technician'] },
      ],
    },
    {
      label: 'Finance',
      items: [
        { label: 'Billing & Payments', path: '/billing', icon: IconReceipt, allowedRoles: ['Super Admin', 'Service Advisor'] },
        { label: 'Reports', path: '/reports', icon: IconChartBar, allowedRoles: ['Super Admin', 'Service Advisor'] },
      ],
    },
    {
      label: 'Stock',
      items: [
        { label: 'Inventory', path: '/inventory', icon: IconPackage, allowedRoles: ['Super Admin', 'Service Advisor'] },
      ],
    },
    {
      label: 'Customer Portal',
      items: [
        { label: 'Vehicle History', path: '/vehicle-history', icon: IconUserCircle, allowedRoles: ['Super Admin', 'Service Advisor'] },
      ],
    },
  ]

  const filteredSections = sections
    .map(section => ({
      ...section,
      items: section.items.filter(item => item.allowedRoles.includes(user?.role || 'Technician'))
    }))
    .filter(section => section.items.length > 0)

  return (
    <div className="w-[204px] bg-navy flex flex-col shrink-0 h-screen select-none">
      {/* Logo Section */}
      <div className="py-4 px-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-1.5 text-white font-semibold text-[15px]">
          <IconTool size={16} className="text-blueGlow" />
          <span>ServiceHub</span>
        </div>
        <div className="text-[10px] text-white/40 mt-0.5 font-medium">
          Station Management System
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-2">
        {filteredSections.map((section, idx) => (
          <div key={idx} className="py-2 border-b border-white/7 last:border-b-0">
            <div className="text-[9px] font-bold text-white/30 tracking-widest uppercase px-4 pb-1 pt-1">
              {section.label}
            </div>
            <nav className="flex flex-col">
              {section.items.map((item, itemIdx) => (
                <NavLink
                  key={itemIdx}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 py-2 px-4 cursor-pointer text-[12px] transition-all hover:bg-white/5 border-r-2 ${
                      isActive
                        ? 'bg-brandBlue/55 text-white border-r-[#4A9EE8]'
                        : 'text-white/50 border-r-transparent hover:text-white/80'
                    }`
                  }
                >
                  <item.icon size={15} className="shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>

      {/* Sidebar Footer */}
      <div className="shrink-0 border-t border-white/10 py-2">
        {user?.role === 'Super Admin' && (
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-2 py-2 px-4 cursor-pointer text-[12px] transition-all hover:bg-white/5 border-r-2 ${
                isActive
                  ? 'bg-brandBlue/55 text-white border-r-[#4A9EE8]'
                  : 'text-white/50 border-r-transparent hover:text-white/80'
              }`
            }
          >
            <IconSettings size={15} className="shrink-0" />
            <span>Settings</span>
          </NavLink>
        )}

        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-4 py-2 mt-1 cursor-pointer hover:bg-white/5 transition-colors border-r-2 border-transparent text-left bg-transparent border-none outline-none"
          title="Click to log out"
          id="sidebar-logout-btn"
        >
          <div className="w-7 h-7 rounded-full bg-[#1A4A7A] flex items-center justify-center text-[10px] font-bold text-white shrink-0 font-sans">
            {user?.name ? user.name.split(' ').map(n => n[0]).join('') : 'RA'}
          </div>
          <div className="min-w-0">
            <div className="text-[12px] text-white/80 font-medium truncate font-sans">
              {user?.name || 'Ravi Amarasinghe'}
            </div>
            <div className="text-[9px] text-white/30 truncate mt-0.5 font-sans">
              {user?.role || 'Super Admin'} (Log Out)
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}

export default Sidebar
