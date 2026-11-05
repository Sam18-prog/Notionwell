'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Network,
  Sparkles,
  FileText,
  RefreshCw,
  ArrowRight,
  GitFork,
  Bookmark,
  Share2,
  Info,
  CheckCircle2,
  Layers,
  Bot,
} from 'lucide-react';
import { getCurrentUser, getDecks, User } from '@/lib/app';
import { KnowledgeConnection, ConnectionType } from '@/lib/intelligence';
import ConnectionsLoading from './loading';

export default function ConnectionsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [connections, setConnections] = useState<KnowledgeConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | ConnectionType>('all');
  const [selectedConnection, setSelectedConnection] = useState<KnowledgeConnection | null>(null);

  useEffect(() => {
    setMounted(true);
    setUser(getCurrentUser());
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/study/connections');
      const data = await res.json();
      if (data.success && data.connections) {
        setConnections(data.connections);
        if (data.connections.length > 0 && !selectedConnection) {
          setSelectedConnection(data.connections[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load connections:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerDiscovery = async () => {
    try {
      setIsDiscovering(true);
      const res = await fetch('/api/study/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success && data.connections) {
        setConnections(data.connections);
        if (data.connections.length > 0) {
          setSelectedConnection(data.connections[0]);
        }
      }
    } catch (err) {
      console.error('Failed to discover connections:', err);
    } finally {
      setIsDiscovering(false);
    }
  };

  if (!mounted) return <ConnectionsLoading />;

  const filteredConnections = activeFilter === 'all'
    ? connections
    : connections.filter(c => c.connectionType === activeFilter);

  const getConnectionTypeBadge = (type: ConnectionType) => {
    switch (type) {
      case 'shared_concept':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-[#2563EB] dark:bg-blue-950/70 dark:text-blue-400 text-[10px] font-extrabold uppercase tracking-wider">
            Shared Concept
          </span>
        );
      case 'prerequisite':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-400 text-[10px] font-extrabold uppercase tracking-wider">
            Prerequisite
          </span>
        );
      case 'complementary':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider">
            Complementary
          </span>
        );
      case 'contradiction_or_contrast':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-400 text-[10px] font-extrabold uppercase tracking-wider">
            Contrast / Notation
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1D] text-[#0F172A] dark:text-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900/60 text-indigo-600">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Cross-Document Knowledge Map</h1>
              <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
                Multi-document RAG concept discovery identifying prerequisites, shared principles, and complementary proofs
              </p>
            </div>
          </div>

          <button
            onClick={handleTriggerDiscovery}
            disabled={isDiscovering}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer"
          >
            <Sparkles className={`w-4 h-4 ${isDiscovering ? 'animate-spin' : ''}`} />
            <span>{isDiscovering ? 'Analyzing Document Corpus...' : 'Discover New Connections'}</span>
          </button>
        </div>

        {/* FILTER BAR */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[#64748B] dark:text-[#94A3B8] font-bold mr-1">Connection Type:</span>
          {(['all', 'shared_concept', 'prerequisite', 'complementary', 'contradiction_or_contrast'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveFilter(t)}
              className={`px-3 py-1.5 rounded-xl font-bold capitalize transition-all whitespace-nowrap ${
                activeFilter === t
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] text-[#64748B] dark:text-[#CBD5E1] hover:border-blue-400'
              }`}
            >
              {t.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* MAIN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* CONNECTIONS LIST */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
              Discovered Interconnections ({filteredConnections.length})
            </h2>

            {isLoading ? (
              <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449]">
                <RefreshCw className="w-5 h-5 animate-spin text-[#2563EB] mx-auto mb-2" />
                <p className="text-xs text-[#64748B]">Indexing cross-document vectors...</p>
              </div>
            ) : filteredConnections.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#0F172A] border border-dashed border-[#CBD5E1] dark:border-[#334155] space-y-3">
                <Network className="w-8 h-8 text-[#94A3B8] mx-auto" />
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  No connections identified yet. Click "Discover New Connections" to scan your library.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredConnections.map(c => {
                  const isSelected = selectedConnection?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedConnection(c)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                        isSelected
                          ? 'bg-blue-50/80 dark:bg-blue-950/40 border-[#2563EB] shadow-xs'
                          : 'bg-white dark:bg-[#0F172A] border-[#E2E8F0] dark:border-[#263449] hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#0F172A] dark:text-white truncate">
                          {c.title}
                        </span>
                        {getConnectionTypeBadge(c.connectionType)}
                      </div>

                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                        <span className="truncate max-w-[90px] font-semibold">{c.sourceDocumentName}</span>
                        <ArrowRight className="w-3 h-3 text-[#2563EB] shrink-0" />
                        <span className="truncate max-w-[90px] font-semibold">{c.targetDocumentName}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* DETAIL VIEW / CONCEPT BRIDGE EXPLORER */}
          <div className="lg:col-span-2 space-y-6">
            {selectedConnection ? (
              <div className="p-6 rounded-3xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] shadow-xs space-y-6">
                
                {/* Header */}
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#E2E8F0] dark:border-[#263449]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getConnectionTypeBadge(selectedConnection.connectionType)}
                      <span className="text-xs text-[#94A3B8]">Verified Cross-Document Link</span>
                    </div>
                    <h2 className="text-xl font-black">{selectedConnection.title}</h2>
                    <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">
                      {selectedConnection.description}
                    </p>
                  </div>
                </div>

                {/* TWO-DOCUMENT VISUAL BRIDGE */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* SOURCE DOCUMENT */}
                  <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#131D31] border border-[#E2E8F0] dark:border-[#263449] space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#2563EB]">
                      <FileText className="w-4 h-4" />
                      <span className="truncate">{selectedConnection.sourceDocumentName}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] text-xs text-[#475569] dark:text-[#94A3B8] italic">
                      "{selectedConnection.sourceChunkSnippet || 'Foundational conceptual formulation'}"
                    </div>
                    <span className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-extrabold block">
                      Origin Concept
                    </span>
                  </div>

                  {/* TARGET DOCUMENT */}
                  <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#131D31] border border-[#E2E8F0] dark:border-[#263449] space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <FileText className="w-4 h-4" />
                      <span className="truncate">{selectedConnection.targetDocumentName}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] text-xs text-[#475569] dark:text-[#94A3B8] italic">
                      "{selectedConnection.targetChunkSnippet || 'Extended application and technical proof'}"
                    </div>
                    <span className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-extrabold block">
                      Connected Application
                    </span>
                  </div>
                </div>

                {/* CITATIONS & PROOFS */}
                {selectedConnection.citations && selectedConnection.citations.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                      <Bookmark className="w-3.5 h-3.5 text-[#2563EB]" />
                      Document Grounding & Citations
                    </h3>
                    <div className="space-y-2">
                      {selectedConnection.citations.map((c, cIdx) => (
                        <div
                          key={cIdx}
                          className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#131D31] border border-[#E2E8F0] dark:border-[#263449] text-xs flex items-center justify-between"
                        >
                          <span className="font-bold text-[#0F172A] dark:text-white">
                            {c.documentName} • <span className="font-medium text-[#64748B]">{c.heading}</span>
                          </span>
                          <span className="text-[11px] text-[#2563EB] font-bold">Verified</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ACTIONS */}
                <div className="pt-2 flex items-center gap-3">
                  <Link
                    href={`/assistant?initialQuery=${encodeURIComponent(`Compare and explain the relationship between ${selectedConnection.sourceDocumentName} and ${selectedConnection.targetDocumentName} regarding ${selectedConnection.title}.`)}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition-all shadow-xs"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Explore in AI Study Assistant</span>
                  </Link>
                </div>

              </div>
            ) : (
              <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] space-y-3">
                <Network className="w-10 h-10 text-[#94A3B8] mx-auto animate-pulse" />
                <h3 className="text-base font-bold">Select a Concept Bridge to Inspect</h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] max-w-sm mx-auto">
                  Cross-document analysis uncovers how disparate lecture notes, chapters, and problem sheets integrate into a cohesive mental framework.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
