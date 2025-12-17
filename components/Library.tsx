
import React, { useState } from 'react';
import { AssessmentItem } from '../types';
import { BookOpen, Calendar, Award, ChevronRight, FileText, Database, Trash2, Edit, Save, X, Download, Upload, AlertTriangle } from 'lucide-react';

interface LibraryProps {
  items: AssessmentItem[];
  onSelectItem: (item: AssessmentItem) => void;
  onDeleteItem: (id: string) => void;
  onUpdateItem: (item: AssessmentItem) => void;
  onImportItems: (items: AssessmentItem[]) => void;
}

const Library: React.FC<LibraryProps> = ({ items, onSelectItem, onDeleteItem, onUpdateItem, onImportItems }) => {
  const [editingItem, setEditingItem] = useState<AssessmentItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSaveEdit = () => {
    if (editingItem) {
        onUpdateItem(editingItem);
        setEditingItem(null);
    }
  };

  const confirmDelete = () => {
      if (deletingId) {
          onDeleteItem(deletingId);
          setDeletingId(null);
      }
  };

  const updateOption = (idx: number, val: string) => {
    if (!editingItem || !editingItem.options) return;
    const newOptions = [...editingItem.options];
    newOptions[idx] = val;
    setEditingItem({ ...editingItem, options: newOptions });
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "item_bank.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportClick = () => {
    document.getElementById('library-import')?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const imported = JSON.parse(event.target?.result as string);
              if (Array.isArray(imported)) {
                  onImportItems(imported);
              } else {
                  alert("Invalid format: File must contain an array of items.");
              }
          } catch (err) {
              alert("Error parsing JSON file.");
          }
      };
      reader.readAsText(file);
      // Reset input
      e.target.value = '';
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Database className="text-indigo-600" />
                Item Bank
            </h2>
             <p className="text-sm text-gray-500 mt-1">
                {items.length} Items stored. 
             </p>
          </div>
          
          <div className="flex gap-2">
            <input type="file" id="library-import" className="hidden" accept=".json" onChange={handleFileChange} />
            <button 
                onClick={handleImportClick}
                className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition shadow-sm text-sm"
            >
                <Upload size={14} /> Import
            </button>
            <button 
                onClick={handleExport}
                className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition shadow-sm text-sm"
            >
                <Download size={14} /> Export Bank
            </button>
          </div>
        </div>
        
        {items.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
             <div className="bg-gray-100 p-4 rounded-full mb-4">
                 <Database size={32} className="text-gray-400" />
             </div>
             <h3 className="text-lg font-semibold text-gray-700">Item Bank is empty</h3>
             <p className="text-gray-500 text-sm mt-1">Generate items in Guided mode or Import a JSON file.</p>
           </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div 
              key={item.id}
              className="group bg-white rounded-xl border border-gray-200 hover:border-indigo-400 hover:shadow-md transition-all flex flex-col overflow-hidden relative"
            >
              <div 
                className="p-5 flex-1 space-y-3 cursor-pointer"
                onClick={() => onSelectItem(item)}
              >
                 <div className="flex justify-between items-start">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                        item.difficulty === 'B2' || item.difficulty === 'C1' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {item.difficulty || 'N/A'}
                    </span>
                    {item.qualityScore && (
                        <div className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-md">
                          <Award size={12} /> {item.qualityScore}
                        </div>
                    )}
                 </div>
                 
                 <div>
                   <h4 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                      {item.question || (item.type === 'Freeform' && 'Freeform Generated Content') || 'Untitled Item'}
                   </h4>
                   <p className="text-xs text-gray-500 mt-1">{item.topic || 'General Topic'}</p>
                 </div>

                 {item.passage && (
                   <div className="flex items-center gap-1 text-xs text-gray-400">
                     <FileText size={12} />
                     Includes passage
                   </div>
                 )}
              </div>
              
              <div className="bg-gray-50 px-5 py-3 border-t flex justify-between items-center text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Just now'}
                  </div>
                  <div className="flex items-center gap-2">
                      <button 
                        type="button"
                        onClick={(e) => { 
                            e.preventDefault();
                            e.stopPropagation(); 
                            setEditingItem(item); 
                        }}
                        className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors z-10 relative" 
                        title="Edit Item"
                      >
                          <Edit size={16}/>
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => { 
                            e.preventDefault();
                            e.stopPropagation(); 
                            setDeletingId(item.id); 
                        }}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors z-10 relative" 
                        title="Delete Item"
                      >
                          <Trash2 size={16}/>
                      </button>
                  </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-gray-100 p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="bg-red-100 p-3 rounded-full text-red-600">
                        <Trash2 size={32} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Delete Item?</h3>
                        <p className="text-sm text-gray-500 mt-1">This action cannot be undone. Are you sure you want to remove this item from the bank?</p>
                    </div>
                    <div className="flex gap-3 w-full pt-2">
                        <button 
                            onClick={() => setDeletingId(null)} 
                            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmDelete} 
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium text-sm"
                        >
                            Delete
                        </button>
                    </div>
                </div>
             </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-gray-100 flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Edit size={18} className="text-indigo-600"/> Edit Item
                    </h3>
                    <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-gray-600">
                        <X size={20}/>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-4">
                    {/* Common Fields */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Topic</label>
                        <input 
                            className="w-full p-2 border border-gray-300 rounded mt-1 text-sm bg-white text-gray-900"
                            value={editingItem.topic || ''}
                            onChange={(e) => setEditingItem({...editingItem, topic: e.target.value})}
                        />
                    </div>

                    {editingItem.type === 'Freeform' ? (
                        <div>
                             <label className="text-xs font-bold text-gray-500 uppercase">Content</label>
                             <textarea 
                                className="w-full p-2 border border-gray-300 rounded mt-1 text-sm font-mono h-64 bg-white text-gray-900"
                                value={editingItem.freeformContent || ''}
                                onChange={(e) => setEditingItem({...editingItem, freeformContent: e.target.value})}
                            />
                        </div>
                    ) : (
                        <>
                            {/* Standard Assessment Item Fields */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Question Stem</label>
                                <textarea 
                                    className="w-full p-2 border border-gray-300 rounded mt-1 text-sm h-24 bg-white text-gray-900"
                                    value={editingItem.question || ''}
                                    onChange={(e) => setEditingItem({...editingItem, question: e.target.value})}
                                />
                            </div>

                            {editingItem.options && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Options (Select Correct)</label>
                                    <div className="space-y-2">
                                        {editingItem.options.map((opt, idx) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                                <input 
                                                    type="radio" 
                                                    name="correctOption"
                                                    checked={editingItem.correctAnswer === idx}
                                                    onChange={() => setEditingItem({...editingItem, correctAnswer: idx})}
                                                    className="w-4 h-4 text-indigo-600"
                                                />
                                                <input 
                                                    className="flex-1 p-2 border border-gray-300 rounded text-sm bg-white text-gray-900"
                                                    value={opt}
                                                    onChange={(e) => updateOption(idx, e.target.value)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Rationale</label>
                                <textarea 
                                    className="w-full p-2 border border-gray-300 rounded mt-1 text-sm h-20 bg-white text-gray-900"
                                    value={editingItem.rationale || ''}
                                    onChange={(e) => setEditingItem({...editingItem, rationale: e.target.value})}
                                />
                            </div>
                        </>
                    )}
                </div>

                <div className="p-4 border-t bg-gray-50 rounded-b-xl flex justify-end gap-2">
                    <button onClick={() => setEditingItem(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
                    <button onClick={handleSaveEdit} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-colors font-medium flex items-center gap-2">
                        <Save size={16} /> Save Changes
                    </button>
                </div>
            </div>
        </div>
      )}
    </>
  );
};

export default Library;
