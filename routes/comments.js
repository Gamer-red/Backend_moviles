const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
    createComment,
    getCommentsByPost
} = require('../controllers/commentsController')
const router = express.Router();

router.use(authenticateToken);

router.post('/', createComment);

router.get('/post/:postId', getCommentsByPost);

module.exports = router;