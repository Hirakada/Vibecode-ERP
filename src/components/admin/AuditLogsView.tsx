import React, { useState, useEffect } from 'react';
import { db } from '../../lib/storage';
import { AuditLog } from '../../types';
import { Shield, Clock, Search } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      const all = await db.auditLogs.orderBy('timestamp').reverse().toArray();
      setLogs(all);
    };
    load();
  }, []);

  const filtered = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.actorName.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Shield size={22} className="text-amber-400" />
            <span>Audit Trail & Log Aktivitas Sistem</span>
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Catatan rekaman aktivitas finansial, perubahan stok, mutasi batch, dan transaksi yang tidak dapat diubah (immutable).
          </p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari aksi / petugas..."
            className="bg-stone-900 border border-stone-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-950/80 text-stone-400 uppercase font-semibold border-b border-stone-800">
              <tr>
                <th className="p-3">Waktu</th>
                <th className="p-3">Petugas</th>
                <th className="p-3">Aksi</th>
                <th className="p-3">Entitas</th>
                <th className="p-3">Rincian Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 text-stone-300">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-stone-800/40">
                  <td className="p-3 text-stone-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="p-3 font-semibold text-white">{log.actorName}</td>
                  <td className="p-3">
                    <span className="font-mono text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 uppercase text-[10px] text-stone-400 font-semibold">{log.entity}</td>
                  <td className="p-3 text-stone-300 max-w-md">{log.details}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-stone-500">
                    Tidak ada catatan audit ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
