const express = require('express');
const router = express.Router();

const { getProfile, updateProfile, deleteAccount } = require('./user.controller');
const { checkAuth } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validation.middleware');
const { updateProfileSchema } = require('./user.validation');

router.use(checkAuth);

router.get('/me', getProfile);
router.put('/me', validate(updateProfileSchema), updateProfile);
router.delete('/me', deleteAccount);

module.exports = router;
