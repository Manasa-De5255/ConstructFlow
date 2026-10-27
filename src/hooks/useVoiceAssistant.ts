import { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { LanguageCode } from '../types/index.ts';

// Standard Web Speech API typings
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export interface VoiceAssistantState {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  assistantMessage: string;
  recognitionSupported: boolean;
  synthesisSupported: boolean;
  voicesAvailable: boolean;
}

export function useVoiceAssistant(onNavigate?: (view: string) => void) {
  const { language, setLanguage, currentLanguageOption, t } = useLanguage();
  const { user, authFetch } = useAuth();

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [assistantMessage, setAssistantMessage] = useState('');
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const [synthesisSupported, setSynthesisSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const recognitionRef = useRef<any>(null);

  // Initialize Speech Capabilities
  useEffect(() => {
    const win = window as unknown as IWindow;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    setRecognitionSupported(!!SpeechRec);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSynthesisSupported(true);
      const updateVoices = () => {
        const available = window.speechSynthesis.getVoices();
        setVoices(available);
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Text-to-Speech function
  const speakText = useCallback(
    (textToSpeak: string) => {
      if (!('speechSynthesis' in window)) {
        setAssistantMessage('Speech synthesis not supported in this browser.');
        return;
      }

      window.speechSynthesis.cancel(); // Stop any active speech

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = currentLanguageOption.speechLocale;
      utterance.rate = 0.92; // Slightly measured rate for clear comprehension by workers
      utterance.pitch = 1.0;

      // Find matching language voice
      const targetLangPrefix = currentLanguageOption.speechLocale.split('-')[0].toLowerCase();
      const matchedVoice = voices.find(
        v => v.lang.toLowerCase().startsWith(targetLangPrefix) || v.lang.toLowerCase().includes(targetLangPrefix)
      );
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        setAssistantMessage(textToSpeak);
      };
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      utterance.onerror = (e) => {
        console.error('Speech synthesis error:', e);
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    },
    [currentLanguageOption, voices]
  );

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // Command Processor: Handles real data fetching for Worker
  const processVoiceCommand = useCallback(
    async (cmd: string) => {
      const lower = cmd.toLowerCase().trim();
      setTranscript(cmd);

      // 1. Language change commands
      if (lower.includes('tamil') || lower.includes('தமிழ்')) {
        setLanguage('ta');
        speakText('மொழி தமிழுக்கு மாற்றப்பட்டது.');
        return;
      }
      if (lower.includes('hindi') || lower.includes('हिंदी') || lower.includes('हिन्दी')) {
        setLanguage('hi');
        speakText('भाषा हिंदी में बदल दी गई है।');
        return;
      }
      if (lower.includes('telugu') || lower.includes('తెలుగు')) {
        setLanguage('te');
        speakText('భాష తెలుగులోకి మార్చబడింది.');
        return;
      }
      if (lower.includes('kannada') || lower.includes('ಕನ್ನಡ')) {
        setLanguage('kn');
        speakText('ಭಾಷೆಯನ್ನು ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಲಾಗಿದೆ.');
        return;
      }
      if (lower.includes('english')) {
        setLanguage('en');
        speakText('Language changed to English.');
        return;
      }

      // 2. "Show my salary" or "Salary"
      if (lower.includes('salary') || lower.includes('payslip') || lower.includes('சம்பளம்') || lower.includes('वेतन') || lower.includes('జీతం') || lower.includes('ವೇತನ')) {
        if (!user) {
          speakText('Please log in first to view your salary details.');
          return;
        }
        if (onNavigate) onNavigate('payslips');

        try {
          const res = await authFetch('/api/payslips');
          if (res.ok) {
            const data = await res.json();
            const slips = data.payslips || [];
            if (slips.length > 0) {
              const latest = slips[0];
              const msg = language === 'ta'
                ? `உங்கள் ${latest.monthName} மாத நிகர சம்பளம் ரூபாய் ${latest.netSalary}. கட்டண நிலை: ${latest.paymentStatus}.`
                : language === 'hi'
                ? `आपका ${latest.monthName} का शुद्ध वेतन ₹${latest.netSalary} है। स्थिति: ${latest.paymentStatus}।`
                : language === 'te'
                ? `మీ ${latest.monthName} నికర వేతనం ₹${latest.netSalary}. స్థితి: ${latest.paymentStatus}.`
                : language === 'kn'
                ? `ನಿಮ್ಮ ${latest.monthName} ತಿಂಗಳ ವೇತನ ₹${latest.netSalary}. ಸ್ಥಿತಿ: ${latest.paymentStatus}.`
                : `Your ${latest.monthName} net salary is ₹${latest.netSalary}. Status is ${latest.paymentStatus}.`;
              speakText(msg);
            } else {
              speakText('No payslip records found for your account yet.');
            }
          }
        } catch {
          speakText('Unable to fetch salary details at this moment.');
        }
        return;
      }

      // 3. "What is my shift today?" or "Shift"
      if (lower.includes('shift') || lower.includes('today') || lower.includes('ஷிப்ட்') || lower.includes('शिफ्ट') || lower.includes('షిఫ్ట్') || lower.includes('ಶಿಫ್ಟ್')) {
        if (!user) {
          speakText('Please log in to check your shift schedule.');
          return;
        }
        if (onNavigate) onNavigate('shifts');

        try {
          const todayStr = new Date().toISOString().split('T')[0];
          const res = await authFetch(`/api/shifts?date=${todayStr}`);
          if (res.ok) {
            const data = await res.json();
            const myShift = (data.shifts || []).find((s: any) => s.workerId === user.id);
            if (myShift) {
              const shiftName = myShift.shiftType === 'day' ? 'Day Shift (08:00 to 17:00)' : myShift.shiftType === 'night' ? 'Night Shift (20:00 to 05:00)' : 'Day Off';
              const msg = language === 'ta'
                ? `இன்று உங்களுக்கு ${shiftName}. மொத்தம் ${myShift.hours} மணிநேரம்.`
                : language === 'hi'
                ? `आज आपकी शिफ्ट है: ${shiftName}। कुल ${myShift.hours} घंटे।`
                : language === 'te'
                ? `ఈరోజు మీకు ${shiftName}. మొత్తం ${myShift.hours} గంటలు.`
                : language === 'kn'
                ? `ಇಂದು ನಿಮ್ಮ ಶಿಫ್ಟ್: ${shiftName}. ಒಟ್ಟು ${myShift.hours} ಗಂಟೆಗಳು.`
                : `Your shift today is ${shiftName}, for ${myShift.hours} hours.`;
              speakText(msg);
            } else {
              speakText(language === 'ta' ? 'இன்று உங்களுக்கு எந்த ஷிப்டும் இன்னும் ஒதுக்கப்படவில்லை.' : 'You have no assigned shift for today. Please check with your site supervisor.');
            }
          }
        } catch {
          speakText('Unable to check shift status right now.');
        }
        return;
      }

      // 4. "Read my latest payment status" or "Payment status"
      if (lower.includes('payment status') || lower.includes('payment') || lower.includes('நிலவரம்') || lower.includes('भुगतान स्थिति')) {
        if (!user) {
          speakText('Please log in first.');
          return;
        }
        try {
          const res = await authFetch('/api/payslips');
          if (res.ok) {
            const data = await res.json();
            const slips = data.payslips || [];
            if (slips.length > 0) {
              const latest = slips[0];
              const statusWord = latest.paymentStatus === 'credited' ? 'Credited to your bank' : latest.paymentStatus === 'pending' ? 'Pending approval' : 'Under Review';
              const msg = `Latest salary status for ${latest.monthName}: ${statusWord}.`;
              speakText(msg);
            }
          }
        } catch {
          speakText('Payment status unavailable.');
        }
        return;
      }

      // 5. "Show my requests" or "Requests" or "Report"
      if (lower.includes('request') || lower.includes('voice') || lower.includes('report') || lower.includes('புகார்') || lower.includes('शिकायत') || lower.includes('ఫిర్యాదు') || lower.includes('ದೂರು')) {
        if (onNavigate) onNavigate('worker-voice');
        const msg = language === 'ta'
          ? 'தொழிலாளர் குரல் புகார் பக்கம் திறக்கப்பட்டது. உங்கள் புகாரை 100% ரகசியமாக சமர்ப்பிக்கலாம்.'
          : language === 'hi'
          ? 'अनाम कार्यकर्ता आवाज पेज खुल गया है। आप अपनी समस्या बिना पहचान बताए दर्ज कर सकते हैं।'
          : language === 'te'
          ? 'అనామక కార్మిక స్వరం పేజీ తెరవబడింది.'
          : language === 'kn'
          ? 'ಅನಾಮಧೇಯ ಕಾರ್ಮಿಕ ಧ್ವನಿ ಪುಟ ತೆರೆಯಲಾಗಿದೆ.'
          : 'Opening Anonymous Worker Voice. You can submit or track confidential workplace reports here.';
        speakText(msg);
        return;
      }

      // 6. Safety instruction command
      if (lower.includes('safety') || lower.includes('help') || lower.includes('பாதுகாப்பு') || lower.includes('सुरक्षा') || lower.includes('రక్షణ') || lower.includes('ರಕ್ಷಣೆ')) {
        const safetyBrief = language === 'ta'
          ? 'முக்கிய பாதுகாப்பு விதி: பணியிடத்தில் எப்போதும் தலைக்கவசம், பாதுகாப்பு காலணிகள் மற்றும் உயரமான இடங்களில் பாதுகாப்பு பெல்ட் அணிய வேண்டும். அவசர உதவிக்கு பாதுகாப்பு அதிகாரியை அழைக்கவும்.'
          : language === 'hi'
          ? 'महत्वपूर्ण सुरक्षा निर्देश: साइट पर हमेशा हेलमेट, सुरक्षा जूते और ऊंचाई पर काम करते समय सेफ्टी हार्नेस अवश्य पहनें।'
          : language === 'te'
          ? 'ముఖ్యమైన రక్షణ సూచన: పని ప్రదేశంలో ఎల్లప్పుడూ హెల్మెట్ మరియు సేఫ్టీ బూట్లు ధరించండి.'
          : language === 'kn'
          ? 'ಪ್ರಮುಖ ಸುರಕ್ಷತಾ ಸೂಚನೆ: ಸೈಟ್‌ನಲ್ಲಿ ಯಾವಾಗಲೂ ಹೆಲ್ಮೆಟ್ ಮತ್ತು ಸುರಕ್ಷತಾ ಬೂಟುಗಳನ್ನು ಧರಿಸಿ.'
          : 'Important safety protocol: Always wear your hard hat, steel-toe boots, and high-visibility vest on site. Use safety harness when working above 2 meters.';
        speakText(safetyBrief);
        return;
      }

      // Default unrecognized command response
      const fallbackMsg = language === 'ta'
        ? `கேட்டது: "${cmd}". நீங்கள் "Show my salary", "What is my shift today?", அல்லது "Show my requests" என்று கூறலாம்.`
        : language === 'hi'
        ? `सुना: "${cmd}"। आप "Show my salary" या "What is my shift today?" बोल सकते हैं।`
        : `Command heard: "${cmd}". You can say "Show my salary", "What is my shift today?", or "Show my requests".`;
      speakText(fallbackMsg);
    },
    [language, setLanguage, user, authFetch, onNavigate, speakText]
  );

  // Start Speech Recognition
  const startListening = useCallback(() => {
    const win = window as unknown as IWindow;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRec) {
      setAssistantMessage('Microphone speech recognition is not supported in this browser. Please use text controls.');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRec();
      recognition.lang = currentLanguageOption.speechLocale;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setAssistantMessage('Listening... Speak your command clearly (e.g. "Show my salary" or "What is my shift today?")');
      };

      recognition.onresult = (event: any) => {
        const speechResult = event.results[0][0].transcript;
        setIsListening(false);
        processVoiceCommand(speechResult);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setAssistantMessage('Microphone access was denied. Please allow microphone permission in your browser.');
        } else if (event.error === 'no-speech') {
          setAssistantMessage('No speech was detected. Please tap the mic button and try again.');
        } else {
          setAssistantMessage(`Voice input: ${event.error}. You can also click the quick action buttons.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      setAssistantMessage('Could not activate microphone. Please check browser permissions.');
    }
  }, [currentLanguageOption, processVoiceCommand]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  // Helper to read the current dashboard view aloud
  const readDashboardSummary = useCallback((summaryText: string) => {
    speakText(summaryText);
  }, [speakText]);

  return {
    isListening,
    isSpeaking,
    transcript,
    assistantMessage,
    recognitionSupported,
    synthesisSupported,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
    readDashboardSummary,
    processVoiceCommand
  };
}
