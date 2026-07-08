import { useEffect, useMemo, useState } from 'react';
import { CheckCheck, Inbox, Loader2, MessageSquare, Plus, Send, UserRound } from 'lucide-react';
import { useAuth } from '../../../app/App.jsx';
import { createThread, getThread, listRecipients, listThreads, replyToThread } from '../../../services/api/communicationApi.js';
import { getMyWards } from '../../../services/api/guardianApi.js';
import { listStudents } from '../../../services/api/studentApi.js';

const ROLE_OPTIONS = {
  guardian: [{ role: 'teacher', label: 'Teacher' }, { role: 'admin', label: 'Admin' }],
  teacher: [{ role: 'guardian', label: 'Guardian' }],
  admin: [{ role: 'guardian', label: 'Guardian' }],
  system_developer: [{ role: 'guardian', label: 'Guardian' }],
};

function timeText(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function participantLabel(thread, currentUser) {
  const parts = [];
  if (thread.guardianUserId && thread.guardianUserId !== currentUser?.id) parts.push(thread.guardianName || 'Guardian');
  if (thread.teacherUserId && thread.teacherUserId !== currentUser?.id) parts.push(thread.teacherName || 'Teacher');
  if (thread.adminUserId && thread.adminUserId !== currentUser?.id) parts.push(thread.adminName || 'Admin');
  return parts.join(', ') || 'Conversation';
}

function ComposePanel({ currentUser, onCreated }) {
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
        setRecipients(d.recipients || []);
        setForm((f) => ({ ...f, recipientUserId: d.recipients?.[0]?.id || '' }));
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
    setSaving(true); setError('');
    try {
      const data = await createThread(form);
      setForm({ recipientUserId: '', studentUserId: '', topic: '', body: '' });
      onCreated(data.thread?.id);
    } catch (err) { setError(err.message || 'Failed to send message.'); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-[var(--brand)]" /><h3 className="font-black text-slate-800">New Message</h3></div>
      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="label-sm">Recipient Type</span><select className="input" value={role} onChange={(e) => setRole(e.target.value)}>{options.map((o) => <option key={o.role} value={o.role}>{o.label}</option>)}</select></label>
        <label className="block"><span className="label-sm">Recipient</span><select className="input" value={form.recipientUserId} onChange={(e) => setForm((f) => ({ ...f, recipientUserId: e.target.value }))} required>{loadingRecipients ? <option>Loading...</option> : recipients.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.email})</option>)}</select></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="label-sm">Related Student</span><select className="input" value={form.studentUserId} onChange={(e) => setForm((f) => ({ ...f, studentUserId: e.target.value }))}><option value="">Not linked to a student</option>{students.map((s) => <option key={s.userId} value={s.userId}>{s.name} {s.className ? `- ${s.className}` : ''}</option>)}</select></label>
        <label className="block"><span className="label-sm">Topic</span><input className="input" value={form.topic} onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))} placeholder="e.g. Attendance follow-up" /></label>
      </div>
      <label className="block"><span className="label-sm">Message</span><textarea className="input min-h-[96px]" value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} required placeholder="Write your message..." /></label>
      <button disabled={saving || !form.recipientUserId} className="btn-primary disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Send</button>
    </form>
  );
}

