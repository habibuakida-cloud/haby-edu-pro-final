import { supabase } from './supabaseClient';

export const collection: any = (_firestore: any, path: string, ..._pathSegments: string[]): any => path;

export const doc: any = (_firestore: any, path: string, id?: string, ..._pathSegments: string[]): any => ({
  collectionName: path,
  id: id || `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
});

export const addDoc = async (colRef: any, data: any) => {
  const collectionName = typeof colRef === 'string' ? colRef : (colRef?.collectionName || 'collection');
  const id = data.id || `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const clean = { ...data, id };
  try {
    const { data: res } = await supabase.from(collectionName).insert(clean).select().maybeSingle();
    return res || clean;
  } catch {
    return clean;
  }
};

export const setDoc = async (docRef: any, data: any, _options?: any) => {
  const collectionName = docRef?.collectionName || 'collection';
  const id = docRef?.id || data.id || `id_${Date.now()}`;
  const clean = { ...data, id };
  try {
    await supabase.from(collectionName).upsert(clean);
  } catch {}
  return { id, ...clean };
};

export const deleteDoc = async (docRef: any) => {
  const collectionName = docRef?.collectionName || 'collection';
  const id = docRef?.id;
  if (id) {
    try {
      await supabase.from(collectionName).delete().eq('id', id);
    } catch {}
  }
  return { id };
};

export const getDocs = async (colRef: any) => {
  const collectionName = typeof colRef === 'string' ? colRef : (colRef?.collectionName || 'collection');
  try {
    const { data } = await supabase.from(collectionName).select('*');
    return {
      docs: (data || []).map((d: any) => ({
        id: d.id,
        data: () => d
      }))
    };
  } catch {
    return { docs: [] };
  }
};

export const getDoc = async (docRef: any) => {
  const collectionName = docRef?.collectionName || 'collection';
  const id = docRef?.id;
  if (!id) return { exists: () => false, data: () => null };
  try {
    const { data } = await supabase.from(collectionName).select('*').eq('id', id).maybeSingle();
    return {
      exists: () => !!data,
      data: () => data
    };
  } catch {
    return { exists: () => false, data: () => null };
  }
};

export const query: any = (colRef: any, ..._args: any[]) => colRef;
export const where: any = (..._args: any[]) => ({});
export const orderBy: any = (..._args: any[]) => ({});
export const limit: any = (..._args: any[]) => ({});
export const onSnapshot: any = (_ref: any, callback: any) => {
  callback({ docs: [] });
  return () => {};
};
