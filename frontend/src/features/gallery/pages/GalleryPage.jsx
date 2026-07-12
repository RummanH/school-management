import { useEffect, useState } from 'react';
import { ImageIcon, Images, Loader2, Pencil, Plus, Save, Trash2, Upload, Video, X } from 'lucide-react';
import { listAllGallery, createGalleryItem, updateGalleryItem, deleteGalleryItem } from '../../../services/api/galleryApi.js';

function Confirm({ title, message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="px-6 py-5">
          <h3 className="text-base font-bold text-slate-800">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{message}</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={onConfirm} className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}

function GalleryModal({ initial, onClose, onSaved }) {
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState({
    type: initial?.type || 'photo',
    url: initial?.url || '',
    caption: initial?.caption || '',
    sortOrder: initial?.sortOrder ?? 0,
    imageDataUrl: '',
  });
  const [previewUrl, setPreviewUrl] = useState(initial?.type === 'photo' ? initial?.url || '' : '');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (field === 'url' && form.type === 'photo' && !form.imageDataUrl) setPreviewUrl(value);
    if (field === 'type' && value === 'video') {
      setPreviewUrl('');
      setSelectedFileName('');
      setForm((f) => ({ ...f, type: value, imageDataUrl: '' }));
      return;
    }
    setError('');
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const imageDataUrl = await readFileAsDataUrl(file);
      setForm((f) => ({ ...f, imageDataUrl }));
      setPreviewUrl(imageDataUrl);
      setSelectedFileName(file.name);
    } catch (err) {
      setError(err.message || 'Could not load image.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        type: form.type,
        url: form.url.trim(),
        caption: form.caption.trim(),
        sortOrder: Number(form.sortOrder) || 0,
        imageDataUrl: form.type === 'photo' ? form.imageDataUrl : '',
      };
      if (payload.type === 'photo' && !payload.url && !payload.imageDataUrl) {
        throw new Error('Please upload an image or provide an image URL.');
      }
      if (payload.type === 'video' && !payload.url) {
        throw new Error('Video URL is required.');
      }
      const result = isEdit
        ? await updateGalleryItem(initial.id, payload)
        : await createGalleryItem(payload);
      onSaved(result.items);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-800">{isEdit ? 'Edit Gallery Item' : 'New Gallery Item'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto p-6">
          {error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Type</label>
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
              value={form.type}
              onChange={(e) => set('type', e.target.value)}
            >
              <option value="photo">Photo</option>
              <option value="video">Video (YouTube link)</option>
            </select>
          </div>

          {form.type === 'photo' ? (
            <>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Upload Photo</label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-4 py-4 text-sm font-semibold text-slate-600 transition hover:border-[var(--brand)]/40 hover:bg-[var(--brand-soft)]">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? 'Loading image...' : selectedFileName || 'Choose image file'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
                <p className="mt-1 text-xs text-slate-400">JPG, PNG, WEBP, or GIF up to 10MB.</p>
              </div>

              {(previewUrl || form.url) && (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  <img src={previewUrl || form.url} alt="Preview" className="aspect-video w-full object-cover" />
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Image URL (optional)</label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                  value={form.url}
                  onChange={(e) => set('url', e.target.value)}
                  placeholder="https://..."
                />
                <p className="mt-1 text-xs text-slate-400">Use this only if you want to link an external image instead of uploading a file.</p>
              </div>
            </>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Video URL *</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                value={form.url}
                onChange={(e) => set('url', e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                required
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Caption</label>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
              value={form.caption}
              onChange={(e) => set('caption', e.target.value)}
              placeholder="e.g. Annual sports day 2026"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Sort Order</label>
            <input
              type="number"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
              value={form.sortOrder}
              onChange={(e) => set('sortOrder', e.target.value)}
              placeholder="0"
            />
            <p className="mt-1 text-xs text-slate-400">Lower numbers appear first on the public gallery.</p>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={saving || uploading} className="btn-primary disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function GalleryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [actionId, setActionId] = useState(null);

  useEffect(() => {
    listAllGallery()
      .then((d) => setItems(d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleSaved(list) {
    setItems(list);
    setModal(null);
  }

  async function confirmDelete() {
    const item = confirm;
    setConfirm(null);
    setActionId(item.id);
    try {
      const result = await deleteGalleryItem(item.id);
      setItems(result.items || []);
    } catch {}
    setActionId(null);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800">Gallery</h2>
          <p className="mt-0.5 text-sm text-slate-500">{items.length} item{items.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModal('create')} className="btn-primary">
          <Plus className="h-4 w-4" /> New
        </button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-[var(--brand)]" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20 text-slate-400">
          <Images className="mb-3 h-10 w-10" />
          <p className="text-sm font-medium">No gallery items yet</p>
          <button onClick={() => setModal('create')} className="btn-primary mt-5">
            <Plus className="h-4 w-4" /> Add First Item
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
              <div className="relative aspect-video bg-slate-100">
                {item.type === 'photo' ? (
                  <img src={item.url} alt={item.caption} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <Video className="h-8 w-8" />
                  </div>
                )}
                <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
                  {item.type === 'photo' ? <ImageIcon className="h-3 w-3" /> : <Video className="h-3 w-3" />}
                  {item.type}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-700">{item.caption || '—'}</p>
                  <p className="text-xs text-slate-400">Sort: {item.sortOrder}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button onClick={() => setModal(item)} title="Edit" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setConfirm(item)} title="Delete" disabled={actionId === item.id} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40">
                    {actionId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <GalleryModal initial={modal === 'create' ? null : modal} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}

      {confirm && (
        <Confirm
          title="Delete Gallery Item"
          message={`Are you sure you want to permanently delete "${confirm.caption || 'this item'}"? This action cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
