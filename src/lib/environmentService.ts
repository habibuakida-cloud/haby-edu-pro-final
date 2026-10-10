import { supabase, resilientUpsert } from './supabaseClient';
import { EnvironmentEquipment, EquipmentUsageLog, EnvironmentOrder, SchoolPurchasedEquipment } from '../types';

const LOCAL_STORAGE_EQUIPMENT_KEY = 'haby_environment_equipment_';
const LOCAL_STORAGE_USAGE_KEY = 'haby_equipment_usage_log_';
const LOCAL_STORAGE_ORDERS_KEY = 'haby_environment_orders_';
const LOCAL_STORAGE_PURCHASES_KEY = 'haby_school_purchases_';

const isValidUuid = (id?: string) => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
};

// Initial Starter Data for Environmental Equipment in Tanzanian Schools
export const DEFAULT_ENVIRONMENT_EQUIPMENT: Omit<EnvironmentEquipment, 'id'>[] = [
  {
    name: 'Jembe la Mkono (Hand Hoe)',
    category: 'Kilimo',
    quantity: 25,
    condition: 'Nzuri',
    location: 'Stoo Kuu ya Mazingira - Shelfu A1',
    purchase_date: '2025-01-15'
  },
  {
    name: 'Reki ya Chuma (Iron Rake)',
    category: 'Usafi',
    quantity: 18,
    condition: 'Nzuri',
    location: 'Stoo ya Mazingira - Shelfu A2',
    purchase_date: '2025-02-10'
  },
  {
    name: 'Fyekeo la Nyasi (Slashing Machete)',
    category: 'Usafi',
    quantity: 15,
    condition: 'Nzuri',
    location: 'Stoo ya Mazingira - Shelfu B1',
    purchase_date: '2025-01-20'
  },
  {
    name: 'Pima Joto la Hewa (Weather Thermometer)',
    category: 'Upimaji Hali ya Hewa',
    quantity: 3,
    condition: 'Inahitaji Matengenezo',
    location: 'Kituo cha Hali ya Hewa Shuleni',
    purchase_date: '2024-08-10'
  },
  {
    name: 'Pima Mvua (Rain Gauge)',
    category: 'Upimaji Hali ya Hewa',
    quantity: 2,
    condition: 'Nzuri',
    location: 'Bustani ya Jiografia na Mazingira',
    purchase_date: '2024-09-01'
  },
  {
    name: 'Pipa la Kumwagilia (Watering Can)',
    category: 'Maji',
    quantity: 12,
    condition: 'Nzuri',
    location: 'Kitalu cha Miche ya Miti',
    purchase_date: '2025-03-05'
  },
  {
    name: 'Kitoroli cha Usafi (Wheelbarrow)',
    category: 'Usafi',
    quantity: 4,
    condition: 'Nzuri',
    location: 'Stoo Kuu ya Mazingira',
    purchase_date: '2024-11-12'
  },
  {
    name: 'Mikasi ya Kupunguzia Maua (Pruning Shears)',
    category: 'Bustani',
    quantity: 6,
    condition: 'Nzuri',
    location: 'Stoo ya Mazingira - Shelfu C1',
    purchase_date: '2025-01-25'
  }
];

export const CATEGORY_PRESETS = [
  'Kilimo',
  'Usafi',
  'Upimaji Hali ya Hewa',
  'Maji',
  'Bustani',
  'Miti na Misitu',
  'Vinginevyo'
];

export const CONDITION_PRESETS: EnvironmentEquipment['condition'][] = [
  'Nzuri',
  'Mbovu',
  'Inahitaji Matengenezo'
];

export const USAGE_STATUS_PRESETS: EquipmentUsageLog['status'][] = [
  'Imetumika',
  'Imerudishwa',
  'Imepotea'
];

function getLocalEquipment(schoolId: string): EnvironmentEquipment[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_EQUIPMENT_KEY}${schoolId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return DEFAULT_ENVIRONMENT_EQUIPMENT.map((item, idx) => ({
    ...item,
    id: `env-eq-${idx + 1}`,
    school_id: schoolId,
    created_at: new Date().toISOString()
  }));
}

