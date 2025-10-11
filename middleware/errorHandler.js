const errorHandler = (err, req, res, next) => {
  // Log to console for dev
  console.error(err.stack);

  // Default error response
  let error = { ...err };
  error.message = err.message;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    error = { status: 404, message };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { status: 400, message };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = { status: 400, message };
  }
  
  // Custom or generic error
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Server Error',
  });
};

module.exports = errorHandler;