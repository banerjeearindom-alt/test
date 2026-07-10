'use strict';

const express = require('express');
const { asyncHandler } = require('../../lib/http');
const { requireAuth } = require('../../middleware/auth');
const ctrl = require('./properties.controller');

const router = express.Router();

router.get('/', asyncHandler(ctrl.list));
router.get('/mine', requireAuth, asyncHandler(ctrl.mine));
router.get('/:id', asyncHandler(ctrl.getOne));
router.post('/', requireAuth, asyncHandler(ctrl.create));
router.put('/:id', requireAuth, asyncHandler(ctrl.update));
router.delete('/:id', requireAuth, asyncHandler(ctrl.remove));

module.exports = router;
