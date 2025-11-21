
import React from 'react';
import { MapPin, ExternalLink, Search, Image as ImageIcon } from 'lucide-react';
import { ChatMessage as ChatMessageType, Sender } from '../types';

interface Props {
  message: ChatMessageType;
}

// Helper to get a relevant image based on the keyword from Gemini
const getLocationImage = (type: string) => {
    const map: Record<string, string> = {
        'library': 'https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&w=800&q=80', // Library
        'gym': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80', // Gym
        'pool': 'https://images.unsplash.com/photo-1576610616656-d3aa5d1f4534?auto=format&fit=crop&w=800&q=80', // Pool
        'pizza': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80', // Pizza
        'food': 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80', // Dining
        'store': 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=800&q=80', // Store
        'park': 'https://images.unsplash.com/photo-1496302662116-35cc4f36df92?auto=format&fit=crop&w=800&q=80', // The Columns/Park
        'coffee': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80',
        'outdoors': 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80' // Campus general
    };
    return map[type] || map['outdoors'];
};

export const ChatMessage: React.FC<Props> = ({ message }) => {
  const isUser = message.role === Sender.USER;

  if (isUser) {
    return (
      <div className="flex justify-end mb-6">
        <div className={`max-w-[85%] md:max-w-[60%] transform transition-all ${message.isCorrect ? 'scale-105' : 'scale-100'}`}>
          <div className={`font-hand text-2xl p-4 rounded-2xl rounded-tr-none shadow-sm border-2 
            ${message.step === 'concept' 
                ? 'bg-blue-50 border-blue-200 text-blue-900 rotate-1' // English inputs style
                : message.isCorrect 
                    ? 'bg-green-50 border-green-200 text-green-900 rotate-1' 
                    : 'bg-white border-stone-200 text-stone-600 rotate-0'
            }`}>
             {message.text}
          </div>
        </div>
      </div>
    );
  }

  // --- MODEL MESSAGE (Structured Turn) ---
  const content = message.structuredContent;
  
  // Fallback
  if (!content) {
      return (
          <div className="mb-8 bg-white/50 p-4 rounded-lg text-stone-500 italic">
              {message.text || "Loading..."}
          </div>
      );
  }

  // Get the primary map link
  const primaryMapLink = message.groundingChunks?.find(c => c.maps?.uri)?.maps?.uri;
  const locationImage = getLocationImage(content.locationType);

  return (
    <div className="flex justify-start mb-12 w-full">
      <div className="w-full max-w-3xl space-y-6">
        
        {/* 1. LOCATION HEADER & IMAGE */}
        {/* Only show the big header/image if it's the start of the turn (concept step) */}
        {message.step === 'concept' && (
            <>
                <div className="flex items-center gap-3 border-b border-stone-300 pb-2">
                    <div className="bg-amber-700 text-white p-2 rounded-full shadow-sm">
                        <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-ui text-xs font-bold text-stone-400 uppercase tracking-widest">Current Stop</h3>
                        <h2 className="font-serif text-3xl font-bold text-stone-800">{content.locationName}</h2>
                    </div>
                </div>

                {/* IMAGE CARD - Acts as the "Visual" */}
                <div className="bg-white p-2 pb-8 rounded-sm shadow-md transform rotate-[-1deg] border border-stone-200 max-w-md mx-auto md:mx-0">
                    <div className="relative h-48 overflow-hidden bg-stone-200 mb-2">
                        <img 
                            src={locationImage} 
                            alt={content.locationName} 
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" />
                            <span>Visual Ref</span>
                        </div>
                    </div>
                    <div className="font-hand text-center text-stone-600 text-xl">{content.locationName}</div>
                </div>

                {/* Map Link (Small) */}
                {primaryMapLink && (
                  <a
                    href={primaryMapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-amber-700 hover:text-amber-900 font-ui text-xs font-bold uppercase tracking-wider border border-amber-200 px-3 py-1 rounded hover:bg-amber-50 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Verify on Google Maps</span>
                  </a>
                )}

                {/* ENGLISH PROMPT */}
                <div className="bg-stone-100 border-l-4 border-blue-400 p-4 rounded-r-lg mt-4">
                     <p className="font-serif text-lg text-stone-800">
                        {content.englishQuestion}
                     </p>
                </div>
            </>
        )}

        {/* 2. SPANISH CHALLENGE (Only shown via GameInterface state, but if this message persists in history, we show the result context) */}
        {/* We actually don't need to render the 'grammar' part here for the AI message, 
            because the UI renders the grammar interaction area. 
            However, if we wanted to show the "Question" in the history AFTER it's answered, we could do it here.
            For now, we let the GameInterface "Options" area handle the active question.
        */}
        
      </div>
    </div>
  );
};
