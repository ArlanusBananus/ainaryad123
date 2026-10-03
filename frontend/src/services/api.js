const BASE_URL = '/api';

export async function fetchWorkOrders(filters = {}) {
  const params = new URLSearchParams();
  if (filters.executor_id) params.append('executor_id', filters.executor_id);
  if (filters.status) params.append('status', filters.status);
  if (filters.priority) params.append('priority', filters.priority);
  if (filters.location_id) params.append('location_id', filters.location_id);
  
  const res = await fetch(`${BASE_URL}/work-orders?${params.toString()}`);
  if (!res.ok) throw new Error('Ошибка загрузки нарядов');
  return res.json();
}

export async function fetchWorkOrderDetail(orderId) {
  const res = await fetch(`${BASE_URL}/work-orders/${orderId}`);
  if (!res.ok) throw new Error('Ошибка загрузки деталей наряда');
  return res.json();
}

export async function createWorkOrder(data) {
  const res = await fetch(`${BASE_URL}/work-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Ошибка создания наряда');
  }
  return res.json();
}

export async function updateWorkOrderStatus(orderId, statusData) {
  const res = await fetch(`${BASE_URL}/work-orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(statusData)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Ошибка смены статуса');
  }
  return res.json();
}

export async function closeWorkOrder(orderId, closeData) {
  const res = await fetch(`${BASE_URL}/work-orders/${orderId}/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(closeData)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Ошибка закрытия наряда');
  }
  return res.json();
}

export async function masterOverrideAI(orderId, payload) {
  const res = await fetch(`${BASE_URL}/work-orders/${orderId}/override-ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Ошибка подтверждения мастером');
  return res.json();
}

export async function uploadPhoto(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE_URL}/work-orders/upload-photo`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error('Ошибка загрузки фото');
  return res.json();
}

export async function fetchUsers(role) {
  const url = role ? `${BASE_URL}/users?role=${role}` : `${BASE_URL}/users`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Ошибка загрузки пользователей');
  return res.json();
}

export async function updateUserStatus(userId, status) {
  const res = await fetch(`${BASE_URL}/users/${userId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (!res.ok) throw new Error('Ошибка обновления статуса сотрудника');
  return res.json();
}

export async function fetchExecutorRecommendations(equipmentId, problemText = '') {
  const params = new URLSearchParams({
    equipment_id: equipmentId,
    problem_text: problemText
  });
  const res = await fetch(`${BASE_URL}/users/recommendations?${params.toString()}`);
  if (!res.ok) throw new Error('Ошибка получения рекомендаций ИИ');
  return res.json();
}

export async function fetchLocations() {
  const res = await fetch(`${BASE_URL}/locations`);
  if (!res.ok) throw new Error('Ошибка загрузки участков');
  return res.json();
}

export async function fetchEquipment(locationId) {
  const url = locationId ? `${BASE_URL}/equipment?location_id=${locationId}` : `${BASE_URL}/equipment`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Ошибка загрузки оборудования');
  return res.json();
}

export async function fetchMalfunctionCodes() {
  const res = await fetch(`${BASE_URL}/catalogs/malfunctions`);
  if (!res.ok) throw new Error('Ошибка загрузки шифров неисправностей');
  return res.json();
}

export async function fetchMaterials() {
  const res = await fetch(`${BASE_URL}/catalogs/materials`);
  if (!res.ok) throw new Error('Ошибка загрузки материалов');
  return res.json();
}

export async function fetchShiftAnalytics() {
  const res = await fetch(`${BASE_URL}/analytics/shift`);
  if (!res.ok) throw new Error('Ошибка загрузки аналитики смены');
  return res.json();
}

export async function fetchAnomalies() {
  const res = await fetch(`${BASE_URL}/analytics/anomalies`);
  if (!res.ok) throw new Error('Ошибка загрузки аномалий');
  return res.json();
}

export async function fetchWorkersRating() {
  const res = await fetch(`${BASE_URL}/analytics/workers-rating`);
  if (!res.ok) throw new Error('Ошибка загрузки рейтинга');
  return res.json();
}

export async function triggerCheckDeadlines() {
  const res = await fetch(`${BASE_URL}/analytics/check-deadlines`);
  if (!res.ok) throw new Error('Ошибка контроля сроков');
  return res.json();
}