function setLocalEquipment(schoolId: string, items: EnvironmentEquipment[]): void {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_EQUIPMENT_KEY}${schoolId}`, JSON.stringify(items));
  } catch (e) {}
}

function getLocalUsageLogs(schoolId: string): EquipmentUsageLog[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_USAGE_KEY}${schoolId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

function setLocalUsageLogs(schoolId: string, logs: EquipmentUsageLog[]): void {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_USAGE_KEY}${schoolId}`, JSON.stringify(logs));
  } catch (e) {}
}

export async function fetchEquipmentList(schoolId: string): Promise<EnvironmentEquipment[]> {
  if (!schoolId) return [];
  const localList = getLocalEquipment(schoolId);

  try {
    const { data, error } = await supabase
      .from('environment_equipment')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (error) return localList;

    if (data && data.length > 0) {
      const formatted: EnvironmentEquipment[] = data.map((d: any) => ({
        id: String(d.id),
        name: d.name || 'Kifaa Kisichojulikana',
        category: d.category || 'Vinginevyo',
        quantity: Number(d.quantity || 0),
        condition: (d.condition || 'Nzuri') as any,
        location: d.location || 'Stoo ya Mazingira',
        purchase_date: d.purchase_date || '',
        added_by: d.added_by || '',
        school_id: d.school_id || schoolId,
        created_at: d.created_at || new Date().toISOString(),
        updated_at: d.updated_at || d.created_at || new Date().toISOString()
      }));
      setLocalEquipment(schoolId, formatted);
      return formatted;
    }
    return localList;
  } catch (err: any) {
    return localList;
  }
}

export async function saveEquipmentItem(
  schoolId: string, 
  item: Partial<EnvironmentEquipment>, 
  teacherId?: string
): Promise<{ data: EnvironmentEquipment | null; error: any }> {
  const currentList = getLocalEquipment(schoolId);
  const now = new Date().toISOString();
  const itemId = item.id || crypto.randomUUID();

  const fullItem: EnvironmentEquipment = {
    id: itemId,
    name: item.name?.trim() || 'Kifaa Kipya',
    category: item.category?.trim() || 'Usafi',
    quantity: Number(item.quantity !== undefined ? item.quantity : 1),
    condition: (item.condition || 'Nzuri') as any,
    location: item.location?.trim() || 'Stoo ya Mazingira',
    purchase_date: item.purchase_date || now.split('T')[0],
    added_by: item.added_by || teacherId || '',
    school_id: schoolId,
    created_at: item.created_at || now,
    updated_at: now
  };

  const existingIndex = currentList.findIndex(e => String(e.id) === String(itemId));
  let updatedList: EnvironmentEquipment[];
  if (existingIndex >= 0) {
    updatedList = [...currentList];
    updatedList[existingIndex] = fullItem;
  } else {
    updatedList = [fullItem, ...currentList];
  }
  setLocalEquipment(schoolId, updatedList);

  try {
    const payload: Record<string, any> = {
      id: itemId,
      name: fullItem.name,
      category: fullItem.category,
      quantity: fullItem.quantity,
      condition: fullItem.condition,
      location: fullItem.location,
      purchase_date: fullItem.purchase_date,
      added_by: fullItem.added_by,
      school_id: schoolId,
      updated_at: now
    };

    const res = await resilientUpsert('environment_equipment', payload, { onConflict: 'id' });
    return { data: fullItem, error: res.error };
  } catch (err: any) {
    return { data: fullItem, error: err };
  }
}

export async function deleteEquipmentItem(schoolId: string, id: string): Promise<boolean> {
  const currentList = getLocalEquipment(schoolId);
  const filtered = currentList.filter(e => String(e.id) !== String(id));
  setLocalEquipment(schoolId, filtered);

  try {
    await supabase.from('environment_equipment').delete().eq('id', id);
  } catch (err) {}
  return true;
}

