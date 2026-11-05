import Link from 'next/link';
import { Shield, Lock, FileText, CheckCircle2, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy',
  description: 'Notionwell Privacy Policy detailing data handling, AI processing, and user data rights.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1D] text-[#0F172A] dark:text-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#64748B] dark:text-[#94A3B8] hover:text-[#2563EB] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[#2563EB]">
            <Shield className="w-6 h-6" />
            <span className="text-xs font-extrabold uppercase tracking-wider">Legal & Transparency</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Privacy Policy</h1>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">Last updated: November 2026</p>
        </div>

        <div className="p-8 rounded-3xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#263449] shadow-sm space-y-6 text-xs sm:text-sm leading-relaxed text-[#334155] dark:text-[#CBD5E1]">
          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-white">1. Overview</h2>
            <p>
              Notionwell ("we", "us", or "our") operates the Notionwell study platform. We take your academic privacy seriously. This document explains how we collect, process, and protect your study materials and account data.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-white">2. Study Materials & Document Processing</h2>
            <p>
              When you upload lecture slides, PDF textbooks, notes, or documents, they are processed solely to generate study aids (flashcards, quizzes, simulated exams, and RAG semantic embeddings).
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your uploaded documents are isolated to your individual account.</li>
              <li>We enforce PostgreSQL Row Level Security (RLS) to ensure no other user can access your documents.</li>
              <li>Document text is parsed into encrypted 768-dimensional vector embeddings for retrieval-augmented generation (RAG).</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-white">3. Third-Party AI Processing (Gemini API)</h2>
            <p>
              To synthesize study materials, generate exams, and power the AI Study Assistant, document excerpts are processed through Google Gemini AI APIs.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Excerpts are transmitted via secure HTTPS connections with server-side authentication.</li>
              <li>Your documents are not sold to third-party data brokers.</li>
              <li>We do not log passwords, access tokens, or sensitive API keys.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-white">4. User Rights & Data Controls</h2>
            <p>
              You maintain full ownership of your data at all times. Notionwell provides built-in tools for:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Data Export:</strong> You can download a complete JSON archive of all your decks, flashcards, and exam attempts.</li>
              <li><strong>Deletion:</strong> You can permanently delete individual documents or delete your entire account along with all associated cloud records.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-white">5. Contact Information</h2>
            <p>
              For privacy inquiries, GDPR data requests, or support, please reach out to our team at support@notionwell.ai.
            </p>
          </section>
        </div>

      </div>
    </div>
  );
}
