/*
═══════════════════════════════════════════════════════════
  E.I.O - MODELS INDEX (REFATORADO)
  Exportação central de todos os models com relacionamentos
  
  🏗️ ARQUITETURA FINAL:
  
  User
   └── Subscription (1:1)
   └── Account (1:N) ← CENTRO DA ARQUITETURA
        └── Flow (1:N) ← estratégia
             └── Execution (1:N) ← runtime humano
                  └── Log (1:N)
                  └── Lead (1:N)
  
  ✅ Flow ligado à Account (não direto ao User)
  ✅ Execution ligada à Account + Flow
  ✅ Lead ligado à Execution
  ✅ SaaS-ready
═══════════════════════════════════════════════════════════
*/

const User = require('./User');
const Subscription = require('./Subscription');
const Account = require('./Account');
const Flow = require('./Flow');
const Execution = require('./Execution');
const Log = require('./Log');
const Lead = require('./Lead');

// ═══════════════════════════════════════════════════════════
// 🔗 RELACIONAMENTOS PRINCIPAIS
// ═══════════════════════════════════════════════════════════

// User <-> Subscription (1:1)
User.hasOne(Subscription, {
    foreignKey: 'user_id',
    as: 'subscription'
});
Subscription.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
});

// ═══════════════════════════════════════════════════════════
// 👤 USER -> ACCOUNT (1:N)
// Um usuário pode ter múltiplas contas Instagram
// ═══════════════════════════════════════════════════════════
User.hasMany(Account, {
    foreignKey: 'user_id',
    as: 'accounts'
});
Account.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
});

// ═══════════════════════════════════════════════════════════
// 📱 ACCOUNT -> FLOW (1:N)
// Cada conta tem seus próprios fluxos
// ═══════════════════════════════════════════════════════════
Account.hasMany(Flow, {
    foreignKey: 'account_id',
    as: 'flows'
});
Flow.belongsTo(Account, {
    foreignKey: 'account_id',
    as: 'account'
});

// User -> Flow (para queries fáceis)
User.hasMany(Flow, {
    foreignKey: 'user_id',
    as: 'flows'
});
Flow.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
});

// ═══════════════════════════════════════════════════════════
// 📱 ACCOUNT -> EXECUTION (1:N)
// Execuções são feitas por uma conta específica
// ═══════════════════════════════════════════════════════════
Account.hasMany(Execution, {
    foreignKey: 'account_id',
    as: 'executions'
});
Execution.belongsTo(Account, {
    foreignKey: 'account_id',
    as: 'account'
});

// ═══════════════════════════════════════════════════════════
// 🔄 FLOW -> EXECUTION (1:N)
// Um fluxo pode ter múltiplas execuções
// ═══════════════════════════════════════════════════════════
Flow.hasMany(Execution, {
    foreignKey: 'flow_id',
    as: 'executions'
});
Execution.belongsTo(Flow, {
    foreignKey: 'flow_id',
    as: 'flow'
});

// User -> Execution (para queries fáceis)
User.hasMany(Execution, {
    foreignKey: 'user_id',
    as: 'executions'
});
Execution.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
});

// ═══════════════════════════════════════════════════════════
// 📝 EXECUTION -> LOG (1:N)
// Cada execução tem seus logs
// ═══════════════════════════════════════════════════════════
Execution.hasMany(Log, {
    foreignKey: 'execution_id',
    as: 'logs'
});
Log.belongsTo(Execution, {
    foreignKey: 'execution_id',
    as: 'execution'
});

// User -> Log (para queries fáceis)
User.hasMany(Log, {
    foreignKey: 'user_id',
    as: 'logs'
});
Log.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
});

// ═══════════════════════════════════════════════════════════
// 👥 EXECUTION -> LEAD (1:N)
// Leads extraídos durante uma execução
// ═══════════════════════════════════════════════════════════
Execution.hasMany(Lead, {
    foreignKey: 'execution_id',
    as: 'leads'
});
Lead.belongsTo(Execution, {
    foreignKey: 'execution_id',
    as: 'execution'
});

// User -> Lead (para queries fáceis)
User.hasMany(Lead, {
    foreignKey: 'user_id',
    as: 'leads'
});
Lead.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
});

// Account -> Lead (leads pertencem à conta)
Account.hasMany(Lead, {
    foreignKey: 'account_id',
    as: 'leads'
});
Lead.belongsTo(Account, {
    foreignKey: 'account_id',
    as: 'account'
});

// ═══════════════════════════════════════════════════════════
// 📤 EXPORTS
// ═══════════════════════════════════════════════════════════
module.exports = {
    User,
    Subscription,
    Account,
    Flow,
    Execution,
    Log,
    Lead
};