export async function fetchUsageLogs(schoolId: string): Promise<EquipmentUsageLog[]> {
  if (!schoolId) return [];
  const localLogs = getLocalUsageLogs(schoolId);

  try {
    const { data, error } = await supabase
      .from('equipment_usage_log')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (error) return localLogs;

    if (data && data.length > 0) {
      const formatted: EquipmentUsageLog[] = data.map((d: any) => ({
        id: String(d.id),
        equipment_id: String(d.equipment_id || ''),
        equipment_name: d.equipment_name || '',
        used_by: d.used_by || 'Haijabainishwa',
        quantity_used: Number(d.quantity_used || 1),
        purpose: d.purpose || 'Usafi wa Mazingira',
        date_used: d.date_used || new Date().toISOString().split('T')[0],
        returned_date: d.returned_date || null,
        status: (d.status || 'Imetumika') as any,
        notes: d.notes || '',
        school_id: d.school_id || schoolId,
        created_at: d.created_at || new Date().toISOString()
      }));
      setLocalUsageLogs(schoolId, formatted);
      return formatted;
    }
    return localLogs;
  } catch (err) {
    return localLogs;
  }
}

export async function logUsageEntry(
  schoolId: string, 
  logData: Partial<EquipmentUsageLog>
): Promise<{ data: EquipmentUsageLog | null; error: any }> {
  const currentLogs = getLocalUsageLogs(schoolId);
  const now = new Date().toISOString();
  const logId = logData.id || `usage-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const fullLog: EquipmentUsageLog = {
    id: logId,
    equipment_id: String(logData.equipment_id || ''),
    equipment_name: logData.equipment_name || '',
    used_by: logData.used_by?.trim() || 'Darasa / Mwanafunzi',
    quantity_used: Number(logData.quantity_used || 1),
    purpose: logData.purpose?.trim() || 'Usafi / Mazingira',
    date_used: logData.date_used || now.split('T')[0],
    returned_date: logData.returned_date || null,
    status: (logData.status || 'Imetumika') as any,
    notes: logData.notes?.trim() || '',
    school_id: schoolId,
    created_at: logData.created_at || now
  };

  setLocalUsageLogs(schoolId, [fullLog, ...currentLogs]);

  if (fullLog.status === 'Imetumika') {
    const equipList = getLocalEquipment(schoolId);
    const equipIndex = equipList.findIndex(e => String(e.id) === String(fullLog.equipment_id));
    if (equipIndex >= 0) {
      const currentQ = equipList[equipIndex].quantity;
      const newQ = Math.max(0, currentQ - fullLog.quantity_used);
      equipList[equipIndex] = { ...equipList[equipIndex], quantity: newQ };
      setLocalEquipment(schoolId, equipList);
      saveEquipmentItem(schoolId, equipList[equipIndex]).catch(() => {});
    }
  }

  try {
    const payload: Record<string, any> = {
      id: logId,
      equipment_id: fullLog.equipment_id,
      equipment_name: fullLog.equipment_name,
      used_by: fullLog.used_by,
      quantity_used: fullLog.quantity_used,
      purpose: fullLog.purpose,
      date_used: fullLog.date_used,
      returned_date: fullLog.returned_date,
      status: fullLog.status,
      notes: fullLog.notes,
      school_id: schoolId
    };

    const res = await resilientUpsert('equipment_usage_log', payload, { onConflict: 'id' });
    return { data: fullLog, error: res.error };
  } catch (err: any) {
    return { data: fullLog, error: err };
  }
}

export async function returnEquipmentItem(
  schoolId: string, 
  logId: string, 
  equipmentId: string, 
  quantityToRestore: number,
  notes?: string
): Promise<boolean> {
  const currentLogs = getLocalUsageLogs(schoolId);
  const now = new Date().toISOString();
  const logIndex = currentLogs.findIndex(l => String(l.id) === String(logId));

  if (logIndex >= 0) {
    currentLogs[logIndex] = {
      ...currentLogs[logIndex],
      status: 'Imerudishwa',
      returned_date: now.split('T')[0],
      notes: notes ? `${currentLogs[logIndex].notes ? currentLogs[logIndex].notes + ' | ' : ''}${notes}` : currentLogs[logIndex].notes
    };
    setLocalUsageLogs(schoolId, [...currentLogs]);

    const equipList = getLocalEquipment(schoolId);
    const equipIndex = equipList.findIndex(e => String(e.id) === String(equipmentId));
    if (equipIndex >= 0) {
      equipList[equipIndex] = {
        ...equipList[equipIndex],
        quantity: equipList[equipIndex].quantity + quantityToRestore
      };
      setLocalEquipment(schoolId, equipList);
      saveEquipmentItem(schoolId, equipList[equipIndex]).catch(() => {});
    }

    try {
      const payload: Record<string, any> = {
        id: logId,
        status: 'Imerudishwa',
        returned_date: now.split('T')[0],
        notes: currentLogs[logIndex].notes,
        school_id: schoolId
      };
      await resilientUpsert('equipment_usage_log', payload, { onConflict: 'id' });
    } catch (e) {}

    return true;
  }
  return false;
}

// --- ENVIRONMENT ORDERS (Oda za Wanafunzi) ---

function getLocalOrders(schoolId: string): EnvironmentOrder[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_ORDERS_KEY}${schoolId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

function setLocalOrders(schoolId: string, orders: EnvironmentOrder[]): void {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_ORDERS_KEY}${schoolId}`, JSON.stringify(orders));
  } catch (e) {}
}

