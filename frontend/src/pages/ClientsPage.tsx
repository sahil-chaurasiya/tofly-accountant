import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi, paymentsApi } from '../services/api';
import { Client, Payment } from '../types';
import { formatCurrency, formatDate, getStatusColor, getCurrentMonthYear, MONTHS } from '../lib/utils';
import { Link } from 'react-router-dom';
import {
  Plus, Search, Pencil, Trash2, Eye, LayoutGrid, Table2,
  GripVertical, ChevronDown, ChevronUp, X, CreditCard
} from 'lucide-react';

const STATUS_OPTIONS = ['All', 'Pending', 'Partial', 'Paid'];

// ─── Client Form Modal ────────────────────────────────────────────────────────
const ClientForm = ({ initial, onSave, onClose }: { initial?: any; onSave: (f: any) => void; onClose: () => void }) => {
  const [form, setForm] = useState(initial || { name: '', startDate: '', contractValue: '', notes: '' });
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold mb-4">{initial ? 'Edit Client' : 'Add Client'}</h2>
        <div className="space-y-3">
          <div><label className="text-sm font-medium text-gray-700">Client Name *</label><input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Company name" /></div>
          <div><label className="text-sm font-medium text-gray-700">Start Date *</label><input type="date" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.startDate?.split('T')[0] || ''} onChange={e => set('startDate', e.target.value)} /></div>
          <div><label className="text-sm font-medium text-gray-700">Monthly Contract Value (₹) *</label><input type="number" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.contractValue} onChange={e => set('contractValue', e.target.value)} placeholder="e.g. 15000" /></div>
          <div><label className="text-sm font-medium text-gray-700">Notes</label><textarea className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Service details..." /></div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 border rounded-lg py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={() => onSave(form)} className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90">Save</button>
        </div>
      </div>
    </div>
  );
};

