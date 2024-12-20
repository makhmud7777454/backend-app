const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Item = require('./models/Item');  // Adjust the path if necessary
const multer = require('multer'); // Import Multer for handling file uploads
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 5000;

// Middleware
app.use(express.json());

// MongoDB Connection
const MONGO_URL = process.env.MONGO_URL; // Add your MongoDB connection string to .env
mongoose
  .connect(MONGO_URL)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

// JWT Secret Key
const JWT_SECRET = process.env.JWT_SECRET;

// User Schema & Model (using username instead of email)
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
}, {
  timestamps: true,
});

const User = mongoose.model('User', userSchema);

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Specify your upload folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '_' + file.originalname); // Generate a unique filename
  },
});

const upload = multer({ storage }); // This initializes the multer instance for handling file uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Registration Route
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ success: true, message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error); // Log the error in the server console
    res.status(500).json({ success: false, message: 'Error registering user', error: error.message });
  }
});

// Login Route
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid username or password' });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ success: false, message: 'Invalid username or password' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ success: true, token });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error logging in', error: error.message });
  }
});

// Middleware to Verify Token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ success: false, message: 'Invalid token', error: error.message });
  }
};

// Protected Route Example
app.get('/protected', verifyToken, (req, res) => {
  res.status(200).json({ success: true, message: 'Access granted to protected route', user: req.user });
});

// 1. **Create Item (POST)**

app.post("/items", verifyToken, upload.single("image"), async (req, res) => {
  const { name, amount, product, date, time } = req.body;
  const image = req.file ? req.file.path : null;

  // Convert the date string to a valid Date object
  const formattedDate = new Date(date.split('.').reverse().join('-')); 

  try {
    const newItem = new Item({
      name,
      amount,
      product,
      image,
      date: formattedDate,
      time,
      owner: req.user.id, // Associate item with the logged-in user
    });

    await newItem.save();
    res.status(201).json({ success: true, message: "Item created successfully", item: newItem });
  } catch (error) {
    console.error("Error creating item:", error);
    res.status(500).json({ success: false, message: "Failed to create item" });
  }
});


// Get all items (GET)

app.get("/items", verifyToken, async (req, res) => {
  try {
    const items = await Item.find({ owner: req.user.id }); // Fetch items for the logged-in user
    res.status(200).json({ success: true, items });
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ success: false, message: "Failed to fetch items" });
  }
});




app.put("/items/:id", verifyToken, upload.single("image"), async (req, res) => {
  const { id } = req.params;
  const { name, amount, product, date, time } = req.body;
  const image = req.file ? req.file.path : null;

  console.log("Received data:", req.body); // Log the received data

  // Check if ID is valid
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid item ID" });
  }

  // Check if the date is valid
  const parsedDate = new Date(date);
  if (isNaN(parsedDate)) {
    return res.status(400).json({ success: false, message: "Invalid date format" });
  }

  try {
    const updatedItem = await Item.findByIdAndUpdate(
      id,
      { name, amount, product, image, date: parsedDate, time },
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    res.status(200).json({ success: true, message: "Item updated successfully", item: updatedItem });
  } catch (error) {
    console.error("Error updating item:", error);
    res.status(500).json({ success: false, message: "Failed to update item" });
  }
});





// 3. **Delete Item (DELETE)**
app.delete("/items/:id", verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const deletedItem = await Item.findByIdAndDelete(id);

    if (!deletedItem) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    res.status(200).json({ success: true, message: "Item deleted successfully" });
  } catch (error) {
    console.error("Error deleting item:", error);
    res.status(500).json({ success: false, message: "Failed to delete item" });
  }
});

// Start the Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
