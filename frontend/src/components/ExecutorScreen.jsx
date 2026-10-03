import React, { useState } from 'react';
import { 
  Flame, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Play, 
  Pause, 
  XCircle, 
  ListOrdered, 
  Sparkles, 
  CheckCheck, 
  Camera, 
  RotateCcw,
  ArrowRight
} from 'lucide-react';

export default function ExecutorScreen({
  worker,
  workOrders,
  onUpdateStatus,
  onOpenCloseModal,
  onSelectOrder
}) {
  const [rejectModalOrder, setRejectModalOrder] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [suspendModalOrder, setSuspendModalOrder] = useState(null);
  const [suspendReason, setSuspendReason] = useState('');

  // Worker orders
  const myOrders = workOrders.filter((o) => o.executor_id === worker?.id);

  // Emergency new orders needing urgent action
  const emergencyIssuedOrder = myOrders.find(
    (o) => (o.priority === 'EMERGENCY' || o.order_type === 'EMERGENCY') && o.status === 'ISSUED'
  );

  const activeOrders = myOrders.filter((o) => ['ISSUED', 'ACCEPTED', 'IN_PROGRESS', 'SUSPENDED', 'REWORK'].includes(o.status));
  const queuedOrders = myOrders.filter((o) => o.status === 'QUEUED');
  const completedOrders = myOrders.filter((o) => ['EXECUTED', 'CLOSED'].includes(o.status));

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) {
      alert('Укажите причину отклонения (обязательно по регламенту)');
      return;
    }
    onUpdateStatus(rejectModalOrder.id, 'REJECTED', rejectReason.trim());
    setRejectModalOrder(null);
    setRejectReason('');
  };

  const handleConfirmSuspend = () => {
    if (!suspendReason.trim()) {
      alert('Укажите причину приостановки работ');
      return;
    }
    onUpdateStatus(suspendModalOrder.id, 'SUSPENDED', suspendReason.trim());
    setSuspendModalOrder(null);
    setSuspendReason('');
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-10">
      {/* 1. Worker Profile Bar */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-850 border border-slate-800 shadow-xl flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base text-white">{worker?.full_name}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {worker?.current_status === 'FREE' ? '🟢 Свободен' :
               worker?.current_status === 'BUSY' ? '🟡 В работе' :
               worker?.current_status === 'HAS_QUEUE' ? '🔵 В очереди' : '⚪ Не на смене'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {worker?.specialty} • {worker?.rank} разряд • {worker?.brigade}
          </p>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Рейтинг качества</span>
          <span className="text-xl font-black text-amber-400">{worker?.rating || 95}%</span>
        </div>
      </div>

      {/* 2. EMERGENCY HERO ALERT BANNER (Section 5.3: Аварийные наряды выделены красным и требуют ответа) */}
      {emergencyIssuedOrder && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/40 border-2 border-rose-500 emergency-glow shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-300 font-black text-sm uppercase tracking-wider animate-pulse">
              <Flame className="w-5 h-5 text-rose-500" />
              <span>АВАРИЙНЫЙ НАРЯД — СРОЧНО В РАБОТУ!</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-mono text-xs font-bold">
              {emergencyIssuedOrder.number}
            </span>
          </div>

          <div>
            <h3 className="text-lg font-bold text-white">
              {emergencyIssuedOrder.equipment_name}
            </h3>
            <p className="text-xs text-rose-300/90 font-medium">
              Участок: {emergencyIssuedOrder.location_name}
            </p>
            <div className="mt-2 p-2.5 rounded-xl bg-black/40 border border-rose-500/30 text-xs text-slate-100">
              {emergencyIssuedOrder.description}
            </div>
          </div>

          {/* Big Action Buttons (for gloves) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={() => onUpdateStatus(emergencyIssuedOrder.id, 'ACCEPTED')}
              className="touch-btn-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30"
            >
              <CheckCircle className="w-6 h-6 text-white" />
              <span>ПРИНЯТЬ В РАБОТУ</span>
            </button>
            <button
              onClick={() => setRejectModalOrder(emergencyIssuedOrder)}
              className="touch-btn-lg bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/40"
            >
              <XCircle className="w-5 h-5 text-rose-400" />
              <span>ОТКЛОНИТЬ (С ПРИЧИНОЙ)</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Section Title */}
      <div className="flex items-center justify-between pt-1">
        <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-300">
          Текущие наряды ({activeOrders.length})
        </h3>
        {queuedOrders.length > 0 && (
          <span className="text-xs font-bold text-sky-400">
            В очереди: {queuedOrders.length}
          </span>
        )}
      </div>

      {/* 4. Active Orders List */}
      <div className="space-y-3">
        {activeOrders.length === 0 && !emergencyIssuedOrder ? (
          <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-400">
            <CheckCheck className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
            <h4 className="font-bold text-sm text-slate-200">Все наряды исполнены</h4>
            <p className="text-xs text-slate-500 mt-1">Ожидайте новых распоряжений мастера смены</p>
          </div>
        ) : (
          activeOrders.map((order) => {
            const isEmergency = order.priority === 'EMERGENCY' || order.order_type === 'EMERGENCY';
            const isRework = order.status === 'REWORK';

            return (
              <div
                key={order.id}
                className={`p-4 rounded-2xl bg-slate-900 border transition shadow-lg space-y-3 ${
                  isRework ? 'border-rose-500/80 bg-rose-950/20' :
                  isEmergency ? 'border-amber-500/60' : 'border-slate-800'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-base text-white">
                        {order.number}
                      </span>
                      {isEmergency && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-600 text-white">
                          АВАРИЙНЫЙ
                        </span>
                      )}
                      {isRework && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                          НА ДОРАБОТКУ
                        </span>
                      )}
                      {order.is_overdue && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/30 text-rose-200">
                          ПРОСРОЧЕН
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-slate-200 mt-0.5">
                      {order.equipment_name} ({order.equipment_inv})
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Участок: {order.location_name} • Норматив: {order.standard_hours} ч
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Срок:</span>
                    <span className={`text-xs font-bold ${order.is_overdue ? 'text-rose-400' : 'text-slate-200'}`}>
                      {new Date(order.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Problem Description */}
                <div className="p-3 bg-slate-800/80 rounded-xl text-xs text-slate-200 border border-slate-700/80">
                  {order.description}
                </div>

                {/* AI Rework Notice if in rework status (Section 11 demo step 7) */}
                {isRework && order.ai_notes && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-xs text-rose-200 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-300">Замечания ИИ-контролёра:</span>
                      <p className="mt-0.5">{order.ai_notes}</p>
                    </div>
                  </div>
                )}

                {/* GLOVE-FRIENDLY LARGE ACTION BUTTONS (Section 5.3) */}
                <div className="pt-1 space-y-2">
                  {/* Status: ISSUED */}
                  {order.status === 'ISSUED' && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => onUpdateStatus(order.id, 'ACCEPTED')}
                        className="touch-btn bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                      >
                        <CheckCircle className="w-5 h-5" /> Принять
                      </button>
                      <button
                        onClick={() => onUpdateStatus(order.id, 'QUEUED')}
                        className="touch-btn bg-sky-700 hover:bg-sky-600 text-white font-bold"
                      >
                        <ListOrdered className="w-5 h-5" /> В очередь
                      </button>
                    </div>
                  )}

                  {/* Status: ACCEPTED or QUEUED */}
                  {(order.status === 'ACCEPTED' || order.status === 'QUEUED') && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        onClick={() => onUpdateStatus(order.id, 'IN_PROGRESS')}
                        className="touch-btn bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm shadow-md shadow-indigo-600/30"
                      >
                        <Play className="w-5 h-5 fill-current" /> НАЧАТЬ ИСПОЛНЕНИЕ
                      </button>
                      <button
                        onClick={() => setSuspendModalOrder(order)}
                        className="touch-btn bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs"
                      >
                        <Pause className="w-4 h-4" /> Приостановить
                      </button>
                    </div>
                  )}

                  {/* Status: IN_PROGRESS or REWORK */}
                  {(order.status === 'IN_PROGRESS' || order.status === 'REWORK') && (
                    <div className="space-y-2">
                      <button
                        onClick={() => onOpenCloseModal(order)}
                        className="touch-btn-lg w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-black shadow-xl shadow-emerald-600/30"
                      >
                        <CheckCircle className="w-6 h-6 text-white" />
                        <span>ИСПОЛНЕНО (СДАТЬ РАБОТУ)</span>
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setSuspendModalOrder(order)}
                          className="touch-btn bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs"
                        >
                          <Pause className="w-4 h-4" /> Приостановить
                        </button>
                        <button
                          onClick={() => onSelectOrder(order)}
                          className="touch-btn bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs"
                        >
                          Подробнее
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Status: SUSPENDED */}
                  {order.status === 'SUSPENDED' && (
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
                        <span className="font-bold">Работа приостановлена: </span>
                        {order.suspend_reason || 'Ожидание запчастей / остановки агрегата'}
                      </div>
                      <button
                        onClick={() => onUpdateStatus(order.id, 'IN_PROGRESS')}
                        className="touch-btn w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                      >
                        <Play className="w-5 h-5 fill-current" /> ВОЗОБНОВИТЬ РАБОТУ
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. Completed Orders with AI Evaluation Score (Section 5.3 & 6.4) */}
      {completedOrders.length > 0 && (
        <div className="pt-4 space-y-3">
          <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">
            Завершённые наряды с оценкой ИИ ({completedOrders.length})
          </h3>

          <div className="space-y-2.5">
            {completedOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => onSelectOrder(order)}
                className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 cursor-pointer flex items-center justify-between gap-3 transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-slate-200">{order.number}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                      {order.status === 'CLOSED' ? 'ЗАКРЫТ' : 'ИСПОЛНЕНО'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {order.equipment_name}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {order.ai_score && (
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Оценка ИИ</span>
                      <span className="text-sm font-black text-amber-400 flex items-center gap-1 justify-end">
                        <Sparkles className="w-3 h-3" /> {order.ai_score}/100
                      </span>
                    </div>
                  )}
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-4">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-500" />
              Причина отклонения наряда {rejectModalOrder.number}
            </h3>
            <p className="text-xs text-slate-400">
              Укажите причину (нет допуска, нет материалов на складе, занят аварийным нарядом)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {['Нет материалов на складе', 'Нет допуска к высотным работам', 'Занят другим аварийным нарядом', 'Требуется отключение линии'].map((t, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setRejectReason(t)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700"
                >
                  {t}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Подробная причина..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setRejectModalOrder(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmReject}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white"
              >
                Подтвердить отказ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {suspendModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-4">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Pause className="w-5 h-5 text-amber-500" />
              Причина приостановки наряда {suspendModalOrder.number}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {['Ожидание запчастей со склада', 'Ожидание полной остановки агрегата', 'Перерыв на обед / пересменка', 'Ожидание автокрана'].map((t, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSuspendReason(t)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700"
                >
                  {t}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Причина приостановки..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setSuspendModalOrder(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmSuspend}
                className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white"
              >
                Приостановить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
