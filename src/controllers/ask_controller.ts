import { Request, Response } from "express";
import { genCode } from "../utils/gen_code.js";
import { writeFileSync } from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import { modifyDBResponse } from "../utils/modify_db_response.js";

const execFileAsync = promisify(execFile);

const controller = async (req: Request, res: Response) => {
    const { query } = req.body;
    if (!query) {
        return res.status(400).json({ status: "error", message: "Query is required" });
    }
    try {
        const code = await genCode(query);
        const fileName = "generatedCode.js";

        writeFileSync(fileName, `${code}`);

        const { stdout, stderr } = await execFileAsync('node', [fileName]);

        if (stderr) {
            return res.status(500).json({ error: stderr });
        }

        const returnedData = stdout.trim();
        const modifedResponseData = await modifyDBResponse(returnedData);


        let parsedData;
        try {
            parsedData = JSON.parse(modifedResponseData as string);
        } catch (parseError) {
            return res.status(500).json({ error: "Failed to parse response data" });
        }

        return res.status(200).json(parsedData);
    } catch (e) {
        return res.status(500).json({ error: e });
    }
};

export default controller;
