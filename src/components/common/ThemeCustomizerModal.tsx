import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Layout, 
  Type, 
  Square, 
  Sparkles, 
  Check, 
  X, 
  Monitor, 
  Moon, 
  Sun, 
  Sliders, 
  Maximize2, 
  Minimize2,
  Columns,
  Grid
} from 'lucide-react';

export type AppThemeMode = 'modern' | 'classic' | 'dark' | 'emerald' | 'sunset' | 'cyberpunk';
export type LayoutDensity = 'compact' | 'comfortable' | 'spacious';
export type CornerStyle = 'rounded' | 'sharp' | 'pill';
export type FontSizeOption = 'sm' | 'base' | 'lg';

interface ThemeConfig {
  themeMode: AppThemeMode;
  layoutDensity: LayoutDensity;
  cornerStyle: CornerStyle;
  fontSize: FontSizeOption;
  sidebarVariant: string;
}

const DEFAULT_CONFIG: ThemeConfig = {
  themeMode: 'modern',
  layoutDensity: 'comfortable',
  cornerStyle: 'rounded',
  fontSize: 'base',
  sidebarVariant: 'slate'
};

export function useAppTheme() {
  const [config, setConfig] = useState<ThemeConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('haby_app_theme_config');
        if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      } catch (e) {}
    }
    return DEFAULT_CONFIG;
  });

  useEffect(() => {
    try {
      localStorage.setItem('haby_app_theme_config', JSON.stringify(config));
      const root = document.documentElement;
      root.setAttribute('data-theme', config.themeMode);
      root.setAttribute('data-density', config.layoutDensity);
      root.setAttribute('data-corners', config.cornerStyle);
      root.setAttribute('data-fontsize', config.fontSize);
      
      if (config.themeMode === 'dark' || config.themeMode === 'cyberpunk') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    } catch (e) {}
  }, [config]);

  const updateConfig = (newCfg: Partial<ThemeConfig>) => {
    setConfig(prev => ({ ...prev, ...newCfg }));
  };

  return { config, updateConfig };
}

interface ThemeCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ThemeCustomizerModal({ isOpen, onClose }: ThemeCustomizerModalProps) {
  const { config, updateConfig } = useAppTheme();
  const [activeTab, setActiveTab] = useState<'themes' | 'layouts' | 'typography'>('themes');

  if (!isOpen) return null;

  const themes: { id: AppThemeMode; name: string; desc: string; color: string; badge: string }[] = [
    { id: 'modern', name: 'Kisasa (Modern Indigo)', desc: 'Muonekano safi wenye rangi za samawati na violet', color: 'bg-indigo-600', badge: 'Maarufu' },
    { id: 'classic', name: 'Rasmi (Classic Navy)', desc: 'Mtindo wa kiserikali na shule za bweni za kifahari', color: 'bg-blue-900', badge: 'Rasmi' },
    { id: 'dark', name: 'Giza (Midnight Dark)', desc: 'Rangi za giza zenye kupunguza mwanga kwenye macho', color: 'bg-slate-900 border border-slate-700', badge: 'Usiku' },
    { id: 'emerald', name: 'Kijani (Emerald Forest)', desc: 'Mandhari ya asili ya kijani kibichi na dhahabu', color: 'bg-emerald-700', badge: 'Shule' },
    { id: 'sunset', name: 'Machweo (Sunset Amber)', desc: 'Rangi za joto za machweo na waridi la kupendeza', color: 'bg-amber-600', badge: 'Joto' },
    { id: 'cyberpunk', name: 'Fisures (Cyber Neon)', desc: 'Mtindo wa kisasa wa neon na mianga ya kipekee', color: 'bg-fuchsia-600', badge: 'Futari' }
  ];

  const densities: { id: LayoutDensity; name: string; desc: string; icon: any }[] = [
    { id: 'compact', name: 'Compact (Minyoro / Ndogo)', desc: 'Nafasi ndogo, inaonyesha taarifa nyingi mara moja', icon: Minimize2 },
    { id: 'comfortable', name: 'Comfortable (Kawaida)', desc: 'Uwiano mzuri kati ya nafasi na usomeka', icon: Layout },
    { id: 'spacious', name: 'Spacious (Mpana / Nafasi Kubwa)', desc: 'Nafasi kubwa ya pumzi kwenye kila sehemu', icon: Maximize2 }
  ];

  const corners: { id: CornerStyle; name: string; sampleClass: string }[] = [
    { id: 'rounded', name: 'Rounded (Duru Laini)', sampleClass: 'rounded-xl' },
    { id: 'sharp', name: 'Sharp (Pembe Kali)', sampleClass: 'rounded-none' },
    { id: 'pill', name: 'Pill / Smooth (Vidonge)', sampleClass: 'rounded-full' }
  ];

