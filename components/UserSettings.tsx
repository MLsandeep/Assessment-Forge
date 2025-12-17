import React, { useState, useEffect } from 'react';
import { Save, Key, Cpu, Info } from 'lucide-react';

export const TEXT_MODELS = [
    {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        desc: 'Newest hybrid reasoning model. High accuracy.',
        costInput: '$0.15 / 1M tokens',
        costOutput: '$0.60 / 1M tokens'
    },
    {
        id: 'gemini-2.5-flash-lite',
        name: 'Gemini 2.5 Flash-Lite',
        desc: 'Efficient version of 2.5. Good balance.',
        costInput: '$0.10 / 1M tokens',
        costOutput: '$0.40 / 1M tokens'
    },
    {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        desc: 'Fast, multimodal, low latency.',
        costInput: '$0.10 / 1M tokens',
        costOutput: '$0.40 / 1M tokens'
    },
    {
        id: 'gemini-2.0-flash-lite',
        name: 'Gemini 2.0 Flash-Lite',
        desc: 'Cost-optimized for high volume.',
        costInput: '$0.10 / 1M tokens',
        costOutput: '$0.40 / 1M tokens'
    }
];

export const IMAGE_MODELS = [
    {
        id: 'gemini-2.5-flash-image',
        name: 'Gemini 2.5 Flash Image (Nano Banana)',
        desc: 'Optimized for image generation.',
        costInput: '$0.039 / image',
        costOutput: '-'
    },
    {
        id: 'imagen-4.0-generate-001',
        name: 'Imagen 4.0',
        desc: 'High-fidelity image generation.',
        costInput: '$0.04 / image',
        costOutput: '-'
    }
];

export default function UserSettings() {
    const [apiKey, setApiKey] = useState('');
    const [selectedTextModel, setSelectedTextModel] = useState(TEXT_MODELS[0].id);
    const [selectedImageModel, setSelectedImageModel] = useState(IMAGE_MODELS[0].id);
    const [status, setStatus] = useState<'idle' | 'saved'>('idle');

    useEffect(() => {
        const savedKey = localStorage.getItem('af_api_key');
        const savedTextModel = localStorage.getItem('af_model');
        const savedImageModel = localStorage.getItem('af_image_model');

        if (savedKey) setApiKey(savedKey);
        if (savedTextModel) setSelectedTextModel(savedTextModel);
        if (savedImageModel) setSelectedImageModel(savedImageModel);
    }, []);

    const handleSave = () => {
        localStorage.setItem('af_api_key', apiKey);
        localStorage.setItem('af_model', selectedTextModel);
        localStorage.setItem('af_image_model', selectedImageModel);
        setStatus('saved');
        setTimeout(() => setStatus('idle'), 2000);
    };

    return (
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Key className="w-5 h-5 text-indigo-600" />
                    API & Model Configuration
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    Configure your Google Gemini API key and preferred models. These settings are saved locally.
                </p>
            </div>

            <div className="p-6 space-y-8">
                {/* API Key Section */}
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                        Gemini API Key
                    </label>
                    <div className="relative">
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="AIzaSy..."
                            className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Info size={12} />
                        Your key is stored locally and never sent to our servers.
                    </p>
                </div>

                {/* Text Model Selection */}
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                        Text Generation Model
                    </label>
                    <div className="grid grid-cols-1 gap-4">
                        {TEXT_MODELS.map((model) => (
                            <div
                                key={model.id}
                                onClick={() => setSelectedTextModel(model.id)}
                                className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedTextModel === model.id
                                    ? 'border-indigo-600 bg-indigo-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-medium text-gray-900">{model.name}</h3>
                                        <p className="text-sm text-gray-500 mt-1">{model.desc}</p>
                                    </div>
                                    {selectedTextModel === model.id && (
                                        <div className="w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center">
                                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                        </div>
                                    )}
                                </div>
                                <div className="mt-3 flex items-center gap-3 text-xs font-medium text-gray-600 bg-white/50 p-2 rounded">
                                    <span className="flex items-center gap-1">
                                        <span className="text-green-600">IN:</span> {model.costInput}
                                    </span>
                                    <span className="w-px h-3 bg-gray-300" />
                                    <span className="flex items-center gap-1">
                                        <span className="text-blue-600">OUT:</span> {model.costOutput}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Image Model Selection (PARKED) */}
                {/* 
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                        Image Generation Model
                    </label>
                    <div className="grid grid-cols-1 gap-4">
                        {IMAGE_MODELS.map((model) => (
                            <div
                                key={model.id}
                                onClick={() => setSelectedImageModel(model.id)}
                                className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedImageModel === model.id
                                    ? 'border-indigo-600 bg-indigo-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-medium text-gray-900">{model.name}</h3>
                                        <p className="text-sm text-gray-500 mt-1">{model.desc}</p>
                                    </div>
                                    {selectedImageModel === model.id && (
                                        <div className="w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center">
                                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                        </div>
                                    )}
                                </div>
                                <div className="mt-3 flex items-center gap-3 text-xs font-medium text-gray-600 bg-white/50 p-2 rounded">
                                    <span className="flex items-center gap-1">
                                        <span className="text-green-600">COST:</span> {model.costInput}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                */}

                {/* Save Button */}
                <div className="pt-4 flex items-center justify-end gap-4">
                    {status === 'saved' && (
                        <span className="text-sm text-green-600 font-medium animate-in fade-in">
                            Settings Saved!
                        </span>
                    )}
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                        <Save size={18} />
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
}
