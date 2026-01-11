
import React, { useState, useEffect, useCallback, memo, useMemo, useRef } from 'react';
import { ViewState, PlanetData, ExplorationLog, Sector, Encounter, EncounterStep } from './types';
import { generateRandomPlanets, generateEncounterData } from './services/geminiService';
import { savePlanetsToDB, getPlanetsFromDB } from './storage';
import StarField from './components/StarField';
import { 
  Rocket, BookOpen, Settings, ChevronLeft, Globe, Wind, Layers, RotateCw, Timer, Trash2, 
  Lock, Unlock, Plus, LogIn, User, ShieldAlert, Search, Activity, Zap, Mountain, Dna, 
  Database, Radiation, Eye, LogOut, Send, ChevronRight, MessageSquare, Power, EyeOff,
  History, Info, AlertCircle, RefreshCcw, Cpu
} from 'lucide-react';

const ADMIN_CREDENTIALS = { id: 'escape.eta.00@gmail.com', pw: 'didEl!2003' };

const FastInput = memo(({ initialValue, placeholder, className, type = "text", onEnter, onValueChange }: any) => {
  const [localValue, setLocalValue] = useState(initialValue || '');
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
    if (onValueChange) onValueChange(e.target.value);
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onEnter) onEnter(localValue);
  };
  return (
    <input type={type} value={localValue} onChange={handleChange} onKeyDown={handleKeyDown} placeholder={placeholder} className={className} />
  );
});

