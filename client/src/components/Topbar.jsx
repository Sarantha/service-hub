import React from 'react'
import { IconSearch, IconBell, IconHelpCircle, IconChevronDown } from '@tabler/icons-react'
import { useAuth } from '../context/AuthContext'

const ALL_BRANCHES_VALUE = 'all'

export const Topbar = () => {
  const { hasRole, activeBranchId, setActiveBranch, branches } = useAuth()
  const isSuperAdmin = hasRole('Super Admin')
  const activeBranches = branches.filter((b) => b.isActive)

  return (
    <header className="h-16 bg-white border-b border-slate-100 shadow-sm flex items-center justify-between px-6 z-10 shrink-0">
      {/* Left section: Global Search */}
      <div className="flex items-center flex-1 max-w-md">
        <div className="relative w-full">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
            <IconSearch size={16} />
          </span>
          <input
            type="search"
            placeholder="Search jobs, customers, vehicles, or SKUs..."
            className="w-full h-9 pl-9 pr-4 bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg placeholder-slate-400 focus:outline-none focus:border-brandBlue focus:bg-white transition-all duration-200"
            id="global-search"
          />
        </div>
      </div>

      {/* Right section: Controls & Branch Selector */}
      <div className="flex items-center gap-4">
        {/* Branch Selector — Super Admin only. Advisor/Technician belong to
            exactly one branch, so a switcher would be misleading for them. */}
        {isSuperAdmin && (
          <div className="relative">
            <select
              value={activeBranchId || ALL_BRANCHES_VALUE}
              onChange={(e) => setActiveBranch(e.target.value === ALL_BRANCHES_VALUE ? null : e.target.value)}
              className="appearance-none h-9 pl-3 pr-8 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:border-slate-300 focus:outline-none focus:border-brandBlue focus:ring-1 focus:ring-brandPale transition-all duration-200 cursor-pointer"
              id="branch-selector"
            >
              <option value={ALL_BRANCHES_VALUE}>All Branches</option>
              {activeBranches.map((branch) => (
                <option key={branch._id} value={branch._id}>
                  {branch.branchName}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 pointer-events-none">
              <IconChevronDown size={14} />
            </div>
          </div>
        )}

        {/* Support/Help Button */}
        <button
          className="h-9 w-9 flex items-center justify-center text-slate-500 hover:text-brandBlue hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-slate-100 bg-white"
          title="Help & Documentation"
          type="button"
          id="help-button"
        >
          <IconHelpCircle size={18} />
        </button>

        {/* Notifications Icon with Badge */}
        <button
          className="relative h-9 w-9 flex items-center justify-center text-slate-500 hover:text-brandBlue hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-slate-100 bg-white"
          title="View notifications"
          type="button"
          id="notifications-button"
        >
          <IconBell size={18} />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>
      </div>
    </header>
  )
}

export default Topbar
