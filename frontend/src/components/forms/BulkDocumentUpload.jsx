import React, { useRef, useState } from 'react';
import { CheckCircle2, FileUp, Paperclip, X } from 'lucide-react';

// Words shared by many requirement titles; they carry no signal when matching a
// file name back to its requirement ("NBI Clearance" is identified by "nbi").
const GENERIC_TOKENS = new Set([
  'upload', 'valid', 'clear', 'copy', 'issued', 'within', 'last', 'months', 'month',
  'the', 'and', 'your', 'from', 'form', 'result', 'document', 'file', 'requirement',
  'renewed', 'recent', 'original', 'certificate', 'clearance', 'card', 'record',
]);

const tokenize = (value) => value.toLowerCase().replace(/\.[a-z0-9]+$/, '').match(/[a-z0-9]{2,}/g) || [];

const matchScore = (file, requirement) => {
  const fileTokens = new Set(tokenize(file.name));
  const distinctive = (requirement.title.toLowerCase().match(/[a-z0-9]{2,}/g) || []).filter((token) => !GENERIC_TOKENS.has(token));
  return distinctive.filter((token) => fileTokens.has(token)).length;
};

const fileNameOf = (value) => (value instanceof File ? value.name : value?.fileName) || null;

const requirementHint = (requirement) => [
  requirement.description,
  requirement.allowedFileTypes?.map((type) => type.split('/')[1].toUpperCase()).join(', '),
  requirement.maxSizeMB ? `max ${requirement.maxSizeMB} MB` : null,
].filter(Boolean).join(' · ');

/**
 * Compact document panel: one row per requirement, plus a drop zone that
 * accepts many files at once and matches each file to its requirement by
 * file name. Files that cannot be matched wait in a short "assign" list.
 */
