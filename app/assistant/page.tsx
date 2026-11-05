'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import AssistantLoading from './loading';
import {
  Sparkles,
  Bot,
  FileText,
  UploadCloud,
  Plus,
  Trash2,
  CheckCircle2,
  BookOpen,
  HelpCircle,
  Clock,
  Layers,
  Send,
  Copy,
  Check,
  Search,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  X,
  FileCode,
  File,
  Bookmark,
  Share2,
  Download,
  Info,
  Folder,
  ArrowRight,
  GraduationCap,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square,
} from 'lucide-react';
import { getCurrentUser, getDecks, getDeckSources, Deck, DeckSource, User } from '@/lib/app';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// -----------------------------------------------------------------------------
// INTERFACES & TYPES
// -----------------------------------------------------------------------------
export interface SourceItem {
  id: string;
  fileName: string;
  fileType: 'pdf' | 'docx' | 'txt' | 'image' | 'notes';
  characterCount: number;
  chunkCount: number;
  createdAt: string;
  deckId?: string | null;
  deckName?: string;
  enabled: boolean;
}

export interface Citation {
  index: number;
  documentName: string;
  heading: string;
  excerpt: string;
  similarity: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp: string;
}

export interface StudioArtifact {
  type: 'study_guide' | 'briefing_doc' | 'faq' | 'timeline' | 'mcqs';
  title: string;
  content: string;
  sourcesCount: number;
  createdAt: string;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  sourceTag?: string;
  createdAt: string;
}

