import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCheck,
  Download,
  FileText,
  Inbox,
  Loader2,
  MessageSquare,
  Paperclip,
  PencilLine,
  Search,
  Send,
  Sparkles,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../../app/App.jsx';
import { createThread, getThread, listRecipients, listThreads, replyToThread } from '../../../services/api/communicationApi.js';
import { getMyWards } from '../../../services/api/guardianApi.js';
import { listStudents } from '../../../services/api/studentApi.js';
import Avatar from '../../../components/Avatar.jsx';

// Kept in sync with backend/services/communicationService.js's ATTACHMENT_MIME_EXTENSIONS.
const ALLOWED_ATTACHMENT_TYPES = new Set([
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'text/plain', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const ATTACHMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.gif,.txt,.doc,.docx';

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateAttachment(file) {
  if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
    return 'Unsupported file type. Allowed: PDF, JPG, PNG, WEBP, GIF, TXT, DOC, DOCX.';
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return 'File must be 8MB or smaller.';
  }
  return '';
}

function AttachmentChip({ name, size, onRemove }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
      <FileText className="h-4 w-4 shrink-0 text-slate-400" />
      <span className="min-w-0 flex-1 truncate">{name}</span>
      {size ? <span className="shrink-0 text-slate-400">{formatFileSize(size)}</span> : null}
      {onRemove && (
        <button type="button" onClick={onRemove} className="shrink-0 rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function MessageAttachment({ url, name, mimeType, size, mine }) {
  if (!url) return null;
  const isImage = (mimeType || '').startsWith('image/');
  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mb-2 block overflow-hidden rounded-2xl">
        <img src={url} alt={name || 'Attachment'} className="max-h-64 w-full object-cover" />
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      download={name || undefined}
      className={`mb-2 flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-xs font-bold transition ${
        mine
          ? 'border-[color-mix(in_srgb,var(--brand)_20%,white)] bg-white/60 text-[var(--brand-strong)] hover:bg-white'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
      }`}
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{name || 'Attachment'}</span>
      {size ? <span className="shrink-0 font-medium opacity-60">{formatFileSize(size)}</span> : null}
      <Download className="h-3.5 w-3.5 shrink-0" />
    </a>
  );
}

const ROLE_LABELS = {
  admin: 'Admin',
  teacher: 'Teacher',
  guardian: 'Guardian',
  student: 'Student',
  accountant: 'Accountant',
};
const ROLE_GROUP_ORDER = ['teacher', 'guardian', 'admin', 'student', 'accountant'];

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

// Sourced from the full participants list (not the legacy participant_one/
// two columns) so it carries photoUrl too, and works the same regardless of
// whether the thread predates the group-chat/participants-table migration.
function otherParticipant(thread, currentUser) {
  if (!thread || thread.isGroup) return null;
  return (thread.participants || []).find((p) => p.userId !== currentUser?.id) || null;
}

// Only meaningful for 1:1 threads — a group has no single "other person" to
// show a live dot for, so presence there is summarized as a count instead.
function otherParticipantId(thread, currentUser) {
  if (!thread || thread.isGroup) return null;
  if (thread.participantOneUserId && thread.participantOneUserId !== currentUser?.id) return thread.participantOneUserId;
  if (thread.participantTwoUserId && thread.participantTwoUserId !== currentUser?.id) return thread.participantTwoUserId;
  return null;
}

function relativeTimeFromNow(iso) {
  if (!iso) return '';
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function OnlineDot({ show }) {
  if (!show) return null;
  return <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />;
}

function participantLabel(thread, currentUser) {
  return otherParticipant(thread, currentUser)?.name || 'Conversation';
}

function participantDescriptor(thread, currentUser) {
  const role = otherParticipant(thread, currentUser)?.role;
  return role ? `${ROLE_LABELS[role] || role} channel` : 'Direct conversation';
}

// Group threads use their topic as the group name (set at creation); 1:1
// threads show the other person's name, same as before groups existed.
function threadDisplayName(thread, currentUser) {
  if (thread.isGroup) return thread.topic || 'Group conversation';
  return participantLabel(thread, currentUser);
}

function lastMessagePreview(thread) {
  if (thread.lastMessage) return thread.lastMessage;
  if (thread.lastMessageAttachmentName) return `📎 ${thread.lastMessageAttachmentName}`;
  return 'No messages yet.';
}

function threadMemberSummary(thread, currentUser) {
  const others = (thread.participants || []).filter((p) => p.userId !== currentUser?.id);
  if (!others.length) return '';
  const names = others.map((p) => p.name);
  if (names.length <= 2) return names.join(' & ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
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

function ComposeModal({ currentUser, onlineUserIds, onClose, onCreated }) {
  const [recipients, setRecipients] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({ recipientUserIds: [], studentUserId: '', topic: '', body: '' });
  const [loadingRecipients, setLoadingRecipients] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [attachment, setAttachment] = useState(null);
  const fileInputRef = useRef(null);
  const isGroup = form.recipientUserIds.length > 1;

  function toggleRecipient(id) {
    setForm((f) => ({
      ...f,
      recipientUserIds: f.recipientUserIds.includes(id)
        ? f.recipientUserIds.filter((x) => x !== id)
        : [...f.recipientUserIds, id],
    }));
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const validationError = validateAttachment(file);
    if (validationError) { setError(validationError); return; }
    try {
      const dataUrl = await fileToDataUrl(file);
      setAttachment({ dataUrl, name: file.name, size: file.size });
      setError('');
    } catch (err) {
      setError(err.message || 'Could not read the selected file.');
    }
  }

  useEffect(() => {
    setLoadingRecipients(true);
    listRecipients()
      .then((d) => setRecipients(d.recipients || []))
      .catch(() => setRecipients([]))
      .finally(() => setLoadingRecipients(false));
  }, []);

  const canTagStudent = currentUser?.role !== 'student';
  useEffect(() => {
    if (!canTagStudent) return;
    if (currentUser?.role === 'guardian') {
      getMyWards().then((d) => setStudents(d.wards || [])).catch(() => setStudents([]));
    } else {
      listStudents().then((d) => setStudents(d.students || [])).catch(() => setStudents([]));
    }
  }, [currentUser?.role, canTagStudent]);

  const recipientsByRole = ROLE_GROUP_ORDER
    .map((role) => ({ role, people: recipients.filter((r) => r.role === role) }))
    .filter((g) => g.people.length > 0);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data = await createThread({
        recipientUserIds: form.recipientUserIds,
        studentUserId: form.studentUserId,
        topic: form.topic,
        body: form.body,
        attachment: attachment?.dataUrl,
        attachmentName: attachment?.name,
      });
      setForm({ recipientUserIds: [], studentUserId: '', topic: '', body: '' });
      setAttachment(null);
      onCreated(data.thread?.id);
    } catch (err) {
      setError(err.message || 'Failed to send message.');
    } finally {
      setSaving(false);
    }
  }

  const selectedRecipients = recipients.filter((r) => form.recipientUserIds.includes(r.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <form onSubmit={submit} className="relative z-10 flex max-h-[min(48rem,calc(100dvh-2rem))] w-full max-w-2xl flex-col overflow-hidden rounded-[1.75rem] bg-white">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 sm:px-7">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--brand)]">New message</p>
            <h3 className="mt-1 text-xl font-black text-slate-900">Start a conversation</h3>
            <p className="mt-1 text-sm text-slate-500">Message one person, or select multiple to start a group.</p>
          </div>
          <button type="button" onClick={onClose} className="icon-btn shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="premium-scrollbar flex-1 overflow-y-auto px-6 py-5 sm:px-7">
          <div className="space-y-5">
            {error && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

            <div className="grid gap-4">
              <label className="block">
                <span className="label-sm">
                  Recipients {isGroup ? `(${form.recipientUserIds.length} selected — group)` : ''}
                </span>
                <div className="max-h-56 space-y-3 overflow-y-auto rounded-2xl border border-slate-200 p-3">
                  {loadingRecipients ? (
                    <p className="px-2 py-1 text-sm text-slate-400">Loading...</p>
                  ) : recipients.length === 0 ? (
                    <p className="px-2 py-1 text-sm text-slate-400">No one else found yet</p>
                  ) : recipientsByRole.map((g) => (
                    <div key={g.role}>
                      <p className="px-1 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{ROLE_LABELS[g.role] || g.role}</p>
                      <div className="space-y-0.5">
                        {g.people.map((r) => (
                          <label key={r.id} className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-slate-50">
                            <input
                              type="checkbox"
                              checked={form.recipientUserIds.includes(r.id)}
                              onChange={() => toggleRecipient(r.id)}
                              className="h-4 w-4 shrink-0 rounded border-slate-300 text-[var(--brand)] focus:ring-[var(--brand)]"
                            />
                            <Avatar name={r.name} photoUrl={r.photoUrl} size="h-7 w-7" textSize="text-[10px]" tone="bg-slate-200 text-slate-600">
                              <OnlineDot show={onlineUserIds?.has(r.id)} />
                            </Avatar>
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">{r.name}</span>
                            <span className="shrink-0 text-xs text-slate-400">{r.email}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {canTagStudent && (
                <label className="block">
                  <span className="label-sm">Related Student</span>
                  <select className="input" value={form.studentUserId} onChange={(e) => setForm((f) => ({ ...f, studentUserId: e.target.value }))}>
                    <option value="">Not linked to a student</option>
                    {students.map((s) => <option key={s.userId} value={s.userId}>{s.name} {s.className ? `- ${s.className}` : ''}</option>)}
                  </select>
                </label>
              )}
              <label className={`block ${canTagStudent ? '' : 'sm:col-span-2'}`}>
                <span className="label-sm">{isGroup ? 'Group name' : 'Topic'}</span>
                <input
                  className="input"
                  value={form.topic}
                  onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                  placeholder={isGroup ? 'e.g. Class Nine-A Parents Update' : 'Attendance follow-up'}
                />
              </label>
            </div>

            {selectedRecipients.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                  {selectedRecipients.length > 1 ? `Sending to ${selectedRecipients.length} people` : 'Sending to'}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedRecipients.map((r) => (
                    <span key={r.id} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm">
                      {r.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <label className="block">
              <span className="label-sm">Message</span>
              <textarea
                className="input min-h-[220px]"
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Write your message..."
              />
            </label>

            {attachment && (
              <AttachmentChip name={attachment.name} size={attachment.size} onRemove={() => setAttachment(null)} />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept={ATTACHMENT_ACCEPT} className="hidden" onChange={handleFileChange} />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-secondary" title="Attach a file">
              <Paperclip className="h-4 w-4" /> Attach file
            </button>
          </div>
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button disabled={saving || !form.recipientUserIds.length || (!form.body.trim() && !attachment)} className="btn-primary min-w-[140px] disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {saving ? 'Sending...' : 'Send message'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function ThreadListItem({ thread, active, currentUser, online, onSelect }) {
  const name = threadDisplayName(thread, currentUser);
  const hasUnread = Number(thread.unreadCount || 0) > 0;

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
        <Avatar
          name={name}
          photoUrl={otherParticipant(thread, currentUser)?.photoUrl}
          icon={thread.isGroup ? Users : undefined}
          size="h-12 w-12"
          textSize="text-sm"
          rounded="rounded-2xl"
          tone={active ? 'bg-[var(--brand)] text-white' : 'bg-slate-900 text-white'}
        >
          <OnlineDot show={online} />
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 truncate text-sm font-black tracking-tight text-slate-950">{name}</p>
            <p className={`shrink-0 text-[11px] ${hasUnread ? 'font-black text-slate-700' : 'font-semibold text-slate-400'}`}>{timeText(thread.lastMessageAt || thread.updatedAt)}</p>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <p className={`min-w-0 flex-1 line-clamp-2 text-sm leading-relaxed ${hasUnread ? 'font-bold text-slate-900' : 'text-slate-600'}`}>{lastMessagePreview(thread)}</p>
            {hasUnread && (
              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] px-1.5 text-[10px] font-black text-white">
                {thread.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function MessagesPage() {
  const { currentUser, socket, onlineUserIds, lastSeenByUserId } = useAuth();
  const [threads, setThreads] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [replyAttachment, setReplyAttachment] = useState(null);
  const [sendingReply, setSendingReply] = useState(false);
  const replyFileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [query, setQuery] = useState('');
  const [threadError, setThreadError] = useState('');
  const [replyError, setReplyError] = useState('');
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
    setThreadError('');
    getThread(activeId)
      .then((d) => {
        setActive(d.thread);
        setMessages(d.messages || []);
        loadThreads(activeId).catch(() => {});
      })
      .catch((err) => setThreadError(err.message || 'Failed to load conversation.'))
      .finally(() => setDetailLoading(false));
  }, [activeId]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, detailLoading, activeId]);

  // Real-time inbound events (see backend/realtime.js): a new message anywhere
  // refreshes the sidebar (unread badges, ordering, preview); if it landed in
  // the thread currently open, the full thread is refetched too (which also
  // marks it read — same call the user opening the thread already makes).
  useEffect(() => {
    if (!socket) return;
    function handleNewMessage({ message }) {
      if (message.threadId === activeId) {
        getThread(activeId).then((d) => { setActive(d.thread); setMessages(d.messages || []); }).catch(() => {});
      }
      loadThreads(activeId).catch(() => {});
    }
    function handleThreadRead({ threadId }) {
      if (threadId === activeId) {
        getThread(activeId).then((d) => { setActive(d.thread); setMessages(d.messages || []); }).catch(() => {});
      }
    }
    socket.on('message:new', handleNewMessage);
    socket.on('thread:read', handleThreadRead);
    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('thread:read', handleThreadRead);
    };
  }, [socket, activeId]);

  const deferredQuery = useDeferredValue(query);
  const filteredThreads = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    if (!needle) return threads;
    return threads.filter((thread) => {
      const haystack = [
        threadDisplayName(thread, currentUser),
        thread.topic,
        thread.lastMessage,
        thread.lastMessageAttachmentName,
        thread.studentName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [currentUser, deferredQuery, threads]);

  const unreadTotal = useMemo(() => threads.reduce((sum, t) => sum + Number(t.unreadCount || 0), 0), [threads]);
  const isGroupActive = Boolean(active?.isGroup);
  const activeParticipant = active ? threadDisplayName(active, currentUser) : 'Conversation';
  const activeOtherId = active ? otherParticipantId(active, currentUser) : null;
  const activeIsOnline = Boolean(activeOtherId && onlineUserIds?.has(activeOtherId));
  const activeGroupOnlineCount = isGroupActive
    ? (active?.participants || []).filter((p) => p.userId !== currentUser?.id && onlineUserIds?.has(p.userId)).length
    : 0;

  let activeSubtitle;
  if (isGroupActive) {
    const memberSummary = threadMemberSummary(active, currentUser) || `${(active?.participants || []).length} members`;
    activeSubtitle = activeGroupOnlineCount > 0 ? `${memberSummary} · ${activeGroupOnlineCount} online` : memberSummary;
  } else if (activeIsOnline) {
    activeSubtitle = 'Active now';
  } else if (activeOtherId && lastSeenByUserId?.[activeOtherId]) {
    activeSubtitle = `Active ${relativeTimeFromNow(lastSeenByUserId[activeOtherId])}`;
  } else {
    activeSubtitle = active?.topic || 'Direct message';
  }

  async function handleReplyFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const validationError = validateAttachment(file);
    if (validationError) { setReplyError(validationError); return; }
    try {
      const dataUrl = await fileToDataUrl(file);
      setReplyAttachment({ dataUrl, name: file.name, size: file.size });
      setReplyError('');
    } catch (err) {
      setReplyError(err.message || 'Could not read the selected file.');
    }
  }

  async function submitReply(e) {
    e.preventDefault();
    if ((!reply.trim() && !replyAttachment) || !activeId || sendingReply) return;
    setSendingReply(true);
    setReplyError('');
    try {
      const data = await replyToThread(activeId, {
        body: reply,
        attachment: replyAttachment?.dataUrl,
        attachmentName: replyAttachment?.name,
      });
      setReply('');
      setReplyAttachment(null);
      setActive(data.thread);
      setMessages(data.messages || []);
      loadThreads(activeId).catch(() => {});
    } catch (err) {
      setReplyError(err.message || 'Failed to send message.');
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
          <aside className={`${activeId ? 'hidden lg:flex' : 'flex'} min-h-0 flex-col overflow-hidden border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(241,245,249,0.96),rgba(255,255,255,0.98))] lg:border-b-0 lg:border-r`}>
            <div className="border-b border-slate-200/80 px-4 py-4 sm:px-5">
              <div className="flex items-center gap-2">
                <label className="relative block flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--secondary)] focus:ring-4 focus:ring-[var(--secondary-soft)]"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search conversations"
                  />
                </label>
                <button
                  onClick={() => setShowCompose(true)}
                  title="New message"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand)] text-white transition hover:opacity-90"
                >
                  <PencilLine className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-400">
                <span>{filteredThreads.length} visible</span>
                <span>{unreadTotal} unread</span>
              </div>
            </div>

            <div className="premium-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
              {filteredThreads.length ? (
                <div className="space-y-3">
                  {filteredThreads.map((thread) => (
                    <ThreadListItem
                      key={thread.id}
                      thread={thread}
                      active={activeId === thread.id}
                      currentUser={currentUser}
                      online={Boolean(onlineUserIds?.has(otherParticipantId(thread, currentUser)))}
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
            ) : threadError ? (
              <div className="flex h-full items-center justify-center">
                <EmptyState title="Couldn't load this conversation" body={threadError} />
              </div>
            ) : (
              <>
                <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.92))] px-4 py-4 backdrop-blur sm:px-6">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setActiveId(null)} className="icon-btn lg:hidden">
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <Avatar
                      name={activeParticipant}
                      photoUrl={!isGroupActive ? otherParticipant(active, currentUser)?.photoUrl : null}
                      icon={isGroupActive ? Users : undefined}
                      size="h-12 w-12"
                      textSize="text-sm"
                      rounded="rounded-2xl"
                      tone="bg-[var(--brand)] text-white"
                    >
                      <OnlineDot show={activeIsOnline} />
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-black text-slate-900">{activeParticipant}</p>
                        <span className="inline-flex items-center rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--brand-strong)]">
                          {isGroupActive ? 'Group' : 'Active thread'}
                        </span>
                      </div>
                      <p className={`mt-1 truncate text-sm ${activeIsOnline ? 'font-semibold text-emerald-600' : 'text-slate-500'}`}>
                        {activeSubtitle}
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
                    const senderName = m.senderName || activeParticipant;
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex max-w-[88%] items-end gap-3 sm:max-w-[74%] ${mine ? 'flex-row-reverse' : 'flex-row'}`}>
                          {mine ? (
                            <Avatar name={currentUser?.name} photoUrl={currentUser?.photoUrl} size="h-10 w-10" textSize="text-xs" rounded="rounded-2xl" tone="bg-[var(--brand)] text-white" />
                          ) : (
                            <Avatar name={senderName} photoUrl={m.senderPhotoUrl} size="h-10 w-10" textSize="text-xs" rounded="rounded-2xl" tone="bg-slate-900 text-white" />
                          )}
                          <div>
                            {showMeta && (
                              <p className={`mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.16em] ${mine ? 'text-right text-[var(--brand-strong)]/55' : 'text-left text-slate-400'}`}>
                                {mine ? 'You' : senderName}
                              </p>
                            )}
                            <div className={`rounded-[1.6rem] px-4 py-3.5 ${mine ? 'rounded-br-md border border-[color-mix(in_srgb,var(--brand)_14%,white)] bg-[color-mix(in_srgb,var(--brand)_8%,white)] text-[var(--brand-strong)]' : 'rounded-bl-md border border-slate-200 bg-slate-100 text-slate-700'}`}>
                              {m.attachmentUrl && (
                                <MessageAttachment
                                  url={m.attachmentUrl}
                                  name={m.attachmentName}
                                  mimeType={m.attachmentMimeType}
                                  size={m.attachmentSize}
                                  mine={mine}
                                />
                              )}
                              {m.body && <p className="text-sm leading-relaxed">{m.body}</p>}
                              <div className={`mt-3 flex items-center gap-1.5 text-[11px] font-medium ${mine ? 'text-[var(--brand-strong)]/58' : 'text-slate-400'}`}>
                                <span>{timeText(m.createdAt)}</span>
                                {mine && !isGroupActive && (
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
                  {replyError && (
                    <div className="mb-3 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700">{replyError}</div>
                  )}
                  <form onSubmit={submitReply} className="rounded-[1.6rem] border border-slate-300 bg-white p-3">
                    {replyAttachment && (
                      <div className="mb-2">
                        <AttachmentChip name={replyAttachment.name} size={replyAttachment.size} onRemove={() => setReplyAttachment(null)} />
                      </div>
                    )}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <input ref={replyFileInputRef} type="file" accept={ATTACHMENT_ACCEPT} className="hidden" onChange={handleReplyFileChange} />
                      <button
                        type="button"
                        onClick={() => replyFileInputRef.current?.click()}
                        title="Attach a file"
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      >
                        <Paperclip className="h-4 w-4" />
                      </button>
                      <textarea
                        className="min-h-[56px] flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400"
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder="Write a reply..."
                      />
                      <button className="btn-primary h-12 rounded-2xl px-5" disabled={(!reply.trim() && !replyAttachment) || sendingReply}>
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
          onlineUserIds={onlineUserIds}
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
