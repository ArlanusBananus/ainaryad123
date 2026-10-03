import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Camera, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  User, 
  Zap, 
  Flame,
  Send
} from 'lucide-react';
import { fetchExecutorRecommendations, uploadPhoto } from '../services/api';

const QUICK_TEMPLATES = [
  { label: 'Течь масла насоса', text: 'Критическая утечка масла в районе торцевого уплотнения насоса. Риск перегрева.', priority: 'EMERGENCY', type: 'EMERGENCY', hours: 1.5 },
  { label: 'Перегрев подшипника', text: 'Вибрация и повышенный нагрев подшипникового узла привода. Требуется ревизия.', priority: 'HIGH', type: 'PLANNED', hours: 2.0 },
  { label: 'Порыв / сход ленты', text: 'Сход конвейерной ленты с роликоопор, повреждение боковой кромки.', priority: 'EMERGENCY', type: 'EMERGENCY', hours: 3.0 },
  { label: 'Срабатывание автомата', text: 'Электродвигатель отключился по токовой перегрузке. Проверить пускатель и обмотки.', priority: 'HIGH', type: 'PLANNED', hours: 1.0 },
  { label: 'Замена скребка ленты', text: 'Износ полиуретанового скребка первичной очистки конвейера.', priority: 'NORMAL', type: 'PLANNED', hours: 1.0 },
  { label: 'Протяжка болтов станины', text: 'Плановая ревизия и протяжка анкерных и соединительных болтов агрегата.', priority: 'PLANNED', type: 'PLANNED', hours: 1.5 }
];

