/**
 * Módulo de Síntese de Voz - Voz do Daniel
 * Arquitetura baseada em encapsulamento léxico (IIFE) para evitar poluição do escopo global.
 */
(() => {
    'use strict';

    // 1. Verificação de Suporte da API no Navegador (Fail Fast)
    // Usamos o operador 'in' para checar suporte à Web Speech API nativa.
    const isSpeechSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

    if (!isSpeechSupported) {
        alert('Seu navegador não possui suporte para síntese de voz nativa.');
        return;
    }

    // 2. Cache de Elementos do DOM
    // Centralizamos a captura dos nós e usamos IDs consistentes com o index.html.
    const textInput = document.getElementById('text-input');
    const voiceSelect = document.getElementById('voice-select');
    const playBtn = document.getElementById('play-btn');
    const downloadBtn = document.getElementById('download-btn');

    // Programação defensiva: validamos a existência dos elementos essenciais antes de continuar
    if (!textInput || !voiceSelect || !playBtn) {
        console.error('[Voz-do-Daniel] Elementos essenciais do DOM não foram encontrados.');
        return;
    }

    // 3. Estado da Aplicação (App State)
    // Mantemos uma referência imutável ao sintetizador do browser e uma lista interna de vozes.
    const synth = window.speechSynthesis;
    let availableVoices = [];

    /**
     * Popula dinamicamente o elemento <select> com as vozes disponíveis no dispositivo.
     * Utiliza métodos modernos de array (filter e forEach) e desestruturação de propriedades.
     */
    const populateVoiceList = () => {
        // synth.getVoices() recupera as vozes instaladas no SO/navegador
        availableVoices = synth.getVoices();

        // Limpa opções antigas preservando a primeira opção de placeholder
        voiceSelect.innerHTML = '<option value="">Selecionar Voz...</option>';

        // Otimização: criamos um DocumentFragment para manipular o DOM uma única vez (evita reflow/repaint repetidos)
        const fragment = document.createDocumentFragment();

        // Filtramos ou ordenamos se necessário. Aqui iteramos diretamente por cada voz disponível
        availableVoices.forEach((voice, index) => {
            const { name, lang, default: isDefault } = voice; // Desestruturação de objeto (ES6)

            const option = document.createElement('option');
            option.value = index;
            // Template Literals (ES6) para formatação limpa e legível
            option.textContent = `${name} (${lang}) ${isDefault ? '— [Padrão]' : ''}`;
            
            // Sugestão automática: prioriza vozes em português caso disponíveis
            if (lang.includes('pt-BR') || lang.includes('pt')) {
                option.setAttribute('data-preferred', 'true');
            }

            fragment.appendChild(option);
        });

        voiceSelect.appendChild(fragment);
    };

    // O evento 'voiceschanged' é disparado assincronamente pelo navegador quando as vozes estão carregadas
    populateVoiceList();
    if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = populateVoiceList;
    }

    /**
     * Alterna o estado visual e funcional do botão de reprodução.
     * @param {boolean} isPlaying - Indica se o áudio está em execução.
     */
    const togglePlaybackState = (isPlaying) => {
        playBtn.disabled = isPlaying;
        playBtn.textContent = isPlaying ? 'Reproduzindo...' : 'Ouvir';
    };

    /**
     * Executa a conversão do texto em áudio via Web Speech API.
     */
    const handleSpeak = () => {
        const textToSpeak = textInput.value.trim(); // Higienização: remove espaços vazios no início e fim

        // Validação de entrada (Early Return Pattern)
        if (!textToSpeak) {
            alert('Por favor, digite um texto para converter em áudio.');
            textInput.focus();
            return;
        }

        // Se já houver uma fala em andamento, interrompemos imediatamente antes de iniciar a nova
        if (synth.speaking) {
            synth.cancel();
        }

        // Instanciamos a elocução com o texto informado
        const utterance = new SpeechSynthesisUtterance(textToSpeak);

        // Se o usuário selecionou uma voz específica no <select>, associamos à elocução
        const selectedIndex = voiceSelect.value;
        if (selectedIndex !== '' && availableVoices[selectedIndex]) {
            utterance.voice = availableVoices[selectedIndex];
        }

        // Tratamento dos ciclos de vida assíncronos da elocução
        utterance.onstart = () => {
            togglePlaybackState(true);
        };

        utterance.onend = () => {
            togglePlaybackState(false);
        };

        utterance.onerror = (event) => {
            console.error('Erro durante a síntese de fala:', event.error);
            togglePlaybackState(false);
        };

        // Envia para o motor de áudio do navegador
        synth.speak(utterance);
    };

    // 4. Registro de Ouvintes de Eventos (Event Listeners)
    playBtn.addEventListener('click', handleSpeak);

    // Aviso informativo de arquitetura sobre o botão de download
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            // Nota de arquitetura: A Web Speech API do navegador gera áudio via hardware do SO e não
            // disponibiliza um stream nativo de exportação de MP3. Para download, normalmente usa-se
            // uma API backend (como Google Cloud TTS / ElevenLabs) ou captura via AudioContext.
            alert('O download de MP3 nativo requer integração com uma API de Text-to-Speech no servidor.');
        });
    }
})();
