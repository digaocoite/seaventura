
import React, { useEffect, useRef, useState } from 'react';
import { Send, Compass, Map as MapIcon, Loader2, X, Book, Trophy, ArrowRight, GraduationCap, Image as ImageIcon } from 'lucide-react';
import { initChat, sendMessage, generateBridgeResponse } from '../services/gemini';
import { ChatMessage as ChatMessageComponent } from './ChatMessage';
import { ChatMessage, GameState, Sender, GameTurnData } from '../types';
import { v4 as uuidv4 } from 'uuid';

const TOTAL_TURNS = 10;

export const GameInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [englishInput, setEnglishInput] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);
  
  const [gameState, setGameState] = useState<GameState>({ 
    status: 'intro', 
    location: null,
    currentTurn: 1,
    maxTurns: TOTAL_TURNS,
    activeChallenge: null,
    turnStep: 'concept' // Start with English concept
  });
  
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change or processing starts
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing, gameState.turnStep]);

  // Initialize Game
  useEffect(() => {
    const startQuest = async () => {
      setGameState(prev => ({ ...prev, status: 'loading' }));
      
      try {
        // We pass undefined to force Mizzou defaults in the service
        await initChat();
        const response = await sendMessage("START_GAME_MIZZOU_EDITION");
        
        const initialMessage: ChatMessage = {
          id: uuidv4(),
          role: Sender.MODEL,
          structuredContent: response.turnData,
          groundingChunks: response.groundingChunks,
          timestamp: Date.now(),
          step: 'concept'
        };
        setMessages([initialMessage]);
        setGameState(prev => ({ 
          ...prev, 
          status: 'playing',
          currentTurn: 1,
          activeChallenge: response.turnData,
          turnStep: 'concept'
        }));
      } catch (error) {
        console.error("Failed to start game:", error);
        setGameState(prev => ({ ...prev, status: 'error' }));
      }
    };

    startQuest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Step 1: Handle English Concept Input
  const handleEnglishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!englishInput.trim() || isProcessing || !gameState.activeChallenge) return;

    const userInput = englishInput;
    setEnglishInput('');
    setIsProcessing(true);

    // Add user's English answer to chat
    const userMsg: ChatMessage = {
        id: uuidv4(),
        role: Sender.USER,
        text: userInput,
        timestamp: Date.now(),
        step: 'concept'
    };
    setMessages(prev => [...prev, userMsg]);

    try {
        // BRIDGE: Call AI to acknowledge user input and pivot to the target concept
        // e.g. User says "Walk around", Target is "Take photos" -> AI says "Walking is nice, but here people famously take photos."
        const bridgeText = await generateBridgeResponse(userInput, gameState.activeChallenge.spanishConcept);

        // Update the active challenge with this new personalized context
        setGameState(prev => ({
            ...prev,
            activeChallenge: prev.activeChallenge ? {
                ...prev.activeChallenge,
                spanishConcept: bridgeText // Replace static concept with dynamic bridge
            } : null,
            turnStep: 'grammar'
        }));

    } catch (error) {
        console.error("Bridge generation failed", error);
        // Fallback: just proceed with original static concept
        setGameState(prev => ({ ...prev, turnStep: 'grammar' }));
    } finally {
        setIsProcessing(false);
    }
  };

  // Step 2: Handle Spanish Option Select
  const handleOptionSelect = async (selectedOption: string) => {
    if (isProcessing || !gameState.activeChallenge) return;

    const isCorrect = selectedOption === gameState.activeChallenge.correctAnswer;

    // Add User Message
    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: Sender.USER,
      text: selectedOption,
      isCorrect: isCorrect,
      timestamp: Date.now(),
      step: 'grammar'
    };
    setMessages(prev => [...prev, userMsg]);

    if (!isCorrect) {
      setFeedbackMessage({
        text: `Incorrect. ${gameState.activeChallenge.explanation} Try again!`,
        type: 'error'
      });
      return;
    }

    // SUCCESS
    setFeedbackMessage({
      text: "¡Correcto! Next stop...",
      type: 'success'
    });
    setIsProcessing(true);
    setGameState(prev => ({ ...prev, activeChallenge: null })); // Disable inputs

    // Wait for visual feedback
    await new Promise(r => setTimeout(r, 1500));
    setFeedbackMessage(null);

    // Check End Game
    if (gameState.currentTurn >= gameState.maxTurns) {
        setGameState(prev => ({ ...prev, status: 'finished' }));
        setIsProcessing(false);
        return;
    }

    // Load Next Turn
    try {
        setGameState(prev => ({ ...prev, currentTurn: prev.currentTurn + 1 }));
        const response = await sendMessage(`NEXT_TURN_${gameState.currentTurn + 1}`);
        
        const modelMsg: ChatMessage = {
          id: uuidv4(),
          role: Sender.MODEL,
          structuredContent: response.turnData,
          groundingChunks: response.groundingChunks,
          timestamp: Date.now(),
          step: 'concept'
        };
        
        setMessages(prev => [...prev, modelMsg]);
        setGameState(prev => ({ 
            ...prev, 
            activeChallenge: response.turnData,
            turnStep: 'concept' 
        }));
    } catch (error) {
        console.error("Error fetching next turn", error);
    } finally {
        setIsProcessing(false);
    }
  };

  // -- RENDER --

  if (gameState.status === 'loading' || gameState.status === 'intro') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#f0ebe0] p-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')]"></div>
        <div className="z-10 bg-white/50 backdrop-blur-sm p-10 rounded-xl border-2 border-stone-300 shadow-xl max-w-md w-full">
          <div className="mb-6 relative inline-block">
             <GraduationCap className="w-20 h-20 text-amber-700 animate-bounce" />
             <div className="absolute -bottom-2 -right-2">
               <MapIcon className="w-8 h-8 text-stone-800" />
             </div>
          </div>
          <h1 className="text-4xl font-serif font-bold text-stone-800 mb-3">Aventura Mizzou</h1>
          <p className="text-stone-600 font-hand text-xl mb-8">Exploring campus mysteries...</p>
          <div className="flex justify-center items-center gap-3 text-amber-800 font-ui font-bold text-sm uppercase tracking-widest">
            <Loader2 className="animate-spin w-4 h-4" />
            Walking to The Columns...
          </div>
        </div>
      </div>
    );
  }

  if (gameState.status === 'finished') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#f0ebe0] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] opacity-20"></div>
        <div className="z-10 text-center p-8 bg-white shadow-2xl rounded-2xl border-4 border-amber-600 max-w-lg mx-4 animate-in zoom-in duration-500">
          <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-6 drop-shadow-lg" />
          <h1 className="text-5xl font-serif font-bold text-stone-900 mb-4">Mizzou Master!</h1>
          <p className="font-hand text-2xl text-stone-600 mb-8">You've graduated from the Se Impersonal Quest.</p>
          <button onClick={() => window.location.reload()} className="px-8 py-4 bg-amber-700 text-white rounded-full shadow-xl font-ui font-bold text-lg hover:bg-amber-800 transform hover:scale-105 transition-all">
            Start New Semester
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-[#f0ebe0] overflow-hidden font-serif">
      
      {/* SIDEBAR */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-80 bg-[#3d3832] text-[#e6e2d6] transform transition-transform duration-300 shadow-2xl
        ${showCheatSheet ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:w-72 flex flex-col border-r border-[#2a2622]
      `}>
        <div className="p-4 border-b border-[#554e45] flex justify-between items-center bg-[#2c2824]">
          <div className="flex items-center gap-2">
            <Book className="w-5 h-5 text-amber-500" />
            <h2 className="font-ui font-bold text-lg tracking-wide">Grammar Guide</h2>
          </div>
          <button onClick={() => setShowCheatSheet(false)} className="md:hidden p-1 hover:bg-white/10 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <section>
            <h3 className="text-amber-500 font-ui font-bold text-sm uppercase mb-2 flex items-center gap-2">
                <span>🛑</span> Se Impersonal
            </h3>
            <div className="bg-[#4a443e] p-3 rounded text-sm space-y-3">
               <p className="italic text-stone-300 text-xs">Used for campus signs, rules, and general statements.</p>
               <div className="border-l-2 border-amber-500 pl-2">
                 <div className="text-amber-100 font-bold">Se + Singular Verb</div>
                 <div className="text-stone-400 text-xs">Singular object.</div>
                 <div className="font-mono text-xs mt-1 text-green-300">"Se necesita estudiante"</div>
               </div>
               <div className="border-l-2 border-amber-500 pl-2">
                 <div className="text-amber-100 font-bold">Se + Plural Verb</div>
                 <div className="text-stone-400 text-xs">Plural object.</div>
                 <div className="font-mono text-xs mt-1 text-green-300">"Se venden libros"</div>
               </div>
            </div>
          </section>
          <section>
             <h3 className="text-amber-500 font-ui font-bold text-sm uppercase mb-2 flex items-center gap-2">
                <span>💥</span> Se Accidental
             </h3>
             <div className="bg-[#4a443e] p-3 rounded text-sm space-y-3">
                <p className="italic text-stone-300 text-xs">Used for accidents (dropping keys, losing ID).</p>
                <div className="text-stone-300 text-xs mb-1">Formula:</div>
                <div className="bg-black/20 p-2 rounded font-mono text-xs text-center text-amber-200">
                    Se + (me/te/le) + Verb
                </div>
                <ul className="space-y-2 mt-2">
                    <li className="text-xs">
                        <span className="text-amber-100 font-bold">Se me...</span> 
                        <span className="text-stone-400"> (To me)</span>
                        <div className="text-[10px]">"Se me olvidó la tarea"</div>
                    </li>
                    <li className="text-xs">
                        <span className="text-amber-100 font-bold">Se le...</span> 
                        <span className="text-stone-400"> (To him/her)</span>
                        <div className="text-[10px]">"Se le cayó el café"</div>
                    </li>
                </ul>
             </div>
          </section>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col relative">
        
        {/* HEADER */}
        <div className="bg-[#f0ebe0] border-b border-[#d6cebf] z-20">
            <div className="md:hidden flex items-center justify-between p-3">
                <h1 className="font-serif font-bold text-lg text-stone-800">Mizzou Quest</h1>
                <button onClick={() => setShowCheatSheet(true)} className="p-2 bg-white border border-stone-300 rounded text-stone-600">
                    <Book className="w-5 h-5" />
                </button>
            </div>
            <div className="px-4 md:px-8 py-3 bg-[#e6e2d6] flex items-center gap-4">
                <span className="font-ui font-bold text-xs text-stone-500 uppercase tracking-wider whitespace-nowrap">Campus Tour</span>
                <div className="flex-1 h-3 bg-white rounded-full border border-stone-300 overflow-hidden relative">
                    <div 
                        className="h-full bg-amber-600 transition-all duration-700 ease-out rounded-full" 
                        style={{ width: `${((gameState.currentTurn - 1) / TOTAL_TURNS) * 100}%` }}
                    ></div>
                </div>
                <div className="font-hand text-stone-800 font-bold whitespace-nowrap text-lg">
                    Stop {gameState.currentTurn} / {gameState.maxTurns}
                </div>
            </div>
        </div>

        {/* CHAT AREA */}
        {/* Increased padding bottom to accommodate taller interactive panels */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth bg-[#f0ebe0] relative pb-96">
             <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] pointer-events-none"></div>
          <div className="max-w-3xl mx-auto relative z-10">
            {messages.map((msg, idx) => (
               <ChatMessageComponent key={msg.id} message={msg} />
            ))}
            
            {isProcessing && (
               <div className="flex justify-start w-full mb-8">
                 <div className="bg-white/80 border border-stone-200 px-6 py-4 flex items-center gap-3 rounded-xl shadow-sm">
                   <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                   <span className="font-hand text-xl text-stone-600">Thinking...</span>
                 </div>
               </div>
            )}
            
            {/* Success Feedback displayed in chat stream (when panel closes) */}
            {feedbackMessage && feedbackMessage.type === 'success' && (
                <div className="mb-8 p-4 rounded-xl border-2 flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 bg-green-50 border-green-200 text-green-800">
                    <CheckCircleIcon />
                    <span className="font-hand text-xl font-bold">{feedbackMessage.text}</span>
                </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* INTERACTIVE AREA */}
        {gameState.activeChallenge && !isProcessing && (
            <div className="absolute bottom-0 left-0 right-0 bg-[#e6e2d6] border-t border-[#d6cebf] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-20 p-4 md:p-6 animate-in slide-in-from-bottom-full duration-500">
                <div className="max-w-3xl mx-auto">
                    
                    {/* ERROR FEEDBACK (Visible inside the panel) */}
                    {feedbackMessage && feedbackMessage.type === 'error' && (
                        <div className="mb-4 p-3 rounded-lg flex items-center gap-3 bg-red-100 text-red-900 border border-red-300 animate-shake">
                            <XCircleIcon />
                            <span className="font-hand font-bold">{feedbackMessage.text}</span>
                        </div>
                    )}

                    {/* PHASE 1: English Concept Input */}
                    {gameState.turnStep === 'concept' && (
                        <form onSubmit={handleEnglishSubmit} className="flex flex-col gap-3">
                            <div className="mb-1 text-center">
                                <span className="bg-stone-700 text-white text-xs font-ui font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                    Phase 1: The Concept
                                </span>
                            </div>
                            <p className="text-center font-hand text-xl text-stone-800 font-bold">
                                {gameState.activeChallenge.englishQuestion}
                            </p>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={englishInput}
                                    onChange={(e) => setEnglishInput(e.target.value)}
                                    placeholder="Type your answer in English..."
                                    className="w-full p-4 pr-12 rounded-xl border-2 border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none font-hand text-2xl text-stone-800 placeholder:text-stone-400 bg-white"
                                    autoFocus
                                />
                                <button 
                                    type="submit"
                                    disabled={!englishInput.trim()}
                                    className="absolute right-2 top-2 bottom-2 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 text-white p-3 rounded-lg transition-colors"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </form>
                    )}

                    {/* PHASE 2: Spanish Grammar Options */}
                    {gameState.turnStep === 'grammar' && (
                         <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="mb-3 text-center">
                                <span className="bg-amber-700 text-white text-xs font-ui font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                    Phase 2: Spanish Grammar
                                </span>
                            </div>
                            
                            <div className="text-center mb-6">
                                <p className="font-hand text-stone-600 text-lg mb-3">
                                    {gameState.activeChallenge.spanishConcept}
                                </p>
                                <div className="bg-white p-4 rounded-xl border-2 border-dashed border-stone-400 shadow-sm inline-block min-w-[300px]">
                                     <h3 className="font-serif text-2xl text-stone-800 font-bold leading-relaxed">
                                        {gameState.activeChallenge.question}
                                     </h3>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {gameState.activeChallenge.options.map((option, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleOptionSelect(option)}
                                        className="relative overflow-hidden group bg-white border-2 border-stone-300 hover:border-amber-600 hover:bg-amber-50 rounded-xl p-4 transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
                                    >
                                        <span className="relative z-10 font-hand text-2xl font-bold text-stone-800 group-hover:text-amber-800">
                                            {option}
                                        </span>
                                        <div className="absolute inset-0 bg-amber-100 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

const CheckCircleIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const XCircleIcon = () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
