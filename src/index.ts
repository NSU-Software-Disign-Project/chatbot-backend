import express from 'express';
import http from 'http';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import cors from 'cors';
import connectDB from '../config/db';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

app.use(
  cors({
    credentials: true,
  }),
);

app.use(compression());
app.use(cookieParser());
app.use(bodyParser.json());

const server = http.createServer(app);

server.listen(8080, () => {
  console.log('Server is running on port 8080');
});

connectDB();

app.get('/api/users', (request, responce) => {
  responce.send(['aboba', 'clobba', 'dabba']);
});

app.get('/api/products', (request, responce) => {
  responce.send([
    { id: 1, name: 'Product 1', price: 10 },
    { id: 2, name: 'Product 2', price: 20 },
    { id: 3, name: 'Product 3', price: 30 },
  ]);
});

app.get('/api/users/:id', (request, response) => {
  console.log(request.params);
});
