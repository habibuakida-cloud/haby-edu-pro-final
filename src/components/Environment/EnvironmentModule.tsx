import React, { useState, useEffect, useMemo } from 'react';
import { 
  Leaf, 
  Sprout, 
  Package, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  ArrowUpRight, 
  ArrowDownLeft, 
  X, 
  ShieldAlert, 
  FileSpreadsheet, 
  Info,
  Calendar,
  MapPin,
  Tag,
  Layers,
  FileCheck,
  ShoppingCart,
  ClipboardList,
  DollarSign,
  UserCheck
} from 'lucide-react';
import { EnvironmentEquipment, EquipmentUsageLog, EnvironmentOrder, SchoolPurchasedEquipment, UserAccount, SchoolInfo, Student, StreamSetting } from '../../types';
import { 
  fetchEquipmentList, 
  saveEquipmentItem, 
  deleteEquipmentItem, 
  fetchUsageLogs, 
  logUsageEntry, 
  returnEquipmentItem,
  fetchEnvironmentOrders,
  saveEnvironmentOrder,
  deleteEnvironmentOrder,
  fetchSchoolPurchasedEquipment,
  saveSchoolPurchasedItem,
  deleteSchoolPurchasedItem,
  CATEGORY_PRESETS,
  CONDITION_PRESETS,
  USAGE_STATUS_PRESETS
} from '../../lib/environmentService';

interface EnvironmentModuleProps {
  currentUser?: UserAccount | null;
  schoolInfo?: SchoolInfo;
  students?: Student[];
  streamSettings?: StreamSetting[];
}

