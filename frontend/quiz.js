/**
 * E.I.O QUIZ GAMIFICADO - MOTOR PRINCIPAL
 * Versão 1.0 - Quiz Inteligente com Gamificação
 * 
 * Funcionalidades:
 * - Sistema de pontuação e tags
 * - Barra de progresso animada
 * - Timer de urgência
 * - Captura de leads integrada ao CRM
 * - Resultados personalizados
 * - Mensagens automáticas
 */

// ===== CONFIGURAÇÃO DO QUIZ (JSON EDITÁVEL) =====
const QUIZ_CONFIG = {
    // Configurações gerais
    settings: {
        quizTitle: "Diagnóstico de Crescimento 2026",
        companyName: "E.I.O System",
        timerEnabled: true,
        timerSeconds: 60,
        autoAdvance: true,
        autoAdvanceDelay: 300, // ms
        soundEnabled: false,
        whatsappNumber: "5521975312662",
        registerUrl: "register.html",
        consultantUrl: "https://wa.me/5521975312662"
    },

    // Perguntas do Quiz
    questions: [
        {
            id: 1,
            question: "Qual é o seu principal objetivo hoje no Instagram?",
            icon: "🎯",
            options: [
                { text: "Ganhar mais seguidores", icon: "👥", points: 1, tag: "Foco: Audiência" },
                { text: "Converter seguidores em vendas", icon: "💰", points: 3, tag: "Foco: Conversão" },
                { text: "Automatizar processos chatos", icon: "🤖", points: 2, tag: "Foco: Eficiência" }
            ]
        },
        {
            id: 2,
            question: "Quanto tempo você dedica por dia ao Instagram?",
            icon: "⏰",
            options: [
                { text: "Menos de 1 hora", icon: "⚡", points: 1, tag: "Tempo: Baixo" },
                { text: "De 2 a 4 horas", icon: "📅", points: 2, tag: "Tempo: Médio" },
                { text: "O dia inteiro!", icon: "🔥", points: 3, tag: "Tempo: Alto" }
            ]
        },
        {
            id: 3,
            question: "Qual sua maior dificuldade atual?",
            icon: "😰",
            options: [
                { text: "Não sei o que postar", icon: "📝", points: 1, tag: "Dor: Conteúdo" },
                { text: "Ninguém responde meus Directs", icon: "💬", points: 3, tag: "Dor: Engajamento" },
                { text: "Medo de bloqueios do Instagram", icon: "🛡️", points: 2, tag: "Dor: Segurança" }
            ]
        },
        {
            id: 4,
            question: "Você já usou alguma ferramenta de automação?",
            icon: "🔧",
            options: [
                { text: "Nunca, tenho medo", icon: "😨", points: 1, tag: "Experiência: Iniciante" },
                { text: "Sim, mas não gostei", icon: "👎", points: 2, tag: "Experiência: Frustrado" },
                { text: "Sim, e quero algo melhor", icon: "🚀", points: 3, tag: "Experiência: Avançado" }
            ]
        },
        {
            id: 5,
            question: "Qual seu faturamento mensal com Instagram?",
            icon: "💎",
            options: [
                { text: "Ainda não faturo", icon: "🌱", points: 1, tag: "Faturamento: Zero" },
                { text: "Até R$ 5.000", icon: "📈", points: 2, tag: "Faturamento: Iniciante" },
                { text: "Mais de R$ 10.000", icon: "🏆", points: 3, tag: "Faturamento: Escala" }
            ]
        }
    ],

    // Resultados baseados na pontuação
    results: {
        low: {
            minScore: 0,
            maxScore: 7,
            icon: "🌱",
            title: "Perfil Iniciante",
            description: "Você está começando sua jornada no Instagram! O E.I.O vai te ajudar a criar uma base sólida de audiência com total segurança, sem risco de bloqueios. É o momento perfeito para começar do jeito certo.",
            recommendation: "Comece com nosso plano gratuito de 5 dias para entender como a automação inteligente pode transformar seu perfil.",
            cta: "Iniciar Teste Grátis",
            ctaUrl: "register.html",
            color: "#4CAF50"
        },
        medium: {
            minScore: 8,
            maxScore: 11,
            icon: "🚀",
            title: "Perfil em Escala",
            description: "Você já tem presença no Instagram, mas falta braço para crescer mais! O E.I.O será seu assistente 24h, automatizando tarefas repetitivas e liberando seu tempo para o que realmente importa: fechar vendas.",
            recommendation: "O Plano Business é ideal para você. Automação ilimitada + CRM integrado para não perder nenhum lead.",
            cta: "Conhecer Plano Business",
            ctaUrl: "register.html",
            color: "#2196F3"
        },
        high: {
            minScore: 12,
            maxScore: 15,
            icon: "👑",
            title: "Perfil Autoridade",
            description: "Seu volume de trabalho é alto e você precisa de ferramentas profissionais! Com o E.I.O, você terá CRM Integrado, Agente de IA para conversas, e suporte prioritário para não perder nenhuma venda.",
            recommendation: "Recomendamos uma consultoria personalizada para implementar o E.I.O no seu fluxo de trabalho de alta performance.",
            cta: "Falar com Consultor Premium",
            ctaUrl: "https://wa.me/5521975312662",
            color: "#FF8F00"
        }
    },

    // Templates de mensagens
    messages: {
        whatsapp: {
            template: `Olá, {name}! 👋

Acabei de ver o seu resultado no nosso Diagnóstico de Crescimento. 🚀

O seu perfil foi identificado como: *{resultTitle}*

Isso significa que você tem um potencial enorme para escalar, mas identificamos que sua maior dor hoje é *{mainTag}*.

Para te ajudar a resolver isso agora, liberei um acesso especial de 05 dias gratuitos na nossa plataforma E.I.O.

Toque no link abaixo para ativar:
{registerUrl}

Vamos decolar esse Instagram? 💎`
        },
        email: {
            subject: "📊 Seu Diagnóstico de Crescimento Instagram está pronto!",
            template: `Olá, {name}!

Parabéns por completar o seu diagnóstico profissional! 🎉

Com base nas suas respostas, identificamos que você é um *{resultTitle}*.

Sua pontuação: {score} pontos

O que isso significa:
{resultDescription}

💡 Nossa recomendação:
{recommendation}

Suas principais características identificadas:
{tags}

O próximo passo é simples: acesse seu Dashboard E.I.O e veja como nossa IA pode iniciar conversas qualificadas por você, 24 horas por dia.

👉 Clique aqui para começar: {registerUrl}

Qualquer dúvida, estamos no WhatsApp: {whatsappNumber}

Atenciosamente,
Equipe E.I.O System`
        }
    }
};

