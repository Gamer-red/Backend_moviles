const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
    Insertmultimedia,
    getMultimediaByPost,
    deleteMultimedia,
    updatePostWithImages
} = require('../controllers/multimediaController');

const router = express.Router();

router.use(authenticateToken);

router.post('/', Insertmultimedia);
router.get('/post/:postId', getMultimediaByPost);
router.delete('/:imageId', deleteMultimedia);
router.put('/:id/with-images', authenticateToken, updatePostWithImages);

module.exports = router;