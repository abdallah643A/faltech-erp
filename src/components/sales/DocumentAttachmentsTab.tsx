import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Download, Trash2, FileText } from 'lucide-react';

interface Attachment {
  id: string;
  name: string;
  size: string;
  date: string;
}

export function DocumentAttachmentsTab() {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const newAttachments = files.map(f => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: `${(f.size / 1024).toFixed(1)} KB`,
      date: new Date().toISOString().split('T')[0],
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  return (
    <div className="bg-white rounded border border-[#d0d5dd] p-4 space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragOver ? 'border-[#0066cc] bg-blue-50' : 'border-[#d0d5dd]'}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-500">Drag & drop files here or click to browse</p>
        <Button size="sm" variant="outline" className="mt-2">Browse Files</Button>
      </div>

      {attachments.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#d0d5dd] text-xs text-gray-500">
              <th className="text-left py-2 px-2">Name</th>
              <th className="text-left py-2 px-2">Size</th>
              <th className="text-left py-2 px-2">Date</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody>
            {attachments.map(a => (
              <tr key={a.id} className="border-b border-[#d0d5dd] hover:bg-[#f0f2f4]">
                <td className="py-2 px-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  {a.name}
                </td>
                <td className="py-2 px-2 text-gray-500">{a.size}</td>
                <td className="py-2 px-2 text-gray-500">{a.date}</td>
                <td className="py-2 px-2 flex gap-1">
                  <Button size="icon" variant="ghost" className="h-6 w-6"><Download className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400" onClick={() => setAttachments(prev => prev.filter(x => x.id !== a.id))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