// ===== ESTADO DO QUIZ =====
let quizState = {
    currentQuestion: 0,
    answers: [],
    totalScore: 0,
    tags: [],
    leadData: null,
    startTime: null,
    endTime: null,
    timerInterval: null,
    timeRemaining: QUIZ_CONFIG.settings.timerSeconds
};

// ===== ELEMENTOS DO DOM =====
const elements = {
    // Screens
    welcomeScreen: null,
    questionScreen: null,
    captureScreen: null,
    processingScreen: null,
    resultScreen: null,

    // Progress
    progressFill: null,
    currentStep: null,
    totalSteps: null,

    // Timer
    quizTimer: null,
    timerText: null,

    // Question
    questionNumber: null,
    questionText: null,
    optionsContainer: null,

    // Capture Form
    captureForm: null,
    leadName: null,
    leadWhatsApp: null,
    leadEmail: null,
    btnCapture: null,

    // Result
    resultBadge: null,
    profileIcon: null,
    profileTitle: null,
    scoreValue: null,
    resultDescription: null,
    tagsContainer: null,
    recommendationText: null,
    btnCta: null,
    ctaText: null,
    btnWhatsApp: null
};

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 E.I.O Quiz Engine iniciado');
    initializeElements();
    initializeEventListeners();
    updateProgress();

    if (QUIZ_CONFIG.settings.timerEnabled) {
        elements.quizTimer.style.display = 'flex';
    } else {
        elements.quizTimer.style.display = 'none';
    }
});

