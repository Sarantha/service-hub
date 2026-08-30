import React, { useState, useEffect } from 'react'
import {
  IconDownload, IconPlus, IconTruck, IconTrash,
  IconPackage, IconCoin, IconAlertTriangle, IconClock, IconCategory,
} from '@tabler/icons-react'
import DataTable from '../components/DataTable'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import TextInput from '../components/TextInput'
import SelectBox from '../components/SelectBox'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { getInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem, reorderItem, createPurchaseOrder } from '../services/inventoryService'
import { getCategories, createCategory, deleteCategory } from '../services/inventoryCategoryService'

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_ITEMS = [
  { id: 1, sku: 'OIL-001', name: 'Engine Oil 5W-30 (1L)',    category: 'Oils & Fluids', buyingPrice: 520,  unitPrice: 800,   inStock: 3,  reorderAt: 10, expires: null       },
  { id: 2, sku: 'AF-T22',  name: 'Air Filter — Toyota',       category: 'Filters',       buyingPrice: 780,  unitPrice: 1200,  inStock: 1,  reorderAt: 5,  expires: null       },
  { id: 3, sku: 'BP-F19',  name: 'Brake Pads (Front)',         category: 'Brakes',        buyingPrice: 2200, unitPrice: 3400,  inStock: 5,  reorderAt: 8,  expires: null       },
  { id: 4, sku: 'SP-001',  name: 'Spark Plug — NGK',           category: 'Electrical',    buyingPrice: 290,  unitPrice: 450,   inStock: 48, reorderAt: 20, expires: null       },
  { id: 5, sku: 'CL-002',  name: 'Coolant 1L',                 category: 'Oils & Fluids', buyingPrice: 610,  unitPrice: 950,   inStock: 2,  reorderAt: 8,  expires: '2026-07-15' },
  { id: 6, sku: 'WP-H12',  name: 'Wiper Blade — Honda',        category: 'Body Parts',    buyingPrice: 440,  unitPrice: 680,   inStock: 22, reorderAt: 10, expires: null       },
  { id: 7, sku: 'TY-R165', name: 'Tyre 165/65R14',             category: 'Tyres',         buyingPrice: 8200, unitPrice: 12500, inStock: 8,  reorderAt: 4,  expires: null       },
  { id: 8, sku: 'BR-FL01', name: 'Brake Fluid DOT 4 (500ml)',  category: 'Brakes',        buyingPrice: 460,  unitPrice: 720,   inStock: 6,  reorderAt: 10, expires: '2026-08-01' },
].map((i) => ({ ...i, profitPerUnit: i.unitPrice - i.buyingPrice, profitMarginPercent: Math.round(((i.unitPrice - i.buyingPrice) / i.unitPrice) * 100) }))

const MOCK_CATEGORIES = ['Oils & Fluids', 'Filters', 'Brakes', 'Electrical', 'Body Parts', 'Body Components', 'Tyres']
const STOCK_OPTIONS    = ['All Stock Levels', 'Low Stock Only', 'In Stock']

const stockStatus = (item) => {
  if (item.inStock === 0)            return 'Out of Stock'
  if (item.inStock <= item.reorderAt) return 'Low'
  return 'OK'
}

const badgeVariant = (s) => {
  if (s === 'OK')           return 'success'
  if (s === 'Low')          return 'warning'
  if (s === 'Out of Stock') return 'danger'
  return 'default'
}

// ── KPI cards ─────────────────────────────────────────────────────────────────
const KPI = ({ label, value, sub, icon: Icon, iconColor, valueColor }) => (
  <div className="bg-white border border-slate-100 rounded-lg px-4 py-3 flex items-start justify-between gap-2">
    <div>
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
      <div className={`text-[22px] font-bold mt-0.5 ${valueColor || 'text-slate-800'}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor}`}>
      <Icon size={17} />
    </div>
  </div>
)

