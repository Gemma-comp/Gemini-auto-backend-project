import { Request, Response } from "express";

const controller = (req: Request, res: Response): any => {
    //Query from the request
    const { query } = req.body;

    if (!query) return res.status(400).json({
        status: "error",
        message: "Query is required",
    })

    //Pass query to ai service
     
    
    
    
    //Return ai response

}


export default controller;