const BulkDocumentUpload = ({ requirements, getValue, onAttach, onDetach, errors = {} }) => {
  const [pending, setPending] = useState([]);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  const attachedCount = requirements.filter((requirement) => fileNameOf(getValue(requirement._id))).length;
  const unattached = requirements.filter((requirement) => !fileNameOf(getValue(requirement._id)));
  const acceptedTypes = [...new Set(requirements.flatMap((requirement) => requirement.allowedFileTypes || []))];

  const handleFiles = (fileList) => {
    const taken = new Set();
    const additions = [];
    Array.from(fileList || []).forEach((file) => {
      const compatible = requirements.filter((requirement) => !requirement.allowedFileTypes?.length || requirement.allowedFileTypes.includes(file.type));
      let best = null;
      let bestScore = 0;
      let ambiguous = false;
      compatible.forEach((requirement) => {
        if (taken.has(requirement._id) || fileNameOf(getValue(requirement._id))) return;
        if (file.size > (requirement.maxSizeMB || 5) * 1024 * 1024) return;
        const score = matchScore(file, requirement);
        if (score > bestScore) { best = requirement; bestScore = score; ambiguous = false; }
        else if (score === bestScore && score > 0) ambiguous = true;
      });
      if (best && !ambiguous) {
        taken.add(best._id);
        onAttach(best, file);
        return;
      }
      const maxSizeMB = compatible.length ? Math.max(...compatible.map((requirement) => requirement.maxSizeMB || 5)) : null;
      const reason = !compatible.length ? 'Unsupported file type'
        : maxSizeMB && file.size > maxSizeMB * 1024 * 1024 ? `Too large (max ${maxSizeMB} MB)` : null;
      additions.push({ id: `${file.name}-${file.size}-${file.lastModified}`, file, reason });
    });
    if (additions.length) setPending((current) => [...current, ...additions]);
  };

  const assign = (entry, requirementId) => {
    const requirement = requirements.find((item) => String(item._id) === String(requirementId));
    if (!requirement) return;
    onAttach(requirement, entry.file);
    setPending((current) => current.filter((item) => item.id !== entry.id));
  };

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-900">Documents</h3>
        <span role="status" className="text-xs tabular-nums text-slate-500">{attachedCount} of {requirements.length} attached</span>
      </div>

      <div
        onDragEnter={(event) => { event.preventDefault(); dragDepth.current += 1; setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => { dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false); }}
        onDrop={(event) => { event.preventDefault(); dragDepth.current = 0; setDragging(false); handleFiles(event.dataTransfer.files); }}
        className={`mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed px-4 py-3 transition-colors ${dragging ? 'border-brand-600 bg-brand-50' : 'border-slate-300 bg-slate-50'}`}
      >
        <p className="flex min-w-0 items-center gap-2 text-xs text-slate-600">
          <FileUp className={`h-4 w-4 shrink-0 ${dragging ? 'text-brand-700' : 'text-slate-400'}`} aria-hidden="true" />
          <span><strong className="font-semibold text-slate-800">Drop every file at once</strong> — each one is matched to its requirement by file name.</span>
        </p>
        <label className="ui-btn ui-btn-primary ui-btn-sm cursor-pointer">
          <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />Choose files
          <input type="file" multiple accept={acceptedTypes.join(',')} className="sr-only" onChange={(event) => { handleFiles(event.target.files); event.target.value = ''; }} />
        </label>
      </div>

      {pending.length > 0 && (
        <div className="mt-2 rounded-xl border border-warning-200 bg-warning-50 px-3 py-2.5">
          <p className="text-xs font-semibold text-warning-700">{pending.length === 1 ? '1 file needs' : `${pending.length} files need`} a requirement</p>
          <ul className="mt-2 space-y-1.5">
            {pending.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-xs text-warning-700" title={entry.file.name}>{entry.file.name}</span>
                {entry.reason ? <span className="text-xs font-semibold text-rose-700">{entry.reason}</span> : unattached.length ? (
                  <select
                    defaultValue=""
                    onChange={(event) => assign(entry, event.target.value)}
                    aria-label={`Assign ${entry.file.name} to a requirement`}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                  >
                    <option value="">Assign to…</option>
                    {unattached.map((requirement) => <option key={requirement._id} value={requirement._id}>{requirement.title}</option>)}
                  </select>
                ) : <span className="text-xs font-semibold text-warning-700">Every requirement already has a file</span>}
                <button type="button" onClick={() => setPending((current) => current.filter((item) => item.id !== entry.id))} aria-label={`Ignore ${entry.file.name}`} className="rounded p-1 text-warning-700 hover:bg-warning-100">
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
        {requirements.map((requirement) => {
          const value = getValue(requirement._id);
          const name = fileNameOf(value);
          const persisted = Boolean(name) && !(value instanceof File);
          const hint = requirementHint(requirement);
          return (
            <li key={requirement._id} className="py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {requirement.title}
                    {requirement.isRequired
                      ? <span className="ml-1.5 text-[11px] font-semibold uppercase tracking-caps text-rose-700">Required</span>
                      : <span className="ml-1.5 text-xs font-normal text-slate-400">Optional</span>}
                  </p>
                  {hint && <p className="mt-0.5 truncate text-xs text-slate-500" title={hint}>{hint}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {name ? (
                    <>
                      <span className="flex min-w-0 items-center gap-1 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="max-w-36 truncate" title={name}>{name}</span>
                      </span>
                      {!persisted && (
                        <button type="button" onClick={() => onDetach(requirement)} aria-label={`Remove ${name}`} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-700">
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </>
                  ) : (
                    <label className="ui-btn ui-btn-secondary ui-btn-sm cursor-pointer">
                      <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />Attach
                      <input type="file" accept={requirement.allowedFileTypes?.join(',')} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) onAttach(requirement, file); event.target.value = ''; }} />
                    </label>
                  )}
                </div>
              </div>
              {errors[requirement._id] && <p role="alert" className="mt-1 text-xs text-rose-700">{errors[requirement._id]}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default BulkDocumentUpload;
