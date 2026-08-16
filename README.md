# 🎓 Notionwell — Adaptive Learning System with Multimodal OCR & SM-2 Spaced Repetition

> **Turn your notes, PDFs, and handwritten study material into an intelligent, adaptive learning system.**  
> Notionwell doesn't stop at generating flashcards — it tracks real user performance, detects weak topics, delivers personalized study recommendations, and uses the **SM-2 Spaced Repetition Algorithm** for long-term memory retention.

---

## 🔗 Active Application Link

- **Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Create Deck & Upload Notes**: [http://localhost:3000/create](http://localhost:3000/create)
- **Subject Decks**: [http://localhost:3000/decks](http://localhost:3000/decks)
- **Study Planner**: [http://localhost:3000/planner](http://localhost:3000/planner)
- **Weak Topic Insights**: [http://localhost:3000/insights](http://localhost:3000/insights)
- **Student Auth / 1-Click Demo**: [http://localhost:3000/auth](http://localhost:3000/auth)

---

## 🌟 Key Features

### 1. 📄 Multimodal Document & Image Ingestion
- Ingests **PDF, DOCX, TXT, JPG, JPEG, PNG, and WEBP** files.
- Supports **handwritten notes, textbook photos, screenshots, equations, and diagrams** using multimodal vision OCR.
- **Document Text Chunking**: Automatically splits large reference documents (~4,000 words per chunk) to process dense materials without token truncation or context loss.

### 2. ⚡ Action-Oriented Adaptive Dashboard
- **Time-Aware Greeting**: Personalizes greetings (`Good morning / afternoon / evening, [User Name] 👋`).
- **Your Study Health**: Real-time stats on **Mastery %**, **Study Streak**, **Cards Due Today**, and **Weak Topics Count**.
- **"Recommended for You" Hero Card**: Dynamically calculates and displays actionable next steps based on real user performance:
  - `⚠️ Weak Topic Focus` (e.g., *54% accuracy on Congestion Control*) → `[Practice Now →]`
  - `🕒 Overdue Spaced Repetition` → `[Review Due Cards →]`
  - `🚀 Onboarding Empty State` → `[Upload Notes & Create Deck →]`

### 3. 🃏 3D Flashcards with Markdown & Code Syntax Highlighting
- Real 3D CSS flip animation (`rotateY`).
- **Markdown & Code Syntax Highlighting**: Clean syntax rendering for **C, Java, Python, C++, SQL, Bash, and JS/TS** with code block header bar, language badge, and 1-click copy button.
- **Power User Keyboard Shortcuts**:
  - `Spacebar`: Flip 3D card front/back.
  - `1`, `2`, `3`, `4`: Select SM-2 difficulty ratings (*Again*, *Hard*, *Good*, *Easy*).
  - `B`: Toggle card bookmark.

### 4. 🧠 Adaptive Learning & Weak Topic Targeting
- **SM-2 Algorithm**: Dynamically calculates ease factors ($EF$), review intervals, and next review dates based on user ratings.
- **Targeted Practice Sessions**: Allows 1-click launch of review sessions scoped exclusively to weak cards in specific topics.
- **ELI5 ("Explain Like I'm 5")**: Generates simplified, age-appropriate explanations for complex flashcard concepts on demand.

### 5. 📤 Exporting & Integration
- **Anki CSV Export**: Download decks formatted in standard Anki CSV schema (`Front, Back, Tags`) for seamless import into Anki.
- **Printable PDF Export**: Generate styled PDF study guides directly in the browser.

### 6. 🔐 Local Client Authentication & Storage Abstraction
- **Local Client Auth**: SHA-256 Web Crypto password hashing with 1-Click Demo Login.
- **Storage Abstraction Layer ([`lib/storage.ts`](file:///c:/Users/deepak/OneDrive/Desktop/build_beyond_hackathon/lib/storage.ts))**: 100% of data persistence is isolated through a single-source storage layer wrapper, enabling zero-UI-change database swaps.

---

## 🛠️ Tech Stack & Architecture

- **Framework**: Next.js 14 (App Router, React 18, TypeScript)
- **Styling**: Tailwind CSS with dark/light mode system variables
- **AI & Multimodal OCR**: Gemini 2.5 / OpenAI GPT-4o-mini API
- **Document Parsers**: `pdf-parse`, `mammoth`, custom multimodal vision OCR
- **Markdown & Syntax Highlighting**: `react-markdown`, `prismjs`
- **PDF Generation**: `jspdf`
- **Data Persistence**: Storage Abstraction Layer (`lib/storage.ts`) wrapping `localStorage`

---

## 🚀 Setup & Running Locally

1. **Clone or navigate to the project folder**:
   ```bash
   cd build_beyond_hackathon
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env.local` file in the project root:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   # OR
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Run the production build check**:
   ```bash
   npm run build
   ```

5. **Start the local development server**:
   ```bash
   npm run dev
   ```

6. Open **[http://localhost:3000](http://localhost:3000)** in your browser.