export default function MessagesPage() {
  const { currentUser } = useAuth();
  const [threads, setThreads] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCompose, setShowCompose] = useState(false);

  async function loadThreads(selectId = activeId) {
    const data = await listThreads();
    const list = data.threads || [];
    setThreads(list);
    const nextId = selectId || list[0]?.id || null;
    setActiveId(nextId);
    return nextId;
  }

  useEffect(() => { loadThreads().catch(() => {}).finally(() => setLoading(false)); }, []);

  useEffect(() => {
    if (!activeId) { setActive(null); setMessages([]); return; }
    setDetailLoading(true);
    getThread(activeId)
      .then((d) => { setActive(d.thread); setMessages(d.messages || []); loadThreads(activeId).catch(() => {}); })
      .finally(() => setDetailLoading(false));
  }, [activeId]);

  const unreadTotal = useMemo(() => threads.reduce((sum, t) => sum + Number(t.unreadCount || 0), 0), [threads]);

  async function submitReply(e) {
    e.preventDefault();
    if (!reply.trim() || !activeId) return;
    const data = await replyToThread(activeId, { body: reply });
    setReply('');
    setActive(data.thread); setMessages(data.messages || []);
    loadThreads(activeId).catch(() => {});
  }

  if (loading) return <div className="flex h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[var(--brand)]" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-black text-slate-800">Messages</h2><p className="mt-0.5 text-sm text-slate-500">{unreadTotal} unread message{unreadTotal === 1 ? '' : 's'} / delivery history retained per conversation</p></div>
        <button onClick={() => setShowCompose((v) => !v)} className="btn-primary"><Plus className="h-4 w-4" />New Message</button>
      </div>

      {showCompose && <ComposePanel currentUser={currentUser} onCreated={(id) => { setShowCompose(false); loadThreads(id).catch(() => {}); }} />}

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          {threads.length ? threads.map((thread) => (
            <button key={thread.id} onClick={() => setActiveId(thread.id)} className={`block w-full border-b border-slate-100 p-4 text-left transition hover:bg-slate-50 ${activeId === thread.id ? 'bg-emerald-50/60' : ''}`}>
              <div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-800">{participantLabel(thread, currentUser)}</p><p className="mt-0.5 text-xs font-semibold text-slate-400">{thread.topic || 'Direct message'}</p></div>{thread.unreadCount > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-black text-white">{thread.unreadCount}</span>}</div>
              <p className="mt-2 line-clamp-2 text-sm text-slate-500">{thread.lastMessage || 'No messages yet.'}</p>
              <p className="mt-2 text-[11px] font-semibold text-slate-400">{timeText(thread.lastMessageAt || thread.updatedAt)} · {thread.messageCount} delivered</p>
            </button>
          )) : <div className="flex flex-col items-center py-16 text-slate-400"><Inbox className="mb-3 h-9 w-9" /><p className="text-sm font-medium">No conversations yet.</p></div>}
        </div>

        <div className="card min-h-[520px] p-0">
          {!activeId ? <div className="flex h-full min-h-[420px] items-center justify-center text-sm text-slate-400">Select or create a conversation.</div> : detailLoading ? <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" /></div> : <>
            <div className="border-b border-slate-100 p-5"><p className="font-black text-slate-800">{active ? participantLabel(active, currentUser) : 'Conversation'}</p><p className="mt-1 text-sm text-slate-500">{active?.topic || 'Direct message'}{active?.studentName ? ` · Student: ${active.studentName}` : ''}</p></div>
            <div className="max-h-[420px] space-y-3 overflow-y-auto p-5">
              {messages.map((m) => {
                const mine = m.senderUserId === currentUser?.id;
                return <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[78%] rounded-2xl px-4 py-3 ${mine ? 'bg-[var(--brand)] text-white' : 'bg-slate-100 text-slate-700'}`}><p className="text-sm leading-relaxed">{m.body}</p><p className={`mt-2 flex items-center gap-1 text-[11px] ${mine ? 'text-white/70' : 'text-slate-400'}`}>{timeText(m.createdAt)}{mine && <><CheckCheck className="h-3.5 w-3.5" />{m.readAt ? `Read ${timeText(m.readAt)}` : 'Delivered'}</>}</p></div></div>;
              })}
            </div>
            <form onSubmit={submitReply} className="flex gap-2 border-t border-slate-100 p-4"><textarea className="input min-h-[44px] flex-1" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply..." /><button className="btn-primary"><Send className="h-4 w-4" />Send</button></form>
          </>}
        </div>
      </div>
    </div>
  );
}