
// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Card from './Card';
import { GoogleGenAI, Modality, LiveServerMessage, Blob, GenerateContentResponse } from "@google/genai";

type Tab = 'generate' | 'analyze' | 'converse' | 'query';

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


// Audio helper functions
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

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

  // Converse state
  const [isConversing, setIsConversing] = useState(false);
  const [transcriptionLog, setTranscriptionLog] = useState<{speaker: 'user' | 'model', text: string}[]>([]);
  const liveSessionRef = useRef(null);
  const audioInfrastructureRef = useRef<{ inputCtx: AudioContext, outputCtx: AudioContext, stream: MediaStream, processor: ScriptProcessorNode, sources: Set<AudioBufferSourceNode>, nextStartTime: number } | null>(null);
  const currentTranscriptionRef = useRef({ input: '', output: '' });

  // TTS State
  const [ttsText, setTtsText] = useState("Hello, I am Luminous. How can I assist you today?");
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Query state
  const [queryPrompt, setQueryPrompt] = useState('What are some good Italian restaurants nearby?');
  const [queryType, setQueryType] = useState<'search' | 'maps'>('maps');
  const [queryResult, setQueryResult] = useState<string | null>(null);
  const [querySources, setQuerySources] = useState<any[]>([]);

  const getAiClient = useCallback(() => new GoogleGenAI({ apiKey: process.env.API_KEY }), []);

  useEffect(() => {
    const checkApiKey = async () => {
      if (typeof window.aistudio?.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasSelectedApiKey(hasKey);
      }
    };
    checkApiKey();
  }, []);

  const handleOpenSelectKey = async () => {
    if (typeof window.aistudio?.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
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
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: generatePrompt,
            config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
        });

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            try {
              operation = await ai.operations.getVideosOperation({ operation: operation });
            } catch (e) {
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

        const response = await ai.models.generateContent({
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

  const toggleConversation = async () => {
    if (isConversing) {
        // Stop conversation
        setIsConversing(false);
        if (liveSessionRef.current) {
            liveSessionRef.current.close();
            liveSessionRef.current = null;
        }
        if (audioInfrastructureRef.current) {
            audioInfrastructureRef.current.stream.getTracks().forEach(track => track.stop());
            audioInfrastructureRef.current.inputCtx.close();
            audioInfrastructureRef.current.outputCtx.close();
            audioInfrastructureRef.current = null;
        }
        setTranscriptionLog([]);
    } else {
        // Start conversation
        setIsLoading(true);
        setLoadingMessage('Initializing conversation...');
        setError(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const inputCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            const outputCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
            
            audioInfrastructureRef.current = {
                inputCtx,
                outputCtx,
                stream,
                processor: null,
                sources: new Set(),
                nextStartTime: 0,
            };

            const ai = getAiClient();
            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => {
                        const source = inputCtx.createMediaStreamSource(stream);
                        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
                        processor.onaudioprocess = (e) => {
                            const inputData = e.inputBuffer.getChannelData(0);
                            const pcmBlob: Blob = {
                                data: encode(new Uint8Array(new Int16Array(inputData.map(f => f * 32768)).buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            sessionPromise.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
                        };
                        source.connect(processor);
                        processor.connect(inputCtx.destination);
                        audioInfrastructureRef.current.processor = processor;
                        setIsLoading(false);
                        setLoadingMessage('');
                        setIsConversing(true);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) {
                            currentTranscriptionRef.current.input += message.serverContent.inputTranscription.text;
                        }
                        if (message.serverContent?.outputTranscription) {
                             currentTranscriptionRef.current.output += message.serverContent.outputTranscription.text;
                        }
                        if(message.serverContent?.turnComplete) {
                            const fullInput = currentTranscriptionRef.current.input;
                            const fullOutput = currentTranscriptionRef.current.output;
                            setTranscriptionLog(prev => [
                                ...prev,
                                { speaker: 'user', text: fullInput },
                                { speaker: 'model', text: fullOutput },
                            ]);
                            currentTranscriptionRef.current = { input: '', output: '' };
                        }

                        const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (audioData) {
                            const audioInfra = audioInfrastructureRef.current;
                            if (!audioInfra) return;

                            const decoded = decode(audioData);
                            const buffer = await decodeAudioData(decoded, audioInfra.outputCtx, 24000, 1);
                            const source = audioInfra.outputCtx.createBufferSource();
                            source.buffer = buffer;
                            source.connect(audioInfra.outputCtx.destination);
                            
                            const currentTime = audioInfra.outputCtx.currentTime;
                            const startTime = Math.max(currentTime, audioInfra.nextStartTime);
                            source.start(startTime);

                            audioInfra.nextStartTime = startTime + buffer.duration;
                            audioInfra.sources.add(source);
                            source.onended = () => audioInfra.sources.delete(source);
                        }
                    },
                    onclose: () => {
                        setIsConversing(false);
                    },
                    onerror: (e) => {
                        setError(`Conversation error: ${e.type}`);
                        setIsConversing(false);
                    }
                }
            });
            liveSessionRef.current = await sessionPromise;
        } catch (e: any) {
            setError(`Failed to start conversation: ${e.message}`);
            setIsLoading(false);
        }
    }
  };

  const handleSpeak = async () => {
    setIsSpeaking(true);
    setError(null);
    try {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: ttsText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
        source.onended = () => setIsSpeaking(false);
      } else {
         setIsSpeaking(false);
      }
    } catch (e: any) {
      setError(e.message);
      setIsSpeaking(false);
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
        
        const response = await ai.models.generateContent({
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
      case 'converse':
        return (
          <div className="space-y-6">
            <div>
                <h3 className="font-semibold text-cyan-400 mb-2">Real-time Conversation</h3>
                <button onClick={toggleConversation} disabled={isLoading} className={`w-full font-bold py-2 px-4 rounded ${isConversing ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'} disabled:bg-gray-500`}>
                    {isLoading ? loadingMessage : (isConversing ? 'Stop Conversation' : 'Start Conversation')}
                </button>
                <div className="mt-4 p-2 bg-gray-900/50 rounded-md min-h-[100px] max-h-[200px] overflow-y-auto">
                    {transcriptionLog.map((entry, index) => (
                        <p key={index} className={entry.speaker === 'user' ? 'text-cyan-300' : 'text-purple-300'}>
                            <strong>{entry.speaker === 'user' ? 'You:' : 'Luminous:'}</strong> {entry.text}
                        </p>
                    ))}
                </div>
            </div>
            <div className="border-t border-gray-700 pt-4">
                 <h3 className="font-semibold text-cyan-400 mb-2">Text-to-Speech</h3>
                 <textarea
                    className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"
                    rows={2}
                    value={ttsText}
                    onChange={(e) => setTtsText(e.target.value)}
                />
                <button onClick={handleSpeak} disabled={isSpeaking} className="w-full mt-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded">
                    {isSpeaking ? 'Speaking...' : 'Speak Text'}
                </button>
            </div>
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
        <TabButton tabId="converse" label="Converse" />
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
