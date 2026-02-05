// ═══════════════════════════════════════════════════════════
// E.I.O SYSTEM - ROTAS DE DOWNLOAD DA EXTENSÃO
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { supabase } = require('../../../src/services/supabase');

// Middleware de autenticação
const { authenticate } = require('../middlewares/auth');

// ═══════════════════════════════════════════════════════════
// GET /api/v1/extension/download
// Baixar extensão Chrome (apenas usuários autenticados)
// ═══════════════════════════════════════════════════════════

router.get('/download', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const userEmail = req.user.email;

        // Verificar se usuário tem licença ativa
        const { data: subscription, error: subError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (subError || !subscription) {
            return res.status(403).json({
                success: false,
                message: 'Você precisa ter uma licença ativa para baixar a extensão'
            });
        }

        // Verificar se a licença está ativa ou em trial
        const now = new Date();
        const expiresAt = new Date(subscription.expires_at);

        if (subscription.status !== 'active' && now > expiresAt) {
            return res.status(403).json({
                success: false,
                message: 'Sua licença expirou. Renove para baixar a extensão.'
            });
        }

        // Caminho do arquivo ZIP
        const extensionPath = path.join(__dirname, '../../public/downloads/eio-extension.zip');

        // Verificar se o arquivo existe
        if (!fs.existsSync(extensionPath)) {
            console.error('❌ Arquivo da extensão não encontrado:', extensionPath);
            return res.status(404).json({
                success: false,
                message: 'Arquivo da extensão não encontrado. Contate o suporte.'
            });
        }

        // Registrar download (opcional - para estatísticas)
        try {
            const { error: logError } = await supabase
                .from('executions')
                .insert({
                    user_id: userId,
                    flow_id: null,
                    status: 'completed',
                    started_at: new Date().toISOString(),
                    finished_at: new Date().toISOString(),
                    logs: JSON.stringify([{
                        type: 'extension_download',
                        timestamp: new Date().toISOString(),
                        user_email: userEmail
                    }])
                });

            if (logError) {
                console.warn('⚠️ Erro ao registrar download:', logError);
            }
        } catch (logErr) {
            console.warn('⚠️ Erro ao registrar log:', logErr);
        }

        // Configurar headers para download
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="eio-extension.zip"');
        res.setHeader('Cache-Control', 'no-cache');

        // Enviar arquivo
        const fileStream = fs.createReadStream(extensionPath);
        fileStream.pipe(res);

        console.log(`✅ Extensão baixada por: ${userEmail}`);

    } catch (error) {
        console.error('❌ Erro ao processar download:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao processar download. Tente novamente.'
        });
    }
});

// ═══════════════════════════════════════════════════════════
// GET /api/v1/extension/info
// Informações sobre a extensão (versão, tamanho, etc)
// ═══════════════════════════════════════════════════════════

router.get('/info', authenticate, async (req, res) => {
    try {
        const extensionPath = path.join(__dirname, '../../public/downloads/eio-extension.zip');
        const manifestPath = path.join(__dirname, '../../extension/manifest.json');

        let fileSize = 0;
        let version = '1.0.0';

        // Obter tamanho do arquivo
        if (fs.existsSync(extensionPath)) {
            const stats = fs.statSync(extensionPath);
            fileSize = (stats.size / 1024 / 1024).toFixed(2); // MB
        }

        // Obter versão do manifest
        if (fs.existsSync(manifestPath)) {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            version = manifest.version || '1.0.0';
        }

        res.json({
            success: true,
            data: {
                version,
                size: `${fileSize} MB`,
                available: fs.existsSync(extensionPath),
                lastUpdate: fs.existsSync(extensionPath)
                    ? fs.statSync(extensionPath).mtime
                    : null
            }
        });

    } catch (error) {
        console.error('❌ Erro ao obter info da extensão:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter informações'
        });
    }
});

module.exports = router;
