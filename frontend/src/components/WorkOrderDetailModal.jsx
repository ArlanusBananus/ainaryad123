import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Wrench, 
  User, 
  MapPin, 
  Tag, 
  History, 
  Image as ImageIcon,
  Check,
  RotateCcw
} from 'lucide-react';
import { masterOverrideAI } from '../services/api';

export default function WorkOrderDetailModal({
  isOpen,
  onClose,
  workOrder,
  currentUserRole,
  currentUserId,
  onUpdate
}) {
  const [overrideScore, setOverrideScore] = useState(90);
  const [overrideNotes, setOverrideNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !workOrder) return null;

  const handleMasterDecision = async (action) => {
    setIsSubmitting(true);
    try {
      await masterOverrideAI(workOrder.id, {
        master_id: currentUserId || 1,
        score: Number(overrideScore),
        notes: overrideNotes.trim() || undefined,
        action: action // "APPROVE" or "REWORK"
      });
      if (onUpdate) onUpdate();
      onClose();
    } catch (err) {
      alert(err.message || 'Ошибка обновления наряда');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ISSUED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">Выдан</span>;
      case 'ACCEPTED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40">Принят</span>;
      case 'QUEUED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">В очереди</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">В работе</span>;
      case 'SUSPENDED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40">Приостановлен</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">Отклонён</span>;
      case 'EXECUTED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">Исполнено</span>;
      case 'AI_CHECK':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">Проверка ИИ</span>;
      case 'REWORK':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">На доработку</span>;
      case 'CLOSED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-700 text-slate-300 border border-slate-600">Закрыт</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-700 text-slate-300">{status}</span>;
    }
  };

  const beforePhoto = workOrder.photos?.find((p) => p.photo_type === 'BEFORE');
  const afterPhoto = workOrder.photos?.find((p) => p.photo_type === 'AFTER');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto">
        {/* Top Header */}
        <div className="px-5 py-4 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-extrabold text-xl text-white">
                  {workOrder.number}
                </span>
                {getStatusBadge(workOrder.status)}
                {workOrder.is_overdue && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse">
                    ПРОСРОЧЕНО
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {workOrder.equipment_name} ({workOrder.equipment_inv}) • {workOrder.location_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Key Meta Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Исполнитель</span>
              <span className="text-slate-200 font-bold">{workOrder.executor_name || 'Не назначен'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Выдал мастер</span>
              <span className="text-slate-200 font-bold">{workOrder.master_name || 'Мастер'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Срок выполнения</span>
              <span className={`font-bold ${workOrder.is_overdue ? 'text-rose-400' : 'text-slate-200'}`}>
                {new Date(workOrder.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Норматив</span>
              <span className="text-slate-200 font-bold">{workOrder.standard_hours} ч</span>
            </div>
          </div>

          {/* Problem Description */}
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Описание проблемы:
            </span>
            <div className="p-3 bg-slate-800/80 rounded-xl text-sm text-slate-200 border border-slate-700">
              {workOrder.description}
            </div>
          </div>

          {/* Completion Notes (if any) */}
          {workOrder.completion_notes && (
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                Выполненные работы (отчёт исполнителя):
              </span>
              <div className="p-3 bg-emerald-950/20 rounded-xl text-sm text-slate-200 border border-emerald-800/40">
                <p>{workOrder.completion_notes}</p>
                {workOrder.malfunction_code_str && (
                  <p className="text-xs text-emerald-400 mt-2 font-semibold">
                    Шифр: {workOrder.malfunction_code_str}
                  </p>
                )}
                {workOrder.actual_duration_minutes && (
                  <p className="text-xs text-slate-400 mt-1">
                    Фактическое время выполнения: {workOrder.actual_duration_minutes} мин.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* AI Assessment Card (Section 6.2 & 6.4) */}
          {(workOrder.ai_verdict || workOrder.ai_notes) && (
            <div className={`p-4 rounded-xl border ${
              workOrder.ai_verdict === 'APPROVED' ? 'bg-emerald-950/30 border-emerald-500/40' :
              workOrder.ai_verdict === 'REWORK_REQUIRED' ? 'bg-rose-950/30 border-rose-500/40' :
              'bg-amber-950/30 border-amber-500/40'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span className="font-extrabold text-sm text-white">Вердикт ИИ-контролёра:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                    workOrder.ai_verdict === 'APPROVED' ? 'bg-emerald-500 text-slate-950' :
                    workOrder.ai_verdict === 'REWORK_REQUIRED' ? 'bg-rose-600 text-white animate-pulse' :
                    'bg-amber-500 text-slate-950'
                  }`}>
                    {workOrder.ai_verdict === 'APPROVED' ? 'ПРИНЯТО' :
                     workOrder.ai_verdict === 'REWORK_REQUIRED' ? 'ТРЕБУЕТ ДОРАБОТКИ' : 'ПРИНЯТО С ЗАМЕЧАНИЯМИ'}
                  </span>
                </div>
                {workOrder.ai_score && (
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Оценка качества</span>
                    <span className="text-lg font-black text-amber-400">{workOrder.ai_score}/100</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-200 leading-relaxed bg-black/20 p-2.5 rounded-lg border border-white/5">
                {workOrder.ai_notes}
              </p>

              {/* Master Decision Section (Section 6.4: Human in the loop) */}
              {currentUserRole === 'MASTER' && (workOrder.status === 'EXECUTED' || workOrder.status === 'REWORK') && (
                <div className="mt-4 pt-3 border-t border-slate-700/80">
                  <span className="text-xs font-bold text-amber-300 block mb-2">
                    Решение мастера смены (финальное слово за человеком):
                  </span>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
                      <span className="text-slate-400">Балл:</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={overrideScore}
                        onChange={(e) => setOverrideScore(Number(e.target.value))}
                        className="w-14 bg-slate-900 border border-slate-600 rounded px-1.5 py-0.5 text-center text-white font-bold"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Комментарий мастера..."
                      value={overrideNotes}
                      onChange={(e) => setOverrideNotes(e.target.value)}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                    />
                    <button
                      onClick={() => handleMasterDecision('APPROVE')}
                      disabled={isSubmitting}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow"
                    >
                      <Check className="w-4 h-4" /> Закрыть наряд
                    </button>
                    <button
                      onClick={() => handleMasterDecision('REWORK')}
                      disabled={isSubmitting}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow"
                    >
                      <RotateCcw className="w-4 h-4" /> На доработку
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Photo Comparison Before & After (Section 6.3) */}
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Фотоконтроль (ДО / ПОСЛЕ):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="border border-slate-700 rounded-xl p-3 bg-slate-800/40 text-center">
                <span className="text-xs font-semibold text-slate-400 block mb-1">
                  Фото неисправности «ДО»
                </span>
                {beforePhoto ? (
                  <img
                    src={beforePhoto.file_path}
                    alt="Before"
                    className="w-full h-36 object-cover rounded-lg border border-slate-600"
                  />
                ) : (
                  <div className="h-36 rounded-lg bg-slate-800 flex items-center justify-center text-xs text-slate-500">
                    Фото «ДО» не прикреплялось
                  </div>
                )}
              </div>

              <div className="border border-slate-700 rounded-xl p-3 bg-slate-800/40 text-center">
                <span className="text-xs font-semibold text-slate-400 block mb-1">
                  Фото устранения «ПОСЛЕ»
                </span>
                {afterPhoto ? (
                  <img
                    src={afterPhoto.file_path}
                    alt="After"
                    className="w-full h-36 object-cover rounded-lg border border-slate-600"
                  />
                ) : (
                  <div className="h-36 rounded-lg bg-slate-800 flex items-center justify-center text-xs text-slate-500">
                    Фото «ПОСЛЕ» отсутствует
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Materials Used */}
          {workOrder.materials?.length > 0 && (
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Списанные материалы и ТМЦ:
              </span>
              <div className="space-y-1">
                {workOrder.materials.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-3 py-2 bg-slate-800/60 rounded-lg text-xs border border-slate-700/60"
                  >
                    <span className="text-slate-200 font-medium">{m.material_name}</span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">
                      {m.quantity} {m.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline / Events History (Section 5.5) */}
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-blue-400" />
              Хронология наряда (кто, что, когда):
            </span>
            <div className="space-y-2 border-l-2 border-slate-700 ml-2 pl-3">
              {workOrder.events?.map((ev) => (
                <div key={ev.id} className="text-xs text-slate-300 relative">
                  <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-slate-900" />
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{ev.user_name || 'Пользователь'}</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-400">
                      {ev.action}
                    </span>
                  </div>
                  {ev.comment && <p className="text-slate-400 mt-0.5">{ev.comment}</p>}
                  {ev.reason && <p className="text-rose-400 mt-0.5 font-semibold">Причина: {ev.reason}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
