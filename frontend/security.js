/**
 * E.I.O SYSTEM - Security Protection Layer
 * Versão 1.0 - Proteção Anti-Cópia e Anti-Debug
 * 
 * Este arquivo implementa múltiplas camadas de proteção:
 * 1. Bloqueio de clique direito
 * 2. Bloqueio de seleção de texto
 * 3. Bloqueio de atalhos de teclado (Ctrl+C, Ctrl+U, F12, etc.)
 * 4. Detecção de DevTools
 * 5. Proteção contra inspeção de elementos
 */

(function () {
    'use strict';

    // ===== CONFIGURAÇÃO =====
    // 🚨 v4.4.24 DEBUG MODE - TODAS AS PROTEÇÕES DESABILITADAS TEMPORARIAMENTE
    const CONFIG = {
        enableRightClickBlock: false,      // ⚠️ DESABILITADO PARA DEBUG
        enableTextSelectionBlock: false,   // ⚠️ DESABILITADO PARA DEBUG
        enableKeyboardBlock: false,        // ⚠️ DESABILITADO PARA DEBUG (F12 liberado)
        enableDevToolsDetection: false,    // ⚠️ DESABILITADO PARA DEBUG
        enableConsoleWarning: false,       // ⚠️ DESABILITADO PARA DEBUG
        redirectOnDevTools: false,
        warningMessage: '⚠️ E.I.O System - MODO DEBUG v4.4.24'
    };

    console.log('%c🔓 [v4.4.24] MODO DEBUG ATIVO - F12 LIBERADO!', 'color: #39FF14; font-weight: bold; font-size: 16px;');

    // ===== 1. BLOQUEIO DE CLIQUE DIREITO =====
    if (CONFIG.enableRightClickBlock) {
        document.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            showWarning('Menu de contexto desabilitado');
            return false;
        });
    }

    // ===== 2. BLOQUEIO DE SELEÇÃO DE TEXTO =====
    if (CONFIG.enableTextSelectionBlock) {
        document.addEventListener('selectstart', function (e) {
            // Permitir seleção apenas em inputs e textareas
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return true;
            }
            e.preventDefault();
            return false;
        });

        // CSS para bloquear seleção
        const style = document.createElement('style');
        style.textContent = `
            body, html {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
            }
            input, textarea, [contenteditable="true"] {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
            }
        `;
        document.head.appendChild(style);
    }

    // ===== 3. BLOQUEIO DE ATALHOS DE TECLADO =====
    if (CONFIG.enableKeyboardBlock) {
        document.addEventListener('keydown', function (e) {
            // F12 - DevTools
            if (e.keyCode === 123) {
                e.preventDefault();
                showWarning('DevTools desabilitado');
                return false;
            }

            // Ctrl+Shift+I - DevTools
            if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
                e.preventDefault();
                showWarning('Inspeção desabilitada');
                return false;
            }

            // Ctrl+Shift+J - Console
            if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
                e.preventDefault();
                showWarning('Console desabilitado');
                return false;
            }

            // Ctrl+Shift+C - Inspect Element
            if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
                e.preventDefault();
                showWarning('Inspeção de elementos desabilitada');
                return false;
            }

            // Ctrl+U - View Source
            if (e.ctrlKey && e.keyCode === 85) {
                e.preventDefault();
                showWarning('Visualização de código-fonte desabilitada');
                return false;
            }

            // Ctrl+S - Save Page
            if (e.ctrlKey && e.keyCode === 83) {
                e.preventDefault();
                showWarning('Salvamento de página desabilitado');
                return false;
            }

            // Ctrl+A - Select All (fora de inputs)
            if (e.ctrlKey && e.keyCode === 65) {
                if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    showWarning('Seleção total desabilitada');
                    return false;
                }
            }

            // Ctrl+C - Copy (fora de inputs)
            if (e.ctrlKey && e.keyCode === 67) {
                if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    showWarning('Cópia desabilitada');
                    return false;
                }
            }

            // Ctrl+P - Print
            if (e.ctrlKey && e.keyCode === 80) {
                e.preventDefault();
                showWarning('Impressão desabilitada');
                return false;
            }
        });
    }

    // ===== 4. DETECÇÃO DE DEVTOOLS =====
    if (CONFIG.enableDevToolsDetection) {
        let devToolsOpen = false;

        // Método 1: Detectar pela diferença de tamanho
        const threshold = 160;
        const checkDevTools = function () {
            const widthThreshold = window.outerWidth - window.innerWidth > threshold;
            const heightThreshold = window.outerHeight - window.innerHeight > threshold;

            if (widthThreshold || heightThreshold) {
                if (!devToolsOpen) {
                    devToolsOpen = true;
                    onDevToolsOpen();
                }
            } else {
                devToolsOpen = false;
            }
        };

        // Método 2: Detectar via console.log
        const element = new Image();
        Object.defineProperty(element, 'id', {
            get: function () {
                devToolsOpen = true;
                onDevToolsOpen();
            }
        });

        // Verificar periodicamente
        setInterval(checkDevTools, 1000);

        // Verificar no resize
        window.addEventListener('resize', checkDevTools);
    }

    // ===== 5. AVISO NO CONSOLE =====
    if (CONFIG.enableConsoleWarning) {
        console.clear();
        console.log('%c⚠️ PARE!', 'color: red; font-size: 50px; font-weight: bold;');
        console.log('%cEste é um recurso do navegador destinado a desenvolvedores.', 'font-size: 18px;');
        console.log('%cSe alguém disse para você copiar e colar algo aqui, isso é uma fraude.', 'font-size: 18px; color: red;');
        console.log('%cE.I.O System - Todos os direitos reservados', 'font-size: 14px; color: #6246ea;');
    }

    // ===== FUNÇÕES AUXILIARES =====

    function onDevToolsOpen() {
        if (CONFIG.redirectOnDevTools) {
            window.location.href = '/';
        } else {
            console.clear();
            console.log('%c🚫 DevTools Detectado', 'color: red; font-size: 24px; font-weight: bold;');
            console.log('%cO uso de ferramentas de desenvolvedor é monitorado.', 'font-size: 14px;');
        }
    }

    function showWarning(message) {
        // Toast de aviso
        const existingToast = document.getElementById('security-warning-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.id = 'security-warning-toast';
        toast.innerHTML = `
            <div style="
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: linear-gradient(135deg, #ff4444, #cc0000);
                color: white;
                padding: 15px 25px;
                border-radius: 10px;
                box-shadow: 0 5px 20px rgba(255, 0, 0, 0.3);
                z-index: 999999;
                font-family: 'Segoe UI', sans-serif;
                font-size: 14px;
                animation: slideIn 0.3s ease;
            ">
                <strong>🔒 Proteção Ativa</strong><br>
                <span style="font-size: 12px; opacity: 0.9;">${message}</span>
            </div>
            <style>
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            </style>
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 2000);
    }

    // ===== PROTEÇÃO ADICIONAL: DESABILITAR ARRASTAR =====
    document.addEventListener('dragstart', function (e) {
        e.preventDefault();
        return false;
    });

    // ===== PROTEÇÃO ADICIONAL: DESABILITAR DROP =====
    document.addEventListener('drop', function (e) {
        e.preventDefault();
        return false;
    });

    // ===== ASSINATURA DE PROTEÇÃO =====
    console.log('%c🛡️ E.I.O Security Layer v1.0 Ativo', 'color: #6246ea; font-size: 12px;');

})();
