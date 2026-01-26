/**
 * E.I.O Features Integration (Web Dashboard <-> Extension)
 * Reintegrates:
 * 1. Messages & Automation (Sequences, Quick Replies)
 * 2. Pro Tools (Security, Content Spy, Analytics)
 * 3. AI Agents (Interface)
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('[E.I.O Features] Initializing integration module...');

    // 1. UI: TAB NAVIGATION (Internal Tabs like Conversations/Sequences)
    setupInternalTabs('eio-messages-tab', 'data-mtab', 'data-mcontent');
    setupInternalTabs('eio-protools-tab', 'data-ptab', 'data-pcontent');

    // 2. UI: TOGGLES (Visual Switch)
    setupToggles();

    // 3. FEATURE: MESSAGES & AUTOMATION
    setupMessageFeatures();

    // 4. FEATURE: PRO TOOLS
    setupProTools();

    // 5. EXTENSION COMMUNICATION CHECK
    checkExtensionConnection();
});

// ═══════════════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════════════

function setupInternalTabs(tabClass, dataAttrTab, dataAttrContent) {
    const tabs = document.querySelectorAll(`.${tabClass}`);

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute(dataAttrTab);
            const parentSection = tab.closest('.eio-content-section');

            // Remove active from all tabs in this group
            parentSection.querySelectorAll(`.${tabClass}`).forEach(t => {
                t.style.background = 'rgba(255,255,255,0.05)';
                t.style.color = '#aaa';
                t.style.border = '1px solid rgba(255,255,255,0.1)';
            });

            // Activate clicked tab
            tab.style.background = '#6246ea';
            tab.style.color = '#fff';
            tab.style.border = 'none';

            // Hide all contents
            parentSection.querySelectorAll(`[${dataAttrContent}]`).forEach(c => {
                c.style.display = 'none';
            });

            // Show target content
            const content = parentSection.querySelector(`[${dataAttrContent}="${target}"]`);
            if (content) content.style.display = 'block';
        });
    });
}

function setupToggles() {
    const toggles = document.querySelectorAll('.eio-toggle');
    toggles.forEach(toggle => {
        // Avoid duplicate listeners
        if (toggle.getAttribute('data-listener') === 'true') return;
        toggle.setAttribute('data-listener', 'true');

        toggle.addEventListener('click', function () {
            const isActive = this.style.background === 'rgb(98, 70, 234)' ||
                this.style.background === '#6246ea' ||
                this.classList.contains('active'); // Some might use class

            const knob = this.querySelector('div');
            // Get original color from parent/context if needed, or default to theme
            // For now, simple toggle logic:

            if (isActive) {
                // Turn OFF
                this.style.background = '#333';
                knob.style.right = 'auto';
                knob.style.left = '2px';
            } else {
                // Turn ON
                // Restore color based on ID (specific colors for specific features)
                const id = this.id;
                let color = '#6246ea'; // Default Purple
                if (id === 'toggleSequences' || id === 'toggleFingerprint') color = '#4CAF50'; // Green
                if (id === 'toggleActionBlock') color = '#F44336'; // Red
                if (id === 'toggleStoryReply' || id === 'toggleMentions') color = '#E91E63'; // Pink

                this.style.background = color;
                knob.style.left = 'auto';
                knob.style.right = '2px';
            }
        });
    });
}

// ═══════════════════════════════════════════════════════════
// MESSAGES & AUTOMATION LOGIC
// ═══════════════════════════════════════════════════════════

function setupMessageFeatures() {
    // Save Sequences
    const btnSaveSeq = document.getElementById('btnSaveSequences');
    if (btnSaveSeq) {
        btnSaveSeq.addEventListener('click', () => {
            const steps = [];
            document.querySelectorAll('.sequence-message').forEach(el => {
                steps.push({
                    day: el.getAttribute('data-day'),
                    message: el.value
                });
            });

            const isActive = isToggleActive('toggleSequences');

            sendCommandToExtension('updateSettings', {
                dmSequences: {
                    active: isActive,
                    steps: steps
                }
            });

            showToast('✅ Sequências salvas e sincronizadas com a extensão!');
        });
    }

    // Save Quick Replies
    const btnSaveQR = document.getElementById('btnSaveQuickReplies');
    if (btnSaveQR) {
        btnSaveQR.addEventListener('click', () => {
            const templates = [];
            document.querySelectorAll('.quick-template').forEach(el => {
                templates.push(el.value);
            });

            sendCommandToExtension('updateSettings', {
                quickReplies: templates
            });

            showToast('✅ Templates salvos!');
        });
    }

    // Save Story Auto-Reply
    const btnSaveStory = document.getElementById('btnSaveStoryReply');
    if (btnSaveStory) {
        btnSaveStory.addEventListener('click', () => {
            const triggers = {};
            document.querySelectorAll('.story-response').forEach(el => {
                triggers[el.getAttribute('data-trigger')] = el.value;
            });

            const isActive = isToggleActive('toggleStoryReply');

            sendCommandToExtension('updateSettings', {
                storyAutoReply: {
                    active: isActive,
                    responses: triggers,
                    hashtags: document.getElementById('storyHashtags')?.value || '',
                    locations: document.getElementById('storyLocations')?.value || ''
                }
            });

            showToast('✅ Configurações de Stories salvas!');
        });
    }

    // Initial Load (Mock) - In production, this would request state from Extension
    setTimeout(() => {
        // Request current settings from Extension
        sendCommandToExtension('getSettings', {});
    }, 1000);
}

// ═══════════════════════════════════════════════════════════
// PRO TOOLS LOGIC
// ═══════════════════════════════════════════════════════════

function setupProTools() {
    // Toggle Handlers (Security) are handled by setupToggles() visual logic
    // We just need to listen for when they change to auto-save or save on button click

    // There isn't a global "Save" for Security tab in the HTML, usually auto-save
    // Let's add listeners to checkboxes to auto-save
    const securityCheckboxes = ['scrollRandomly', 'readBeforeLike', 'typoCorrection', 'mouseNatural'];

    securityCheckboxes.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                saveSecuritySettings();
            });
        }
    });

    const toggleFingerprint = document.getElementById('toggleFingerprint');
    if (toggleFingerprint) {
        // MutationObserver to detect style change (active/inactive) since it is a custom toggle
        const observer = new MutationObserver(() => {
            saveSecuritySettings();
        });
        observer.observe(toggleFingerprint, { attributes: true, attributeFilter: ['style'] });
    }
}

function saveSecuritySettings() {
    const settings = {
        fingerprint: isToggleActive('toggleFingerprint'),
        scrollRandomly: document.getElementById('scrollRandomly')?.checked || false,
        readBeforeLike: document.getElementById('readBeforeLike')?.checked || false,
        typoCorrection: document.getElementById('typoCorrection')?.checked || false,
        mouseNatural: document.getElementById('mouseNatural')?.checked || false,
        actionBlockDetector: isToggleActive('toggleActionBlock')
    };

    console.log('[E.I.O] Saving Security Settings:', settings);
    sendCommandToExtension('updateSettings', { security: settings });
    // showToast('🛡️ Segurança atualizada');
}

// ═══════════════════════════════════════════════════════════
// COMMUNICATION UTILS
// ═══════════════════════════════════════════════════════════

function isToggleActive(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return false;
    // Check background color (heuristic based on setupToggles)
    return el.style.background !== 'rgb(51, 51, 51)' && el.style.background !== '#333';
}

function sendCommandToExtension(command, payload) {
    // Method 1: window.postMessage (If extension content script is injected in dashboard)
    // The extension must have "https://eio-system.vercel.app/*" in matches

    window.postMessage({
        type: 'EIO_COMMAND',
        command: command,
        payload: payload,
        source: 'EIO_DASHBOARD'
    }, '*');

    console.log(`[E.I.O Bridge] Command sent: ${command}`);
}

function showToast(message) {
    // Simple toast notification
    const div = document.createElement('div');
    div.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; 
        background: #333; color: #fff; padding: 12px 24px; 
        border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        border-left: 4px solid #4CAF50; z-index: 9999;
        font-family: 'Inter', sans-serif; animation: slideIn 0.3s ease;
    `;
    div.textContent = message;
    document.body.appendChild(div);

    setTimeout(() => {
        div.style.opacity = '0';
        div.style.transform = 'translateY(10px)';
        div.style.transition = 'all 0.3s ease';
        setTimeout(() => div.remove(), 300);
    }, 3000);
}

function checkExtensionConnection() {
    // Try to ping extension
    // If installed, content script should reply.
    // NOTE: This requires the dashboard URL to be in content_scripts matches
}

// Style for animations
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes slideIn {
  from {transform: translateY(20px); opacity: 0;}
  to {transform: translateY(0); opacity: 1;}
}
`;
document.head.appendChild(styleSheet);
