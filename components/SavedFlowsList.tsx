
import React from 'react';
import { FlowTemplate } from '../types';
import { Layers, Calendar, Trash2, ArrowRight, GitBranch, Download, Upload } from 'lucide-react';

interface SavedFlowsListProps {
  flows: FlowTemplate[];
  onLoadFlow: (flowId: string) => void;
  onDeleteFlow: (flowId: string) => void;
  onImportFlows?: (flows: FlowTemplate[]) => void;
}

const SavedFlowsList: React.FC<SavedFlowsListProps> = ({ flows, onLoadFlow, onDeleteFlow, onImportFlows }) => {
  
  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(flows, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "my_flows.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportClick = () => {
    document.getElementById('flows-import')?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !onImportFlows) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const imported = JSON.parse(event.target?.result as string);
              if (Array.isArray(imported)) {
                  onImportFlows(imported);
              } else {
                  alert("Invalid format: File must contain an array of flow templates.");
              }
          } catch (err) {
              alert("Error parsing JSON file.");
          }
      };
      reader.readAsText(file);
      e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Layers className="text-indigo-600" />
                My Saved Flows
            </h2>
            <p className="text-sm text-gray-500 mt-1">Resume work on your complex generation pipelines.</p>
        </div>
        <div className="flex gap-2">
            {onImportFlows && (
                <>
                    <input type="file" id="flows-import" className="hidden" accept=".json" onChange={handleFileChange} />
                    <button 
                        onClick={handleImportClick}
                        className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition shadow-sm text-sm"
                    >
                        <Upload size={14} /> Import
                    </button>
                </>
            )}
            <button 
                onClick={handleExport}
                className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition shadow-sm text-sm"
            >
                <Download size={14} /> Export Flows
            </button>
        </div>
      </div>

      {flows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <div className="bg-gray-100 p-4 rounded-full mb-4">
                <Layers size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700">No Saved Flows</h3>
            <p className="text-gray-500 text-sm mt-1">Create and save workflows in the Flow Builder, or Import a JSON file.</p>
          </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {flows.map((flow) => (
            <div 
                key={flow.id}
                className="group bg-white rounded-xl border border-gray-200 hover:border-indigo-400 hover:shadow-md transition-all flex flex-col overflow-hidden relative cursor-pointer"
                onClick={() => onLoadFlow(flow.id)}
            >
                <div className="p-5 flex-1 space-y-3">
                <div className="flex justify-between items-start">
                    <div className="bg-indigo-50 text-indigo-700 p-2 rounded-lg">
                        <GitBranch size={20} />
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteFlow(flow.id); }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete Flow"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
                
                <div>
                    <h4 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {flow.name}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{flow.description}</p>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-gray-400 pt-2 border-t border-gray-50">
                    <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(flow.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                            <Layers size={12} />
                            {flow.nodes.length} Nodes
                    </div>
                </div>
                </div>
                <div className="bg-gray-50 p-2 flex justify-center items-center text-xs font-medium text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Load Flow <ArrowRight size={12} className="ml-1"/>
                </div>
            </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default SavedFlowsList;
