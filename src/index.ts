import express from 'express';
import path from 'path';

// Create an Express application
const app = express();
const port = process.env.PORT || 3000;

// Serve static files (HTML, CSS, JavaScript) from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Define an API route
app.get('/api/data', (req, res) => {
  // Replace this with your API logic
  const responseData = { message: 'Hello from the API!' };
  res.json(responseData);
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
