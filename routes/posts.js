const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  createPost,
  getPosts,
  getPostById,
  getMyPosts,
  updatePost,
   deletePost
} = require('../controllers/postController');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Crear publicación
router.post('/', createPost);

// Obtener todas las publicaciones (públicas)
router.get('/', getPosts);

// Obtener publicación específica
router.get('/:id', getPostById);

// Obtener publicaciones del usuario actual
router.get('/user/my-posts', getMyPosts);

router.put('/:id', updatePost);

router.delete('/:id', deletePost);

module.exports = router;