// ─── Monthly Payment Modal ────────────────────────────────────────────────────
const MonthlyPaymentModal = ({
  client, month, year, existingPayment, onSave, onClose
}: {
  client: Client; month: number; year: number;
  existingPayment?: Payment | null;
  onSave: (data: any) => void; onClose: () => void;
}) => {
  const [form, setForm] = useState({
    amount: existingPayment?.amount ?? '',
    paymentDate: existingPayment?.paymentDate
      ? existingPayment.paymentDate.split('T')[0]
      : new Date().toISOString().split('T')[0],
    paymentMethod: existingPayment?.paymentMethod ?? 'Bank Transfer',
    remarks: existingPayment?.remarks ?? '',
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">{existingPayment ? 'Edit Payment' : 'Record Payment'}</h2>
            <p className="text-sm text-gray-500">{client.name} — {MONTHS[month - 1]} {year}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
          <span className="text-gray-500">Monthly contract: </span>
          <span className="font-semibold">{formatCurrency(client.contractValue)}</span>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Amount Paid (₹) *</label>
            <input type="number" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder={String(client.contractValue)} />
            {Number(form.amount) < client.contractValue && Number(form.amount) > 0 && (
              <p className="text-xs text-amber-600 mt-1">Partial — ₹{(client.contractValue - Number(form.amount)).toLocaleString('en-IN')} remaining</p>
            )}
          </div>
          <div><label className="text-sm font-medium text-gray-700">Payment Date *</label><input type="date" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.paymentDate} onChange={e => set('paymentDate', e.target.value)} /></div>
          <div>
            <label className="text-sm font-medium text-gray-700">Method</label>
            <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)}>
              {['Bank Transfer', 'Cash', 'UPI', 'Cheque', 'Online'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div><label className="text-sm font-medium text-gray-700">Remarks</label><input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Optional note" /></div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 border rounded-lg py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => onSave({ clientId: client._id, month, year, amount: Number(form.amount), paymentDate: form.paymentDate, paymentMethod: form.paymentMethod, remarks: form.remarks })}
            className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90"
          >Save Payment</button>
        </div>
      </div>
    </div>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MonthPaymentBadge = ({ status, paid, remaining, contractValue }: any) => {
  if (status === 'Paid') return <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">✓ Paid {formatCurrency(paid)}</span>;
  if (status === 'Partial') return <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">⚡ {formatCurrency(paid)} / {formatCurrency(contractValue)}</span>;
  return <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-500 font-medium">✗ Unpaid</span>;
};

// ─── Draggable Hook ───────────────────────────────────────────────────────────
function useDragOrder<T extends { _id: string }>(items: T[]) {
  const [order, setOrder] = useState<string[]>([]);
  const dragId = useRef<string | null>(null);
  const dragOverId = useRef<string | null>(null);

  const orderedItems = (() => {
    if (order.length === 0) return items;
    const map = new Map(items.map(i => [i._id, i]));
    const result: T[] = [];
    order.forEach(id => { const it = map.get(id); if (it) result.push(it); });
    items.forEach(it => { if (!order.includes(it._id)) result.push(it); });
    return result;
  })();

  const syncOrder = useCallback((newItems: T[]) => {
    setOrder(prev => {
      if (prev.length === 0) return prev;
      // keep existing order, append any new items
      const existing = new Set(newItems.map(i => i._id));
      const filtered = prev.filter(id => existing.has(id));
      newItems.forEach(i => { if (!filtered.includes(i._id)) filtered.push(i._id); });
      return filtered;
    });
  }, []);

  const onDragStart = (id: string) => { dragId.current = id; };
  const onDragOver = (e: React.DragEvent, id: string) => { e.preventDefault(); dragOverId.current = id; };
  const onDrop = () => {
    if (!dragId.current || !dragOverId.current || dragId.current === dragOverId.current) return;
    setOrder(prev => {
      const base = prev.length > 0 ? prev : orderedItems.map(i => i._id);
      const next = [...base];
      const fromIdx = next.indexOf(dragId.current!);
      const toIdx = next.indexOf(dragOverId.current!);
      if (fromIdx === -1 || toIdx === -1) return prev;
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, dragId.current!);
      return next;
    });
    dragId.current = null;
    dragOverId.current = null;
  };

  return { orderedItems, syncOrder, onDragStart, onDragOver, onDrop };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ClientsPage() {
  const qc = useQueryClient();
  const now = getCurrentMonthYear();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selMonth, setSelMonth] = useState(now.month);
  const [selYear, setSelYear] = useState(now.year);
  const [view, setView] = useState<'grid' | 'table'>('table');
  const [clientModal, setClientModal] = useState<null | 'add' | Client>(null);
  const [payModal, setPayModal] = useState<null | { client: Client; existingPayment: Payment | null }>(null);

  // All clients — backend now returns selPaid/selRemaining/status for the selected month
  const { data: rawClients = [], isLoading } = useQuery<Client[]>({
    queryKey: ['clients', search, statusFilter, selMonth, selYear],
    queryFn: () => clientsApi.getAll({
      search,
      status: statusFilter !== 'All' ? statusFilter : undefined,
      month: selMonth,
      year: selYear,
    }).then(r => r.data),
  });

  const { orderedItems: clients, syncOrder, onDragStart, onDragOver, onDrop } = useDragOrder(rawClients);

  // keep order in sync when query data changes
  useState(() => { syncOrder(rawClients); });

  const createClient = useMutation({ mutationFn: (d: any) => clientsApi.create(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); setClientModal(null); } });
  const updateClient = useMutation({ mutationFn: ({ id, data }: any) => clientsApi.update(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); setClientModal(null); } });
  const deleteClient = useMutation({ mutationFn: (id: string) => clientsApi.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }) });
  const createPayment = useMutation({ mutationFn: (d: any) => paymentsApi.create(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); setPayModal(null); } });
  const updatePayment = useMutation({ mutationFn: ({ id, d }: any) => paymentsApi.update(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); setPayModal(null); } });

  const handleSaveClient = (form: any) => {
    const data = { ...form, contractValue: Number(form.contractValue) };
    if (clientModal && typeof clientModal === 'object') updateClient.mutate({ id: (clientModal as Client)._id, data });
    else createClient.mutate(data);
  };

  const handleSavePayment = (data: any) => {
    const existing = payModal?.existingPayment;
    if (existing) updatePayment.mutate({ id: existing._id, d: data });
    else createPayment.mutate(data);
  };

  const years = Array.from({ length: 4 }, (_, i) => now.year - i);

  // ── Card View ───────────────────────────────────────────────────────────────
  const CardView = () => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {clients.map((client: any) => {
        const mStatus  = client.status;
        const paid     = client.selPaid ?? 0;
        const remaining = client.selRemaining ?? client.contractValue;
        const payment  = client.selPayment ?? null;
        const totalReceived = client.receivedAmount ?? 0;
        const pct = client.totalDue > 0 ? Math.min(100, (totalReceived / client.totalDue) * 100) : 0;
        return (
          <div
            key={client._id}
            draggable
            onDragStart={() => onDragStart(client._id)}
            onDragOver={e => onDragOver(e, client._id)}
            onDrop={onDrop}
            className="bg-white rounded-xl border p-5 hover:shadow-md transition cursor-grab active:cursor-grabbing select-none"
          >
            {/* header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-2">
                <GripVertical className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">{client.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Since {formatDate(client.startDate)}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full border font-medium ${getStatusColor(mStatus)}`}>{mStatus}</span>
            </div>

            {/* overall stats */}
            <div className="space-y-1.5 mb-3">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Monthly</span><span className="font-medium">{formatCurrency(client.contractValue)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">All-time Received</span><span className="font-medium text-emerald-600">{formatCurrency(totalReceived)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">All-time Outstanding</span><span className="font-medium text-red-500">{formatCurrency(client.pendingAmount ?? 0)}</span></div>
            </div>

            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
              <div className="bg-primary h-1.5 rounded-full" style={{ width: `${pct}%` }} />
            </div>

            {/* THIS MONTH */}
            <div className="border rounded-lg p-3 mb-3 bg-gray-50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-gray-600">{MONTHS[selMonth - 1]} {selYear}</span>
                <MonthPaymentBadge status={mStatus} paid={paid} remaining={remaining} contractValue={client.contractValue} />
              </div>
              {mStatus === 'Partial' && (
                <p className="text-xs text-gray-400">Remaining this month: {formatCurrency(remaining)}</p>
              )}
              {payment && (
                <p className="text-xs text-gray-400 mt-0.5">Paid on {formatDate(payment.paymentDate)} · {payment.paymentMethod}</p>
              )}
              <button
                onClick={() => setPayModal({ client, existingPayment: payment })}
                className="mt-2 w-full text-xs border border-primary/30 text-primary rounded-lg py-1.5 hover:bg-primary/5 font-medium"
              >
                {mStatus === 'Unpaid' ? '+ Record Payment' : '✎ Edit Payment'}
              </button>
            </div>

            {/* actions */}
            <div className="flex gap-2">
              <Link to={`/clients/${client._id}`} className="flex-1 flex items-center justify-center gap-1 border rounded-lg py-1.5 text-xs font-medium hover:bg-gray-50"><Eye className="w-3 h-3" /> View</Link>
              <button onClick={() => setClientModal(client)} className="flex-1 flex items-center justify-center gap-1 border rounded-lg py-1.5 text-xs font-medium hover:bg-gray-50"><Pencil className="w-3 h-3" /> Edit</button>
              <button onClick={() => { if (confirm('Delete this client?')) deleteClient.mutate(client._id); }} className="flex items-center justify-center px-3 border border-red-200 text-red-500 rounded-lg py-1.5 text-xs hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── Table View ──────────────────────────────────────────────────────────────
  const TableView = () => (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="w-8 px-3 py-3" />
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Client</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Since</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Monthly</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">All-time Received</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                {MONTHS[selMonth - 1]} {selYear} — Paid
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                {MONTHS[selMonth - 1]} — Remaining
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Paid On</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {clients.map((client: any) => {
              const mStatus   = client.status;
              const paid      = client.selPaid ?? 0;
              const remaining = client.selRemaining ?? client.contractValue;
              const payment   = client.selPayment ?? null;
              return (
                <tr
                  key={client._id}
                  draggable
                  onDragStart={() => onDragStart(client._id)}
                  onDragOver={e => onDragOver(e, client._id)}
                  onDrop={onDrop}
                  className="hover:bg-gray-50 cursor-grab active:cursor-grabbing"
                >
                  <td className="px-3 py-3 text-gray-300"><GripVertical className="w-4 h-4" /></td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{client.name}</div>
                    {client.notes && <div className="text-xs text-gray-400 truncate max-w-[160px]">{client.notes}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(client.startDate)}</td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{formatCurrency(client.contractValue)}</td>
                  <td className="px-4 py-3 font-medium text-emerald-600 whitespace-nowrap">{formatCurrency(client.receivedAmount ?? 0)}</td>

                  {/* This month paid */}
                  <td className="px-4 py-3 font-semibold whitespace-nowrap">
                    {paid > 0
                      ? <span className="text-emerald-600">{formatCurrency(paid)}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>

                  {/* This month remaining */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {mStatus === 'Paid'
                      ? <span className="text-xs text-emerald-500 font-medium">✓ Settled</span>
                      : mStatus === 'Partial'
                        ? <span className="text-amber-600 font-semibold">{formatCurrency(remaining)}</span>
                        : <span className="text-red-500 font-semibold">{formatCurrency(client.contractValue)}</span>}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <MonthPaymentBadge status={mStatus} paid={paid} remaining={remaining} contractValue={client.contractValue} />
                  </td>

                  {/* Paid on date */}
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {payment ? (
                      <div>
                        <div>{formatDate(payment.paymentDate)}</div>
                        <div className="text-gray-300">{payment.paymentMethod}</div>
                      </div>
                    ) : '—'}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPayModal({ client, existingPayment: payment })}
                        title={mStatus === 'Unpaid' ? 'Record Payment' : 'Edit Payment'}
                        className="p-1.5 rounded hover:bg-primary/10 text-primary"
                      ><CreditCard className="w-3.5 h-3.5" /></button>
                      <Link to={`/clients/${client._id}`} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Eye className="w-3.5 h-3.5" /></Link>
                      <button onClick={() => setClientModal(client)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { if (confirm('Delete this client?')) deleteClient.mutate(client._id); }} className="p-1.5 rounded hover:bg-red-50 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 text-sm mt-1">{clients.length} total clients</p>
        </div>
        <button onClick={() => setClientModal('add')} className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      {/* Filters + View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Month filter */}
        <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5">
          <span className="text-xs text-gray-400 font-medium uppercase">Month</span>
          <select className="text-sm border-0 outline-none bg-transparent" value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select className="text-sm border-0 outline-none bg-transparent" value={selYear} onChange={e => setSelYear(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Status filter */}
        <div className="flex gap-1.5">
          {STATUS_OPTIONS.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${statusFilter === s ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>{s}</button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setView('table')} className={`p-2 rounded-md transition ${view === 'table' ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}><Table2 className="w-4 h-4" /></button>
          <button onClick={() => setView('grid')} className={`p-2 rounded-md transition ${view === 'grid' ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}><LayoutGrid className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Drag hint */}
      <p className="text-xs text-gray-400 flex items-center gap-1.5">
        <GripVertical className="w-3.5 h-3.5" /> Drag rows/cards to reorder — order is shared across both views
      </p>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-36 bg-gray-200 rounded-xl animate-pulse" />)}
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No clients found</div>
      ) : view === 'table' ? <TableView /> : <CardView />}

      {/* Modals */}
      {clientModal && (
        <ClientForm
          initial={typeof clientModal === 'object' ? clientModal : undefined}
          onSave={handleSaveClient}
          onClose={() => setClientModal(null)}
        />
      )}
      {payModal && (
        <MonthlyPaymentModal
          client={payModal.client}
          month={selMonth}
          year={selYear}
          existingPayment={payModal.existingPayment}
          onSave={handleSavePayment}
          onClose={() => setPayModal(null)}
        />
      )}
    </div>
  );
}