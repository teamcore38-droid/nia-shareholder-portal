import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, Loader2, ExternalLink, X } from 'lucide-react';
import { uploadFileToServer } from '../api/client';

export default function FileUploader({
  folder = 'documents',
  label = 'Upload supporting document or image (Cloudinary)',
  accept = '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx',
  currentUrl = '',
  currentName = '',
  onUploaded
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const uploaded = await uploadFileToServer(file, folder);
      if (onUploaded) {
        onUploaded({
          url: uploaded.url,
          name: uploaded.originalName || file.name,
          provider: uploaded.provider,
          publicId: uploaded.publicId
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-[#D4AF37]/15 text-slate-700 hover:text-[#9A7B2C] border border-slate-200 hover:border-[#D4AF37]/40 transition-all cursor-pointer disabled:opacity-60"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#B8860B]" />
              Uploading to Cloudinary...
            </>
          ) : (
            <>
              <UploadCloud className="w-4 h-4 text-[#B8860B]" />
              {label}
            </>
          )}
        </button>

        {currentUrl && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate max-w-[180px]">{currentName || 'Attached file'}</span>
            <a
              href={currentUrl}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-700 hover:text-emerald-950 underline inline-flex items-center gap-0.5"
              title="Open file"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
            {onUploaded && (
              <button
                type="button"
                onClick={() => onUploaded({ url: '', name: '', provider: '', publicId: '' })}
                className="text-emerald-600 hover:text-red-600 ml-0.5"
                title="Remove attachment"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}
