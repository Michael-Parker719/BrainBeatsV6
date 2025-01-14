const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Initialize Express app
require("dotenv").config();
const { pool } = require('../../connect/connect');
const router = require("express").Router();

// Set up MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root', // your MySQL username
  password: '', // your MySQL password
  database: 'image_uploads'
});

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// Set up Multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    // Check if uploads folder exists, if not, create it
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir); // Set the destination folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Set the file name (timestamp + file extension)
  }
});

const upload = multer({ storage: storage });

// Serve static files from the "uploads" folder
router.use('/uploads', express.static('uploads'));

// Handle POST request to upload an image
router.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }

  // Get the image file path
  const filePath = path.join(__dirname, 'uploads', req.file.filename);
  const fileName = req.file.filename;

  // Insert image path into the MySQL database
  const query = 'INSERT INTO images (filename, filepath) VALUES (?, ?)';
  db.query(query, [fileName, filePath], (err, result) => {
    if (err) {
      console.error('Error saving image path:', err);
      return res.status(500).send('Error saving image path');
    }
    res.send('Image uploaded and path stored in database');
  });
});

// Display the uploaded images (for testing)
router.get('/images', (req, res) => {
  db.query('SELECT * FROM images', (err, results) => {
    if (err) {
      return res.status(500).send('Error fetching images');
    }
    res.json(results);
  });
});