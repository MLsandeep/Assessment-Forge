
import React, { useState } from 'react';
import { AssessmentItem } from '../types';
import { Check, X, Award, Download, Copy, AlertTriangle, FileText, ArrowLeft, Save } from 'lucide-react';

interface ResultsViewProps {
  item: AssessmentItem;
  onBack?: () => void;
  onSaveToLibrary?: (item: AssessmentItem) => void;
  isSaved?: boolean;
}

const ResultsView: React.FC<ResultsViewProps> = ({ item, onBack, onSaveToLibrary, isSaved = false }) => {
  const [hasSaved, setHasSaved] = useState(isSaved);

  const downloadJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(item, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "item.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleSave = () => {
    if (onSaveToLibrary && !hasSaved) {
        onSaveToLibrary(item);
        setHasSaved(true);
    }
  };

  // Render Freeform Content
  if (item.type === 'Freeform') {
      return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
             {onBack && (
                 <button onClick={onBack} className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors font-medium">
                     <ArrowLeft size={16} /> Back
                 </button>
             )}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 p-6 border-b flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Generated Content</h3>
                        <p className="text-sm text-gray-500">Freeform Output</p>
                    </div>
                    <div className="flex gap-2">
                        {onSaveToLibrary && (
                            <button 
                                onClick={handleSave}
                                disabled={hasSaved}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${hasSaved ? 'bg-green-100 text-green-700' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                            >
                                {hasSaved ? <Check size={16} /> : <Save size={16} />}
                                {hasSaved ? 'Saved' : 'Save to Bank'}
                            </button>
                        )}
                        <button onClick={downloadJSON} className="text-gray-600 hover:text-indigo-600 p-2 rounded-md hover:bg-gray-100 transition" title="Export JSON">
                            <Download size={20} />
                        </button>
                    </div>
                </div>
                <div className="p-8">
                    {item.imageUrl && (
                        <div className="mb-6 rounded-lg overflow-hidden border border-gray-200 shadow-sm max-w-md mx-auto">
                            <img src={item.imageUrl} alt="Generated visual" className="w-full h-auto object-cover" />
                        </div>
                    )}
                    <div className="prose max-w-none text-gray-800 whitespace-pre-wrap font-serif leading-relaxed">
                        {item.freeformContent}
                    </div>
                </div>
            </div>
        </div>
      );
  }

  // Render Assessment Item
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
         {onBack && (
             <button onClick={onBack} className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors font-medium">
                 <ArrowLeft size={16} /> Back
             </button>
         )}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header with Score */}
            <div className="bg-gray-50 p-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-900">Generated Output</h3>
                    <p className="text-sm text-gray-500">Review the item before exporting.</p>
                </div>
                <div className="flex items-center gap-4">
                    {item.qualityScore !== undefined && (
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${
                            item.qualityScore > 80 ? 'bg-green-50 border-green-200 text-green-700' : 
                            item.qualityScore > 50 ? 'bg-amber-50 border-amber-200 text-amber-700' : 
                            'bg-red-50 border-red-200 text-red-700'
                        }`}>
                            <Award size={18} />
                            <span className="font-bold">IQS: {item.qualityScore}/100</span>
                        </div>
                    )}
                    {onSaveToLibrary && (
                        <button 
                            onClick={handleSave}
                            disabled={hasSaved}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${hasSaved ? 'bg-green-100 text-green-700' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                        >
                            {hasSaved ? <Check size={16} /> : <Save size={16} />}
                            {hasSaved ? 'Saved' : 'Save to Bank'}
                        </button>
                    )}
                    <button onClick={downloadJSON} className="text-gray-600 hover:text-indigo-600 p-2 rounded-md hover:bg-gray-100 transition" title="Export JSON">
                        <Download size={20} />
                    </button>
                </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Item Content */}
                <div className="lg:col-span-2 space-y-6">
                    {item.passage && (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h4 className="text-xs font-bold uppercase text-gray-400 mb-2">Passage / Context</h4>
                            <p className="text-gray-800 leading-relaxed font-serif">{item.passage}</p>
                        </div>
                    )}
                    
                    <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">{item.question}</h4>
                        {item.imageUrl && (
                            <div className="mb-6 rounded-lg overflow-hidden border border-gray-200 shadow-sm max-w-md">
                                <img src={item.imageUrl} alt="Item illustration" className="w-full h-auto object-cover" />
                            </div>
                        )}
                        <div className="space-y-3">
                            {item.options?.map((opt, idx) => (
                                <div key={idx} className={`flex items-start p-3 rounded-lg border transition-all ${
                                    idx === item.correctAnswer 
                                    ? 'bg-green-50 border-green-200 shadow-sm' 
                                    : 'bg-white border-gray-200 opacity-80'
                                }`}>
                                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 border ${
                                        idx === item.correctAnswer ? 'bg-green-600 border-green-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-500'
                                    }`}>
                                        {String.fromCharCode(65 + idx)}
                                    </div>
                                    <span className={`text-sm ${idx === item.correctAnswer ? 'font-medium text-green-900' : 'text-gray-700'}`}>{opt}</span>
                                    {idx === item.correctAnswer && <Check size={16} className="ml-auto text-green-600" />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar: Rationale & Feedback */}
                <div className="space-y-6">
                    <div className="bg-blue-50 p-5 rounded-lg border border-blue-100">
                        <h4 className="text-blue-900 font-semibold mb-2 flex items-center gap-2">
                            <Check size={16} /> Rationale
                        </h4>
                        <p className="text-sm text-blue-800 leading-relaxed">
                            {item.rationale}
                        </p>
                    </div>

                    {item.qualityFeedback && (
                        <div className="bg-amber-50 p-5 rounded-lg border border-amber-100">
                             <h4 className="text-amber-900 font-semibold mb-2 flex items-center gap-2">
                                <AlertTriangle size={16} /> AI Feedback
                            </h4>
                            <p className="text-sm text-amber-800 leading-relaxed">
                                {item.qualityFeedback}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default ResultsView;