function initializeElements() {
    // Screens
    elements.welcomeScreen = document.getElementById('welcomeScreen');
    elements.questionScreen = document.getElementById('questionScreen');
    elements.captureScreen = document.getElementById('captureScreen');
    elements.processingScreen = document.getElementById('processingScreen');
    elements.resultScreen = document.getElementById('resultScreen');

    // Progress
    elements.progressFill = document.getElementById('progressFill');
    elements.currentStep = document.getElementById('currentStep');
    elements.totalSteps = document.getElementById('totalSteps');

    // Timer
    elements.quizTimer = document.getElementById('quizTimer');
    elements.timerText = document.getElementById('timerText');

    // Question
    elements.questionNumber = document.getElementById('questionNumber');
    elements.questionText = document.getElementById('questionText');
    elements.optionsContainer = document.getElementById('optionsContainer');

    // Capture Form
    elements.captureForm = document.getElementById('captureForm');
    elements.leadName = document.getElementById('leadName');
    elements.leadWhatsApp = document.getElementById('leadWhatsApp');
    elements.leadEmail = document.getElementById('leadEmail');
    elements.btnCapture = document.getElementById('btnCapture');

    // Result
    elements.resultBadge = document.getElementById('resultBadge');
    elements.profileIcon = document.getElementById('profileIcon');
    elements.profileTitle = document.getElementById('profileTitle');
    elements.scoreValue = document.getElementById('scoreValue');
    elements.resultDescription = document.getElementById('resultDescription');
    elements.tagsContainer = document.getElementById('tagsContainer');
    elements.recommendationText = document.getElementById('recommendationText');
    elements.btnCta = document.getElementById('btnCta');
    elements.ctaText = document.getElementById('ctaText');
    elements.btnWhatsApp = document.getElementById('btnWhatsApp');

    // Set total steps
    if (elements.totalSteps) {
        elements.totalSteps.textContent = QUIZ_CONFIG.questions.length;
    }
}

function initializeEventListeners() {
    // Start button
    const btnStart = document.getElementById('btnStart');
    if (btnStart) {
        btnStart.addEventListener('click', startQuiz);
    }

    // Capture form
    if (elements.captureForm) {
        elements.captureForm.addEventListener('submit', handleCapture);
    }

    // WhatsApp button
    if (elements.btnWhatsApp) {
        elements.btnWhatsApp.addEventListener('click', openWhatsAppConsultant);
    }

    // Share buttons
    const shareWhatsApp = document.getElementById('shareWhatsApp');
    const shareCopy = document.getElementById('shareCopy');

    if (shareWhatsApp) {
        shareWhatsApp.addEventListener('click', shareOnWhatsApp);
    }

    if (shareCopy) {
        shareCopy.addEventListener('click', copyResultLink);
    }

    // WhatsApp mask
    if (elements.leadWhatsApp) {
        elements.leadWhatsApp.addEventListener('input', formatWhatsApp);
    }
}

// ===== NAVEGAÇÃO ENTRE TELAS =====
function showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.quiz-screen').forEach(screen => {
        screen.classList.remove('active');
    });

    // Show target screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

// ===== INICIAR QUIZ =====
function startQuiz() {
    console.log('🚀 Quiz iniciado');
    quizState.startTime = new Date();
    quizState.currentQuestion = 0;

    showScreen('questionScreen');
    loadQuestion(0);
    startTimer();

    // Play click sound
    playClickSound();
}

// ===== TIMER =====
function startTimer() {
    if (!QUIZ_CONFIG.settings.timerEnabled) return;

    quizState.timeRemaining = QUIZ_CONFIG.settings.timerSeconds;
    updateTimerDisplay();

    quizState.timerInterval = setInterval(() => {
        quizState.timeRemaining--;
        updateTimerDisplay();

        if (quizState.timeRemaining <= 0) {
            clearInterval(quizState.timerInterval);
            // Timer acabou - ainda permite continuar
        }
    }, 1000);
}

function updateTimerDisplay() {
    if (!elements.timerText) return;

    const minutes = Math.floor(quizState.timeRemaining / 60);
    const seconds = quizState.timeRemaining % 60;
    elements.timerText.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    // Mudar cor quando tempo está acabando
    if (quizState.timeRemaining <= 10) {
        elements.quizTimer.style.animation = 'pulse 0.5s ease-in-out infinite';
    }
}

function stopTimer() {
    if (quizState.timerInterval) {
        clearInterval(quizState.timerInterval);
    }
}

// ===== CARREGAR PERGUNTA =====
function loadQuestion(index) {
    const question = QUIZ_CONFIG.questions[index];
    if (!question) return;

    // Update question number
    if (elements.questionNumber) {
        elements.questionNumber.textContent = `Pergunta ${index + 1}`;
    }

    // Update question text
    if (elements.questionText) {
        elements.questionText.textContent = question.question;
    }

    // Update current step
    if (elements.currentStep) {
        elements.currentStep.textContent = index + 1;
    }

    // Render options
    renderOptions(question.options);

    // Update progress
    updateProgress();
}

function renderOptions(options) {
    if (!elements.optionsContainer) return;

    elements.optionsContainer.innerHTML = '';

    options.forEach((option, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerHTML = `
            <span class="option-icon">${option.icon || '○'}</span>
            <span class="option-text">${option.text}</span>
            <span class="option-check"></span>
        `;

        btn.addEventListener('click', () => selectOption(index, option));

        // Add staggered animation
        btn.style.animation = `slideIn 0.3s ease forwards`;
        btn.style.animationDelay = `${index * 0.1}s`;
        btn.style.opacity = '0';

        elements.optionsContainer.appendChild(btn);
    });
}