export default function CreateWorkOrderModal({
  isOpen,
  onClose,
  locations,
  equipmentList,
  users,
  masterId,
  onSubmit
}) {
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [orderType, setOrderType] = useState('EMERGENCY');
  const [priority, setPriority] = useState('EMERGENCY');
  const [description, setDescription] = useState('');
  const [selectedExecutorId, setSelectedExecutorId] = useState('');
  const [standardHours, setStandardHours] = useState(1.5);
  const [deadlineMinutes, setDeadlineMinutes] = useState(90);
  const [photoUrl, setPhotoUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [aiCandidates, setAiCandidates] = useState([]);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filter equipment by selected location
  const filteredEquipment = equipmentList.filter(
    (e) => !selectedLocationId || e.location_id === Number(selectedLocationId)
  );

  // Auto-fetch AI recommendations when equipment or description changes
  useEffect(() => {
    if (selectedEquipmentId) {
      setIsLoadingAi(true);
      fetchExecutorRecommendations(selectedEquipmentId, description)
        .then((res) => {
          setAiCandidates(res);
          // If no executor is manually selected yet, auto-select top AI match
          if (res.length > 0 && !selectedExecutorId) {
            setSelectedExecutorId(res[0].user_id);
          }
        })
        .catch((err) => console.error('AI rec error:', err))
        .finally(() => setIsLoadingAi(false));
    }
  }, [selectedEquipmentId, description]);

  // Handle template selection (fast 1-click filling)
  const applyTemplate = (tpl) => {
    setDescription(tpl.text);
    setPriority(tpl.priority);
    setOrderType(tpl.type);
    setStandardHours(tpl.hours);
    setDeadlineMinutes(Math.round(tpl.hours * 60));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const res = await uploadPhoto(file);
      setPhotoUrl(res.photo_url);
    } catch (err) {
      alert('Ошибка при загрузке фото');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLocationId || !selectedEquipmentId || !selectedExecutorId || !description.trim()) {
      alert('Пожалуйста, заполните все обязательные поля');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        location_id: Number(selectedLocationId),
        equipment_id: Number(selectedEquipmentId),
        executor_id: Number(selectedExecutorId),
        master_id: masterId || 1,
        order_type: orderType,
        priority: priority,
        description: description.trim(),
        standard_hours: Number(standardHours),
        deadline_minutes: Number(deadlineMinutes),
        before_photo_url: photoUrl || null
      });
      onClose();
    } catch (err) {
      alert(err.message || 'Ошибка создания наряда');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-white">
                Быстрая выдача наряда <span className="text-amber-400 text-sm font-normal">(за 1 минуту / 6 кликов)</span>
              </h2>
              <p className="text-xs text-slate-400">Форма мастера смены с автоподбором исполнителя от ИИ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Quick Problem Templates */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
              Быстрый шаблон поломки (1 клик):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TEMPLATES.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-blue-600/30 hover:border-blue-500/50 text-slate-300 hover:text-white border border-slate-700 transition"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* 1. Location & 2. Equipment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-blue-500/30 text-blue-300 text-[10px] flex items-center justify-center font-bold">1</span>
                Участок *
              </label>
              <select
                value={selectedLocationId}
                onChange={(e) => {
                  setSelectedLocationId(e.target.value);
                  setSelectedEquipmentId('');
                }}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Выберите участок...</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-blue-500/30 text-blue-300 text-[10px] flex items-center justify-center font-bold">2</span>
                Оборудование *
              </label>
              <select
                value={selectedEquipmentId}
                onChange={(e) => setSelectedEquipmentId(e.target.value)}
                required
                disabled={!selectedLocationId}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
              >
                <option value="">Выберите оборудование...</option>
                {filteredEquipment.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.name} ({eq.inventory_number}) • {eq.criticality}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Priority & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-blue-500/30 text-blue-300 text-[10px] flex items-center justify-center font-bold">3</span>
                Приоритет наряда *
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'EMERGENCY', label: 'Аварийный', color: 'border-rose-500/60 bg-rose-500/20 text-rose-300' },
                  { id: 'HIGH', label: 'Высокий', color: 'border-amber-500/60 bg-amber-500/20 text-amber-300' },
                  { id: 'NORMAL', label: 'Обычный', color: 'border-blue-500/60 bg-blue-500/20 text-blue-300' },
                  { id: 'PLANNED', label: 'Плановый', color: 'border-slate-500/60 bg-slate-700/40 text-slate-300' }
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPriority(p.id);
                      setOrderType(p.id === 'EMERGENCY' ? 'EMERGENCY' : 'PLANNED');
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                      priority === p.id ? p.color + ' ring-2 ring-white/20' : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Норматив времени / Срок
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">Норматив (часы):</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="12"
                    value={standardHours}
                    onChange={(e) => {
                      const h = Number(e.target.value);
                      setStandardHours(h);
                      setDeadlineMinutes(Math.round(h * 60));
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">Срок наряда (мин):</span>
                  <input
                    type="number"
                    step="15"
                    min="15"
                    value={deadlineMinutes}
                    onChange={(e) => setDeadlineMinutes(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Description */}
          <div>
            <label className="text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-blue-500/30 text-blue-300 text-[10px] flex items-center justify-center font-bold">4</span>
                Описание проблемы и работ *
              </span>
              <span className="text-[11px] text-amber-400 font-normal flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> ИИ анализирует текст
              </span>
            </label>
            <textarea
              rows={2}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опишите неисправность (например: течь масла через сальник насоса или обрыв ленты)..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* 5. Executor with AI recommendation badge */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-blue-500/30 text-blue-300 text-[10px] flex items-center justify-center font-bold">5</span>
                Назначить исполнителя *
              </label>
              {isLoadingAi && (
                <span className="text-xs text-amber-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" /> Подбор ИИ...
                </span>
              )}
            </div>

            {/* AI Top Candidate Banner */}
            {aiCandidates.length > 0 && (
              <div className="mb-2 p-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-indigo-500/10 border border-amber-500/30 flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-300">ИИ рекомендует:</span>
                    <span className="text-white font-semibold">{aiCandidates[0].full_name}</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200 text-[10px] font-bold">
                      {aiCandidates[0].match_score}% соответствие
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-0.5">{aiCandidates[0].reason}</p>
                </div>
              </div>
            )}

            {/* Executor Selector */}
            <select
              value={selectedExecutorId}
              onChange={(e) => setSelectedExecutorId(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Выберите исполнителя...</option>
              {(aiCandidates.length > 0 ? aiCandidates : users.filter((u) => u.role === 'EXECUTOR')).map((cand) => {
                const uid = cand.user_id || cand.id;
                const userObj = users.find((u) => u.id === uid) || cand;
                const statusColor = 
                  userObj.current_status === 'FREE' ? '🟢 Свободен' :
                  userObj.current_status === 'BUSY' ? '🟡 В работе' :
                  userObj.current_status === 'HAS_QUEUE' ? '🔵 В очереди' : '⚪ Не на смене';

                return (
                  <option key={uid} value={uid}>
                    {userObj.full_name} ({userObj.specialty} • {statusColor}) {cand.match_score ? `[ИИ: ${cand.match_score}%]` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* 6. Photo "Before" (Optional) */}
          <div className="border border-dashed border-slate-700 rounded-xl p-3 bg-slate-800/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-300">Фото неисправности «ДО» (опционально)</span>
              </div>
              <label className="cursor-pointer px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-semibold text-white transition">
                {isUploadingPhoto ? 'Загрузка...' : photoUrl ? '✓ Фото прикреплено' : 'Прикрепить фото'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
            {photoUrl && (
              <div className="mt-2 flex items-center gap-2">
                <img src={photoUrl} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-slate-600" />
                <span className="text-xs text-emerald-400 font-medium">Фото загружено и готово к анализу ИИ</span>
              </div>
            )}
          </div>

          {/* Footer Submit Button (6th Click) */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="touch-btn-lg w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-base shadow-xl shadow-blue-600/30"
            >
              {submitting ? (
                <span>Выдача наряда...</span>
              ) : (
                <>
                  <Send className="w-5 h-5 text-amber-400" />
                  <span>ВЫДАТЬ НАРЯД ИСПОЛНИТЕЛЮ (6-й клик)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
