import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCheck,
  Inbox,
  Loader2,
  MessageSquare,
  PencilLine,
  Search,
  Send,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import { useAuth } from '../../../app/App.jsx';
import { createThread, getThread, listRecipients, listThreads, replyToThread } from '../../../services/api/communicationApi.js';
import { getMyWards } from '../../../services/api/guardianApi.js';
import { listStudents } from '../../../services/api/studentApi.js';

const CHAT_ROLES = [
  { role: 'admin', label: 'Admin' },
  { role: 'teacher', label: 'Teacher' },
  { role: 'guardian', label: 'Guardian' },
];

const ROLE_OPTIONS = {
  admin: CHAT_ROLES.filter((r) => r.role !== 'admin'),
  teacher: CHAT_ROLES.filter((r) => r.role !== 'teacher'),
  guardian: CHAT_ROLES.filter((r) => r.role !== 'guardian'),
};

function timeText(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function shortTimeText(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function initials(name) {
  if (!name) return 'C';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'C';
}

function participantLabel(thread, currentUser) {
  const parts = [];
  if (thread.guardianUserId && thread.guardianUserId !== currentUser?.id) parts.push(thread.guardianName || 'Guardian');
  if (thread.teacherUserId && thread.teacherUserId !== currentUser?.id) parts.push(thread.teacherName || 'Teacher');
  if (thread.adminUserId && thread.adminUserId !== currentUser?.id) parts.push(thread.adminName || 'Admin');
  return parts.join(', ') || 'Conversation';
}

function participantDescriptor(thread, currentUser) {
  if (thread.guardianUserId && thread.guardianUserId !== currentUser?.id) return 'Guardian channel';
  if (thread.teacherUserId && thread.teacherUserId !== currentUser?.id) return 'Teacher channel';
  if (thread.adminUserId && thread.adminUserId !== currentUser?.id) return 'Admin channel';
  return 'Direct conversation';
}

function EmptyState({ title, body, compact = false }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'px-6 py-12' : 'px-8 py-16'}`}>
      <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-[var(--brand-soft)] text-[var(--brand)]">
        <Inbox className="h-7 w-7" />
      </div>
      <p className="mt-5 text-base font-black text-slate-800">{title}</p>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}

function ComposeModal({ currentUser, onClose, onCreated }) {
  const options = ROLE_OPTIONS[currentUser?.role] || [];
  const [role, setRole] = useState(options[0]?.role || '');
  const [recipients, setRecipients] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({ recipientUserId: '', studentUserId: '', topic: '', body: '' });
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!role) return;
    setLoadingRecipients(true);
    listRecipients(role)
      .then((d) => {
        const nextRecipients = d.recipients || [];
        setRecipients(nextRecipients);
        setForm((f) => ({ ...f, recipientUserId: nextRecipients[0]?.id || '' }));
      })
      .catch(() => setRecipients([]))
      .finally(() => setLoadingRecipients(false));
  }, [role]);

  useEffect(() => {
    if (currentUser?.role === 'guardian') {
      getMyWards().then((d) => setStudents(d.wards || [])).catch(() => setStudents([]));
    } else if (['teacher', 'admin', 'system_developer'].includes(currentUser?.role)) {
      listStudents().then((d) => setStudents(d.students || [])).catch(() => setStudents([]));
    }
  }, [currentUser?.role]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data = await createThread(form);
      setForm({ recipientUserId: '', studentUserId: '', topic: '', body: '' });
      onCreated(data.thread?.id);
    } catch (err) {
      setError(err.message || 'Failed to send message.');
    } finally {
      setSaving(false);
    }
  }

  const selectedRecipient = recipients.find((r) => r.id === form.recipientUserId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <form onSubmit={submit} className="relative z-10 flex max-h-[min(48rem,calc(100dvh-2rem))] w-full max-w-2xl flex-col overflow-hidden rounded-[1.75rem] bg-white">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 sm:px-7">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--brand)]">New message</p>
            <h3 className="mt-1 text-xl font-black text-slate-900">Start a conversation</h3>
            <p className="mt-1 text-sm text-slate-500">Send a direct message to a teacher, guardian, or admin.</p>
          </div>
          <button type="button" onClick={onClose} className="icon-btn shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="premium-scrollbar flex-1 overflow-y-auto px-6 py-5 sm:px-7">
          <div className="space-y-5">
            {error && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="label-sm">Recipient Type</span>
                <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
                  {options.map((o) => <option key={o.role} value={o.role}>{o.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="label-sm">Recipient</span>
                <select
                  className="input"
                  value={form.recipientUserId}
                  onChange={(e) => setForm((f) => ({ ...f, recipientUserId: e.target.value }))}
                  required
                  disabled={!loadingRecipients && recipients.length === 0}
                >
                  {loadingRecipients ? (
                    <option>Loading...</option>
                  ) : recipients.length === 0 ? (
                    <option value="">No {(options.find((o) => o.role === role)?.label || 'recipient').toLowerCase()}s found yet</option>
                  ) : (
                    recipients.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)
                  )}
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="label-sm">Related Student</span>
                <select className="input" value={form.studentUserId} onChange={(e) => setForm((f) => ({ ...f, studentUserId: e.target.value }))}>
                  <option value="">Not linked to a student</option>
                  {students.map((s) => <option key={s.userId} value={s.userId}>{s.name} {s.className ? `- ${s.className}` : ''}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="label-sm">Topic</span>
                <input className="input" value={form.topic} onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))} placeholder="Attendance follow-up" />
              </label>
            </div>

            {selectedRecipient && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Sending to</p>
                <p className="mt-1 text-sm font-bold text-slate-800">{selectedRecipient.name}</p>
                <p className="mt-0.5 text-sm text-slate-500">{selectedRecipient.email}</p>
              </div>
            )}

            <label className="block">
              <span className="label-sm">Message</span>
              <textarea
                className="input min-h-[220px]"
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                required
                placeholder="Write your message..."
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <p className="text-sm text-slate-500">This message will be saved to the conversation history.</p>
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button disabled={saving || !form.recipientUserId || !form.body.trim()} className="btn-primary min-w-[140px] disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {saving ? 'Sending...' : 'Send message'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function ThreadListItem({ thread, active, currentUser, onSelect }) {
  const name = participantLabel(thread, currentUser);

  return (
    <button
      onClick={onSelect}
      className={`group relative w-full rounded-[1.35rem] border p-4 text-left transition duration-200 ${
        active
          ? 'border-[var(--brand)]/35 bg-[linear-gradient(135deg,rgba(224,231,255,0.98),rgba(255,255,255,1))]'
          : 'border-slate-100 bg-white hover:border-slate-300 hover:bg-white hover:shadow-[0_16px_36px_rgba(15,23,42,0.12)]'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${active ? 'bg-[var(--brand)] text-white' : 'bg-slate-900 text-white'}`}>
          {initials(name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 truncate text-sm font-black tracking-tight text-slate-950">{name}</p>
            <p className="shrink-0 text-[11px] font-semibold text-slate-400">{timeText(thread.lastMessageAt || thread.updatedAt)}</p>
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">{thread.lastMessage || 'No messages yet.'}</p>
        </div>
      </div>
    </button>
  );
}

export default function MessagesPage() {
  const { currentUser } = useAuth();
  const [threads, setThreads] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [query, setQuery] = useState('');
  const scrollRef = useRef(null);

  async function loadThreads(selectId = activeId) {
    const data = await listThreads();
    const list = data.threads || [];
    setThreads(list);
    const nextId = selectId || list[0]?.id || null;
    setActiveId(nextId);
    return nextId;
  }

  useEffect(() => {
    if (currentUser?.role === 'system_developer') {
      setLoading(false);
      return;
    }
    loadThreads().catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeId) {
      setActive(null);
      setMessages([]);
      return;
    }
    setDetailLoading(true);
    getThread(activeId)
      .then((d) => {
        setActive(d.thread);
        setMessages(d.messages || []);
        loadThreads(activeId).catch(() => {});
      })
      .finally(() => setDetailLoading(false));
  }, [activeId]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, detailLoading, activeId]);

  const deferredQuery = useDeferredValue(query);
  const filteredThreads = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    if (!needle) return threads;
    return threads.filter((thread) => {
      const haystack = [
        participantLabel(thread, currentUser),
        thread.topic,
        thread.lastMessage,
        thread.studentName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [currentUser, deferredQuery, threads]);

  const unreadTotal = useMemo(() => threads.reduce((sum, t) => sum + Number(t.unreadCount || 0), 0), [threads]);
  const activeParticipant = active ? participantLabel(active, currentUser) : 'Conversation';

  async function submitReply(e) {
    e.preventDefault();
    if (!reply.trim() || !activeId || sendingReply) return;
    setSendingReply(true);
    try {
      const data = await replyToThread(activeId, { body: reply });
      setReply('');
      setActive(data.thread);
      setMessages(data.messages || []);
      loadThreads(activeId).catch(() => {});
    } finally {
      setSendingReply(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-[var(--brand)]" />
      </div>
    );
  }

  if (currentUser?.role === 'system_developer') {
    return (
      <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white py-10 shadow-soft">
        <EmptyState
          title="Messaging is scoped per school"
          body="Platform accounts are not attached to one school, so there is no conversation list to show here. Sign in as a school admin, teacher, or guardian to send and receive messages."
        />
      </div>
    );
  }

  return (
    <>
      <div className="flex h-[calc(100dvh-7rem)] min-h-[32rem] min-w-0 flex-col overflow-hidden sm:h-[calc(100dvh-8rem)]">

        <div className="grid min-h-0 flex-1 overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,255,0.96))] lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className={`${activeId ? 'hidden lg:flex' : 'flex'} flex-col border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(241,245,249,0.96),rgba(255,255,255,0.98))] lg:border-b-0 lg:border-r`}>
            <div className="border-b border-slate-200/80 px-4 py-4 sm:px-5">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--secondary)] focus:ring-4 focus:ring-[var(--secondary-soft)]"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search conversations"
                />
              </label>
              <div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-400">
                <span>{filteredThreads.length} visible</span>
                <span>{unreadTotal} unread</span>
              </div>
            </div>

            <div className="premium-scrollbar flex-1 overflow-y-auto p-3 sm:p-4">
              {filteredThreads.length ? (
                <div className="space-y-3">
                  {filteredThreads.map((thread) => (
                    <ThreadListItem
                      key={thread.id}
                      thread={thread}
                      active={activeId === thread.id}
                      currentUser={currentUser}
                      onSelect={() => setActiveId(thread.id)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  compact
                  title={threads.length ? 'No matching conversations' : 'No conversations yet'}
                  body={threads.length ? 'Try a different name, topic, or student reference.' : 'Start a conversation to create your first school message thread.'}
                />
              )}
            </div>
          </aside>

          <section className={`${!activeId ? 'hidden lg:flex' : 'flex'} min-h-0 min-w-0 flex-col bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.04),transparent_30%),linear-gradient(180deg,#ffffff,#f8fafc)]`}>
            {!activeId ? (
              <div className="flex h-full items-center justify-center">
                <EmptyState
                  title="Select a conversation"
                  body="Choose a thread from the left or start a new message to open a polished chat view here."
                />
              </div>
            ) : detailLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-[var(--brand)]" />
              </div>
            ) : (
              <>
                <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.92))] px-4 py-4 backdrop-blur sm:px-6">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setActiveId(null)} className="icon-btn lg:hidden">
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand)] text-sm font-black text-white">
                      {initials(activeParticipant)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-black text-slate-900">{activeParticipant}</p>
                        <span className="inline-flex items-center rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--brand-strong)]">
                          Active thread
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {active?.topic || 'Direct message'}
                        {active?.studentName ? ` / Student: ${active.studentName}` : ''}
                      </p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Messages</p>
                      <p className="mt-1 text-sm font-semibold text-slate-600">{messages.length} in thread</p>
                    </div>
                  </div>
                </div>

                <div ref={scrollRef} className="premium-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
                  {messages.map((m, index) => {
                    const mine = m.senderUserId === currentUser?.id;
                    const prev = messages[index - 1];
                    const showMeta = !prev || prev.senderUserId !== m.senderUserId;
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex max-w-[88%] items-end gap-3 sm:max-w-[74%] ${mine ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-black ${mine ? 'bg-[var(--brand)] text-white' : 'bg-slate-900 text-white'}`}>
                            {mine ? 'You' : initials(activeParticipant)}
                          </div>
                          <div>
                            {showMeta && (
                              <p className={`mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 ${mine ? 'text-right' : 'text-left'}`}>
                                {mine ? 'You' : activeParticipant}
                              </p>
                            )}
                            <div className={`rounded-[1.6rem] px-4 py-3.5 ${mine ? 'rounded-br-md bg-[linear-gradient(135deg,var(--brand),var(--secondary))] text-white' : 'rounded-bl-md border border-slate-200 bg-slate-900 text-white'}`}>
                              <p className="text-sm leading-relaxed">{m.body}</p>
                              <div className={`mt-3 flex items-center gap-1.5 text-[11px] font-medium ${mine ? 'text-white/70' : 'text-slate-400'}`}>
                                <span>{timeText(m.createdAt)}</span>
                                {mine && (
                                  <>
                                    <CheckCheck className="h-3.5 w-3.5" />
                                    <span>{m.readAt ? `Read ${shortTimeText(m.readAt)}` : 'Delivered'}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.96))] p-4 backdrop-blur sm:p-5">
                  <form onSubmit={submitReply} className="rounded-[1.6rem] border border-slate-300 bg-white p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <textarea
                        className="min-h-[56px] flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400"
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder="Write a reply..."
                      />
                      <button className="btn-primary h-12 rounded-2xl px-5" disabled={!reply.trim() || sendingReply}>
                        {sendingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        {sendingReply ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {showCompose && (
        <ComposeModal
          currentUser={currentUser}
          onClose={() => setShowCompose(false)}
          onCreated={(id) => {
            setShowCompose(false);
            loadThreads(id).catch(() => {});
          }}
        />
      )}
    </>
  );
}














