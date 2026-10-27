import React from 'react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { Mic, MicOff, Volume2, VolumeX, X, HelpCircle, Shield, Sparkles } from 'lucide-react';
import { LanguageCode } from '../types/index.ts';

interface VoiceAssistantWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  assistantMessage: string;
  onStartListening: () => void;
  onStopListening: () => void;
  onSpeak: (text: string) => void;
  onStopSpeaking: () => void;
  onRunCommand: (cmd: string) => void;
  recognitionSupported: boolean;
}

export const VoiceAssistantWidget: React.FC<VoiceAssistantWidgetProps> = ({
  isOpen,
  onClose,
  isListening,
  isSpeaking,
  transcript,
  assistantMessage,
  onStartListening,
  onStopListening,
  onSpeak,
  onStopSpeaking,
  onRunCommand,
  recognitionSupported
}) => {
  const { language, setLanguage, languages, currentLanguageOption, t } = useLanguage();

  if (!isOpen) return null;

  const quickCommands = [
    { label: 'Show my salary', cmd: 'Show my salary', desc: 'Reads net pay & deductions' },
    { label: 'What is my shift today?', cmd: 'What is my shift today?', desc: 'Tells you your shift time' },
    { label: 'Read my latest payment status', cmd: 'Read my latest payment status', desc: 'Tells you if salary is credited' },
    { label: 'Show my requests', cmd: 'Show my requests', desc: 'Opens anonymous reports tracker' },
    { label: 'Site safety rules', cmd: 'safety', desc: 'Reads essential PPE protocols' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-blue-700 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-800 rounded-lg">
              <Mic className="w-5 h-5 text-blue-100" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                {t('voiceAssistant')}
              </h3>
              <p className="text-xs text-blue-200">
                Speaking in: <span className="font-semibold">{currentLanguageOption.nativeLabel}</span> ({currentLanguageOption.label})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white hover:bg-blue-800 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Language Quick Bar inside Voice Assistant */}
        <div className="flex items-center gap-1 px-6 py-2.5 bg-slate-50 border-b border-slate-200 overflow-x-auto text-xs">
          <span className="text-slate-500 font-medium shrink-0 mr-1">Language:</span>
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => setLanguage(l.code as LanguageCode)}
              className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                language === l.code
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {l.nativeLabel}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Main Voice Controls */}
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              {isListening && (
                <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-30" />
              )}
              <button
                onClick={isListening ? onStopListening : onStartListening}
                className={`relative flex items-center justify-center w-24 h-24 rounded-full transition-all shadow-lg ${
                  isListening
                    ? 'bg-red-600 text-white ring-8 ring-red-100 animate-pulse'
                    : 'bg-blue-700 hover:bg-blue-800 text-white'
                }`}
                title={isListening ? 'Stop listening' : 'Start listening'}
              >
                {isListening ? (
                  <MicOff className="w-10 h-10" />
                ) : (
                  <Mic className="w-10 h-10" />
                )}
              </button>
            </div>

            <div>
              <p className="text-sm font-bold text-slate-900">
                {isListening ? t('listening') : 'Tap the microphone to speak'}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Speak clearly in English, Tamil, Hindi, Telugu, or Kannada. No typing required.
              </p>
            </div>

            {/* Read Page Aloud speaker toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={isSpeaking ? onStopSpeaking : () => onSpeak(assistantMessage || 'Welcome to ConstructFlow site portal.')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                  isSpeaking
                    ? 'bg-amber-600 text-white border-amber-700'
                    : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-blue-700" />}
                <span>{isSpeaking ? 'Stop Audio Playback' : 'Replay Audio Response'}</span>
              </button>
            </div>
          </div>

          {/* Transcript / Feedback Area */}
          {(transcript || assistantMessage) && (
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-2">
              {transcript && (
                <div className="text-xs">
                  <span className="font-bold text-blue-900">You said:</span>{' '}
                  <span className="text-blue-800 italic">"{transcript}"</span>
                </div>
              )}
              {assistantMessage && (
                <div className="text-xs font-medium text-slate-800 leading-relaxed">
                  <span className="font-bold text-blue-900">Assistant:</span> {assistantMessage}
                </div>
              )}
            </div>
          )}

          {/* Fallback note if browser has no recognition */}
          {!recognitionSupported && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                {t('micUnavailable')} You can click any of the voice command buttons below to get immediate audio output.
              </div>
            </div>
          )}

          {/* Supported Voice Commands Quick Cards */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Sparkles className="w-3.5 h-3.5 text-blue-700" />
              <span>{t('voiceCommandsTitle')} (Click or Speak):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickCommands.map((q) => (
                <button
                  key={q.cmd}
                  onClick={() => onRunCommand(q.cmd)}
                  className="p-2.5 text-left bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 rounded-lg transition-colors group"
                >
                  <div className="text-xs font-semibold text-slate-900 group-hover:text-blue-700">
                    "{q.label}"
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {q.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Safety Privacy Assurance */}
          <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600">
            <Shield className="w-4 h-4 text-blue-700 shrink-0" />
            <span>
              Voice assistant never reads passwords or credentials aloud. Personal salary data is announced only when explicitly requested.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
};
