
import React, { useState } from 'react';
import { SystemPrompt } from '../types';
import { Plus, Trash2, Edit2, Save, X, MessageSquare, Download } from 'lucide-react';

interface PromptLibraryProps {
  prompts: SystemPrompt[];
  onAddPrompt: (prompt: SystemPrompt) => void;
  onDeletePrompt: (id: string) => void;
  onUpdatePrompt?: (prompt: SystemPrompt) => void;
}

const PromptLibrary: React.FC<PromptLibraryProps> = ({ prompts, onAddPrompt, onDeletePrompt, onUpdatePrompt }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<SystemPrompt>({
    id: '',
    name: '',
    description: '',
    content: '',
    defaultMode: 'assessment'
  });

  const handleOpenCreate = () => {
    setFormData({ id: '', name: '', description: '', content: '', defaultMode: 'assessment' });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (prompt: SystemPrompt) => {
    setFormData({ ...prompt });
    setIsFormOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.content) return;
    
    if (formData.id) {
        // Update existing
        if (onUpdatePrompt) {
            onUpdatePrompt(formData);
        }
    } else {
        // Create new
        onAddPrompt({
            ...formData,
            id: Date.now().toString()
        });
    }
    
    setIsFormOpen(false);
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(prompts, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "prompts.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <MessageSquare className="text-indigo-600" />
                Prompt Library
            </h2>
            <p className="text-sm text-gray-500 mt-1">Manage reusable system personas and instructions.</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={handleExport}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition shadow-sm"
                title="Download as JSON"
            >
                <Download size={16} /> Export
            </button>
            <button 
                onClick={handleOpenCreate}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition shadow-md"
            >
                <Plus size={16} /> New Prompt
            </button>
        </div>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl border-2 border-indigo-100 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4">
            <h3 className="font-bold text-gray-800">{formData.id ? 'Edit Prompt' : 'Create New Prompt'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                    type="text" 
                    placeholder="Prompt Name (e.g., 'TOEFL Reader')"
                    className="p-2 border rounded-md w-full bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                />
                <input 
                    type="text" 
                    placeholder="Short Description"
                    className="p-2 border rounded-md w-full bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                />
            </div>
            <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Default Output Mode</label>
                <select 
                    value={formData.defaultMode || 'assessment'}
                    onChange={e => setFormData({...formData, defaultMode: e.target.value as 'assessment' | 'freeform'})}
                    className="p-2 border rounded-md w-full md:w-1/2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="assessment">Assessment Item (JSON)</option>
                    <option value="freeform">Freeform Generation (Text)</option>
                </select>
                <p className="text-[10px] text-gray-400 mt-1">
                    "Assessment" forces strict JSON structure. "Freeform" allows open-ended text like recipes or outlines.
                </p>
            </div>
            <textarea 
                placeholder="System Instructions... (Use {variables} for dynamic slots)"
                className="w-full p-2 border rounded-md h-32 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                value={formData.content}
                onChange={e => setFormData({...formData, content: e.target.value})}
            />
            <div className="flex justify-end gap-2">
                <button onClick={() => setIsFormOpen(false)} className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                <button onClick={handleSave} className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-1">
                    <Save size={14} /> {formData.id ? 'Update' : 'Save'} Prompt
                </button>
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {prompts.map((prompt) => (
            <div key={prompt.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group relative">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-800">{prompt.name}</h3>
                    <div className="flex gap-1">
                         <button 
                            onClick={() => handleOpenEdit(prompt)}
                            className="text-gray-400 hover:text-indigo-500 transition-colors p-1"
                            title="Edit Prompt"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button 
                            onClick={() => onDeletePrompt(prompt.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                            title="Delete Prompt"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${prompt.defaultMode === 'freeform' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                        {prompt.defaultMode === 'freeform' ? 'Freeform' : 'Assessment'}
                    </span>
                    <p className="text-xs text-gray-500">{prompt.description}</p>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-md text-xs text-gray-600 font-mono h-24 overflow-y-auto border border-gray-100">
                    {prompt.content}
                </div>
            </div>
        ))}
        {prompts.length === 0 && !isFormOpen && (
            <div className="col-span-full text-center py-12 bg-gray-50 border border-dashed rounded-xl">
                <p className="text-gray-500">No prompts created yet. Click "New Prompt" to get started.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default PromptLibrary;