  const fontSizes: { id: FontSizeOption; name: string; sizeClass: string }[] = [
    { id: 'sm', name: 'Ndogo (Compact Text)', sizeClass: 'text-xs' },
    { id: 'base', name: 'Wastani (Standard)', sizeClass: 'text-sm' },
    { id: 'lg', name: 'Kubwa (Large & Clear)', sizeClass: 'text-base' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 p-6 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md">
              <Palette className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Kituo cha Mionekano na Mandhari (Theme Studio)</h2>
              <p className="text-xs text-indigo-100 font-medium">Badilisha mandhari, rangi, na mpangilio wa mfumo wako papo hapo</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl transition text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-6 pt-3 space-x-4">
          <button
            onClick={() => setActiveTab('themes')}
            className={`pb-3 px-4 font-bold text-sm border-b-2 flex items-center space-x-2 transition ${
              activeTab === 'themes' 
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' 
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Mandhari & Rangi</span>
          </button>
          <button
            onClick={() => setActiveTab('layouts')}
            className={`pb-3 px-4 font-bold text-sm border-b-2 flex items-center space-x-2 transition ${
              activeTab === 'layouts' 
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' 
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Layout className="w-4 h-4" />
            <span>Mpangilio na Nafasi</span>
          </button>
          <button
            onClick={() => setActiveTab('typography')}
            className={`pb-3 px-4 font-bold text-sm border-b-2 flex items-center space-x-2 transition ${
              activeTab === 'typography' 
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' 
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Type className="w-4 h-4" />
            <span>Maandishi & Kona</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {activeTab === 'themes' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">Chagua Mandhari (Theme Skins)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {themes.map(t => {
                    const isSelected = config.themeMode === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => updateConfig({ themeMode: t.id })}
                        className={`p-4 rounded-2xl border-2 transition cursor-pointer flex items-center justify-between group ${
                          isSelected 
                            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 dark:border-indigo-500 shadow-md' 
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className={`w-10 h-10 rounded-xl ${t.color} flex items-center justify-center shadow-inner`}>
                            <div className="w-4 h-4 rounded-full bg-white/90"></div>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-black text-sm text-slate-900 dark:text-white">{t.name}</h4>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{t.badge}</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.desc}</p>
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition ${
                          isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-700'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'layouts' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">Uzito wa Mpangilio (Layout Density)</h3>
                <div className="grid grid-cols-1 gap-3">
                  {densities.map(d => {
                    const isSelected = config.layoutDensity === d.id;
                    const IconComp = d.icon;
                    return (
                      <div
                        key={d.id}
                        onClick={() => updateConfig({ layoutDensity: d.id })}
                        className={`p-4 rounded-2xl border-2 transition cursor-pointer flex items-center justify-between ${
                          isSelected 
                            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 dark:border-indigo-500' 
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400">
                            <IconComp className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-black text-sm text-slate-900 dark:text-white">{d.name}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{d.desc}</p>
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                          isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-700'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'typography' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">Mtindo wa Kona (Corner Style)</h3>
                <div className="grid grid-cols-3 gap-3">
                  {corners.map(c => {
                    const isSelected = config.cornerStyle === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => updateConfig({ cornerStyle: c.id })}
                        className={`p-4 text-center rounded-xl border-2 transition cursor-pointer flex flex-col items-center justify-center space-y-2 ${
                          isSelected 
                            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 font-black' 
                            : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800/50 font-bold'
                        }`}
                      >
                        <div className={`w-12 h-8 bg-indigo-500/20 border-2 border-indigo-500 ${c.sampleClass}`}></div>
                        <span className="text-xs">{c.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">Ukubwa wa Maandishi (Font Scale)</h3>
                <div className="grid grid-cols-3 gap-3">
                  {fontSizes.map(f => {
                    const isSelected = config.fontSize === f.id;
                    return (
                      <div
                        key={f.id}
                        onClick={() => updateConfig({ fontSize: f.id })}
                        className={`p-4 text-center rounded-xl border-2 transition cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                          isSelected 
                            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 font-black' 
                            : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800/50 font-bold'
                        }`}
                      >
                        <span className={`font-black ${f.sizeClass}`}>Aa</span>
                        <span className="text-xs">{f.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={() => updateConfig(DEFAULT_CONFIG)}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            Rudisha Kawaida (Reset)
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-black rounded-xl shadow-lg hover:from-indigo-700 hover:to-purple-700 transition"
          >
            Hifadhi na Funga
          </button>
        </div>

      </div>
    </div>
  );
}
