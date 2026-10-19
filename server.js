require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Conexión a MongoDB Atlas con cifrado TLS/SSL
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado con éxito a MongoDB Atlas (Sora Sweets DB)'))
  .catch(err => console.error('❌ Error al conectar a MongoDB:', err));

// Esquemas de las Colecciones
const usuarioSchema = new mongoose.Schema({
  nombre: String,
  email: String,
  rol: { type: String, default: 'Cliente' },
  fecha_registro: { type: Date, default: Date.now }
}, { collection: 'usuarios' });

const productoSchema = new mongoose.Schema({
  nombre: String,
  categoria: String,
  precio: Number,
  stock: Number,
  descripcion: String
}, { collection: 'productos' });

const ordenSchema = new mongoose.Schema({
  numero_orden: String,
  cliente: String,
  producto_nombre: String,
  cantidad: Number,
  subtotal: Number,
  envio: Number,
  total: Number,
  estado: String,
  fecha: { type: Date, default: Date.now }
}, { collection: 'ordenes' });

const Usuario = mongoose.model('Usuario', usuarioSchema);
const Producto = mongoose.model('Producto', productoSchema);
const Orden = mongoose.model('Orden', ordenSchema);

// Rutas API (Endpoints CRUD)
app.get('/api/productos', async (req, res) => {
  try {
    const productos = await Producto.find({ stock: { $gt: 0 } }).sort({ categoria: 1, nombre: 1 });
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/productos', async (req, res) => {
  try {
    const nuevoProducto = new Producto(req.body);
    await nuevoProducto.save();
    res.status(201).json({ 
      mensaje: "Producto agregado con éxito", 
      producto: nuevoProducto 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/usuarios', async (req, res) => {
  try {
    const nuevoUsuario = new Usuario(req.body);
    await nuevoUsuario.save();
    res.status(201).json({ mensaje: 'Usuario registrado con éxito', usuario: nuevoUsuario });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ordenes', async (req, res) => {
  try {
    const nuevaOrden = new Orden(req.body);
    await nuevaOrden.save();
    await Producto.updateOne(
      { nombre: req.body.producto_nombre, stock: { $gte: req.body.cantidad } },
      { $inc: { stock: -req.body.cantidad } }
    );
    res.status(201).json({ mensaje: 'Orden creada exitosamente', orden: nuevaOrden });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/ordenes/ticket/:cliente', async (req, res) => {
  try {
    const ticket = await Orden.aggregate([
      { $match: { cliente: req.params.cliente } },
      {
        $lookup: {
          from: 'productos',
          localField: 'producto_nombre',
          foreignField: 'nombre',
          as: 'detalle_producto'
        }
      }
    ]);
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});