const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments')
const reactionRoutes = require('./routes/postreactions');
const reactionResponseRoutes = require('./routes/respuestasreaction');
const responseRoutes = require('./routes/responses');
const favoriteRoutes = require('./routes/favorites');
const searchRoutes = require('./routes/search');
const reactionCommentRoutes = require('./routes/reactionComments');
const multimediaRoutes = require('./routes/multimedia'); 

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: '✅ Conexión exitosa con el backend!',
    timestamp: new Date().toISOString()
  });
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/reactions', reactionRoutes);
app.use('/api/reaction-responses', reactionResponseRoutes);
app.use('/api/responses', responseRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/reaction-comments', reactionCommentRoutes);
app.use('/api/multimedia',multimediaRoutes);
app.get('/', (req, res) => {
  res.json({ message: 'API de Red Social funcionando!' });
});


app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});