// ===== SELECIONAR OPÇÃO =====
function selectOption(index, option) {
    console.log('✅ Opção selecionada:', option.text);

    // Visual feedback
    const buttons = elements.optionsContainer.querySelectorAll('.option-btn');
    buttons.forEach((btn, i) => {
        if (i === index) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });

    // Play click sound
    playClickSound();

    // Save answer
    quizState.answers.push({
        questionId: QUIZ_CONFIG.questions[quizState.currentQuestion].id,
        optionIndex: index,
        option: option
    });

    // Add points and tags
    quizState.totalScore += option.points;
    quizState.tags.push(option.tag);

    // Auto advance after delay
    if (QUIZ_CONFIG.settings.autoAdvance) {
        setTimeout(() => {
            nextQuestion();
        }, QUIZ_CONFIG.settings.autoAdvanceDelay);
    }
}

// ===== PRÓXIMA PERGUNTA =====
function nextQuestion() {
    quizState.currentQuestion++;

    if (quizState.currentQuestion >= QUIZ_CONFIG.questions.length) {
        // Quiz completed - show capture form
        stopTimer();
        showScreen('captureScreen');
    } else {
        loadQuestion(quizState.currentQuestion);
    }
}

// ===== ATUALIZAR PROGRESSO =====
function updateProgress() {
    const progress = ((quizState.currentQuestion + 1) / QUIZ_CONFIG.questions.length) * 100;

    if (elements.progressFill) {
        elements.progressFill.style.width = `${progress}%`;
    }
}

// ===== CAPTURA DE LEADS =====
async function handleCapture(e) {
    e.preventDefault();

    const name = elements.leadName.value.trim();
    const whatsapp = elements.leadWhatsApp.value.replace(/\D/g, '');
    const email = elements.leadEmail.value.trim();

    if (!name || !whatsapp || !email) {
        alert('Por favor, preencha todos os campos.');
        return;
    }

    // Save lead data
    quizState.leadData = { name, whatsapp, email };
    quizState.endTime = new Date();

    // Disable button
    elements.btnCapture.disabled = true;
    elements.btnCapture.innerHTML = '<span>Processando...</span>';

    // Show processing screen
    showScreen('processingScreen');

    // Simulate processing with steps
    await simulateProcessing();

    // Calculate result
    const result = calculateResult();

    // Save to CRM
    await saveLeadToCRM(result);

    // Show result
    showResult(result);
}

async function simulateProcessing() {
    const steps = ['step1', 'step2', 'step3'];
    const texts = [
        'Calculando pontuação...',
        'Identificando padrões...',
        'Gerando diagnóstico personalizado...'
    ];

    for (let i = 0; i < steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 800));

        const step = document.getElementById(steps[i]);
        if (step) {
            step.classList.add('active');
            step.querySelector('.step-check').textContent = '✓';
        }

        const processingText = document.getElementById('processingText');
        if (processingText) {
            processingText.textContent = texts[i];
        }
    }

    await new Promise(resolve => setTimeout(resolve, 500));
}

// ===== CALCULAR RESULTADO =====
function calculateResult() {
    const score = quizState.totalScore;
    let resultKey = 'low';

    if (score >= QUIZ_CONFIG.results.high.minScore) {
        resultKey = 'high';
    } else if (score >= QUIZ_CONFIG.results.medium.minScore) {
        resultKey = 'medium';
    }

    return {
        key: resultKey,
        ...QUIZ_CONFIG.results[resultKey],
        score: score,
        tags: quizState.tags,
        leadData: quizState.leadData
    };
}

// ===== MOSTRAR RESULTADO =====
function showResult(result) {
    console.log('🎯 Resultado:', result);

    showScreen('resultScreen');

    // Update result elements
    if (elements.profileIcon) {
        elements.profileIcon.textContent = result.icon;
    }

    if (elements.profileTitle) {
        elements.profileTitle.textContent = result.title;
    }

    if (elements.scoreValue) {
        // Animate score
        animateScore(result.score);
    }

    if (elements.resultDescription) {
        elements.resultDescription.innerHTML = `<p>${result.description}</p>`;
    }

    if (elements.recommendationText) {
        elements.recommendationText.textContent = result.recommendation;
    }

    // Render tags
    renderTags(result.tags);

    // Update CTA button
    if (elements.ctaText) {
        elements.ctaText.textContent = result.cta;
    }

    if (elements.btnCta) {
        elements.btnCta.addEventListener('click', () => {
            window.location.href = result.ctaUrl;
        });
    }

    // Create confetti
    createConfetti();
}

