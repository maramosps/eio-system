/*
═══════════════════════════════════════════════════════════
  E.I.O - MODELS INDEX
  Exportação central de todos os models com relacionamentos
═══════════════════════════════════════════════════════════
*/

const User = require('./User');
const Subscription = require('./Subscription');
const Flow = require('./Flow');
const Execution = require('./Execution');
const Log = require('./Log');
const Account = require('./Account');
const Lead = require('./Lead');

// Relacionamentos

// User <-> Subscription (1:1)
User.hasOne(Subscription, {
    foreignKey: 'user_id',
    as: 'subscription'
});
Subscription.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
});

// User <-> Flow (1:N)
User.hasMany(Flow, {
    foreignKey: 'user_id',
    as: 'flows'
});
Flow.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
});

// User <-> Execution (1:N)
User.hasMany(Execution, {
    foreignKey: 'user_id',
    as: 'executions'
});
Execution.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
});

// Flow <-> Execution (1:N)
Flow.hasMany(Execution, {
    foreignKey: 'flow_id',
    as: 'executions'
});
Execution.belongsTo(Flow, {
    foreignKey: 'flow_id',
    as: 'flow'
});

// Execution <-> Log (1:N)
Execution.hasMany(Log, {
    foreignKey: 'execution_id',
    as: 'logs'
});
Log.belongsTo(Execution, {
    foreignKey: 'execution_id',
    as: 'execution'
});

// User <-> Log (1:N)
User.hasMany(Log, {
    foreignKey: 'user_id',
    as: 'logs'
});
Log.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
});

// User <-> Account (1:N)
User.hasMany(Account, {
    foreignKey: 'user_id',
    as: 'accounts'
});
Account.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
});

// User <-> Lead (1:N)
User.hasMany(Lead, {
    foreignKey: 'user_id',
    as: 'leads'
});
Lead.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
});

module.exports = {
    User,
    Subscription,
    Flow,
    Execution,
    Log,
    Account,
    Lead
};
