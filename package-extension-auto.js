// ═══════════════════════════════════════════════════════════
// E.I.O SYSTEM - EMPACOTADOR AUTOMÁTICO DE EXTENSÃO v4.4.4
// Cria arquivo .zip da extensão para download
// ═══════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const VERSION = '4.4.15';
const EXTENSION_DIR = path.join(__dirname, 'extension');
const OUTPUT_DIR = path.join(__dirname, 'frontend', 'downloads');
const OUTPUT_FILE = path.join(OUTPUT_DIR, `eio-extension-v${VERSION}.zip`);
const OUTPUT_GENERIC = path.join(OUTPUT_DIR, 'eio-extension.zip');

// Criar diretório de saída se não existir
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Criar arquivo ZIP
const output = fs.createWriteStream(OUTPUT_FILE);
const archive = archiver('zip', {
    zlib: { level: 9 } // Máxima compressão
});

output.on('close', () => {
    const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);

    // Copiar para arquivo genérico também
    fs.copyFileSync(OUTPUT_FILE, OUTPUT_GENERIC);

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  ✅ EXTENSÃO E.I.O v' + VERSION + ' EMPACOTADA COM SUCESSO!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log(`  📦 Arquivo: ${OUTPUT_FILE}`);
    console.log(`  📦 Cópia:   ${OUTPUT_GENERIC}`);
    console.log(`  📊 Tamanho: ${sizeInMB} MB`);
    console.log(`  📁 Total de bytes: ${archive.pointer()}`);
    console.log('');
    console.log('  🌐 URLs de download:');
    console.log(`     /downloads/eio-extension-v${VERSION}.zip`);
    console.log('     /downloads/eio-extension.zip');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
});

output.on('error', (err) => {
    console.error('❌ Erro ao criar arquivo:', err);
    process.exit(1);
});

archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
        console.warn('⚠️ Aviso:', err);
    } else {
        throw err;
    }
});

archive.on('error', (err) => {
    console.error('❌ Erro no archiver:', err);
    process.exit(1);
});

// Conectar o archiver ao output
archive.pipe(output);

console.log('');
console.log('📦 Empacotando extensão v' + VERSION + '...');
console.log('');

// Adicionar todos os arquivos da pasta extension
archive.directory(EXTENSION_DIR, false);

// Finalizar o arquivo
archive.finalize();
