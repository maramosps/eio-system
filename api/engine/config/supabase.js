const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase reutilizando variáveis de ambiente ou fallbacks seguros
const EXCEPTION_LOGGING = true;

let supabase = null;

try {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://zupnyvnrmwoyqajecxmm.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1cG55dm5ybXdveXFhamVjeG1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTc0MTUsImV4cCI6MjA4MjQzMzQxNX0.j_kNf6oUjY65DXIdIVtDKOHlkktlZvzqHuo_SlEzUvY';

    if (supabaseUrl && supabaseKey) {
        supabase = createClient(supabaseUrl, supabaseKey);
    }
} catch (error) {
    if (EXCEPTION_LOGGING) console.error('[Engine] Erro ao inicializar Supabase:', error);
}

module.exports = supabase;
