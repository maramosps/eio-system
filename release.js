#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════
// E.I.O SYSTEM - RELEASE SCRIPT v2.0
// Uso: node release.js [patch|minor|major]
// Ex:  node release.js patch  (4.6.8 → 4.6.9)
//
// ATUALIZA TUDO:
// ✅ manifest.json
// ✅ background.js (heartbeat version)
// ✅ content.js (todas as referências de versão)
// ✅ dashboard-v462.js (fallback version)
// ✅ dashboard.html (textos de versão)
// ✅ global-connection.js (VERSION constant)
// ✅ version.json (para download dinâmico no dashboard)
// ✅ ZIP versionado + genérico
// ═══════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const archiver = require('archiver');

const bumpType = process.argv[2] || 'patch';
const ROOT = __dirname;

// ══════════════════════════════════════════════════════════════
// PATHS
// ══════════════════════════════════════════════════════════════
const FILES = {
    MANIFEST: path.join(ROOT, 'extension', 'manifest.json'),
    BACKGROUND: path.join(ROOT, 'extension', 'background.js'),
    CONTENT: path.join(ROOT, 'extension', 'content.js'),
    POPUP_JS: path.join(ROOT, 'extension', 'popup.js'),
    GLOBAL_CONN: path.join(ROOT, 'frontend', 'js', 'global-connection.js'),
    DASHBOARD_HTML: path.join(ROOT, 'frontend', 'dashboard.html'),
    DASHBOARD_JS: path.join(ROOT, 'frontend', 'dashboard-v462.js'),
    VERSION_JSON: path.join(ROOT, 'frontend', 'downloads', 'version.json'),
};
const OUTPUT_DIR = path.join(ROOT, 'frontend', 'downloads');

// ══════════════════════════════════════════════════════════════
// 1. LER VERSÃO ATUAL E CALCULAR NOVA
// ══════════════════════════════════════════════════════════════
const manifest = JSON.parse(fs.readFileSync(FILES.MANIFEST, 'utf8'));
const [major, minor, patch] = manifest.version.split('.').map(Number);

let newVersion;
if (bumpType === 'major') newVersion = `${major + 1}.0.0`;
else if (bumpType === 'minor') newVersion = `${major}.${minor + 1}.0`;
else newVersion = `${major}.${minor}.${patch + 1}`;

const oldVersion = manifest.version;

console.log('');
console.log('═'.repeat(60));
console.log(`  🚀 E.I.O Release: v${oldVersion} → v${newVersion} (${bumpType})`);
console.log('═'.repeat(60));
console.log('');

// ══════════════════════════════════════════════════════════════
// 2. ATUALIZAR TODOS OS ARQUIVOS
// ══════════════════════════════════════════════════════════════

