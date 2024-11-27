import { Prisma } from "@prisma/client";
import { ErrorRequestHandler } from "express";

export const prismaErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
            res.status(400).json({
            message: 'Database error',
            error: err.message
        });
        return;
    }
    next(err);
};

export const serverErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
  };