export async function fetchEnvironmentOrders(schoolId: string): Promise<EnvironmentOrder[]> {
  if (!schoolId) return [];
  const local = getLocalOrders(schoolId);
  try {
    const { data, error } = await supabase
      .from('environment_orders')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (error) return local;

    if (data && data.length > 0) {
      const formatted: EnvironmentOrder[] = data.map((d: any) => ({
        id: String(d.id),
        student_id: d.student_id || '',
        student_name: d.student_name || '',
        class: d.class || '',
        stream: d.stream || '',
        equipment_name: d.equipment_name || '',
        quantity_ordered: Number(d.quantity_ordered || 1),
        order_date: d.order_date || new Date().toISOString().split('T')[0],
        status: (d.status || 'Imeagizwa') as any,
        notes: d.notes || '',
        ordered_by: d.ordered_by || '',
        school_id: d.school_id || schoolId,
        created_at: d.created_at || new Date().toISOString()
      }));
      setLocalOrders(schoolId, formatted);
      return formatted;
    }
    return local;
  } catch (err) {
    return local;
  }
}

export async function saveEnvironmentOrder(
  schoolId: string,
  order: Partial<EnvironmentOrder>
): Promise<{ data: EnvironmentOrder | null; error: any }> {
  const current = getLocalOrders(schoolId);
  const now = new Date().toISOString();
  const id = order.id || crypto.randomUUID();

  const fullOrder: EnvironmentOrder = {
    id,
    student_id: order.student_id || '',
    student_name: order.student_name || 'Mwanafunzi',
    class: order.class || 'Darasa la 1',
    stream: order.stream || 'Stream A',
    equipment_name: order.equipment_name || 'Kifaa',
    quantity_ordered: Number(order.quantity_ordered || 1),
    order_date: order.order_date || now.split('T')[0],
    status: (order.status || 'Imeagizwa') as any,
    notes: order.notes || '',
    ordered_by: order.ordered_by || '',
    school_id: schoolId,
    created_at: order.created_at || now
  };

  const idx = current.findIndex(o => String(o.id) === String(id));
  let updated: EnvironmentOrder[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = fullOrder;
  } else {
    updated = [fullOrder, ...current];
  }
  setLocalOrders(schoolId, updated);

  try {
    const payload: Record<string, any> = {
      id,
      student_id: fullOrder.student_id,
      student_name: fullOrder.student_name,
      class: fullOrder.class,
      stream: fullOrder.stream,
      equipment_name: fullOrder.equipment_name,
      quantity_ordered: fullOrder.quantity_ordered,
      order_date: fullOrder.order_date,
      status: fullOrder.status,
      notes: fullOrder.notes,
      ordered_by: fullOrder.ordered_by,
      school_id: schoolId
    };

    const res = await resilientUpsert('environment_orders', payload, { onConflict: 'id' });
    return { data: fullOrder, error: res.error };
  } catch (err) {
    return { data: fullOrder, error: err };
  }
}

export async function deleteEnvironmentOrder(schoolId: string, orderId: string): Promise<boolean> {
  const current = getLocalOrders(schoolId);
  const updated = current.filter(o => String(o.id) !== String(orderId));
  setLocalOrders(schoolId, updated);

  try {
    await supabase.from('environment_orders').delete().eq('id', orderId);
  } catch (e) {}

  return true;
}


