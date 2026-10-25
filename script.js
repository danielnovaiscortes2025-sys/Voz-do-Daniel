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
    const stopBtn = document.getElementById('stop-btn');
    const legendaTexto = document.getElementById('legenda-texto');

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
     * Alterna o estado visual e funcional dos botões de controle.
     * @param {boolean} isPlaying - Indica se o áudio está em execução.
     */
    const togglePlaybackState = (isPlaying) => {
        playBtn.disabled = isPlaying;
        playBtn.textContent = isPlaying ? 'Reproduzindo...' : 'Ouvir';
        if (stopBtn) {
            stopBtn.disabled = !isPlaying;
            stopBtn.style.opacity = isPlaying ? '1' : '0.6';
        }
    };

    // Inicializa o botão de parar desativado
    if (stopBtn) {
        stopBtn.disabled = true;
        stopBtn.style.opacity = '0.6';
    }

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
        if (synth.speaking || synth.pending) {
            synth.cancel();
        }

        // Instanciamos a elocução com o texto informado
        const utterance = new SpeechSynthesisUtterance(textToSpeak);

        // Se o usuário selecionou uma voz específica no <select>, associamos à elocução
        const selectedIndex = voiceSelect.value;
        if (selectedIndex !== '' && availableVoices[selectedIndex]) {
            utterance.voice = availableVoices[selectedIndex];
        }

        // Prepara a área de legendas dividindo por blocos de palavras para efeito karaoke
        const words = textToSpeak.split(/(\s+)/);
        if (legendaTexto) {
            legendaTexto.innerHTML = '';
            words.forEach((chunk, index) => {
                if (chunk.trim()) {
                    const span = document.createElement('span');
                    span.id = `legenda-word-${index}`;
                    span.textContent = chunk;
                    legendaTexto.appendChild(span);
                } else {
                    legendaTexto.appendChild(document.createTextNode(chunk));
                }
            });
        }

        // Evento que sincroniza a palavra falada com a legenda
        utterance.onboundary = (event) => {
            if (event.name === 'word' && legendaTexto) {
                const charIndex = event.charIndex;
                let accumulated = 0;
                words.forEach((chunk, index) => {
                    const span = document.getElementById(`legenda-word-${index}`);
                    if (span) {
                        const start = accumulated;
                        const end = accumulated + chunk.length;
                        if (charIndex >= start && charIndex < end) {
                            span.classList.add('palavra-ativa');
                        } else {
                            span.classList.remove('palavra-ativa');
                        }
                    }
                    accumulated += chunk.length;
                });
            }
        };

        // Tratamento dos ciclos de vida assíncronos da elocução
        utterance.onstart = () => {
            togglePlaybackState(true);
        };

        utterance.onend = () => {
            togglePlaybackState(false);
            if (legendaTexto) {
                const ativas = legendaTexto.querySelectorAll('.palavra-ativa');
                ativas.forEach((el) => el.classList.remove('palavra-ativa'));
            }
        };

        utterance.onerror = (event) => {
            console.error('Erro durante a síntese de fala:', event.error);
            togglePlaybackState(false);
        };

        // Envia para o motor de áudio do navegador
        synth.speak(utterance);
    };

    /**
     * Interrompe imediatamente a fala e restaura o estado dos botões.
     */
    const handleStop = () => {
        if (synth.speaking || synth.pending) {
            synth.cancel();
        }
        togglePlaybackState(false);
        if (legendaTexto) {
            const ativas = legendaTexto.querySelectorAll('.palavra-ativa');
            ativas.forEach((el) => el.classList.remove('palavra-ativa'));
        }
    };

    // 4. Registro de Ouvintes de Eventos (Event Listeners)
    playBtn.addEventListener('click', handleSpeak);

    if (stopBtn) {
        stopBtn.addEventListener('click', handleStop);
    }
})();