export default function AssistantPage() {
  // Current user & authentication
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  // Layout states
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [rightActiveTab, setRightActiveTab] = useState<'studio' | 'notes'>('studio');

  // Sources states
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [sourceSearch, setSourceSearch] = useState('');
  const [isAddSourceModalOpen, setIsAddSourceModalOpen] = useState(false);
  const [addSourceTab, setAddSourceTab] = useState<'upload' | 'paste' | 'decks'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Paste note state
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteContent, setPasteContent] = useState('');

  // Available user decks for import
  const [availableDecks, setAvailableDecks] = useState<Deck[]>([]);
  const [selectedDeckFilter, setSelectedDeckFilter] = useState<string>('all');

  // Chat states
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatConversationId, setChatConversationId] = useState<string>('session-1');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Studio states
  const [activeArtifact, setActiveArtifact] = useState<StudioArtifact | null>(null);
  const [isStudioLoading, setIsStudioLoading] = useState(false);
  const [studioTypeLoading, setStudioTypeLoading] = useState<string | null>(null);

  // Notes states
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');

  // Selected citation modal
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);

  // Copied state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Voice Tutoring states (Web Speech API)
  const [isListening, setIsListening] = useState(false);
  const [activeSpeakingId, setActiveSpeakingId] = useState<string | null>(null);
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        setSpeechRecognitionSupported(true);
        const recog = new SpeechRec();
        recog.continuous = false;
        recog.interimResults = true;
        recog.lang = 'en-US';

        recog.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join('');
          setInputText(transcript);
        };

        recog.onerror = (err: any) => {
          console.warn('[SpeechRecognition error]:', err);
          setIsListening(false);
        };

        recog.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recog;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Speech recognition start failed:', err);
      }
    }
  };

  const speakMessage = (content: string, msgId: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (activeSpeakingId === msgId) {
      window.speechSynthesis.cancel();
      setActiveSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean text by stripping markdown formatting characters
    const cleanText = content
      .replace(/\[\d+\]/g, '')
      .replace(/[#*_`~>]/g, '')
      .replace(/\n+/g, ' ');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setActiveSpeakingId(null);
    };

    utterance.onerror = () => {
      setActiveSpeakingId(null);
    };

    setActiveSpeakingId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // ---------------------------------------------------------------------------
  // INITIALIZATION & LOCAL PERSISTENCE
  // ---------------------------------------------------------------------------
  useEffect(() => {
    setMounted(true);
    const currentUser = getCurrentUser();
    setUser(currentUser);

    // Load available study decks
    const loadedDecks = getDecks();
    setAvailableDecks(loadedDecks);

    // Load saved sources from localStorage or default examples
    const savedSourcesKey = `notionwell_sources_${currentUser?.id || 'guest'}`;
    const savedSourcesJson = localStorage.getItem(savedSourcesKey);
    let initialLocalSources: SourceItem[] = [];
    if (savedSourcesJson) {
      try {
        initialLocalSources = JSON.parse(savedSourcesJson);
        setSources(initialLocalSources);
      } catch (e) {
        initializeSampleSources(loadedDecks);
      }
    } else {
      initializeSampleSources(loadedDecks);
    }

    // Hydrate and reconcile with server-side vector store
    fetch(`/api/assistant/index-document?userId=${currentUser?.id || 'default-user'}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && Array.isArray(data.documents) && data.documents.length > 0) {
          setSources((prev) => {
            const merged = [...prev];
            for (const sDoc of data.documents) {
              const existingIdx = merged.findIndex(
                (m) => m.id === sDoc.id || m.fileName === sDoc.fileName
              );
              if (existingIdx === -1) {
                merged.push({
                  id: sDoc.id,
                  fileName: sDoc.fileName,
                  fileType: sDoc.fileType,
                  characterCount: sDoc.characterCount,
                  chunkCount: sDoc.chunkCount,
                  createdAt: sDoc.createdAt,
                  deckId: sDoc.deckId,
                  enabled: true,
                });
              } else {
                merged[existingIdx].id = sDoc.id; // Align ID with server vector store
              }
            }
            return merged;
          });
        }
      })
      .catch(() => {});

    // Load saved notes
    const savedNotesKey = `notionwell_assistant_notes_${currentUser?.id || 'guest'}`;
    const savedNotesJson = localStorage.getItem(savedNotesKey);
    if (savedNotesJson) {
      try {
        setNotes(JSON.parse(savedNotesJson));
      } catch (e) {}
    }

    // Load chat history
    const savedChatKey = `notionwell_assistant_chat_${currentUser?.id || 'guest'}`;
    const savedChatJson = localStorage.getItem(savedChatKey);
    if (savedChatJson) {
      try {
        setMessages(JSON.parse(savedChatJson));
      } catch (e) {}
    }
  }, []);

  // Save sources to localStorage on change
  useEffect(() => {
    if (!mounted) return;
    const key = `notionwell_sources_${user?.id || 'guest'}`;
    localStorage.setItem(key, JSON.stringify(sources));
  }, [sources, mounted, user]);

  // Save notes to localStorage on change
  useEffect(() => {
    if (!mounted) return;
    const key = `notionwell_assistant_notes_${user?.id || 'guest'}`;
    localStorage.setItem(key, JSON.stringify(notes));
  }, [notes, mounted, user]);

  // Save chat messages to localStorage on change
  useEffect(() => {
    if (!mounted) return;
    const key = `notionwell_assistant_chat_${user?.id || 'guest'}`;
    localStorage.setItem(key, JSON.stringify(messages));
  }, [messages, mounted, user]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatLoading]);

  // Initialize sample sources from existing decks if available
  const initializeSampleSources = (loadedDecks: Deck[]) => {
    const defaultSources: SourceItem[] = [];

    // If user has decks with sources, import them
    for (const deck of loadedDecks) {
      const deckSources = getDeckSources(deck.id);
      for (const ds of deckSources) {
        if (ds.extractedText && ds.extractedText.length > 50) {
          defaultSources.push({
            id: ds.id,
            fileName: ds.fileName || `${deck.name} Source`,
            fileType: ds.fileType || 'txt',
            characterCount: ds.extractedText.length,
            chunkCount: Math.max(1, Math.ceil(ds.extractedText.length / 700)),
            createdAt: ds.addedAt || new Date().toISOString(),
            deckId: deck.id,
            deckName: deck.name,
            enabled: true,
          });

          // Asynchronously index into backend vector store
          fetch('/api/assistant/index-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: ds.id,
              documentId: ds.id,
              userId: user?.id || 'default-user',
              deckId: deck.id,
              fileName: ds.fileName || `${deck.name} Source`,
              fileType: ds.fileType || 'txt',
              text: ds.extractedText,
            }),
          }).catch(() => {});
        }
      }
    }

    setSources(defaultSources);
  };

  // ---------------------------------------------------------------------------
  // SOURCE ACTIONS
  // ---------------------------------------------------------------------------
  const toggleSourceEnabled = (id: string) => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const toggleSelectAllSources = () => {
    const allEnabled = sources.every((s) => s.enabled);
    setSources((prev) => prev.map((s) => ({ ...s, enabled: !allEnabled })));
  };

  const deleteSource = async (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
    try {
      await fetch(`/api/assistant/index-document?id=${id}&userId=${user?.id || 'default-user'}`, {
        method: 'DELETE',
      });
    } catch (e) {}
  };

  // ---------------------------------------------------------------------------
  // FILE UPLOAD HANDLER
  // ---------------------------------------------------------------------------
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', user?.id || 'default-user');
        if (selectedDeckFilter !== 'all') {
          formData.append('deckId', selectedDeckFilter);
        }

        const res = await fetch('/api/assistant/index-document', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || `Failed to process ${file.name}`);
        }

        const newSource: SourceItem = {
          id: data.document.id,
          fileName: data.document.fileName,
          fileType: data.document.fileType,
          characterCount: data.document.characterCount,
          chunkCount: data.chunkCount || 1,
          createdAt: data.document.createdAt,
          deckId: selectedDeckFilter !== 'all' ? selectedDeckFilter : null,
          enabled: true,
        };

        setSources((prev) => [newSource, ...prev]);
      }

      setIsAddSourceModalOpen(false);
    } catch (err: any) {
      setUploadError(err?.message || 'Error uploading file.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // ---------------------------------------------------------------------------
  // PASTE TEXT HANDLER
  // ---------------------------------------------------------------------------
  const handlePasteNotesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteContent.trim()) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const fileName = pasteTitle.trim() || 'Pasted Lecture Notes';
      const res = await fetch('/api/assistant/index-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || 'default-user',
          fileName,
          fileType: 'notes',
          text: pasteContent,
          deckId: selectedDeckFilter !== 'all' ? selectedDeckFilter : null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to index notes');
      }

      const newSource: SourceItem = {
        id: data.document.id,
        fileName: data.document.fileName,
        fileType: 'notes',
        characterCount: data.document.characterCount,
        chunkCount: data.chunkCount || 1,
        createdAt: data.document.createdAt,
        deckId: selectedDeckFilter !== 'all' ? selectedDeckFilter : null,
        enabled: true,
      };

      setSources((prev) => [newSource, ...prev]);
      setPasteTitle('');
      setPasteContent('');
      setIsAddSourceModalOpen(false);
    } catch (err: any) {
      setUploadError(err?.message || 'Error indexing notes.');
    } finally {
      setIsUploading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // IMPORT FROM DECK HANDLER
  // ---------------------------------------------------------------------------
  const handleImportDeck = async (deck: Deck) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const deckSources = getDeckSources(deck.id);
      let combinedText = '';

      if (deckSources.length > 0) {
        combinedText = deckSources.map((s) => s.extractedText).join('\n\n');
      } else if (deck.flashcards.length > 0) {
        combinedText = deck.flashcards
          .map((c) => `Q: ${c.question}\nA: ${c.answer}\nSource: ${c.sourceQuote || c.sourceReference || ''}`)
          .join('\n\n');
      }

      if (!combinedText || combinedText.length < 50) {
        throw new Error('This deck does not contain extractable text to index.');
      }

      const res = await fetch('/api/assistant/index-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || 'default-user',
          fileName: `${deck.name} (Deck Notes)`,
          fileType: 'notes',
          text: combinedText,
          deckId: deck.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to index deck');
      }

      const newSource: SourceItem = {
        id: data.document.id,
        fileName: data.document.fileName,
        fileType: 'notes',
        characterCount: data.document.characterCount,
        chunkCount: data.chunkCount || 1,
        createdAt: data.document.createdAt,
        deckId: deck.id,
        deckName: deck.name,
        enabled: true,
      };

      setSources((prev) => [newSource, ...prev]);
      setIsAddSourceModalOpen(false);
    } catch (err: any) {
      setUploadError(err?.message || 'Error importing deck.');
    } finally {
      setIsUploading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // CHAT QUERY SUBMIT (RAG)
  // ---------------------------------------------------------------------------
  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputText;
    if (!textToSend.trim() || isChatLoading) return;

    const enabledSourceIds = sources.filter((s) => s.enabled).map((s) => s.id);

    if (enabledSourceIds.length === 0) {
      const warningMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content:
          '⚠️ Please select at least one study source in the **Sources panel** (left) so I can retrieve factual answers from your materials.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, warningMsg]);
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend.trim(),
          conversationId: chatConversationId,
          documentIds: enabledSourceIds,
          deckId: selectedDeckFilter !== 'all' ? selectedDeckFilter : undefined,
          userId: user?.id || 'default-user',
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to retrieve answer');
      }

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        citations: data.citations || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `❌ ${err?.message || 'Error contacting AI assistant. Please check your network and API key.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // STUDIO GENERATORS
  // ---------------------------------------------------------------------------
  const handleGenerateStudio = async (
    type: 'study_guide' | 'briefing_doc' | 'faq' | 'timeline' | 'mcqs'
  ) => {
    const enabledSourceIds = sources.filter((s) => s.enabled).map((s) => s.id);
    if (enabledSourceIds.length === 0) {
      alert('Please check at least one source in the Sources panel first.');
      return;
    }

    setIsStudioLoading(true);
    setStudioTypeLoading(type);
    setRightActiveTab('studio');
    setRightPanelOpen(true);

    try {
      const res = await fetch('/api/assistant/studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          documentIds: enabledSourceIds,
          userId: user?.id || 'default-user',
          deckId: selectedDeckFilter !== 'all' ? selectedDeckFilter : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate study artifact');
      }

      setActiveArtifact({
        type,
        title: data.title,
        content: data.content,
        sourcesCount: data.sourcesCount,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } catch (err: any) {
      alert(`Error generating studio material: ${err?.message}`);
    } finally {
      setIsStudioLoading(false);
      setStudioTypeLoading(null);
    }
  };

  // ---------------------------------------------------------------------------
  // NOTES MANAGEMENT
  // ---------------------------------------------------------------------------
  const handleSaveNote = () => {
    if (!newNoteTitle.trim() && !newNoteContent.trim()) return;

    const note: NoteItem = {
      id: `note-${Date.now()}`,
      title: newNoteTitle.trim() || 'Untitled Note',
      content: newNoteContent.trim(),
      sourceTag: `${sources.filter((s) => s.enabled).length} active sources`,
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setNotes((prev) => [note, ...prev]);
    setNewNoteTitle('');
    setNewNoteContent('');
    setIsCreatingNote(false);
  };

  const handleSaveMessageToNotes = (msg: ChatMessage) => {
    const note: NoteItem = {
      id: `note-${Date.now()}`,
      title: `Q&A Excerpt (${msg.timestamp})`,
      content: msg.content,
      sourceTag: msg.citations?.length ? `${msg.citations.length} Citations` : 'AI Assistant',
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setNotes((prev) => [note, ...prev]);
    setRightActiveTab('notes');
    setRightPanelOpen(true);
  };

  const handleSaveArtifactToNotes = (artifact: StudioArtifact) => {
    const note: NoteItem = {
      id: `note-${Date.now()}`,
      title: artifact.title,
      content: artifact.content,
      sourceTag: `${artifact.sourcesCount} Sources`,
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setNotes((prev) => [note, ...prev]);
    setRightActiveTab('notes');
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  // ---------------------------------------------------------------------------
  // UTILITIES & HELPERS
  // ---------------------------------------------------------------------------
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-rose-500" />;
      case 'docx':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'image':
        return <FileCode className="w-4 h-4 text-emerald-500" />;
      default:
        return <BookOpen className="w-4 h-4 text-amber-500" />;
    }
  };

  const filteredSources = sources.filter((s) => {
    const matchesSearch = s.fileName.toLowerCase().includes(sourceSearch.toLowerCase());
    const matchesDeck =
      selectedDeckFilter === 'all' || s.deckId === selectedDeckFilter;
    return matchesSearch && matchesDeck;
  });

  const enabledSourcesCount = sources.filter((s) => s.enabled).length;

  if (!mounted) return <AssistantLoading />;

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] -mt-4 -mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden bg-[#F6F8FC] dark:bg-[#0B1220]">
      {/* -----------------------------------------------------------------------
          TOP WORKSPACE TOOLBAR
      ------------------------------------------------------------------------ */}
      <header className="h-14 px-4 sm:px-6 bg-white dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-[#263449] flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-[#60A5FA]">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                AI Study Assistant
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/50 text-[#2563EB] dark:text-[#60A5FA] border border-blue-200 dark:border-blue-800">
                RAG Engine
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] hidden sm:block">
              Retrieval-Augmented Study Workspace • Grounded strictly in your notes
            </p>
          </div>
        </div>

        {/* TOOLBAR CONTROLS */}
        <div className="flex items-center gap-2">
          {/* Deck Filter Dropdown */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] text-xs">
            <Folder className="w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8]" />
            <select
              value={selectedDeckFilter}
              onChange={(e) => setSelectedDeckFilter(e.target.value)}
              className="bg-transparent text-[#0F172A] dark:text-[#F8FAFC] font-medium outline-hidden cursor-pointer"
            >
              <option value="all">All Study Materials</option>
              {availableDecks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Left Sources Panel */}
          <button
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            className={`p-2 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              leftPanelOpen
                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-[#2563EB] dark:text-[#60A5FA]'
                : 'border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#0F172A] text-[#64748B] dark:text-[#94A3B8]'
            }`}
            title="Toggle Sources Panel"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Sources ({enabledSourcesCount})</span>
          </button>

          {/* Toggle Right Studio Panel */}
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className={`p-2 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              rightPanelOpen
                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-[#2563EB] dark:text-[#60A5FA]'
                : 'border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#0F172A] text-[#64748B] dark:text-[#94A3B8]'
            }`}
            title="Toggle Studio & Notes Panel"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Studio</span>
          </button>
        </div>
      </header>

      {/* -----------------------------------------------------------------------
          MAIN 3-PANEL WORKSPACE CONTAINER
      ------------------------------------------------------------------------ */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* =====================================================================
            LEFT PANEL: SOURCES LIST (Width ~300px)
        ====================================================================== */}
        {leftPanelOpen && (
          <aside className="w-72 sm:w-80 shrink-0 border-r border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#0F172A] flex flex-col justify-between transition-all duration-200 z-10">
            {/* Sources Header */}
            <div className="p-3.5 border-b border-[#E2E8F0] dark:border-[#263449] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="font-extrabold text-xs uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
                    Sources
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F1F5F9] dark:bg-[#1E293B] text-[#475569] dark:text-[#CBD5E1]">
                    {enabledSourcesCount} / {sources.length} active
                  </span>
                </div>

                {/* + Add Source CTA */}
                <button
                  onClick={() => setIsAddSourceModalOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition-all shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add source</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Search sources..."
                  value={sourceSearch}
                  onChange={(e) => setSourceSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] text-xs text-[#0F172A] dark:text-white placeholder-[#94A3B8] outline-hidden focus:border-[#2563EB]"
                />
              </div>

              {/* Select All Toggle */}
              {sources.length > 0 && (
                <div className="flex items-center justify-between pt-1 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sources.length > 0 && sources.every((s) => s.enabled)}
                      onChange={toggleSelectAllSources}
                      className="w-3.5 h-3.5 rounded text-[#2563EB] focus:ring-0 cursor-pointer"
                    />
                    <span>Select all ({sources.length})</span>
                  </label>
                  <span>{enabledSourcesCount} selected</span>
                </div>
              )}
            </div>

            {/* Sources Scrollable List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {filteredSources.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-[#2563EB] dark:text-[#60A5FA]">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <h3 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    No study sources yet
                  </h3>
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1 mb-3">
                    Upload a lecture PDF, DOCX, or paste notes to begin grounded Q&A.
                  </p>
                  <button
                    onClick={() => setIsAddSourceModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2563EB] text-white text-xs font-bold hover:bg-[#1D4ED8] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Upload source
                  </button>
                </div>
              ) : (
                filteredSources.map((item) => (
                  <div
                    key={item.id}
                    className={`group relative p-2.5 rounded-xl border transition-all ${
                      item.enabled
                        ? 'border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20'
                        : 'border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#172033] opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={() => toggleSourceEnabled(item.id)}
                        className="mt-0.5 w-3.5 h-3.5 rounded text-[#2563EB] cursor-pointer"
                      />

                      <div className="shrink-0 mt-0.5">{getSourceIcon(item.fileType)}</div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p
                            className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate"
                            title={item.fileName}
                          >
                            {item.fileName}
                          </p>
                          <button
                            onClick={() => deleteSource(item.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-[#94A3B8] hover:text-rose-500 transition-opacity"
                            title="Remove source"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                          <span className="uppercase font-semibold tracking-wider">
                            {item.fileType}
                          </span>
                          <span>•</span>
                          <span>{item.chunkCount} chunks</span>
                          <span>•</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            Indexed
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Sources Footer / Status */}
            <div className="p-3 border-t border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] text-[11px] text-[#64748B] dark:text-[#94A3B8] flex items-center justify-between">
              <span>RAG Embeddings: 768-dim</span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Active
              </span>
            </div>
          </aside>
        )}

        {/* =====================================================================
            CENTER PANEL: CHAT & GROUNDED Q&A
        ====================================================================== */}
        <section className="flex-1 flex flex-col justify-between overflow-hidden bg-[#F8FAFC] dark:bg-[#0B1220]">
          {/* NotebookLM Style Briefing Overview Banner */}
          <div className="px-4 sm:px-6 py-3.5 bg-white dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-[#263449] shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                    {selectedDeckFilter !== 'all'
                      ? availableDecks.find((d) => d.id === selectedDeckFilter)?.name || 'Study Notebook'
                      : 'Comprehensive Study Notebook'}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-[#60A5FA]">
                    {enabledSourcesCount} sources active
                  </span>
                </div>
                <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                  Every response is grounded strictly in your selected study sources with verifiable citations.
                </p>
              </div>

              {/* Quick Action Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => {
                    setRightActiveTab('notes');
                    setIsCreatingNote(true);
                    setRightPanelOpen(true);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] hover:bg-blue-50 dark:hover:bg-blue-950/60 text-xs font-semibold text-[#334155] dark:text-[#CBD5E1] transition-colors"
                >
                  <Plus className="w-3 h-3 text-[#2563EB]" />
                  <span>Add note</span>
                </button>

                <button
                  onClick={() => handleGenerateStudio('study_guide')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] hover:bg-blue-50 dark:hover:bg-blue-950/60 text-xs font-semibold text-[#334155] dark:text-[#CBD5E1] transition-colors"
                >
                  <BookOpen className="w-3 h-3 text-[#2563EB]" />
                  <span>Study Guide</span>
                </button>

                <button
                  onClick={() => handleGenerateStudio('faq')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] hover:bg-blue-50 dark:hover:bg-blue-950/60 text-xs font-semibold text-[#334155] dark:text-[#CBD5E1] transition-colors"
                >
                  <HelpCircle className="w-3 h-3 text-[#2563EB]" />
                  <span>FAQ</span>
                </button>

                <button
                  onClick={() => handleGenerateStudio('mcqs')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] hover:bg-blue-50 dark:hover:bg-blue-950/60 text-xs font-semibold text-[#334155] dark:text-[#CBD5E1] transition-colors"
                >
                  <Layers className="w-3 h-3 text-[#2563EB]" />
                  <span>5 MCQs</span>
                </button>

                {messages.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('Clear chat messages for this session?')) {
                        setMessages([]);
                      }
                    }}
                    className="p-1.5 text-[#94A3B8] hover:text-rose-500 transition-colors ml-1"
                    title="Clear Chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Chat Messages Stream Area */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
            {messages.length === 0 ? (
              <div className="max-w-2xl mx-auto py-8 text-center space-y-6">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-[#2563EB] to-[#1D4ED8] flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                  <Sparkles className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg sm:text-xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                    What would you like to master today?
                  </h3>
                  <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] max-w-md mx-auto">
                    Ask questions, clarify complex concepts, or generate exam questions. Every answer will be retrieved from your uploaded study materials.
                  </p>
                </div>

                {/* Prompt Suggestion Chips */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left max-w-lg mx-auto">
                  {[
                    'Summarize the core principles and formulas in these notes',
                    'What are common exam pitfalls or student misconceptions?',
                    'Explain the primary mechanisms step-by-step with examples',
                    'Generate 5 practice questions to test my understanding',
                  ].map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(suggestion)}
                      className="p-3 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#0F172A] hover:border-[#2563EB] hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-xs font-medium text-[#334155] dark:text-[#CBD5E1] transition-all text-left flex items-start justify-between group shadow-xs"
                    >
                      <span>{suggestion}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#2563EB] shrink-0 mt-0.5 ml-2 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-3xl ${
                    msg.role === 'user' ? 'ml-auto justify-end' : 'mr-auto justify-start'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#2563EB] text-white font-medium max-w-[85%] rounded-tr-xs shadow-xs'
                        : 'bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] text-[#0F172A] dark:text-[#F8FAFC] max-w-[90%] rounded-tl-xs shadow-xs'
                    }`}
                  >
                    {/* Message Content */}
                    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    {/* Citations Footer for Assistant Messages */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-[#E2E8F0] dark:border-[#263449] space-y-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8]">
                          <Bookmark className="w-3.5 h-3.5 text-[#2563EB]" />
                          <span>Retrieved Source Citations:</span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {msg.citations.map((c) => (
                            <button
                              key={c.index}
                              onClick={() => setSelectedCitation(c)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/70 text-[#2563EB] dark:text-[#60A5FA] border border-blue-200 dark:border-blue-800/80 text-[11px] font-semibold hover:bg-blue-100 transition-colors"
                              title={`Click to view citation excerpt from ${c.documentName}`}
                            >
                              <span className="font-extrabold">[{c.index}]</span>
                              <span className="truncate max-w-[120px]">{c.documentName}</span>
                              <span className="text-[10px] text-[#3B82F6] font-bold">
                                ({c.similarity}%)
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Message Actions */}
                    {msg.role === 'assistant' && (
                      <div className="mt-3 flex items-center justify-between text-[11px] text-[#94A3B8] pt-2">
                        <span>{msg.timestamp}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => speakMessage(msg.content, msg.id)}
                            className={`flex items-center gap-1 transition-colors px-2 py-0.5 rounded-md ${
                              activeSpeakingId === msg.id
                                ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 font-bold'
                                : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#2563EB]'
                            }`}
                            title={activeSpeakingId === msg.id ? "Stop voice tutor" : "Listen to response aloud"}
                          >
                            {activeSpeakingId === msg.id ? (
                              <>
                                <Square className="w-3.5 h-3.5 fill-current text-amber-500 animate-pulse" />
                                <span>Stop Audio</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3.5 h-3.5" />
                                <span>Listen</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => copyToClipboard(msg.content, msg.id)}
                            className="flex items-center gap-1 text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white transition-colors"
                            title="Copy response"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>Copy</span>
                          </button>

                          <button
                            onClick={() => handleSaveMessageToNotes(msg)}
                            className="flex items-center gap-1 text-[#64748B] dark:text-[#94A3B8] hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors"
                            title="Save excerpt to notes"
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                            <span>Save to Notes</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-xl bg-[#0F172A] dark:bg-[#1E293B] text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-xs mt-1">
                      {user?.name ? user.name.slice(0, 2).toUpperCase() : 'ME'}
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Loading indicator */}
            {isChatLoading && (
              <div className="flex gap-3 max-w-2xl mr-auto">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-4 h-4 animate-spin" />
                </div>
                <div className="rounded-2xl p-4 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#2563EB]" />
                    <span>Searching 768-dim vector embeddings & formulating grounded explanation...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Input Bar */}
          <div className="p-4 bg-white dark:bg-[#0F172A] border-t border-[#E2E8F0] dark:border-[#263449] shrink-0">
            <div className="max-w-3xl mx-auto space-y-2">
              {isListening && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-semibold animate-pulse">
                  <Mic className="w-3.5 h-3.5" />
                  <span>Microphone listening... Speak clearly into your mic. Click mic button to stop.</span>
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="relative flex items-center gap-2"
              >
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={
                    enabledSourcesCount > 0
                      ? `Ask anything about your ${enabledSourcesCount} selected sources... (Shift+Enter for newline)`
                      : 'Please check at least one source in the left panel to begin...'
                  }
                  rows={2}
                  className="flex-1 px-4 py-2.5 rounded-2xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] text-xs sm:text-sm text-[#0F172A] dark:text-white placeholder-[#94A3B8] outline-hidden focus:border-[#2563EB] resize-none transition-all shadow-inner"
                />

                {speechRecognitionSupported && (
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`p-3 rounded-2xl transition-all shadow-xs shrink-0 flex items-center justify-center cursor-pointer ${
                      isListening
                        ? 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-600/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-[#94A3B8] hover:text-[#2563EB] hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-slate-200 dark:border-slate-700'
                    }`}
                    title={isListening ? "Listening... (Click to finish)" : "Voice input (Speak to ask)"}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                )}

                <button
                  type="submit"
                  disabled={!inputText.trim() || isChatLoading}
                  className="p-3 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 disabled:hover:bg-[#2563EB] text-white font-bold transition-all shadow-md shrink-0 flex items-center justify-center cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              <div className="flex items-center justify-between text-[11px] text-[#64748B] dark:text-[#94A3B8] px-1">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Grounded in {enabledSourcesCount} source{enabledSourcesCount === 1 ? '' : 's'}
                </span>
                <span>Enter to send • Shift+Enter for newline</span>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            RIGHT PANEL: STUDIO / NOTES & STUDY GUIDE (Width ~360px)
        ====================================================================== */}
        {rightPanelOpen && (
          <aside className="w-80 sm:w-96 shrink-0 border-l border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#0F172A] flex flex-col justify-between transition-all duration-200 z-10">
            {/* Studio / Notes Tabs */}
            <div className="p-3 border-b border-[#E2E8F0] dark:border-[#263449] flex items-center justify-between">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F1F5F9] dark:bg-[#172033]">
                <button
                  onClick={() => setRightActiveTab('studio')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    rightActiveTab === 'studio'
                      ? 'bg-white dark:bg-[#0F172A] text-[#2563EB] dark:text-[#60A5FA] shadow-xs'
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
                  }`}
                >
                  Studio
                </button>
                <button
                  onClick={() => setRightActiveTab('notes')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    rightActiveTab === 'notes'
                      ? 'bg-white dark:bg-[#0F172A] text-[#2563EB] dark:text-[#60A5FA] shadow-xs'
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
                  }`}
                >
                  Notes ({notes.length})
                </button>
              </div>

              <button
                onClick={() => setRightPanelOpen(false)}
                className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white transition-colors"
                title="Collapse Studio Panel"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* ---------------------------------------------------------------
                  1. STUDIO TAB CONTENT
              ---------------------------------------------------------------- */}
              {rightActiveTab === 'studio' && (
                <div className="space-y-4">
                  {/* Studio Generator Action Grid */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
                      AI Study Synthesizers
                    </h3>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleGenerateStudio('study_guide')}
                        disabled={isStudioLoading}
                        className="p-3 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] hover:border-[#2563EB] hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-left transition-all group disabled:opacity-50"
                      >
                        <BookOpen className="w-4 h-4 text-[#2563EB] mb-2" />
                        <p className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                          Study guide
                        </p>
                        <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                          Comprehensive curriculum
                        </p>
                      </button>

                      <button
                        onClick={() => handleGenerateStudio('briefing_doc')}
                        disabled={isStudioLoading}
                        className="p-3 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] hover:border-[#2563EB] hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-left transition-all group disabled:opacity-50"
                      >
                        <FileText className="w-4 h-4 text-[#2563EB] mb-2" />
                        <p className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                          Briefing doc
                        </p>
                        <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                          High-level summary
                        </p>
                      </button>

                      <button
                        onClick={() => handleGenerateStudio('faq')}
                        disabled={isStudioLoading}
                        className="p-3 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] hover:border-[#2563EB] hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-left transition-all group disabled:opacity-50"
                      >
                        <HelpCircle className="w-4 h-4 text-[#2563EB] mb-2" />
                        <p className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                          FAQ
                        </p>
                        <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                          Conceptual Q&A
                        </p>
                      </button>

                      <button
                        onClick={() => handleGenerateStudio('timeline')}
                        disabled={isStudioLoading}
                        className="p-3 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] hover:border-[#2563EB] hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-left transition-all group disabled:opacity-50"
                      >
                        <Clock className="w-4 h-4 text-[#2563EB] mb-2" />
                        <p className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                          Timeline
                        </p>
                        <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                          Progressive roadmap
                        </p>
                      </button>
                    </div>

                    <button
                      onClick={() => handleGenerateStudio('mcqs')}
                      disabled={isStudioLoading}
                      className="w-full p-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] hover:border-[#2563EB] text-left transition-all flex items-center justify-between group disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#2563EB]" />
                        <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                          Generate 5 Practice MCQs
                        </span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#2563EB]" />
                    </button>
                  </div>

                  {/* Loading State */}
                  {isStudioLoading && (
                    <div className="p-6 rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20 text-center space-y-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-[#2563EB] mx-auto" />
                      <p className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                        Synthesizing {studioTypeLoading?.replace('_', ' ')}...
                      </p>
                      <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                        Analyzing {enabledSourcesCount} sources and assembling comprehensive study material.
                      </p>
                    </div>
                  )}

                  {/* Generated Artifact Display */}
                  {activeArtifact && !isStudioLoading && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                            {activeArtifact.title}
                          </h4>
                          <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                            Synthesized from {activeArtifact.sourcesCount} sources • {activeArtifact.createdAt}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSaveArtifactToNotes(activeArtifact)}
                            className="p-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#263449] text-[#64748B] dark:text-[#94A3B8] hover:text-[#2563EB] transition-colors"
                            title="Save to Notes"
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => copyToClipboard(activeArtifact.content, 'studio-artifact')}
                            className="p-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#263449] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white transition-colors"
                            title="Copy Markdown"
                          >
                            {copiedId === 'studio-artifact' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] max-h-96 overflow-y-auto text-xs leading-relaxed">
                        <div className="prose prose-xs dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {activeArtifact.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ---------------------------------------------------------------
                  2. NOTES TAB CONTENT
              ---------------------------------------------------------------- */}
              {rightActiveTab === 'notes' && (
                <div className="space-y-4">
                  {/* Add Note Button / Form */}
                  {!isCreatingNote ? (
                    <button
                      onClick={() => setIsCreatingNote(true)}
                      className="w-full py-2.5 rounded-xl border-2 border-dashed border-[#E2E8F0] dark:border-[#263449] hover:border-[#2563EB] text-[#64748B] dark:text-[#94A3B8] hover:text-[#2563EB] text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add new note</span>
                    </button>
                  ) : (
                    <div className="p-3.5 rounded-xl border border-[#2563EB] bg-[#F8FAFC] dark:bg-[#172033] space-y-2.5">
                      <input
                        type="text"
                        placeholder="Note Title..."
                        value={newNoteTitle}
                        onChange={(e) => setNewNoteTitle(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#0F172A] text-xs font-bold text-[#0F172A] dark:text-white outline-hidden"
                      />
                      <textarea
                        rows={4}
                        placeholder="Write or paste your key takeaways here..."
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#263449] bg-white dark:bg-[#0F172A] text-xs text-[#0F172A] dark:text-white outline-hidden resize-none"
                      />
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => {
                            setIsCreatingNote(false);
                            setNewNoteTitle('');
                            setNewNoteContent('');
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] dark:hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveNote}
                          className="px-3 py-1 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold"
                        >
                          Save Note
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Notes List */}
                  {notes.length === 0 ? (
                    <div className="py-12 text-center text-[#64748B] dark:text-[#94A3B8]">
                      <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-xs font-bold">No saved notes yet</p>
                      <p className="text-[11px] mt-1">
                        Save excerpts from chat responses or create your own custom notes.
                      </p>
                    </div>
                  ) : (
                    notes.map((note) => (
                      <div
                        key={note.id}
                        className="p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] space-y-2 group"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-extrabold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                            {note.title}
                          </h4>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => copyToClipboard(note.content, note.id)}
                              className="p-1 text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
                              title="Copy"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="p-1 text-[#94A3B8] hover:text-rose-500"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-[#475569] dark:text-[#CBD5E1] line-clamp-4 whitespace-pre-wrap">
                          {note.content}
                        </p>

                        <div className="flex items-center justify-between pt-1 text-[10px] text-[#94A3B8]">
                          <span>{note.sourceTag || 'Note'}</span>
                          <span>{note.createdAt}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Studio Footer */}
            <div className="p-3 border-t border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] text-[11px] text-[#64748B] dark:text-[#94A3B8] flex items-center justify-between">
              <span>{notes.length} saved notes</span>
              <button
                onClick={() => {
                  const allNotesMarkdown = notes
                    .map((n) => `## ${n.title}\n*${n.createdAt}*\n\n${n.content}`)
                    .join('\n\n---\n\n');
                  const blob = new Blob([allNotesMarkdown], { type: 'text/markdown' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Notionwell_Notes_${new Date().toISOString().slice(0, 10)}.md`;
                  a.click();
                }}
                className="flex items-center gap-1 text-[#2563EB] dark:text-[#60A5FA] font-bold hover:underline"
              >
                <Download className="w-3 h-3" /> Export Notes
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* =======================================================================
          MODAL 1: ADD SOURCE (Upload File, Paste Text, Import Decks)
      ======================================================================== */}
      {isAddSourceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-[#0F172A] dark:text-[#F8FAFC]">
                  Add Study Sources
                </h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                  Index documents into 768-dim vector embeddings for factual RAG responses.
                </p>
              </div>
              <button
                onClick={() => setIsAddSourceModalOpen(false)}
                className="p-1.5 rounded-xl text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Notification */}
            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Tabs: Upload / Paste / Decks */}
            <div className="flex rounded-xl bg-[#F1F5F9] dark:bg-[#172033] p-1">
              <button
                onClick={() => setAddSourceTab('upload')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  addSourceTab === 'upload'
                    ? 'bg-white dark:bg-[#0F172A] text-[#2563EB] dark:text-[#60A5FA] shadow-xs'
                    : 'text-[#64748B] dark:text-[#94A3B8]'
                }`}
              >
                Upload File
              </button>
              <button
                onClick={() => setAddSourceTab('paste')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  addSourceTab === 'paste'
                    ? 'bg-white dark:bg-[#0F172A] text-[#2563EB] dark:text-[#60A5FA] shadow-xs'
                    : 'text-[#64748B] dark:text-[#94A3B8]'
                }`}
              >
                Paste Notes
              </button>
              <button
                onClick={() => setAddSourceTab('decks')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  addSourceTab === 'decks'
                    ? 'bg-white dark:bg-[#0F172A] text-[#2563EB] dark:text-[#60A5FA] shadow-xs'
                    : 'text-[#64748B] dark:text-[#94A3B8]'
                }`}
              >
                From Decks ({availableDecks.length})
              </button>
            </div>

            {/* TAB 1: FILE UPLOAD DROPZONE */}
            {addSourceTab === 'upload' && (
              <div className="space-y-4">
                <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-[#CBD5E1] dark:border-[#334155] hover:border-[#2563EB] rounded-2xl cursor-pointer bg-[#F8FAFC] dark:bg-[#172033] transition-all group">
                  <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-[#60A5FA] group-hover:scale-110 transition-transform mb-3">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    Click to browse or drop your study documents
                  </span>
                  <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1 text-center">
                    Supports PDF, DOCX, TXT, and lecture slide images (PNG, JPG)
                  </span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.docx,.txt,image/*"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>

                {isUploading && (
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-xs font-semibold text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Extracting text & generating 768-dim embeddings...</span>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PASTE NOTES */}
            {addSourceTab === 'paste' && (
              <form onSubmit={handlePasteNotesSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                    Document Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Biology Chapter 4 Lecture Notes"
                    value={pasteTitle}
                    onChange={(e) => setPasteTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] text-xs text-[#0F172A] dark:text-white outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                    Notes Content
                  </label>
                  <textarea
                    rows={6}
                    required
                    placeholder="Paste textbook excerpts, lecture transcripts, or notes..."
                    value={pasteContent}
                    onChange={(e) => setPasteContent(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] text-xs text-[#0F172A] dark:text-white outline-hidden resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUploading || !pasteContent.trim()}
                  className="w-full py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Indexing chunks...</span>
                    </>
                  ) : (
                    <span>Index Notes into Vector Store</span>
                  )}
                </button>
              </form>
            )}

            {/* TAB 3: IMPORT FROM STUDY DECKS */}
            {addSourceTab === 'decks' && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableDecks.length === 0 ? (
                  <p className="text-xs text-[#64748B] py-6 text-center">
                    No study decks found. You can create a deck in Notionwell or upload files above.
                  </p>
                ) : (
                  availableDecks.map((deck) => (
                    <div
                      key={deck.id}
                      className="p-3 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                          {deck.name}
                        </p>
                        <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                          {deck.flashcards.length} cards • {deck.quizQuestions?.length || 0} questions
                        </p>
                      </div>

                      <button
                        onClick={() => handleImportDeck(deck)}
                        disabled={isUploading}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-[#2563EB] text-[#2563EB] dark:text-[#60A5FA] hover:text-white text-xs font-bold transition-colors"
                      >
                        Index for RAG
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =======================================================================
          MODAL 2: CITATION DETAILS INSPECTOR
      ======================================================================== */}
      {selectedCitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-[#2563EB] dark:text-[#60A5FA] font-extrabold text-xs flex items-center justify-center">
                  [{selectedCitation.index}]
                </span>
                <h3 className="text-sm font-extrabold text-[#0F172A] dark:text-[#F8FAFC] truncate max-w-[240px]">
                  {selectedCitation.documentName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCitation(null)}
                className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#64748B] dark:text-[#94A3B8] bg-[#F1F5F9] dark:bg-[#172033] px-3 py-1.5 rounded-lg">
              <span>Section: {selectedCitation.heading}</span>
              <span className="text-blue-600 dark:text-blue-400 font-bold">
                {selectedCitation.similarity}% Vector Match
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#475569] dark:text-[#94A3B8]">
                Exact Grounded Source Excerpt:
              </label>
              <div className="p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#263449] bg-[#F8FAFC] dark:bg-[#172033] text-xs text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed max-h-60 overflow-y-auto">
                <blockquote className="border-l-2 border-[#2563EB] pl-3 italic">
                  "{selectedCitation.excerpt}"
                </blockquote>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  copyToClipboard(selectedCitation.excerpt, 'citation-excerpt');
                }}
                className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#263449] text-xs font-semibold text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white transition-colors"
              >
                {copiedId === 'citation-excerpt' ? 'Copied Excerpt' : 'Copy Excerpt'}
              </button>
              <button
                onClick={() => setSelectedCitation(null)}
                className="px-4 py-1.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
