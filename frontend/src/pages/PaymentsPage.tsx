import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi, clientsApi } from '../services/api';
import { formatCurrency, formatDate, MONTHS, getCurrentMonthYear } from '../lib/utils';
import { Plus, Trash2, Pencil, TrendingUp, Activity, AlertCircle, Calendar } from 'lucide-react';

const PaymentModal = ({ clients, initial, onSave, onClose }: any) => {
  const [form, setForm] = useState(initial || { clientId: clients[0]?._id || '', amount: '', paymentDate: new Date().toISOString().split('T')[0], paymentMethod: 'Bank Transfer', remarks: '' });
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold mb-4">{initial ? 'Edit Payment' : 'Record Payment'}</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Client *</label>
            <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.clientId} onChange={e => set('clientId', e.target.value)}>
              {clients.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Amount (₹) *</label>
            <input type="number" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.amount} onChange={e => set('amount', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Payment Date *</label>
            <input type="date" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.paymentDate?.split('T')[0] || ''} onChange={e => set('paymentDate', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Method</label>
            <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)}>
              {['Bank Transfer', 'Cash', 'UPI', 'Cheque', 'Online'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Remarks</label>
            <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.remarks} onChange={e => set('remarks', e.target.value)} />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 border rounded-lg py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={() => onSave({ ...form, amount: Number(form.amount) })} className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90">Save</button>
        </div>
      </div>
    </div>
  );
};

export default function PaymentsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<any>(null);
  const now = getCurrentMonthYear();
  const [selMonth, setSelMonth] = useState(now.month);
  const [selYear, setSelYear] = useState(now.year);
  const years = Array.from({ length: 4 }, (_, i) => now.year - i);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => paymentsApi.getAll().then(r => r.data),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-all'],
    queryFn: () => clientsApi.getAll().then(r => r.data),
  });

  const { data: monthClients = [] } = useQuery({
    queryKey: ['clients-month', selMonth, selYear],
    queryFn: () => clientsApi.getAll({ month: selMonth, year: selYear }).then(r => r.data),
  });

  const createMut = useMutation({ mutationFn: (d: any) => paymentsApi.create(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['payments'] }); setModal(null); } });
  const updateMut = useMutation({ mutationFn: ({ id, d }: any) => paymentsApi.update(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['payments'] }); setModal(null); } });
  const deleteMut = useMutation({ mutationFn: (id: string) => paymentsApi.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }) });

  const handleSave = (form: any) => {
    if (modal?._id) updateMut.mutate({ id: modal._id, d: form });
    else createMut.mutate(form);
  };

  const total = payments.reduce((s: number, p: any) => s + p.amount, 0);

  const monthKpis = monthClients.reduce((acc: any, c: any) => {
    acc.collected += c.selPaid || 0;
    acc.pending += c.selRemaining ?? Math.max(0, (c.contractValue || 0) - (c.selPaid || 0));
    return acc;
  }, { collected: 0, pending: 0 });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Collections</h1>
          <p className="text-gray-500 text-sm mt-1">Total collected: <span className="font-semibold text-emerald-600">{formatCurrency(total)}</span></p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <select className="text-sm border-0 outline-none bg-transparent" value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select className="text-sm border-0 outline-none bg-transparent" value={selYear} onChange={e => setSelYear(Number(e.target.value))}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button onClick={() => setModal({})} className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90">
            <Plus className="w-4 h-4" /> Add Payment
          </button>
        </div>
      </div>

      {/* Collection KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-emerald-500">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Collected</p>
            <p className="text-xl font-bold text-gray-900 truncate">{formatCurrency(total)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Total received</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-500">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{MONTHS[selMonth - 1]}</p>
            <p className="text-xl font-bold text-gray-900 truncate">{formatCurrency(monthKpis.collected)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Revenue this month</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-500">
            <AlertCircle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Pending</p>
            <p className="text-xl font-bold text-gray-900 truncate">{formatCurrency(monthKpis.pending)}</p>
            <p className="text-xs text-gray-400 mt-0.5">To be collected ({MONTHS[selMonth - 1]})</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No payments recorded</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Client', 'Amount', 'Date', 'Method', 'Remarks', ''].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((p: any) => (
                  <tr key={p._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{typeof p.clientId === 'object' ? p.clientId.name : p.clientId}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(p.paymentDate)}</td>
                    <td className="px-4 py-3"><span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">{p.paymentMethod}</span></td>
                    <td className="px-4 py-3 text-gray-400">{p.remarks}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => setModal(p)} className="p-1.5 hover:bg-gray-100 rounded"><Pencil className="w-3.5 h-3.5 text-gray-500" /></button>
                        <button onClick={() => { if (confirm('Delete?')) deleteMut.mutate(p._id); }} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal !== null && (
        <PaymentModal
          clients={clients}
          initial={modal._id ? modal : undefined}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}