function animateScore(targetScore) {
    let current = 0;
    const duration = 1500;
    const step = targetScore / (duration / 50);

    const interval = setInterval(() => {
        current += step;
        if (current >= targetScore) {
            current = targetScore;
            clearInterval(interval);
        }
        elements.scoreValue.textContent = Math.round(current);
    }, 50);
}

function renderTags(tags) {
    if (!elements.tagsContainer) return;

    elements.tagsContainer.innerHTML = '';

    tags.forEach(tag => {
        const tagEl = document.createElement('span');
        tagEl.className = 'tag-item';
        tagEl.textContent = tag;
        elements.tagsContainer.appendChild(tagEl);
    });
}

function createConfetti() {
    const container = document.getElementById('confettiContainer');
    if (!container) return;

    const colors = ['#2196F3', '#00ACC1', '#6246EA', '#FF8F00', '#4CAF50'];

    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-piece';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = 100 + Math.random() * 20 + '%';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confetti.style.animationDuration = 2 + Math.random() * 2 + 's';
        container.appendChild(confetti);
    }
}

// ===== SALVAR NO CRM =====
async function saveLeadToCRM(result) {
    try {
        const API_URL = window.EIO_CONFIG?.API_BASE_URL || 'https://eio-system.vercel.app/api/v1';

        const leadData = {
            name: quizState.leadData.name,
            whatsapp: quizState.leadData.whatsapp,
            email: quizState.leadData.email,
            source: 'quiz',
            quizResult: {
                profile: result.title,
                score: result.score,
                tags: result.tags,
                completedAt: new Date().toISOString(),
                timeSpent: Math.round((quizState.endTime - quizState.startTime) / 1000)
            },
            tags: result.tags,
            status: 'new'
        };

        console.log('💾 Salvando lead no CRM:', leadData);

        // Try to save to API
        const response = await fetch(`${API_URL}/leads`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(leadData)
        });

        if (response.ok) {
            console.log('✅ Lead salvo no CRM com sucesso');
        }
    } catch (error) {
        console.log('⚠️ Não foi possível salvar no CRM:', error.message);
        // Continue anyway - save locally
        localStorage.setItem('quiz_lead_' + Date.now(), JSON.stringify({
            ...quizState.leadData,
            result: result
        }));
    }
}

// ===== FUNÇÕES DE COMPARTILHAMENTO =====
function openWhatsAppConsultant() {
    const result = calculateResult();
    const message = QUIZ_CONFIG.messages.whatsapp.template
        .replace('{name}', quizState.leadData?.name || 'Visitante')
        .replace('{resultTitle}', result.title)
        .replace('{mainTag}', quizState.tags[0] || 'crescimento')
        .replace('{registerUrl}', window.location.origin + '/register.html');

    const url = `https://wa.me/${QUIZ_CONFIG.settings.whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

function shareOnWhatsApp() {
    const result = calculateResult();
    const text = `🎯 Fiz o Diagnóstico de Crescimento do E.I.O e meu resultado foi: ${result.title}!\n\nFaça o seu também: ${window.location.href}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
}

function copyResultLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        const btn = document.getElementById('shareCopy');
        if (btn) {
            btn.innerHTML = '✓';
            setTimeout(() => {
                btn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>`;
            }, 2000);
        }
    });
}

// ===== UTILITÁRIOS =====
function formatWhatsApp(e) {
    let value = e.target.value.replace(/\D/g, '');

    if (value.length <= 11) {
        value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }

    e.target.value = value;
}

function playClickSound() {
    if (!QUIZ_CONFIG.settings.soundEnabled) return;

    try {
        const audio = document.getElementById('clickSound');
        if (audio) {
            audio.currentTime = 0;
            audio.play();
        }
    } catch (e) {
        // Ignore audio errors
    }
}

// ===== EXPORTAR PARA USO GLOBAL =====
window.EIOQuiz = {
    config: QUIZ_CONFIG,
    state: quizState,
    start: startQuiz,
    reset: () => {
        quizState = {
            currentQuestion: 0,
            answers: [],
            totalScore: 0,
            tags: [],
            leadData: null,
            startTime: null,
            endTime: null,
            timerInterval: null,
            timeRemaining: QUIZ_CONFIG.settings.timerSeconds
        };
        showScreen('welcomeScreen');
    }
};

console.log('✅ E.I.O Quiz Engine carregado');