// ── SKU Creation Modal ────────────────────────────────────────────────────────
const AddItemModal = ({ isOpen, onClose, onSave, categories, onManageCategories, canManageCategories }) => {
  const [form, setForm] = useState({ sku: '', name: '', category: '', buyingPrice: '', unitPrice: '', inStock: '', reorderAt: '' })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  // Default the category select to the first real option once categories
  // have loaded (they arrive asynchronously, after the modal can first open).
  useEffect(() => {
    if (isOpen && !form.category && categories.length > 0) {
      setForm((f) => ({ ...f, category: categories[0] }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, categories])

  const handleSave = () => {
    if (!form.sku || !form.name || !form.unitPrice || !form.category) return
    onSave({
      ...form, id: Date.now(),
      buyingPrice: form.buyingPrice === '' ? null : Number(form.buyingPrice),
      unitPrice: Number(form.unitPrice), inStock: Number(form.inStock), reorderAt: Number(form.reorderAt), expires: null
    })
    onClose()
    setForm({ sku: '', name: '', category: '', buyingPrice: '', unitPrice: '', inStock: '', reorderAt: '' })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Inventory Item"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} id="ai-cancel-btn">Cancel</button>
          <button className="btn-primary" onClick={handleSave} id="ai-save-btn"><IconPlus size={14} /> Save Item</button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextInput label="SKU Code"   id="ai-sku"   placeholder="e.g. OIL-001"          value={form.sku}        onChange={set('sku')}        required />
        <TextInput label="Item Name"  id="ai-name"  placeholder="e.g. Engine Oil 5W-30" value={form.name}       onChange={set('name')}       required />
        <div>
          <SelectBox label="Category" id="ai-cat" value={form.category} onChange={set('category')} options={categories} />
          {canManageCategories && (
            <button
              type="button"
              id="ai-manage-categories-btn"
              className="mt-1.5 text-[11px] text-brandBlue hover:text-brandLight font-medium flex items-center gap-1 transition-colors"
              onClick={onManageCategories}
            >
              <IconCategory size={11} /> Manage categories
            </button>
          )}
        </div>
        <div />
        <TextInput label="Buying Price (LKR)" id="ai-buying-price" type="number" min="0" placeholder="e.g. 520" value={form.buyingPrice} onChange={set('buyingPrice')} />
        <TextInput label="Selling Price (LKR)" id="ai-price" type="number" min="0" placeholder="e.g. 800" value={form.unitPrice} onChange={set('unitPrice')} required />
        <TextInput label="Initial Stock"    id="ai-stock" type="number" min="0" placeholder="e.g. 20"  value={form.inStock}   onChange={set('inStock')}  />
        <TextInput label="Reorder At"       id="ai-reorder" type="number" min="0" placeholder="e.g. 5" value={form.reorderAt} onChange={set('reorderAt')} />
      </div>
    </Modal>
  )
}

// ── Purchase Order Modal ──────────────────────────────────────────────────────
const POModal = ({ isOpen, onClose, onSend }) => {
  const [supplier, setSupplier] = useState('')
  const [notes,    setNotes]    = useState('')
  const [lines,    setLines]    = useState([{ sku: 'OIL-001', qty: 20 }, { sku: 'AF-T22', qty: 10 }])

  const addLine = () => setLines((l) => [...l, { sku: '', qty: 1 }])
  const setLine = (i, k, v) => setLines((l) => l.map((x, idx) => idx === i ? { ...x, [k]: v } : x))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Purchase Order"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}  id="po-cancel-btn">Cancel</button>
          <button className="btn-primary"   onClick={() => { onSend(supplier, notes, lines); onClose() }} id="po-send-btn">
            <IconTruck size={14} /> Send PO
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <TextInput label="Supplier Name" id="po-supplier" placeholder="e.g. AutoParts Lanka Ltd." value={supplier} onChange={(e) => setSupplier(e.target.value)} />
        <div>
          <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">Line Items</div>
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="flex-1 h-[42px] px-3 bg-white border border-slate-200 text-slate-800 text-sm rounded-lg focus:outline-none focus:border-brandBlue"
                  placeholder="SKU"
                  value={l.sku}
                  onChange={(e) => setLine(i, 'sku', e.target.value)}
                />
                <input
                  type="number"
                  min="1"
                  className="w-20 h-[42px] px-3 bg-white border border-slate-200 text-slate-800 text-sm rounded-lg focus:outline-none focus:border-brandBlue"
                  placeholder="Qty"
                  value={l.qty}
                  onChange={(e) => setLine(i, 'qty', e.target.value)}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addLine}
            className="mt-2 text-[12px] text-brandBlue hover:text-brandLight font-medium flex items-center gap-1 transition-colors"
          >
            <IconPlus size={12} /> Add line
          </button>
        </div>
        <TextInput label="Notes (optional)" id="po-notes" placeholder="Delivery instructions or terms…" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </Modal>
  )
}

// ── Manage Categories Modal (Super Admin only) ─────────────────────────────────
const CategoryModal = ({ isOpen, onClose, categories, onAdd, onDelete, adding, deletingId }) => {
  const [newName, setNewName] = useState('')

  const handleAdd = () => {
    if (!newName.trim()) return
    onAdd(newName.trim())
    setNewName('')
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Product Categories"
      footer={<button className="btn-secondary" onClick={onClose} id="cat-close-btn">Close</button>}
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            id="cat-new-name"
            className="flex-1 h-[42px] px-3 bg-white border border-slate-200 text-slate-800 text-sm rounded-lg focus:outline-none focus:border-brandBlue"
            placeholder="e.g. Suspension"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          />
          <button className="btn-primary !px-3" onClick={handleAdd} disabled={adding} id="cat-add-btn">
            <IconPlus size={14} /> {adding ? 'Adding…' : 'Add'}
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
          {categories.length === 0 && (
            <div className="py-4 text-center text-[12px] text-slate-400">No categories yet.</div>
          )}
          {categories.map((c) => (
            <div key={c._id} className="flex items-center justify-between px-3 py-2">
              <span className="text-[13px] text-slate-700">{c.name}</span>
              <button
                id={`cat-delete-${c._id}`}
                aria-label={`Remove ${c.name}`}
                className="h-[24px] w-[24px] inline-flex items-center justify-center bg-white text-slate-400 border border-slate-200 rounded hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
                onClick={() => onDelete(c)}
                disabled={deletingId === c._id}
              >
                <IconTrash size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

// ── Table headers ─────────────────────────────────────────────────────────────
// Buying Price / Profit columns are appended only for roles allowed to see
// cost/margin data (Technician never gets these — enforced server-side too).
const BASE_HEADERS = [
  { label: 'SKU',         key: 'sku'       },
  { label: 'Item Name',   key: 'name'      },
  { label: 'Category',    key: 'category'  },
]
const COST_HEADERS = [
  { label: 'Buying Price', key: 'buyingPrice' },
]
const SELLING_HEADER = { label: 'Selling Price', key: 'unitPrice' }
const PROFIT_HEADER = { label: 'Profit/Unit', key: 'profit' }
const TAIL_HEADERS = [
  { label: 'In Stock',    key: 'inStock'   },
  { label: 'Reorder At',  key: 'reorderAt' },
  { label: 'Status',      key: 'status'    },
  { label: 'Action',      key: 'action', align: 'right' },
]

// ── Main component ────────────────────────────────────────────────────────────
export const Inventory = () => {
  const { toastSuccess, toastWarning, toastInfo, toastError } = useToast()
  const { hasRole } = useAuth()
  const canDelete = hasRole('Super Admin', 'Service Advisor')
  const canSeeCost = hasRole('Super Admin', 'Service Advisor')
  const canManageCategories = hasRole('Super Admin')
  const HEADERS = [...BASE_HEADERS, ...(canSeeCost ? COST_HEADERS : []), SELLING_HEADER, ...(canSeeCost ? [PROFIT_HEADER] : []), ...TAIL_HEADERS]
  const [items,       setItems]       = useState(MOCK_ITEMS)
  const [categories,  setCategories]  = useState(MOCK_CATEGORIES.map((name, i) => ({ _id: `mock-${i}`, name }))) // [{ _id, name }]
  const [catFilter,   setCatFilter]   = useState('All Categories')
  const [stockFilter, setStockFilter] = useState('All Stock Levels')
  const [currentPage, setCurrentPage] = useState(1)
  const [showAdd,     setShowAdd]     = useState(false)
  const [showPO,      setShowPO]      = useState(false)
  const [showCategories, setShowCategories] = useState(false)
  const [addingCategory, setAddingCategory] = useState(false)
  const [deletingCategoryId, setDeletingCategoryId] = useState(null)
  const [editItem,    setEditItem]    = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting,     setDeleting]     = useState(false)

  const fetchCategories = async () => {
    try {
      const res = await getCategories()
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : [])
      if (list.length > 0) setCategories(list)
    } catch (err) {
      console.warn('API error fetching categories, using mock data fallback', err)
    }
  }

  const fetchAllInventory = async () => {
    try {
      const res = await getInventory()
      if (res && res.data) {
        const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data.data) ? res.data.data : [])
        if (list.length > 0) {
          const mapped = list.map(item => ({
            id: item._id || item.id,
            sku: item.sku,
            name: item.partName,
            category: item.category,
            buyingPrice: item.buyingPrice ?? null,
            unitPrice: item.unitPrice,
            profitPerUnit: item.profitPerUnit ?? null,
            profitMarginPercent: item.profitMarginPercent ?? null,
            inStock: item.stockLevel,
            reorderAt: item.reorderPoint,
            expires: item.expires || null
          }))
          setItems(mapped)
        }
      }
    } catch (err) {
      console.warn('API error fetching inventory, using mock data fallback', err)
    }
  }

  useEffect(() => {
    fetchAllInventory()
    fetchCategories()
  }, [])

  const handleAddCategory = async (name) => {
    setAddingCategory(true)
    try {
      await createCategory(name)
      toastSuccess(`"${name}" added to categories.`, 'Category Added')
      await fetchCategories()
    } catch (err) {
      toastError(err.message || 'Failed to add category.')
    } finally {
      setAddingCategory(false)
    }
  }

  const handleDeleteCategory = async (category) => {
    setDeletingCategoryId(category._id)
    try {
      await deleteCategory(category._id)
      toastSuccess(`"${category.name}" removed.`, 'Category Removed')
      await fetchCategories()
    } catch (err) {
      toastError(err.message || 'Failed to remove category.')
    } finally {
      setDeletingCategoryId(null)
    }
  }

  // Derived KPIs
  const lowStockCount = items.filter((i) => stockStatus(i) === 'Low').length
  const expiringCount = items.filter((i) => i.expires).length
  const stockValue    = items.reduce((s, i) => s + i.unitPrice * i.inStock, 0)

  // Filtering
  const filtered = items.filter((item) => {
    const matchCat   = catFilter   === 'All Categories'  || item.category === catFilter
    const st         = stockStatus(item)
    const matchStock = stockFilter === 'All Stock Levels' ||
      (stockFilter === 'Low Stock Only' && st === 'Low')  ||
      (stockFilter === 'In Stock'       && st === 'OK')
    return matchCat && matchStock
  })

  const handleExport = () => {
    const rows = [
      ['SKU', 'Name', 'Category', 'Unit Price', 'In Stock', 'Reorder At', 'Status'],
      ...filtered.map((i) => [i.sku, i.name, i.category, i.unitPrice, i.inStock, i.reorderAt, stockStatus(i)]),
    ]
    const csv  = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'inventory.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const handleAddItem = async (newItem) => {
    const payload = {
      partName: newItem.name,
      sku: newItem.sku,
      category: newItem.category,
      stockLevel: newItem.inStock,
      reorderPoint: newItem.reorderAt,
      unitPrice: newItem.unitPrice,
      ...(newItem.buyingPrice != null ? { buyingPrice: newItem.buyingPrice } : {})
    }
    try {
      await createInventoryItem(payload)
      toastSuccess(`"${newItem.name}" added to inventory.`, 'Item Added')
      await fetchAllInventory()
    } catch (err) {
      if (err.message?.startsWith('Network error') || err.message?.includes('refused')) {
        const profitPerUnit = newItem.buyingPrice != null ? newItem.unitPrice - newItem.buyingPrice : null
        const profitMarginPercent = profitPerUnit != null && newItem.unitPrice > 0 ? Math.round((profitPerUnit / newItem.unitPrice) * 100) : null
        setItems((prev) => [...prev, { ...newItem, profitPerUnit, profitMarginPercent }])
        toastSuccess(`"${newItem.name}" added to inventory (Mock Mode).`, 'Item Added')
        // Low-stock check right after adding
        if (newItem.inStock <= newItem.reorderAt) {
          toastWarning(`${newItem.sku} is already at or below reorder level (${newItem.reorderAt}).`, 'Low Stock Alert')
        }
      } else {
        toastError(err.message || 'Failed to add inventory item.')
      }
    }
  }

  const handleReorder = async (item) => {
    try {
      await reorderItem(item.id)
      toastInfo(`Reorder initiated for ${item.sku}. Procurement team notified.`, 'Reorder Requested')
    } catch (err) {
      if (err.message?.startsWith('Network error') || err.message?.includes('refused')) {
        toastInfo(`Reorder initiated for ${item.sku} (Mock Mode). Procurement team notified.`, 'Reorder Requested')
      } else {
        toastError(err.message || 'Failed to initiate reorder.')
      }
    }
  }

  const handlePOSend = async (supplier, notes, lines) => {
    const payload = {
      supplier,
      notes,
      lines: lines.map(l => ({ sku: l.sku, quantity: l.qty }))
    }
    try {
      await createPurchaseOrder(payload)
      toastSuccess(
        `Purchase Order sent to ${supplier || 'supplier'} successfully.`,
        'Purchase Order Generated'
      )
    } catch (err) {
      if (err.message?.startsWith('Network error') || err.message?.includes('refused')) {
        toastSuccess(
          `Purchase Order sent to ${supplier || 'supplier'} successfully (Mock Mode).`,
          'Purchase Order Generated'
        )
      } else {
        toastError(err.message || 'Failed to generate purchase order.')
      }
    }
  }

  const handleUpdateItem = async (updatedItem) => {
    const payload = {
      partName: updatedItem.name,
      unitPrice: updatedItem.unitPrice,
      stockLevel: updatedItem.inStock,
      reorderPoint: updatedItem.reorderAt,
      ...(updatedItem.buyingPrice != null ? { buyingPrice: updatedItem.buyingPrice } : {})
    }
    try {
      await updateInventoryItem(updatedItem.id, payload)
      toastSuccess(`"${updatedItem.name}" updated successfully.`, 'Item Updated')
      await fetchAllInventory()
    } catch (err) {
      if (err.message?.startsWith('Network error') || err.message?.includes('refused')) {
        const profitPerUnit = updatedItem.buyingPrice != null ? updatedItem.unitPrice - updatedItem.buyingPrice : null
        const profitMarginPercent = profitPerUnit != null && updatedItem.unitPrice > 0 ? Math.round((profitPerUnit / updatedItem.unitPrice) * 100) : null
        setItems(prev => prev.map(i => i.id === updatedItem.id ? { ...updatedItem, profitPerUnit, profitMarginPercent } : i))
        toastSuccess(`"${updatedItem.name}" updated successfully (Mock Mode).`, 'Item Updated')
      } else {
        toastError(err.message || 'Failed to update item.')
      }
    }
  }

  const handleDeleteItem = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteInventoryItem(deleteTarget.id)
      toastSuccess(`"${deleteTarget.name}" removed from inventory.`, 'Item Deleted')
      await fetchAllInventory()
    } catch (err) {
      if (err.message?.startsWith('Network error') || err.message?.includes('refused')) {
        setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id))
        toastSuccess(`"${deleteTarget.name}" removed from inventory (Mock Mode).`, 'Item Deleted')
      } else {
        toastError(err.message || 'Failed to delete inventory item.')
      }
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const renderRow = (item) => {
    const st = stockStatus(item)
    const isLow = st === 'Low' || st === 'Out of Stock'
    return (
      <tr key={item.id} className="h-14 bg-white hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-0">
        <td className="px-4 py-3 text-[12px] font-mono text-slate-500">{item.sku}</td>
        <td className="px-4 py-3 text-[13px] font-semibold text-slate-800">{item.name}</td>
        <td className="px-4 py-3 text-[12px] text-slate-500">{item.category}</td>
        {canSeeCost && (
          <td className="px-4 py-3 text-[12px] text-slate-500">{item.buyingPrice != null ? `LKR ${item.buyingPrice.toLocaleString()}` : '—'}</td>
        )}
        <td className="px-4 py-3 text-[12px] text-slate-800">LKR {item.unitPrice.toLocaleString()}</td>
        {canSeeCost && (
          <td className="px-4 py-3 text-[12px]">
            {item.profitPerUnit != null ? (
              <span className={item.profitPerUnit >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                LKR {item.profitPerUnit.toLocaleString()} <span className="text-slate-400 font-normal">({item.profitMarginPercent}%)</span>
              </span>
            ) : <span className="text-slate-400">—</span>}
          </td>
        )}
        <td className={`px-4 py-3 text-[13px] font-bold ${isLow ? 'text-red-600' : 'text-slate-800'}`}>{item.inStock}</td>
        <td className="px-4 py-3 text-[12px] text-slate-500">{item.reorderAt}</td>
        <td className="px-4 py-3">
          <Badge variant={badgeVariant(st)} className="!text-[10px]">{st}</Badge>
        </td>
        <td className="px-4 py-3 text-right flex items-center gap-2 justify-end h-14">
          {isLow ? (
            <button
              id={`inv-reorder-${item.id}`}
              className="h-[28px] px-3 inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200 rounded-md hover:bg-amber-600 hover:text-white hover:border-amber-600 transition-all"
              onClick={() => handleReorder(item)}
            >
              Reorder
            </button>
          ) : (
            <button
              id={`inv-edit-${item.id}`}
              className="h-[28px] px-3 inline-flex items-center gap-1 bg-white text-slate-600 text-xs font-semibold border border-slate-200 rounded-md hover:border-brandBlue hover:text-brandBlue transition-all"
              onClick={() => setEditItem(item)}
            >
              Edit
            </button>
          )}
          {canDelete && (
            <button
              id={`inv-delete-${item.id}`}
              aria-label={`Delete ${item.name}`}
              className="h-[28px] w-[28px] inline-flex items-center justify-center bg-white text-slate-400 border border-slate-200 rounded-md hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-all"
              onClick={() => setDeleteTarget(item)}
            >
              <IconTrash size={14} />
            </button>
          )}
        </td>
      </tr>
    )
  }

  return (
    <div className="space-y-[18px]">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[17px] font-semibold text-slate-800">Inventory</div>
          <div className="text-[12px] text-slate-500 mt-0.5">Spare parts, consumables, and stock levels</div>
        </div>
        <div className="flex gap-2">
          <button id="inv-export-btn" className="btn-secondary !h-8 !px-3 !text-xs flex items-center gap-1.5" onClick={handleExport}>
            <IconDownload size={13} /> Export
          </button>
          {canManageCategories && (
            <button id="inv-manage-categories-btn" className="btn-secondary !h-8 !px-3 !text-xs flex items-center gap-1.5" onClick={() => setShowCategories(true)}>
              <IconCategory size={13} /> Categories
            </button>
          )}
          <button id="inv-add-btn" className="btn-primary !h-8 !px-3 !text-xs flex items-center gap-1.5" onClick={() => setShowAdd(true)}>
            <IconPlus size={13} /> Add Item
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Total SKUs"    value={items.length}                      icon={IconPackage}      iconColor="bg-blue-50 text-blue-500"   />
        <KPI label="Stock Value"   value={`LKR ${stockValue.toLocaleString()}`} icon={IconCoin}   iconColor="bg-emerald-50 text-emerald-500" />
        <KPI label="Low Stock"     value={lowStockCount}                     icon={IconAlertTriangle} iconColor="bg-red-50 text-red-500"    valueColor="text-red-600" />
        <KPI label="Expiring Soon" value={expiringCount} sub="Within 30 days" icon={IconClock}       iconColor="bg-amber-50 text-amber-500" valueColor="text-amber-600" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          id="inv-filter-cat"
          value={catFilter}
          onChange={(e) => { setCatFilter(e.target.value); setCurrentPage(1) }}
          className="h-8 px-2.5 text-[12px] bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:border-brandBlue cursor-pointer"
        >
          <option>All Categories</option>
          {categories.map((c) => <option key={c._id}>{c.name}</option>)}
        </select>
        <select
          id="inv-filter-stock"
          value={stockFilter}
          onChange={(e) => { setStockFilter(e.target.value); setCurrentPage(1) }}
          className="h-8 px-2.5 text-[12px] bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:border-brandBlue cursor-pointer"
        >
          {STOCK_OPTIONS.map((o) => <option key={o}>{o}</option>)}
        </select>
        <span className="ml-auto text-[11px] text-slate-400">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <DataTable
        headers={HEADERS}
        data={filtered}
        renderRow={renderRow}
        currentPage={currentPage}
        totalPages={Math.max(1, Math.ceil(filtered.length / 10))}
        totalItems={filtered.length}
        itemsPerPage={10}
        onPageChange={setCurrentPage}
      />

      {/* Modals */}
      <AddItemModal
        isOpen={showAdd} onClose={() => setShowAdd(false)} onSave={handleAddItem}
        categories={categories.map((c) => c.name)}
        canManageCategories={canManageCategories}
        onManageCategories={() => setShowCategories(true)}
      />
      <POModal      isOpen={showPO}  onClose={() => setShowPO(false)} onSend={handlePOSend} />
      {canManageCategories && (
        <CategoryModal
          isOpen={showCategories}
          onClose={() => setShowCategories(false)}
          categories={categories}
          onAdd={handleAddCategory}
          onDelete={handleDeleteCategory}
          adding={addingCategory}
          deletingId={deletingCategoryId}
        />
      )}

      {/* Edit modal */}
      {editItem && (
        <Modal
          isOpen={!!editItem}
          onClose={() => setEditItem(null)}
          title={`Edit — ${editItem.sku}`}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setEditItem(null)}>Cancel</button>
              <button className="btn-primary" onClick={() => {
                const updatedName = document.getElementById('ed-name')?.value
                const updatedBuyingPrice = document.getElementById('ed-buying-price')?.value
                const updatedPrice = document.getElementById('ed-price')?.value
                const updatedStock = document.getElementById('ed-stock')?.value
                const updatedReorder = document.getElementById('ed-reorder')?.value
                handleUpdateItem({
                  ...editItem,
                  name: updatedName,
                  buyingPrice: canSeeCost && updatedBuyingPrice !== '' ? Number(updatedBuyingPrice) : editItem.buyingPrice,
                  unitPrice: Number(updatedPrice),
                  inStock: Number(updatedStock),
                  reorderAt: Number(updatedReorder)
                })
                setEditItem(null)
              }} id="inv-edit-save-btn">Save Changes</button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-4">
            <TextInput label="Item Name"  id="ed-name"  defaultValue={editItem.name}      />
            {canSeeCost && (
              <TextInput label="Buying Price" id="ed-buying-price" defaultValue={editItem.buyingPrice ?? ''} type="number" />
            )}
            <TextInput label="Selling Price" id="ed-price" defaultValue={editItem.unitPrice}  type="number" />
            <TextInput label="In Stock"   id="ed-stock" defaultValue={editItem.inStock}    type="number" />
            <TextInput label="Reorder At" id="ed-reorder" defaultValue={editItem.reorderAt} type="number" />
          </div>
        </Modal>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <Modal
          isOpen={!!deleteTarget}
          onClose={() => !deleting && setDeleteTarget(null)}
          title="Delete Inventory Item"
          footer={
            <>
              <button
                className="btn-secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                id="inv-delete-cancel-btn"
              >
                Cancel
              </button>
              <button
                className="btn-destructive"
                onClick={handleDeleteItem}
                disabled={deleting}
                id="inv-delete-confirm-btn"
              >
                <IconTrash size={14} /> {deleting ? 'Deleting…' : 'Delete Item'}
              </button>
            </>
          }
        >
          <p className="text-sm text-slate-600">
            Are you sure you want to delete <span className="font-semibold text-slate-800">"{deleteTarget.name}"</span> ({deleteTarget.sku}) from the inventory ledger? This action cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  )
}

export default Inventory
