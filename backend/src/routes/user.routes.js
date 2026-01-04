/*
═══════════════════════════════════════════════════════════
  E.I.O - USER ROUTES
  Rotas de gerenciamento de usuário
═══════════════════════════════════════════════════════════
*/

const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');

/**
 * @route   GET /api/v1/users/me
 * @desc    Obter perfil do usuário autenticado
 * @access  Private
 */
router.get('/me', userController.getProfile);

/**
 * @route   PUT /api/v1/users/me
 * @desc    Atualizar perfil do usuário
 * @access  Private
 */
router.put('/me', userController.updateProfile);

/**
 * @route   DELETE /api/v1/users/me
 * @desc    Deletar conta do usuário
 * @access  Private
 */
router.delete('/me', userController.deleteAccount);

module.exports = router;