// --- SCHOOL PURCHASED EQUIPMENT (Manunuzi ya Shule) ---

function getLocalPurchases(schoolId: string): SchoolPurchasedEquipment[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_PURCHASES_KEY}${schoolId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

function setLocalPurchases(schoolId: string, items: SchoolPurchasedEquipment[]): void {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_PURCHASES_KEY}${schoolId}`, JSON.stringify(items));
  } catch (e) {}
}

export async function fetchSchoolPurchasedEquipment(schoolId: string): Promise<SchoolPurchasedEquipment[]> {
  if (!schoolId) return [];
  const local = getLocalPurchases(schoolId);
  try {
    const { data, error } = await supabase
      .from('school_purchased_equipment')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (error) return local;

    if (data && data.length > 0) {
      const formatted: SchoolPurchasedEquipment[] = data.map((d: any) => ({
        id: String(d.id),
        equipment_name: d.equipment_name || '',
        category: d.category || 'Kilimo',
        quantity_bought: Number(d.quantity_bought || 1),
        unit_price: Number(d.unit_price || 0),
        total_cost: Number(d.total_cost || (Number(d.quantity_bought || 1) * Number(d.unit_price || 0))),
        supplier: d.supplier || '',
        purchase_date: d.purchase_date || new Date().toISOString().split('T')[0],
        receipt_number: d.receipt_number || '',
        condition: (d.condition || 'Nzuri') as any,
        storage_location: d.storage_location || '',
        school_id: d.school_id || schoolId,
        added_by: d.added_by || '',
        created_at: d.created_at || new Date().toISOString()
      }));
      setLocalPurchases(schoolId, formatted);
      return formatted;
    }
    return local;
  } catch (err) {
    return local;
  }
}

export async function saveSchoolPurchasedItem(
  schoolId: string,
  item: Partial<SchoolPurchasedEquipment>
): Promise<{ data: SchoolPurchasedEquipment | null; error: any }> {
  const current = getLocalPurchases(schoolId);
  const now = new Date().toISOString();
  const id = item.id || crypto.randomUUID();

  const qty = Number(item.quantity_bought || 1);
  const price = Number(item.unit_price || 0);
  const total = Number(item.total_cost || (qty * price));

  const fullItem: SchoolPurchasedEquipment = {
    id,
    equipment_name: item.equipment_name || 'Kifaa Kilichonunuliwa',
    category: item.category || 'Kilimo',
    quantity_bought: qty,
    unit_price: price,
    total_cost: total,
    supplier: item.supplier || '',
    purchase_date: item.purchase_date || now.split('T')[0],
    receipt_number: item.receipt_number || '',
    condition: (item.condition || 'Nzuri') as any,
    storage_location: item.storage_location || 'Stoo Kuu',
    school_id: schoolId,
    added_by: item.added_by || '',
    created_at: item.created_at || now
  };

  const idx = current.findIndex(p => String(p.id) === String(id));
  let updated: SchoolPurchasedEquipment[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = fullItem;
  } else {
    updated = [fullItem, ...current];
  }
  setLocalPurchases(schoolId, updated);

  try {
    const payload: Record<string, any> = {
      id,
      equipment_name: fullItem.equipment_name,
      category: fullItem.category,
      quantity_bought: fullItem.quantity_bought,
      unit_price: fullItem.unit_price,
      total_cost: fullItem.total_cost,
      supplier: fullItem.supplier,
      purchase_date: fullItem.purchase_date,
      receipt_number: fullItem.receipt_number,
      condition: fullItem.condition,
      storage_location: fullItem.storage_location,
      school_id: schoolId,
      added_by: fullItem.added_by
    };

    const res = await resilientUpsert('school_purchased_equipment', payload, { onConflict: 'id' });
    return { data: fullItem, error: res.error };
  } catch (err) {
    return { data: fullItem, error: err };
  }
}

export async function deleteSchoolPurchasedItem(schoolId: string, itemId: string): Promise<boolean> {
  const current = getLocalPurchases(schoolId);
  const updated = current.filter(p => String(p.id) !== String(itemId));
  setLocalPurchases(schoolId, updated);

  try {
    await supabase.from('school_purchased_equipment').delete().eq('id', itemId);
  } catch (e) {}

  return true;
}
