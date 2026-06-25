import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../services/api';
import { useAuth } from '../lib/auth';
import { Save, CheckCircle } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const updateMut = useMutation({
    mutationFn: (d: any) => authApi.updateProfile(d),
    onSuccess: () => { setSuccess('Profile updated successfully!'); setPassword(''); setConfirm(''); setTimeout(() => setSuccess(''), 3000); },
    onError: (e: any) => setError(e.response?.data?.message || 'Update failed'),
  });

  const handleSave = () => {
    setError('');
    if (password && password !== confirm) { setError('Passwords do not match'); return; }
    const data: any = { name };
    if (password) data.password = password;
    updateMut.mutate(data);
  };

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account</p>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Profile</h3>

        <div>
          <label className="text-sm font-medium text-gray-700">Email</label>
          <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed" value={user?.email} disabled />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Name</label>
          <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div className="border-t pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Change Password</h4>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">New Password</label>
              <input type="password" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank to keep current" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Confirm Password</label>
              <input type="password" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={confirm} onChange={e => setConfirm(e.target.value)} />
            </div>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">{error}</div>}
        {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm px-4 py-3 rounded-lg flex items-center gap-2"><CheckCircle className="w-4 h-4" />{success}</div>}

        <button onClick={handleSave} className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90">
          <Save className="w-4 h-4" /> Save Changes
        </button>
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-gray-900 mb-4">About</h3>
        <div className="space-y-2 text-sm text-gray-500">
          <div className="flex justify-between"><span>Version</span><span className="font-medium text-gray-700">1.0.0</span></div>
          <div className="flex justify-between"><span>Stack</span><span className="font-medium text-gray-700">MERN + PWA</span></div>
          <div className="flex justify-between"><span>Purpose</span><span className="font-medium text-gray-700">Revenue Management</span></div>
        </div>
      </div>
    </div>
  );
}
