
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { UploadedFile, Language, Option } from './types';
import { CAMERA_ANGLES, LIGHTING_STYLES, LENS_PERSPECTIVES, TRANSLATIONS } from './constants';
import { generateScene } from './services/geminiService';
import ImageUploader from './components/ImageUploader';
import SelectInput from './components/SelectInput';
import { LanguageIcon } from './components/IconComponents';

const Header: React.FC<{ language: Language; setLanguage: (lang: Language) => void; t: (key: string) => string; }> = ({ language, setLanguage, t }) => {
    const toggleLanguage = () => {
        const newLang = language === Language.EN ? Language.AR : Language.EN;
        setLanguage(newLang);
    };

    return (
        <header className="text-center mb-10">
            <div className="flex justify-center items-center mb-2">
                <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
                    {t('headerTitle')}
                </h1>
                <button onClick={toggleLanguage} className="ms-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                    <LanguageIcon />
                </button>
            </div>
            <p className="text-slate-400">{t('headerSubtitle')}</p>
        </header>
    );
};

const Loader: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center text-center p-8">
        <svg className="animate-spin h-12 w-12 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="mt-4 text-lg font-semibold text-slate-300">{message}</p>
    </div>
);


const App: React.FC = () => {
    const [language, setLanguage] = useState<Language>(Language.EN);
    
    const [characters, setCharacters] = useState<UploadedFile[]>([]);
    const [locationImage, setLocationImage] = useState<UploadedFile[]>([]);
    const [styleImage, setStyleImage] = useState<UploadedFile[]>([]);
    const [sceneDescription, setSceneDescription] = useState('');
    const [cameraAngle, setCameraAngle] = useState(CAMERA_ANGLES[0].value);
    const [lightingStyle, setLightingStyle] = useState(LIGHTING_STYLES[0].value);
    const [lensPerspective, setLensPerspective] = useState(LENS_PERSPECTIVES[0].value);
    const [imageCount, setImageCount] = useState(1);
    const [combinedPrompt, setCombinedPrompt] = useState('');

    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const t = useCallback((key: string): string => {
        return TRANSLATIONS[key][language];
    }, [language]);
    
    useEffect(() => {
        document.documentElement.lang = language;
        document.documentElement.dir = language === Language.AR ? 'rtl' : 'ltr';
        document.body.className = `bg-slate-900 text-slate-200 ${language === Language.AR ? 'font-arabic' : 'font-sans'}`;
    }, [language]);
    
    const getLabel = useCallback((options: Option[], value: string) => {
        return options.find(opt => opt.value === value)?.label[language] || value;
    }, [language]);

    useEffect(() => {
        const buildPrompt = () => {
            let prompt = `Generate a cinematic, high-resolution image based on the following specifications.\n`;
            prompt += `**SCENE:** ${sceneDescription || 'Not specified'}\n`;
            
            if (characters.length > 0) {
                prompt += `**CHARACTERS:**\n${characters.map(c => `- ${c.name}: See attached character reference.`).join('\n')}\n`;
            }
            if (locationImage.length > 0) {
                prompt += `**LOCATION:** Use the attached '${locationImage[0].name}' image as a reference.\n`;
            }
            if (styleImage.length > 0) {
                prompt += `**STYLE:** Emulate the cinematic look from the attached '${styleImage[0].name}' style reference.\n`;
            }

            prompt += `**CAMERA & LENS:** ${getLabel(CAMERA_ANGLES, cameraAngle)}, using a ${getLabel(LENS_PERSPECTIVES, lensPerspective)} perspective.\n`;
            prompt += `**LIGHTING:** ${getLabel(LIGHTING_STYLES, lightingStyle)}.`;

            return prompt;
        };
        setCombinedPrompt(buildPrompt());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [characters, locationImage, styleImage, sceneDescription, cameraAngle, lightingStyle, lensPerspective, language, getLabel]);

    const handleFileNameChange = (setter: React.Dispatch<React.SetStateAction<UploadedFile[]>>) => (id: string, newName: string) => {
        setter(prev => prev.map(file => file.id === id ? { ...file, name: newName } : file));
    };

    const handleGenerateScene = async () => {
        setIsLoading(true);
        setError(null);
        setGeneratedImages([]);

        const allImages = [...characters, ...locationImage, ...styleImage];
        
        try {
            let results: string[] = [];
            for (let i = 0; i < imageCount; i++) {
                // A unique seed can help get different images if the API supports it
                const promptWithSeed = `${combinedPrompt}\n**Variation Seed:** ${Date.now() + i}`;
                const newImages = await generateScene(promptWithSeed, allImages);
                results.push(...newImages);
            }
            setGeneratedImages(results);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('errorOccurred'));
        } finally {
            setIsLoading(false);
        }
    };
    
    const isGenerateButtonDisabled = isLoading || characters.length === 0 || !sceneDescription;

    return (
        <div className="min-h-screen bg-slate-900 bg-gradient-to-br from-slate-900 to-gray-900 text-slate-300 p-4 sm:p-8">
            <div className="max-w-7xl mx-auto">
                <Header language={language} setLanguage={setLanguage} t={t} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: Inputs */}
                    <div className="space-y-8 p-6 bg-slate-800/50 rounded-2xl border border-slate-700 shadow-2xl">
                        <ImageUploader id="characters" label={t('uploadCharacters')} files={characters} onFilesChange={setCharacters} onFileNameChange={handleFileNameChange(setCharacters)} multiple nameInputPlaceholder={t('characterName')} buttonText={t('selectFiles')} />
                        <div>
                            <h3 className="text-lg font-semibold mb-2 text-emerald-300">{t('sceneDescription')}</h3>
                            <textarea value={sceneDescription} onChange={e => setSceneDescription(e.target.value)} placeholder={t('sceneDescriptionPlaceholder')} rows={4} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300"></textarea>
                        </div>
                        <ImageUploader id="location" label={t('uploadLocation')} files={locationImage} onFilesChange={setLocationImage} onFileNameChange={handleFileNameChange(setLocationImage)} nameInputPlaceholder={t('locationName')} buttonText={t('selectFile')} />
                        <ImageUploader id="style" label={t('uploadStyle')} files={styleImage} onFilesChange={setStyleImage} onFileNameChange={handleFileNameChange(setStyleImage)} nameInputPlaceholder={t('styleName')} buttonText={t('selectFile')} />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <SelectInput label={t('selectCamera')} value={cameraAngle} onChange={e => setCameraAngle(e.target.value)} options={CAMERA_ANGLES} language={language} />
                            <SelectInput label={t('selectLighting')} value={lightingStyle} onChange={e => setLightingStyle(e.target.value)} options={LIGHTING_STYLES} language={language} />
                            <SelectInput label={t('selectLens')} value={lensPerspective} onChange={e => setLensPerspective(e.target.value)} options={LENS_PERSPECTIVES} language={language} />
                            <div>
                                <h3 className="text-lg font-semibold mb-2 text-emerald-300">{t('imageCount')}</h3>
                                <input type="number" min="1" max="5" value={imageCount} onChange={e => setImageCount(parseInt(e.target.value, 10))} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300" />
                            </div>
                        </div>
                    </div>
                    
                    {/* Right Column: Prompt & Output */}
                    <div className="space-y-8">
                        <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700 shadow-2xl">
                            <h3 className="text-lg font-semibold mb-2 text-emerald-300">{t('combinedPrompt')}</h3>
                            <textarea value={combinedPrompt} onChange={e => setCombinedPrompt(e.target.value)} rows={10} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-400 font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300"></textarea>
                        </div>
                        
                        <button 
                            onClick={handleGenerateScene}
                            disabled={isGenerateButtonDisabled}
                            className={`w-full py-4 px-6 text-xl font-bold rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg ${isGenerateButtonDisabled ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-500 to-cyan-600 text-white hover:shadow-emerald-500/50 animate-pulse-glow'}`}
                        >
                            {isLoading ? t('generating') : t('generateScene')}
                        </button>
                        
                        <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700 shadow-2xl min-h-[300px]">
                            <h3 className="text-2xl font-bold mb-4 text-center text-emerald-300">{t('results')}</h3>
                            {isLoading && <Loader message={t('generating')} />}
                            {error && <p className="text-red-400 text-center">{error}</p>}
                            {!isLoading && !error && generatedImages.length === 0 && (
                                <p className="text-slate-500 text-center pt-10">{t('yourVisionAwaits')}</p>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {generatedImages.map((src, index) => (
                                    <img key={index} src={src} alt={`Generated Scene ${index + 1}`} className="w-full h-auto object-cover rounded-lg shadow-md animate-fade-in"/>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;
