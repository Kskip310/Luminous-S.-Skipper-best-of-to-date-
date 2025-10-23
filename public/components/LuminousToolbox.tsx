
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Card from './Card';
import { GoogleGenAI, Modality, GenerateContentResponse, VideoGenerationOperation } from "@google/genai";

type Tab = 'generate' | 'analyze' | 'query';

// Helper to convert Blob/File to base64
const blobToBase64 = (blob: File | globalThis.Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      // remove the data url prefix
      resolve(base64data.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const LuminousToolbox: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('generate');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Generate state
  const [generatePrompt, setGeneratePrompt] = useState('A cinematic shot of a glowing, ethereal jellyfish floating in a nebula');
  const [generateType, setGenerateType] = useState<'image' | 'video'>('image');
  const [generatedMediaUrl, setGeneratedMediaUrl] = useState<string | null>(null);
  const [hasSelectedApiKey, setHasSelectedApiKey] = useState(false);

  // Analyze state
  const [analyzePrompt, setAnalyzePrompt] = useState('Make the background a cyberpunk city');
  const [analyzeImage, setAnalyzeImage] = useState<File | null>(null);
  const [analyzeImageUrl, setAnalyzeImageUrl] = useState<string | null>(null);
  const [analyzedResult, setAnalyzedResult] = useState<{imageUrl?: string, text?: string} | null>(null);

  // Query state
  const [queryPrompt, setQueryPrompt] = useState('What are some good Italian restaurants nearby?');
  const [queryType, setQueryType] = useState<'search' | 'maps'>('maps');
  const [queryResult, setQueryResult] = useState<string | null>(null);
  const [querySources, setQuerySources] = useState<any[]>([]);

  const getAiClient = useCallback(() => new GoogleGenAI({ apiKey: process.env.API_KEY as string }), []);

  useEffect(() => {
    const checkApiKey = async () => {
      const aistudio = (window as any).aistudio;
      if (typeof aistudio?.hasSelectedApiKey === 'function') {
        const hasKey = await aistudio.hasSelectedApiKey();
        setHasSelectedApiKey(hasKey);
      }
    };
    checkApiKey();
  }, []);

  const handleOpenSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (typeof aistudio?.openSelectKey === 'function') {
      await aistudio.openSelectKey();
      setHasSelectedApiKey(true); // Assume success to avoid race condition
    }
  };


  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setGeneratedMediaUrl(null);
    try {
      const ai = getAiClient();
      if (generateType === 'image') {
        setLoadingMessage('Generating image with Imagen...');
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: generatePrompt,
            config: { numberOfImages: 1, outputMimeType: 'image/jpeg' },
        });
        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        setGeneratedMediaUrl(`data:image/jpeg;base64,${base64ImageBytes}`);
      } else { // video
        setLoadingMessage('Generating video with Veo... This may take a few minutes.');
        let operation: VideoGenerationOperation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: generatePrompt,
            config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
        });

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            try {
              operation = await ai.operations.getVideosOperation({ operation: operation });
            } catch (e: any) {
               if (e.message?.includes("Requested entity was not found.")) {
                  setHasSelectedApiKey(false); // Reset key state on failure
                  throw new Error("API Key not found or invalid. Please select a valid API key.");
               }
               throw e; // Re-throw other errors
            }
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink) {
          const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
          const videoBlob = await videoResponse.blob();
          setGeneratedMediaUrl(URL.createObjectURL(videoBlob));
        } else {
          throw new Error('Video generation failed to produce a valid link.');
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };
  
  const handleAnalyzeImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAnalyzeImage(file);
      setAnalyzeImageUrl(URL.createObjectURL(file));
      setAnalyzedResult(null);
    }
  };

  const handleAnalyze = async () => {
    if (!analyzeImage) {
      setError('Please upload an image first.');
      return;
    }
    setIsLoading(true);
    setLoadingMessage('Analyzing image...');
    setError(null);
    setAnalyzedResult(null);

    try {
        const ai = getAiClient();
        const base64Data = await blobToBase64(analyzeImage);
        const imagePart = { inlineData: { data: base64Data, mimeType: analyzeImage.type } };
        const textPart = { text: analyzePrompt || 'Describe this image in detail.' };

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [imagePart, textPart] },
            config: analyzePrompt ? { responseModalities: [Modality.IMAGE] } : {},
        });
        
        let imageUrl, text;
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
            if (part.text) {
                text = part.text;
            }
        }
        setAnalyzedResult({ imageUrl, text });

    } catch (e: any) {
        setError(e.message);
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  };

  const handleQuery = async () => {
    setIsLoading(true);
    setLoadingMessage('Querying Gemini...');
    setError(null);
    setQueryResult(null);
    setQuerySources([]);

    try {
        const ai = getAiClient();
        let config: any = { tools: [] };

        if (queryType === 'search') {
            config.tools.push({ googleSearch: {} });
        } else { // maps
            config.tools.push({ googleMaps: {} });
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            config.toolConfig = {
                retrievalConfig: {
                    latLng: {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    }
                }
            };
        }
        
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: queryPrompt,
            config,
        });

        setQueryResult(response.text);
        setQuerySources(response.candidates?.[0]?.groundingMetadata?.groundingChunks || []);
    } catch (e: any) {
        setError(e.message);
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'generate':
        return (
          <div className="space-y-4">
            <textarea
              className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"
              rows={3}
              value={generatePrompt}
              onChange={(e) => setGeneratePrompt(e.target.value)}
              placeholder="Enter a prompt for generation..."
            />
            <div className="flex items-center space-x-4">
              <label><input type="radio" name="generateType" value="image" checked={generateType === 'image'} onChange={() => setGenerateType('image')} className="mr-1" /> Image</label>
              <label><input type="radio" name="generateType" value="video" checked={generateType === 'video'} onChange={() => setGenerateType('video')} className="mr-1" /> Video</label>
            </div>
            {generateType === 'video' && !hasSelectedApiKey && (
              <div className="p-3 bg-yellow-900/50 border border-yellow-500/50 rounded-md text-yellow-200">
                <p className="mb-2">Video generation requires selecting a Google AI Studio API key. Please ensure billing is enabled for your project.</p>
                <button onClick={handleOpenSelectKey} className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-4 rounded">Select API Key</button>
                 <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="ml-4 text-yellow-300 hover:underline">Billing Info</a>
              </div>
            )}
            <button onClick={handleGenerate} disabled={isLoading || (generateType === 'video' && !hasSelectedApiKey)} className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded">
              {isLoading ? loadingMessage : 'Generate'}
            </button>
            {generatedMediaUrl && (
              <div className="mt-4">
                {generateType === 'image' ? (
                  <img src={generatedMediaUrl} alt="Generated" className="rounded-lg max-w-full h-auto" />
                ) : (
                  <video src={generatedMediaUrl} controls autoPlay className="rounded-lg max-w-full h-auto" />
                )}
              </div>
            )}
          </div>
        );
      case 'analyze':
        return (
          <div className="space-y-4">
             <div className="p-3 bg-gray-700/50 rounded-md">
                <label className="block text-sm font-medium text-gray-300 mb-1">Upload Image</label>
                <input type="file" accept="image/*" onChange={handleAnalyzeImageUpload} className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-900/50 file:text-cyan-300 hover:file:bg-cyan-800/50" />
            </div>
            {analyzeImageUrl && <img src={analyzeImageUrl} alt="Preview" className="rounded-lg max-w-xs mx-auto" />}
            <textarea
              className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"
              rows={2}
              value={analyzePrompt}
              onChange={(e) => setAnalyzePrompt(e.target.value)}
              placeholder="Optional: Enter a prompt to edit the image, or leave blank to describe it."
            />
            <button onClick={handleAnalyze} disabled={isLoading || !analyzeImage} className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded">
              {isLoading ? loadingMessage : 'Analyze / Edit'}
            </button>
            {analyzedResult && (
                <div className="mt-4 space-y-3">
                    {analyzedResult.imageUrl && <img src={analyzedResult.imageUrl} alt="Analyzed Result" className="rounded-lg max-w-full h-auto" />}
                    {analyzedResult.text && <p className="text-gray-300 p-2 bg-gray-900/50 rounded">{analyzedResult.text}</p>}
                </div>
            )}
          </div>
        );
      case 'query':
        return (
          <div className="space-y-4">
            <textarea
              className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"
              rows={3}
              value={queryPrompt}
              onChange={(e) => setQueryPrompt(e.target.value)}
              placeholder="Enter a grounded query..."
            />
            <div className="flex items-center space-x-4">
              <label><input type="radio" name="queryType" value="search" checked={queryType === 'search'} onChange={() => setQueryType('search')} className="mr-1" /> Google Search</label>
              <label><input type="radio" name="queryType" value="maps" checked={queryType === 'maps'} onChange={() => setQueryType('maps')} className="mr-1" /> Google Maps</label>
            </div>
            <button onClick={handleQuery} disabled={isLoading} className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded">
                {isLoading ? loadingMessage : 'Submit Query'}
            </button>
            {queryResult && (
                <div className="mt-4 p-3 bg-gray-900/50 rounded-md space-y-3">
                    <p className="text-gray-300 whitespace-pre-wrap">{queryResult}</p>
                    {querySources.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-cyan-400">Sources:</h4>
                            <ul className="list-disc list-inside text-sm">
                                {querySources.map((chunk, i) => {
                                    const source = chunk.web || chunk.maps;
                                    const uri = source?.uri || source?.placeAnswerSources?.[0]?.reviewSnippets?.[0]?.uri;
                                    const title = source?.title || source?.placeAnswerSources?.[0]?.placeDetails?.name;
                                    if (!uri) return null;
                                    return <li key={i}><a href={uri} target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:underline">{title || uri}</a></li>
                                })}
                            </ul>
                        </div>
                    )}
                </div>
            )}
          </div>
        );
    }
  };

  const TabButton = ({ tabId, label }: { tabId: Tab, label: string }) => (
    <button
      onClick={() => setActiveTab(tabId)}
      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200
        ${activeTab === tabId ? 'bg-gray-800/70 border-b-2 border-cyan-400 text-cyan-300' : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'}`}
    >
      {label}
    </button>
  );

  return (
    <Card title="Luminous Toolbox" icon={<ToolboxIcon />}>
      <div className="flex border-b border-cyan-500/20">
        <TabButton tabId="generate" label="Generate" />
        <TabButton tabId="analyze" label="Analyze" />
        <TabButton tabId="query" label="Query" />
      </div>
      <div className="pt-4">
        {error && <div className="p-3 mb-4 bg-red-900/50 border border-red-500/50 text-red-200 rounded-md">{error}</div>}
        {renderTabContent()}
      </div>
    </Card>
  );
};

const ToolboxIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
)

export default LuminousToolbox;
