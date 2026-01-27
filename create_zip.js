const fs = require('fs');
const archiver = require('archiver');
const path = require('path');

const outputPath = path.join(__dirname, 'eio-extension-v4.3-fixed.zip');
const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', function () {
    console.log('✅ Extensão empacotada com sucesso: eio-extension-v4.3-fixed.zip (' + archive.pointer() + ' bytes)');
});

archive.on('error', function (err) {
    throw err;
});

archive.pipe(output);

// Adicionar conteúdo da pasta extension
archive.directory('extension/', false);

archive.finalize();