// 2a. manifest.json
manifest.version = newVersion;
fs.writeFileSync(FILES.MANIFEST, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(`  ✅ manifest.json: ${oldVersion} → ${newVersion}`);

// 2b. background.js
if (fs.existsSync(FILES.BACKGROUND)) {
    let bg = fs.readFileSync(FILES.BACKGROUND, 'utf8');
    bg = bg.replace(/version: '[0-9]+\.[0-9]+\.[0-9]+'/g, `version: '${newVersion}'`);
    bg = bg.replace(/Motor v[0-9]+\.[0-9]+\.[0-9]+/g, `Motor v${newVersion}`);
    fs.writeFileSync(FILES.BACKGROUND, bg, 'utf8');
    console.log(`  ✅ background.js: version heartbeat → ${newVersion}`);
}

// 2c. content.js (MÚLTIPLAS REFERÊNCIAS)
if (fs.existsSync(FILES.CONTENT)) {
    let cs = fs.readFileSync(FILES.CONTENT, 'utf8');
    // Atualizar todas as referências de versão
    cs = cs.replace(/Content Script v[0-9]+\.[0-9]+\.[0-9]+/g, `Content Script v${newVersion}`);
    cs = cs.replace(/version: '[0-9]+\.[0-9]+\.[0-9]+'/g, `version: '${newVersion}'`);
    cs = cs.replace(/v4\.6\.5 - /g, `v${newVersion} - `); // Comentários de versão
    fs.writeFileSync(FILES.CONTENT, cs, 'utf8');
    console.log(`  ✅ content.js: todas as referências → v${newVersion}`);
}

// 2d. global-connection.js
if (fs.existsSync(FILES.GLOBAL_CONN)) {
    let gc = fs.readFileSync(FILES.GLOBAL_CONN, 'utf8');
    gc = gc.replace(
        /const VERSION = ['"][0-9]+\.[0-9]+\.[0-9]+['"]/,
        `const VERSION = '${newVersion}'`
    );
    fs.writeFileSync(FILES.GLOBAL_CONN, gc, 'utf8');
    console.log(`  ✅ global-connection.js: VERSION = '${newVersion}'`);
}

// 2e. dashboard.html
if (fs.existsSync(FILES.DASHBOARD_HTML)) {
    let html = fs.readFileSync(FILES.DASHBOARD_HTML, 'utf8');
    html = html
        .replace(/v[0-9]+\.[0-9]+\.[0-9]+\s*\(E\.I\.O System\)/g, `v${newVersion} (E.I.O System)`)
        .replace(/Baixar Extens[ãa]o v[0-9]+\.[0-9]+\.[0-9]+\s*\(\.zip\)/g, `Baixar Extensão v${newVersion} (.zip)`);
    fs.writeFileSync(FILES.DASHBOARD_HTML, html, 'utf8');
    console.log(`  ✅ dashboard.html: versão → v${newVersion}`);
}

// 2f. dashboard-v462.js (VERSÃO FALLBACK)
if (fs.existsSync(FILES.DASHBOARD_JS)) {
    let djs = fs.readFileSync(FILES.DASHBOARD_JS, 'utf8');
    djs = djs
        .replace(/[0-9]+\.[0-9]+\.[0-9]+\s*\(E\.I\.O System\)/g, `${newVersion} (E.I.O System)`)
        .replace(/Baixar Extens[ãa]o v[0-9]+\.[0-9]+\.[0-9]+\s*\(\.zip\)/g, `Baixar Extensão v${newVersion} (.zip)`)
        .replace(/let currentVersion = '[0-9]+\.[0-9]+\.[0-9]+'/g, `let currentVersion = '${newVersion}'`)
        .replace(/Versão [0-9]+\.[0-9]+\.[0-9]+/g, `Versão ${newVersion}`);
    fs.writeFileSync(FILES.DASHBOARD_JS, djs, 'utf8');
    console.log(`  ✅ dashboard-v462.js: fallback version → ${newVersion}`);
}

// ══════════════════════════════════════════════════════════════
// 3. VERIFICAR SINTAXE DE TODOS OS JS
// ══════════════════════════════════════════════════════════════
console.log('');
console.log('  🔍 Verificando sintaxe...');

const jsFiles = [FILES.BACKGROUND, FILES.CONTENT, FILES.POPUP_JS];
let syntaxOk = true;

for (const file of jsFiles) {
    if (!fs.existsSync(file)) continue;
    try {
        execSync(`node --check "${file}"`, { stdio: 'pipe' });
        console.log(`  ✅ ${path.basename(file)}: sintaxe OK`);
    } catch (e) {
        console.error(`  ❌ ${path.basename(file)}: ERRO DE SINTAXE!`);
        console.error(`     ${e.stderr?.toString().trim()}`);
        syntaxOk = false;
    }
}

if (!syntaxOk) {
    console.error('\n  ❌ ABORTADO: Corrija os erros de sintaxe antes de empacotar!\n');
    process.exit(1);
}

// ══════════════════════════════════════════════════════════════
// 4. GERAR version.json (para download dinâmico no dashboard)
// ══════════════════════════════════════════════════════════════
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const versionData = {
    version: newVersion,
    filename: `eio-extension-v${newVersion}.zip`,
    releaseDate: new Date().toISOString(),
    changelog: `Release v${newVersion} (${bumpType} bump from v${oldVersion})`
};

fs.writeFileSync(FILES.VERSION_JSON, JSON.stringify(versionData, null, 2) + '\n', 'utf8');
console.log(`  ✅ version.json: gerado com v${newVersion}`);

// ══════════════════════════════════════════════════════════════
// 5. EMPACOTAR ZIP
// ══════════════════════════════════════════════════════════════
const OUTPUT_FILE = path.join(OUTPUT_DIR, `eio-extension-v${newVersion}.zip`);
const OUTPUT_GENERIC = path.join(OUTPUT_DIR, 'eio-extension.zip');

const output = fs.createWriteStream(OUTPUT_FILE);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
    const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);

    // Copiar para nome genérico (fallback)
    fs.copyFileSync(OUTPUT_FILE, OUTPUT_GENERIC);

    console.log('');
    console.log('═'.repeat(60));
    console.log(`  ✅ EXTENSÃO E.I.O v${newVersion} PRONTA!`);
    console.log('═'.repeat(60));
    console.log(`  📦 Versionado: eio-extension-v${newVersion}.zip (${sizeInMB} MB)`);
    console.log(`  📦 Genérico:   eio-extension.zip (fallback)`);
    console.log(`  📄 Versão:     version.json → ${newVersion}`);
    console.log('');
    console.log('  ▶️  DEPLOY (execute um dos comandos):');
    console.log('');
    console.log('  # Deploy rápido (só Vercel):');
    console.log('  vercel --prod');
    console.log('');
    console.log('  # Deploy completo (Git + Vercel):');
    console.log(`  git add -A && git commit -m "release: v${newVersion}" && git push && vercel --prod`);
    console.log('');
    console.log('  # Chrome Extension:');
    console.log('  chrome://extensions → REMOVER extensão antiga → Carregar sem compactação');
    console.log('═'.repeat(60));
    console.log('');
});

archive.on('error', err => { throw err; });
archive.pipe(output);
archive.directory(path.join(ROOT, 'extension'), false);
archive.finalize();
