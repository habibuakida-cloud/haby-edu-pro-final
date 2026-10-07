// src/context/SchoolContext.jsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "../lib/supabaseClient";

const SchoolContext = createContext(null);

export function SchoolProvider({ children }) {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSchools = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("schools")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return { data: null, error: fetchError };
    }

    setSchools(data ?? []);
    setLoading(false);
    return { data: data ?? [], error: null };
  }, []);

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  const registerSchool = useCallback(async (school) => {
    const { name, district, region, email, phone, address } = school;

    const { data, error: insertError } = await supabase
      .from("schools")
      .insert([{ name, district, region, email, phone, address }])
      .select();

    if (insertError) {
      setError(insertError.message);
      return { data: null, error: insertError };
    }

    const insertedSchools = data ?? [];
    setSchools((current) => [...insertedSchools, ...current]);
    setError(null);
    return { data: insertedSchools[0] ?? null, error: null };
  }, []);

  const value = {
    schools,
    loading,
    error,
    fetchSchools,
    registerSchool,
  };

  return (
    <SchoolContext.Provider value={value}>
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchools() {
  const context = useContext(SchoolContext);

  if (!context) {
    throw new Error("useSchools must be used within a SchoolProvider");
  }

  return context;
}