const FastTextArea = memo(({ initialValue, placeholder, className, onValueChange }: any) => {
  const [localValue, setLocalValue] = useState(initialValue || '');
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalValue(e.target.value);
    if (onValueChange) onValueChange(e.target.value);
  };
  return (
    <textarea value={localValue} onChange={handleChange} placeholder={placeholder} className={className} />
  );
});

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('nickname');
  const [nickname, setNickname] = useState('');
  const [planets, setPlanets] = useState<PlanetData[]>([]);
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetData | null>(null);
  const [currentSectorIdx, setCurrentSectorIdx] = useState(0);
  const [logs, setLogs] = useState<ExplorationLog[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('데이터 송신 대기 중...');
  const [discoveredNodes, setDiscoveredNodes] = useState<string[]>([]);
  const [activeEncounter, setActiveEncounter] = useState<Encounter | null>(null);
  const [isDBReady, setIsDBReady] = useState(false);

  const tempNickname = useRef('');
  const tempLog = useRef('');
  const adminIdRef = useRef('');
  const adminPwRef = useRef('');

  useEffect(() => {
    const init = async () => {
      try {
        const storedPlanets = await getPlanetsFromDB();
        setPlanets(storedPlanets || []);
        const savedLogs = localStorage.getItem('life-logs');
        const savedNick = localStorage.getItem('life-nickname');
        const savedAdmin = localStorage.getItem('life-admin');
        if (savedLogs) setLogs(JSON.parse(savedLogs));
        if (savedNick) { setNickname(savedNick); setView('galaxy'); }
        if (savedAdmin === 'true') setIsAdmin(true);
        setIsDBReady(true);
      } catch (e) {
        console.error("L.I.F.E. System Init Error:", e);
        setIsDBReady(true);
      }
    };
    init();
  }, []);

  const persistPlanets = async (data: PlanetData[]) => {
    setPlanets(data);
    try {
      await savePlanetsToDB(data);
    } catch (e) {
      console.error("IndexedDB Sync Error:", e);
    }
  };

  const handleAdminLogin = () => {
    if (adminIdRef.current === ADMIN_CREDENTIALS.id && adminPwRef.current === ADMIN_CREDENTIALS.pw) {
      setIsAdmin(true);
      localStorage.setItem('life-admin', 'true');
      setView('galaxy');
    } else {
      alert('인증 정보가 올바르지 않습니다.');
    }
  };

  const startExploration = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setLoadingMsg('성계 심층 스캔 시작 (Gemini-3 Pro)...');
    
    console.log("Starting Planet Exploration Scan...");
    
    try {
      const newOnes = await generateRandomPlanets(1);
      
      if (newOnes && newOnes.length > 0) {
        setLoadingMsg('로컬 데이터베이스 동기화 중...');
        const updated = [...planets, ...newOnes];
        await persistPlanets(updated);
        console.log("Scan Successful: New Planet Found", newOnes[0].name);
      } else {
        console.warn("Scan Failed: AI did not return planet data.");
        alert('신규 성계 데이터를 수신하지 못했습니다. API 할당량이 부족하거나 네트워크 지연이 발생했을 수 있습니다.');
      }
    } catch (err) {
      console.error("Critical Scan Failure:", err);
      alert(`치명적인 분석 오류가 발생했습니다. (에러내용: ${err instanceof Error ? err.message : 'Unknown'})`);
    } finally {
      setIsLoading(false);
    }
  };

  const resetSystem = async () => {
    if(!confirm('모든 행성 데이터와 로그를 초기화하시겠습니까? (복구 불가)')) return;
    await persistPlanets([]);
    localStorage.removeItem('life-logs');
    setLogs([]);
    alert('시스템이 초기화되었습니다.');
  };

  const toggleVisibility = async (id: string) => {
    const updated = planets.map(p => p.id === id ? { ...p, isVisible: !p.isVisible } : p);
    await persistPlanets(updated);
  };

  const deletePlanet = async (id: string) => {
    if (!confirm('해당 행성 데이터를 영구 삭제하시겠습니까?')) return;
    const updated = planets.filter(p => p.id !== id);
    await persistPlanets(updated);
  };

  useEffect(() => {
    if (selectedPlanet && view === 'planet') {
      const sector = selectedPlanet.sectors[currentSectorIdx];
      if (!sector) return;
      const rollKey = `roll-${selectedPlanet.id}-${currentSectorIdx}`;
      if (sector.encounter || sessionStorage.getItem(rollKey)) return;
      sessionStorage.setItem(rollKey, 'true');
      const hasEncounterOnPlanet = selectedPlanet.sectors.some(s => !!s.encounter);
      const isLastSector = currentSectorIdx === selectedPlanet.sectors.length - 1;
      if (Math.random() <= 0.20 || (!hasEncounterOnPlanet && isLastSector)) {
        (async () => {
          try {
            const enc = await generateEncounterData();
            if (!enc) return;
            const updatedSectors = [...selectedPlanet.sectors];
            updatedSectors[currentSectorIdx].encounter = enc;
            const updatedPlanet = { ...selectedPlanet, sectors: updatedSectors };
            setSelectedPlanet(updatedPlanet);
            persistPlanets(planets.map(p => p.id === updatedPlanet.id ? updatedPlanet : p));
          } catch (e) { console.error("Encounter generation failure:", e); }
        })();
      }
    }
  }, [currentSectorIdx, selectedPlanet, view, planets]);

  const handleChoice = (choice: any) => {
    if (!activeEncounter || !selectedPlanet) return;
    const nextStepId = choice.nextStepId;
    const newHistory = [...activeEncounter.history, { choice: choice.text, response: choice.finalResponse }];
    const updatedEnc: Encounter = {
      ...activeEncounter,
      history: newHistory,
      currentStepId: nextStepId || activeEncounter.currentStepId,
      isCompleted: nextStepId === null
    };
    setActiveEncounter(updatedEnc);
    const updatedSectors = [...selectedPlanet.sectors];
    updatedSectors[currentSectorIdx].encounter = updatedEnc;
    const updatedPlanet = { ...selectedPlanet, sectors: updatedSectors };
    setSelectedPlanet(updatedPlanet);
    persistPlanets(planets.map(p => p.id === updatedPlanet.id ? updatedPlanet : p));
  };

  const currentPlanetLogs = useMemo(() => {
    if (!selectedPlanet) return [];
    return logs.filter(l => l.planetId === selectedPlanet.id);
  }, [logs, selectedPlanet]);

  if (!isDBReady) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center space-y-4">
        <RotateCw className="w-12 h-12 text-brand-orange animate-spin" />
        <p className="text-brand-orange font-orbitron font-bold tracking-widest animate-pulse">BOOTING SYSTEM...</p>
      </div>
    );
  }

  const NicknameScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-screen relative z-10 px-4">
      <div className="bg-brand-darkSecondary/95 backdrop-blur-3xl p-12 rounded-[3.5rem] border border-brand-greenMuted/30 shadow-[0_0_120px_rgba(255,54,0,0.1)] max-w-md w-full text-center">
        <div className="w-24 h-24 bg-brand-orangeDark rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl">
          <Rocket className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-7xl font-black font-orbitron mb-2 text-brand-orange tracking-tighter">L.I.F.E.</h1>
        <p className="text-brand-lightMuted mb-12 text-[10px] font-black tracking-[0.5em] uppercase opacity-80 italic">Life Index For Evaluation</p>
        <FastInput 
          placeholder="탐사원 코드 입력" 
          onValueChange={(v: string) => tempNickname.current = v}
          onEnter={(v: string) => { if(v) { setNickname(v); localStorage.setItem('life-nickname', v); setView('galaxy'); }}}
          className="w-full bg-brand-dark border-2 border-brand-greenMuted/20 rounded-2xl px-6 py-5 mb-6 focus:border-brand-orange outline-none transition-all text-brand-light font-orbitron text-center uppercase tracking-widest text-sm"
        />
        <button onClick={() => { if(tempNickname.current) { setNickname(tempNickname.current); localStorage.setItem('life-nickname', tempNickname.current); setView('galaxy'); } }} className="w-full bg-brand-orange hover:bg-brand-orangeLight text-white font-black py-5 rounded-2xl shadow-xl shadow-brand-orange/20 text-xs tracking-[0.3em] uppercase font-orbitron">
          시스템 접속
        </button>
      </div>
    </div>
  );

  const GalaxyMap = () => (
    <div className="pt-32 pb-12 px-10 max-w-7xl mx-auto relative z-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-10">
        <div>
          <h2 className="text-6xl font-black font-orbitron text-brand-orange flex items-center gap-6 tracking-tighter uppercase leading-none">Discovery Grid</h2>
          <p className="text-brand-lightMuted mt-4 font-medium text-sm flex items-center gap-3">
             Pioneer: <span className="text-brand-orange font-black uppercase font-orbitron text-xs">{nickname}</span>
          </p>
        </div>
        <div className="flex gap-4">
          {isAdmin && (
            <div className="flex gap-2">
              <button onClick={startExploration} disabled={isLoading} className="px-8 py-4 bg-brand-orangeDark border-2 border-brand-orange text-white rounded-2xl hover:bg-brand-orange transition-all flex items-center gap-3 font-black text-[10px] tracking-[0.2em] shadow-lg disabled:opacity-50">
                {isLoading ? <><RotateCw className="w-4 h-4 animate-spin" /> {loadingMsg}</> : <><Search className="w-4 h-4"/> 딥 스캔</>}
              </button>
              <button onClick={resetSystem} className="p-4 bg-brand-dark/40 border-2 border-brand-orangeDark text-brand-orangeDark rounded-2xl hover:bg-brand-orangeDark hover:text-white transition-all">
                <RefreshCcw className="w-5 h-5" />
              </button>
            </div>
          )}
          <button onClick={() => setView('logs')} className="flex items-center gap-3 bg-brand-greenDark border-2 border-brand-green/20 text-brand-light px-10 py-4 rounded-2xl font-black text-[10px] tracking-[0.2em] uppercase">
            <BookOpen className="w-5 h-5" /> Mission Archive
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {planets.filter(p => p.isVisible || isAdmin).length === 0 && !isLoading && (
          <div className="col-span-full py-20 bg-brand-darkSecondary/30 border-2 border-dashed border-brand-greenMuted/20 rounded-[3rem] text-center">
            <p className="text-brand-gray/50 uppercase tracking-[0.4em] font-black italic">No Sectors Discovered Yet</p>
          </div>
        )}
        {planets.filter(p => p.isVisible || isAdmin).map((planet) => (
          <div key={planet.id} onClick={() => { setSelectedPlanet(planet); setCurrentSectorIdx(0); setView('planet'); setDiscoveredNodes([]); setActiveEncounter(null); }} className={`group cursor-pointer relative bg-brand-darkSecondary border-2 rounded-[3.5rem] overflow-hidden transition-all duration-700 hover:scale-[1.03] card-glow ${planet.isVisible ? 'border-brand-greenMuted/10' : 'border-brand-orange/40 opacity-50'}`}>
            <div className="h-80 overflow-hidden relative">
              <img src={planet.sectors[0]?.imageUrl || ''} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-[3s]" alt={planet.name} />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-darkSecondary to-transparent"></div>
              <div className="absolute bottom-10 left-12">
                <span className="text-brand-orange text-[9px] font-orbitron font-black tracking-[0.4em] mb-2 block">{planet.code}</span>
                <h2 className="text-4xl font-black font-orbitron text-brand-light tracking-tighter leading-none">{planet.name}</h2>
              </div>
            </div>
            {isAdmin && (
              <div className="absolute top-8 right-8 flex gap-2">
                <button onClick={(e) => { e.stopPropagation(); toggleVisibility(planet.id); }} className="p-3 bg-brand-dark/60 backdrop-blur rounded-xl text-brand-light hover:text-brand-orange transition-colors">
                  {planet.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={(e) => { e.stopPropagation(); deletePlanet(planet.id); }} className="p-3 bg-brand-dark/60 backdrop-blur rounded-xl text-brand-orangeDark hover:text-brand-orange transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="col-span-1 h-[400px] bg-brand-darkSecondary/50 border-2 border-dashed border-brand-orange/30 rounded-[3.5rem] flex flex-col items-center justify-center animate-pulse">
            <Cpu className="w-12 h-12 text-brand-orange mb-4 animate-spin" />
            <p className="text-brand-orange font-orbitron text-[10px] tracking-widest">{loadingMsg}</p>
          </div>
        )}
      </div>
    </div>
  );

  const PlanetDetailView = () => {
    if (!selectedPlanet) return null;
    const sector = selectedPlanet.sectors[currentSectorIdx];
    if (!sector) return null;
    const encounter = sector.encounter;
    const currentStep = encounter?.steps.find(s => s.id === encounter.currentStepId);

    const handleLogSubmit = () => {
      if(tempLog.current.trim()){ 
        const newLog = { id: Date.now().toString(), planetId: selectedPlanet.id, planetName: selectedPlanet.name, author: nickname, content: tempLog.current, timestamp: Date.now(), isVisible: true }; 
        const updated = [newLog, ...logs]; 
        setLogs(updated); 
        localStorage.setItem('life-logs', JSON.stringify(updated)); 
        tempLog.current = '';
        setNickname(prev => prev); 
      }
    };

    return (
      <div className="pt-32 pb-24 px-10 max-w-[1600px] mx-auto relative z-10 animate-in fade-in duration-700">
        <div className="flex justify-between items-center mb-12">
          <button onClick={() => setView('galaxy')} className="flex items-center gap-3 text-brand-gray hover:text-brand-orange transition-all font-black text-[10px] uppercase tracking-[0.4em]">
            <ChevronLeft className="w-5 h-5" /> Back to Chart
          </button>
          <div className="flex gap-4 items-center">
            <span className="text-[10px] font-orbitron font-black text-brand-orange tracking-widest">{currentSectorIdx + 1} / {selectedPlanet.sectors.length} SECTOR</span>
            <div className="flex gap-2">
              {selectedPlanet.sectors.map((_, i) => (
                <div key={i} className={`w-12 h-1.5 rounded-full transition-all duration-500 ${i === currentSectorIdx ? 'bg-brand-orange' : 'bg-brand-greenMuted/20'}`}></div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative w-full h-[700px] rounded-[4.5rem] overflow-hidden border-2 border-brand-greenMuted/10 shadow-2xl bg-brand-dark group mb-12">
          <div className="scanner-line"></div>
          <img src={sector.imageUrl} className="w-full h-full object-cover opacity-90 transition-all duration-[2s]" alt={sector.name} />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-transparent to-transparent"></div>

          <div className="absolute inset-x-0 inset-y-0 pointer-events-none flex items-center justify-between px-10 z-30">
            <button onClick={() => { setCurrentSectorIdx((currentSectorIdx - 1 + selectedPlanet.sectors.length) % selectedPlanet.sectors.length); setDiscoveredNodes([]); }} className="pointer-events-auto p-6 bg-brand-dark/40 backdrop-blur rounded-full border border-brand-greenMuted/20 text-brand-light hover:bg-brand-orange transition-all shadow-xl">
               <ChevronLeft className="w-10 h-10" />
            </button>
            <button onClick={() => { setCurrentSectorIdx((currentSectorIdx + 1) % selectedPlanet.sectors.length); setDiscoveredNodes([]); }} className="pointer-events-auto p-6 bg-brand-dark/40 backdrop-blur rounded-full border border-brand-greenMuted/20 text-brand-light hover:bg-brand-orange transition-all shadow-xl">
               <ChevronRight className="w-10 h-10" />
            </button>
          </div>

          {sector.discoveryPoints.map((dp) => (
            <button key={dp.id} onClick={() => !discoveredNodes.includes(dp.id) && setDiscoveredNodes([...discoveredNodes, dp.id])} style={{ top: `${dp.y}%`, left: `${dp.x}%` }} className="absolute group p-3 -translate-x-1/2 -translate-y-1/2 z-20">
              <div className={`w-14 h-14 rounded-full border-4 hotspot-pulse flex items-center justify-center ${discoveredNodes.includes(dp.id) ? 'bg-brand-green border-brand-light scale-90' : 'bg-brand-orange border-white animate-bounce'}`}>
                 <Search className="w-6 h-6 text-white" />
              </div>
              <div className="absolute bottom-full mb-4 px-5 py-3 bg-brand-darkSecondary/95 border border-brand-green/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-2xl z-50 pointer-events-none">
                 <span className="text-xs font-black text-brand-orange uppercase tracking-widest">{dp.label}</span>
              </div>
            </button>
          ))}

          {encounter && !encounter.isCompleted && (
            <button onClick={() => setActiveEncounter(encounter)} className="absolute bottom-24 right-24 p-8 bg-brand-orangeDark/90 rounded-[3rem] border-2 border-white animate-pulse shadow-[0_0_50px_rgba(255,54,0,0.5)] z-20 group flex items-center gap-5">
              <MessageSquare className="w-12 h-12 text-white" />
              <div className="flex flex-col items-start">
                <span className="text-white font-black text-xs tracking-widest uppercase">미확인 생체 신호</span>
                <span className="text-white/60 text-[9px] uppercase tracking-widest font-orbitron">Alien Entity Detected</span>
              </div>
            </button>
          )}

          <div className="absolute top-16 left-16 pointer-events-none">
             <span className="text-brand-orange font-black text-[10px] tracking-[0.5em] font-orbitron">{selectedPlanet.code} / SEC-{currentSectorIdx + 1}</span>
             <h3 className="text-7xl font-black font-orbitron text-brand-light mt-2 tracking-tighter uppercase leading-none">{sector.name}</h3>
             <p className="text-brand-lightMuted text-xl mt-4 max-w-2xl font-medium opacity-80 leading-relaxed italic">"{sector.description}"</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8 space-y-10">
            <h4 className="text-[10px] font-black text-brand-green uppercase tracking-[0.5em] flex items-center gap-4">
              <Activity className="w-5 h-5" /> Sector Analysis Results
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {discoveredNodes.length === 0 ? (
                <div className="col-span-full h-80 flex flex-col items-center justify-center bg-brand-darkSecondary/20 rounded-[4rem] border-2 border-dashed border-brand-greenMuted/10">
                   <p className="text-brand-gray font-black uppercase tracking-widest text-xs opacity-40 italic">구역 내 탐사 지점을 분석하십시오</p>
                </div>
              ) : (
                discoveredNodes.map(nodeId => {
                  const dp = sector.discoveryPoints.find(p => p.id === nodeId);
                  return dp && (
                    <div key={nodeId} className="bg-brand-darkSecondary/90 p-12 rounded-[4rem] border-2 border-brand-green/10 animate-in slide-in-from-bottom-8">
                       <h4 className="text-[11px] font-black font-orbitron text-brand-orange uppercase tracking-widest mb-6 border-b border-brand-orange/10 pb-4">{dp.label}</h4>
                       <p className="text-brand-light font-medium text-base leading-relaxed">{dp.data}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-10">
            <div className="bg-brand-darkSecondary/80 p-10 rounded-[4.5rem] border border-brand-greenMuted/10 shadow-2xl">
               <h4 className="text-[10px] font-black text-brand-orange uppercase tracking-widest mb-8 flex items-center gap-4">
                 <Database className="w-5 h-5" /> Planet Log Submission
               </h4>
               <FastTextArea key={`textarea-${selectedPlanet.id}`} placeholder="탐사 기록을 남기십시오..." onValueChange={(v: string) => tempLog.current = v} className="w-full bg-brand-dark border-2 border-brand-greenMuted/10 rounded-[2.5rem] p-6 min-h-[140px] text-brand-light focus:border-brand-orange outline-none mb-6 font-medium text-sm" />
               <button onClick={handleLogSubmit} className="w-full bg-brand-orange hover:bg-brand-orangeLight text-white font-black py-4 rounded-[2rem] text-[11px] tracking-[0.3em] uppercase font-orbitron flex items-center justify-center gap-3">
                  <Send className="w-5 h-5" /> TRANSMIT DATA
               </button>
            </div>

            <div className="bg-brand-darkSecondary/40 p-10 rounded-[4.5rem] border border-brand-greenMuted/10 max-h-[500px] overflow-y-auto custom-scrollbar">
               <h4 className="text-[10px] font-black text-brand-green/60 uppercase tracking-widest mb-8 flex items-center gap-4">
                 <History className="w-5 h-5" /> Stage Historical Records
               </h4>
               <div className="space-y-6">
                  {currentPlanetLogs.length === 0 ? (
                    <div className="text-center py-10 opacity-30 flex flex-col items-center gap-3">
                      <Info className="w-6 h-6" />
                      <p className="text-[9px] uppercase tracking-widest font-black">No Data</p>
                    </div>
                  ) : (
                    currentPlanetLogs.map(log => (
                      <div key={log.id} className="border-l-4 border-brand-orange/40 pl-6 py-4 bg-brand-dark/20 rounded-r-3xl">
                         <div className="flex justify-between items-center mb-2">
                            <span className="text-[11px] font-black text-brand-orange uppercase font-orbitron">{log.author}</span>
                            <span className="text-[9px] text-brand-gray font-black opacity-30">{new Date(log.timestamp).toLocaleDateString()}</span>
                         </div>
                         <p className="text-sm text-brand-light/80 font-medium italic">"{log.content}"</p>
                      </div>
                    ))
                  )}
               </div>
            </div>
          </div>
        </div>

        {activeEncounter && (
          <div className="fixed inset-0 z-[100] bg-brand-dark/95 backdrop-blur-2xl flex items-center justify-center p-12">
             <div className="bg-brand-darkSecondary max-w-3xl w-full rounded-[5rem] border-4 border-brand-orange p-16 relative">
                <button onClick={() => setActiveEncounter(null)} className="absolute top-12 right-12 text-brand-gray hover:text-white transition-colors">
                   <Plus className="w-8 h-8 rotate-45" />
                </button>
                <div className="flex items-center gap-8 mb-12">
                   <div className="w-24 h-24 bg-brand-orange/10 rounded-[3rem] flex items-center justify-center text-brand-orange border border-brand-orange/30">
                      <User className="w-12 h-12" />
                   </div>
                   <div>
                      <h4 className="text-4xl font-black font-orbitron text-brand-light uppercase mb-2">{activeEncounter.entityName}</h4>
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-brand-orange animate-pulse"></span>
                        <span className="text-xs text-brand-orange font-black uppercase tracking-[0.4em] italic">Unknown Biometry</span>
                      </div>
                   </div>
                </div>

                <div className="space-y-8 max-h-[400px] overflow-y-auto custom-scrollbar mb-12 pr-6">
                  {activeEncounter.history.map((h, i) => (
                    <div key={i} className="space-y-6">
                       <div className="bg-brand-green/10 p-6 rounded-[2.5rem] border border-brand-green/20 ml-16 text-right">
                          <p className="text-brand-light italic text-base">"탐사자가 {h.choice}"</p>
                       </div>
                       <div className="bg-brand-dark p-6 rounded-[2.5rem] border border-brand-greenMuted/10 mr-16">
                          <p className="text-brand-light/80 italic text-base">{h.response}</p>
                       </div>
                    </div>
                  ))}
                  {!activeEncounter.isCompleted && currentStep && (
                    <div className="bg-brand-dark p-8 rounded-[3rem] border-2 border-brand-orange/30">
                       <p className="text-lg text-brand-light font-medium italic text-center">"{currentStep.message}"</p>
                    </div>
                  )}
                </div>

                {!activeEncounter.isCompleted && currentStep ? (
                  <div className="grid grid-cols-1 gap-4">
                     {currentStep.choices.map((c, i) => (
                       <button key={i} onClick={() => handleChoice(c)} className="w-full text-left bg-brand-dark border-2 border-brand-greenMuted/20 hover:border-brand-orange hover:bg-brand-orange/5 p-6 rounded-3xl transition-all group flex items-center justify-between">
                          <span className="text-brand-light font-bold text-lg">탐사자가 {c.text}</span>
                          <ChevronRight className="w-6 h-6 text-brand-gray group-hover:text-brand-orange group-hover:translate-x-2" />
                       </button>
                     ))}
                  </div>
                ) : (
                  <button onClick={() => setActiveEncounter(null)} className="w-full bg-brand-green hover:bg-brand-greenLight py-5 rounded-3xl font-black text-sm uppercase tracking-[0.3em] text-white">관측 완료 및 시스템 복귀</button>
                )}
             </div>
          </div>
        )}
      </div>
    );
  };

  const AdminLoginScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-screen relative z-10 px-4">
      <div className="bg-brand-darkSecondary/95 backdrop-blur-3xl p-12 rounded-[3.5rem] border border-brand-orange/20 shadow-[0_0_100px_rgba(255,54,0,0.15)] max-w-md w-full">
        <h2 className="text-3xl font-black font-orbitron mb-2 text-brand-orange text-center uppercase tracking-widest">Root Auth</h2>
        <div className="space-y-4 mt-10">
          <FastInput type="email" placeholder="ADMIN ID" onValueChange={(v: string) => adminIdRef.current = v} className="w-full bg-brand-dark border-2 border-brand-greenMuted/10 rounded-2xl px-6 py-4 focus:border-brand-orange outline-none text-brand-light" />
          <FastInput type="password" placeholder="ACCESS KEY" onValueChange={(v: string) => adminPwRef.current = v} onEnter={handleAdminLogin} className="w-full bg-brand-dark border-2 border-brand-greenMuted/10 rounded-2xl px-6 py-4 focus:border-brand-orange outline-none text-brand-light" />
        </div>
        <div className="flex gap-4 mt-10">
          <button onClick={() => setView('nickname')} className="flex-1 bg-brand-greenDark/40 text-brand-lightMuted font-black py-4 rounded-2xl">취소</button>
          <button onClick={handleAdminLogin} className="flex-1 bg-brand-orange hover:bg-brand-orangeLight text-white font-black py-4 rounded-2xl shadow-lg">승인</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen selection:bg-brand-orange selection:text-white overflow-x-hidden font-noto bg-brand-dark">
      <StarField />
      {view !== 'nickname' && view !== 'admin_login' && (
        <header className="fixed top-0 left-0 right-0 z-50 bg-brand-dark/20 backdrop-blur-3xl border-b-2 border-brand-greenMuted/5 h-24">
          <div className="max-w-[1600px] mx-auto px-10 h-full flex items-center justify-between">
            <div className="flex items-center gap-5 cursor-pointer group" onClick={() => setView('galaxy')}>
              <div className="w-12 h-12 rounded-2xl bg-brand-orange flex items-center justify-center shadow-2xl transition-all">
                <Rocket className="w-7 h-7 text-white" />
              </div>
              <div className="flex flex-col">
                 <span className="font-orbitron font-black text-3xl tracking-tighter text-brand-light leading-none">L.I.F.E.</span>
                 <span className="text-[8px] font-black text-brand-orange uppercase tracking-[0.5em] mt-1">Interstellar Division</span>
              </div>
            </div>
            <div className="flex items-center gap-6">
               <span className="text-sm font-black text-brand-orange font-orbitron">{nickname}</span>
               <div className="flex gap-4 items-center">
                 <button onClick={() => setView('admin_login')} className="p-2.5 bg-brand-dark/40 border border-brand-greenMuted/20 rounded-xl hover:text-brand-orange">
                    <ShieldAlert className="w-5 h-5" />
                 </button>
                 {isAdmin && (
                    <button onClick={() => { setIsAdmin(false); localStorage.removeItem('life-admin'); }} className="p-2.5 bg-brand-orangeDark/20 border-2 border-brand-orangeDark rounded-xl">
                       <Power className="w-5 h-5 text-brand-orangeDark" />
                    </button>
                 )}
               </div>
            </div>
          </div>
        </header>
      )}
      <main className="relative">
        {view === 'nickname' && <NicknameScreen />}
        {view === 'admin_login' && <AdminLoginScreen />}
        {view === 'galaxy' && <GalaxyMap />}
        {view === 'planet' && <PlanetDetailView />}
        {view === 'logs' && (
          <div className="pt-32 pb-12 px-10 max-w-4xl mx-auto relative z-10 animate-in fade-in duration-500">
            <button onClick={() => setView('galaxy')} className="text-brand-gray hover:text-brand-orange transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-3 mb-16">
              <ChevronLeft className="w-5 h-5" /> Back to Chart
            </button>
            <div className="space-y-12">
              {logs.filter(l => l.author === nickname || isAdmin).map(log => (
                <div key={log.id} className="bg-brand-darkSecondary p-10 rounded-[4rem] border-2 border-brand-greenMuted/10">
                   <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-5">
                         <div className="w-12 h-12 bg-brand-orange/5 rounded-2xl flex items-center justify-center text-brand-orange"><Globe className="w-6 h-6" /></div>
                         <div>
                            <h4 className="font-black text-xl font-orbitron text-brand-light uppercase">{log.planetName}</h4>
                            <span className="text-[9px] text-brand-gray font-black uppercase">Pioneer: {log.author}</span>
                         </div>
                      </div>
                      <button onClick={() => { if(confirm('기록 삭제?')) { const u = logs.filter(l => l.id !== log.id); setLogs(u); localStorage.setItem('life-logs', JSON.stringify(u)); } }} className="text-brand-gray hover:text-brand-orangeDark"><Trash2 className="w-5 h-5" /></button>
                   </div>
                   <p className="text-brand-light/90 text-lg leading-relaxed italic font-medium">"{log.content}"</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      {isAdmin && (
        <div className="fixed bottom-10 left-10 z-50 px-8 py-4 bg-brand-orangeDark text-white text-xs font-black rounded-3xl shadow-[0_0_50px_rgba(255,54,0,0.3)] flex items-center gap-4 border-2 border-brand-orange/40 uppercase tracking-[0.3em] font-orbitron animate-pulse">
          <ShieldAlert className="w-6 h-6" /> ROOT_ACCESS
        </div>
      )}
    </div>
  );
};

export default App;
