const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Registro de usuario
const register = async (req, res) => {
  try {
    const { nombre, apellido_paterno, apellido_materno, correo, contrasenia, alias, telefono } = req.body;

    console.log("📝 Procesando registro...");
    console.log("🖼️ Avatar recibido:", req.body.avatar ? `Si (${req.body.avatar.length} chars)` : "No");
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;
    if (!passwordRegex.test(contrasenia)) {
      return res.status(400).json({ 
        error: 'La contraseña debe tener al menos 10 caracteres, una mayúscula, una minúscula y un número' 
      });
    }

    // Verificar si el correo ya existe
    const [existingUser] = await db.execute(
      'SELECT Id_usuario FROM usuarios WHERE Correo = ?',
      [correo]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(contrasenia, 10);

    let avatarBuffer = null;

      // Procesar imagen si viene en la request
    if (req.body.avatar) {
    console.log("🖼️ Procesando avatar...");
    try {
        // Si la imagen viene en base64, convertir a Buffer
        if (req.body.avatar.startsWith('data:image')) {
            const base64Data = req.body.avatar.replace(/^data:image\/\w+;base64,/, '');
            avatarBuffer = Buffer.from(base64Data, 'base64');
            console.log("✅ Avatar convertido a Buffer, tamaño:", avatarBuffer.length);
        } else {
            // Si no tiene el prefijo data:image, asumir que es base64 puro
            avatarBuffer = Buffer.from(req.body.avatar, 'base64');
            console.log("✅ Avatar convertido (base64 puro), tamaño:", avatarBuffer.length);
        }
    } catch (error) {
        console.error("❌ Error al procesar avatar:", error);
    }
} else {
    console.log("⚠️ No se recibió avatar");
}

    // Insertar usuario
    const [result] = await db.execute(
      `INSERT INTO usuarios (Nombre, Apellido_paterno, Apellido_materno, Correo, Contrasenia, Alias, telefono, Avatar) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, apellido_paterno, apellido_materno, correo, hashedPassword, alias, telefono, avatarBuffer]
    );

    // Generar token JWT
    const token = jwt.sign(
      { userId: result.insertId, correo },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: {
        Id_usuario: result.insertId,  // ← Con mayúscula como en tu modelo Kotlin
        Nombre: nombre,               // ← Con mayúscula
        Apellido_paterno: apellido_paterno, // ← Con mayúscula
        Apellido_materno: apellido_materno, // ← Con mayúscula
        Correo: correo,               // ← Con mayúscula
        Alias: alias,                 // ← Con mayúscula
        telefono: telefono,           // ← minúscula
        Avatar: avatarBuffer ? "data:image/jpeg;base64," + avatarBuffer.toString('base64') : null
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Login de usuario
const login = async (req, res) => {
  console.log("🔴 LLEGÓ PETICIÓN A LOGIN");  // ← LÍNEA NUEVA
  console.log("Body recibido:", req.body);   // ← LÍNEA NUEVA
  try {
    const { correo, contrasenia } = req.body;

      // === LOGS DE DEPURACIÓN ===
    console.log("========== LOGIN DEBUG ==========");
    console.log("1. Email recibido:", correo);
    console.log("2. Password recibida:", contrasenia);
    console.log("================================");

    // Buscar usuario
    const [users] = await db.execute(
      'SELECT * FROM usuarios WHERE Correo = ?',
      [correo]
    );

     console.log("3. Usuarios encontrados en BD:", users.length);

    if (users.length === 0) {
      console.log("❌ USUARIO NO ENCONTRADO");
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = users[0];

    console.log("4. Usuario encontrado:", user.Correo);
    console.log("5. Hash almacenado en BD:", user.Contrasenia);

    // Verificar contraseña
    const validPassword = await bcrypt.compare(contrasenia, user.Contrasenia);

     console.log("6. ¿Password válida?:", validPassword);


    if (!validPassword) {
      console.log("❌ CONTRASEÑA INCORRECTA");
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar token
    const token = jwt.sign(
      { userId: user.Id_usuario, correo: user.Correo },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        Id_usuario: user.Id_usuario,           // ← Con mayúscula
        Nombre: user.Nombre,                   // ← Con mayúscula  
        Apellido_paterno: user.Apellido_paterno, // ← Con mayúscula
        Apellido_materno: user.Apellido_materno, // ← Con mayúscula
        Correo: user.Correo,                   // ← Con mayúscula
        Alias: user.Alias,                     // ← Con mayúscula
        telefono: user.telefono,               // ← minúscula
        Avatar: user.Avatar ? user.Avatar.toString('base64') : null
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const logout = async (req, res) =>{
  try {
    res.json({
      message: 'Logout exitoso. Por favor elimina el token',
      logoutTime: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(500).json({error: 'Error interno del servidor'});
    
  }
};


module.exports = { register, 
  login,
  logout
};