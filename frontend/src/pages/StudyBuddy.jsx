import { useEffect, useRef, useState } from "react";
import { FileText, ListChecks, Send, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { SkeletonBlock } from "@/components/common/Skeletons";
import { FormAlert, SelectInput, TextInput, inputClass } from "@/components/auth/FormControls";
import { errorMessage, useAuth } from "@/context/AuthContext";
import { aiApi } from "@/services/api";
import { useSeo } from "@/hooks/useSeo";

const TABS = [
  { key: "ask", label: "Ask a doubt", icon: Sparkles },
  { key: "summary", label: "Summarise notes", icon: FileText },
  { key: "practice", label: "Practice questions", icon: ListChecks },
];

const Bubble = ({ role, content }) => (
  <div
    data-testid={`ai-message-${role}`}
    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-5 py-4 text-sm leading-relaxed ${
      role === "user"
        ? "ml-auto bg-brand-primary/15 text-fg"
        : "border border-brand-line bg-brand-surface text-fg/90"
    }`}
  >
    {content}
  </div>
);

const Typing = () => (
  <div className="flex items-center gap-2 text-sm text-muted" data-testid="ai-thinking">
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-primary/40 border-t-brand-primary" />
    Study Buddy is thinking…
  </div>
);

export default function StudyBuddy() {
  const { user } = useAuth();
  const [tab, setTab] = useState("ask");
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [question, setQuestion] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState("5");
  const [difficulty, setDifficulty] = useState("medium");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  useSeo({
    title: "AI Study Buddy — CG STUDENT PORTAL",
    description: "Ask study doubts, summarise notes and generate practice questions.",
    path: "/study-buddy",
  });

  const loadSessions = () => aiApi.sessions().then((d) => setSessions(d.items)).catch(() => {});

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  const openSession = async (id) => {
    setError("");
    try {
      const data = await aiApi.messages(id);
      setMessages(data.items.map((m) => ({ role: m.role, content: m.content })));
      setSessionId(id);
      setTab("ask");
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const removeSession = async (id) => {
    try {
      await aiApi.deleteSession(id);
      if (id === sessionId) {
        setSessionId(null);
        setMessages([]);
      }
      await loadSessions();
      toast.success("Conversation deleted");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const runAsk = async (e) => {
    e.preventDefault();
    const text = question.trim();
    if (text.length < 3) return;
    setError("");
    setQuestion("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setBusy(true);
    try {
      const data = await aiApi.ask({ question: text, session_id: sessionId });
      setSessionId(data.session_id);
      setMessages((m) => [...m, { role: "assistant", content: data.answer }]);
      await loadSessions();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const runSummary = async (e) => {
    e.preventDefault();
    if (noteText.trim().length < 200) {
      setError("Paste at least a couple of paragraphs (200+ characters) to summarise.");
      return;
    }
    setError("");
    setBusy(true);
    setMessages([{ role: "user", content: `Summarise: ${noteTitle || "my notes"}` }]);
    try {
      const data = await aiApi.summarise({ text: noteText.trim(), title: noteTitle || null });
      setMessages((m) => [...m, { role: "assistant", content: data.summary }]);
      await loadSessions();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const runPractice = async (e) => {
    e.preventDefault();
    if (topic.trim().length < 3) return;
    setError("");
    setBusy(true);
    setMessages([{ role: "user", content: `${count} ${difficulty} questions on ${topic}` }]);
    try {
      const data = await aiApi.practice({
        topic: topic.trim(),
        count: Number(count),
        difficulty,
      });
      setMessages((m) => [...m, { role: "assistant", content: data.questions }]);
      await loadSessions();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="AI Study Buddy"
        description="Ask doubts, turn long notes into key points, and practise like it is exam day."
        breadcrumbs={<Breadcrumbs items={[{ label: "Study Buddy" }]} />}
      />

      <div className="container-page grid gap-8 py-12 lg:grid-cols-[260px_1fr]" data-testid="study-buddy-page">
        <aside aria-label="Recent conversations">
          <button
            type="button"
            onClick={() => {
              setSessionId(null);
              setMessages([]);
              setError("");
            }}
            data-testid="ai-new-chat"
            className="mb-5 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-brand-primary font-heading text-sm font-medium text-white transition-colors duration-200 hover:bg-brand-primaryDark"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            New conversation
          </button>

          <h2 className="font-heading text-xs uppercase tracking-wider text-muted">Recent</h2>
          {sessions.length === 0 ? (
            <p className="mt-4 text-sm text-muted/70">Nothing here yet.</p>
          ) : (
            <ul className="mt-4 space-y-2" data-testid="ai-sessions">
              {sessions.map((s) => (
                <li key={s.session_id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openSession(s.session_id)}
                    data-testid={`ai-session-${s.session_id}`}
                    className={`min-h-[44px] flex-1 truncate rounded-xl border px-4 text-left text-sm transition-colors duration-200 ${
                      s.session_id === sessionId
                        ? "border-brand-primary/50 bg-brand-primary/10 text-fg"
                        : "border-brand-line bg-brand-surface text-muted hover:text-fg"
                    }`}
                  >
                    {s.title}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSession(s.session_id)}
                    aria-label={`Delete ${s.title}`}
                    data-testid={`ai-session-delete-${s.session_id}`}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-brand-line text-muted transition-colors duration-200 hover:border-brand-error/50 hover:text-brand-error"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Study Buddy modes">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => {
                  setTab(t.key);
                  setError("");
                }}
                data-testid={`ai-tab-${t.key}`}
                className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-5 font-heading text-sm transition-colors duration-200 ${
                  tab === t.key
                    ? "border-brand-primary bg-brand-primary/10 text-fg"
                    : "border-brand-line bg-brand-surface text-muted hover:text-fg"
                }`}
              >
                <t.icon className="h-4 w-4" aria-hidden="true" />
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-6 min-h-[220px] rounded-2xl border border-brand-line bg-brand-surface/40 p-6">
            {messages.length === 0 && !busy ? (
              <div className="text-sm text-muted" data-testid="ai-empty">
                <p className="font-heading text-base text-fg">
                  Hi {user.name?.split(" ")[0] || "there"} — what are we studying today?
                </p>
                <ul className="mt-4 space-y-2">
                  <li>“Explain normalisation in DBMS with an example”</li>
                  <li>“Summarise these notes into key points”</li>
                  <li>“Give me 5 medium questions on Financial Accounting”</li>
                </ul>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((m, i) => (
                  <Bubble key={i} role={m.role} content={m.content} />
                ))}
                {busy && (
                  <>
                    <Typing />
                    <SkeletonBlock className="h-16 w-3/4" />
                  </>
                )}
                <div ref={endRef} />
              </div>
            )}
          </div>

          {error && (
            <div className="mt-5">
              <FormAlert testId="ai-error">{error}</FormAlert>
            </div>
          )}

          <div className="mt-6">
            {tab === "ask" && (
              <form onSubmit={runAsk} className="flex flex-col gap-3 sm:flex-row" data-testid="ai-ask-form">
                <label htmlFor="ai-question" className="sr-only">
                  Your question
                </label>
                <input
                  id="ai-question"
                  data-testid="ai-question-input"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask anything about your subject…"
                  className={`${inputClass} mt-0 flex-1`}
                />
                <button
                  type="submit"
                  disabled={busy || question.trim().length < 3}
                  data-testid="ai-ask-submit"
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-brand-primary px-6 font-heading text-sm font-medium text-white transition-colors duration-200 hover:bg-brand-primaryDark disabled:opacity-60"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Ask
                </button>
              </form>
            )}

            {tab === "summary" && (
              <form onSubmit={runSummary} className="space-y-4" data-testid="ai-summary-form">
                <TextInput
                  id="ai-note-title"
                  label="Title (optional)"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="DBMS Unit 2"
                />
                <div>
                  <label htmlFor="ai-note-text" className="font-heading text-sm font-medium text-fg">
                    Paste your notes
                  </label>
                  <textarea
                    id="ai-note-text"
                    data-testid="ai-note-text"
                    rows={7}
                    maxLength={12000}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Paste the chapter or question paper text here…"
                    className={`${inputClass} py-3`}
                  />
                  <p className="mt-1.5 text-xs text-muted/70">
                    {noteText.length}/12000 characters. PDF file upload arrives with the uploads step.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  data-testid="ai-summary-submit"
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-brand-primary font-heading text-sm font-medium text-white transition-colors duration-200 hover:bg-brand-primaryDark disabled:opacity-60 sm:w-auto sm:px-8"
                >
                  Summarise
                </button>
              </form>
            )}

            {tab === "practice" && (
              <form onSubmit={runPractice} className="space-y-4" data-testid="ai-practice-form">
                <TextInput
                  id="ai-topic"
                  label="Topic or subject"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Data Structures — linked lists"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectInput
                    id="ai-count"
                    label="How many questions"
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                    placeholder="5"
                    options={["3", "5", "8", "10"].map((n) => ({ value: n, label: n }))}
                  />
                  <SelectInput
                    id="ai-difficulty"
                    label="Difficulty"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    placeholder="medium"
                    options={["easy", "medium", "hard"].map((d) => ({ value: d, label: d }))}
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy || topic.trim().length < 3}
                  data-testid="ai-practice-submit"
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-brand-primary font-heading text-sm font-medium text-white transition-colors duration-200 hover:bg-brand-primaryDark disabled:opacity-60 sm:w-auto sm:px-8"
                >
                  Generate questions
                </button>
              </form>
            )}
          </div>

          <p className="mt-5 text-xs text-muted/60">
            AI answers can be wrong — always check important facts against your syllabus.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
