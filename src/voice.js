// Ditado com a Web Speech API do navegador (Chrome no Android e no computador).
// O audio e tratado pelo servico de reconhecimento do navegador; o app so recebe o texto.
const Recognition = () => globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;

export const voiceSupported = () => Boolean(Recognition());

export function listen({lang = 'pt-PT', onText, onFinal, onError, onEnd} = {}) {
 const Ctor = Recognition();
 if (!Ctor) { onError?.('unsupported'); return () => {}; }
 const rec = new Ctor();
 rec.lang = lang;
 rec.interimResults = true;
 rec.continuous = false;
 rec.maxAlternatives = 1;
 let finalText = '';
 // Confianca mais baixa entre os troços finais: serve para avisar quando a leitura nao foi clara.
 let confidence = null;
 rec.onresult = event => {
  let interim = '';
  for (let i = event.resultIndex; i < event.results.length; i++) {
   const alternative = event.results[i][0];
   if (event.results[i].isFinal) {
    finalText += alternative.transcript;
    const score = Number(alternative.confidence);
    if (Number.isFinite(score) && score > 0) confidence = confidence === null ? score : Math.min(confidence, score);
   } else interim += alternative.transcript;
  }
  onText?.((finalText + interim).trim());
 };
 rec.onerror = event => onError?.(event.error || 'error');
 rec.onend = () => { if (finalText.trim()) onFinal?.(finalText.trim(), {confidence}); onEnd?.(); };
 try { rec.start(); } catch { onError?.('busy'); }
 return () => { try { rec.stop(); } catch {} };
}

export function voiceErrorMessage(code) {
 return ({
  'not-allowed': 'O microfone foi bloqueado. Autoriza o microfone para este site nas definições do navegador.',
  'service-not-allowed': 'O reconhecimento de voz não está disponível neste navegador.',
  'no-speech': 'Não ouvi nada. Toca outra vez e fala perto do telefone.',
  'audio-capture': 'Não encontrei microfone neste dispositivo.',
  'network': 'O reconhecimento de voz precisa de internet neste momento.',
  'unsupported': 'Este navegador não tem ditado. Usa o Chrome, ou escreve a frase.',
  'busy': 'O microfone já está a ouvir.',
 })[code] || 'Não foi possível ouvir. Tenta outra vez ou escreve a frase.';
}
