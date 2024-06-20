import { Request, Response } from "express";

const controller = (req: Request, res: Response): any => {
    const { query } = req.body;

    if (!query) return res.status(400).json({
        status: "error",
        message: "Query is required",
    });

    // Pass query to AI service
    
    // Return AI response
    res.json({
        status: "success",
        message: "AI response here"
    });
}

export default controller;