export const EnvironmentModule: React.FC<EnvironmentModuleProps> = ({
  currentUser,
  schoolInfo,
  students = [],
  streamSettings = []
}) => {
  // 4 Tabs: 'inventory' | 'orders' | 'purchases' | 'usage'
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'purchases' | 'usage'>('inventory');

  // Data states
  const [equipmentList, setEquipmentList] = useState<EnvironmentEquipment[]>([]);
  const [usageLogs, setUsageLogs] = useState<EquipmentUsageLog[]>([]);
  const [ordersList, setOrdersList] = useState<EnvironmentOrder[]>([]);
  const [purchasesList, setPurchasesList] = useState<SchoolPurchasedEquipment[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedCondition, setSelectedCondition] = useState<string>('ALL');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [selectedStreamFilter, setSelectedStreamFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Modals
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState<boolean>(false);
  const [editingEquipment, setEditingEquipment] = useState<EnvironmentEquipment | null>(null);

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);
  const [checkoutTargetEquipment, setCheckoutTargetEquipment] = useState<EnvironmentEquipment | null>(null);

  const [isReturnModalOpen, setIsReturnModalOpen] = useState<boolean>(false);
  const [returnTargetLog, setReturnTargetLog] = useState<EquipmentUsageLog | null>(null);
  const [returnNotes, setReturnNotes] = useState<string>('');

  // Order Form Modal / Inline State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState<boolean>(false);
  const [editingOrder, setEditingOrder] = useState<EnvironmentOrder | null>(null);
  const [orderStudentId, setOrderStudentId] = useState<string>('');
  const [orderStudentName, setOrderStudentName] = useState<string>('');
  const [orderClass, setOrderClass] = useState<string>('Darasa la 1');
  const [orderStream, setOrderStream] = useState<string>('Stream A');
  const [orderEquipmentName, setOrderEquipmentName] = useState<string>('');
  const [orderQuantity, setOrderQuantity] = useState<number>(1);
  const [orderDate, setOrderDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [orderStatus, setOrderStatus] = useState<EnvironmentOrder['status']>('Imeagizwa');
  const [orderNotes, setOrderNotes] = useState<string>('');

  // Purchase Form Modal / State
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState<boolean>(false);
  const [editingPurchase, setEditingPurchase] = useState<SchoolPurchasedEquipment | null>(null);
  const [purName, setPurName] = useState<string>('');
  const [purCategory, setPurCategory] = useState<string>('Kilimo');
  const [purQty, setPurQty] = useState<number>(1);
  const [purUnitPrice, setPurUnitPrice] = useState<number>(0);
  const [purSupplier, setPurSupplier] = useState<string>('');
  const [purDate, setPurDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [purReceipt, setPurReceipt] = useState<string>('');
  const [purCondition, setPurCondition] = useState<EnvironmentEquipment['condition']>('Nzuri');
  const [purLocation, setPurLocation] = useState<string>('Stoo Kuu ya Mazingira');

  // Form states for Equipment Stock
  const [formName, setFormName] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('Usafi');
  const [formCustomCategory, setFormCustomCategory] = useState<string>('');
  const [formQuantity, setFormQuantity] = useState<number>(1);
  const [formCondition, setFormCondition] = useState<EnvironmentEquipment['condition']>('Nzuri');
  const [formLocation, setFormLocation] = useState<string>('Stoo ya Mazingira');
  const [formPurchaseDate, setFormPurchaseDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Form states for Usage
  const [checkoutUsedBy, setCheckoutUsedBy] = useState<string>('');
  const [checkoutQuantity, setCheckoutQuantity] = useState<number>(1);
  const [checkoutPurpose, setCheckoutPurpose] = useState<string>('Usafi wa Mazingira ya Shule');
  const [checkoutDate, setCheckoutDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [checkoutNotes, setCheckoutNotes] = useState<string>('');

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const schoolId = currentUser?.schoolId || (schoolInfo as any)?.id || '02dff10d-78fb-4af6-ab5a-db1d275d7e06';

  // Role permissions check
  const role = currentUser?.role?.toUpperCase() || 'TEACHER';
  const roleTitle = (currentUser?.fullName || '').toLowerCase();
  const isSuperAdmin = currentUser?.isSuperAdmin || role === 'SUPER_ADMIN';
  const isHeadmaster = role === 'HEADMASTER' || role === 'ACADEMIC';
  const isEnvironmentTeacher = 
    role === 'ENVIRONMENT_TEACHER' || 
    roleTitle.includes('mazingira') || 
    roleTitle.includes('environment') ||
    isSuperAdmin || 
    isHeadmaster;

  const canManage = isEnvironmentTeacher || isHeadmaster || isSuperAdmin;

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load all data on mount
  const loadData = async (showLoadingState = true) => {
    if (showLoadingState) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const [equip, logs, ords, purs] = await Promise.all([
        fetchEquipmentList(schoolId),
        fetchUsageLogs(schoolId),
        fetchEnvironmentOrders(schoolId),
        fetchSchoolPurchasedEquipment(schoolId)
      ]);
      setEquipmentList(equip);
      setUsageLogs(logs);
      setOrdersList(ords);
      setPurchasesList(purs);
    } catch (e) {
      console.warn("Failed to load environment data:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolId]);

  // Available Classes & Streams from streamSettings or students
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    streamSettings.forEach(s => { if (s.className) set.add(s.className); });
    students.forEach(s => { if (s.className) set.add(s.className); });
    if (set.size === 0) {
      ['Darasa la 1', 'Darasa la 2', 'Darasa la 3', 'Darasa la 4', 'Darasa la 5', 'Darasa la 6', 'Darasa la 7'].forEach(c => set.add(c));
    }
    return Array.from(set);
  }, [streamSettings, students]);

  const availableStreams = useMemo(() => {
    const set = new Set<string>();
    streamSettings.forEach(s => {
      if (s.className === orderClass && s.streams) {
        s.streams.forEach(st => set.add(st));
      }
    });
    students.forEach(s => {
      if (s.className === orderClass && s.stream) set.add(s.stream);
    });
    if (set.size === 0) {
      ['Stream A', 'Stream B', 'Stream C'].forEach(st => set.add(st));
    }
    return Array.from(set);
  }, [streamSettings, students, orderClass]);

  // Students filtered by selected orderClass & orderStream
  const filteredStudentsForOrder = useMemo(() => {
    return students.filter(s => {
      const matchesClass = !orderClass || s.className === orderClass;
      const matchesStream = !orderStream || !s.stream || s.stream === orderStream;
      return matchesClass && matchesStream;
    });
  }, [students, orderClass, orderStream]);

  // Statistics calculations
  const stats = useMemo(() => {
    const totalItems = equipmentList.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
    const goodConditionCount = equipmentList
      .filter(e => e.condition === 'Nzuri')
      .reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
    const brokenOrRepairCount = equipmentList
      .filter(e => e.condition === 'Mbovu' || e.condition === 'Inahitaji Matengenezo')
      .reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

    const activeLentOut = usageLogs
      .filter(l => l.status === 'Imetumika')
      .reduce((acc, curr) => acc + (Number(curr.quantity_used) || 0), 0);

    const totalOrdersCount = ordersList.length;
    const pendingOrdersCount = ordersList.filter(o => o.status === 'Imeagizwa' || o.status === 'Haijaja').length;

    const totalPurchasesCost = purchasesList.reduce((acc, curr) => acc + (Number(curr.total_cost) || 0), 0);
    const totalPurchasesQty = purchasesList.reduce((acc, curr) => acc + (Number(curr.quantity_bought) || 0), 0);

    const lowStockItems = equipmentList.filter(e => e.quantity < 5);

    return {
      totalItems,
      equipmentTypesCount: equipmentList.length,
      goodConditionCount,
      brokenOrRepairCount,
      activeLentOut,
      totalOrdersCount,
      pendingOrdersCount,
      totalPurchasesCost,
      totalPurchasesQty,
      lowStockItems
    };
  }, [equipmentList, usageLogs, ordersList, purchasesList]);

  // Handlers for Equipment CRUD
  const handleOpenAddModal = () => {
    setEditingEquipment(null);
    setFormName('');
    setFormCategory('Usafi');
    setFormCustomCategory('');
    setFormQuantity(1);
    setFormCondition('Nzuri');
    setFormLocation('Stoo ya Mazingira');
    setFormPurchaseDate(new Date().toISOString().split('T')[0]);
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (item: EnvironmentEquipment) => {
    setEditingEquipment(item);
    setFormName(item.name);
    const isPreset = CATEGORY_PRESETS.includes(item.category);
    if (isPreset) {
      setFormCategory(item.category);
      setFormCustomCategory('');
    } else {
      setFormCategory('Vinginevyo');
      setFormCustomCategory(item.category);
    }
    setFormQuantity(item.quantity);
    setFormCondition(item.condition);
    setFormLocation(item.location || 'Stoo ya Mazingira');
    setFormPurchaseDate(item.purchase_date || new Date().toISOString().split('T')[0]);
    setIsAddEditModalOpen(true);
  };

  const handleSaveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast("Tafadhali ingiza jina la kifaa", "error");
      return;
    }

    const cat = formCategory === 'Vinginevyo' && formCustomCategory.trim() ? formCustomCategory.trim() : formCategory;

    const payload: Partial<EnvironmentEquipment> = {
      id: editingEquipment ? editingEquipment.id : undefined,
      name: formName.trim(),
      category: cat,
      quantity: Number(formQuantity),
      condition: formCondition,
      location: formLocation.trim(),
      purchase_date: formPurchaseDate,
      added_by: currentUser?.fullName || 'Mwalimu wa Mazingira',
      school_id: schoolId
    };

    const { error } = await saveEquipmentItem(schoolId, payload, currentUser?.id);
    if (error) {
      showToast("Imeshindikana kuhifadhi kifaa", "error");
    } else {
      showToast(editingEquipment ? "Kifaa kimehaririwa mafanikio!" : "Kifaa kipya kimeongezwa mafanikio!");
      setIsAddEditModalOpen(false);
      loadData(false);
    }
  };

  const handleDeleteEquipment = async (id: string) => {
    if (!window.confirm("Je, una uhakika unataka kufuta kifaa hiki?")) return;
    const success = await deleteEquipmentItem(schoolId, id);
    if (success) {
      showToast("Kifaa kimefutwa", "success");
      loadData(false);
    } else {
      showToast("Imeshindikana kufuta kifaa", "error");
    }
  };

  // Handlers for Orders CRUD
  const handleOpenOrderModal = (order?: EnvironmentOrder) => {
    if (order) {
      setEditingOrder(order);
      setOrderStudentId(order.student_id || '');
      setOrderStudentName(order.student_name || '');
      setOrderClass(order.class || availableClasses[0] || 'Darasa la 1');
      setOrderStream(order.stream || 'Stream A');
      setOrderEquipmentName(order.equipment_name || '');
      setOrderQuantity(order.quantity_ordered || 1);
      setOrderDate(order.order_date || new Date().toISOString().split('T')[0]);
      setOrderStatus(order.status || 'Imeagizwa');
      setOrderNotes(order.notes || '');
    } else {
      setEditingOrder(null);
      setOrderStudentId('');
      setOrderStudentName('');
      setOrderClass(availableClasses[0] || 'Darasa la 1');
      setOrderStream('Stream A');
      setOrderEquipmentName('');
      setOrderQuantity(1);
      setOrderDate(new Date().toISOString().split('T')[0]);
      setOrderStatus('Imeagizwa');
      setOrderNotes('');
    }
    setIsOrderModalOpen(true);
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderStudentName.trim() || !orderEquipmentName.trim()) {
      showToast("Tafadhali jaza jina la mwanafunzi na kifaa kilichoagizwa", "error");
      return;
    }

    const payload: Partial<EnvironmentOrder> = {
      id: editingOrder ? editingOrder.id : undefined,
      student_id: orderStudentId,
      student_name: orderStudentName.trim(),
      class: orderClass,
      stream: orderStream,
      equipment_name: orderEquipmentName.trim(),
      quantity_ordered: Number(orderQuantity),
      order_date: orderDate,
      status: orderStatus,
      notes: orderNotes.trim(),
      ordered_by: currentUser?.fullName || 'Mwalimu',
      school_id: schoolId
    };

    const { error } = await saveEnvironmentOrder(schoolId, payload);
    if (error) {
      showToast("Imeshindikana kuhifadhi oda", "error");
    } else {
      showToast("Oda ya mwanafunzi imehifadhiwa kikamilifu!");
      setIsOrderModalOpen(false);
      loadData(false);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!window.confirm("Futa oda hii?")) return;
    await deleteEnvironmentOrder(schoolId, id);
    showToast("Oda imefutwa", "success");
    loadData(false);
  };

  // Handlers for Purchases CRUD
  const handleOpenPurchaseModal = (purchase?: SchoolPurchasedEquipment) => {
    if (purchase) {
      setEditingPurchase(purchase);
      setPurName(purchase.equipment_name);
      setPurCategory(purchase.category);
      setPurQty(purchase.quantity_bought);
      setPurUnitPrice(purchase.unit_price);
      setPurSupplier(purchase.supplier || '');
      setPurDate(purchase.purchase_date);
      setPurReceipt(purchase.receipt_number || '');
      setPurCondition(purchase.condition);
      setPurLocation(purchase.storage_location || '');
    } else {
      setEditingPurchase(null);
      setPurName('');
      setPurCategory('Kilimo');
      setPurQty(1);
      setPurUnitPrice(0);
      setPurSupplier('');
      setPurDate(new Date().toISOString().split('T')[0]);
      setPurReceipt('');
      setPurCondition('Nzuri');
      setPurLocation('Stoo Kuu ya Mazingira');
    }
    setIsPurchaseModalOpen(true);
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purName.trim()) {
      showToast("Tafadhali ingiza jina la kifaa kilichonunuliwa", "error");
      return;
    }

    const qty = Number(purQty) || 1;
    const price = Number(purUnitPrice) || 0;
    const totalCost = qty * price;

    const payload: Partial<SchoolPurchasedEquipment> = {
      id: editingPurchase ? editingPurchase.id : undefined,
      equipment_name: purName.trim(),
      category: purCategory,
      quantity_bought: qty,
      unit_price: price,
      total_cost: totalCost,
      supplier: purSupplier.trim(),
      purchase_date: purDate,
      receipt_number: purReceipt.trim(),
      condition: purCondition,
      storage_location: purLocation.trim(),
      added_by: currentUser?.fullName || 'Mwalimu',
      school_id: schoolId
    };

    const { error } = await saveSchoolPurchasedItem(schoolId, payload);
    if (error) {
      showToast("Imeshindikana kuhifadhi manunuzi", "error");
    } else {
      showToast("Manunuzi yamehifadhiwa mafanikio!");
      setIsPurchaseModalOpen(false);
      loadData(false);
    }
  };

  const handleDeletePurchase = async (id: string) => {
    if (!window.confirm("Futa kumbukumbu hii ya manunuzi?")) return;
    await deleteSchoolPurchasedItem(schoolId, id);
    showToast("Manunuzi yamefutwa", "success");
    loadData(false);
  };

  // Export Purchases PDF Report
  const handlePrintPurchasesReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ripoti ya Manunuzi ya Vifaa vya Mazingira</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h2 { text-align: center; color: #0f2948; margin-bottom: 5px; }
          p.subtitle { text-align: center; font-size: 14px; color: #555; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
          th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; }
          th { background-color: #1f4d8b; color: white; }
          .total-box { margin-top: 20px; text-align: right; font-size: 15px; font-weight: bold; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 13px; }
        </style>
      </head>
      <body>
        <h2>${schoolInfo?.name || 'HABY EDU PRO SCHOOL'}</h2>
        <p class="subtitle">RIPOTI YA MANUNUZI YA VIFAA VYA MAZINGIRA</p>
        <p>Tarehe ya Ripoti: ${new Date().toLocaleDateString()}</p>
        <table>
          <thead>
            <tr>
              <th>Na.</th>
              <th>Jina la Kifaa</th>
              <th>Aina (Category)</th>
              <th>Idadi</th>
              <th>Bei ya Moja (TZS)</th>
              <th>Jumla (TZS)</th>
              <th>Mtoa Huduma / Muuzaji</th>
              <th>Tarehe</th>
            </tr>
          </thead>
          <tbody>
            ${purchasesList.map((p, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td><b>${p.equipment_name}</b></td>
                <td>${p.category}</td>
                <td>${p.quantity_bought}</td>
                <td>${Number(p.unit_price).toLocaleString()}</td>
                <td><b>${Number(p.total_cost).toLocaleString()}</b></td>
                <td>${p.supplier || '-'}</td>
                <td>${p.purchase_date}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="total-box">
          Jumla Kuu ya Gharama za Manunuzi: TZS ${stats.totalPurchasesCost.toLocaleString()}
        </div>
        <div class="footer">
          <div>Imetayarishwa na: ${currentUser?.fullName || 'Mwalimu wa Mazingira'}</div>
          <div>Sahihi: _______________________</div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Filtered Inventory List
  const filteredInventory = useMemo(() => {
    return equipmentList.filter(item => {
      const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.location?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchesCond = selectedCondition === 'ALL' || item.condition === selectedCondition;
      return matchesSearch && matchesCat && matchesCond;
    });
  }, [equipmentList, searchQuery, selectedCategory, selectedCondition]);

  // Filtered Orders List
  const filteredOrders = useMemo(() => {
    return ordersList.filter(o => {
      const matchesSearch = !searchQuery || o.student_name.toLowerCase().includes(searchQuery.toLowerCase()) || o.equipment_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClass = selectedClassFilter === 'ALL' || o.class === selectedClassFilter;
      const matchesStream = selectedStreamFilter === 'ALL' || o.stream === selectedStreamFilter;
      const matchesStatus = selectedStatusFilter === 'ALL' || o.status === selectedStatusFilter;
      return matchesSearch && matchesClass && matchesStream && matchesStatus;
    });
  }, [ordersList, searchQuery, selectedClassFilter, selectedStreamFilter, selectedStatusFilter]);

  // Summary of ordered equipment per class
  const orderSummaryByClass = useMemo(() => {
    const map: Record<string, { totalOrders: number; items: Record<string, number> }> = {};
    ordersList.forEach(o => {
      const cls = o.class || 'Haijulikani';
      if (!map[cls]) map[cls] = { totalOrders: 0, items: {} };
      map[cls].totalOrders += 1;
      const eqName = o.equipment_name || 'Kifaa';
      map[cls].items[eqName] = (map[cls].items[eqName] || 0) + (Number(o.quantity_ordered) || 1);
    });
    return map;
  }, [ordersList]);

  // Filtered Purchases List
  const filteredPurchases = useMemo(() => {
    return purchasesList.filter(p => {
      const matchesSearch = !searchQuery || p.equipment_name.toLowerCase().includes(searchQuery.toLowerCase()) || p.supplier?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [purchasesList, searchQuery, selectedCategory]);

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans bg-slate-50 min-h-screen">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-white font-medium animate-bounce ${
          toastMessage.type === 'error' ? 'bg-rose-600' : toastMessage.type === 'info' ? 'bg-sky-600' : 'bg-emerald-600'
        }`}>
          {toastMessage.type === 'error' ? <ShieldAlert className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-900 rounded-3xl p-6 md:p-8 text-white shadow-xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2.5 bg-emerald-950/40 px-3.5 py-1.5 rounded-full w-fit text-xs font-bold uppercase tracking-wider mb-3 border border-emerald-500/30">
            <Leaf className="w-4 h-4 text-emerald-300" />
            <span>Idara ya Mazingira & Vifaa (Environment Module)</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Haby Edu Pro - Mazingira & Shule</h1>
          <p className="text-emerald-100 text-sm mt-1 max-w-2xl opacity-90">
            Simamia vifaa vya mazingira, oda za wanafunzi, manunuzi ya shule, na kumbukumbu za matumizi katika kituo chako.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => loadData(true)} 
            disabled={isRefreshing}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-semibold flex items-center gap-2 transition cursor-pointer border border-white/20"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sasisha Data</span>
          </button>
          {activeTab === 'inventory' && canManage && (
            <button 
              onClick={handleOpenAddModal}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 rounded-xl text-sm font-bold flex items-center gap-2 transition cursor-pointer shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Ongeza Kifaa Kipya</span>
            </button>
          )}
          {activeTab === 'orders' && (
            <button 
              onClick={() => handleOpenOrderModal()}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 rounded-xl text-sm font-bold flex items-center gap-2 transition cursor-pointer shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Andika Oda Mpya ya Mwanafunzi</span>
            </button>
          )}
          {activeTab === 'purchases' && canManage && (
            <button 
              onClick={() => handleOpenPurchaseModal()}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 rounded-xl text-sm font-bold flex items-center gap-2 transition cursor-pointer shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Weka Manunuzi Mapya</span>
            </button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Jumla ya Vifaa (Stock)</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{stats.totalItems}</h3>
            <p className="text-xs text-emerald-600 font-medium mt-1">{stats.equipmentTypesCount} aina za vifaa</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Oda za Wanafunzi</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{stats.totalOrdersCount}</h3>
            <p className="text-xs text-amber-600 font-medium mt-1">{stats.pendingOrdersCount} zinasubiri / zimeagizwa</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-bold">
            <ClipboardList className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Manunuzi ya Shule</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">TZS {stats.totalPurchasesCost.toLocaleString()}</h3>
            <p className="text-xs text-blue-600 font-medium mt-1">{stats.totalPurchasesQty} vifaa vilivyonunuliwa</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Vifaa Vilivyokopeshwa</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{stats.activeLentOut}</h3>
            <p className="text-xs text-rose-600 font-medium mt-1">Bado havijarudishwa</p>
          </div>
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {stats.lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-8 flex items-center gap-3 text-amber-900">
          <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
          <div className="text-sm">
            <span className="font-bold">Onyo la Idadi Ndogo (Low Stock):</span> Vifaa vifuatavyo vimepungua chini ya 5: {' '}
            <b>{stats.lowStockItems.map(i => `${i.name} (${i.quantity})`).join(', ')}</b>. Tafadhaliagiza au nunua upya.
          </div>
        </div>
      )}

      {/* 4 Tabs Navigation */}
      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'inventory' ? 'border-emerald-600 text-emerald-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>1. Vifaa Stock ({equipmentList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'orders' ? 'border-emerald-600 text-emerald-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>2. Oda za Wanafunzi ({ordersList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('purchases')}
          className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'purchases' ? 'border-emerald-600 text-emerald-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>3. Manunuzi ya Shule ({purchasesList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('usage')}
          className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'usage' ? 'border-emerald-600 text-emerald-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>4. Matumizi & Ukopeshaji ({usageLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: VIFAA STOCK */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Filters Bar */}
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Tafuta kifaa au eneo..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Kategoria Zote</option>
                {CATEGORY_PRESETS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={selectedCondition}
                onChange={e => setSelectedCondition(e.target.value)}
                className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Hali Zote</option>
                {CONDITION_PRESETS.map(cond => <option key={cond} value={cond}>{cond}</option>)}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 text-slate-600 text-xs uppercase font-bold tracking-wider">
                  <th className="p-4">Jina la Kifaa</th>
                  <th className="p-4">Kategoria</th>
                  <th className="p-4 text-center">Idadi</th>
                  <th className="p-4">Hali</th>
                  <th className="p-4">Eneo / Stoo</th>
                  <th className="p-4">Tarehe ya Kununua</th>
                  {canManage && <th className="p-4 text-right">Vitendo</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">Hakuna vifaa vilivyopatikana.</td>
                  </tr>
                ) : (
                  filteredInventory.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-4 font-bold text-slate-900 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                          <Leaf className="w-4 h-4" />
                        </div>
                        <span>{item.name}</span>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-700">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          item.quantity < 5 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {item.quantity}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          item.condition === 'Nzuri' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          item.condition === 'Inahitaji Matengenezo' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {item.condition}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 flex items-center gap-1.5 mt-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.location || 'Stoo ya Mazingira'}</span>
                      </td>
                      <td className="p-4 text-slate-500">{item.purchase_date || '-'}</td>
                      {canManage && (
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Hariri Kifaa"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteEquipment(item.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Futa Kifaa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ODA ZA WANAFUNZI */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Summary by Class Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              <span>Muhtasari wa Oda za Vifaa kwa Kila Darasa</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.keys(orderSummaryByClass).length === 0 ? (
                <p className="text-sm text-slate-400 col-span-full">Hakuna oda zilizowekwa bado.</p>
              ) : (
                Object.entries(orderSummaryByClass).map(([className, data]) => (
                  <div key={className} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-emerald-800 text-sm mb-1">{className}</h4>
                    <p className="text-xs text-slate-500 mb-2">Jumla ya Oda: <b>{data.totalOrders}</b></p>
                    <div className="space-y-1">
                      {Object.entries(data.items).map(([eq, qty]) => (
                        <div key={eq} className="flex justify-between text-xs text-slate-700 bg-white px-2 py-1 rounded border border-slate-100">
                          <span>{eq}:</span>
                          <span className="font-bold">{qty}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Orders Table Container */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Tafuta kwa jina la mwanafunzi au kifaa..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <select
                  value={selectedClassFilter}
                  onChange={e => setSelectedClassFilter(e.target.value)}
                  className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">Madarasa Yote</option>
                  {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                  value={selectedStatusFilter}
                  onChange={e => setSelectedStatusFilter(e.target.value)}
                  className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">Hali Zote za Oda</option>
                  <option value="Imeagizwa">Imeagizwa</option>
                  <option value="Imekuja">Imekuja</option>
                  <option value="Haijaja">Haijaja</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 text-slate-600 text-xs uppercase font-bold tracking-wider">
                    <th className="p-4">Mwanafunzi</th>
                    <th className="p-4">Darasa / Mkondo</th>
                    <th className="p-4">Kifaa Kilichoagizwa</th>
                    <th className="p-4 text-center">Idadi</th>
                    <th className="p-4">Tarehe</th>
                    <th className="p-4">Hali</th>
                    <th className="p-4 text-right">Vitendo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">Hakuna oda za wanafunzi zilizopatikana. Bofya "Andika Oda Mpya" hapo juu.</td>
                    </tr>
                  ) : (
                    filteredOrders.map(order => (
                      <tr key={order.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-4 font-bold text-slate-900 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                            <UserCheck className="w-4 h-4" />
                          </div>
                          <span>{order.student_name}</span>
                        </td>
                        <td className="p-4 text-slate-700">
                          <span className="font-semibold">{order.class}</span> <span className="text-xs text-slate-500">({order.stream})</span>
                        </td>
                        <td className="p-4 font-medium text-emerald-900">{order.equipment_name}</td>
                        <td className="p-4 text-center font-bold">{order.quantity_ordered}</td>
                        <td className="p-4 text-slate-500">{order.order_date}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            order.status === 'Imekuja' ? 'bg-emerald-100 text-emerald-800' :
                            order.status === 'Haijaja' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenOrderModal(order)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Hariri Oda"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteOrder(order.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Futa Oda"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MANUNUZI YA SHULE */}
      {activeTab === 'purchases' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900">Ripoti & Orodha ya Manunuzi ya Vifaa vya Shule</h3>
              <p className="text-xs text-slate-500 mt-0.5">Jumla Kuu ya Matumizi ya Manunuzi: <b className="text-emerald-700">TZS {stats.totalPurchasesCost.toLocaleString()}</b></p>
            </div>
            <button
              onClick={handlePrintPurchasesReport}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow"
            >
              <Printer className="w-4 h-4" />
              <span>Chapisha Ripoti ya PDF</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Tafuta kifaa kilichonunuliwa au muuzaji..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">Kategoria Zote</option>
                  {CATEGORY_PRESETS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 text-slate-600 text-xs uppercase font-bold tracking-wider">
                    <th className="p-4">Jina la Kifaa</th>
                    <th className="p-4">Kategoria</th>
                    <th className="p-4 text-center">Idadi</th>
                    <th className="p-4 text-right">Bei ya Moja (TZS)</th>
                    <th className="p-4 text-right">Jumla (TZS)</th>
                    <th className="p-4">Muuzaji / Supplier</th>
                    <th className="p-4">Tarehe</th>
                    {canManage && <th className="p-4 text-right">Vitendo</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400">Hakuna kumbukumbu za manunuzi zilizopatikana.</td>
                    </tr>
                  ) : (
                    filteredPurchases.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-4 font-bold text-slate-900">{item.equipment_name}</td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-700">
                            {item.category}
                          </span>
                        </td>
                        <td className="p-4 text-center font-bold">{item.quantity_bought}</td>
                        <td className="p-4 text-right">{Number(item.unit_price).toLocaleString()}</td>
                        <td className="p-4 text-right font-black text-emerald-800">{Number(item.total_cost).toLocaleString()}</td>
                        <td className="p-4 text-slate-600">{item.supplier || '-'}</td>
                        <td className="p-4 text-slate-500">{item.purchase_date}</td>
                        {canManage && (
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenPurchaseModal(item)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Hariri"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeletePurchase(item.id)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Futa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MATUMIZI (USAGE LOG) */}
      {activeTab === 'usage' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-base font-bold text-slate-900">Kumbukumbu za Matumizi na Ukopeshaji wa Vifaa</h3>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full">
              Jumla ya Rekodi: {usageLogs.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 text-slate-600 text-xs uppercase font-bold tracking-wider">
                  <th className="p-4">Kifaa</th>
                  <th className="p-4">Imetumika / Kukopeshwa na</th>
                  <th className="p-4 text-center">Idadi</th>
                  <th className="p-4">Kusudi (Purpose)</th>
                  <th className="p-4">Tarehe ya Kuchukua</th>
                  <th className="p-4">Hali</th>
                  <th className="p-4 text-right">Kitendo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {usageLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">Hakuna kumbukumbu za matumizi kwa sasa.</td>
                  </tr>
                ) : (
                  usageLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-4 font-bold text-slate-900">{log.equipment_name || 'Kifaa'}</td>
                      <td className="p-4 font-semibold text-slate-700">{log.used_by}</td>
                      <td className="p-4 text-center font-bold">{log.quantity_used}</td>
                      <td className="p-4 text-slate-600">{log.purpose}</td>
                      <td className="p-4 text-slate-500">{log.date_used}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          log.status === 'Imerudishwa' ? 'bg-emerald-100 text-emerald-800' :
                          log.status === 'Imepotea' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {log.status === 'Imetumika' && canManage ? (
                          <button
                            onClick={async () => {
                              await returnEquipmentItem(schoolId, log.id, log.equipment_id, log.quantity_used, 'Imerudishwa na mwalimu/mwanafunzi');
                              showToast("Kifaa kimerejeshwa stoo mafanikio!", "success");
                              loadData(false);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            Pokea (Return)
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Imekamilika</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD/EDIT EQUIPMENT STOCK */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="bg-emerald-800 px-6 py-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">{editingEquipment ? 'Hariri Kifaa cha Mazingira' : 'Ongeza Kifaa Kipya cha Mazingira'}</h3>
              <button onClick={() => setIsAddEditModalOpen(false)} className="p-1 hover:bg-emerald-700 rounded-full transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEquipment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Jina la Kifaa (Customizable)</label>
                <input
                  type="text"
                  required
                  placeholder="Mf: Jembe, Reki, Pima Joto, Mbolea..."
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Kategoria</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {CATEGORY_PRESETS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {formCategory === 'Vinginevyo' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Andika Kategoria Nyingine</label>
                    <input
                      type="text"
                      placeholder="Kategoria..."
                      value={formCustomCategory}
                      onChange={e => setFormCustomCategory(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Idadi (Quantity)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formQuantity}
                    onChange={e => setFormQuantity(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Hali ya Kifaa</label>
                  <select
                    value={formCondition}
                    onChange={e => setFormCondition(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {CONDITION_PRESETS.map(cond => <option key={cond} value={cond}>{cond}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Tarehe ya Kununua</label>
                  <input
                    type="date"
                    value={formPurchaseDate}
                    onChange={e => setFormPurchaseDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Eneo / Stoo ya Kuhifadhi</label>
                <input
                  type="text"
                  placeholder="Mf: Stoo Kuu ya Mazingira - Shelfu A1"
                  value={formLocation}
                  onChange={e => setFormLocation(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition cursor-pointer"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition cursor-pointer shadow-lg"
                >
                  Hifadhi Kifaa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ORDER ADD/EDIT */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="bg-emerald-800 px-6 py-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">{editingOrder ? 'Hariri Oda ya Mwanafunzi' : 'Andika Oda Mpya ya Kifaa cha Mwanafunzi'}</h3>
              <button onClick={() => setIsOrderModalOpen(false)} className="p-1 hover:bg-emerald-700 rounded-full transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveOrder} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Chagua Darasa</label>
                  <select
                    value={orderClass}
                    onChange={e => setOrderClass(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Chagua Mkondo</label>
                  <select
                    value={orderStream}
                    onChange={e => setOrderStream(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {availableStreams.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Chagua Mwanafunzi (kutoka orodha)</label>
                <select
                  value={orderStudentId}
                  onChange={e => {
                    const sid = e.target.value;
                    setOrderStudentId(sid);
                    const found = students.find(s => String(s.id) === String(sid));
                    if (found) setOrderStudentName(found.name || found.fullName || '');
                  }}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-2"
                >
                  <option value="">-- Chagua Mwanafunzi au Andika Chini --</option>
                  {filteredStudentsForOrder.map(s => (
                    <option key={s.id} value={s.id}>{s.name || s.fullName} ({s.className} - {s.stream || 'A'})</option>
                  ))}
                </select>
                <input
                  type="text"
                  required
                  placeholder="Jina la Mwanafunzi (au andika mwenyewe)..."
                  value={orderStudentName}
                  onChange={e => setOrderStudentName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Jina la Kifaa Kilichoagizwa (Customizable Text)</label>
                <input
                  type="text"
                  required
                  placeholder="Mf: Mbegu za maharage, Gloves 2 pairs, Jembe..."
                  value={orderEquipmentName}
                  onChange={e => setOrderEquipmentName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Idadi</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={orderQuantity}
                    onChange={e => setOrderQuantity(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Tarehe</label>
                  <input
                    type="date"
                    value={orderDate}
                    onChange={e => setOrderDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Hali ya Oda</label>
                  <select
                    value={orderStatus}
                    onChange={e => setOrderStatus(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Imeagizwa">Imeagizwa</option>
                    <option value="Imekuja">Imekuja</option>
                    <option value="Haijaja">Haijaja</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Maelezo ya Ziada (Notes)</label>
                <textarea
                  rows={2}
                  placeholder="Maelezo kuhusu oda..."
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition cursor-pointer"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition cursor-pointer shadow-lg"
                >
                  Hifadhi Oda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PURCHASE ADD/EDIT */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="bg-emerald-800 px-6 py-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">{editingPurchase ? 'Hariri Manunuzi ya Shule' : 'Weka Manunuzi Mapya ya Shule'}</h3>
              <button onClick={() => setIsPurchaseModalOpen(false)} className="p-1 hover:bg-emerald-700 rounded-full transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSavePurchase} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Jina la Kifaa Lililonunuliwa</label>
                <input
                  type="text"
                  required
                  placeholder="Mf: Reki 10 za Chuma, Mbolea NPK..."
                  value={purName}
                  onChange={e => setPurName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Kategoria</label>
                  <select
                    value={purCategory}
                    onChange={e => setPurCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {CATEGORY_PRESETS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Idadi (Quantity)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={purQty}
                    onChange={e => setPurQty(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Bei ya Kimoja (TZS)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={purUnitPrice}
                    onChange={e => setPurUnitPrice(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Jumla Kuu (TZS)</label>
                  <input
                    type="text"
                    disabled
                    value={`TZS ${(purQty * purUnitPrice).toLocaleString()}`}
                    className="w-full px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-black text-emerald-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Muuzaji / Supplier</label>
                  <input
                    type="text"
                    placeholder="Jina la duka au muuzaji..."
                    value={purSupplier}
                    onChange={e => setPurSupplier(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Namba ya Risiti (Receipt No)</label>
                  <input
                    type="text"
                    placeholder="Risiti #..."
                    value={purReceipt}
                    onChange={e => setPurReceipt(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Tarehe ya Manunuzi</label>
                  <input
                    type="date"
                    value={purDate}
                    onChange={e => setPurDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Hali</label>
                  <select
                    value={purCondition}
                    onChange={e => setPurCondition(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {CONDITION_PRESETS.map(cond => <option key={cond} value={cond}>{cond}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition cursor-pointer"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition cursor-pointer shadow-lg"
                >
                  Hifadhi Manunuzi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
