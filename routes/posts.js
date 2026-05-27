const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  createPost,
  getPosts,
  getPostById,
  getMyPosts,
  updatePost,
  deletePost,
  getDrafts,
  publishPost,
  getFavorites
} = require('../controllers/postController');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener publicaciones del usuario actual
router.get('/user/my-posts', getMyPosts);

router.get('/drafts', getDrafts); 

// Crear publicación
router.post('/', createPost);

// Obtener todas las publicaciones (públicas)
router.get('/', getPosts);

// Obtener publicación específica
router.get('/:id', getPostById);


router.put('/:id', updatePost);

router.delete('/:id', deletePost);

router.post('/:id/publish', authenticateToken, publishPost);

// En las rutas (posts.js)
router.get('/favorites', authenticateToken, getFavorites);

module.exports = router;