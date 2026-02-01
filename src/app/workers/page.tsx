'use client';

import { useState, useEffect, useCallback } from 'react';
import { Worker } from '@/types';
import Modal from '@/components/Modal';
import {
  Users,
  Plus,
  RefreshCw,
  UserCheck,
  UserX,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';
import { useI18n } from '@/i18n/context';

export default function WorkersPage() {
  const { t } = useI18n();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [addingWorker, setAddingWorker] = useState(false);
  const [error, setError] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchWorkers = useCallback(async () => {
    try {
      const response = await fetch('/api/workers');
      const data = await response.json();
      if (data.success) {
        setWorkers(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch workers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerName.trim()) return;

    setAddingWorker(true);
    setError('');

    try {
      const response = await fetch('/api/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWorkerName.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchWorkers();
        setShowAddModal(false);
        setNewWorkerName('');
      } else {
        setError(data.error || 'Failed to add worker');
      }
    } catch {
      setError('Failed to add worker');
    } finally {
      setAddingWorker(false);
    }
  };

  const handleToggleActive = async (worker: Worker) => {
    setTogglingId(worker.id);

    try {
      const response = await fetch(`/api/workers/${worker.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !worker.isActive }),
      });

      if (response.ok) {
        await fetchWorkers();
      }
    } catch (error) {
      console.error('Failed to toggle worker:', error);
    } finally {
      setTogglingId(null);
    }
  };

  const activeWorkers = workers.filter((w) => w.isActive);
  const inactiveWorkers = workers.filter((w) => !w.isActive);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-500">{t("workers.loadingWorkers")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("workers.title")}</h1>
          <p className="text-gray-500">{t("workers.subtitle")}</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          {t("workers.addWorker")}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card p-5 bg-emerald-50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 rounded-xl">
              <UserCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{t("workers.activeWorkers")}</p>
              <p className="text-2xl font-bold text-emerald-600">{activeWorkers.length}</p>
            </div>
          </div>
        </div>
        <div className="card p-5 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gray-100 rounded-xl">
              <UserX className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{t("workers.inactiveWorkers")}</p>
              <p className="text-2xl font-bold text-gray-600">{inactiveWorkers.length}</p>
            </div>
          </div>
        </div>
        <div className="card p-5 bg-blue-50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{t("workers.totalWorkers")}</p>
              <p className="text-2xl font-bold text-blue-600">{workers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Workers List */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Active Workers */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-500" />
              {t("workers.activeWorkers")}
            </h3>
          </div>
          <div className="p-5">
            {activeWorkers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">{t("workers.noActive")}</p>
            ) : (
              <div className="space-y-3">
                {activeWorkers.map((worker) => (
                  <div
                    key={worker.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <span className="text-emerald-700 font-semibold">
                          {worker.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{worker.name}</p>
                        <p className="text-xs text-emerald-600">{t("workers.active")}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleActive(worker)}
                      disabled={togglingId === worker.id}
                      className="btn btn-sm btn-ghost text-red-600 hover:bg-red-50"
                    >
                      {togglingId === worker.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <UserX className="w-4 h-4" />
                          {t("workers.deactivate")}
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Inactive Workers */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <UserX className="w-5 h-5 text-gray-400" />
              {t("workers.inactiveWorkers")}
            </h3>
          </div>
          <div className="p-5">
            {inactiveWorkers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">{t("workers.noInactive")}</p>
            ) : (
              <div className="space-y-3">
                {inactiveWorkers.map((worker) => (
                  <div
                    key={worker.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500 font-semibold">
                          {worker.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-600">{worker.name}</p>
                        <p className="text-xs text-gray-400">{t("workers.inactive")}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleActive(worker)}
                      disabled={togglingId === worker.id}
                      className="btn btn-sm btn-ghost text-emerald-600 hover:bg-emerald-50"
                    >
                      {togglingId === worker.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <UserCheck className="w-4 h-4" />
                          {t("workers.activate")}
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* t(workers.addWorker) Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={t("workers.addWorker")} size="sm">
        <form onSubmit={handleAddWorker} className="space-y-5">
          <div>
            <label className="label">{t("workers.workerName")}</label>
            <input
              type="text"
              className="input"
              placeholder={t("workers.enterName")}
              value={newWorkerName}
              onChange={(e) => setNewWorkerName(e.target.value)}
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setShowAddModal(false);
                setNewWorkerName('');
                setError('');
              }}
              className="btn btn-secondary flex-1"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={addingWorker || !newWorkerName.trim()}
              className="btn btn-primary flex-1"
            >
              {addingWorker ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("workers.adding")}
                </>
              ) : (
                t("workers.addWorker")
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
