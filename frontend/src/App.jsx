import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import MasterScreen from './components/MasterScreen';
import ExecutorScreen from './components/ExecutorScreen';
import CreateWorkOrderModal from './components/CreateWorkOrderModal';
import CloseWorkOrderModal from './components/CloseWorkOrderModal';
import WorkOrderDetailModal from './components/WorkOrderDetailModal';

import { 
  fetchWorkOrders, 
  fetchUsers, 
  fetchLocations, 
  fetchEquipment, 
  fetchMalfunctionCodes, 
  fetchMaterials, 
  fetchShiftAnalytics, 
  createWorkOrder, 
  updateWorkOrderStatus, 
  closeWorkOrder, 
  updateUserStatus,
  triggerCheckDeadlines 
} from './services/api';

import { 
  initWebSocket, 
  subscribeToEvents, 
  subscribeToStatus 
} from './services/websocket';

// Play industrial alert beep using Web Audio API
function playAlertBeep() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
    osc.frequency.setValueAtTime(440, audioCtx.currentTime + 0.15); // A4
    osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.3); // A5

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  } catch (e) {
    console.warn('Audio not available:', e);
  }
}

export default function App() {
  const [activeMode, setActiveMode] = useState('master'); // 'master' | 'executor'
  const [workOrders, setWorkOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [malfunctionCodes, setMalfunctionCodes] = useState([]);
  const [materialsCatalog, setMaterialsCatalog] = useState([]);
  const [shiftAnalytics, setShiftAnalytics] = useState(null);

  const [selectedExecutorId, setSelectedExecutorId] = useState(3); // default Ахметов Ерик
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrderForClose, setSelectedOrderForClose] = useState(null);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState(null);

  // Toast notifications
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    try {
      const [orders, usrs, locs, eq, codes, mats, shift] = await Promise.all([
        fetchWorkOrders(),
        fetchUsers(),
        fetchLocations(),
        fetchEquipment(),
        fetchMalfunctionCodes(),
        fetchMaterials(),
        fetchShiftAnalytics().catch(() => null)
      ]);
      setWorkOrders(orders);
      setUsers(usrs);
      setLocations(locs);
      setEquipmentList(eq);
      setMalfunctionCodes(codes);
      setMaterialsCatalog(mats);
      if (shift) setShiftAnalytics(shift);

      // Auto-set first executor if not selected
      const firstExec = usrs.find((u) => u.role === 'EXECUTOR');
      if (firstExec && !selectedExecutorId) {
        setSelectedExecutorId(firstExec.id);
      }
    } catch (err) {
      console.error('Initial load error:', err);
      showToast('Ошибка загрузки данных с сервера', 'error');
    }
  };

  useEffect(() => {
    loadData();
    initWebSocket();

    const unsubStatus = subscribeToStatus((connected) => {
      setIsWsConnected(connected);
    });

    const unsubEvents = subscribeToEvents((msg) => {
      console.log('WS Event received:', msg);

      if (msg.event === 'WORK_ORDER_CREATED') {
        const newOrder = msg.data;
        setWorkOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
        showToast(`Выдан новый наряд: ${newOrder.number} (${newOrder.priority})`, 'info');
        if (soundEnabled && newOrder.priority === 'EMERGENCY') {
          playAlertBeep();
        }
        fetchShiftAnalytics().then(setShiftAnalytics).catch(() => {});
      } else if (msg.event === 'STATUS_CHANGE') {
        const { order_id, new_status, order } = msg.data;
        setWorkOrders((prev) => prev.map((o) => (o.id === order_id ? { ...o, ...order, status: new_status } : o)));
        showToast(`Наряд ${order?.number || order_id} сменил статус на: ${new_status}`, 'info');
        fetchShiftAnalytics().then(setShiftAnalytics).catch(() => {});
        fetchUsers().then(setUsers).catch(() => {});
      } else if (msg.event === 'AI_CHECK_COMPLETED') {
        const { order_id, order, ai_result } = msg.data;
        setWorkOrders((prev) => prev.map((o) => (o.id === order_id ? { ...o, ...order } : o)));
        showToast(`ИИ проверил наряд: ${ai_result.verdict_text} (${ai_result.score} баллов)`, 'info');
        fetchShiftAnalytics().then(setShiftAnalytics).catch(() => {});
      } else if (msg.event === 'WORKER_STATUS_CHANGED') {
        const { user_id, new_status } = msg.data;
        setUsers((prev) => prev.map((u) => (u.id === user_id ? { ...u, current_status: new_status } : u)));
      } else if (msg.event === 'AI_DEADLINE_ALERT') {
        showToast(`ИИ: Обнаружены просроченные наряды!`, 'error');
        if (soundEnabled) playAlertBeep();
      }
    });

    return () => {
      unsubStatus();
      unsubEvents();
    };
  }, [soundEnabled]);

  // Handlers
  const handleCreateOrder = async (orderData) => {
    const created = await createWorkOrder(orderData);
    setWorkOrders((prev) => [created, ...prev]);
    showToast(`Наряд ${created.number} успешно выдан!`, 'success');
  };

  const handleUpdateStatus = async (orderId, newStatus, reason = null) => {
    try {
      const updated = await updateWorkOrderStatus(orderId, {
        status: newStatus,
        reason,
        user_id: selectedExecutorId
      });
      setWorkOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      showToast(`Статус обновлен: ${newStatus}`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCloseOrder = async (orderId, closeData) => {
    try {
      const result = await closeWorkOrder(orderId, closeData);
      setWorkOrders((prev) => prev.map((o) => (o.id === orderId ? result : o)));
      setSelectedOrderForDetail(result); // Show detail modal with AI assessment
      showToast(`Наряд сдан. Вердикт ИИ: ${result.ai_verdict}`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateWorkerStatus = async (userId, newStatus) => {
    try {
      await updateUserStatus(userId, newStatus);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, current_status: newStatus } : u)));
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCheckDeadlines = async () => {
    try {
      const res = await triggerCheckDeadlines();
      showToast(`ИИ проверил сроки: ${res.count} предупреждений`, 'info');
      if (res.count > 0 && soundEnabled) playAlertBeep();
    } catch (err) {
      showToast('Ошибка проверки сроков', 'error');
    }
  };

  const currentExecutor = users.find((u) => u.id === selectedExecutorId) || users.find((u) => u.role === 'EXECUTOR');
  const overdueCount = workOrders.filter((o) => o.is_overdue).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Toast Banner */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold transition-all border animate-fade-in flex items-center gap-2 bg-slate-900 border-slate-700 text-white">
          <span className={`w-2 h-2 rounded-full ${
            toast.type === 'error' ? 'bg-rose-500' :
            toast.type === 'success' ? 'bg-emerald-400' : 'bg-blue-400'
          }`} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header with Switcher */}
      <Header
        activeMode={activeMode}
        setActiveMode={setActiveMode}
        users={users}
        selectedExecutorId={selectedExecutorId}
        setSelectedExecutorId={setSelectedExecutorId}
        isWsConnected={isWsConnected}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        onCheckDeadlines={handleCheckDeadlines}
        overdueCount={overdueCount}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-5">
        {activeMode === 'master' ? (
          <MasterScreen
            workOrders={workOrders}
            users={users}
            locations={locations}
            shiftAnalytics={shiftAnalytics}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onSelectOrder={(order) => setSelectedOrderForDetail(order)}
            onUpdateWorkerStatus={handleUpdateWorkerStatus}
          />
        ) : (
          <ExecutorScreen
            worker={currentExecutor}
            workOrders={workOrders}
            onUpdateStatus={handleUpdateStatus}
            onOpenCloseModal={(order) => setSelectedOrderForClose(order)}
            onSelectOrder={(order) => setSelectedOrderForDetail(order)}
          />
        )}
      </main>

      {/* Modals */}
      <CreateWorkOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        locations={locations}
        equipmentList={equipmentList}
        users={users}
        masterId={1}
        onSubmit={handleCreateOrder}
      />

      <CloseWorkOrderModal
        isOpen={!!selectedOrderForClose}
        onClose={() => setSelectedOrderForClose(null)}
        workOrder={selectedOrderForClose}
        malfunctionCodes={malfunctionCodes}
        materialsCatalog={materialsCatalog}
        onSubmitClose={handleCloseOrder}
      />

      <WorkOrderDetailModal
        isOpen={!!selectedOrderForDetail}
        onClose={() => setSelectedOrderForDetail(null)}
        workOrder={selectedOrderForDetail}
        currentUserRole={activeMode === 'master' ? 'MASTER' : 'EXECUTOR'}
        currentUserId={activeMode === 'master' ? 1 : selectedExecutorId}
        onUpdate={loadData}
      />
    </div>
  );
}
