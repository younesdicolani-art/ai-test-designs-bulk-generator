import React, { useState, useEffect, useRef } from 'react';
import { LayoutGrid, Layers, LogOut, Sparkles, Ghost, Wand2, Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { ApiKeyModal } from './components/ApiKeyModal';
import { Button, Input, Select, Badge } from './components/UI';
import { DesignGallery } from './components/DesignGallery';
import { generateImage, generateDesignIdeas, analyzeImageForIdeas } from './services/geminiService';
import { Design, DESIGN_STYLES, BulkItem } from './types';

function App() {
  // State
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const [designs, setDesigns] = useState<Design[]>([]);
  
  // Single Gen State
  const [singlePrompt, setSinglePrompt] = useState('');
  const [singleStyle, setSingleStyle] = useState(DESIGN_STYLES[0]);
  const [isGeneratingSingle, setIsGeneratingSingle] = useState(false);

  // Bulk Gen State
  const [bulkNiche, setBulkNiche] = useState('');
  const [bulkStyle, setBulkStyle] = useState(DESIGN_STYLES[0]);
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  
  // File Upload State
  const [uploadedImage, setUploadedImage] = useState<{data: string, mimeType: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize
  useEffect(() => {
    const storedKey = localStorage.getItem('merchghost_api_key');
    if (storedKey) setApiKey(storedKey);
    
    const storedDesigns = localStorage.getItem('merchghost_designs');
    if (storedDesigns) setDesigns(JSON.parse(storedDesigns));
  }, []);

  // Save designs persistence
  useEffect(() => {
    localStorage.setItem('merchghost_designs', JSON.stringify(designs));
  }, [designs]);

  const handleSetApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('merchghost_api_key', key);
  };

  const handleLogout = () => {
    setApiKey(null);
    localStorage.removeItem('merchghost_api_key');
  };

  // --- File Handlers ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
        alert("Please upload an image file.");
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      setUploadedImage({
        data: base64Data,
        mimeType: file.type
      });
      // Clear niche text when image is uploaded to avoid confusion
      setBulkNiche('');
    };
    reader.readAsDataURL(file);
  };

  const clearUpload = () => {
    setUploadedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Handlers ---

  const handleSingleGenerate = async () => {
    if (!apiKey || !singlePrompt) return;
    setIsGeneratingSingle(true);
    try {
      const imageUrl = await generateImage(apiKey, singlePrompt, singleStyle);
      const newDesign: Design = {
        id: Date.now().toString(),
        prompt: singlePrompt,
        style: singleStyle,
        imageUrl,
        createdAt: Date.now()
      };
      setDesigns(prev => [newDesign, ...prev]);
      setSinglePrompt('');
    } catch (e: any) {
      alert(`Generation failed: ${e.message || "Unknown error"}`);
    } finally {
      setIsGeneratingSingle(false);
    }
  };

  const handleGenerateIdeas = async () => {
    if (!apiKey) return;
    if (!bulkNiche && !uploadedImage) return;

    setIsGeneratingIdeas(true);
    try {
      let ideas: string[] = [];
      
      if (uploadedImage) {
        ideas = await analyzeImageForIdeas(apiKey, uploadedImage.data, uploadedImage.mimeType);
      } else {
        ideas = await generateDesignIdeas(apiKey, bulkNiche, 10);
      }

      if (ideas.length === 0) {
          alert("Could not generate any ideas. Try a different prompt or image.");
          return;
      }

      const items: BulkItem[] = ideas.map((idea, idx) => ({
        id: `bulk-${Date.now()}-${idx}`,
        concept: idea,
        status: 'idle'
      }));
      setBulkItems(items);
    } catch (e: any) {
      console.error(e);
      alert(`Failed to generate ideas: ${e.message}`);
    } finally {
      setIsGeneratingIdeas(false);
    }
  };

  const handleRunBulk = async () => {
    if (!apiKey || bulkItems.length === 0) return;
    setIsProcessingBulk(true);

    const pendingItems = bulkItems.filter(i => i.status === 'idle' || i.status === 'failed');

    for (const item of pendingItems) {
      // Check if we should stop (if user cleared queue mid-process, though implemented simply here)
      
      setBulkItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'generating' } : i));

      try {
        const imageUrl = await generateImage(apiKey, item.concept, bulkStyle);
        const newDesign: Design = {
          id: Date.now().toString(),
          prompt: item.concept,
          style: bulkStyle,
          imageUrl,
          createdAt: Date.now()
        };
        
        setDesigns(prev => [newDesign, ...prev]);
        setBulkItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'completed', result: newDesign } : i));
        
        // Wait 4 seconds to be safe with rate limits on standard keys
        await new Promise(r => setTimeout(r, 4000));

      } catch (e) {
        console.error(`Failed to generate item ${item.id}:`, e);
        setBulkItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'failed' } : i));
        // Continue to next
      }
    }
    setIsProcessingBulk(false);
  };

  const deleteDesign = (id: string) => {
    setDesigns(prev => prev.filter(d => d.id !== id));
  };

  if (!apiKey) return <ApiKeyModal onSave={handleSetApiKey} />;

  return (
    <div className="min-h-screen flex bg-zinc-950 text-zinc-200 font-sans selection:bg-indigo-500/30">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-900/50 flex flex-col fixed h-full z-10 backdrop-blur-xl">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
            <Ghost className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
            MerchGhost
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <Button 
            variant={activeTab === 'single' ? 'secondary' : 'ghost'} 
            className="w-full justify-start text-left"
            onClick={() => setActiveTab('single')}
          >
            <Wand2 className="mr-3 h-4 w-4" /> Single Generator
          </Button>
          <Button 
            variant={activeTab === 'bulk' ? 'secondary' : 'ghost'} 
            className="w-full justify-start text-left"
            onClick={() => setActiveTab('bulk')}
          >
            <Layers className="mr-3 h-4 w-4" /> Bulk Scale
          </Button>
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="bg-zinc-800/50 rounded-lg p-3 mb-4 border border-zinc-700/50">
            <p className="text-xs text-zinc-500 font-medium uppercase mb-1">Current Key</p>
            <p className="text-xs text-zinc-300 font-mono truncate tracking-tight">{apiKey.substring(0, 8)}...{apiKey.substring(apiKey.length-4)}</p>
          </div>
          <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/10" onClick={handleLogout}>
            <LogOut className="mr-3 h-4 w-4" /> Disconnect Key
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 max-w-7xl mx-auto w-full">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">
              {activeTab === 'single' ? 'Design Studio' : 'Bulk Scale Studio'}
            </h2>
            <p className="text-zinc-400 mt-1">
              {activeTab === 'single' ? 'Create stunning T-shirt designs in seconds.' : 'Upload a design to create unlimited variations or scale a niche.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block bg-zinc-900 px-4 py-2 rounded-lg border border-zinc-800">
              <p className="text-xs text-zinc-500 font-medium uppercase">Designs Generated</p>
              <p className="text-xl font-bold text-indigo-400">{designs.length}</p>
            </div>
          </div>
        </header>

        {/* Tab Content */}
        {activeTab === 'single' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Input Section */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full pointer-events-none"></div>
                <div className="space-y-4 relative">
                  <div>
                    <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Describe your idea</label>
                    <textarea 
                      className="w-full h-32 bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none transition-all placeholder:text-zinc-600 text-zinc-100"
                      placeholder="e.g. A retro wave astronaut surfing on a pizza slice in space"
                      value={singlePrompt}
                      onChange={(e) => setSinglePrompt(e.target.value)}
                    />
                  </div>
                  
                  <Select 
                    label="Artistic Style" 
                    options={DESIGN_STYLES}
                    value={singleStyle}
                    onChange={(e) => setSingleStyle(e.target.value as any)}
                  />

                  <Button 
                    className="w-full h-12 text-base shadow-indigo-500/20 shadow-lg mt-2" 
                    onClick={handleSingleGenerate}
                    isLoading={isGeneratingSingle}
                    disabled={!singlePrompt}
                  >
                    <Wand2 className="mr-2 h-5 w-5" /> Generate Design
                  </Button>
                </div>
              </div>
            </div>

            {/* Gallery Section */}
            <div className="lg:col-span-2">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                   <Sparkles className="h-4 w-4 text-indigo-400" /> Recent Creations
                 </h3>
               </div>
               <DesignGallery designs={designs} onDelete={deleteDesign} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Bulk Controls */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-6 relative overflow-hidden">
                
                {/* Step 1: Ideation */}
                <div className="space-y-4 border-b border-zinc-800 pb-6">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-xs font-bold text-white shadow-lg shadow-indigo-500/30">1</span>
                    <h3 className="font-semibold text-white">Source Concept</h3>
                  </div>

                  {/* Tabs for source: Text vs Image */}
                  <div className="space-y-4">
                    {!uploadedImage ? (
                      <>
                        <div 
                          className="border-2 border-dashed border-zinc-700 hover:border-indigo-500/50 hover:bg-zinc-800/30 rounded-lg p-8 text-center cursor-pointer transition-all bg-zinc-950/30 group"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <div className="bg-zinc-900 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                            <Upload className="h-5 w-5 text-indigo-400" />
                          </div>
                          <p className="text-sm font-medium text-zinc-300">Upload Reference Design</p>
                          <p className="text-xs text-zinc-500 mt-1">We'll analyze it to create variations</p>
                          <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleFileUpload}
                          />
                        </div>

                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-zinc-800" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-zinc-900 px-2 text-zinc-500">Or enter niche</span>
                          </div>
                        </div>

                         <Input 
                          label="Target Niche" 
                          placeholder="e.g. 'Coffee Lovers' or 'Gym Motivation'"
                          value={bulkNiche}
                          onChange={(e) => setBulkNiche(e.target.value)}
                        />
                      </>
                    ) : (
                      <div className="relative rounded-lg overflow-hidden border border-zinc-700 group ring-2 ring-indigo-500/20">
                        <img 
                          src={`data:${uploadedImage.mimeType};base64,${uploadedImage.data}`} 
                          alt="Upload preview" 
                          className="w-full h-48 object-cover opacity-60"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 to-transparent flex flex-col items-center justify-end p-4">
                           <p className="text-white font-medium drop-shadow-md mb-2 flex items-center gap-2">
                             <Sparkles className="h-4 w-4 text-indigo-400" /> Ready to Scale
                           </p>
                           <Button size="sm" variant="danger" onClick={clearUpload} className="h-8 text-xs w-full">
                             <X className="mr-1 h-3 w-3" /> Remove & Start Over
                           </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <Button 
                    variant="secondary" 
                    className="w-full border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white"
                    onClick={handleGenerateIdeas}
                    isLoading={isGeneratingIdeas}
                    disabled={!bulkNiche && !uploadedImage}
                  >
                    <Sparkles className="mr-2 h-4 w-4 text-indigo-400" /> 
                    {uploadedImage ? "Analyze & Generate Concepts" : "Generate Concepts"}
                  </Button>
                </div>

                {/* Step 2: Settings & Run */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-xs font-bold text-white shadow-lg shadow-indigo-500/30">2</span>
                    <h3 className="font-semibold text-white">Style & Execute</h3>
                  </div>
                  <Select 
                    label="Artistic Style" 
                    options={DESIGN_STYLES}
                    value={bulkStyle}
                    onChange={(e) => setBulkStyle(e.target.value as any)}
                  />
                  <div className="bg-zinc-950 p-3 rounded-md border border-zinc-800 flex justify-between items-center">
                    <span className="text-zinc-400 text-sm">Queue Size</span>
                    <span className="text-white font-medium bg-zinc-800 px-2 py-0.5 rounded text-sm">{bulkItems.length} designs</span>
                  </div>
                  <Button 
                    className="w-full h-12 text-base shadow-indigo-500/20 shadow-lg"
                    onClick={handleRunBulk}
                    isLoading={isProcessingBulk}
                    disabled={bulkItems.length === 0}
                  >
                    <Layers className="mr-2 h-5 w-5" /> Generate All Designs
                  </Button>
                </div>
              </div>
            </div>

            {/* Bulk Queue/Results */}
            <div className="lg:col-span-2 space-y-6">
              <h3 className="text-lg font-semibold text-white flex items-center justify-between">
                <span className="flex items-center gap-2"><LayoutGrid className="h-4 w-4 text-indigo-400"/> Production Queue</span>
                {bulkItems.length > 0 && (
                   <Button variant="ghost" className="h-8 text-xs text-red-400 hover:text-red-300" onClick={() => setBulkItems([])}>Clear Queue</Button>
                )}
              </h3>
              
              {bulkItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-96 text-zinc-500 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
                  <div className="bg-zinc-900/50 p-4 rounded-full mb-4">
                    <ImageIcon className="h-8 w-8 opacity-50" />
                  </div>
                  <p className="text-sm font-medium">Ready for production</p>
                  <p className="text-xs text-zinc-600 mt-1 max-w-xs text-center">Upload a reference design to create scalable variations, or start with a niche concept.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {bulkItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 p-3 rounded-lg hover:border-zinc-700 transition-colors group">
                      <div className="h-20 w-20 bg-zinc-950 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center border border-zinc-800 relative">
                        {item.result ? (
                          <img src={item.result.imageUrl} className="h-full w-full object-cover" />
                        ) : (
                           item.status === 'generating' ? <Loader2 className="animate-spin text-indigo-500 h-6 w-6" /> : 
                           item.status === 'failed' ? <AlertCircle className="text-red-500 h-6 w-6" /> :
                           <Ghost className="text-zinc-700 h-6 w-6" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate mb-1" title={item.concept}>{item.concept}</p>
                        <div className="flex items-center gap-2">
                           <span className="text-xs text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">{bulkStyle}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 px-2">
                        {item.status === 'idle' && <Badge>Pending</Badge>}
                        {item.status === 'generating' && <Badge variant="warning">Creating...</Badge>}
                        {item.status === 'completed' && <Badge variant="success">Done</Badge>}
                        {item.status === 'failed' && <span className="text-xs text-red-400 font-medium flex items-center gap-1"><AlertCircle className="h-3 w-3"/> Failed</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Little helper for the loader icon in this file
function Loader2(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export default App;